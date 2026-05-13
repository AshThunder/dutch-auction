import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { sepolia } from 'wagmi/chains'
import { Link, useLocation } from 'react-router-dom'

export function Navbar() {
  const { address, isConnected, chainId } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isWrongNetwork = isConnected && chainId !== sepolia.id

  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path
    return isActive
      ? "text-on-surface border-b-2 border-on-surface pb-1 font-bold hover:bg-surface-container-high transition-colors duration-200 px-4 py-2 cursor-pointer"
      : "text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 px-4 py-2 rounded-full cursor-pointer"
  }

  const getMobileLinkClass = (path: string) => {
    const isActive = location.pathname === path
    return isActive
      ? "block text-on-surface font-bold bg-surface-container-high px-4 py-3 rounded-xl"
      : "block text-on-surface-variant hover:bg-surface-container-high px-4 py-3 rounded-xl transition-colors"
  }

  return (
    <nav className="bg-surface text-primary font-display-xl text-display-xl-mobile top-0 sticky z-50">
      <div className="flex justify-between items-center w-full px-4 md:px-margin-desktop py-4 max-w-container-max mx-auto bg-surface">
        <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity shrink-0">
          <img src="/logo.png" alt="Logo" className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-tertiary-container" />
          <span className="font-display-xl text-[18px] md:text-headline-lg text-tertiary-container font-bold tracking-tight">
            DUTCH AUCTION
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex gap-4 xl:gap-6 items-center font-headline-lg text-[20px] xl:text-[22px]">
          <Link className={getLinkClass('/')} to="/">Home</Link>
          <Link className={getLinkClass('/explore')} to="/explore">Auctions</Link>
          <Link className={getLinkClass('/create')} to="/create">Create Auction</Link>
          <Link className={getLinkClass('/how-it-works')} to="/how-it-works">How it Works</Link>
          {isConnected && (
            <Link className={getLinkClass('/dashboard')} to="/dashboard">Dashboard</Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isWrongNetwork && (
            <button
              className="bg-[#e11d48] text-white rounded-full px-4 md:px-6 py-2 md:py-3 font-label-mono text-xs md:text-label-mono hover:opacity-90 transition-opacity"
              onClick={() => switchChain({ chainId: sepolia.id })}
            >
              Switch Network
            </button>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden sm:inline font-label-mono text-label-mono text-on-surface uppercase bg-surface-container-high px-3 md:px-4 py-2 rounded-full text-xs md:text-sm">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              <button
                className="bg-transparent border border-[#1c1c1e] text-[#1c1c1e] rounded-full px-4 md:px-6 py-2 md:py-3 font-label-mono text-xs md:text-label-mono hover:bg-[#1c1c1e] hover:text-white transition-colors"
                onClick={() => disconnect()}
                id="disconnect-wallet-btn"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="bg-[#1c1c1e] text-on-primary font-label-mono text-xs md:text-label-mono px-4 md:px-6 py-2 md:py-3 rounded-full hover:opacity-90 transition-opacity"
              onClick={() => connect({ connector: injected() })}
              id="connect-wallet-btn"
            >
              Connect Wallet
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="lg:hidden flex items-center justify-center p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[28px] text-on-surface">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-surface border-t border-surface-dim px-4 pb-6 pt-2 space-y-1 font-headline-lg text-lg animate-[fadeIn_0.15s_ease-out]">
          <Link className={getMobileLinkClass('/')} to="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link className={getMobileLinkClass('/explore')} to="/explore" onClick={() => setMobileOpen(false)}>Auctions</Link>
          <Link className={getMobileLinkClass('/create')} to="/create" onClick={() => setMobileOpen(false)}>Create Auction</Link>
          <Link className={getMobileLinkClass('/how-it-works')} to="/how-it-works" onClick={() => setMobileOpen(false)}>How it Works</Link>
          {isConnected && (
            <Link className={getMobileLinkClass('/dashboard')} to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
          )}
          {isConnected && (
            <div className="pt-2 px-4">
              <span className="sm:hidden font-label-mono text-xs text-on-surface-variant">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
