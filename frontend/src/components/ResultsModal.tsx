import { X, ArrowRight } from 'lucide-react'

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  onClaim: () => void
  isClaiming: boolean
  hasClaimed: boolean
  tokensAllocated: string | null
  refundDue: string | null
  clearingPrice: string | null
  bidPrice: string | null
  tokenTicker: string
}

export function ResultsModal({
  isOpen,
  onClose,
  onClaim,
  isClaiming,
  hasClaimed,
  tokensAllocated,
  refundDue,
  clearingPrice,
  bidPrice,
  tokenTicker
}: ResultsModalProps) {
  if (!isOpen) return null

  // Determine if they won something (if we know the allocated amount and it's > 0)
  const isWinner = tokensAllocated ? parseFloat(tokensAllocated) > 0 : true // Default to true if not yet decrypted for optimistic UI
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Confetti Mockup Overlay */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center opacity-80 mix-blend-multiply">
        <div className="w-full h-full bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuB0VYIvwD_UWWLhk9nmcYR0WRDw5SuGRinB4fIxmFalvYFVuu-i6UkJ3Lv0CfokhckY0RVE3RmKGJfROoAfHL1ciex5jgQS21JfgyhBqdUVUNpOgb25MCBo69Ef9Nk6R2DGm-tvUyTy4I_DXC0_ZWRUrcsKxUJoGfYTtEJMt68N_n5qEWEucSLcx7GXhWRXSwzKCmtoyabbUkx30Lochm-RaiV55CMae5dB7HXmPuUSzNTn6ycxPGjBlPXpB3VGRCHoQNV0cbgDjwdc')] bg-cover bg-center opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center animate-fade-in">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 md:-right-12 text-on-surface-variant hover:text-on-surface bg-surface-container rounded-full p-2"
        >
          <X size={24} />
        </button>

        {/* Celebratory Banner */}
        <div className="text-center mb-16 max-w-3xl mx-auto w-full">
          <div className="inline-flex items-center justify-center bg-[#1c1c1e] text-on-primary rounded-md px-3 py-1 mb-6">
            <span className="font-encrypted-data text-encrypted-data">[ AUCTION SETTLED ]</span>
          </div>
          <h1 className="font-display-xl text-display-xl-mobile md:text-display-xl text-[#1c1c1e] mb-6 relative inline-block">
            {isWinner ? 'You Win!' : 'You Missed Out'}
            {isWinner && (
              <span className="absolute -top-8 -right-12 text-[#1c1c1e] rotate-12 opacity-50">
                <span className="material-symbols-outlined text-[64px]">stars</span>
              </span>
            )}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mx-auto">
            {isWinner 
              ? 'The Dutch Auction has concluded successfully. The final clearing price is below or equal to your bid, securing your token allocation and a refund of the difference.'
              : 'The Dutch Auction has concluded. Unfortunately, the clearing price was higher than your bid. You are eligible for a full refund.'}
          </p>
        </div>

        {/* Bento Grid of Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter w-full mb-16">
          {/* Stat Card 1 */}
          <div className="bg-[#ffbba6] rounded-[28px] p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)] flex flex-col items-start justify-between min-h-[200px] relative overflow-hidden">
            <div className="font-label-mono text-label-mono text-[#1c1c1e] opacity-70 mb-4 uppercase tracking-wider">
              Tokens Allocated
            </div>
            <div className="font-display-xl text-headline-lg md:text-display-xl-mobile text-[#1c1c1e]">
              {tokensAllocated !== null ? tokensAllocated : '???'} <span className="text-xl font-body-md text-[#1c1c1e]">{tokenTicker}</span>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
          </div>
          
          {/* Stat Card 2 */}
          <div className="bg-[#ffbba6] rounded-[28px] p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)] flex flex-col items-start justify-between min-h-[200px] relative overflow-hidden">
            <div className="font-label-mono text-label-mono text-[#1c1c1e] opacity-70 mb-4 uppercase tracking-wider">
              Clearing Price
            </div>
            <div className="font-display-xl text-headline-lg md:text-display-xl-mobile text-[#1c1c1e] flex flex-col">
              {bidPrice && (
                <span className="font-encrypted-data text-encrypted-data text-[#1c1c1e] opacity-50 mb-1 line-through">Bid: ${bidPrice}</span>
              )}
              ${clearingPrice || '0.00'}
            </div>
          </div>
          
          {/* Stat Card 3 */}
          <div className="bg-[#ffbba6] rounded-[28px] p-sticky-padding shadow-[0px_4px_10px_rgba(0,0,0,0.05)] flex flex-col items-start justify-between min-h-[200px] relative overflow-hidden border-2 border-[#1c1c1e]">
            <div className="font-label-mono text-label-mono text-[#1c1c1e] mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1c1c1e] text-[16px]">account_balance_wallet</span>
              Refund Due (USDC)
            </div>
            <div className="font-display-xl text-headline-lg md:text-display-xl-mobile text-[#1c1c1e]">
              {refundDue !== null 
                ? (refundDue.includes('DECRYPTING') 
                    ? <span className="font-encrypted-data text-[14px] md:text-[18px] opacity-60 animate-pulse">{refundDue}</span>
                    : refundDue.includes('ENCRYPTED')
                      ? <span className="font-encrypted-data text-[18px] md:text-[24px]">{refundDue}</span>
                      : `$${parseFloat(refundDue).toFixed(2)} USDC`) 
                : <span className="opacity-40">$???</span>}
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="w-full flex justify-center mt-8">
          <button 
            className="bg-[#1c1c1e] text-white rounded-full px-12 py-6 font-display-xl text-headline-lg hover:scale-105 transition-transform duration-200 flex items-center gap-4 shadow-xl shadow-black/10 disabled:opacity-50 disabled:hover:scale-100"
            onClick={onClaim}
            disabled={isClaiming || hasClaimed}
          >
            {hasClaimed ? 'Successfully Claimed!' : isClaiming ? 'Decrypting & Claiming...' : 'Claim Tokens & Refund'}
            {!hasClaimed && <ArrowRight size={24} />}
          </button>
        </div>
      </div>
    </div>
  )
}
