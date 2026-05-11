import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
})

// Placeholder addresses — replace with deployed contract addresses
export const FACTORY_ADDRESS = '0x10f70D6d85229E7b5cb66bdaC018c0a7f0fD038F' as const
