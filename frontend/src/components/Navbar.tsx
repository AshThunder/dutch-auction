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

  const isWrongNetwork = isConnected && chainId !== sepolia.id

  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path
    return isActive
      ? "text-on-surface dark:text-on-surface border-b-2 border-on-surface dark:border-on-surface pb-1 font-bold hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors duration-200 px-4 py-2 cursor-pointer opacity-80 scale-95 transition-all"
      : "text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors duration-200 px-4 py-2 rounded-full cursor-pointer opacity-80 scale-95 transition-all"
  }

  return (
    <nav className="bg-surface dark:bg-surface text-primary dark:text-primary-fixed-dim font-display-xl text-display-xl-mobile docked full-width top-0 sticky z-50 flat no shadows">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto bg-surface dark:bg-surface">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full border border-tertiary-container dark:border-tertiary-fixed-dim" />
          <span className="font-display-xl text-[24px] md:text-headline-lg text-tertiary-container dark:text-tertiary-fixed-dim font-bold tracking-tight">
            DUTCH AUCTION
          </span>
        </Link>
        <div className="hidden md:flex gap-4 md:gap-6 items-center font-headline-lg text-[22px]">
          <Link className={getLinkClass('/')} to="/">Home</Link>
          <Link className={getLinkClass('/explore')} to="/explore">Auctions</Link>
          <Link className={getLinkClass('/create')} to="/create">Create Auction</Link>
          <Link className={getLinkClass('/how-it-works')} to="/how-it-works">How it Works</Link>
          {isConnected && (
            <Link className={getLinkClass('/dashboard')} to="/dashboard">Dashboard</Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isWrongNetwork && (
            <button
              className="bg-[#e11d48] text-white rounded-full px-6 py-3 font-label-mono text-label-mono hover:opacity-90 transition-opacity"
              onClick={() => switchChain({ chainId: sepolia.id })}
            >
              Switch Network
            </button>
          )}

          {isConnected ? (
            <div className="flex items-center gap-4">
              <span className="font-label-mono text-label-mono text-on-surface uppercase bg-surface-container-high px-4 py-2 rounded-full">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              <button
                className="bg-transparent border border-[#1c1c1e] text-[#1c1c1e] rounded-full px-6 py-3 font-label-mono text-label-mono hover:bg-[#1c1c1e] hover:text-white transition-colors"
                onClick={() => disconnect()}
                id="disconnect-wallet-btn"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="bg-[#1c1c1e] text-on-primary font-label-mono text-label-mono px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
              onClick={() => connect({ connector: injected() })}
              id="connect-wallet-btn"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
