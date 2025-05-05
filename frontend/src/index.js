import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Web3ReactProvider } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'

// —————— Startup log ——————
console.log("🚀 index.js: script loaded")
// ———————————————————————

function getLibrary(provider) {
  return new Web3Provider(provider)
}

ReactDOM
  .createRoot(document.getElementById('root'))
  .render(
    <Web3ReactProvider getLibrary={getLibrary}>
      <App />
    </Web3ReactProvider>
  )
