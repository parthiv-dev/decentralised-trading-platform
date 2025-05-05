// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TradingPlatform is ReentrancyGuard, Pausable, Ownable {
    IERC721 public immutable pokemonCardContract;

    // --- Structs ---

    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price; // In wei
        bool active;
    }

    struct Auction {
        address seller;
        uint256 tokenId;
        uint256 startingPrice; // In wei
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool active;
        bool ended;
    }

    // --- State Variables ---

    // Mappings to store listings and auctions
    // Using a counter for IDs is simpler than using tokenId directly,
    // as a token could be listed multiple times over its life.
    mapping(uint256 => Listing) public listings;
    uint256 private _nextListingId;

    mapping(uint256 => Auction) public auctions;
    uint256 private _nextAuctionId;

    // Store funds owed to users (e.g., from sales, outbid auction bids)
    mapping(address => uint256) public pendingWithdrawals;

    // Track bids per auction to allow withdrawal if outbid
    // Moved out of struct as mappings cannot be in storage structs directly like that
    mapping(uint256 => mapping(address => uint256)) public auctionBids;

    // --- Events ---
    event ItemListed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 price);
    event ListingCancelled(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId);
    event ItemSold(uint256 listingId, address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price);
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 indexed tokenId, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, address seller, uint256 winningBid);
    event AuctionCancelled(uint256 indexed auctionId, address indexed seller, uint256 indexed tokenId); // Added for completeness
    event FundsWithdrawn(address indexed user, uint256 amount);


    // --- Constructor ---

    constructor(address _pokemonCardAddress, address initialOwner) Ownable(initialOwner) {
        pokemonCardContract = IERC721(_pokemonCardAddress);
    }

    // --- Functions ---

    // --- Pausable Control Functions ---
    // Expose the pause functionality, restricted to the owner
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // --- Withdrawal Function ---

    function withdraw() external nonReentrant whenNotPaused {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds available for withdrawal");

        // Reset pending amount before transfer (Reentrancy Guard)
        pendingWithdrawals[msg.sender] = 0;

        // Send the funds
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(msg.sender, amount);
    }


    // --- Listing Functions ---

    function listItem(uint256 tokenId, uint256 price) external whenNotPaused {
        require(pokemonCardContract.ownerOf(tokenId) == msg.sender, "Not the owner of the token");
        require(price > 0, "Price must be greater than 0");

        // Require the seller to have approved this contract to transfer the token beforehand
        require(
            pokemonCardContract.getApproved(tokenId) == address(this) || pokemonCardContract.isApprovedForAll(msg.sender, address(this)),
            "Contract not approved to manage this token"
        );

        uint256 listingId = _nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit ItemListed(listingId, msg.sender, tokenId, price);
    }

    function cancelListing(uint256 listingId) external nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing is not active");

        listing.active = false;

        // Note: We cannot revoke the approval from here. The user must do that.
        // If the user used setApprovalForAll, they might want to keep it.

        emit ListingCancelled(listingId, listing.seller, listing.tokenId);
    }

    function buyItem(uint256 listingId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing is not active");
        require(msg.value == listing.price, "Incorrect price");

        listing.active = false;

        // Securely record funds for the seller to withdraw
        pendingWithdrawals[listing.seller] += msg.value;

        // Transfer the token from the seller to the buyer (contract acts as approved operator)
        pokemonCardContract.safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        emit ItemSold(listingId, msg.sender, listing.seller, listing.tokenId, listing.price);
    }

    // --- Auction Functions ---

    function createAuction(uint256 tokenId, uint256 startingPrice, uint256 durationSeconds) external whenNotPaused {
        require(pokemonCardContract.ownerOf(tokenId) == msg.sender, "Not the owner of the token");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(durationSeconds > 0, "Duration must be greater than 0");

        // Require the seller to have approved this contract to transfer the token beforehand
        require(
            pokemonCardContract.getApproved(tokenId) == address(this) || pokemonCardContract.isApprovedForAll(msg.sender, address(this)),
            "Contract not approved to manage this token"
        );

        // TODO: Consider adding a check to prevent listing/auctioning the same token ID simultaneously

        uint256 auctionId = _nextAuctionId++;
        auctions[auctionId] = Auction({
            seller: msg.sender,
            tokenId: tokenId,
            startingPrice: startingPrice,
            endTime: block.timestamp + durationSeconds,
            highestBidder: address(0),
            highestBid: 0,
            active: true,
            ended: false
        });

        emit AuctionCreated(auctionId, msg.sender, tokenId, startingPrice, auctions[auctionId].endTime);
    }

    function bid(uint256 auctionId) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction is not active");
        require(block.timestamp < auction.endTime, "Auction has ended");
        // Explicitly check bid amount based on whether it's the first bid
        require(
            (auction.highestBid == 0 && msg.value >= auction.startingPrice) || // First bid must meet starting price
            (auction.highestBid > 0 && msg.value > auction.highestBid),       // Subsequent bids must be higher
            "Bid not high enough"
        );

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            pendingWithdrawals[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        // Use the separate mapping for bids
        auctionBids[auctionId][msg.sender] = msg.value;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    function endAuction(uint256 auctionId) external nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction is not active");
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");
        require(!auction.ended, "Auction already ended");

        auction.active = false;
        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            // Securely record funds for the seller to withdraw
            pendingWithdrawals[auction.seller] += auction.highestBid;

            // Transfer the token from the seller to the highest bidder (contract acts as approved operator)
            pokemonCardContract.safeTransferFrom(auction.seller, auction.highestBidder, auction.tokenId);

            emit AuctionEnded(auctionId, auction.highestBidder, auction.seller, auction.highestBid);
        } else {
            // No bids were placed, so the auction ends without a sale
            emit AuctionCancelled(auctionId, auction.seller, auction.tokenId); 
        }
    }

    function cancelAuction(uint256 auctionId) external nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];

        require(auction.seller == msg.sender, "Not the seller");
        require(auction.active, "Auction is not active");
        require(auction.highestBidder == address(0), "Cannot cancel auction with bids");

        auction.active = false;
        auction.ended = true; // Mark as ended to prevent further actions like endAuction

        emit AuctionCancelled(auctionId, auction.seller, auction.tokenId);
    }
}