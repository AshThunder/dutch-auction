import React, { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { formatUnits, erc20Abi, parseUnits } from 'viem'
import { useConfidentialBalance, useUnwrap } from '@zama-fhe/react-sdk'
import { FACTORY_ADDRESS } from '../config/wagmi'
import { AuctionFactoryABI } from '../abi/contracts'
import { ConnectedAuctionCard as LiveAuctionCard } from '../components/AuctionCard'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

const ZAMA_USDC_ADDRESS = '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639'

const CONFIDENTIAL_ERC20_ABI = [
  ...erc20Abi,
  {
    type: 'function',
    name: 'underlying',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'wrap',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unwrap',
    inputs: [
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'confidentialBalanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  }
] as const

export function Dashboard() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()

  // Form states
  const [amount, setAmount] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)
  const [activeTab, setActiveTab] = useState<'shield' | 'unwrap'>('shield')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  
  const [unwrapAmount, setUnwrapAmount] = useState('')
  const [unwrapStatus, setUnwrapStatus] = useState<string | null>(null)

  // 1. Get the underlying token of Zama USDC
  const { data: underlyingAddress } = useReadContract({
    address: ZAMA_USDC_ADDRESS,
    abi: CONFIDENTIAL_ERC20_ABI,
    functionName: 'underlying',
  })

  // 2. Get Public (Underlying) Balance
  const { data: publicBalanceRaw, refetch: refetchPublicBalance } = useReadContract({
    address: underlyingAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!underlyingAddress && !!address }
  })

  // 3. Get allowance
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: underlyingAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, ZAMA_USDC_ADDRESS] : undefined,
    query: { enabled: !!underlyingAddress && !!address }
  })

  // 4. Get Decimals and Symbol
  const { data: tokenDecimals } = useReadContract({
    address: ZAMA_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals',
  })

  const { data: tokenSymbol } = useReadContract({
    address: ZAMA_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  // 5. Get Confidential Balance using Zama React SDK
  const { data: confidentialBalanceRaw, refetch: refetchConfidentialBalance } = useConfidentialBalance({
    tokenAddress: ZAMA_USDC_ADDRESS,
  }, {
    enabled: isConnected && isRevealed
  })

  // 6. Get My Auctions
  const { data: myAuctions } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: AuctionFactoryABI,
    functionName: 'getAuctionsByCreator',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  const decimals = tokenDecimals !== undefined ? tokenDecimals : 6
  const symbol = tokenSymbol || 'USDC'

  const publicBalance = publicBalanceRaw !== undefined ? formatUnits(publicBalanceRaw as bigint, decimals) : '0'
  const confidentialBalance = confidentialBalanceRaw !== undefined ? formatUnits(confidentialBalanceRaw, decimals) : '0'

  const handleMint = async () => {
    if (!address || !underlyingAddress) return
    setIsMinting(true)
    try {
      const hash = await writeContractAsync({
        address: underlyingAddress as `0x${string}`,
        abi: [{ type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
        functionName: 'mint',
        args: [address, parseUnits('1000', decimals)]
      })
      if (publicClient) {
        toast.loading('Waiting for confirmation...', { id: 'mint' })
        await publicClient.waitForTransactionReceipt({ hash })
      }
      toast.success('Successfully minted 1,000 public USDC!', { id: 'mint' })
      setTimeout(() => refetchPublicBalance(), 2000)
    } catch (err: any) {
      console.error(err)
      toast.error(`Mint failed: ${err.shortMessage || err.message}`)
    } finally {
      setIsMinting(false)
    }
  }

  const handleFund = async () => {
    if (!amount || !address || !underlyingAddress) return
    setIsProcessing(true)

    try {
      const amountRaw = parseUnits(amount, decimals)
      const currentAllowance = (allowanceRaw as bigint) || 0n

      if (currentAllowance < amountRaw) {
        // Approve first
        const hash = await writeContractAsync({
          address: underlyingAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [ZAMA_USDC_ADDRESS, amountRaw]
        })
        if (publicClient) {
          toast.loading('Confirming approval...', { id: 'fund' })
          await publicClient.waitForTransactionReceipt({ hash })
        }
        await refetchAllowance()
      }

      // Wrap (Shield)
      const wrapHash = await writeContractAsync({
        address: ZAMA_USDC_ADDRESS,
        abi: CONFIDENTIAL_ERC20_ABI,
        functionName: 'wrap',
        args: [address, amountRaw],
        gas: 500_000n, // Explicit limit — fhEVM gas estimation can overshoot
      })
      if (publicClient) {
        toast.loading('Confirming shield transaction...', { id: 'fund' })
        await publicClient.waitForTransactionReceipt({ hash: wrapHash })
      }
      
      toast.success('Successfully shielded funds!', { id: 'fund' })
      
      setAmount('')
      setTimeout(() => {
        refetchPublicBalance()
        if (isRevealed) refetchConfidentialBalance()
      }, 3000)
    } catch (err: any) {
      console.error(err)
      toast.error(`Funding failed: ${err.message || err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Unwrap via Zama SDK — single-step unwrap for this contract version
  const unwrap = useUnwrap(
    { tokenAddress: ZAMA_USDC_ADDRESS },
    {
      onMutate: () => {
        setUnwrapStatus('Unwrapping confidential tokens…')
        toast.loading('Unwrapping cUSDC → USDC…', { id: 'unwrap' })
      },
      onSuccess: () => {
        setUnwrapStatus(null)
        toast.success('Successfully unwrapped to public USDC!', { id: 'unwrap' })
        setUnwrapAmount('')
        setTimeout(() => {
          refetchPublicBalance()
          if (isRevealed) refetchConfidentialBalance()
        }, 3000)
      },
      onError: (err: any) => {
        console.error(err)
        setUnwrapStatus(null)
        toast.error(`Unwrap failed: ${err.shortMessage || err.message || err}`, { id: 'unwrap' })
      },
    }
  )

  const handleUnwrap = async () => {
    if (!unwrapAmount || !address) return
    const amountRaw = parseUnits(unwrapAmount, decimals)
    unwrap.mutate({ amount: amountRaw })
  }

  const isUnwrapping = unwrap.isPending

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h1 className="font-display-xl text-[48px] text-on-surface mb-4">Wallet Not Connected</h1>
        <p className="font-body-md text-on-surface-variant max-w-lg mb-8">
          Please connect your wallet to access your dashboard, mint testnet tokens, and shield your funds.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full gap-16">
      <header className="max-w-4xl">
        <h1 className="font-display-xl-mobile md:font-display-xl text-display-xl-mobile md:text-[80px] leading-none text-on-background mb-6">Shield Your Funds</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl text-lg md:text-xl">
          Convert public testnet tokens into fully homomorphically encrypted cUSDC. Participate in auctions with complete mathematical privacy.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b-2 border-surface-dim mb-8">
            <button
              className={`px-8 py-4 font-headline-lg text-xl transition-colors border-b-4 ${activeTab === 'shield' ? 'border-[#1c1c1e] text-[#1c1c1e]' : 'border-transparent text-on-surface-variant hover:text-[#1c1c1e]'}`}
              onClick={() => setActiveTab('shield')}
            >
              Shield
            </button>
            <button
              className={`px-8 py-4 font-headline-lg text-xl transition-colors border-b-4 ${activeTab === 'unwrap' ? 'border-[#1c1c1e] text-[#1c1c1e]' : 'border-transparent text-on-surface-variant hover:text-[#1c1c1e]'}`}
              onClick={() => setActiveTab('unwrap')}
            >
              Unwrap
            </button>
          </div>

          {activeTab === 'shield' && (
          <div className="bg-[#c3faf5] rounded-[28px] p-8 md:p-12 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="flex flex-wrap gap-4 justify-between items-start mb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Mint & Shield</h2>
            <div className="flex gap-2">
              <button 
                onClick={handleMint}
                disabled={isMinting || !underlyingAddress}
                className="bg-white text-[#1c1c1e] border-2 border-[#1c1c1e] shadow-[4px_4px_0px_#1c1c1e] px-6 py-3 rounded-[8px] font-headline-lg text-lg hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1c1c1e] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add_circle</span>
                {isMinting ? 'MINTING...' : 'Mint 1,000 USDC'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Public USDC Input */}
            <div className="bg-surface-bright rounded-2xl p-6 border-2 border-transparent">
              <div className="flex justify-between mb-2">
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase">Testnet USDC</label>
                <span className="font-label-mono text-xl font-bold text-on-surface-variant">Bal: {Number(publicBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  className="w-full bg-transparent border-none text-4xl font-display-xl-mobile md:text-display-xl-mobile focus:ring-0 p-0 text-on-surface outline-none" 
                  placeholder="0.00" 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isProcessing}
                />
                <button 
                  onClick={() => setAmount(publicBalance)}
                  className="bg-surface-variant text-on-surface px-4 py-2 rounded-full font-label-mono text-label-mono hover:bg-surface-dim transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex justify-center -my-4 relative z-10">
              <div className="bg-[#1c1c1e] text-white rounded-full p-2 shadow-md">
                <span className="material-symbols-outlined">arrow_downward</span>
              </div>
            </div>

            {/* Shielded cUSDC Output */}
            <div className="bg-surface-bright rounded-2xl p-6 border-2 border-[#1c1c1e]">
              <div className="flex justify-between mb-2">
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase">Shielded cUSDC</label>
                <span className="font-label-mono text-xl font-bold text-on-surface-variant flex items-center gap-2">
                  Bal: 
                  <span className="font-encrypted-data text-xl font-bold text-[#1c1c1e]">
                    {isRevealed ? (confidentialBalanceRaw !== undefined ? Number(confidentialBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '...') : '***'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  className="w-full bg-transparent border-none text-4xl font-display-xl-mobile md:text-display-xl-mobile focus:ring-0 p-0 text-on-surface opacity-70 outline-none" 
                  readOnly 
                  type="text" 
                  value={amount || '0.00'}
                />
                <span className="font-label-mono text-label-mono bg-[#1c1c1e] text-[#00ff41] px-2 py-1 rounded">1:1</span>
              </div>
            </div>

            <button 
              onClick={handleFund}
              disabled={!amount || isProcessing}
              className="w-full bg-[#1c1c1e] text-white rounded-full py-4 font-headline-lg text-[20px] font-semibold hover:bg-opacity-90 transition-colors mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">shield</span>
              {isProcessing ? 'Processing...' : 'Shield Funds'}
            </button>
          </div>
        </div>
        )}

        {activeTab === 'unwrap' && (
        <div className="bg-[#ffd6e8] rounded-[28px] p-8 md:p-12 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="flex flex-wrap gap-4 justify-between items-start mb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Unwrap & Unshield</h2>
            <div className="flex gap-2">
              <div className="bg-white text-[#1c1c1e] px-3 py-1 rounded-[4px] font-encrypted-data text-encrypted-data flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">public</span>
                [ REVEAL ]
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Shielded cUSDC Input */}
            <div className="bg-surface-bright rounded-2xl p-6 border-2 border-transparent">
              <div className="flex justify-between mb-2">
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase">Shielded cUSDC</label>
                <span className="font-label-mono text-xl font-bold text-on-surface-variant flex items-center gap-2">
                  Bal: 
                  <span className="font-encrypted-data text-xl font-bold text-[#1c1c1e]">
                    {isRevealed ? (confidentialBalanceRaw !== undefined ? Number(confidentialBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '...') : '***'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  className="w-full bg-transparent border-none text-4xl font-display-xl-mobile md:text-display-xl-mobile focus:ring-0 p-0 text-on-surface outline-none" 
                  placeholder="0.00" 
                  type="number" 
                  value={unwrapAmount}
                  onChange={(e) => setUnwrapAmount(e.target.value)}
                  disabled={isUnwrapping}
                />
                <button 
                  onClick={() => {
                    if (isRevealed && confidentialBalanceRaw !== undefined) {
                      setUnwrapAmount(confidentialBalance)
                    } else {
                      toast.error('Reveal your confidential balance first to use MAX')
                    }
                  }}
                  className="bg-surface-variant text-on-surface px-4 py-2 rounded-full font-label-mono text-label-mono hover:bg-surface-dim transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex justify-center -my-4 relative z-10">
              <div className="bg-[#1c1c1e] text-white rounded-full p-2 shadow-md">
                <span className="material-symbols-outlined">arrow_downward</span>
              </div>
            </div>

            {/* Public USDC Output */}
            <div className="bg-surface-bright rounded-2xl p-6 border-2 border-[#1c1c1e]">
              <div className="flex justify-between mb-2">
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase">Testnet USDC</label>
                <span className="font-label-mono text-xl font-bold text-on-surface-variant flex items-center gap-2">
                  Bal: {Number(publicBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  className="w-full bg-transparent border-none text-4xl font-display-xl-mobile md:text-display-xl-mobile focus:ring-0 p-0 text-on-surface opacity-70 outline-none" 
                  readOnly 
                  type="text" 
                  value={unwrapAmount || '0.00'}
                />
                <span className="font-label-mono text-label-mono bg-[#1c1c1e] text-white px-2 py-1 rounded">1:1</span>
              </div>
            </div>

            <button 
              onClick={handleUnwrap}
              disabled={!unwrapAmount || isUnwrapping}
              className="w-full bg-white text-[#1c1c1e] border-2 border-[#1c1c1e] rounded-full py-4 font-headline-lg text-[20px] font-semibold hover:bg-surface-dim transition-colors mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isUnwrapping ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {unwrapStatus || 'Processing…'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock_open</span>
                  Unwrap & Unshield
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>

        {/* Sidebar / Stats */}
        <div className="lg:col-span-4 space-y-8 mt-12 lg:mt-0">
          {/* Wallet Overview Card */}
          <div className="bg-surface-bright rounded-[28px] p-8 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-surface-dim">
            <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              Wallet Overview
            </h3>
            
            <div className="space-y-6">
              <div className="pb-6 border-b border-[#f2f2f2]">
                <p className="font-label-mono text-label-mono text-on-surface-variant mb-1">Public Balance</p>
                <p className="font-display-xl-mobile text-5xl font-bold text-on-surface">
                  {Number(publicBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-2xl font-normal text-on-surface-variant">USDC</span>
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex flex-col gap-1">
                    <div className="bg-[#1c1c1e] text-[#00ff41] self-start px-2 py-0.5 rounded-[4px] font-encrypted-data text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      [ ENCRYPTED ]
                    </div>
                    <p className="font-label-mono text-label-mono text-on-surface-variant">Confidential Balance</p>
                  </div>
                  <button onClick={() => setIsRevealed(!isRevealed)} className="hover:opacity-70 transition-opacity">
                    <span className="material-symbols-outlined text-[48px] text-[#1c1c1e]">
                      {isRevealed ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                <div className="bg-[#1c1c1e] inline-block px-6 py-3 rounded-[12px] mt-2">
                  <p className="font-encrypted-data text-encrypted-data text-[#00ff41] text-5xl tracking-widest">
                    {isRevealed 
                      ? (confidentialBalanceRaw !== undefined ? Number(confidentialBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'DECRYPTING...') 
                      : '####.##'} cUSDC
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="bg-surface-bright rounded-[28px] p-8 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-surface-dim">
            <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">network_check</span>
              Network Status
            </h3>
            <ul className="space-y-3">
              <li className="flex justify-between items-center py-2 border-b border-[#f2f2f2] hover:bg-[#c3faf5] transition-colors rounded px-2 -mx-2">
                <span className="font-body-md text-body-md text-on-surface">Network</span>
                <span className="font-label-mono text-label-mono font-bold text-primary">Sepolia</span>
              </li>
              <li className="flex justify-between items-center py-2 hover:bg-[#c3faf5] transition-colors rounded px-2 -mx-2">
                <span className="font-body-md text-body-md text-on-surface">FHE Status</span>
                <span className="bg-[#00ff41] text-[#1c1c1e] text-[10px] font-bold px-2 py-1 rounded-[4px] uppercase tracking-wider">Active</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* My Auctions */}
      <div className="w-full mt-8">
        <h2 className="font-display-xl text-[48px] text-on-surface mb-8">My Auctions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {myAuctions && myAuctions.length > 0 ? (
            myAuctions.map((auctionAddr, i) => (
              <LiveAuctionCard key={auctionAddr} index={i} address={auctionAddr as `0x${string}`} />
            ))
          ) : (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-[28px] border-2 border-dashed border-outline-variant/30">
              <h3 className="font-headline-lg text-[24px] text-on-surface mb-2">No auctions yet</h3>
              <p className="font-body-md text-on-surface-variant mb-6">
                You haven't created any confidential auctions.
              </p>
              <Link to="/create" className="bg-[#1c1c1e] text-white px-8 py-4 rounded-full font-label-mono text-label-mono hover:opacity-90 transition-opacity">
                Create Auction
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
