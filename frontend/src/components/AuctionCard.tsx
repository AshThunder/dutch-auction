import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useReadContracts, useReadContract } from 'wagmi'
import { formatUnits, erc20Abi } from 'viem'
import { DutchAuctionABI } from '../abi/contracts'
const PHASE_LABELS = ['LIVE', 'CALCULATING', 'REVEALING', 'CLAIMING'] as const
const TINT_CLASSES = [
  'bg-[#c3faf5]', 
  'bg-[#e1d4fd]', 
  'bg-[#ffdf93]',
  'bg-[#ffdad6]'
] as const

interface AuctionCardProps {
  address: string
  tokenName?: string
  supply: string
  floorPrice: string
  endTime: number
  phase: number
  index: number
}

export function AuctionCard({
  address,
  tokenName = 'ERC-20',
  supply,
  floorPrice,
  endTime,
  phase,
  index,
}: AuctionCardProps) {
  const [now, setNow] = useState(Date.now() / 1000)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now() / 1000)
    }, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])
  
  const timeLeft = Math.max(0, endTime - now)
  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)

  const tintClass = TINT_CLASSES[index % TINT_CLASSES.length]
  const phaseLabel = PHASE_LABELS[phase] ?? 'ENDED'
  
  // Choose pill text color based on phase
  const pillTextColor = phase === 0 ? 'text-[#1cd25d]' : 'text-surface-variant'

  return (
    <article className={`${tintClass} rounded-[28px] p-8 flex flex-col gap-6 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300`}>
      <div className="flex justify-between items-start">
        <span className={`bg-[#1c1c1e] ${pillTextColor} px-3 py-1 rounded-[4px] font-encrypted-data text-encrypted-data tracking-widest`}>
          [ {phaseLabel} ]
        </span>
        <div className="text-right">
          <p className="font-label-mono text-label-mono text-[#1c1c1e] opacity-60 mb-1">
            {phase === 0 ? 'ENDS IN' : 'STATUS'}
          </p>
          <p className="font-encrypted-data text-encrypted-data text-lg text-[#1c1c1e]">
            {phase === 0 
              ? timeLeft > 0 ? `${hours}h ${minutes}m` : 'ENDED' 
              : phaseLabel}
          </p>
        </div>
      </div>
      
      <div className="flex-grow flex flex-col justify-center py-6">
        <h2 className="font-display-xl text-[48px] text-[#1c1c1e] leading-none mb-2">{tokenName}</h2>
        <p className="font-body-md text-body-md text-[#1c1c1e] opacity-70">Confidential Allocation</p>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-baseline border-b border-[#1c1c1e]/10 pb-4">
          <span className="font-label-mono text-label-mono text-[#1c1c1e] opacity-60">FLOOR PRICE</span>
          <span className="font-headline-lg text-headline-lg text-[#1c1c1e]">{floorPrice}</span>
        </div>
        
        <div className="flex justify-between items-baseline border-b border-[#1c1c1e]/10 pb-4">
          <span className="font-label-mono text-label-mono text-[#1c1c1e] opacity-60">SUPPLY</span>
          <span className="font-encrypted-data text-[18px] text-[#1c1c1e]">{supply}</span>
        </div>
        
        <Link 
          to={`/auction/${address}`}
          className="w-full bg-[#1c1c1e] text-white py-4 rounded-full font-label-mono text-label-mono hover:opacity-80 transition-opacity text-center mt-2 block"
        >
          View Auction
        </Link>
      </div>
    </article>
  )
}

export function ConnectedAuctionCard({ address, index }: { address: `0x${string}`; index: number }) {
  const { data: auctionData } = useReadContracts({
    contracts: [
      { address, abi: DutchAuctionABI, functionName: 'tokenToSell' },
      { address, abi: DutchAuctionABI, functionName: 'totalSupplyUnits' },
      { address, abi: DutchAuctionABI, functionName: 'floorPrice' },
      { address, abi: DutchAuctionABI, functionName: 'endTime' },
      { address, abi: DutchAuctionABI, functionName: 'phase' },
    ],
  })

  const tokenAddress = auctionData?.[0]?.result as `0x${string}` | undefined
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress }
  })

  const tokenName = tokenSymbol || 'Token'
  const supply = (auctionData?.[1]?.result as bigint) || 0n
  const floorPrice = (auctionData?.[2]?.result as bigint) || 0n
  const endTime = Number(auctionData?.[3]?.result ?? 0)
  const phase = Number(auctionData?.[4]?.result ?? 0)

  return (
    <AuctionCard
      address={address}
      index={index}
      tokenName={tokenName}
      supply={supply.toLocaleString()}
      floorPrice={formatUnits(floorPrice, 6)}
      endTime={endTime}
      phase={phase}
    />
  )
}
