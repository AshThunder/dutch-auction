import { useReadContract } from 'wagmi'
import { Link } from 'react-router-dom'
import { FACTORY_ADDRESS } from '../config/wagmi'

const FACTORY_ABI = [
  {
    type: 'function',
    name: 'getAuctionCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  }
] as const

export function Home() {
  const { data: countData } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getAuctionCount',
  })

  const count = Number(countData || 0)

  return (
    <div className="w-full flex flex-col antialiased">
      {/* Hero Section */}
      <section className="w-full bg-surface pt-16 md:pt-24 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
          <div className="space-y-8 text-left">
            <h1 className="font-display-xl text-display-xl-mobile md:text-display-xl text-on-surface">
              Launch Your Own <br/> Confidential Dutch Auctions.
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-lg text-xl">
              The first single-price Dutch auction platform where your bid quantity stays encrypted, powered by Zama's fhEVM.
            </p>
            <div className="flex gap-4 pt-4">
              <Link to="/create" className="bg-[#1c1c1e] text-white font-label-mono text-label-mono px-8 py-4 rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 w-max">
                Get Started Free
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
              </Link>
            </div>
          </div>
          
          {/* Order Book Mockup */}
          <div className="relative w-full max-w-xl mx-auto lg:mx-0 lg:ml-auto">
            <div className="bg-white rounded-[24px] shadow-[0px_16px_40px_rgba(0,0,0,0.08)] border border-outline-variant/20 p-6 md:p-8 overflow-hidden relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-lg text-[20px] font-bold text-on-surface">Live Encrypted Order Book</h3>
                <div className="flex items-center gap-2 text-error text-sm font-bold">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                  LIVE
                </div>
              </div>
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-2 text-label-mono text-on-surface-variant pb-2 border-b border-surface-variant">
                  <div>PRICE (USDC)</div>
                  <div className="text-right">QUANTITY</div>
                </div>
                {/* Rows */}
                <div className="grid grid-cols-2 items-center py-3 border-b border-surface-variant/50">
                  <div className="font-encrypted-data text-[#1c1c1e]">1,450.00</div>
                  <div className="flex justify-end">
                    <div className="bg-[#1c1c1e] text-[#00ff00] px-2 py-1 rounded-[4px] font-encrypted-data text-[12px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span> ***
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center py-3 border-b border-surface-variant/50">
                  <div className="font-encrypted-data text-[#1c1c1e]">1,445.50</div>
                  <div className="flex justify-end">
                    <div className="bg-[#1c1c1e] text-[#00ff00] px-2 py-1 rounded-[4px] font-encrypted-data text-[12px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span> ***
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center py-3 border-b border-surface-variant/50">
                  <div className="font-encrypted-data text-[#1c1c1e] font-bold">1,440.00 (Clearing)</div>
                  <div className="flex justify-end">
                    <div className="bg-[#1c1c1e] text-[#00ff00] px-2 py-1 rounded-[4px] font-encrypted-data text-[12px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span> ***
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center py-3 opacity-50">
                  <div className="font-encrypted-data text-[#1c1c1e]">1,430.00</div>
                  <div className="flex justify-end">
                    <div className="bg-[#1c1c1e] text-[#00ff00] px-2 py-1 rounded-[4px] font-encrypted-data text-[12px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span> ***
                    </div>
                  </div>
                </div>
              </div>
              {/* Gradient overlay for cropped effect */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="w-full pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="bg-white rounded-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/10 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-surface-variant/50">
          <div className="flex flex-col items-center justify-center text-center pt-4 md:pt-0">
            <div className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-2">Total Volume Locked</div>
            <div className="font-headline-lg text-[40px] text-on-surface font-bold">-</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center pt-8 md:pt-0">
            <div className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-2">Active Auctions</div>
            <div className="font-headline-lg text-[40px] text-on-surface font-bold">{count || '-'}</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center pt-8 md:pt-0">
            <div className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-2">Total Participants</div>
            <div className="font-headline-lg text-[40px] text-on-surface font-bold">-</div>
          </div>
        </div>
      </section>

      {/* Features Section (How it Works) */}
      <section className="w-full py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display-xl text-[48px] text-on-surface">How it Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-[28px] p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 relative overflow-hidden flex flex-col min-h-[320px]">
            <div className="mb-6">
              <div className="inline-block bg-tertiary-fixed text-on-tertiary-fixed font-label-mono text-label-mono px-4 py-2 rounded-full mb-6 font-bold tracking-widest">
                STEP 1
              </div>
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#1c1c1e]" style={{ fontVariationSettings: "'FILL' 1" }}>visibility_off</span>
              </div>
              <h3 className="font-headline-lg text-[24px] text-on-surface mb-4 leading-tight">Public Price,<br/>Private Quantity</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                The current clearing price is public, but your requested allocation remains completely hidden using Fully Homomorphic Encryption.
              </p>
            </div>
          </div>
          {/* Step 2 */}
          <div className="bg-white rounded-[28px] p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 relative overflow-hidden flex flex-col min-h-[320px]">
            <div className="mb-6">
              <div className="inline-block bg-tertiary-fixed text-on-tertiary-fixed font-label-mono text-label-mono px-4 py-2 rounded-full mb-6 font-bold tracking-widest">
                STEP 2
              </div>
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#1c1c1e]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <h3 className="font-headline-lg text-[24px] text-on-surface mb-4 leading-tight">Front-Run<br/>Proof</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Encrypted bidding eliminates gas wars and MEV. Your orders are processed fairly without exposing intent to the mempool.
              </p>
            </div>
          </div>
          {/* Step 3 */}
          <div className="bg-white rounded-[28px] p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 relative overflow-hidden flex flex-col min-h-[320px]">
            <div className="mb-6">
              <div className="inline-block bg-tertiary-fixed text-on-tertiary-fixed font-label-mono text-label-mono px-4 py-2 rounded-full mb-6 font-bold tracking-widest">
                STEP 3
              </div>
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#1c1c1e]" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
              </div>
              <h3 className="font-headline-lg text-[24px] text-on-surface mb-4 leading-tight">Mathematical<br/>Settlement</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                The Zama Coprocessor handles complex auction clearing logic trustlessly. Settlement is deterministic and verifiable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="w-full py-16 border-t border-b border-surface-variant/50 bg-surface-container-lowest">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-8">Trusted by leading DeFi protocols</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
            {/* Placeholder Logos using Material Icons for structural representation */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[32px]">account_balance_wallet</span>
              <span className="font-headline-lg font-bold text-xl">ProtoFi</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[32px]">currency_exchange</span>
              <span className="font-headline-lg font-bold text-xl">YieldX</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[32px]">data_usage</span>
              <span className="font-headline-lg font-bold text-xl">OmniDex</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[32px]">toll</span>
              <span className="font-headline-lg font-bold text-xl">ZetaSwap</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[32px]">hub</span>
              <span className="font-headline-lg font-bold text-xl">Nexus</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="w-full py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="bg-inverse-surface dark:bg-surface-dim rounded-[32px] p-12 md:p-20 text-center flex flex-col items-center justify-center relative overflow-hidden">
          {/* Decorative Matrix-style background elements */}
          <div className="absolute inset-0 opacity-5 pointer-events-none flex flex-wrap gap-4 p-4 overflow-hidden font-encrypted-data text-white select-none">
            01010100 01101000 01100101 00100000 01100011 01100001 01101011 01100101 00100000 01101001 01110011 00100000 01100001 00100000 01101100 01101001 01100101
          </div>
          <h2 className="font-display-xl text-display-xl-mobile md:text-[64px] text-surface-bright relative z-10 mb-8 max-w-2xl">
            Ready to bid with privacy?
          </h2>
          <Link to="/explore" className="bg-white text-[#1c1c1e] font-label-mono text-label-mono px-10 py-5 rounded-full hover:bg-surface-variant transition-colors relative z-10 shadow-[0px_4px_10px_rgba(255,255,255,0.1)] flex items-center gap-3 w-max">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            Connect Wallet
          </Link>
        </div>
      </section>
    </div>
  )
}
