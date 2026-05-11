import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, erc20Abi } from 'viem'
import { FACTORY_ADDRESS } from '../config/wagmi'
import { AuctionFactoryABI } from '../abi/contracts'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'

const ZAMA_USDC = '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639'

export function CreateAuction() {
  const { address: userAddress, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const navigate = useNavigate()
  
  const [isDeploying, setIsDeploying] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // Form state
  const [tokenToSell, setTokenToSell] = useState('')
  const [tokenTicker, setTokenTicker] = useState('')
  const [paymentToken, setPaymentToken] = useState(ZAMA_USDC)
  
  // Date/Time and Duration Logic
  const formatDate = (d: Date) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  const [isCustomSchedule, setIsCustomSchedule] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState('3600')
  const [startDate, setStartDate] = useState(formatDate(new Date()))
  const [endDate, setEndDate] = useState(formatDate(new Date(Date.now() + 3600 * 1000)))

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value
    setStartDate(newStart)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value
    setEndDate(newEnd)
  }

  // Previous default values
  const [floorPrice, setFloorPrice] = useState('0.05')
  const [totalSupply, setTotalSupply] = useState('100000')

  // Deploy Test Token state
  const [showDeployToken, setShowDeployToken] = useState(false)
  const [deployTokenName, setDeployTokenName] = useState('')
  const [deployTokenSymbol, setDeployTokenSymbol] = useState('')
  const [deployTokenSupply, setDeployTokenSupply] = useState('1000000')
  const [isDeployingToken, setIsDeployingToken] = useState(false)
  const [deployedTokenAddress, setDeployedTokenAddress] = useState('')
  const { data: walletClient } = useWalletClient()

  // Fetch token decimals dynamically
  const isValidAddress = (a: string) => a.startsWith('0x') && a.length === 42
  const { data: tokenDecimalsData } = useReadContract({
    address: tokenToSell as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: isValidAddress(tokenToSell) }
  })
  
  const { data: fetchedSymbol } = useReadContract({
    address: tokenToSell as `0x${string}`,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: isValidAddress(tokenToSell) }
  })

  useEffect(() => {
    if (fetchedSymbol) {
      setTokenTicker(fetchedSymbol as string)
    }
  }, [fetchedSymbol])

  // Check current allowance to factory
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenToSell as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: isValidAddress(tokenToSell) ? [userAddress!, FACTORY_ADDRESS] : undefined,
    query: { enabled: isValidAddress(tokenToSell) && !!userAddress }
  })

  const tokenDecimals = tokenDecimalsData ?? 18

  const [hasApprovedTx, setHasApprovedTx] = useState(false)

  useEffect(() => {
    setHasApprovedTx(false)
  }, [tokenToSell, totalSupply])

  // Derived approval state
  const neededAllowance = (): bigint => {
    try { return supplyWei() } catch { return 0n }
  }
  const isApproved = hasApprovedTx || (currentAllowance !== undefined && neededAllowance() > 0n && (currentAllowance as bigint) >= neededAllowance())

  // Derived on-chain values
  const supplyUnits = (): bigint => {
    const n = parseFloat(totalSupply)
    if (!n || isNaN(n)) return 0n
    return BigInt(Math.floor(n))
  }
  
  const supplyWei = (): bigint => {
    const n = parseFloat(totalSupply)
    if (!n || isNaN(n)) return 0n
    return parseUnits(totalSupply, tokenDecimals)
  }
  
  const floorPriceWei = (): bigint => {
    const n = parseFloat(floorPrice)
    if (!n || isNaN(n)) return 0n
    return parseUnits(floorPrice, 6) // USDC has 6 decimals
  }

  const [isApproving, setIsApproving] = useState(false)

  const handleApprove = async () => {
    if (!tokenToSell || !totalSupply) return
    setIsApproving(true)
    setStatus('Approving factory to spend your tokens…')
    try {
      const hash = await writeContractAsync({
        address: tokenToSell as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [FACTORY_ADDRESS, supplyWei()],
      })
      if (publicClient) {
        setStatus('Waiting for approval confirmation…')
        await publicClient.waitForTransactionReceipt({ hash })
      }
      await refetchAllowance()
      setHasApprovedTx(true)
      setStatus('SUCCESS:Token approved! You can now launch your auction.')
      toast.success('Token approved!')
    } catch (err: any) {
      console.error(err)
      setStatus(`ERROR:Approval failed: ${err.shortMessage || err.message}`)
      toast.error(`Approval failed: ${err.shortMessage || err.message}`)
    } finally {
      setIsApproving(false)
    }
  }

  const handleDeploy = async () => {
    if (!tokenToSell || !paymentToken || !totalSupply || !floorPrice) {
      toast.error('Please fill in all required fields')
      return
    }

    const units = supplyUnits()
    if (units === 0n) {
      toast.error('Supply must be a positive whole number.')
      return 
    }
    if (units > 18446744073709551615n) {
      toast.error('Supply exceeds euint64 max. Use fewer tokens.')
      return
    }

    let startTime: bigint
    let duration: bigint

    if (isCustomSchedule) {
      const startTs = Math.floor(new Date(startDate).getTime() / 1000)
      const endTs = Math.floor(new Date(endDate).getTime() / 1000)
      
      if (endTs <= startTs) {
        toast.error('End time must be after start time')
        return
      }
      duration = BigInt(endTs - startTs)
      startTime = BigInt(startTs)
    } else {
      const now = BigInt(Math.floor(Date.now() / 1000))
      startTime = now + 60n
      duration = BigInt(durationSeconds)
    }

    setIsDeploying(true)
    setStatus('Deploying auction contract…')
    toast.loading('Deploying encrypted auction...', { id: 'deploy' })
    
    try {
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: AuctionFactoryABI,
        functionName: 'createAuction',
        args: [
          tokenToSell as `0x${string}`,
          paymentToken as `0x${string}`,
          supplyWei(),          
          units,                
          floorPriceWei(),      
          startTime,            
          duration              
        ],
      })
      if (publicClient) {
        setStatus('Waiting for block confirmation…')
        await publicClient.waitForTransactionReceipt({ hash })
      }
      setStatus('SUCCESS:Auction created successfully!')
      toast.success('Auction successfully deployed!', { id: 'deploy' })
      setTimeout(() => {
        navigate('/explore')
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setStatus(`ERROR:Deployment failed: ${err.shortMessage || err.message}`)
      toast.error(`Deployment failed: ${err.shortMessage || err.message}`, { id: 'deploy' })
    } finally {
      setIsDeploying(false)
    }
  }

  // Deploy a simple ERC-20 test token
  const SIMPLE_ERC20_ABI = [
    {
      type: 'constructor',
      inputs: [
        { name: 'name_', type: 'string' },
        { name: 'symbol_', type: 'string' },
        { name: 'initialSupply', type: 'uint256' }
      ],
      stateMutability: 'nonpayable',
    }
  ] as const

  // Minimal ERC20 with constructor(name, symbol, initialSupply) that mints to msg.sender
  // Compiled from: OpenZeppelin ERC20 preset with constructor mint
  const SIMPLE_ERC20_BYTECODE = '0x60806040523480156200001157600080fd5b5060405162000bd838038062000bd88339810160408190526200003491620002ae565b82826003620000448382620003b2565b506004620000538282620003b2565b5050506200006833826200007160201b60201c565b505050620004a6565b6001600160a01b038216620000a15760405163ec442f0560e01b8152600060048201526024015b60405180910390fd5b620000af60008383620000b3565b5050565b6001600160a01b038316620000e2578060026000828254620000d691906200047e565b90915550620001569050565b6001600160a01b03831660009081526020819052604090205481811015620001375760405163391434e360e21b81526001600160a01b0385166004820152602481018290526044810183905260640162000098565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b038216620001745760028054829003905562000193565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051620001d991815260200190565b60405180910390a3505050565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200020e57600080fd5b81516001600160401b03808211156200022b576200022b620001e6565b604051601f8301601f19908116603f01168101908282118183101715620002565762000256620001e6565b81604052838152602092508660208588010111156200027457600080fd5b600091505b8382101562000298578582018301518183018401529082019062000279565b6000602085830101528094505050505092915050565b600080600060608486031215620002c457600080fd5b83516001600160401b0380821115620002dc57600080fd5b620002ea87838801620001fc565b945060208601519150808211156200030157600080fd5b506200031086828701620001fc565b925050604084015190509250925092565b600181811c908216806200033657607f821691505b6020821081036200035757634e487b7160e01b600052602260045260246000fd5b50919050565b601f821115620003ad576000816000526020600020601f850160051c81016020861015620003885750805b601f850160051c820191505b81811015620003a95782815560010162000394565b5050505b505050565b81516001600160401b03811115620003ce57620003ce620001e6565b620003e681620003df845462000321565b846200035d565b602080601f8311600181146200041e5760008415620004055750858301515b600019600386901b1c1916600185901b178555620003a9565b600085815260208120601f198616915b828110156200044f578886015182559484019460019091019084016200042e565b50858210156200046e5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b80820180821115620004a057634e487b7160e01b600052601160045260246000fd5b92915050565b61072280620004b66000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063313ce56711610066578063313ce567146100fe57806370a082311461010d57806395d89b4114610136578063a9059cbb1461013e578063dd62ed3e1461015157600080fd5b806306fdde0314610098578063095ea7b3146100b657806318160ddd146100d957806323b872dd146100eb575b600080fd5b6100a061018a565b6040516100ad919061056b565b60405180910390f35b6100c96100c43660046105d6565b61021c565b60405190151581526020016100ad565b6002545b6040519081526020016100ad565b6100c96100f9366004610600565b610236565b604051601281526020016100ad565b6100dd61011b36600461063c565b6001600160a01b031660009081526020819052604090205490565b6100a061025a565b6100c961014c3660046105d6565b610269565b6100dd61015f36600461065e565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b60606003805461019990610691565b80601f01602080910402602001604051908101604052809291908181526020018280546101c590610691565b80156102125780601f106101e757610100808354040283529160200191610212565b820191906000526020600020905b8154815290600101906020018083116101f557829003601f168201915b5050505050905090565b60003361022a818585610277565b60019150505b92915050565b600033610244858285610289565b61024f85858561030d565b506001949350505050565b60606004805461019990610691565b60003361022a81858561030d565b610284838383600161036c565b505050565b6001600160a01b0383811660009081526001602090815260408083209386168352929052205460001981101561030757818110156102f857604051637dc7a0d960e11b81526001600160a01b038416600482015260248101829052604481018390526064015b60405180910390fd5b6103078484848403600061036c565b50505050565b6001600160a01b03831661033757604051634b637e8f60e11b8152600060048201526024016102ef565b6001600160a01b0382166103615760405163ec442f0560e01b8152600060048201526024016102ef565b610284838383610441565b6001600160a01b0384166103965760405163e602df0560e01b8152600060048201526024016102ef565b6001600160a01b0383166103c057604051634a1406b160e11b8152600060048201526024016102ef565b6001600160a01b038085166000908152600160209081526040808320938716835292905220829055801561030757826001600160a01b0316846001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161043391815260200190565b60405180910390a350505050565b6001600160a01b03831661046c57806002600082825461046191906106cb565b909155506104de9050565b6001600160a01b038316600090815260208190526040902054818110156104bf5760405163391434e360e21b81526001600160a01b038516600482015260248101829052604481018390526064016102ef565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b0382166104fa57600280548290039055610519565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161055e91815260200190565b60405180910390a3505050565b60006020808352835180602085015260005b818110156105995785810183015185820160400152820161057d565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b03811681146105d157600080fd5b919050565b600080604083850312156105e957600080fd5b6105f2836105ba565b946020939093013593505050565b60008060006060848603121561061557600080fd5b61061e846105ba565b925061062c602085016105ba565b9150604084013590509250925092565b60006020828403121561064e57600080fd5b610657826105ba565b9392505050565b6000806040838503121561067157600080fd5b61067a836105ba565b9150610688602084016105ba565b90509250929050565b600181811c908216806106a557607f821691505b6020821081036106c557634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561023057634e487b7160e01b600052601160045260246000fdfea264697066735822122059b15f1051a900f040751e48fcc43f13c26be0c25d05539851c4116b61d97e7764736f6c63430008180033' as `0x${string}`

  const handleDeployToken = async () => {
    if (!walletClient || !publicClient || !userAddress) return
    setIsDeployingToken(true)
    setDeployedTokenAddress('')
    try {
      const supplyWei = parseUnits(deployTokenSupply, 18)
      toast.loading('Deploying token contract…', { id: 'deploy-token' })
      
      const hash = await walletClient.deployContract({
        abi: SIMPLE_ERC20_ABI,
        bytecode: SIMPLE_ERC20_BYTECODE,
        args: [deployTokenName, deployTokenSymbol, supplyWei],
      })

      toast.loading('Waiting for confirmation…', { id: 'deploy-token' })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      
      if (receipt.contractAddress) {
        setDeployedTokenAddress(receipt.contractAddress)
        toast.success(`Token "${deployTokenSymbol}" deployed!`, { id: 'deploy-token' })
      } else {
        toast.error('Deployment failed — no contract address returned', { id: 'deploy-token' })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Deploy failed: ${err.shortMessage || err.message}`, { id: 'deploy-token' })
    } finally {
      setIsDeployingToken(false)
    }
  }

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
      <div className="mb-12">
        <h1 className="font-display-xl text-display-xl-mobile md:text-display-xl text-on-surface mb-4">Create Auction</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Configure the parameters for your encrypted Dutch Auction. Data entered here will be end-to-end encrypted before being submitted to the FHE network.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
        {/* Wizard Flow (Left) */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-sticky-padding">
          
          {/* Step 1 */}
          <section className="bg-surface-container-lowest rounded-lg p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4 mb-8 border-b border-surface-variant pb-4">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed w-10 h-10 rounded-full flex items-center justify-center font-headline-lg text-body-md">1</span>
              <h2 className="font-headline-lg text-[32px]">Token &amp; Basic Info</h2>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-mono text-label-mono text-on-surface-variant">TOKEN CONTRACT ADDRESS</label>
              <input 
                className="bg-surface-container-lowest border-2 border-on-surface rounded-full px-6 py-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container w-full" 
                placeholder="0x..." 
                type="text"
                value={tokenToSell}
                onChange={e => setTokenToSell(e.target.value)}
              />
            </div>
          </section>

          {/* Step 2 */}
          <section className="bg-surface-container-lowest rounded-lg p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4 mb-8 border-b border-surface-variant pb-4">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed w-10 h-10 rounded-full flex items-center justify-center font-headline-lg text-body-md">2</span>
              <h2 className="font-headline-lg text-[32px]">Auction Schedule</h2>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 md:w-1/2">
                <label className="font-label-mono text-label-mono text-on-surface-variant">DURATION</label>
                <select 
                  className="bg-surface-container-lowest border-2 border-on-surface rounded-full px-6 py-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container w-full appearance-none" 
                  value={isCustomSchedule ? 'custom' : durationSeconds}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomSchedule(true)
                    } else {
                      setIsCustomSchedule(false)
                      setDurationSeconds(e.target.value)
                    }
                  }}
                >
                  <option value="300">5 Minutes (Test)</option>
                  <option value="3600">1 Hour</option>
                  <option value="21600">6 Hours</option>
                  <option value="43200">12 Hours</option>
                  <option value="86400">1 Day</option>
                  <option value="259200">3 Days</option>
                  <option value="604800">7 Days</option>
                  <option value="custom">Custom Date &amp; Time...</option>
                </select>
              </div>

              {isCustomSchedule && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter border-t border-surface-variant pt-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-label-mono text-label-mono text-on-surface-variant">START DATE &amp; TIME</label>
                    <input 
                      className="bg-surface-container-lowest border-2 border-on-surface rounded-full px-6 py-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container w-full" 
                      type="datetime-local"
                      value={startDate}
                      onChange={handleStartDateChange}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-mono text-label-mono text-on-surface-variant">END DATE &amp; TIME</label>
                    <input 
                      className="bg-surface-container-lowest border-2 border-on-surface rounded-full px-6 py-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container w-full" 
                      type="datetime-local"
                      value={endDate}
                      onChange={handleEndDateChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Step 3 */}
          <section className="bg-surface-container-lowest rounded-lg p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)] relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-[#1c1c1e] text-[#00ff41] font-encrypted-data text-[12px] px-3 py-1 rounded">
              [ ENCRYPTED ]
            </div>
            <div className="flex items-center gap-4 mb-8 border-b border-surface-variant pb-4">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed w-10 h-10 rounded-full flex items-center justify-center font-headline-lg text-body-md">3</span>
              <h2 className="font-headline-lg text-[32px]">Pricing Parameters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-label-mono text-on-surface-variant">FLOOR PRICE (USDC)</label>
                <input 
                  className="bg-surface-container-lowest border-2 border-on-surface rounded-full px-6 py-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container w-full text-right font-mono text-2xl" 
                  placeholder="0.00" 
                  type="number"
                  value={floorPrice}
                  onChange={e => setFloorPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-label-mono text-on-surface-variant">TOTAL SUPPLY</label>
                <input 
                  className="bg-surface-container-lowest border-2 border-on-surface rounded-full px-6 py-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container w-full text-right font-mono text-2xl" 
                  placeholder="1000000" 
                  type="number"
                  value={totalSupply}
                  onChange={e => setTotalSupply(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Step 4 */}
          <section className="bg-surface-container-lowest rounded-lg p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4 mb-8 border-b border-surface-variant pb-4">
              <span className="bg-[#fde28e] text-[#1c1c1e] w-10 h-10 rounded-full flex items-center justify-center font-headline-lg text-body-md font-bold">4</span>
              <h2 className="font-headline-lg text-[32px] text-[#1c1c1e]">Payment Token</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">Payment Currency</label>
                <div className="flex items-center justify-between border border-[#e5d5e5] rounded-full px-6 py-4 bg-[#fbf7fb] w-full">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-[#8e44ad]">verified_user</span>
                    <span className="text-[#1c1c1e] font-body-md font-medium">Confidential USDC (cUSDC)</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant opacity-70">lock</span>
                </div>
              </div>
              
              <div className="bg-surface-variant rounded-[16px] p-5 flex flex-col justify-center border border-surface-dim mt-2 md:mt-7">
                <p className="font-body-sm text-on-surface-variant mb-2">
                  All bids are placed using encrypted USDC. Mint public USDC and wrap it into confidential cUSDC on your wallet dashboard.
                </p>
                <Link to="/dashboard" className="text-primary font-bold hover:underline text-sm flex items-center gap-1 w-max">
                  Get cUSDC <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>
          
          {/* Step 1 & 2 Action Buttons */}
          <section className="bg-surface-container-lowest rounded-lg p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)] mt-4">
            <div className="flex flex-col gap-8">
              {/* Step 1: Approve */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isApproved 
                      ? 'bg-[#1c1c1e] text-[#00ff41]' 
                      : 'bg-tertiary-fixed text-on-tertiary-fixed'
                  }`}>
                    {isApproved ? <span className="material-symbols-outlined text-[20px]">check</span> : '1'}
                  </span>
                  <div>
                    <p className="font-headline-lg text-[20px] text-on-surface">
                      {isApproved ? 'Token Approved' : 'Approve Token Spend'}
                    </p>
                    <p className="font-body-sm text-on-surface-variant">
                      {isApproved 
                        ? 'Factory is authorized to transfer your tokens.' 
                        : 'Allow the auction factory to transfer your tokens.'}
                    </p>
                  </div>
                </div>
                <button
                  className={`w-full rounded-full py-5 font-headline-lg text-[20px] flex items-center justify-center gap-3 transition-all disabled:opacity-50 ${
                    isApproved 
                      ? 'bg-[#00ff41]/10 text-[#1c1c1e] border-2 border-[#00ff41]/30 cursor-default' 
                      : 'bg-[#1c1c1e] text-white hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                  onClick={handleApprove}
                  disabled={isApproved || isApproving || !isConnected || !isValidAddress(tokenToSell) || !totalSupply}
                >
                  {isApproving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                      Approving Token…
                    </>
                  ) : isApproved ? (
                    <>
                      <span className="material-symbols-outlined text-[22px]">check_circle</span>
                      Token Approved
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[22px]">lock_open</span>
                      Approve Token
                    </>
                  )}
                </button>
              </div>

              <div className="border-t border-surface-variant"></div>

              {/* Step 2: Launch */}
              <div className={`flex flex-col gap-4 transition-opacity ${!isApproved ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    !isApproved 
                      ? 'bg-surface-variant text-on-surface-variant' 
                      : 'bg-tertiary-fixed text-on-tertiary-fixed'
                  }`}>
                    2
                  </span>
                  <div>
                    <p className="font-headline-lg text-[20px] text-on-surface">Launch Auction</p>
                    <p className="font-body-sm text-on-surface-variant">
                      {!isApproved 
                        ? 'Complete Step 1 first.' 
                        : 'Deploy your encrypted Dutch Auction on-chain.'}
                    </p>
                  </div>
                </div>
                <button
                  className="w-full bg-[#1c1c1e] text-white rounded-full py-5 font-headline-lg text-[20px] hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                  onClick={handleDeploy}
                  disabled={!isApproved || isDeploying || !isConnected}
                >
                  {isDeploying ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                      Deploying Auction…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                      Launch Encrypted Auction
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status indicator */}
            {status && (
              <div className="mt-6 flex justify-center">
                <div className={`px-6 py-3 rounded-full font-body-md flex items-center gap-3 ${
                  status.startsWith('ERROR') 
                    ? 'bg-error-container text-on-error-container' 
                    : status.startsWith('SUCCESS') 
                      ? 'bg-[#1c1c1e] text-[#00ff41] font-encrypted-data'
                      : 'bg-[#1c1c1e] text-white'
                }`}>
                  {!status.startsWith('ERROR') && !status.startsWith('SUCCESS') && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  )}
                  {status.startsWith('SUCCESS') && (
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  )}
                  {status.startsWith('ERROR') && (
                    <span className="material-symbols-outlined text-[18px]">error</span>
                  )}
                  {status.replace(/^(ERROR|SUCCESS):/, '')}
                </div>
              </div>
            )}
          </section>
        </div>
        {/* Right Sidebar */}
        <aside className="col-span-1 md:col-span-4 sticky top-[100px]">
          {/* Deploy Test Token Card */}
          <div className="mb-6">
            <button
              onClick={() => setShowDeployToken(!showDeployToken)}
              className="w-full flex items-center justify-between bg-[#1c1c1e] text-white rounded-lg px-6 py-4 hover:bg-[#2c2c2e] transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span className="font-label-mono text-[13px] uppercase tracking-wider">Deploy Test Token</span>
              </span>
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${showDeployToken ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {showDeployToken && (
              <div className="bg-surface-container-lowest rounded-b-lg border-2 border-t-0 border-[#1c1c1e] p-6 space-y-4 -mt-1">
                <p className="font-body-md text-[13px] text-on-surface-variant">
                  Don't have an ERC-20 token? Deploy one instantly for testing.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="font-label-mono text-[11px] text-on-surface-variant uppercase mb-1 block">Token Name</label>
                    <input
                      className="w-full bg-surface-container-lowest border-2 border-on-surface rounded-full px-4 py-3 font-body-md text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container"
                      placeholder="My Test Token"
                      value={deployTokenName}
                      onChange={e => setDeployTokenName(e.target.value)}
                      disabled={isDeployingToken}
                    />
                  </div>
                  <div>
                    <label className="font-label-mono text-[11px] text-on-surface-variant uppercase mb-1 block">Symbol</label>
                    <input
                      className="w-full bg-surface-container-lowest border-2 border-on-surface rounded-full px-4 py-3 font-body-md text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container"
                      placeholder="MTT"
                      value={deployTokenSymbol}
                      onChange={e => setDeployTokenSymbol(e.target.value)}
                      disabled={isDeployingToken}
                      maxLength={8}
                    />
                  </div>
                  <div>
                    <label className="font-label-mono text-[11px] text-on-surface-variant uppercase mb-1 block">Total Supply</label>
                    <input
                      className="w-full bg-surface-container-lowest border-2 border-on-surface rounded-full px-4 py-3 font-body-md text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container"
                      placeholder="1000000"
                      type="number"
                      value={deployTokenSupply}
                      onChange={e => setDeployTokenSupply(e.target.value)}
                      disabled={isDeployingToken}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-on-surface-variant font-label-mono">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Decimals: 18 (standard)
                  </div>
                </div>

                <button
                  onClick={handleDeployToken}
                  disabled={!deployTokenName || !deployTokenSymbol || !deployTokenSupply || isDeployingToken || !isConnected}
                  className="w-full bg-[#1c1c1e] text-white rounded-full py-3 font-body-md text-[14px] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isDeployingToken ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Deploying…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                      Deploy Token
                    </>
                  )}
                </button>

                {deployedTokenAddress && (
                  <div className="bg-[#f0fdf4] border border-[#22c55e]/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#15803d]">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span className="font-label-mono text-[12px] uppercase font-bold">Token Deployed!</span>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-[#e5e7eb]">
                      <p className="font-encrypted-data text-[11px] text-on-surface break-all select-all">{deployedTokenAddress}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(deployedTokenAddress); toast.success('Address copied!') }}
                        className="flex-1 bg-white border border-[#1c1c1e] text-[#1c1c1e] rounded-full py-2 font-label-mono text-[11px] flex items-center justify-center gap-1 hover:bg-surface-dim transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        Copy
                      </button>
                      <button
                        onClick={() => { setTokenToSell(deployedTokenAddress); toast.success('Token address applied to form!') }}
                        className="flex-1 bg-[#1c1c1e] text-white rounded-full py-2 font-label-mono text-[11px] flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Use in Auction
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="bg-tertiary-fixed rounded-lg p-sticky-padding shadow-[0px_8px_24px_rgba(0,0,0,0.1)] flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="font-label-mono text-label-mono text-on-tertiary-fixed uppercase">Live Preview</h3>
              <span className="material-symbols-outlined text-on-tertiary-fixed">visibility</span>
            </div>
            
            {/* Mockup Card Component */}
            <div className="bg-surface-container-lowest rounded-[16px] p-gutter shadow-[0px_8px_24px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline">token</span>
                </div>
                <div className="bg-[#1c1c1e] text-surface-container-lowest font-encrypted-data text-[12px] px-2 py-1 rounded">
                  [ FHE ACTIVE ]
                </div>
              </div>
              <h4 className="font-headline-lg text-[24px] mb-6">{tokenTicker || 'TOKEN'}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-surface-variant pb-2">
                  <span className="font-label-mono text-label-mono text-on-surface-variant">FLOOR</span>
                  <span className="font-encrypted-data text-encrypted-data">{floorPrice || '--'} USDC</span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-variant pb-2">
                  <span className="font-label-mono text-label-mono text-on-surface-variant">SUPPLY</span>
                  <span className="font-encrypted-data text-encrypted-data">{totalSupply || '--'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-variant pb-2">
                  <span className="font-label-mono text-label-mono text-on-surface-variant">PAYMENT</span>
                  <span className="font-body-md text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#8e44ad]">verified_user</span>
                    cUSDC
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label-mono text-label-mono text-on-surface-variant">DURATION</span>
                  <span className="font-body-md text-on-surface">
                    {isCustomSchedule 
                      ? (startDate && endDate 
                          ? `${new Date(startDate).toLocaleDateString()} → ${new Date(endDate).toLocaleDateString()}`
                          : '--')
                      : durationSeconds === '300' ? '5 min'
                      : durationSeconds === '3600' ? '1 hour'
                      : durationSeconds === '21600' ? '6 hours'
                      : durationSeconds === '43200' ? '12 hours'
                      : durationSeconds === '86400' ? '1 day'
                      : durationSeconds === '259200' ? '3 days'
                      : durationSeconds === '604800' ? '7 days'
                      : '--'}
                  </span>
                </div>
              </div>
              <button className="w-full bg-surface-container-lowest border-2 border-on-surface text-on-surface rounded-full py-3 mt-6 font-body-md text-body-md opacity-50 cursor-not-allowed">
                Place Bid
              </button>
            </div>
          </div>

        </aside>
      </div>
    </main>
  )
}
