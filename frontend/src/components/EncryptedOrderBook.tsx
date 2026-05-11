import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { formatUnits, parseAbiItem } from 'viem'

export interface BidEvent {
  bidder: string
  price: string
  bidIndex: number
  txHash: string
}

export function EncryptedOrderBook({ auctionAddress }: { auctionAddress: `0x${string}` }) {
  const publicClient = usePublicClient()
  const [bids, setBids] = useState<BidEvent[]>([])

  useEffect(() => {
    if (!publicClient || !auctionAddress) return

    const fetchBids = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > 49000n ? currentBlock - 49000n : 0n

        const logs = await publicClient.getLogs({
          address: auctionAddress,
          event: parseAbiItem('event BidPlaced(address indexed bidder, uint256 price, uint256 bidIndex)'),
          fromBlock,
          toBlock: 'latest'
        })
        
        const formattedBids = logs.map(log => ({
          bidder: log.args.bidder as string,
          price: formatUnits(log.args.price as bigint, 6), // assuming 6 decimals for USDC payment token
          bidIndex: Number(log.args.bidIndex),
          txHash: log.transactionHash as string
        })).reverse() // newest first

        setBids(formattedBids)
      } catch (err) {
        console.error("Failed to fetch bids:", err)
      }
    }

    fetchBids()

    const interval = setInterval(fetchBids, 5000)
    return () => clearInterval(interval)
  }, [publicClient, auctionAddress])

  return (
    <div className="bg-white rounded-[28px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Pastel Yellow Feature Header */}
      <div className="bg-[#fef7c3] p-[32px] flex justify-between items-center flex-wrap gap-4">
        <h2 className="font-headline-lg text-[24px] md:text-headline-lg text-on-surface">Live Encrypted Order Book</h2>
        <div className="flex items-center gap-2 bg-black text-[#00ff41] px-3 py-1 rounded-[4px] font-encrypted-data text-[12px] md:text-encrypted-data">
          <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse"></span>
          LIVE SYNC
        </div>
      </div>
      
      <div className="p-6 md:p-[32px] overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="grid grid-cols-3 gap-4 font-label-mono text-label-mono text-surface-variant uppercase border-b border-[#f2f2f2] pb-4 mb-4">
            <div>Address</div>
            <div>Price (Public)</div>
            <div className="text-right">Quantity (FHE)</div>
          </div>
          
          <div className="flex flex-col">
            {bids.length === 0 ? (
              <div className="text-center py-12 text-surface-variant font-body-md text-body-md">
                No bids placed yet. Be the first!
              </div>
            ) : (
              bids.map((bid, i) => (
                <div key={`${bid.txHash}-${i}`} className="grid grid-cols-3 gap-4 items-center py-4 border-b border-[#f2f2f2] hover:bg-[#c3faf5] transition-colors group animate-fade-in">
                  <div className="font-encrypted-data text-body-md text-on-surface">
                    {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                  </div>
                  <div className="font-encrypted-data text-body-md text-on-surface">
                    ${Number(bid.price).toFixed(2)}
                  </div>
                  <div className="text-right">
                    <span className="bg-black text-[#00ff41] px-2 py-1 rounded-[4px] font-encrypted-data text-[12px] transition-colors group-hover:bg-[#1c1c1e]" title="Cryptographically hidden via FHE">
                      [ ENCRYPTED ]
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
