// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28; 

// Import necessary OpenZeppelin contracts
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment if you need console logging during development/testing
// import "hardhat/console.sol";

/**
 * @title TradingPlatform
 * @author DeFi Coursework Group Matteo & Parthiv
 * @notice A contract for listing, selling (fixed price), and auctioning ERC721 tokens (e.g., Pokemon Cards).
 * @dev Implements Ownable for access control, Pausable for emergency stops, and ReentrancyGuard for security.
 * Uses custom errors for gas efficiency and clearer revert reasons.
 */
contract TradingPlatform is Ownable, Pausable, ReentrancyGuard, IERC721Receiver {
    // --- State Variables ---

    /// @notice The address of the ERC721 token contract being traded.
    IERC721 public immutable pokemonCardContract; // Address of the PokemonCard NFT contract

    /// @notice Counter to generate unique IDs for fixed-price listings.
    uint256 private _nextListingId; // Starts at 0, first listing ID will be 0.
    /// @notice Counter to generate unique IDs for auctions.
    uint256 private _nextAuctionId; // Starts at 0, first auction ID will be 0.

    // --- Structs ---

    /**
     * @dev Represents a fixed-price listing.
     * @param seller The address of the account listing the token.
     * @param tokenId The ID of the ERC721 token being listed for sale.
     * @param price The selling price of the token in wei.
     * @param active A boolean indicating if the listing is currently active and available for purchase.
     */
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    /**
     * @dev Represents an auction.
     * @param seller The address of the account auctioning the token.
     * @param tokenId The ID of the ERC721 token being put up for auction.
     * @param startingPrice The minimum price for the first bid in wei.
     * @param endTime The Unix timestamp when the auction concludes.
     * @param highestBidder The address of the current highest bidder.
     * @param highestBid The amount of the current highest bid in wei.
     * @param active A boolean indicating if the auction is currently running (i.e., not yet ended or cancelled).
     * @param ended A boolean indicating if the auction has been formally concluded (either sold, cancelled, or ended without bids).
     */
    struct Auction {
        address seller;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool active;
        bool ended;
    }

    // --- Mappings ---

    /// @notice Mapping from listing ID to Listing details.
    /// @dev Public visibility creates a getter function `listings(uint256) returns (address, uint256, uint256, bool)`.
    mapping(uint256 => Listing) public listings; // Renamed from fixedPriceListings for consistency with tests

    /// @notice Mapping from auction ID to Auction details.
    /// @dev Public visibility creates a getter function `auctions(uint256) returns (address, uint256, uint256, uint256, address, uint256, bool, bool)`.
    mapping(uint256 => Auction) public auctions;

    /// @notice Mapping from user address to their withdrawable balance (from sales or refunded bids).
    /// @dev Public visibility creates a getter function `pendingWithdrawals(address) returns (uint256)`.
    mapping(address => uint256) public pendingWithdrawals;

    /// @notice Tracks if a token ID is currently involved in an active listing or auction to prevent duplicate listings/auctions.
    /// @dev Public visibility creates a getter function `tokenIsListedOrInAuction(uint256) returns (bool)`.
    mapping(uint256 => bool) public tokenIsListedOrInAuction;

    // --- Events ---

    /**
     * @dev Emitted when an item is listed for fixed price sale.
     * @param listingId The unique ID of the listing.
     * @param seller The address of the seller.
     * @param tokenId The ID of the token being listed.
     * @param price The price of the item in wei.
     */
    event ItemListed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 price);

    /**
     * @dev Emitted when a fixed price listing is cancelled by the seller.
     * @param listingId The ID of the cancelled listing.
     * @param seller The address of the seller.
     * @param tokenId The ID of the token that was listed.
     */
    event ListingCancelled(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId);

    /**
     * @dev Emitted when an item is successfully bought via fixed price.
     * @param listingId The ID of the listing that was sold.
     * @param buyer The address of the buyer.
     * @param seller The address of the seller.
     * @param tokenId The ID of the token sold.
     * @param price The price the item was sold for in wei.
     */
    event ItemSold(uint256 indexed listingId, address indexed buyer, address seller, uint256 indexed tokenId, uint256 price);

    /**
     * @dev Emitted when an auction is created.
     * @param auctionId The unique ID of the auction.
     * @param seller The address of the seller.
     * @param tokenId The ID of the token being auctioned.
     * @param startingPrice The initial price required for the first bid.
     * @param endTime The timestamp when the auction ends.
     */
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 indexed tokenId, uint256 startingPrice, uint256 endTime);

    /**
     * @dev Emitted when a bid is placed on an auction.
     * @param auctionId The ID of the auction.
     * @param bidder The address of the bidder.
     * @param amount The amount of the bid in wei.
     */
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);

    /**
     * @dev Emitted when an auction ends successfully with a winning bidder.
     * @param auctionId The ID of the ended auction.
     * @param winner The address of the winning bidder.
     * @param seller The address of the seller.
     * @param winningBid The final price the item was sold for in wei.
     */
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, address indexed seller, uint256 winningBid);

    /**
     * @dev Emitted when an auction ends without any bids or is cancelled by the seller.
     * @param auctionId The ID of the cancelled auction.
     * @param seller The address of the seller.
     * @param tokenId The ID of the token whose auction was cancelled.
     */
    event AuctionCancelled(uint256 indexed auctionId, address indexed seller, uint256 indexed tokenId);

    /**
     * @dev Emitted when a user withdraws their pending funds.
     * @param user The address of the user withdrawing funds.
     * @param amount The amount withdrawn in wei.
     */
    event FundsWithdrawn(address indexed user, uint256 amount);

    // --- Errors ---
    /// @notice Reverts if the caller is not the owner of the specified token.
    /// @param caller The address of the message sender.
    /// @param tokenId The ID of the token in question.
    error TradingPlatform__NotTokenOwner(address caller, uint256 tokenId);
    /// @notice Reverts if a price (for listing or auction start) is not greater than zero.
    error TradingPlatform__PriceMustBePositive();
    /// @notice Reverts if an auction duration is not greater than zero.
    error TradingPlatform__DurationMustBePositive();
    /// @notice Reverts if this contract is not approved to manage the specified token.
    /// @param spender The address that should have been approved (this contract).
    /// @param tokenId The ID of the token for which approval is missing.
    error TradingPlatform__NotApprovedForToken(address spender, uint256 tokenId);
    /// @notice Reverts if an attempt is made to list or auction a token that is already actively listed or in an auction.
    /// @param tokenId The ID of the token that is already engaged in a trade.
    error TradingPlatform__TokenAlreadyListedOrInAuction(uint256 tokenId);
    /// @notice Reverts if a specified listing ID does not correspond to an existing listing.
    /// @param listingId The ID of the non-existent listing.
    error TradingPlatform__ListingNotFound(uint256 listingId);
    /// @notice Reverts if the caller is not the seller of the specified listing.
    /// @param caller The address of the message sender.
    /// @param listingId The ID of the listing in question.
    error TradingPlatform__NotListingSeller(address caller, uint256 listingId);
    /// @notice Reverts if an operation is attempted on a listing that is not currently active.
    /// @param listingId The ID of the inactive listing.
    error TradingPlatform__ListingNotActive(uint256 listingId);
    /// @notice Reverts if the ETH value sent with a purchase does not match the listing price.
    error TradingPlatform__IncorrectPrice();
    /// @notice Reverts if a specified auction ID does not correspond to an existing auction.
    /// @param auctionId The ID of the non-existent auction.
    error TradingPlatform__AuctionNotFound(uint256 auctionId);
    /// @notice Reverts if the caller is not the seller of the specified auction.
    /// @param caller The address of the message sender.
    /// @param auctionId The ID of the auction in question.
    error TradingPlatform__NotAuctionSeller(address caller, uint256 auctionId);
    /// @notice Reverts if an operation is attempted on an auction that is not currently active.
    /// @param auctionId The ID of the inactive auction.
    error TradingPlatform__AuctionNotActive(uint256 auctionId);
    /// @notice Reverts if a bid is placed on an auction that has already ended.
    /// @param auctionId The ID of the ended auction.
    error TradingPlatform__AuctionHasEnded(uint256 auctionId);
    /// @notice Reverts if an attempt is made to end an auction before its designated end time.
    /// @param auctionId The ID of the auction that has not yet reached its end time.
    error TradingPlatform__AuctionNotEndedYet(uint256 auctionId);
    /// @notice Reverts if a bid amount is not sufficient (e.g., less than starting price or current highest bid).
    /// @param requiredBid The minimum bid amount required.
    /// @param sentBid The bid amount actually sent by the bidder.
    error TradingPlatform__BidTooLow(uint256 requiredBid, uint256 sentBid);
    /// @notice Reverts if an ETH withdrawal transaction fails.
    error TradingPlatform__WithdrawalFailed();
    /// @notice Reverts if a user attempts to withdraw funds but has no pending withdrawals.
    /// @param user The address of the user attempting to withdraw.
    error TradingPlatform__NoFundsToWithdraw(address user);
    /// @notice Reverts if an attempt is made to cancel an auction that has already received bids.
    error TradingPlatform__AuctionHasBids(); // For cancelling auctions
    /// @notice Reverts during a sale if the seller no longer owns the token (e.g., transferred it away after listing).
    /// @param seller The expected seller address.
    /// @param tokenId The ID of the token.
    error TradingPlatform__SellerNoLongerOwnsToken(address seller, uint256 tokenId);

    // --- Constructor ---

    /**
     * @dev Sets the address of the PokemonCard NFT contract and the initial owner.
     * @param _pokemonCardAddress The address of the deployed PokemonCard contract.
     * @param initialOwner The address to set as the owner of this platform contract.
     */
    constructor(address _pokemonCardAddress, address initialOwner) Ownable(initialOwner) {
        if (_pokemonCardAddress == address(0)) revert("TradingPlatform: Invalid PokemonCard address");
        pokemonCardContract = IERC721(_pokemonCardAddress);
    }

    // --- Pausable Control Functions ---

    /**
     * @notice Pauses all pausable functions. Can only be called by the owner.
     * @dev Emits a {Paused} event. Requires the contract not to be already paused.
     */
    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    /**
     * @notice Unpauses the contract. Can only be called by the owner.
     * @dev Emits an {Unpaused} event. Requires the contract to be paused.
     */
    function unpause() public onlyOwner whenPaused {
        _unpause();
    }

    // --- Withdrawal Function ---

    /**
     * @notice Allows users (sellers or outbid bidders) to withdraw their accumulated funds.
     * @dev Uses the Checks-Effects-Interactions pattern and nonReentrant modifier.
     *      This function remains operational even when the contract is paused.
     */
    function withdraw() external nonReentrant { // Intentionally NOT whenNotPaused
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert TradingPlatform__NoFundsToWithdraw(msg.sender); // Check

        // Effects first: Zero out the balance before sending
        pendingWithdrawals[msg.sender] = 0;

        // Interaction last: Send the Ether
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            // If transfer fails, revert the state change (credit the user's balance back internally)
            pendingWithdrawals[msg.sender] = amount;
            revert TradingPlatform__WithdrawalFailed();
        }

        emit FundsWithdrawn(msg.sender, amount);
    }

    // --- Fixed Price Listing Functions ---

    /**
     * @notice List an owned and approved ERC721 token for sale at a fixed price.
     * @dev Requires the caller to be the owner and to have approved the contract for this token or all tokens.
     *      The token must not already be listed or in an active auction.
     *      Emits an {ItemListed} event.
     * @param tokenId The ID of the token to list.
     * @param price The selling price in wei (must be > 0).
     * @return listingId The ID of the newly created listing.
     */
    function listItem(uint256 tokenId, uint256 price) external whenNotPaused returns (uint256) {
        // --- Checks ---
        if (price == 0) revert TradingPlatform__PriceMustBePositive();
        if (pokemonCardContract.ownerOf(tokenId) != msg.sender) revert TradingPlatform__NotTokenOwner(msg.sender, tokenId);
        if (pokemonCardContract.getApproved(tokenId) != address(this) && !pokemonCardContract.isApprovedForAll(msg.sender, address(this))) {
             revert TradingPlatform__NotApprovedForToken(address(this), tokenId);
        }
        if (tokenIsListedOrInAuction[tokenId]) revert TradingPlatform__TokenAlreadyListedOrInAuction(tokenId);
        // Effects
        uint256 listingId = _nextListingId;
        listings[listingId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            active: true
        });
        tokenIsListedOrInAuction[tokenId] = true; // Mark token as listed
        _nextListingId++; // Increment for the next listing

        emit ItemListed(listingId, msg.sender, tokenId, price);
        return listingId;
    }

    /**
     * @notice Cancel an active fixed-price listing.
     * @dev Only the original seller can cancel. The listing must exist and be active.
     *      Emits a {ListingCancelled} event.
     * @param listingId The ID of the listing to cancel.
     */
    function cancelListing(uint256 listingId) external nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];

        // --- Checks ---
        if (listing.seller == address(0)) revert TradingPlatform__ListingNotFound(listingId); // Check if listing exists first
        if (listing.seller != msg.sender) revert TradingPlatform__NotListingSeller(msg.sender, listingId);
        if (!listing.active) revert TradingPlatform__ListingNotActive(listingId);
        // --- Effects ---
        // Effects
        uint256 tokenId = listing.tokenId; // Store before modifying storage
        listing.active = false;
        tokenIsListedOrInAuction[tokenId] = false; // Mark token as available again

        // Interaction (None needed for cancellation)

        emit ListingCancelled(listingId, msg.sender, tokenId);
    }

    /**
     * @notice Purchase an item listed for a fixed price.
     * @dev Requires sending the exact price in ETH. The listing must be active.
     *      Transfers NFT to buyer and credits seller's pending withdrawals.
     *      Emits an {ItemSold} event.
     * @param listingId The ID of the listing to purchase.
     */
    function buyItem(uint256 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];

        // --- Checks ---
        if (!listing.active) revert TradingPlatform__ListingNotActive(listingId);
        if (msg.value != listing.price) revert TradingPlatform__IncorrectPrice();

        address seller = listing.seller;
        uint256 tokenId = listing.tokenId;

        // === New explicit checks before transfer ===
        // Check if the seller still owns the token at the time of purchase
        if (pokemonCardContract.ownerOf(tokenId) != seller) {
            revert TradingPlatform__SellerNoLongerOwnsToken(seller, tokenId);
        }
        // Re-check if this contract is still approved for the specific token 
        // OR if the seller approved all for this contract.
        // This guards against approval being revoked after listing.
        if (pokemonCardContract.getApproved(tokenId) != address(this) && 
            !pokemonCardContract.isApprovedForAll(seller, address(this))) {
            revert TradingPlatform__NotApprovedForToken(address(this), tokenId);
        }
        // === End of new explicit checks ===

        uint256 price = listing.price; // Cache price before modifying storage (listing.price will be part of the struct that's effectively "cleared")

        // --- Interaction ---
        // Transfer the NFT from the seller to the buyer (msg.sender)
        // The contract must be approved by the seller beforehand (checked during listItem)
        pokemonCardContract.safeTransferFrom(seller, msg.sender, tokenId);

        emit ItemSold(listingId, msg.sender, seller, tokenId, price);
        // --- Effects (after successful transfer) ---
        listing.active = false; // Mark listing as inactive
        tokenIsListedOrInAuction[tokenId] = false; // Mark token as no longer listed
        pendingWithdrawals[seller] += msg.value; // Credit seller's withdrawable balance
    }

    // --- Auction Functions ---

    /**
     * @notice Create a new auction for an owned and approved ERC721 token.
     * @dev Requires the caller to be the owner and to have approved the contract for this token or all tokens.
     *      The token must not already be listed or in an active auction.
     *      Starting price and duration must be greater than zero.
     *      Emits an {AuctionCreated} event.
     * @param tokenId The ID of the token to auction.
     * @param startingPrice The minimum initial bid price in wei (must be > 0).
     * @param durationSeconds The duration of the auction in seconds (must be > 0).
     * @return auctionId The ID of the newly created auction.
     */
    function createAuction(uint256 tokenId, uint256 startingPrice, uint256 durationSeconds) external whenNotPaused returns (uint256) {
        // --- Checks ---
        if (startingPrice == 0) revert TradingPlatform__PriceMustBePositive();
        if (durationSeconds == 0) revert TradingPlatform__DurationMustBePositive();
        if (pokemonCardContract.ownerOf(tokenId) != msg.sender) revert TradingPlatform__NotTokenOwner(msg.sender, tokenId);
        if (pokemonCardContract.getApproved(tokenId) != address(this) && !pokemonCardContract.isApprovedForAll(msg.sender, address(this))) {
            revert TradingPlatform__NotApprovedForToken(address(this), tokenId);
        }
        if (tokenIsListedOrInAuction[tokenId]) revert TradingPlatform__TokenAlreadyListedOrInAuction(tokenId);
        // Effects
        uint256 auctionId = _nextAuctionId;
        uint256 endTime = block.timestamp + durationSeconds;
        auctions[auctionId] = Auction({
            seller: msg.sender,
            tokenId: tokenId,
            startingPrice: startingPrice,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            active: true,
            ended: false
        });
        tokenIsListedOrInAuction[tokenId] = true; // Mark token as in auction
        _nextAuctionId++; // Increment for the next auction

        emit AuctionCreated(auctionId, msg.sender, tokenId, startingPrice, endTime);
        return auctionId;
    }

    /**
     * @notice Place a bid on an active auction.
     * @dev Requires sending ETH value greater than the current highest bid (or >= starting price if first bid).
     *      Refunds the previous highest bidder via pendingWithdrawals.
     *      The auction must be active and not yet ended.
     *      Emits a {BidPlaced} event.
     * @dev Potential front-running vector: A user can see a bid in the mempool and submit a higher bid
     *      with more gas to potentially win the auction unfairly. A commit-reveal scheme could mitigate this.
     * @param auctionId The ID of the auction to bid on.
     */
    function bid(uint256 auctionId) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];

        // --- Checks ---
        if (!auction.active) revert TradingPlatform__AuctionNotActive(auctionId);
        if (block.timestamp >= auction.endTime) revert TradingPlatform__AuctionHasEnded(auctionId);

        uint256 currentHighestBid = auction.highestBid;
        uint256 requiredBid = (currentHighestBid == 0) ? auction.startingPrice : currentHighestBid;

        if (msg.value <= requiredBid) revert TradingPlatform__BidTooLow(requiredBid, msg.value);
        // --- Effects & Interactions ---
        address previousHighestBidder = auction.highestBidder;
        uint256 previousHighestBid = auction.highestBid;

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        // Interaction (Refund previous bidder)
        if (previousHighestBidder != address(0)) {
            pendingWithdrawals[previousHighestBidder] += previousHighestBid;
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @notice Ends an auction after its duration has passed. Can be called by anyone.
     * @dev The auction must be active and the end time must have passed.
     *      If there was a winning bid, transfers NFT to the highest bidder and credits seller's pending withdrawals.
     *      If no bids were placed, the auction is cancelled, the NFT remains with the seller, and {AuctionCancelled} is emitted.
     *      Emits {AuctionEnded} on successful sale or {AuctionCancelled} if no bids.
     * @param auctionId The ID of the auction to end.
     */
    function endAuction(uint256 auctionId) external nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];

        // --- Checks ---
        if (auction.seller == address(0) && auction.tokenId == 0) revert TradingPlatform__AuctionNotFound(auctionId); // Check if auction exists
        if (!auction.active) revert TradingPlatform__AuctionNotActive(auctionId); // Covers ended case too
        if (block.timestamp < auction.endTime) revert TradingPlatform__AuctionNotEndedYet(auctionId);
        // --- Effects & Interactions ---
        auction.active = false;
        auction.ended = true;
        tokenIsListedOrInAuction[auction.tokenId] = false; // Mark token as available again

        address winner = auction.highestBidder;
        uint256 winningBid = auction.highestBid;
        address seller = auction.seller;
        uint256 tokenId = auction.tokenId;

        if (winner != address(0)) {
            // Auction has a winner
            // Credit seller's withdrawable balance
            pendingWithdrawals[seller] += winningBid;

            // Interaction: Transfer NFT to the highest bidder
            pokemonCardContract.safeTransferFrom(seller, winner, tokenId);

            emit AuctionEnded(auctionId, winner, seller, winningBid);
        } else {
            // No bids received, auction is cancelled
            // NFT stays with the seller (no transfer needed)
            emit AuctionCancelled(auctionId, seller, tokenId);
        }
    }

    /**
     * @notice Allows the seller to cancel an auction *before* any bids have been placed.
     * @dev Cannot be called if the auction has ended or received bids.
     *      Emits an {AuctionCancelled} event.
     * @param auctionId The ID of the auction to cancel.
     */
    function cancelAuction(uint256 auctionId) external nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];

        // --- Checks ---
        if (auction.seller == address(0) && auction.tokenId == 0) revert TradingPlatform__AuctionNotFound(auctionId);
        if (auction.seller != msg.sender) revert TradingPlatform__NotAuctionSeller(msg.sender, auctionId);
        if (!auction.active) revert TradingPlatform__AuctionNotActive(auctionId); // Covers ended case too
        if (auction.highestBidder != address(0)) revert TradingPlatform__AuctionHasBids(); // Cannot cancel if bids exist
        // --- Effects ---
        uint256 tokenId = auction.tokenId; // Store before modifying storage
        auction.active = false;
        auction.ended = true; // Mark as ended to prevent further actions like endAuction
        tokenIsListedOrInAuction[tokenId] = false; // Mark token as available again

        // Interaction (None needed)

        emit AuctionCancelled(auctionId, msg.sender, tokenId);
    }

    // --- View/Helper Functions ---

    /**
     * @dev Returns the details of a specific fixed-price listing.
     * @param listingId The ID of the listing.
     * @return seller The address of the seller.
     * @return tokenId The ID of the token listed.
     * @return price The price in wei.
     * @return active The status of the listing.
     */
    function getListing(uint256 listingId) external view returns (address seller, uint256 tokenId, uint256 price, bool active) {
        Listing storage listing = listings[listingId];
        return (listing.seller, listing.tokenId, listing.price, listing.active);
    }

    /**
     * @dev Returns the details of a specific auction.
     * @param auctionId The ID of the auction.
     * @return seller The address of the seller.
     * @return tokenId The ID of the token being auctioned.
     * @return startingPrice The starting price in wei.
     * @return endTime The timestamp when the auction ends.
     * @return highestBidder The address of the current highest bidder.
     * @return highestBid The current highest bid amount in wei.
     * @return active The status of the auction (ongoing or not).
     * @return ended The status of the auction (concluded or not).
     */
    function getAuction(uint256 auctionId) external view returns (
        address seller,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 endTime,
        address highestBidder,
        uint256 highestBid,
        bool active,
        bool ended
    ) {
        Auction storage auction = auctions[auctionId];
        return (
            auction.seller,
            auction.tokenId,
            auction.startingPrice,
            auction.endTime,
            auction.highestBidder,
            auction.highestBid,
            auction.active,
            auction.ended
        );
    }

    /**
     * @dev Required by the ERC721 standard for receiving tokens via safeTransferFrom.
     * @notice This contract is designed to receive NFTs only through its explicit trading functions (buyItem, endAuction).
     */
    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
