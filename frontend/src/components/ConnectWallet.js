import { InjectedConnector } from '@web3-react/injected-connector'
import { useWeb3React } from '@web3-react/core'
import { ethers } from 'ethers'

const injected = new InjectedConnector({ supportedChainIds: [31337] }) // Hardhat default

export default function ConnectWallet() {
  const { activate, active, account, library } = useWeb3React()

  const connect = async () => {
    try {
      await activate(injected)
    } catch (err) {
      console.error("Connection error:", err)
    }
  }

  return (
    <div>
      {active ? (
        <p>Connected: {account}</p>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  )
}
