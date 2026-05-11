import { Link } from 'react-router-dom'

export function HowItWorks() {
  return (
    <div className="flex flex-col min-h-screen -mx-margin-mobile md:-mx-margin-desktop -my-12 w-[calc(100%+2*16px)] md:w-[calc(100%+2*48px)]">
      {/* Main Content */}
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24 space-y-32">

        {/* ── Hero Section ────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center space-x-2 bg-on-surface text-on-primary px-3 py-1 rounded-md mb-4">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span className="font-label-mono text-label-mono uppercase">[ ENCRYPTED ]</span>
            </div>
            <h1 className="font-display-xl text-display-xl-mobile md:text-display-xl text-on-surface leading-tight">
              Fully Homomorphic Encryption <span className="text-surface-variant">&amp;</span> <br /> Dutch Auctions.
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl text-lg">
              Discover how Zama's FHE technology enables blind bidding, price discovery, and encrypted trade execution on a completely transparent public ledger.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                to="/explore"
                className="bg-[#1c1c1e] text-on-primary font-body-md text-body-md px-8 py-4 rounded-full hover:opacity-80 transition-opacity"
              >
                Explore Auctions
              </Link>
              <a
                href="https://docs.zama.ai/fhevm"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface text-on-surface border-2 border-[#1c1c1e] font-body-md text-body-md px-8 py-4 rounded-full hover:bg-surface-container transition-colors flex items-center space-x-2"
              >
                <span className="material-symbols-outlined">play_circle</span>
                <span>Read the Docs</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            {/* Floating Sticky Note Mockup */}
            <div className="bg-[#ffeb3b] p-8 rounded-[28px] shadow-[0px_4px_10px_rgba(0,0,0,0.08)] transform rotate-2 relative z-10 max-w-sm ml-auto">
              <div className="font-label-mono text-label-mono text-on-surface mb-4 border-b border-on-surface/20 pb-2">LIVE SIMULATION</div>
              <div className="space-y-4 font-encrypted-data text-encrypted-data">
                <div className="flex justify-between items-center border-b border-on-surface/10 pb-2">
                  <span>BID_ID_0942</span>
                  <span className="bg-on-surface text-surface px-2 py-1 rounded text-xs">HIDDEN</span>
                </div>
                <div className="flex justify-between items-center border-b border-on-surface/10 pb-2">
                  <span>BID_ID_0943</span>
                  <span className="bg-on-surface text-surface px-2 py-1 rounded text-xs">HIDDEN</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>PRICE_DISCOVERY</span>
                  <span className="text-on-surface font-bold animate-pulse">CALCULATING...</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Technical Workflow ──────────────────────────────────── */}
        <section className="space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">The Privacy Engine Workflow</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Step-by-step breakdown of how bids are encrypted, processed, and resolved without ever revealing the underlying data.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-surface-container-lowest p-8 rounded-[28px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-surface-variant hover:border-primary transition-colors">
              <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-display-xl text-xl mb-6">1</div>
              <h3 className="font-headline-lg text-xl mb-4 text-on-surface">Client-Side Encryption</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">Bidders encrypt their maximum price and quantity locally using FHE. Only ciphertext is ever sent to the network.</p>
              <div className="bg-[#1c1c1e] p-4 rounded-xl font-encrypted-data text-encrypted-data text-surface flex items-center justify-between">
                <span className="text-[#00ff41] truncate">0x9f86d081884c7d65...</span>
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-container-lowest p-8 rounded-[28px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-surface-variant hover:border-primary transition-colors">
              <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-display-xl text-xl mb-6">2</div>
              <h3 className="font-headline-lg text-xl mb-4 text-on-surface">FHE Smart Contract</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">The smart contract aggregates and sorts all encrypted bids to determine the clearing price—all while the data remains encrypted.</p>
              <div className="bg-surface-variant p-4 rounded-xl flex justify-center items-center h-[56px]">
                <span className="material-symbols-outlined animate-spin">sync</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-container-lowest p-8 rounded-[28px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-surface-variant hover:border-primary transition-colors">
              <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-display-xl text-xl mb-6">3</div>
              <h3 className="font-headline-lg text-xl mb-4 text-on-surface">Encrypted Clearing</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">Winning bids are processed and tokens are allocated at the clearing price. Losing bids remain completely private forever.</p>
              <div className="bg-tertiary-container text-on-tertiary-container p-4 rounded-xl font-label-mono text-label-mono flex justify-between items-center h-[56px]">
                <span>CLEARING_PRICE:</span>
                <span className="font-bold">REVEALED</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── The Value of Privacy ────────────────────────────────── */}
        <section className="bg-surface-container rounded-[28px] p-8 md:p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)] overflow-hidden relative">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 relative z-10">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">The Value of True Privacy</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">By keeping bids encrypted throughout the entire auction process, we eliminate front-running and guarantee a fair outcome for all participants.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center relative z-10">
            {/* Bidders */}
            <div className="space-y-4">
              <div className="bg-primary-fixed p-6 rounded-2xl shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-primary-fixed-dim flex justify-between items-center">
                <span className="font-headline-lg text-xl text-on-primary-fixed">Bidder A</span>
                <span className="material-symbols-outlined text-on-primary-fixed">lock</span>
              </div>
              <div className="bg-secondary-fixed p-6 rounded-2xl shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-secondary-fixed-dim flex justify-between items-center">
                <span className="font-headline-lg text-xl text-on-secondary-fixed">Bidder B</span>
                <span className="material-symbols-outlined text-on-secondary-fixed">lock</span>
              </div>
              <div className="bg-tertiary-fixed p-6 rounded-2xl shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-tertiary-fixed-dim flex justify-between items-center">
                <span className="font-headline-lg text-xl text-on-tertiary-fixed">Bidder C</span>
                <span className="material-symbols-outlined text-on-tertiary-fixed">lock</span>
              </div>
            </div>

            {/* FHE Engine */}
            <div className="flex flex-col items-center justify-center space-y-4 relative">
              <div className="bg-[#1c1c1e] text-on-primary p-8 rounded-full w-48 h-48 flex flex-col items-center justify-center text-center shadow-[0px_4px_10px_rgba(0,0,0,0.08)] border-4 border-surface z-10">
                <span className="material-symbols-outlined text-4xl mb-2 text-[#00ff41]">enhanced_encryption</span>
                <span className="font-label-mono text-label-mono uppercase mt-2">FHE Network</span>
              </div>
              <div className="hidden md:block absolute top-1/2 left-[-50%] right-[-50%] h-0.5 border-t-2 border-dashed border-outline-variant -translate-y-1/2 -z-10"></div>
            </div>

            {/* Outcomes */}
            <div className="bg-surface-bright p-8 rounded-[28px] shadow-[0px_4px_10px_rgba(0,0,0,0.05)] border border-surface-variant transform md:rotate-2">
              <div className="font-label-mono text-label-mono text-on-surface mb-6 border-b border-on-surface/10 pb-2">AUCTION OUTCOME</div>
              <ul className="space-y-6 font-body-md text-body-md text-on-surface">
                <li className="flex items-start space-x-4">
                  <div className="bg-secondary-container text-on-secondary-container p-2 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">front_hand</span>
                  </div>
                  <div>
                    <div className="font-bold">Zero Front-running</div>
                    <div className="text-sm text-on-surface-variant mt-1">Bids are hidden, preventing manipulation.</div>
                  </div>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="bg-primary-container text-on-primary-container p-2 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">balance</span>
                  </div>
                  <div>
                    <div className="font-bold">Fair Price Discovery</div>
                    <div className="text-sm text-on-surface-variant mt-1">Clearing price calculated mathematically.</div>
                  </div>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="bg-tertiary-container text-on-tertiary-container p-2 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                  </div>
                  <div>
                    <div className="font-bold">Private Losing Bids</div>
                    <div className="text-sm text-on-surface-variant mt-1">Unsuccessful bids remain encrypted forever.</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Pictorial Example ────────────────────────────────────── */}
        <section className="space-y-16 pt-16 pb-16">
          <div className="text-left max-w-4xl space-y-6">
            <h2 className="font-display-xl text-4xl md:text-6xl text-on-surface tracking-tight">
              The Math Simplified. <br />
              <span className="text-on-surface-variant">$NOVA Auction Example</span>
            </h2>
            <p className="font-body-md text-xl text-on-surface-variant max-w-2xl leading-relaxed">
              A practical breakdown of how bids are resolved, the clearing price is found, and refunds are calculated automatically using FHE.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Bids Breakdown */}
            <div className="space-y-12">
              <div className="space-y-4 border-t-2 border-on-surface pt-6">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-headline-lg text-2xl text-on-surface">Available Supply</h3>
                  <span className="font-label-mono text-xl">450 $NOVA</span>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-label-mono text-sm tracking-widest text-on-surface-variant uppercase">Encrypted Bids Received</h4>
                <ul className="space-y-4">
                  <li className="flex justify-between items-center py-4 border-b border-surface-variant">
                    <span className="font-headline-lg text-lg">Alice</span>
                    <span className="font-label-mono">100 @ $8 <span className="text-on-surface-variant ml-2">(Max $800)</span></span>
                  </li>
                  <li className="flex justify-between items-center py-4 border-b border-surface-variant">
                    <span className="font-headline-lg text-lg">Bob</span>
                    <span className="font-label-mono">200 @ $6 <span className="text-on-surface-variant ml-2">(Max $1200)</span></span>
                  </li>
                  <li className="flex justify-between items-center py-4 border-b border-surface-variant">
                    <span className="font-headline-lg text-lg">Charlie</span>
                    <span className="font-label-mono">150 @ $5 <span className="text-on-surface-variant ml-2">(Max $750)</span></span>
                  </li>
                  <li className="flex justify-between items-center py-4 border-b border-surface-variant opacity-50">
                    <span className="font-headline-lg text-lg line-through">David</span>
                    <span className="font-label-mono line-through">100 @ $4 <span className="text-on-surface-variant ml-2">(Below floor)</span></span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#ffeb3b] p-8 rounded-2xl flex justify-between items-center shadow-[0px_8px_24px_rgba(0,0,0,0.08)]">
                <span className="font-headline-lg text-2xl text-[#1c1c1e]">Clearing Price</span>
                <span className="font-display-xl text-5xl text-[#1c1c1e]">$5</span>
              </div>
              <p className="font-body-md text-on-surface-variant">
                The top 450 tokens bid clear at the lowest winning price ($5). David's bid is unsuccessful and his locked funds are returned.
              </p>
            </div>

            {/* Refund Spotlight Grid */}
            <div className="space-y-8">
              <h4 className="font-label-mono text-sm tracking-widest text-on-surface-variant uppercase mb-6">Refund Spotlight</h4>
              <div className="grid grid-cols-1 gap-6">
                {/* Alice */}
                <div className="bg-[#1c1c1e] text-surface p-8 flex flex-col space-y-6 rounded-[16px]">
                  <div className="flex justify-between items-baseline border-b border-surface/20 pb-4">
                    <span className="font-display-xl text-2xl">Alice</span>
                    <span className="font-label-mono text-[#00ff41]">100 $NOVA</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 font-label-mono text-sm">
                    <div className="space-y-1">
                      <span className="text-surface/50 uppercase block">Max Paid</span>
                      <div className="text-lg">$800</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-surface/50 uppercase block">Actual Cost</span>
                      <div className="text-lg">$500</div>
                    </div>
                    <div className="space-y-1 border-l border-surface/20 pl-4">
                      <span className="text-surface/50 uppercase block">Refund</span>
                      <div className="text-xl font-bold text-surface">+$300</div>
                    </div>
                  </div>
                </div>

                {/* Bob */}
                <div className="bg-[#1c1c1e] text-surface p-8 flex flex-col space-y-6 rounded-[16px]">
                  <div className="flex justify-between items-baseline border-b border-surface/20 pb-4">
                    <span className="font-display-xl text-2xl">Bob</span>
                    <span className="font-label-mono text-[#00ff41]">200 $NOVA</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 font-label-mono text-sm">
                    <div className="space-y-1">
                      <span className="text-surface/50 uppercase block">Max Paid</span>
                      <div className="text-lg">$1200</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-surface/50 uppercase block">Actual Cost</span>
                      <div className="text-lg">$1000</div>
                    </div>
                    <div className="space-y-1 border-l border-surface/20 pl-4">
                      <span className="text-surface/50 uppercase block">Refund</span>
                      <div className="text-xl font-bold text-surface">+$200</div>
                    </div>
                  </div>
                </div>

                {/* Charlie */}
                <div className="border-2 border-[#1c1c1e] text-[#1c1c1e] p-8 flex flex-col space-y-6 rounded-[16px]">
                  <div className="flex justify-between items-baseline border-b border-[#1c1c1e]/20 pb-4">
                    <span className="font-display-xl text-2xl">Charlie</span>
                    <span className="font-label-mono">150 $NOVA</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 font-label-mono text-sm">
                    <div className="space-y-1">
                      <span className="text-[#1c1c1e]/50 uppercase block">Max Paid</span>
                      <div className="text-lg">$750</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[#1c1c1e]/50 uppercase block">Actual Cost</span>
                      <div className="text-lg">$750</div>
                    </div>
                    <div className="space-y-1 border-l border-[#1c1c1e]/20 pl-4">
                      <span className="text-[#1c1c1e]/50 uppercase block">Refund</span>
                      <div className="text-xl font-bold text-[#1c1c1e]">$0</div>
                    </div>
                  </div>
                </div>

                {/* David - loser */}
                <div className="border-2 border-dashed border-outline text-outline p-8 flex flex-col space-y-6 rounded-[16px] opacity-70">
                  <div className="flex justify-between items-baseline border-b border-outline/20 pb-4">
                    <span className="font-display-xl text-2xl">David</span>
                    <span className="font-label-mono">0 $NOVA</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 font-label-mono text-sm">
                    <div className="space-y-1">
                      <span className="opacity-50 uppercase block">Max Paid</span>
                      <div className="text-lg">$400</div>
                    </div>
                    <div className="space-y-1">
                      <span className="opacity-50 uppercase block">Actual Cost</span>
                      <div className="text-lg">$0</div>
                    </div>
                    <div className="space-y-1 border-l border-outline/20 pl-4">
                      <span className="opacity-50 uppercase block">Refund</span>
                      <div className="text-xl font-bold">+$400</div>
                    </div>
                  </div>
                  <p className="font-label-mono text-[10px] tracking-widest uppercase opacity-60">[ BID BELOW CLEARING — FULL REFUND — BID STAYS PRIVATE ]</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className="text-center py-16 space-y-8">
          <div className="inline-flex items-center gap-2 bg-on-surface text-on-primary px-3 py-1 rounded-md mb-4">
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span className="font-label-mono text-label-mono uppercase">[ LIVE ON SEPOLIA ]</span>
          </div>
          <h2 className="font-display-xl text-display-xl-mobile md:text-display-xl text-on-surface leading-tight">
            Ready to bid privately?
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto">
            Connect your wallet and place a confidential bid in any active auction. Your strategy, your privacy.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link
              to="/explore"
              className="bg-[#1c1c1e] text-on-primary font-body-md text-body-md px-10 py-5 rounded-full hover:opacity-80 transition-opacity text-lg"
            >
              View Live Auctions →
            </Link>
            <Link
              to="/create"
              className="bg-surface text-on-surface border-2 border-[#1c1c1e] font-body-md text-body-md px-10 py-5 rounded-full hover:bg-surface-container transition-colors text-lg"
            >
              Create an Auction
            </Link>
          </div>
        </section>

      </main>
    </div>
  )
}
