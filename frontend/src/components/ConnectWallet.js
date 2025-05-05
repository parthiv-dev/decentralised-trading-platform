// src/components/ConnectWallet.js
import { InjectedConnector } from '@web3-react/injected-connector'
import { useWeb3React } from '@web3-react/core'

const injected = new InjectedConnector({ supportedChainIds: [31337] })

export default function ConnectWallet() {
  const { activate, active, account } = useWeb3React()

  const connect = async () => {
    try {
      await activate(injected)
    } catch (err) {
      console.error("Connection error:", err)
    }
  }

  return active ? (
    <p>✅ Connected: {account}</p>
  ) : (
    <button onClick={connect}>Connect Wallet</button>
  )
}
