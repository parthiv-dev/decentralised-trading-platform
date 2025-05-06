import { useWeb3React } from '@web3-react/core'
import { ethers } from 'ethers'
// Import contract ABIs
import PokemonCardABI from './abis/PokemonCard.json' // Adjust path if needed
import TradingPlatformABI from './abis/TradingPlatform.json' // Adjust path if needed
import { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Marketplace from './components/Marketplace' // Import the new component

// Network Configurations
const networks = {
  localhost: {
    chainId: 31337, // Default Hardhat chain ID
    name: 'Localhost (Hardhat)',
    pokemonCardAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    tradingPlatformAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    pokemonCardAddress: '0x3ff18B652E50419c81dbAeddC02B7E42ce0D7bC0', // Replace with your actual Sepolia address
    tradingPlatformAddress: '0xBB1186fD51d9eeAFA3A8FDB9144AEA32cb2CF98e', // Replace with your actual Sepolia address
  }
};

// Default Hardhat account #0 private key - FOR LOCAL DEVELOPMENT ONLY
const HARDHAT_ACCOUNT_0_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function App() {
  const { provider: metaMaskProvider, account: metaMaskAccount, isActive: metaMaskIsActive, chainId: metaMaskChainId } = useWeb3React();
  const [selectedNetwork, setSelectedNetwork] = useState('localhost'); // Default to localhost

  // State for managing the active signer and account, independent of MetaMask if using Hardhat directly
  const [currentSigner, setCurrentSigner] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);
  const [isAppActive, setIsAppActive] = useState(false); // Overall app readiness
  const [isUsingHardhatSigner, setIsUsingHardhatSigner] = useState(false); // True if directly using Hardhat signer
  const [effectiveChainId, setEffectiveChainId] = useState(null);


  const [pokemonContract, setPokemonContract] = useState(null);
  const [platformContract, setPlatformContract] = useState(null)
  const [userPokemonIds, setUserPokemonIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mintingStatus, setMintingStatus] = useState(''); // For mint feedback
  const [listTokenId, setListTokenId] = useState(''); // Token ID to list/approve
  const [listPrice, setListPrice] = useState(''); // Price to list for (in ETH)
  const [approvalStatus, setApprovalStatus] = useState(''); // Feedback for approval tx
  const [listingStatus, setListingStatus] = useState(''); // Feedback for listing tx
  const [isApproved, setIsApproved] = useState(false); // Track if the selected token is approved

  // Get current network config based on selection
  const currentNetworkConfig = networks[selectedNetwork];

  // Effect to determine the active signer, account, and app status
  useEffect(() => {
    const initializeSignerAndAccount = async () => {
      if (selectedNetwork === 'localhost' && isUsingHardhatSigner) {
        console.log("Attempting to use Hardhat direct signer...");
        try {
          const localJsonRpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
          const hardhatWallet = new ethers.Wallet(HARDHAT_ACCOUNT_0_PRIVATE_KEY, localJsonRpcProvider);
          setCurrentSigner(hardhatWallet);
          setActiveAccount(await hardhatWallet.getAddress());
          setIsAppActive(true);
          setEffectiveChainId(networks.localhost.chainId); // Hardhat's chain ID
          console.log("Using Hardhat direct signer:", await hardhatWallet.getAddress());
        } catch (e) {
          console.error("Failed to initialize Hardhat direct signer:", e);
          setError("Could not connect to local Hardhat node. Ensure it's running.");
          setIsAppActive(false);
          setCurrentSigner(null);
          setActiveAccount(null);
        }
      } else if (metaMaskIsActive && metaMaskProvider) {
        console.log("Using MetaMask provider...");
        setCurrentSigner(await metaMaskProvider.getSigner());
        setActiveAccount(metaMaskAccount);
        setIsAppActive(true);
        setEffectiveChainId(metaMaskChainId);
      } else {
        console.log("No active provider or signer.");
        setCurrentSigner(null);
        setActiveAccount(null);
        setIsAppActive(false);
        setEffectiveChainId(null);
      }
    };

    initializeSignerAndAccount();
  }, [selectedNetwork, isUsingHardhatSigner, metaMaskIsActive, metaMaskProvider, metaMaskAccount, metaMaskChainId]);


  // Effect to instantiate contracts and fetch initial data
  useEffect(() => {
    // Clear contracts if signer/account becomes unavailable
    if (!isAppActive || !currentSigner || !activeAccount) {
      setPokemonContract(null);
      setPlatformContract(null);
      setUserPokemonIds([]);
      setLoading(false);
      return;
    }

    const setupContractsAndFetchData = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      try {
        // Instantiate PokemonCard contract
        const pkmnContract = new ethers.Contract(
          currentNetworkConfig.pokemonCardAddress,
          PokemonCardABI.abi,
          currentSigner // Use the determined signer
        );
        setPokemonContract(pkmnContract);

        // Instantiate TradingPlatform contract
        const platContract = new ethers.Contract(
          currentNetworkConfig.tradingPlatformAddress,
          TradingPlatformABI.abi,
          currentSigner // Use the determined signer
        );
        setPlatformContract(platContract);

        // Fetch user's Pokemon
        if (activeAccount) {
          const balanceBigInt = await pkmnContract.balanceOf(activeAccount);
          const balance = Number(balanceBigInt); // Convert BigInt to Number for loop
          const ids = [];
          // Note: tokenOfOwnerByIndex can be gas intensive for large balances
          for (let i = 0; i < balance; i++) {
            const tokenId = await pkmnContract.tokenOfOwnerByIndex(activeAccount, i);
            ids.push(tokenId.toString()); // Convert BigNumber/BigInt to string
          }
          setUserPokemonIds(ids);
          if (ids.length > 0) {
            setListTokenId(ids[0]); // Default selection to the first token
          }
        }
      } catch (err) {
        console.error("Failed to setup contracts or fetch data:", err);
        setError(`Failed to load contract data. Ensure you are on the correct network (${currentNetworkConfig.name}) and contracts are deployed.`);
      } finally {
        setLoading(false);
      }
    };

    setupContractsAndFetchData();
  }, [isAppActive, currentSigner, activeAccount, currentNetworkConfig]); // Dependencies

  // Effect to check approval status when selected token changes
  useEffect(() => {
    const checkApproval = async () => {
      if (!pokemonContract || !listTokenId || !activeAccount) {
        setIsApproved(false);
        return;
      }
      try {
        const approvedAddress = await pokemonContract.getApproved(listTokenId);
        setIsApproved(approvedAddress?.toLowerCase() === currentNetworkConfig.tradingPlatformAddress.toLowerCase());
      } catch (err) {
        // Might fail if token doesn't exist or user isn't owner, which is fine here
        console.log("Could not check approval (might not be owner or token invalid):", err.message);
        setIsApproved(false);
      }
    };
    checkApproval();
  }, [pokemonContract, listTokenId, activeAccount, currentNetworkConfig.tradingPlatformAddress]);

  // Function to handle approving the marketplace contract
  const handleApprove = async () => {
    if (!pokemonContract || !listTokenId) return;
    setApprovalStatus(`Approving token ${listTokenId}...`);
    try { // Use address from config
      const tx = await pokemonContract.approve(currentNetworkConfig.tradingPlatformAddress, listTokenId);
      await tx.wait();
      setApprovalStatus(`✅ Token ${listTokenId} approved!`);
      setIsApproved(true); // Update approval state
    } catch (err) {
      console.error("Approval failed:", err);
      setApprovalStatus(`⚠️ Approval failed: ${err.reason || err.message}`);
    }
  };

  // Function to handle minting a new NFT
  const handleMint = async () => {
    if (!pokemonContract || !activeAccount || !currentSigner) return;
    // Reset states before starting
    setError(null); // Clear previous errors first
    setMintingStatus('Minting...');
    setError(null);
    let mintSuccessful = false; // Flag to track success
    try {
      // Placeholder metadata URI - replace with actual IPFS hash or URL later
      const placeholderURI = "ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"; // Example IPFS hash
      const tx = await pokemonContract.safeMint(activeAccount, placeholderURI);
      setMintingStatus(`Waiting for confirmation (Tx: ${tx.hash})...`); // Show Tx hash

      // Wait for confirmation. We will handle potential post-wait errors in finally
      const receipt = await tx.wait();

      // If tx.wait() completes without throwing an error *that prevents this line*,
      // mark the mint as successful on-chain.
      mintSuccessful = true;
      console.log("Mint transaction confirmed by tx.wait(). Receipt:", receipt);

    } catch (err) {
        // Catch errors from safeMint() or tx.wait() itself (e.g., revert)
        console.error("Minting process failed:", err);
        setError(`Minting failed: ${err.message || 'Unknown error'}`);
        mintSuccessful = false; // Ensure flag is false on failure
    } finally {
      // This will run regardless of success or failure *after* tx.wait()
      // or if an error occurred before/during tx.wait()
      // If the mint was successful, explicitly clear any potential lingering error state
      console.log(`Finally block: mintSuccessful = ${mintSuccessful}`); // Log flag status
      if (mintSuccessful) {
        console.log("Finally block: Mint was successful, proceeding with refresh and cleanup.");
        // Ensure error state is cleared *before* attempting refresh,
        // overriding any potential error set by the rogue listener immediately.
        setError(null);
        console.log("Finally block: Clearing error state because mint was successful."); // Log clearing action

        // --- Refresh NFT list within finally block on success ---
        setMintingStatus('Refreshing NFT list...'); // Give feedback during refresh
        try {
          if (pokemonContract && activeAccount) { // Ensure contract and account still valid
            const balanceBigInt = await pokemonContract.balanceOf(activeAccount);
            const balance = Number(balanceBigInt);
            const ids = [];
            for (let i = 0; i < balance; i++) {
              const tokenId = await pokemonContract.tokenOfOwnerByIndex(activeAccount, i);
              ids.push(tokenId.toString());
            }
            setUserPokemonIds(ids); // Update the state directly
          }
        } catch (refreshError) {
          console.error("Failed to refresh NFT list in finally block:", refreshError);
          setError("Mint successful, but failed to refresh NFT list. Please refresh the page manually."); // Set error specific to refresh failure
        }
      }
      // Ensure minting status is cleared one last time, regardless of refresh success/failure
      // This handles the case where refresh might set an error, but we still need to clear the button text.
      setMintingStatus('');

      // Always clear the minting status message
      setMintingStatus('');
    }
  };

  // Function to list the approved NFT for sale
  const handleListCard = async () => {
    if (!platformContract || !listTokenId || !listPrice || !isApproved) {
        setError("Please ensure token is selected, price is set, and token is approved.");
        return;
    }
    setListingStatus(`Listing token ${listTokenId} for ${listPrice} ETH...`);
    setError(null);
    try {
        const priceInWei = ethers.parseEther(listPrice); // Convert ETH string to Wei BigInt
        // --- TODO: Adapt contract function name if needed ---
        // Assuming function `listCardForSale(uint256 _tokenId, uint256 _price)`
        const tx = await platformContract.listCardForSale(listTokenId, priceInWei);
        await tx.wait();
        setListingStatus(`✅ Token ${listTokenId} listed successfully!`);
        // TODO: Refresh marketplace data without full reload
        window.location.reload(); // Simple refresh for now
    } catch (err) {
        console.error("Listing failed:", err);
        setListingStatus(`⚠️ Listing failed: ${err.reason || err.message}`);
        setError(`Listing failed: ${err.reason || err.message}`);
    }
  };

  // Helper to check if connected wallet network matches selected network
  const isCorrectNetwork = isUsingHardhatSigner ? currentNetworkConfig.chainId === networks.localhost.chainId : effectiveChainId === currentNetworkConfig.chainId;

  return (
    <div style={{ padding: 20 }}>
      <h1>Pokémon Card dApp</h1>

      {/* Network Selector */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #eee' }}>
        <label htmlFor="network-select">Select Network: </label>
        <select id="network-select" value={selectedNetwork} onChange={(e) => setSelectedNetwork(e.target.value)}>
          {Object.keys(networks).map(key => (
            <option key={key} value={key}>{networks[key].name}</option>
          ))}
        </select>
      </div>

      {/* Hardhat Signer Toggle - only for localhost */}
      {selectedNetwork === 'localhost' && (
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={isUsingHardhatSigner}
              onChange={(e) => setIsUsingHardhatSigner(e.target.checked)}
            />
            Use Hardhat Direct Signer (Bypass MetaMask for Localhost)
          </label>
        </div>
      )}

      {!isUsingHardhatSigner && <ConnectWallet /> /* Show ConnectWallet if not using Hardhat direct signer */}

      {isAppActive && (
        <>
          <p>🟢 Account: {activeAccount} {isUsingHardhatSigner ? "(Hardhat Direct)" : "(MetaMask)"}</p>
          {error && <p style={{ color: 'red' }}>⚠️ Error: {error}</p>}

          {/* Network Mismatch Warning */}
          {!isCorrectNetwork && metaMaskProvider && !isUsingHardhatSigner && (
            <p style={{ color: 'orange', fontWeight: 'bold' }}>⚠️ Wallet connected to wrong network (Chain ID: {effectiveChainId}). Please switch to {currentNetworkConfig.name} (Chain ID: {currentNetworkConfig.chainId}).</p>
          )}

          {loading
            ? <p>⏳ Loading contract data...</p>
            : (
              <div>
                {/* Add Mint Button */}
                <button onClick={handleMint} disabled={!pokemonContract || mintingStatus.includes('Minting') || mintingStatus.includes('Waiting')}>
                  {mintingStatus || 'Mint Test NFT'}
                </button>

                {/* Section for Owned NFTs and Listing */}
                <div style={{ border: '1px solid gray', padding: '10px', margin: '10px 0' }}>
                  <h3>Your Pokémon Cards</h3>
                  {userPokemonIds.length > 0 ? (
                    <>
                      <p>IDs: {userPokemonIds.join(', ')}</p>
                      <h4>List a Card for Sale</h4>
                      <label>Token ID: </label>
                      <select value={listTokenId} onChange={(e) => setListTokenId(e.target.value)}>
                        {userPokemonIds.map(id => <option key={id} value={id}>{id}</option>)}
                      </select>
                      <br />
                      <label>Price (ETH): </label>
                      <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="e.g., 0.1" />
                      <br />
                      <button onClick={handleApprove} disabled={!listTokenId || isApproved || !!approvalStatus.includes('Approving')}>
                        {isApproved ? '✅ Approved' : (approvalStatus || '1. Approve Marketplace')}
                      </button>
                      <button onClick={handleListCard} disabled={!listTokenId || !listPrice || !isApproved || !!listingStatus.includes('Listing')}>
                        {listingStatus || '2. List Card'}
                      </button>
                      {approvalStatus && !approvalStatus.includes('Approving') && <p><small>{approvalStatus}</small></p>}
                      {listingStatus && !listingStatus.includes('Listing') && <p><small>{listingStatus}</small></p>}
                    </>
                  ) : (
                    <p>You don't own any Pokémon NFTs yet. Try minting one!</p>
                  )}
                </div>
                <hr />
                {/* Render the Marketplace component if contracts are loaded */}
                {platformContract && pokemonContract &&
                  <Marketplace platformContract={platformContract} pokemonContract={pokemonContract} />}
              </div>
            )
          }
        </>
      )}
    </div>
  )
}

export default App
