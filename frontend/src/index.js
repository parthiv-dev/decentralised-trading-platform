import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Web3ReactProvider, initializeConnector } from '@web3-react/core'
import { MetaMask } from '@web3-react/metamask'

// —————— Startup log ——————
console.log("🚀 index.js: script loaded")
// ———————————————————————

// Initialize the MetaMask connector
// The second argument `undefined` means we let the connector manage the EIP-1193 provider detection.
// The third argument `false` disables eager connection attempts on load.
const [metaMask, hooks] = initializeConnector((actions) => new MetaMask({ actions }))

// Define the connectors array for the provider
// You can add more connectors here, e.g., [metaMask, hooks], [walletConnect, wcHooks], ...
const connectors = [[metaMask, hooks]]

ReactDOM
  .createRoot(document.getElementById('root'))
  .render(
    // Pass the connectors array to the provider
    <Web3ReactProvider connectors={connectors}>
      <App />
    </Web3ReactProvider>
  )
