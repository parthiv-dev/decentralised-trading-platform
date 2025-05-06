// src/components/ConnectWallet.js
import { useWeb3React } from '@web3-react/core'
import { shortenAddress } from '../utils/shortenAddress'; // Helper to shorten address display

// —————— Startup log ——————
console.log("🚀 ConnectWallet.js: component loaded")
// ———————————————————————

export default function ConnectWallet() {
  // In v8, we get the connector instance and status flags
  const { connector, account, isActive, error } = useWeb3React()

  console.log("ConnectWallet - Account:", account);
  console.log("ConnectWallet - IsActive:", isActive);
  console.log("ConnectWallet - Error:", error);
  console.log("ConnectWallet - Connector:", connector);

  const connect = async () => {
    console.log("Attempting to connect wallet...");
    try {
      // Call activate directly on the connector instance provided by the context
      if (connector?.activate) {
        await connector.activate(); // No need to pass a connector instance here
        console.log("Wallet connection activated");
      } else {
        console.error("Cannot activate: Connector not found or activate method missing.");
      }
    } catch (ex) {
      console.error("Connection error:", ex);
    }
  }

  const disconnect = async () => {
    console.log("Attempting to disconnect wallet...");
    try {
      if (connector?.deactivate) {
        await connector.deactivate();
      } else if (connector?.resetState) {
        await connector.resetState(); // Fallback for connectors like WalletConnect
      }
      console.log("Wallet disconnected");
    } catch (ex) {
      console.error("Disconnection error:", ex);
    }
  };

  // Use isActive for determining connection status in v8
  return isActive && account ? (
    <div className="wallet-status">
      <p>✅ Connected: {shortenAddress(account)}</p>
      <button onClick={disconnect} className="button button-secondary">Disconnect</button>
    </div>
  ) : (
    <button onClick={connect} className="button">Connect Wallet</button>
  )
}
