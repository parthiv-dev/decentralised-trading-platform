import { useWeb3React } from '@web3-react/core'
import { ethers } from 'ethers'
import LockABI from './Lock.json'
import { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'

const LOCK_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

function App() {
  const { library, account, active } = useWeb3React()
  const [unlockTime, setUnlockTime] = useState(null)

  useEffect(() => {
    if (!active) return

    const loadContract = async () => {
      const signer = await library.getSigner()
      const contract = new ethers.Contract(LOCK_ADDRESS, LockABI.abi, signer)
      const time = await contract.unlockTime()
      setUnlockTime(time.toString())
    }

    loadContract()
  }, [library, active])

  return (
    <div>
      <h1>Pokémon Card dApp</h1>
      <ConnectWallet />
      {account && <p>Connected: {account}</p>}
      {unlockTime && <p>Unlock Time: {unlockTime}</p>}
    </div>
  )
}

export default App;
