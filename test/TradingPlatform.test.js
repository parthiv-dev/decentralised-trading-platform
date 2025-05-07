const {
  loadFixture,
  time, // Import time for auction tests later
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradingPlatform", function () {
  // Constants for reuse
  const LISTING_PRICE = ethers.parseEther("1.0");
  const STARTING_PRICE = ethers.parseEther("0.5");
  const BID_1_AMOUNT = ethers.parseEther("0.6"); // Higher than starting price
  const BID_2_AMOUNT = ethers.parseEther("0.7"); // Higher than bid 1
  const LOW_BID_AMOUNT = ethers.parseEther("0.4"); // Lower than starting price
  const AUCTION_DURATION_SECONDS = 60 * 60; // 1 hour
  const FIRST_LISTING_ID = 0n; // Use BigInt for consistency
  const FIRST_AUCTION_ID = 0n; // Use BigInt for consistency
  const NON_EXISTENT_ID = 999n;
  // Adjusted Token IDs because PokemonCard now mints starting from ID 1
  const TOKEN_ID_1_MINTED = 1n; // First token minted
  const TOKEN_ID_2_MINTED = 2n; // Second token minted
  const TOKEN_URI_0 = "ipfs://test-uri/0";
  const TOKEN_URI_1 = "ipfs://test-uri/1";

  // Default parameters for minting Pokemon cards, to keep tests DRY
  const defaultPokemonMintValues = {
    name: "TradeTestPoke",
    hp: 60,
    attack: 60,
    defense: 60,
    speed: 60,
    type1: "Normal",
    type2: "Test",
    special: 60,
  };
  // Fixture to deploy both contracts and set up accounts/initial state
  async function deployTradingPlatformFixture() {
    // Get signers
    const [owner, seller, buyer, bidder1, bidder2, otherAccount] = await ethers.getSigners();

    // Deploy PokemonCard contract first
    const PokemonCard = await ethers.getContractFactory("PokemonCard");
    const pokemonCard = await PokemonCard.deploy(owner.address);
    await pokemonCard.waitForDeployment();
    const pokemonCardAddress = await pokemonCard.getAddress();

    // Deploy TradingPlatform contract, linking it to PokemonCard
    const TradingPlatform = await ethers.getContractFactory("TradingPlatform");
    const tradingPlatform = await TradingPlatform.deploy(pokemonCardAddress, owner.address);
    await tradingPlatform.waitForDeployment();
    const tradingPlatformAddress = await tradingPlatform.getAddress();

    // --- Test Setup: Mint tokens for the seller ---
    // Mint token 1 (TOKEN_ID_1_MINTED) for the seller
    await pokemonCard.connect(owner).safeMint(
        seller.address,
        TOKEN_URI_0, // URI for the first token
        defaultPokemonMintValues.name,
        defaultPokemonMintValues.hp,
        defaultPokemonMintValues.attack,
        defaultPokemonMintValues.defense,
        defaultPokemonMintValues.speed,
        defaultPokemonMintValues.type1,
        defaultPokemonMintValues.type2,
        defaultPokemonMintValues.special
    );
    // Seller approves the TradingPlatform contract to manage token 1
    await pokemonCard.connect(seller).approve(tradingPlatformAddress, TOKEN_ID_1_MINTED);

    // Mint token 2 (TOKEN_ID_2_MINTED) for the seller
    await pokemonCard.connect(owner).safeMint(
        seller.address,
        TOKEN_URI_1, // URI for the second token
        `${defaultPokemonMintValues.name}Two`, // Slightly different name for uniqueness if needed
        defaultPokemonMintValues.hp + 5,
        defaultPokemonMintValues.attack + 5,
        defaultPokemonMintValues.defense + 5,
        defaultPokemonMintValues.speed + 5,
        defaultPokemonMintValues.type1,
        "Flying", // Different type2
        defaultPokemonMintValues.special + 5
    );
    // Seller approves the TradingPlatform contract to manage token 2
    await pokemonCard.connect(seller).approve(tradingPlatformAddress, TOKEN_ID_2_MINTED);


    return {
      tradingPlatform,
      pokemonCard,
      owner,
      seller,
      buyer,
      bidder1,
      bidder2,
      otherAccount,
      tokenId1: TOKEN_ID_1_MINTED, // Updated constant name for clarity
      tokenId2: TOKEN_ID_2_MINTED, // Updated constant name for clarity
      pokemonCardAddress,
      tradingPlatformAddress
    };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { tradingPlatform, owner } = await loadFixture(deployTradingPlatformFixture);
      expect(await tradingPlatform.owner()).to.equal(owner.address);
    });

    it("Should link to the correct PokemonCard contract", async function () {
      const { tradingPlatform, pokemonCardAddress } = await loadFixture(deployTradingPlatformFixture);
      expect(await tradingPlatform.pokemonCardContract()).to.equal(pokemonCardAddress);
    });
  });

  describe("Fixed Price Listings", function () {

    it("Should allow a token owner to list an approved item", async function () {
      const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);

      // Seller lists the token (tokenId1 was approved in fixture)
      await expect(tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE))
        .to.emit(tradingPlatform, "ItemListed")
        .withArgs(FIRST_LISTING_ID, seller.address, tokenId1, LISTING_PRICE);

      // Check the listing details stored in the contract
      const listing = await tradingPlatform.listings(FIRST_LISTING_ID);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.tokenId).to.equal(tokenId1);
      expect(listing.price).to.equal(LISTING_PRICE);
      expect(listing.active).to.be.true;
      expect(await tradingPlatform.tokenIsListedOrInAuction(tokenId1)).to.be.true;
    });

    it("Should fail if non-owner tries to list the token", async function () {
      const { tradingPlatform, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);

      // Buyer tries to list the seller's token
      await expect(tradingPlatform.connect(buyer).listItem(tokenId1, LISTING_PRICE))
        .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__NotTokenOwner")
        .withArgs(buyer.address, tokenId1);
    });

    it("Should fail if listing price is zero", async function () {
      const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);

      await expect(tradingPlatform.connect(seller).listItem(tokenId1, 0))
        .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__PriceMustBePositive");
    });

    it("Should fail if the contract is not approved to manage the token", async function () {
      const { tradingPlatform, pokemonCard, owner, seller } = await loadFixture(deployTradingPlatformFixture);
      // Mint a *new* token for the seller
      const newTokenId = 3n; // Next available ID after fixture mints
      await pokemonCard.connect(owner).safeMint(
        seller.address,
        "ipfs://new-token-3",
        defaultPokemonMintValues.name,
        defaultPokemonMintValues.hp,
        defaultPokemonMintValues.attack,
        defaultPokemonMintValues.defense,
        defaultPokemonMintValues.speed,
        defaultPokemonMintValues.type1,
        defaultPokemonMintValues.type2,
        defaultPokemonMintValues.special
      );

      // IMPORTANT: Seller does *not* approve the platform for this newTokenId
      const platformAddress = await tradingPlatform.getAddress();
      await expect(tradingPlatform.connect(seller).listItem(newTokenId, LISTING_PRICE))
        .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__NotApprovedForToken")
        .withArgs(platformAddress, newTokenId);
    });

    it("Should fail if token is already listed", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE); // First listing

        // Try listing the same token again
        await expect(tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE))
            .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__TokenAlreadyListedOrInAuction")
            .withArgs(tokenId1);
    });

    it("Should fail if token is already in an auction", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS); // Token in auction

        // Try listing the same token
        await expect(tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE))
            .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__TokenAlreadyListedOrInAuction")
            .withArgs(tokenId1);
    });


    describe("Cancelling Listings", function () {
      it("Should allow the seller to cancel an active listing", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        // List the item first
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);

        // Cancel the listing
        await expect(tradingPlatform.connect(seller).cancelListing(FIRST_LISTING_ID))
          .to.emit(tradingPlatform, "ListingCancelled")
          .withArgs(FIRST_LISTING_ID, seller.address, tokenId1);

        // Check listing is inactive
        const listing = await tradingPlatform.listings(FIRST_LISTING_ID);
        expect(listing.active).to.be.false;
        expect(await tradingPlatform.tokenIsListedOrInAuction(tokenId1)).to.be.false;
      });

      it("Should fail if non-seller tries to cancel the listing", async function () {
        const { tradingPlatform, seller, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);

        await expect(tradingPlatform.connect(buyer).cancelListing(FIRST_LISTING_ID))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__NotListingSeller")
          .withArgs(buyer.address, FIRST_LISTING_ID);
      });

      it("Should fail if trying to cancel an already inactive listing", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);
        await tradingPlatform.connect(seller).cancelListing(FIRST_LISTING_ID); // Cancel it once

        // Try to cancel again
        await expect(tradingPlatform.connect(seller).cancelListing(FIRST_LISTING_ID))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__ListingNotActive")
          .withArgs(FIRST_LISTING_ID);
      });

       it("Should fail if trying to cancel a non-existent listing", async function () {
        const { tradingPlatform, seller } = await loadFixture(deployTradingPlatformFixture);
        // Note: No item listed with nonExistentListingId
        await expect(tradingPlatform.connect(seller).cancelListing(NON_EXISTENT_ID))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__ListingNotFound")
          .withArgs(NON_EXISTENT_ID);
      });
    });

    describe("Buying Items", function () {
      it("Should allow a buyer to purchase an active listing with correct price", async function () {
        const { tradingPlatform, pokemonCard, seller, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);

        const sellerInitialPending = await tradingPlatform.pendingWithdrawals(seller.address);

        // Buyer buys the item
        await expect(tradingPlatform.connect(buyer).buyItem(FIRST_LISTING_ID, { value: LISTING_PRICE }))
          .to.emit(tradingPlatform, "ItemSold")
          .withArgs(FIRST_LISTING_ID, buyer.address, seller.address, tokenId1, LISTING_PRICE);

        // Check listing is inactive
        const listing = await tradingPlatform.listings(FIRST_LISTING_ID);
        expect(listing.active).to.be.false;
        expect(await tradingPlatform.tokenIsListedOrInAuction(tokenId1)).to.be.false;

        // Check NFT ownership transferred
        expect(await pokemonCard.ownerOf(tokenId1)).to.equal(buyer.address);

        // Check seller's pending withdrawals increased
        const sellerFinalBalance = await tradingPlatform.pendingWithdrawals(seller.address);
        expect(sellerFinalBalance).to.equal(sellerInitialPending + LISTING_PRICE);
      });

      it("Should fail if buyer sends insufficient funds", async function () {
        const { tradingPlatform, seller, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);

        const insufficientAmount = ethers.parseEther("0.5");
        await expect(tradingPlatform.connect(buyer).buyItem(FIRST_LISTING_ID, { value: insufficientAmount }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__IncorrectPrice");
      });

      it("Should fail if buyer sends excessive funds", async function () {
        const { tradingPlatform, seller, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);

        const excessiveAmount = ethers.parseEther("1.5"); // Contract requires exact price
        await expect(tradingPlatform.connect(buyer).buyItem(FIRST_LISTING_ID, { value: excessiveAmount }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__IncorrectPrice");
      });

      it("Should fail if trying to buy an inactive listing", async function () {
        const { tradingPlatform, seller, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);
        await tradingPlatform.connect(seller).cancelListing(FIRST_LISTING_ID); // Cancel to make inactive

        await expect(tradingPlatform.connect(buyer).buyItem(FIRST_LISTING_ID, { value: LISTING_PRICE }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__ListingNotActive")
          .withArgs(FIRST_LISTING_ID);
      });

      it("Should fail if trying to buy a non-existent listing", async function () {
        const { tradingPlatform, buyer } = await loadFixture(deployTradingPlatformFixture);
        await expect(tradingPlatform.connect(buyer).buyItem(NON_EXISTENT_ID, { value: LISTING_PRICE }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__ListingNotActive") // Checks active first
          .withArgs(NON_EXISTENT_ID);
      });
    });
  });

  describe("Auctions", function () {

    describe("Creating Auctions", function () {
      it("Should allow a token owner to create an auction for an approved item", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);

        // Execute the transaction and wait for the receipt
        const txResponse = await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        const txReceipt = await txResponse.wait();
        const block = await ethers.provider.getBlock(txReceipt.blockNumber);
        const expectedEndTime = BigInt(block.timestamp) + BigInt(AUCTION_DURATION_SECONDS);

        await expect(txResponse)
          .to.emit(tradingPlatform, "AuctionCreated")
          .withArgs(FIRST_AUCTION_ID, seller.address, tokenId1, STARTING_PRICE, expectedEndTime); // Check event args

        const auction = await tradingPlatform.auctions(FIRST_AUCTION_ID);
        expect(auction.seller).to.equal(seller.address);
        expect(auction.tokenId).to.equal(tokenId1);
        expect(auction.startingPrice).to.equal(STARTING_PRICE);
        expect(auction.endTime).to.equal(expectedEndTime);
        expect(auction.highestBidder).to.equal(ethers.ZeroAddress);
        expect(auction.highestBid).to.equal(0);
        expect(auction.active).to.be.true;
        expect(auction.ended).to.be.false;
        expect(await tradingPlatform.tokenIsListedOrInAuction(tokenId1)).to.be.true;
      });

      it("Should fail if non-owner tries to create an auction", async function () {
        const { tradingPlatform, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await expect(tradingPlatform.connect(buyer).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__NotTokenOwner")
          .withArgs(buyer.address, tokenId1);
      });

      it("Should fail if starting price is zero", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await expect(tradingPlatform.connect(seller).createAuction(tokenId1, 0, AUCTION_DURATION_SECONDS))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__PriceMustBePositive");
      });

       it("Should fail if duration is zero", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await expect(tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, 0))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__DurationMustBePositive");
      });

      it("Should fail if the contract is not approved for the token", async function () {
        const { tradingPlatform, pokemonCard, owner, seller } = await loadFixture(deployTradingPlatformFixture);
        const newTokenId = 3n; // Next available ID
        await pokemonCard.connect(owner).safeMint(
            seller.address,
            "ipfs://new-token-3",
            defaultPokemonMintValues.name,
            defaultPokemonMintValues.hp,
            defaultPokemonMintValues.attack,
            defaultPokemonMintValues.defense,
            defaultPokemonMintValues.speed,
            defaultPokemonMintValues.type1,
            defaultPokemonMintValues.type2,
            defaultPokemonMintValues.special
        );
        // Not approved
        const platformAddress = await tradingPlatform.getAddress();
        await expect(tradingPlatform.connect(seller).createAuction(newTokenId, STARTING_PRICE, AUCTION_DURATION_SECONDS))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__NotApprovedForToken")
          .withArgs(platformAddress, newTokenId);
      });

      it("Should fail if token is already listed", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE); // Token is listed

        // Try creating auction for the same token
        await expect(tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS))
            .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__TokenAlreadyListedOrInAuction")
            .withArgs(tokenId1);
      });

      it("Should fail if token is already in another auction", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS); // First auction

        // Try creating another auction for the same token
        await expect(tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS))
            .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__TokenAlreadyListedOrInAuction")
            .withArgs(tokenId1);
      });
    });

    // --- Bidding Tests ---
    describe("Bidding", function () {

      it("Should allow a user to place a valid first bid", async function () {
        const { tradingPlatform, seller, bidder1, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);

        await expect(tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT }))
          .to.emit(tradingPlatform, "BidPlaced")
          .withArgs(FIRST_AUCTION_ID, bidder1.address, BID_1_AMOUNT);

        const auction = await tradingPlatform.auctions(FIRST_AUCTION_ID);
        expect(auction.highestBidder).to.equal(bidder1.address);
        expect(auction.highestBid).to.equal(BID_1_AMOUNT);
        // No check for auctionBids mapping as it was removed
      });

       it("Should allow a user to place a higher subsequent bid and refund previous bidder", async function () {
        const { tradingPlatform, seller, bidder1, bidder2, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        await tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT });

        const bidder1InitialPending = await tradingPlatform.pendingWithdrawals(bidder1.address);

        // Bidder2 outbids Bidder1
        await expect(tradingPlatform.connect(bidder2).bid(FIRST_AUCTION_ID, { value: BID_2_AMOUNT }))
          .to.emit(tradingPlatform, "BidPlaced")
          .withArgs(FIRST_AUCTION_ID, bidder2.address, BID_2_AMOUNT);

        const auction = await tradingPlatform.auctions(FIRST_AUCTION_ID);
        expect(auction.highestBidder).to.equal(bidder2.address);
        expect(auction.highestBid).to.equal(BID_2_AMOUNT);
        // No check for auctionBids mapping as it was removed

        // Check Bidder1 was refunded (pending withdrawal increased)
        const bidder1FinalPending = await tradingPlatform.pendingWithdrawals(bidder1.address);
        expect(bidder1FinalPending).to.equal(bidder1InitialPending + BID_1_AMOUNT);
      });

      it("Should fail if bid is lower than starting price (first bid)", async function () {
        const { tradingPlatform, seller, bidder1, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);

        await expect(tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: LOW_BID_AMOUNT }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__BidTooLow")
          .withArgs(STARTING_PRICE, LOW_BID_AMOUNT); // Expect requiredBid = startingPrice
      });

      it("Should fail if bid is not higher than current highest bid", async function () {
        const { tradingPlatform, seller, bidder1, bidder2, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        await tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT });

        // Try bidding same amount
        await expect(tradingPlatform.connect(bidder2).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__BidTooLow")
          .withArgs(BID_1_AMOUNT, BID_1_AMOUNT); // Expect requiredBid = current highest bid

        // Try bidding lower amount
        await expect(tradingPlatform.connect(bidder2).bid(FIRST_AUCTION_ID, { value: LOW_BID_AMOUNT }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__BidTooLow")
          .withArgs(BID_1_AMOUNT, LOW_BID_AMOUNT); // Expect requiredBid = current highest bid
      });

      it("Should fail if auction is not active (not created)", async function () {
         const { tradingPlatform, bidder1 } = await loadFixture(deployTradingPlatformFixture);
         // No auction created for FIRST_AUCTION_ID (0)
         await expect(tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT }))
           .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionNotActive")
           .withArgs(FIRST_AUCTION_ID);
      });

      it("Should fail if auction is not active (already ended)", async function () {
        const { tradingPlatform, seller, bidder1, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        await tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT });
        const auction = await tradingPlatform.auctions(FIRST_AUCTION_ID);
        await time.increaseTo(auction.endTime + 1n);
        await tradingPlatform.connect(seller).endAuction(FIRST_AUCTION_ID); // End the auction

        // Try bidding after ended
        await expect(tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_2_AMOUNT }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionNotActive")
          .withArgs(FIRST_AUCTION_ID);
      });

      it("Should fail if auction has ended (time passed)", async function () {
        const { tradingPlatform, seller, bidder1, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);

        // Fast forward time
        const auction = await tradingPlatform.auctions(FIRST_AUCTION_ID);
        await time.increaseTo(auction.endTime + 1n);

        await expect(tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT }))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionHasEnded")
          .withArgs(FIRST_AUCTION_ID);
      });
    });

    describe("Ending Auctions", function () {
      it("Should allow ending the auction after duration, transferring NFT and funds", async function () {
        const { tradingPlatform, pokemonCard, seller, bidder1, tokenId1, otherAccount} = await loadFixture(deployTradingPlatformFixture);
        // Create auction and get the ID from the event
        const txResponse = await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        const txReceipt = await txResponse.wait();
        // Find the AuctionCreated event log
        const auctionCreatedLog = txReceipt.logs.find(log => {
            try {
                return tradingPlatform.interface.parseLog(log)?.name === "AuctionCreated";
            } catch (e) { return false; } // Ignore logs that can't be parsed by this interface
        });
        const createdAuctionId = auctionCreatedLog.args.auctionId;

        // Bidder1 places a valid winning bid (BID_1_AMOUNT > STARTING_PRICE)
        await tradingPlatform.connect(bidder1).bid(createdAuctionId, { value: BID_1_AMOUNT });

        const sellerInitialPending = await tradingPlatform.pendingWithdrawals(seller.address);
        const auction = await tradingPlatform.auctions(createdAuctionId);

        // Ensure time is actually past endTime
        const latestTime = await time.latest();
        if (latestTime < auction.endTime) {
            await time.increaseTo(auction.endTime + 1n);
        }

        // End the auction (anyone can call)
        await expect(tradingPlatform.connect(otherAccount).endAuction(createdAuctionId))
          .to.emit(tradingPlatform, "AuctionEnded")
          .withArgs(createdAuctionId, bidder1.address, seller.address, BID_1_AMOUNT);

        // Check NFT ownership
        expect(await pokemonCard.ownerOf(tokenId1)).to.equal(bidder1.address);
        // Check seller pending withdrawals increased by the winning bid amount
        expect(await tradingPlatform.pendingWithdrawals(seller.address)).to.equal(sellerInitialPending + BID_1_AMOUNT);
        // Check auction status
        const endedAuction = await tradingPlatform.auctions(createdAuctionId);
        expect(endedAuction.active).to.be.false;
        expect(endedAuction.ended).to.be.true;
        expect(await tradingPlatform.tokenIsListedOrInAuction(tokenId1)).to.be.false;
      });

      it("Should allow ending the auction with no bids, emitting cancellation", async function () {
        const { tradingPlatform, pokemonCard, seller, tokenId1, otherAccount } = await loadFixture(deployTradingPlatformFixture);
        // Create auction and get the ID
        const txResponse = await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        const txReceipt = await txResponse.wait();
        const auctionCreatedLog = txReceipt.logs.find(log => {
             try { return tradingPlatform.interface.parseLog(log)?.name === "AuctionCreated"; } catch (e) { return false; }
        });
        const createdAuctionId = auctionCreatedLog.args.auctionId;

        const auction = await tradingPlatform.auctions(createdAuctionId);

        // Ensure time is actually past endTime
        const latestTime = await time.latest();
        if (latestTime < auction.endTime) {
            await time.increaseTo(auction.endTime + 1n);
        }

        // End the auction (anyone can call)
        await expect(tradingPlatform.connect(otherAccount).endAuction(createdAuctionId))
          .to.emit(tradingPlatform, "AuctionCancelled") // Check for cancellation event
          .withArgs(createdAuctionId, seller.address, tokenId1);

        // Check NFT ownership (should still be seller)
        expect(await pokemonCard.ownerOf(tokenId1)).to.equal(seller.address);
        // Check auction status
        const endedAuction = await tradingPlatform.auctions(createdAuctionId);
        expect(endedAuction.active).to.be.false;
        expect(endedAuction.ended).to.be.true;
        expect(await tradingPlatform.tokenIsListedOrInAuction(tokenId1)).to.be.false;
      });

      it("Should fail if trying to end auction before duration", async function () {
        const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);

        // Don't advance time
        await expect(tradingPlatform.connect(seller).endAuction(FIRST_AUCTION_ID))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionNotEndedYet")
          .withArgs(FIRST_AUCTION_ID);
      });

      it("Should fail if trying to end an already ended auction", async function () {
        const { tradingPlatform, seller, bidder1, tokenId1, otherAccount } = await loadFixture(deployTradingPlatformFixture);
        // Create auction and get ID
        const txResponse = await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        const txReceipt = await txResponse.wait();
        const auctionCreatedLog = txReceipt.logs.find(log => {
             try { return tradingPlatform.interface.parseLog(log)?.name === "AuctionCreated"; } catch (e) { return false; }
        });
        const createdAuctionId = auctionCreatedLog.args.auctionId;

        // Bidder1 places a valid winning bid
        await tradingPlatform.connect(bidder1).bid(createdAuctionId, { value: BID_1_AMOUNT });
        const auction = await tradingPlatform.auctions(createdAuctionId);

        // Ensure time is past endTime
        const latestTime = await time.latest();
        if (latestTime < auction.endTime) {
            await time.increaseTo(auction.endTime + 1n);
        }
        await tradingPlatform.connect(otherAccount).endAuction(createdAuctionId); // End it once

        // Try ending again
        await expect(tradingPlatform.connect(seller).endAuction(createdAuctionId))
          .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionNotActive")
          .withArgs(createdAuctionId);
      });
    });

    describe("Cancelling Auctions", function () {
        it("Should allow the seller to cancel an active auction with no bids", async function () {
            const { tradingPlatform, seller, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
            // Create auction
            const txResponse = await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
            const txReceipt = await txResponse.wait();
            const auctionCreatedLog = txReceipt.logs.find(log => {
                 try { return tradingPlatform.interface.parseLog(log)?.name === "AuctionCreated"; } catch (e) { return false; }
            });
            const createdAuctionId = auctionCreatedLog.args.auctionId;

            // Cancel the auction
            await expect(tradingPlatform.connect(seller).cancelAuction(createdAuctionId))
              .to.emit(tradingPlatform, "AuctionCancelled")
              .withArgs(createdAuctionId, seller.address, tokenId1);

            // Check auction status
            const cancelledAuction = await tradingPlatform.auctions(createdAuctionId);
            expect(cancelledAuction.active).to.be.false;
            expect(cancelledAuction.ended).to.be.true; // Should be marked as ended
            expect(await tradingPlatform.tokenIsListedOrInAuction(tokenId1)).to.be.false;
        });

        it("Should fail if non-seller tries to cancel the auction", async function () {
            const { tradingPlatform, seller, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
            await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);

            await expect(tradingPlatform.connect(buyer).cancelAuction(FIRST_AUCTION_ID))
              .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__NotAuctionSeller")
              .withArgs(buyer.address, FIRST_AUCTION_ID);
        });

        it("Should fail if trying to cancel an auction with bids", async function () {
            const { tradingPlatform, seller, bidder1, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
            await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
            await tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT }); // Place a bid

            await expect(tradingPlatform.connect(seller).cancelAuction(FIRST_AUCTION_ID))
              .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionHasBids");
        });

        it("Should fail if trying to cancel an already ended auction", async function () {
            const { tradingPlatform, seller, tokenId1, otherAccount } = await loadFixture(deployTradingPlatformFixture);
            await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
            const auction = await tradingPlatform.auctions(FIRST_AUCTION_ID);
            await time.increaseTo(auction.endTime + 1n);
            await tradingPlatform.connect(otherAccount).endAuction(FIRST_AUCTION_ID); // End it (no bids scenario)

            await expect(tradingPlatform.connect(seller).cancelAuction(FIRST_AUCTION_ID))
              .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionNotActive")
              .withArgs(FIRST_AUCTION_ID);
        });

        it("Should fail if trying to cancel a non-existent auction", async function () {
            const { tradingPlatform, seller } = await loadFixture(deployTradingPlatformFixture);
            await expect(tradingPlatform.connect(seller).cancelAuction(NON_EXISTENT_ID))
              .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__AuctionNotFound")
              .withArgs(NON_EXISTENT_ID);
        });
    });
  }); // End Auctions Describe

  describe("Withdrawals", function () {

    it("Should allow a seller to withdraw funds after a fixed price sale", async function () {
      const { tradingPlatform, seller, buyer, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
      // List and sell item
      await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE);
      await tradingPlatform.connect(buyer).buyItem(FIRST_LISTING_ID, { value: LISTING_PRICE });

      const initialBalance = await ethers.provider.getBalance(seller.address);
      const pendingAmount = await tradingPlatform.pendingWithdrawals(seller.address);
      expect(pendingAmount).to.equal(LISTING_PRICE);

      // Withdraw funds
      const tx = await tradingPlatform.connect(seller).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Check event
      await expect(tx)
        .to.emit(tradingPlatform, "FundsWithdrawn")
        .withArgs(seller.address, pendingAmount);

      // Check pending withdrawals reset
      expect(await tradingPlatform.pendingWithdrawals(seller.address)).to.equal(0);

      // Check seller's ETH balance increased (approximately)
      const finalBalance = await ethers.provider.getBalance(seller.address);
      expect(finalBalance).to.be.closeTo(initialBalance + pendingAmount - gasUsed, ethers.parseUnits("0.001", "ether")); // Account for gas cost
    });

     it("Should allow a seller to withdraw funds after a successful auction", async function () {
        const { tradingPlatform, seller, bidder1, tokenId1, otherAccount } = await loadFixture(deployTradingPlatformFixture);
        // Create auction, bid, end auction
        const txResponse = await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
        const txReceipt = await txResponse.wait();
        const auctionCreatedLog = txReceipt.logs.find(log => {
             try { return tradingPlatform.interface.parseLog(log)?.name === "AuctionCreated"; } catch (e) { return false; }
        });
        const createdAuctionId = auctionCreatedLog.args.auctionId;
        await tradingPlatform.connect(bidder1).bid(createdAuctionId, { value: BID_1_AMOUNT });
        const auction = await tradingPlatform.auctions(createdAuctionId);
        await time.increaseTo(auction.endTime + 1n);
        await tradingPlatform.connect(otherAccount).endAuction(createdAuctionId); // End auction

        const initialBalance = await ethers.provider.getBalance(seller.address);
        const pendingAmount = await tradingPlatform.pendingWithdrawals(seller.address);
        expect(pendingAmount).to.equal(BID_1_AMOUNT); // Seller gets the highest bid

        // Withdraw funds
        const txWithdraw = await tradingPlatform.connect(seller).withdraw();
        const receiptWithdraw = await txWithdraw.wait();
        const gasUsed = receiptWithdraw.gasUsed * receiptWithdraw.gasPrice;

        await expect(txWithdraw)
            .to.emit(tradingPlatform, "FundsWithdrawn")
            .withArgs(seller.address, pendingAmount);

        expect(await tradingPlatform.pendingWithdrawals(seller.address)).to.equal(0);
        const finalBalance = await ethers.provider.getBalance(seller.address);
        expect(finalBalance).to.be.closeTo(initialBalance + pendingAmount - gasUsed, ethers.parseUnits("0.001", "ether"));
    });

    it("Should allow an outbid bidder to withdraw their refunded bid", async function () {
      const { tradingPlatform, seller, bidder1, bidder2, tokenId1 } = await loadFixture(deployTradingPlatformFixture);
      // Create auction, bidder1 bids, bidder2 outbids
      await tradingPlatform.connect(seller).createAuction(tokenId1, STARTING_PRICE, AUCTION_DURATION_SECONDS);
      await tradingPlatform.connect(bidder1).bid(FIRST_AUCTION_ID, { value: BID_1_AMOUNT });
      await tradingPlatform.connect(bidder2).bid(FIRST_AUCTION_ID, { value: BID_2_AMOUNT }); // bidder1's bidAmount is now pending

      const initialBalance = await ethers.provider.getBalance(bidder1.address);
      const pendingAmount = await tradingPlatform.pendingWithdrawals(bidder1.address);
      expect(pendingAmount).to.equal(BID_1_AMOUNT);

      // Bidder1 withdraws funds
      const tx = await tradingPlatform.connect(bidder1).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(tradingPlatform, "FundsWithdrawn")
        .withArgs(bidder1.address, pendingAmount);

      expect(await tradingPlatform.pendingWithdrawals(bidder1.address)).to.equal(0);

      const finalBalance = await ethers.provider.getBalance(bidder1.address);
      expect(finalBalance).to.be.closeTo(initialBalance + pendingAmount - gasUsed, ethers.parseUnits("0.001", "ether"));
    });

    it("Should fail if user tries to withdraw with zero balance", async function () {
      const { tradingPlatform, buyer } = await loadFixture(deployTradingPlatformFixture);
      // Buyer has no pending funds initially
      expect(await tradingPlatform.pendingWithdrawals(buyer.address)).to.equal(0);

      await expect(tradingPlatform.connect(buyer).withdraw())
        .to.be.revertedWithCustomError(tradingPlatform, "TradingPlatform__NoFundsToWithdraw")
        .withArgs(buyer.address);
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      const { tradingPlatform, owner } = await loadFixture(deployTradingPlatformFixture);
      expect(await tradingPlatform.paused()).to.be.false;
      // Pause
      await expect(tradingPlatform.connect(owner).pause())
        .to.emit(tradingPlatform, "Paused").withArgs(owner.address);
      expect(await tradingPlatform.paused()).to.be.true;
      // Try pausing again (should fail)
      await expect(tradingPlatform.connect(owner).pause()) // pause() uses whenNotPaused modifier
        .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause"); // Correct OZ v5 error
      // Unpause
      await expect(tradingPlatform.connect(owner).unpause())
        .to.emit(tradingPlatform, "Unpaused").withArgs(owner.address);
      expect(await tradingPlatform.paused()).to.be.false;
      // Try unpausing again (should fail)
      await expect(tradingPlatform.connect(owner).unpause()) // unpause() uses whenPaused modifier
        .to.be.revertedWithCustomError(tradingPlatform, "ExpectedPause"); // Correct OZ v5 error
    });

    it("Should prevent non-owners from pausing or unpausing", async function () {
      const { tradingPlatform, owner, buyer } = await loadFixture(deployTradingPlatformFixture);
      // Attempt pause from non-owner (buyer)
      await expect(tradingPlatform.connect(buyer).pause())
        .to.be.revertedWithCustomError(tradingPlatform, "OwnableUnauthorizedAccount")
        .withArgs(buyer.address);

      // Owner pauses
      await tradingPlatform.connect(owner).pause();
      expect(await tradingPlatform.paused()).to.be.true;

      // Attempt unpause from non-owner (buyer)
      await expect(tradingPlatform.connect(buyer).unpause())
        .to.be.revertedWithCustomError(tradingPlatform, "OwnableUnauthorizedAccount")
        .withArgs(buyer.address);
    });

    it("Should prevent actions when paused", async function () {
      const { tradingPlatform, pokemonCard, owner, seller, buyer, bidder1, tokenId1, tokenId2 } = await loadFixture(deployTradingPlatformFixture);

      // Setup: List item 0, create auction for item 1
      await tradingPlatform.connect(seller).listItem(tokenId1, LISTING_PRICE); // List token 1
      const txResponse = await tradingPlatform.connect(seller).createAuction(tokenId2, STARTING_PRICE, AUCTION_DURATION_SECONDS); // Auction token 2
      const txReceipt = await txResponse.wait();
      const auctionCreatedLog = txReceipt.logs.find(log => {
           try { return tradingPlatform.interface.parseLog(log)?.name === "AuctionCreated"; } catch (e) { return false; }
      });
      const createdAuctionId = auctionCreatedLog.args.auctionId; // Should be 0 if it's the first auction

      // Pause the contract
      await tradingPlatform.connect(owner).pause();
      expect(await tradingPlatform.paused()).to.be.true;

      // Test actions that should be paused
      // Need a new token ID (e.g., 2) to test listing/auction creation failure without hitting TokenAlreadyListed
      const newTokenId = 3n; // Next available ID
      await pokemonCard.connect(owner).safeMint(
        seller.address,
        "ipfs://token3",
        defaultPokemonMintValues.name,
        defaultPokemonMintValues.hp,
        defaultPokemonMintValues.attack,
        defaultPokemonMintValues.defense,
        defaultPokemonMintValues.speed,
        defaultPokemonMintValues.type1,
        defaultPokemonMintValues.type2,
        defaultPokemonMintValues.special
      );
      await pokemonCard.connect(seller).approve(await tradingPlatform.getAddress(), newTokenId);

      await expect(tradingPlatform.connect(seller).listItem(newTokenId, LISTING_PRICE))
          .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).cancelListing(FIRST_LISTING_ID)) // Cancel listing 0
          .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(buyer).buyItem(FIRST_LISTING_ID, { value: LISTING_PRICE })) // Buy listing 0
          .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).createAuction(newTokenId, STARTING_PRICE, 60))
          .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(bidder1).bid(createdAuctionId, { value: BID_1_AMOUNT })) // Bid on auction 0
          .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).endAuction(createdAuctionId)) // End auction 0
          .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).cancelAuction(createdAuctionId)) // Cancel auction 0 (assuming no bids yet)
            .to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause"); // Correct OZ v5 error

      // Test withdraw (should NOT be paused)
      // Need to generate some pending withdrawals first
      await tradingPlatform.connect(owner).unpause(); // Unpause temporarily
      await tradingPlatform.connect(buyer).buyItem(FIRST_LISTING_ID, { value: LISTING_PRICE }); // Buyer buys item 0, seller gets funds
      await tradingPlatform.connect(owner).pause(); // Re-pause

      // Seller should still be able to withdraw even when paused
      const pendingAmount = await tradingPlatform.pendingWithdrawals(seller.address);
      expect(pendingAmount).to.equal(LISTING_PRICE);
      // Call withdraw directly; if it reverts, the test will fail.
      await tradingPlatform.connect(seller).withdraw();
      expect(await tradingPlatform.pendingWithdrawals(seller.address)).to.equal(0); // Check balance is zero after withdrawal
    });
  });
});
