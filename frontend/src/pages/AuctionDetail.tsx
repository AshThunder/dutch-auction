import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWriteContract, useReadContracts, useReadContract, usePublicClient } from 'wagmi'
import { useParams } from 'react-router-dom'
import { useEncrypt, usePublicDecrypt, useConfidentialBalance, useUserDecrypt } from '@zama-fhe/react-sdk'
import { bytesToHex, parseUnits, formatUnits, erc20Abi } from 'viem'
import { DutchAuctionABI, erc7984Abi } from '../abi/contracts'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import {
  Lock, Unlock,
  Loader2, CheckCircle2, XCircle,
  Info, ArrowRight, Timer
} from 'lucide-react'
import { EncryptionStepper, type EncryptionStep } from '../components/EncryptionStepper'
import { EncryptedOrderBook } from '../components/EncryptedOrderBook'
import { PricingChart } from '../components/PricingChart'
import { ResultsModal } from '../components/ResultsModal'

const PHASE_LABELS  = ['Bidding Live', 'Calculating', 'Revealing', 'Clearing Price Revealed'] as const

// ── Balance Card (confidential payment token) ──────────────────────
function BalanceCard({
  paymentTokenAddress,
  isRevealed,
  onToggleReveal,
  bidPrice,
  onSetMax,
}: {
  paymentTokenAddress: `0x${string}`
  isRevealed: boolean
  onToggleReveal: () => void
  bidPrice: string
  onSetMax: (qty: string) => void
}) {
  const { isConnected } = useAccount()

  const { data: balanceRaw } = useConfidentialBalance(
    { tokenAddress: paymentTokenAddress },
    { enabled: isConnected && isRevealed }
  )

  const balance = balanceRaw !== undefined ? formatUnits(balanceRaw, 6) : null
  const balanceNum = balance ? parseFloat(balance) : 0

  const handleMax = () => {
    const price = parseFloat(bidPrice)
    if (!price || price <= 0 || balanceNum <= 0) return
    const maxQty = Math.floor(balanceNum / price)
    if (maxQty > 0) onSetMax(String(maxQty))
  }

  return (
    <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-variant/50 mt-4">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Lock size={16} />
        <span className="font-label-mono text-[10px] uppercase">Confidential Balance</span>
      </div>
      <div className="flex items-center gap-3">
        {isRevealed ? (
          balance !== null ? (
            <span className="font-body-md font-bold flex items-center gap-1.5"><img src="/usdc.png" alt="USDC" className="w-4 h-4" /> {Number(balance).toLocaleString(undefined, { maximumFractionDigits: 2 })} cUSDC</span>
          ) : (
            <span className="flex items-center gap-1 text-[12px]"><Loader2 size={12} className="animate-spin" /> Decrypting…</span>
          )
        ) : (
          <span className="font-body-md tracking-widest">••••••</span>
        )}
        <button
          type="button"
          className="text-[12px] font-bold underline hover:text-primary transition-colors"
          onClick={onToggleReveal}
          title={isRevealed ? 'Hide balance' : 'Reveal balance'}
        >
          {isRevealed ? 'Hide' : 'Reveal'}
        </button>
        {isRevealed && balance !== null && bidPrice && parseFloat(bidPrice) > 0 && (
          <button
            type="button"
            className="text-[12px] bg-primary text-white px-2 py-1 rounded-md font-bold hover:bg-primary/80 transition-colors"
            onClick={handleMax}
            title="Set maximum affordable quantity"
          >
            Max
          </button>
        )}
      </div>
    </div>
  )
}

export function AuctionDetail() {
  const { address: auctionAddress } = useParams<{ address: string }>()
  const { address, isConnected }    = useAccount()
  const { writeContractAsync }      = useWriteContract()
  const encrypt                     = useEncrypt()
  const publicClient                = usePublicClient()

  const [bidPrice, setBidPrice]       = useState('')
  const [bidQuantity, setBidQuantity] = useState('')
  const [bidStatus, setBidStatus]     = useState<string | null>(null)
  const [, setBidProgress] = useState(0)
  const [isBidding, setIsBidding]     = useState(false)
  const [bidSteps, setBidSteps]       = useState<EncryptionStep[]>([])
  const [bidError, setBidError]       = useState<string | null>(null)
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)

  // ── On-chain reads ────────────────────────────────────────────────
  const aa = auctionAddress as `0x${string}`
  const { data: auctionData, refetch } = useReadContracts({
    contracts: [
      { address: aa, abi: DutchAuctionABI, functionName: 'tokenToSell'      },  // [0]
      { address: aa, abi: DutchAuctionABI, functionName: 'totalSupply'      },  // [1] wei
      { address: aa, abi: DutchAuctionABI, functionName: 'totalSupplyUnits' },  // [2] whole tokens
      { address: aa, abi: DutchAuctionABI, functionName: 'floorPrice'       },  // [3]
      { address: aa, abi: DutchAuctionABI, functionName: 'endTime'          },  // [4]
      { address: aa, abi: DutchAuctionABI, functionName: 'phase'            },  // [5]
      { address: aa, abi: DutchAuctionABI, functionName: 'clearingPrice'    },  // [6]
      { address: aa, abi: DutchAuctionABI, functionName: 'getPricePointCount' }, // [7]
      { address: aa, abi: DutchAuctionABI, functionName: 'getUserBidCount',
        args: address ? [address] : undefined },                                  // [8]
      { address: aa, abi: DutchAuctionABI, functionName: 'tokenDecimals'    },  // [9]
      { address: aa, abi: DutchAuctionABI, functionName: 'owner'            },  // [10]
      { address: aa, abi: DutchAuctionABI, functionName: 'demandAboveClearing' }, // [11]
      { address: aa, abi: DutchAuctionABI, functionName: 'demandAtClearing'    }, // [12]
      { address: aa, abi: DutchAuctionABI, functionName: 'getEncryptedResultHandles' }, // [13]
      { address: aa, abi: DutchAuctionABI, functionName: 'claimRequests',
        args: address ? [address] : undefined }, // [14]
      { address: aa, abi: DutchAuctionABI, functionName: 'getClaimEncryptedAllocation',
        args: address ? [address] : undefined }, // [15]
      { address: aa, abi: DutchAuctionABI, functionName: 'paymentToken'     },  // [16]
      { address: aa, abi: DutchAuctionABI, functionName: 'getClaimEncryptedRefund',
        args: address ? [address] : undefined }, // [17]
    ],
    query: { refetchInterval: 10_000 }
  })

  const tokenAddress    = auctionData?.[0]?.result as `0x${string}` | undefined
  // totalSupplyWei available via auctionData?.[1]?.result if needed
  const totalSupplyUnits = Number(auctionData?.[2]?.result ?? 0n)
  const floorPriceRaw   = (auctionData?.[3]?.result as bigint) || 0n
  const endTime         = Number(auctionData?.[4]?.result ?? 0)
  const phase           = Number(auctionData?.[5]?.result ?? 0)
  const clearingPriceRaw = (auctionData?.[6]?.result as bigint) || 0n
  const pricePoints     = Number(auctionData?.[7]?.result ?? 0)
  const userBids        = Number(auctionData?.[8]?.result ?? 0)
  // tokenDecimals available via auctionData?.[9]?.result if needed
  const auctionOwner    = auctionData?.[10]?.result as `0x${string}` | undefined

  const claimData = auctionData?.[14]?.result as [boolean, boolean, bigint, bigint, bigint] | undefined
  const claimIsPending = claimData?.[0] ?? false
  const claimIsDecrypted = claimData?.[1] ?? false
  const claimEncAllocation = auctionData?.[15]?.result as string | undefined
  const paymentTokenAddress = auctionData?.[16]?.result as `0x${string}` | undefined
  const claimEncRefundHandle = auctionData?.[17]?.result as `0x${string}` | undefined

  const isOwner = address && auctionOwner && address.toLowerCase() === auctionOwner.toLowerCase()

  // Fetch all price points dynamically for the owner
  const { data: pricePointsData } = useReadContracts({
    contracts: Array.from({ length: pricePoints }).map((_, i) => ({
      address: aa,
      abi: DutchAuctionABI,
      functionName: 'pricePoints',
      args: [BigInt(i)]
    })),
    query: { enabled: !!isOwner && pricePoints > 0 }
  })

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress }
  })

  // ── Derived display values ────────────────────────────────────────
  const tokenName = tokenSymbol || 'Token'
  const supplyFormatted        = totalSupplyUnits.toLocaleString()
  const floorPriceFormatted    = formatUnits(floorPriceRaw, 6)
  const clearingPriceFormatted = clearingPriceRaw > 0n ? formatUnits(clearingPriceRaw, 6) : null
  const phaseLabel = PHASE_LABELS[phase]  ?? 'Ended'

  // ── Live countdown ────────────────────────────────────────────────
  const [now, setNow] = useState(Date.now() / 1000)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(t)
  }, [])
  const timeLeft = Math.max(0, endTime - now)
  const hours   = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = Math.floor(timeLeft % 60)

  const formatTime = (h: number, m: number, s: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ── Decryption Timer ──────────────────────────────────────────────
  const [decryptWaitTime, setDecryptWaitTime] = useState(0)
  useEffect(() => {
    if (phase === 1 || phase === 2) {
      const t = setInterval(() => setDecryptWaitTime(prev => prev + 1), 1000)
      return () => clearInterval(t)
    } else {
      setDecryptWaitTime(0)
    }
  }, [phase])

  // ── Coprocessor Public Decryption ──────────────────────────────────
  const publicDecrypt = usePublicDecrypt()
  const [decryptStatus, setDecryptStatus] = useState<string | null>(null)
  const [hasTriggeredDecrypt, setHasTriggeredDecrypt] = useState(false)

  // ── Private User Decryption of Refund ────────────────────────────
  // useUserDecrypt prompts the user to sign an EIP-712 to authorize the
  // Zama Gateway to return ONLY their own ciphertext. Zero public disclosure.
  const zeroHandle = '0x' + '0'.repeat(64)
  const refundHandleIsValid = claimIsDecrypted && claimEncRefundHandle && claimEncRefundHandle !== zeroHandle
  const { data: refundDecryptData } = useUserDecrypt(
    {
      handles: refundHandleIsValid && aa
        ? [{ handle: claimEncRefundHandle as `0x${string}`, contractAddress: aa }]
        : [],
    },
    { enabled: !!refundHandleIsValid && !!showResultsModal }
  )
  // Extract the decrypted refund bigint (in paymentToken wei, 6 decimals for USDC)
  const decryptedRefundRaw: bigint | undefined = refundHandleIsValid && refundDecryptData
    ? ((refundDecryptData as Record<string, unknown>)[claimEncRefundHandle as string] as bigint | undefined)
    : undefined
  const decryptedRefundFormatted = decryptedRefundRaw !== undefined
    ? formatUnits(decryptedRefundRaw, 6)
    : null

  const handleDecryptAndReveal = useCallback(async () => {
    if (!auctionAddress || !isOwner) return
    setDecryptStatus('Fetching encrypted handles from contract…')
    try {
      const handlesResult = auctionData?.[13]?.result as [string, string, string] | undefined
      if (!handlesResult) {
        setDecryptStatus('ERROR:Could not read encrypted handles. Is the clearing price calculated?')
        return
      }
      const [h1, h2, h3] = handlesResult
      const zeroHandle = '0x' + '0'.repeat(64)
      if (h1 === zeroHandle || !h1) {
        setDecryptStatus('ERROR:Encrypted handles are empty. Calculate the clearing price first.')
        return
      }

      setDecryptStatus('Requesting KMS decryption proof from Zama Coprocessor…')
      const result = await publicDecrypt.mutateAsync([
        h1 as `0x${string}`,
        h2 as `0x${string}`,
        h3 as `0x${string}`,
      ])

      setDecryptStatus('Proof received! Submitting decrypted values to contract…')
      const decryptHash = await writeContractAsync({
        address: auctionAddress as `0x${string}`,
        abi: DutchAuctionABI,
        functionName: 'onClearingPriceDecrypted',
        args: [
          result.abiEncodedClearValues as `0x${string}`,
          result.decryptionProof as `0x${string}`,
        ],
      })
      if (publicClient) {
        setDecryptStatus('Waiting for block confirmation…')
        await publicClient.waitForTransactionReceipt({ hash: decryptHash })
      }

      setDecryptStatus('SUCCESS:Clearing price revealed! Auction is now in Claiming phase.')
      toast.success('Clearing price revealed successfully!')
      refetch()
    } catch (err: any) {
      console.error('Decryption error:', err)
      setDecryptStatus(`ERROR:${err.shortMessage || err.message}`)
      toast.error(`Decryption failed: ${err.shortMessage || err.message}`)
      setHasTriggeredDecrypt(false) // allow retry
    }
  }, [auctionAddress, isOwner, auctionData, publicDecrypt, writeContractAsync, refetch])

  useEffect(() => {
    if (phase === 2 && isOwner && !hasTriggeredDecrypt && !publicDecrypt.isPending) {
      setHasTriggeredDecrypt(true)
      handleDecryptAndReveal()
    }
  }, [phase, isOwner, hasTriggeredDecrypt, publicDecrypt.isPending, handleDecryptAndReveal])

  // ── Bid submission ────────────────────────────────────────────────
  const approvalKey = address && paymentTokenAddress
    ? `operator_approved:${address.toLowerCase()}:${paymentTokenAddress.toLowerCase()}:${auctionAddress?.toLowerCase()}`
    : null
  const hasApproved = approvalKey ? localStorage.getItem(approvalKey) === '1' : false

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auctionAddress || !address || !bidQuantity || !bidPrice) return

    const quantityWhole = BigInt(Math.floor(parseFloat(bidQuantity)))
    if (quantityWhole === 0n) {
      setBidStatus('ERROR:Quantity must be a positive whole number of tokens.')
      return
    }
    if (quantityWhole > 18446744073709551615n) {
      setBidStatus('ERROR:Quantity exceeds euint64 max. Enter a smaller amount.')
      return
    }

    const priceRaw = parseUnits(bidPrice, 6)
    const costWhole = priceRaw * quantityWhole
    if (costWhole > 18446744073709551615n) {
      setBidStatus('ERROR:Total cost exceeds uint64 max. Reduce quantity or price.')
      return
    }

    setIsBidding(true)
    setBidProgress(10)
    setBidStatus('Preparing bid…')
    setBidError(null)

    const needsApproval = paymentTokenAddress && !hasApproved
    const initialSteps: EncryptionStep[] = [
      ...(needsApproval ? [{
        id: 'authorize', label: 'Authorize Operator', description: 'One-time approval for confidential transfers',
        status: 'active' as const, icon: 'unlock' as const,
      }] : []),
      { id: 'encrypt', label: 'Generate FHE Proof', description: 'Encrypting your quantity with FHE…', status: 'pending' as const, icon: 'shield' as const },
      { id: 'confirm', label: 'Confirm in Wallet', description: 'Approve the transaction in MetaMask', status: 'pending' as const, icon: 'send' as const },
      { id: 'submit', label: 'Confirm on Chain', description: 'Waiting for block confirmation…', status: 'pending' as const, icon: 'radio' as const },
    ]
    setBidSteps(initialSteps)

    const updateStep = (stepId: string, status: EncryptionStep['status']) => {
      setBidSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s))
    }

    try {
      if (paymentTokenAddress && !hasApproved) {
        const until = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
        const approveTxHash = await writeContractAsync({
          address: paymentTokenAddress,
          abi: erc7984Abi,
          functionName: 'setOperator',
          args: [auctionAddress as `0x${string}`, until]
        })
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
          if (receipt.status !== 'success') throw new Error('Authorization transaction failed')
        }
        if (approvalKey) localStorage.setItem(approvalKey, '1')
        updateStep('authorize', 'completed')
        setBidProgress(20)
      }

      updateStep('encrypt', 'active')
      setBidProgress(30)
      setBidStatus('Generating encryption proof…')
      const { handles, inputProof } = await encrypt.mutateAsync({
        values: [{ value: quantityWhole, type: 'euint64' }],
        contractAddress: auctionAddress as `0x${string}`,
        userAddress: address,
      })
      updateStep('encrypt', 'completed')

      updateStep('confirm', 'active')
      setBidProgress(60)
      setBidStatus('Confirm in wallet…')

      const txHash = await writeContractAsync({
        address: auctionAddress as `0x${string}`,
        abi: DutchAuctionABI,
        functionName: 'submitBid',
        args: [
          priceRaw,
          bytesToHex(handles[0]!),
          bytesToHex(inputProof),
        ],
      })
      updateStep('confirm', 'completed')

      updateStep('submit', 'active')
      setBidProgress(80)
      setBidStatus(`Confirming on chain…`)

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash })
      }

      updateStep('submit', 'completed')
      setBidProgress(100)
      setBidStatus('SUCCESS:Bid submitted securely!')
      toast.success('Bid submitted securely! Your quantity is encrypted on-chain.')
      setBidPrice('')
      setBidQuantity('')
      setTimeout(() => { refetch(); setBidStatus(null); setBidProgress(0); setBidSteps([]); setBidError(null) }, 5000)
    } catch (err: any) {
      console.error(err)
      setBidProgress(0)
      const errMsg = err.shortMessage || err.message
      setBidStatus(`ERROR:${errMsg}`)
      setBidError(errMsg)
      setBidSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s))
      toast.error(`Bid failed: ${errMsg}`)
    } finally {
      setIsBidding(false)
    }
  }


  const [isLocalClaiming, setIsLocalClaiming] = useState(false)
  const handleClaim = async () => {
    if (!auctionAddress || !address) return
    setIsLocalClaiming(true)
    try {
      const claimHash = await writeContractAsync({
        address: auctionAddress as `0x${string}`,
        abi: DutchAuctionABI,
        functionName: 'requestClaim',
        args: [],
      })
      if (publicClient) {
        toast.loading('Waiting for confirmation...', { id: 'claim' })
        await publicClient.waitForTransactionReceipt({ hash: claimHash })
      }
      toast.success('Claim requested! Waiting for on-chain status update…', { id: 'claim' })
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to request claim: ${err.shortMessage || err.message}`)
      setIsLocalClaiming(false)
    }
  }

  // ── Claim Decryption ────────────────────────────────────────────────
  const [claimDecryptStatus, setClaimDecryptStatus] = useState<string | null>(null)
  const [hasTriggeredClaimDecrypt, setHasTriggeredClaimDecrypt] = useState(false)

  const handleDecryptClaim = useCallback(async () => {
    if (!auctionAddress || !address) return
    setClaimDecryptStatus('Fetching encrypted allocation handle…')
    try {
      if (!claimEncAllocation || claimEncAllocation === '0x' + '0'.repeat(64)) {
        setClaimDecryptStatus('Waiting for allocation handle…')
        return
      }

      setClaimDecryptStatus('Requesting KMS decryption proof from Zama Coprocessor…')
      const result = await publicDecrypt.mutateAsync([
        claimEncAllocation as `0x${string}`,
      ])

      setClaimDecryptStatus('Proof received! Executing claim…')
      const claimExecHash = await writeContractAsync({
        address: auctionAddress as `0x${string}`,
        abi: DutchAuctionABI,
        functionName: 'executeClaimDecrypted',
        args: [
          address,
          result.abiEncodedClearValues as `0x${string}`,
          result.decryptionProof as `0x${string}`,
        ],
      })
      if (publicClient) {
        setClaimDecryptStatus('Waiting for block confirmation…')
        await publicClient.waitForTransactionReceipt({ hash: claimExecHash })
      }

      setClaimDecryptStatus('SUCCESS:Claim executed securely!')
      toast.success('Tokens claimed and refund sent!')
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0fbcb0', '#4262ff', '#ffd02f']
      })
      refetch()
    } catch (err: any) {
      console.error('Claim Decryption error:', err)
      setClaimDecryptStatus(`ERROR:${err.shortMessage || err.message}`)
      toast.error(`Claim failed: ${err.shortMessage || err.message}`)
      setHasTriggeredClaimDecrypt(false) // allow retry
    }
  }, [auctionAddress, address, claimEncAllocation, publicDecrypt, writeContractAsync, refetch])

  useEffect(() => {
    if (claimIsPending && !claimIsDecrypted && !hasTriggeredClaimDecrypt && !publicDecrypt.isPending && claimEncAllocation) {
      setHasTriggeredClaimDecrypt(true)
      handleDecryptClaim()
    }
  }, [claimIsPending, claimIsDecrypted, hasTriggeredClaimDecrypt, publicDecrypt.isPending, claimEncAllocation, handleDecryptClaim])

  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false)
  const handleCalculateClearingPrice = async () => {
    if (!auctionAddress || !pricePointsData) return
    setIsAdminActionLoading(true)
    try {
      const points = pricePointsData
        .map(d => d.result as bigint)
        .filter(b => b !== undefined)
        .sort((a, b) => a > b ? -1 : a < b ? 1 : 0)

      const calcHash = await writeContractAsync({
        address: auctionAddress as `0x${string}`,
        abi: DutchAuctionABI,
        functionName: 'calculateClearingPrice',
        args: [points],
        gas: 10_000_000n, // Zama fhEVM requires high gas limit for loops
      })
      if (publicClient) {
        toast.loading('Waiting for confirmation...', { id: 'calc' })
        await publicClient.waitForTransactionReceipt({ hash: calcHash })
      }
      toast.success('Clearing calculation initiated! Awaiting FHE Network and Gateway callback.', { id: 'calc' })
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to calculate clearing price: ${err.shortMessage || err.message}`)
    } finally {
      setIsAdminActionLoading(false)
    }
  }

  if (!auctionData) return (
    <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex justify-center items-center h-64">
      <Loader2 className="animate-spin" size={48} />
    </div>
  )

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard!')
  }

  const shareUrl = encodeURIComponent(window.location.href)
  const shareText = encodeURIComponent(`Check out this $${tokenName} auction on Zama FHE Dutch Auction — fully encrypted, zero front-running!`)

  const AuctionInfoBar = () => (
    <div className="flex flex-wrap items-center gap-4 py-4 px-6 bg-surface-container-low rounded-full border border-outline-variant mb-10">
      {/* Token name pill */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">token</span>
        <span className="font-label-mono text-base font-bold text-on-surface">${tokenName} Token Auction</span>
      </div>
      <div className="h-5 w-px bg-outline-variant hidden md:block" />
      {/* Share row */}
      <div className="flex items-center gap-4 ml-auto">
        <span className="font-label-mono text-label-mono text-on-surface-variant uppercase hidden sm:inline">Share Auction:</span>
        <div className="flex items-center gap-3">
          {/* X / Twitter */}
          <a
            href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
            title="Share on X"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>X</span>
          </a>
          <div className="h-4 w-px bg-outline-variant" />
          {/* Discord */}
          <a
            href={`https://discord.com/channels/@me`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
            title="Share on Discord"
          >
            <span className="material-symbols-outlined text-[18px]">forum</span>
            <span>Discord</span>
          </a>
          <div className="h-4 w-px bg-outline-variant" />
          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
            title="Share on Telegram"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Telegram</span>
          </a>
          <div className="h-4 w-px bg-outline-variant" />
          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
            title="Copy link"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  )

  const renderPhase0 = () => (
    <div className="w-full">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-8">
        <h1 className="font-display-xl text-display-xl-mobile md:text-display-xl text-on-surface max-w-3xl">
          Phase 0: <br/>{phaseLabel}
        </h1>
        {/* Countdown Timer */}
        <div className="bg-white rounded-[16px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] p-6 border-2 border-transparent flex flex-col items-end">
          <span className="font-label-mono text-label-mono text-surface-variant uppercase mb-2">Time Remaining</span>
          <div className="font-encrypted-data text-[32px] md:text-headline-lg text-on-surface flex items-center gap-2">
            <Timer className="text-[#1c1c1e]" size={24} />
            {timeLeft > 0 ? formatTime(hours, minutes, seconds) : '00:00:00'}
          </div>
        </div>
      </div>

      {/* Token Name + Social Sharing Bar */}
      <AuctionInfoBar />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Bidding Card */}
        <div className="lg:col-span-4">
          <div className="bg-[#fdebf7] rounded-[28px] p-8 md:p-[32px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] lg:sticky lg:top-32">
            <h2 className="font-headline-lg text-[24px] md:text-[32px] text-on-surface mb-8">Place Bid</h2>
            <form className="flex flex-col gap-6" onSubmit={handleBid}>
              
              {isConnected && paymentTokenAddress && (
                <BalanceCard
                  paymentTokenAddress={paymentTokenAddress}
                  isRevealed={isBalanceRevealed}
                  onToggleReveal={() => setIsBalanceRevealed(r => !r)}
                  bidPrice={bidPrice}
                  onSetMax={(maxQty) => setBidQuantity(maxQty)}
                />
              )}

              <div className="flex flex-col gap-2 mt-4">
                <label className="font-label-mono text-label-mono text-on-surface uppercase">Public Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-encrypted-data text-on-surface">$</span>
                  <input 
                    className="w-full bg-white border-2 border-[#1c1c1e] rounded-full py-4 pl-8 pr-4 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-0" 
                    placeholder="0.00" 
                    type="number" 
                    step="0.000001"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    required
                  />
                </div>
                <span className="font-label-mono text-[12px] text-on-surface-variant opacity-80 mt-1">Must be ≥ floor price (${floorPriceFormatted})</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-mono text-label-mono text-on-surface uppercase flex items-center gap-2">
                  Confidential Quantity
                  <Lock size={16} />
                </label>
                <input 
                  className="w-full bg-white border-2 border-[#1c1c1e] rounded-full py-4 px-4 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-0" 
                  placeholder="Enter whole tokens..." 
                  type="number"
                  step="1"
                  min="1"
                  value={bidQuantity}
                  onChange={(e) => setBidQuantity(e.target.value)}
                  required
                />
                <p className="font-label-mono text-[12px] text-on-surface-variant opacity-80 mt-1">This value will be encrypted end-to-end.</p>
              </div>

              {bidSteps.length > 0 && (
                <div className="mt-4 bg-white p-4 rounded-[16px]">
                  <EncryptionStepper steps={bidSteps} errorMessage={bidError} />
                </div>
              )}

              {bidStatus && bidSteps.length === 0 && (
                <div className={`p-4 rounded-[16px] text-sm flex items-center gap-2 ${bidStatus.startsWith('ERROR:') ? 'bg-error-container text-on-error-container' : 'bg-[#e1d4fd] text-[#1c1c1e]'}`}>
                  {bidStatus.startsWith('SUCCESS:') ? <CheckCircle2 size={16} /> : bidStatus.startsWith('ERROR:') ? <XCircle size={16} /> : <Loader2 size={16} className="animate-spin" />}
                  {bidStatus.replace(/^(SUCCESS:|ERROR:)/, '')}
                </div>
              )}

              <div className="pt-4 border-t border-[#1c1c1e]/10 mt-2">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-label-mono text-label-mono text-on-surface uppercase">Est. Total Commitment</span>
                  <span className="font-encrypted-data text-body-md text-on-surface">
                    {bidPrice && bidQuantity ? `$${(parseFloat(bidPrice) * parseFloat(bidQuantity)).toLocaleString()}` : '--'}
                  </span>
                </div>
                <button 
                  className="w-full bg-[#1c1c1e] text-white rounded-full py-4 font-bold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" 
                  type="submit"
                  disabled={!isConnected || isBidding || timeLeft <= 0}
                >
                  {isBidding ? 'Encrypting & Submitting...' : isConnected ? 'Submit Encrypted Bid' : 'Connect Wallet First'}
                </button>

                {isOwner && timeLeft <= 0 && (
                  <button 
                    className="w-full mt-4 bg-white border-2 border-[#1c1c1e] text-[#1c1c1e] rounded-full py-4 font-bold hover:bg-surface transition-colors disabled:opacity-50"
                    type="button"
                    onClick={handleCalculateClearingPrice}
                    disabled={isAdminActionLoading}
                  >
                    {isAdminActionLoading ? 'Initiating...' : 'Calculate Clearing Price'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        
        {/* Right Column: Encrypted Order Book */}
        <div className="lg:col-span-8">
          <EncryptedOrderBook auctionAddress={aa} />
        </div>
      </div>
    </div>
  )

  const renderPhase1and2 = () => (
    <div className="w-full">
      <section className="mb-16 md:mb-32 max-w-4xl">
        <div className="inline-block bg-surface-container-high px-4 py-2 rounded-full mb-6">
          <span className="font-label-mono text-label-mono text-on-surface uppercase tracking-widest flex items-center gap-2">
            <Lock className="text-sm" size={16} />
            Auction Concluded
          </span>
        </div>
        <h1 className="font-headline-lg text-[32px] md:text-headline-lg text-on-surface-variant mb-4">
          Phase {phase}: {phaseLabel}
        </h1>
        <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
          <div className="font-display-xl-mobile md:font-display-xl text-[48px] md:text-display-xl text-on-surface font-extrabold tracking-tighter opacity-50">
            $?.?? <span className="font-headline-lg text-headline-lg text-outline font-normal ml-2 flex items-center gap-2"><img src="/usdc.png" alt="USDC" className="w-6 h-6 inline-block" /> USDC</span>
          </div>
          <div className="mb-3">
            <span className="inline-flex items-center gap-2 bg-[#111111] text-[#00FF41] font-encrypted-data text-[12px] md:text-encrypted-data px-3 py-1 rounded-[4px]">
              [ COMPUTING... ]
            </span>
          </div>
        </div>
      </section>

      {/* Token Name + Social Sharing Bar */}
      <AuctionInfoBar />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-8 flex flex-col gap-12">
          <div className="flex flex-col items-center justify-center bg-white rounded-[28px] p-8 md:p-12 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-[#e6e0e9] text-center">
             <div className="mb-6">
               <Loader2 size={48} className="animate-spin mx-auto text-primary" />
             </div>
             <h3 className="font-headline-lg text-[24px] md:text-[32px] text-on-surface mb-4">
               {phase === 1 ? 'FHE Calculation in Progress' : 'Fetching Decryption Proof'}
             </h3>
             <p className="font-body-md text-[16px] text-on-surface-variant max-w-lg mb-8">
               {phase === 1 
                 ? 'The fhEVM network is currently executing the Dutch Auction clearing price algorithm securely on encrypted data.'
                 : 'The Zama Coprocessor is generating the decryption proof. The owner will submit this to reveal the final price.'}
             </p>
             <div className="font-label-mono text-label-mono opacity-50 bg-surface-container px-4 py-2 rounded-full border border-[#e6e0e9]">
               Elapsed: {Math.floor(decryptWaitTime / 60)}m {decryptWaitTime % 60}s
             </div>

             {phase === 2 && isOwner && (
               <div className="mt-8 pt-8 border-t border-[#e6e0e9] w-full max-w-md">
                 <p className="mb-4 text-sm font-bold text-error">{decryptStatus || 'Ready to trigger reveal'}</p>
                 <button 
                    className="w-full bg-[#1c1c1e] text-white py-4 rounded-full font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
                    onClick={() => { setHasTriggeredDecrypt(true); handleDecryptAndReveal() }}
                    disabled={publicDecrypt.isPending}
                 >
                   {publicDecrypt.isPending ? 'Decrypting...' : 'Reveal Clearing Price'}
                 </button>
               </div>
             )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
           <div className="bg-[#FFFACD] rounded-[28px] p-[32px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] transform -rotate-1 hover:rotate-0 transition-transform duration-300 text-[#1d1b20]">
             <h4 className="font-label-mono text-[12px] opacity-70 mb-2 uppercase tracking-widest">Total Supply</h4>
             <div className="font-headline-lg text-[32px] font-bold mb-4">
               {supplyFormatted}
             </div>
             <div className="w-full h-[1px] bg-[#1c1c1e]/10 my-4"></div>
             <h4 className="font-label-mono text-[12px] opacity-70 mb-2 uppercase tracking-widest">Floor Price</h4>
             <div className="font-headline-lg text-[32px] font-bold">
               ${floorPriceFormatted}
             </div>
           </div>
        </div>
      </div>
    </div>
  )

  const renderPhase3 = () => (
    <div className="w-full">
      <section className="mb-16 md:mb-32 max-w-4xl">
        <div className="inline-block bg-surface-container-high px-4 py-2 rounded-full mb-6">
          <span className="font-label-mono text-[12px] text-on-surface uppercase tracking-widest flex items-center gap-2">
            <Unlock className="text-sm" size={16} />
            Auction Concluded
          </span>
        </div>
        <h1 className="font-headline-lg text-[32px] md:text-headline-lg text-on-surface-variant mb-4">Phase 3: Clearing Price Revealed</h1>
        <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
          <div className="font-display-xl-mobile md:font-display-xl text-[48px] md:text-display-xl text-on-surface font-extrabold tracking-tighter">
            ${clearingPriceFormatted || '0.00'} <span className="font-headline-lg text-headline-lg text-outline font-normal ml-2 flex items-center gap-2"><img src="/usdc.png" alt="USDC" className="w-6 h-6 inline-block" /> USDC</span>
          </div>
          <div className="mb-3">
            <span className="inline-flex items-center gap-2 bg-[#111111] text-[#00FF41] font-encrypted-data text-[12px] md:text-encrypted-data px-3 py-1 rounded-[4px]">
              [ ENCRYPTED_RESULT ]
            </span>
          </div>
        </div>
      </section>

      {/* Token Name + Social Sharing Bar */}
      <AuctionInfoBar />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-8 flex flex-col gap-12">
          <PricingChart 
            auctionAddress={aa}
            floorPriceFormatted={floorPriceFormatted}
            clearingPriceFormatted={clearingPriceFormatted || '0'}
            phase={phase}
          />

          {userBids > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-[28px] p-8 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-[#e6e0e9]">
              <div className="mb-6 sm:mb-0">
                <h3 className="font-headline-lg text-[24px] md:text-[32px] text-on-surface mb-2">Your Results are Ready</h3>
                <p className="font-body-md text-[16px] text-on-surface-variant">Decrypt your final allocation and claim your tokens.</p>
                
                {claimIsDecrypted ? (
                  <div className="mt-4 inline-flex items-center gap-2 bg-[#c3faf5] text-[#1c1c1e] px-4 py-2 rounded-lg font-bold">
                    <CheckCircle2 size={18} /> Tokens & Refund Claimed
                  </div>
                ) : claimIsPending ? (
                  <div className="mt-4">
                    <p className="text-sm font-bold opacity-70 mb-2">{claimDecryptStatus || 'Waiting for decryption proof...'}</p>
                    {(!hasTriggeredClaimDecrypt && !publicDecrypt.isPending) && (
                      <button className="underline font-bold" onClick={() => { setHasTriggeredClaimDecrypt(true); handleDecryptClaim() }}>
                        Retry Claim Decryption
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
              
              {!claimIsDecrypted && !claimIsPending && (
                <button 
                  className="bg-[#1c1c1e] text-white font-body-md text-[16px] font-bold px-8 py-4 rounded-full hover:opacity-80 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto whitespace-nowrap"
                  onClick={() => setShowResultsModal(true)}
                  disabled={!isConnected}
                >
                  View Results
                  <ArrowRight size={18} />
                </button>
              )}

              {claimIsDecrypted && (
                <button 
                  className="bg-[#1c1c1e] text-white font-body-md text-[16px] font-bold px-8 py-4 rounded-full hover:opacity-80 transition-opacity flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap"
                  onClick={() => setShowResultsModal(true)}
                >
                  View Full Results
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center bg-surface-container-lowest rounded-[28px] p-8 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-[#e6e0e9] text-center">
              <span className="inline-flex items-center gap-2 bg-[#1c1c1e] text-[#00ff41] font-encrypted-data text-[12px] px-3 py-1 rounded mb-4">
                [ AUCTION SETTLED ]
              </span>
              <h3 className="font-headline-lg text-[24px] md:text-[28px] text-on-surface mb-2">Auction Complete</h3>
              <p className="font-body-md text-[16px] text-on-surface-variant max-w-md">
                This auction has concluded with a clearing price of <strong>${clearingPriceFormatted}</strong> <img src="/usdc.png" alt="USDC" className="w-4 h-4 inline-block -mt-0.5" /> USDC. You did not place a bid in this auction.
              </p>
            </div>
          )}
        </div>

        <ResultsModal 
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          onClaim={() => {
            handleClaim()
          }}
          isClaiming={isLocalClaiming || (claimIsPending && !claimIsDecrypted)}
          hasClaimed={claimIsDecrypted}
          tokensAllocated={claimIsDecrypted ? Number(claimData?.[3] ?? 0n).toLocaleString() : null}
          refundDue={
            claimIsDecrypted
              ? (decryptedRefundFormatted !== null
                  ? decryptedRefundFormatted
                  : '[ DECRYPTING... ]')
              : null
          }
          clearingPrice={clearingPriceFormatted || '0'}
          bidPrice={null}
          tokenTicker={tokenName}
        />

        <div className="lg:col-span-4 flex flex-col gap-8 relative mt-12 lg:mt-0">
          <div className="bg-[#FFE4E1] rounded-[28px] p-[32px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] transform rotate-1 hover:rotate-0 transition-transform duration-300 text-[#1d1b20]">
            <div className="flex items-center gap-2 mb-4">
              <Info size={20} />
              <span className="font-label-mono text-[12px] uppercase font-bold tracking-widest">Rule Reminder</span>
            </div>
            <h3 className="font-headline-lg text-[24px] mb-4 leading-tight">The Single-Price Rule</h3>
            <p className="font-body-md text-[14px]">
              In a Dutch Auction, everyone pays the <strong>same</strong> clearing price, regardless of how high they bid. If your bid was above ${clearingPriceFormatted}, you win an allocation at exactly ${clearingPriceFormatted}.
            </p>
          </div>

          <div className="bg-[#FFFACD] rounded-[28px] p-[32px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] transform -rotate-2 hover:rotate-0 transition-transform duration-300 mt-4 lg:mt-12 text-[#1d1b20]">
            <h4 className="font-label-mono text-[12px] opacity-70 mb-2 uppercase tracking-widest">Demand At Clearing</h4>
            <div className="font-headline-lg text-[32px] font-bold mb-4">
              {Number(auctionData?.[12]?.result ?? 0n).toLocaleString()}
            </div>
            <div className="w-full h-[1px] bg-[#1d1b20]/10 my-4"></div>
            <h4 className="font-label-mono text-[12px] opacity-70 mb-2 uppercase tracking-widest">Demand Above Clearing</h4>
            <div className="font-headline-lg text-[32px] font-bold">
              {Number(auctionData?.[11]?.result ?? 0n).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24 animate-fade-in">
      {phase === 0 && renderPhase0()}
      {(phase === 1 || phase === 2) && renderPhase1and2()}
      {phase >= 3 && renderPhase3()}
    </div>
  )
}
