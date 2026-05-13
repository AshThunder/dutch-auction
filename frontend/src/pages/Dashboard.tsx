import { useState, useEffect, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { formatUnits, erc20Abi, parseUnits, toHex } from 'viem'
import { useConfidentialBalance, useEncrypt, usePublicDecrypt } from '@zama-fhe/react-sdk'
import { FACTORY_ADDRESS } from '../config/wagmi'
import { AuctionFactoryABI } from '../abi/contracts'
import { ConnectedAuctionCard as LiveAuctionCard } from '../components/AuctionCard'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

const ZAMA_USDC_ADDRESS = '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639'

// Event topic hashes for the deployed contract
const UNWRAP_REQUESTED_TOPIC = '0x4b1bfb262557cf08a74ddeefb8aef086b81deb08484bdc1820b9f420cdd1aa0e' as const
const UNWRAPPED_FINALIZED_TOPIC = '0x3838891d4843c6d7f9f494570b6fd8843f4e3c3ddb817c1411760bd31b819806' as const

interface PendingUnwrap {
  handle: `0x${string}`
  receiver: `0x${string}`
  blockNumber: bigint
  txHash: `0x${string}`
}

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
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'encryptedAmount', type: 'bytes32' },
      { name: 'inputProof', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'requestDiscloseEncryptedAmount',
    inputs: [
      { name: 'encryptedAmount', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalizeUnwrap',
    inputs: [
      { name: 'burntAmount', type: 'bytes32' },
      { name: 'burntAmountCleartext', type: 'uint64' },
      { name: 'decryptionProof', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'UnwrapRequested',
    inputs: [
      { indexed: true, name: 'receiver', type: 'address' },
      { indexed: false, name: 'amount', type: 'bytes32' }
    ],
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
  const [pendingUnwraps, setPendingUnwraps] = useState<PendingUnwrap[]>([])
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [resumingHandle, setResumingHandle] = useState<string | null>(null)
  const [pendingExpanded, setPendingExpanded] = useState(false)
  


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

  // Token symbol hook — available if needed:
  // const { data: tokenSymbol } = useReadContract({
  //   address: ZAMA_USDC_ADDRESS,
  //   abi: erc20Abi,
  //   functionName: 'symbol',
  // })

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
  // symbol available as (tokenSymbol || 'USDC') if needed

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

  const encryptMutation = useEncrypt()
  const publicDecryptMutation = usePublicDecrypt()
  const [isUnwrapping, setIsUnwrapping] = useState(false)

  // ── Pending Unwraps: scan chain for UnwrapRequested without matching Finalized ──
  const fetchPendingUnwraps = useCallback(async () => {
    if (!address || !publicClient) return
    setIsLoadingPending(true)
    try {
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n
      const paddedAddress = ('0x' + address.slice(2).toLowerCase().padStart(64, '0')) as `0x${string}`

      const fromBlockHex = '0x' + fromBlock.toString(16)
      const toBlockHex = '0x' + currentBlock.toString(16)

      const [requestedLogs, finalizedLogs] = await Promise.all([
        publicClient.request({
          method: 'eth_getLogs',
          params: [{
            address: ZAMA_USDC_ADDRESS,
            topics: [UNWRAP_REQUESTED_TOPIC, paddedAddress],
            fromBlock: fromBlockHex as `0x${string}`,
            toBlock: toBlockHex as `0x${string}`,
          }],
        }),
        publicClient.request({
          method: 'eth_getLogs',
          params: [{
            address: ZAMA_USDC_ADDRESS,
            topics: [UNWRAPPED_FINALIZED_TOPIC],
            fromBlock: fromBlockHex as `0x${string}`,
            toBlock: toBlockHex as `0x${string}`,
          }],
        }),
      ]) as [any[], any[]]

      // Collect finalized handles from topic[2] or data
      const finalizedHandles = new Set<string>()
      for (const log of finalizedLogs) {
        // UnwrappedFinalized events contain the handle; check topics and data
        if (log.topics[2]) finalizedHandles.add(log.topics[2].toLowerCase())
        if (log.data && log.data.length >= 66) {
          finalizedHandles.add(('0x' + log.data.slice(2, 66)).toLowerCase())
        }
      }

      const pending: PendingUnwrap[] = []
      for (const log of requestedLogs) {
        if (log.topics.length >= 3) {
          const handle = log.topics[2] as `0x${string}`
          if (!finalizedHandles.has(handle.toLowerCase())) {
            pending.push({
              handle,
              receiver: address,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            })
          }
        }
      }
      setPendingUnwraps(pending)
    } catch (err) {
      console.warn('Failed to fetch pending unwraps:', err)
    } finally {
      setIsLoadingPending(false)
    }
  }, [address, publicClient])

  useEffect(() => {
    if (activeTab === 'unwrap' && address && publicClient) {
      fetchPendingUnwraps()
    }
  }, [activeTab, address, publicClient, fetchPendingUnwraps])

  // ── Resume a pending unwrap from step 2 ──
  const handleResumeFinalize = async (handle: `0x${string}`) => {
    if (!publicClient) return
    setResumingHandle(handle)
    try {
      // Step 2: Request Decrypt
      toast.loading('Requesting Decryption from Coprocessor...', { id: 'resume' })
      const requestHash = await writeContractAsync({
        address: ZAMA_USDC_ADDRESS,
        abi: CONFIDENTIAL_ERC20_ABI,
        functionName: 'requestDiscloseEncryptedAmount',
        args: [handle],
        gas: 500_000n,
      })
      await publicClient.waitForTransactionReceipt({ hash: requestHash })

      // Step 3: Wait for Gateway and Finalize
      toast.loading('Waiting for Zama Gateway...', { id: 'resume' })
      let decryptedAmountClear: bigint | null = null
      let decryptionProof: string | null = null

      for (let i = 0; i < 20; i++) {
        try {
          const decryptResult = await publicDecryptMutation.mutateAsync([handle])
          if (decryptResult?.clearValues && decryptResult.clearValues[handle] !== undefined) {
            decryptedAmountClear = BigInt(decryptResult.clearValues[handle] as any)
            decryptionProof = decryptResult.decryptionProof as string
            break
          }
        } catch (_e) {
          // Ignore and retry
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      if (decryptedAmountClear === null || !decryptionProof) {
        throw new Error('Failed to get decryption from Gateway after 60s.')
      }

      toast.loading('Finalizing unwrap on-chain...', { id: 'resume' })
      const finalizeHash = await writeContractAsync({
        address: ZAMA_USDC_ADDRESS,
        abi: CONFIDENTIAL_ERC20_ABI,
        functionName: 'finalizeUnwrap',
        args: [handle, decryptedAmountClear, decryptionProof as `0x${string}`],
        gas: 500_000n,
      })
      await publicClient.waitForTransactionReceipt({ hash: finalizeHash })

      toast.success('Pending unwrap finalized! Tokens returned to wallet.', { id: 'resume' })
      setPendingUnwraps(prev => prev.filter(p => p.handle !== handle))
      setTimeout(() => refetchPublicBalance(), 3000)
    } catch (err: any) {
      console.error('Resume finalize error:', err)
      toast.error(`Finalize failed: ${err.shortMessage || err.message}`, { id: 'resume' })
    } finally {
      setResumingHandle(null)
    }
  }

  const handleUnwrap = async () => {
    if (!unwrapAmount || !address || !publicClient) return
    const amountRaw = parseUnits(unwrapAmount, decimals)
    
    setIsUnwrapping(true)
    try {
      // Step 1: Create encrypted input and Burn
      setUnwrapStatus('1/3: Encrypting & Burning...')
      const { handles, inputProof } = await encryptMutation.mutateAsync({
        values: [{ value: BigInt(amountRaw), type: "euint64" }],
        contractAddress: ZAMA_USDC_ADDRESS,
        userAddress: address
      })
      const encryptedAmount = toHex(handles[0])
      const inputProofHex = toHex(inputProof)
      
      const unwrapHash = await writeContractAsync({
        address: ZAMA_USDC_ADDRESS,
        abi: CONFIDENTIAL_ERC20_ABI,
        functionName: 'unwrap',
        args: [address, address, encryptedAmount, inputProofHex],
        gas: 1_000_000n, // Explicit gas to avoid estimation failure
      })
      toast.loading('Confirming Burn transaction...', { id: 'unwrap' })
      const unwrapReceipt = await publicClient.waitForTransactionReceipt({ hash: unwrapHash })
      
      // The deployed contract emits UnwrapRequested(address,bytes32,bytes32)
      // (topic 0x4b1bfb26...) but the SDK's findUnwrapRequested expects
      // UnwrapRequested(address,bytes32) (topic 0x77d02d35...).
      // We parse the actual 3-arg event manually: the handle is in topic[2].
      let requestHandle: `0x${string}` | null = null
      for (const log of unwrapReceipt.logs) {
        if (log.topics[0] === UNWRAP_REQUESTED_TOPIC && log.topics.length >= 3) {
          requestHandle = log.topics[2] as `0x${string}`
          break
        }
      }

      if (!requestHandle) {
        throw new Error("Could not find UnwrapRequested event in logs. The contract may have changed.")
      }
      
      // Step 2: Request Decrypt
      setUnwrapStatus('2/3: Requesting Decryption...')
      toast.loading('Requesting Decryption from Coprocessor...', { id: 'unwrap' })
      const requestHash = await writeContractAsync({
        address: ZAMA_USDC_ADDRESS,
        abi: CONFIDENTIAL_ERC20_ABI,
        functionName: 'requestDiscloseEncryptedAmount',
        args: [requestHandle],
        gas: 500_000n,
      })
      await publicClient.waitForTransactionReceipt({ hash: requestHash })
      
      // Step 3: Wait for Gateway and Finalize
      setUnwrapStatus('3/3: Waiting for Gateway & Finalizing...')
      toast.loading('Waiting for Zama Gateway... (This takes a few seconds)', { id: 'unwrap' })
      
      let decryptedAmountClear: bigint | null = null
      let decryptionProof: string | null = null
      
      // Poll gateway up to 15 times
      for (let i = 0; i < 15; i++) {
        try {
          const decryptResult = await publicDecryptMutation.mutateAsync([requestHandle])
          if (decryptResult?.clearValues && decryptResult.clearValues[requestHandle] !== undefined) {
            decryptedAmountClear = BigInt(decryptResult.clearValues[requestHandle] as any)
            decryptionProof = decryptResult.decryptionProof as string
            break
          }
        } catch (e) {
          // Ignore and wait
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      if (decryptedAmountClear === null || !decryptionProof) {
        throw new Error("Failed to get decryption from Gateway. It might be overloaded.")
      }
      
      const finalizeHash = await writeContractAsync({
        address: ZAMA_USDC_ADDRESS,
        abi: CONFIDENTIAL_ERC20_ABI,
        functionName: 'finalizeUnwrap',
        args: [requestHandle, decryptedAmountClear, decryptionProof as `0x${string}`],
        gas: 500_000n,
      })
      toast.loading('Confirming Finalize transaction...', { id: 'unwrap' })
      await publicClient.waitForTransactionReceipt({ hash: finalizeHash })
      
      setUnwrapStatus(null)
      toast.success('Successfully unwrapped to public USDC!', { id: 'unwrap' })
      setUnwrapAmount('')
      setPendingUnwraps(prev => prev.filter(p => p.handle !== requestHandle))
      setTimeout(() => {
        refetchPublicBalance()
        if (isRevealed) refetchConfidentialBalance()
      }, 3000)
    } catch (err: any) {
      console.error("Unwrap Flow Error:", err)
      setUnwrapStatus(null)
      toast.error(`Unwrap failed: ${err.shortMessage || err.message}`, { id: 'unwrap' })
    } finally {
      setIsUnwrapping(false)
    }
  }

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
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase flex items-center gap-1.5"><img src="/usdc.png" alt="USDC" className="w-4 h-4" /> Testnet USDC</label>
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
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase flex items-center gap-1.5"><img src="/usdc.png" alt="USDC" className="w-4 h-4" /> Shielded cUSDC</label>
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
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase flex items-center gap-1.5"><img src="/usdc.png" alt="USDC" className="w-4 h-4" /> Shielded cUSDC</label>
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
                <label className="font-label-mono text-label-mono text-on-surface-variant uppercase flex items-center gap-1.5"><img src="/usdc.png" alt="USDC" className="w-4 h-4" /> Testnet USDC</label>
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
                  {unwrapStatus || 'Processing...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock_open</span>
                  Unwrap & Unshield
                </>
              )}
            </button>

            {/* ── Pending Unwraps ── */}
            {isLoadingPending && (
              <div className="mt-6 text-center text-on-surface-variant font-body-md animate-pulse">
                Scanning for pending unwraps...
              </div>
            )}
            {pendingUnwraps.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setPendingExpanded(!pendingExpanded)}
                  className="w-full flex items-center justify-between bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 hover:bg-amber-100 transition-colors"
                >
                  <span className="flex items-center gap-2 font-headline-lg text-base text-on-surface">
                    <span className="material-symbols-outlined text-[20px] text-amber-600">pending_actions</span>
                    Pending Unwraps
                    <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingUnwraps.length}</span>
                  </span>
                  <span className={`material-symbols-outlined text-[20px] text-on-surface-variant transition-transform ${pendingExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                {pendingExpanded && (
                  <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    <p className="font-body-md text-xs text-on-surface-variant px-1">
                      These unwraps burned your confidential tokens but never finalized. Click to recover.
                    </p>
                    {pendingUnwraps.map((p) => (
                      <div key={p.handle} className="bg-white rounded-xl p-3 border border-amber-200 flex items-center gap-3 justify-between">
                        <div className="min-w-0">
                          <p className="font-label-mono text-xs text-on-surface-variant truncate">
                            {p.handle.slice(0, 14)}...{p.handle.slice(-6)}
                          </p>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${p.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-label-mono text-[10px] text-primary underline hover:opacity-70"
                          >
                            View TX ↗
                          </a>
                        </div>
                        <button
                          onClick={() => handleResumeFinalize(p.handle)}
                          disabled={resumingHandle === p.handle}
                          className="shrink-0 bg-amber-500 text-white px-4 py-1.5 rounded-full font-headline-lg text-xs hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {resumingHandle === p.handle ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                              Finalizing...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                              Finalize
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                  {Number(publicBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-2xl font-normal text-on-surface-variant flex items-center gap-1 mt-2 inline-flex"><img src="/usdc.png" alt="USDC" className="w-6 h-6" /> USDC</span>
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
                      : '####.##'} <span className="inline-flex items-center gap-2 align-middle"><img src="/usdc.png" alt="USDC" className="w-8 h-8" /> cUSDC</span>
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
