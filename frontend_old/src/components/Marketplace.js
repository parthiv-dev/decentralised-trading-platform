import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core'; // Needed to check connected account

// Simple component to display details of one listing/auction item
function MarketItem({ item, type, pokemonContract, onBuy, onBid, isProcessing, currentAccount }) {
    const [tokenURI, setTokenURI] = useState('');
    const [metadata, setMetadata] = useState(null);
    const [bidAmount, setBidAmount] = useState(''); // State for bid input
    const [loadingMeta, setLoadingMeta] = useState(false);

    // Fetch Token URI and Metadata
    useEffect(() => {
        if (!pokemonContract || !item.tokenId) return;

        const fetchMetadata = async () => {
            setLoadingMeta(true);
            try {
                const uri = await pokemonContract.tokenURI(item.tokenId);
                setTokenURI(uri); // Keep this line even if tokenURI isn't displayed directly yet
                // Assuming the URI points to a JSON file
                if (uri) {
                    // Basic check if it's an IPFS link (needs gateway) or HTTP(S)
                    let fetchUrl = uri;
                    if (uri.startsWith('ipfs://')) {
                        // Replace with your preferred IPFS gateway
                        fetchUrl = `https://ipfs.io/ipfs/${uri.substring(7)}`;
                    }

                    try {
                        const response = await fetch(fetchUrl);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const meta = await response.json();
                        setMetadata(meta);
                    } catch (fetchError) {
                        console.error("Failed to fetch or parse metadata:", fetchError);
                        setMetadata({ name: `Token ${item.tokenId}`, description: "Metadata fetch failed." }); // Fallback
                    }
                }
            } catch (err) {
                console.error("Failed to fetch token URI:", err);
                setTokenURI('Error fetching URI'); // Keep this line
            } finally {
                setLoadingMeta(false);
            }
        };

        fetchMetadata();
    }, [pokemonContract, item.tokenId]);

    // Use ethers.formatEther for v6
    const formatPrice = (price) => ethers.formatEther(price);

    // Prevent buying/bidding on own items or if not connected
    const canInteract = currentAccount && item.seller.toLowerCase() !== currentAccount.toLowerCase();
    // Auction specific checks
    const canBid = canInteract && new Date() < new Date(item.endTime * 1000); // Check if auction is still active

    return (
        <div style={{ border: '1px solid #ccc', margin: '10px', padding: '10px', width: '200px' }}>
            {loadingMeta ? <p>Loading metadata...</p> : (
                <>
                    <h4>{metadata?.name || `Token ID: ${item.tokenId}`}</h4>
                    {metadata?.image &&
                        <img
                            src={metadata.image.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${metadata.image.substring(7)}` : metadata.image}
                            alt={metadata?.name || `Token ${item.tokenId}`}
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
                    }
                    <p>{metadata?.description || 'No description.'}</p>
                </>
            )}
            <p>Seller: {item.seller.substring(0, 6)}...{item.seller.substring(item.seller.length - 4)}</p>
            {type === 'listing' && (
                <>
                    <p>Price: {formatPrice(item.price)} ETH</p>
                    {canInteract && (
                        <button onClick={() => onBuy(item.id, item.price)} disabled={isProcessing}>
                            {isProcessing ? 'Buying...' : 'Buy Now'}
                        </button>
                    )}
                    {!currentAccount && <p><small>Connect wallet to buy</small></p>}
                    {currentAccount && !canInteract && <p><small>Cannot buy own item</small></p>}
                </>
            )}
            {type === 'auction' && (
                <>
                    <p>Starts: {formatPrice(item.startingPrice)} ETH</p>
                    <p>Highest Bid: {formatPrice(item.highestBid)} ETH</p>
                    <p>Ends: {new Date(item.endTime * 1000).toLocaleString()}</p>
                    <p>Highest Bidder: {item.highestBidder === ethers.ZeroAddress ? 'None' : `${item.highestBidder.substring(0, 6)}...${item.highestBidder.substring(item.highestBidder.length - 4)}`}</p>
                    {canBid && (
                        <div>
                            <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Your bid (ETH)" style={{ width: '90%', marginBottom: '5px' }} />
                            <button onClick={() => onBid(item.id, bidAmount)} disabled={isProcessing || !bidAmount}>
                                {isProcessing ? 'Bidding...' : 'Place Bid'}
                            </button>
                        </div>
                    )}
                    {!canBid && new Date() >= new Date(item.endTime * 1000) && <p><small>Auction ended</small></p>}
                    {!currentAccount && <p><small>Connect wallet to bid</small></p>}
                    {currentAccount && !canInteract && <p><small>Cannot bid on own item</small></p>}
                </>
            )}
        </div>
    );
}


function Marketplace({ platformContract, pokemonContract }) {
    const [listings, setListings] = useState([]);
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(false); // For fetching data
    const [processingTx, setProcessingTx] = useState(false); // For buy/bid transactions
    const [error, setError] = useState(null);
    const [txFeedback, setTxFeedback] = useState(''); // User feedback for transactions
    const { account } = useWeb3React(); // Get current user account

    // Define fetchMarketplaceData using useCallback to memoize it
    const fetchMarketplaceData = React.useCallback(async () => {

        const fetchMarketplaceData = async () => {
            setLoading(true);
            setError(null); // Reset error on new fetch
            setTxFeedback(''); // Clear previous tx feedback
            const fetchedListings = [];
            const fetchedAuctions = [];

            try {
                console.log("Fetching marketplace data...");

                // Fetch Listings by iterating IDs
                let listingId = 0;
                while (true) {
                    try {
                        const listingData = await platformContract.getListing(listingId);
                        // Check if the listing is active and has a valid seller
                        // Use ethers.ZeroAddress for v6
                        if (listingData.active && listingData.seller !== ethers.ZeroAddress) {
                            fetchedListings.push({ id: listingId, ...listingData });
                        }
                        listingId++;
                    } catch (err) {
                        // Assuming error means ID doesn't exist, break the loop
                        // More specific error checking could be added here
                        console.log(`Stopped fetching listings at ID ${listingId}. Error:`, err.message);
                        break;
                    }
                }

                // Fetch Auctions by iterating IDs
                let auctionId = 0;
                while (true) {
                    try {
                        const auctionData = await platformContract.getAuction(auctionId);
                        // Check if the auction is active and has a valid seller
                        // Use ethers.ZeroAddress for v6
                        if (auctionData.active && auctionData.seller !== ethers.ZeroAddress) {
                            fetchedAuctions.push({ id: auctionId, ...auctionData });
                        }
                        auctionId++;
                    } catch (err) {
                        // Assuming error means ID doesn't exist, break the loop
                        console.log(`Stopped fetching auctions at ID ${auctionId}. Error:`, err.message);
                        break;
                    }
                }
                setListings(fetchedListings);
                setAuctions(fetchedAuctions);

            } catch (err) {
                console.error("Failed to fetch marketplace data:", err);
                setError("Could not load marketplace data.");
            } finally {
                setLoading(false);
            }
        };

        if (platformContract) { // Only fetch if the contract is available
            fetchMarketplaceData();
        }
    }, [platformContract, setLoading, setError, setTxFeedback, setListings, setAuctions]); // Add dependencies

    useEffect(() => {
        fetchMarketplaceData();
    }, [fetchMarketplaceData]); // Re-run effect if fetchMarketplaceData changes (due to platformContract changing)

    // --- Transaction Handlers ---

    const handleBuy = async (listingId, price) => {
        if (!platformContract || !account) return;
        console.log(`Attempting to buy listing ${listingId} for ${ethers.formatEther(price)} ETH`);
        setProcessingTx(true);
        setTxFeedback(`Processing purchase for listing ${listingId}...`);
        try {
            // --- TODO: Adapt contract function name if needed ---
            // Assuming a function `buyListing(uint256 _listingId)` payable
            const tx = await platformContract.buyListing(listingId, { value: price });
            setTxFeedback(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(); // Wait for transaction confirmation
            setTxFeedback(`✅ Successfully purchased item from listing ${listingId}!`);
            // Refresh data after successful purchase
            fetchMarketplaceData(); // Now accessible here
        } catch (err) {
            console.error("Buy transaction failed:", err);
            setError(`Purchase failed: ${err.reason || err.message}`);
            setTxFeedback(`⚠️ Purchase failed.`);
        } finally {
            setProcessingTx(false);
        }
    };

    const handleBid = async (auctionId, bidAmountEth) => {
        if (!platformContract || !account) return;
        console.log(`Attempting to bid ${bidAmountEth} ETH on auction ${auctionId}`);
        setProcessingTx(true);
        setTxFeedback(`Processing bid for auction ${auctionId}...`);
        try {
            // Convert ETH amount to Wei
            const bidAmountWei = ethers.parseEther(bidAmountEth);

            // --- TODO: Adapt contract function name if needed ---
            // Assuming a function `placeBid(uint256 _auctionId)` payable
            const tx = await platformContract.placeBid(auctionId, { value: bidAmountWei });
            setTxFeedback(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(); // Wait for transaction confirmation
            setTxFeedback(`✅ Successfully placed bid on auction ${auctionId}!`);
            // Refresh data after successful bid
            fetchMarketplaceData(); // Now accessible here
        } catch (err) {
            console.error("Bid transaction failed:", err);
            setError(`Bid failed: ${err.reason || err.message}`);
            setTxFeedback(`⚠️ Bid failed.`);
        } finally {
            setProcessingTx(false);
        }
    };

    // --- Render Logic ---

    if (loading) return <p>Loading marketplace...</p>;

    return (
        <div>
            {/* Display general errors and transaction feedback */}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {txFeedback && <p style={{ color: processingTx ? 'blue' : (txFeedback.startsWith('✅') ? 'green' : 'red') }}>{txFeedback}</p>}

            <h2>Fixed Price Listings</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {listings.length > 0 ? (
                    listings.map(item => (
                        <MarketItem key={`list-${item.id}`} item={item} type="listing" pokemonContract={pokemonContract} onBuy={handleBuy} isProcessing={processingTx} currentAccount={account} />
                    ))
                ) : (
                    <p>No active listings found.</p>
                )}
            </div>

            <h2>Auctions</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {auctions.length > 0 ? (
                    auctions.map(item => (
                        <MarketItem key={`auc-${item.id}`} item={item} type="auction" pokemonContract={pokemonContract} onBid={handleBid} isProcessing={processingTx} currentAccount={account} />
                    ))
                ) : (
                    <p>No active auctions found.</p>
                )}
            </div>
        </div>
    );
}

export default Marketplace;
