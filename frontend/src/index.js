import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Web3ReactProvider } from '@web3-react/core'
import { ethers } from 'ethers'

function getLibrary(provider) {
  return new ethers.BrowserProvider(provider)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Web3ReactProvider getLibrary={getLibrary}>
    <App />
  </Web3ReactProvider>
)
