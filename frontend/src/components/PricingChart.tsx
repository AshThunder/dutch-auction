import React, { useEffect, useState, useMemo } from 'react'
import { usePublicClient } from 'wagmi'
import { formatUnits, parseAbiItem } from 'viem'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Cell
} from 'recharts'

interface PricingChartProps {
  auctionAddress: `0x${string}`
  floorPriceFormatted: string
  clearingPriceFormatted: string
  phase: number
}

export function PricingChart({ auctionAddress, floorPriceFormatted, clearingPriceFormatted, phase }: PricingChartProps) {
  const publicClient = usePublicClient()
  const [bids, setBids] = useState<{ price: number }[]>([])

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
        
        const mapped = logs.map(log => ({
          price: Number(formatUnits(log.args.price as bigint, 6))
        }))
        setBids(mapped)
      } catch (err) {
        console.error("Failed to fetch bids for chart:", err)
      }
    }

    fetchBids()
  }, [publicClient, auctionAddress])

  // Group bids by price to create histogram data
  const chartData = useMemo(() => {
    const counts: Record<number, number> = {}
    bids.forEach(b => {
      counts[b.price] = (counts[b.price] || 0) + 1
    })

    // Add floor price if it doesn't exist to anchor the chart
    const floor = Number(floorPriceFormatted)
    if (counts[floor] === undefined) counts[floor] = 0

    return Object.entries(counts)
      .map(([price, count]) => ({
        price: Number(price),
        bids: count
      }))
      .sort((a, b) => a.price - b.price)
  }, [bids, floorPriceFormatted])

  const clearing = Number(clearingPriceFormatted)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1c1c1e] text-white p-4 rounded-lg shadow-lg font-label-mono text-[12px]">
          <p className="font-bold text-[14px] mb-1">${Number(label).toFixed(2)}</p>
          <p className="text-[#00ff41]">{payload[0].value} bid(s) placed</p>
          <p className="opacity-60 text-[10px] mt-2">Quantities are encrypted</p>
        </div>
      )
    }
    return null
  }

  // Only render if we have data or if the phase is Claiming (3) meaning auction ended
  if (bids.length === 0 && phase !== 3) return null

  return (
    <div className="bg-surface-container-lowest rounded-[28px] shadow-[0px_12px_32px_rgba(0,0,0,0.08)] p-8 md:p-12 relative overflow-hidden border border-surface-variant/50">
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-headline-lg text-[24px] md:text-[32px] text-on-surface">Pricing Distribution</h2>
        <span className="font-label-mono text-[12px] text-outline">VOLUME vs PRICE</span>
      </div>
      
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e0e9" />
            <XAxis 
              dataKey="price" 
              tickFormatter={(val) => `$${Number(val).toFixed(2)}`}
              stroke="#7a7582"
              tick={{ fontSize: 12, fontFamily: 'Space Mono' }}
              dy={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              allowDecimals={false}
              stroke="#7a7582"
              tick={{ fontSize: 12, fontFamily: 'Space Mono' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: '#f8f2fa' }} content={<CustomTooltip />} />
            
            <ReferenceLine 
              x={Number(floorPriceFormatted)} 
              stroke="#7a7582" 
              strokeDasharray="3 3"
              label={{ position: 'top', value: 'Floor', fill: '#7a7582', fontSize: 12, fontFamily: 'Space Mono' }} 
            />
            
            {phase === 3 && clearing > 0 && (
              <ReferenceLine 
                x={clearing} 
                stroke="#1c1c1e" 
                strokeWidth={2}
                label={{ position: 'top', value: 'Clearing Price', fill: '#1c1c1e', fontSize: 12, fontWeight: 700, fontFamily: 'Space Mono' }} 
              />
            )}

            <Bar dataKey="bids" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => {
                // Highlight winning bids if auction ended
                const isWinner = phase === 3 && entry.price >= clearing
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isWinner ? '#c9a74d' : '#6750a4'} 
                    fillOpacity={isWinner ? 1 : 0.6}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
