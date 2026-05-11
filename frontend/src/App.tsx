import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ZamaProvider } from '@zama-fhe/react-sdk'
import { RelayerWeb, indexedDBStorage } from '@zama-fhe/sdk'
import { WagmiSigner } from '@zama-fhe/react-sdk/wagmi'
import { wagmiConfig } from './config/wagmi'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { CreateAuction } from './pages/CreateAuction'
import { AuctionDetail } from './pages/AuctionDetail'
import { Dashboard } from './pages/Dashboard'
import { Explore } from './pages/Explore'
import { HowItWorks } from './pages/HowItWorks'

const queryClient = new QueryClient()

import { sepolia } from 'wagmi/chains'

const relayer = new RelayerWeb({
  getChainId: async () => sepolia.id,
  transports: {
    [sepolia.id]: {
      relayerUrl: 'https://relayer.testnet.zama.org/v2',
      network: 'https://ethereum-sepolia-rpc.publicnode.com',
    }
  }
})

const signer = new WagmiSigner({ config: wagmiConfig })

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZamaProvider relayer={relayer} signer={signer} storage={indexedDBStorage}>
          <BrowserRouter>
            <Toaster position="top-right" richColors closeButton />
            <Navbar />
            <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateAuction />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/auction/:address" element={<AuctionDetail />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
              </Routes>
            </main>
            <Footer />
          </BrowserRouter>
        </ZamaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
