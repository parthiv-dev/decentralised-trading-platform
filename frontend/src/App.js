import { useWeb3React } from '@web3-react/core'
import { ethers } from 'ethers'
import LockABI from './Lock.json'
import { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'

const LOCK_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

function App() {
  const { library, account, active } = useWeb3React()
  const [unlockTime, setUnlockTime] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!active) return

    const fetchUnlockTime = async () => {
      setLoading(true)
      try {
        const signer = library.getSigner()              // synchronous
        const contract = new ethers.Contract(           // instantiate contract
          LOCK_ADDRESS,
          LockABI.abi,
          signer
        )
        const timeBN = await contract.unlockTime()      // async call
        const ts = timeBN.toNumber() * 1000             // convert to ms
        setUnlockTime(new Date(ts).toLocaleString())    // format
      } catch (err) {
        console.error("Failed to fetch unlockTime:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUnlockTime()
  }, [active, library])

  return (
    <div style={{ padding: 20 }}>
      <h1>Pokémon Card dApp</h1>
      <ConnectWallet />

      {active && (
        <>
          <p>🟢 Connected: {account}</p>

          {loading
            ? <p>⏳ Loading unlock time…</p>
            : unlockTime
              ? <p>🔓 Unlock Time: {unlockTime}</p>
              : <p>— no lock data yet —</p>
          }
        </>
      )}
    </div>
  )
}

export default App
