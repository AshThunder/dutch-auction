import { useState, useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { erc20Abi } from 'viem'
import { FACTORY_ADDRESS } from '../config/wagmi'
import { ConnectedAuctionCard as AuctionCard } from '../components/AuctionCard'
import { Search } from 'lucide-react'

const FACTORY_ABI = [
  {
    type: 'function',
    name: 'getAuctionCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'auctions',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  }
] as const

const AUCTION_ABI = [
  {
    type: 'function',
    name: 'totalSupplyUnits',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'phase',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  }
] as const

export function Explore() {
  const { data: countData } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getAuctionCount',
  })

  const count = Number(countData || 0)

  const { data: auctionsData } = useReadContracts({
    contracts: Array.from({ length: count }).map((_, i) => ({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'auctions',
      args: [BigInt(i)]
    }))
  })

  const auctionAddresses = useMemo(() => {
    return auctionsData?.map(d => d.result as `0x${string}`).filter(Boolean) || []
  }, [auctionsData])

  const { data: auctionDetails } = useReadContracts({
    contracts: auctionAddresses.flatMap(addr => [
      { address: addr, abi: AUCTION_ABI, functionName: 'phase' },
      { address: addr, abi: AUCTION_ABI, functionName: 'totalSupplyUnits' },
      { address: addr, abi: [{ type: 'function', name: 'tokenToSell', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' }] as const, functionName: 'tokenToSell' },
    ])
  })

  // Fetch token symbols for search
  const tokenAddresses = useMemo(() => {
    if (!auctionDetails) return []
    return auctionAddresses.map((_, i) => auctionDetails[i * 3 + 2]?.result as `0x${string}` | undefined)
  }, [auctionAddresses, auctionDetails])

  const { data: tokenSymbols } = useReadContracts({
    contracts: tokenAddresses.map(addr => ({
      address: addr || '0x0000000000000000000000000000000000000000' as `0x${string}`,
      abi: erc20Abi,
      functionName: 'symbol' as const,
    })),
    query: { enabled: tokenAddresses.some(Boolean) }
  })

  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'concluded'>('all')
  const [search, setSearch] = useState('')

  const auctionsWithDetails = useMemo(() => {
    if (!auctionDetails) return auctionAddresses.map((addr, i) => ({ address: addr, index: i, phase: 0, supply: 0n, symbol: '' }))
    return auctionAddresses.map((addr, i) => {
      const phase = Number(auctionDetails[i * 3]?.result ?? 0)
      const supply = (auctionDetails[i * 3 + 1]?.result as bigint) ?? 0n
      const symbol = (tokenSymbols?.[i]?.result as string) || ''
      return { address: addr, index: i, phase, supply, symbol }
    })
  }, [auctionAddresses, auctionDetails, tokenSymbols])

  const displayAuctions = useMemo(() => {
    const searchLower = search.toLowerCase().trim()
    const filtered = auctionsWithDetails.filter(a => {
      if (filter === 'active') return a.phase === 0
      if (filter === 'concluded') return a.phase > 0
      return true
    }).filter(a => {
      if (!searchLower) return true
      return (
        a.address.toLowerCase().includes(searchLower) ||
        a.symbol.toLowerCase().includes(searchLower)
      )
    }).reverse()

    return filtered
  }, [auctionsWithDetails, filter, search])

  const getPillClass = (active: boolean) => 
    active 
      ? "bg-[#1c1c1e] text-white px-6 py-2 rounded-full font-label-mono text-label-mono shadow-[0px_4px_10px_rgba(0,0,0,0.05)]"
      : "bg-surface-container-lowest text-on-surface border-2 border-[#1c1c1e] px-6 py-2 rounded-full font-label-mono text-label-mono hover:bg-surface-container-low transition-colors shadow-[0px_4px_10px_rgba(0,0,0,0.05)]"

  return (
    <div className="flex flex-col gap-12 w-full">
      <header className="flex flex-col gap-6 items-start">
        <h1 className="font-display-xl text-display-xl-mobile md:text-display-xl text-on-surface">Explore Auctions</h1>
        
        {/* Pill Tab Navigation & Filters Container */}
        <div className="flex flex-col md:flex-row justify-between w-full gap-6 items-start md:items-center">
          {/* Pill Tabs */}
          <div className="flex flex-wrap gap-2">
            <button className={getPillClass(filter === 'all')} onClick={() => setFilter('all')}>All Auctions</button>
            <button className={getPillClass(filter === 'active')} onClick={() => setFilter('active')}>Active</button>
            <button className={getPillClass(filter === 'concluded')} onClick={() => setFilter('concluded')}>Concluded</button>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                className="w-full bg-surface-container-lowest border-2 border-[#1c1c1e] rounded-full py-3 pl-12 pr-4 font-body-md text-body-md focus:outline-none focus:ring-0 shadow-[0px_4px_10px_rgba(0,0,0,0.05)]" 
                placeholder="Search..." 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="bg-surface-container-lowest border-2 border-[#1c1c1e] rounded-full px-6 py-3 flex items-center gap-2 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] hover:bg-surface-container-low transition-colors whitespace-nowrap">
              <span className="font-label-mono text-label-mono">Filter</span>
              <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>
        </div>
      </header>

      {/* Auction Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayAuctions.map((a) => (
          <AuctionCard key={a.address} index={a.index} address={a.address as `0x${string}`} />
        ))}
        {displayAuctions.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-[28px] border-2 border-dashed border-outline-variant/30">
            <Search size={48} className="text-outline-variant mb-4" />
            <h3 className="font-headline-lg text-[24px] text-on-surface mb-2">No auctions found</h3>
            <p className="font-body-md text-on-surface-variant mb-6">
              Try adjusting your filters or create a new auction.
            </p>
            <a href="/create" className="bg-[#1c1c1e] text-white px-8 py-4 rounded-full font-label-mono text-label-mono hover:opacity-90 transition-opacity">
              Create Auction
            </a>
          </div>
        )}
      </section>
    </div>
  )
}
