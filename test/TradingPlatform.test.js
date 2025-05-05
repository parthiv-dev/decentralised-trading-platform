const {
  loadFixture,
  time, // Import time for auction tests later
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradingPlatform", function () {
  // Fixture to deploy both contracts and set up accounts
  async function deployTradingPlatformFixture() {
    // Get signers
    const [owner, seller, buyer, bidder1, bidder2] = await ethers.getSigners();

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

    // --- Test Setup ---
    // Mint a token for the seller to use in tests
    const tokenId = 0;
    const tokenURI = "ipfs://test-uri/0";
    await pokemonCard.connect(owner).safeMint(seller.address, tokenURI);

    // Seller must approve the TradingPlatform contract to manage their token
    await pokemonCard.connect(seller).approve(tradingPlatformAddress, tokenId);

    return {
      tradingPlatform,
      pokemonCard,
      owner,
      seller,
      buyer,
      bidder1,
      bidder2,
      tokenId,
      pokemonCardAddress, // Added for convenience if needed
      tradingPlatformAddress // Added for convenience if needed
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
    const listingPrice = ethers.parseEther("1.0"); // List for 1 ETH
    const listingId = 0; // First listing will have ID 0
    const nonExistentListingId = 999;

    it("Should allow a token owner to list an approved item", async function () {
      const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);

      // Seller lists the token (tokenId 0 was approved in fixture)
      await expect(tradingPlatform.connect(seller).listItem(tokenId, listingPrice))
        .to.emit(tradingPlatform, "ItemListed")
        .withArgs(listingId, seller.address, tokenId, listingPrice);

      // Check the listing details stored in the contract
      const listing = await tradingPlatform.listings(listingId);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.tokenId).to.equal(tokenId);
      expect(listing.price).to.equal(listingPrice);
      expect(listing.active).to.be.true;
    });

    it("Should fail if non-owner tries to list the token", async function () {
      const { tradingPlatform, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);

      // Buyer tries to list the seller's token
      await expect(
        tradingPlatform.connect(buyer).listItem(tokenId, listingPrice)
      ).to.be.revertedWith("Not the owner of the token");
    });

    it("Should fail if listing price is zero", async function () {
      const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);

      await expect(
        tradingPlatform.connect(seller).listItem(tokenId, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should fail if the contract is not approved to manage the token", async function () {
      const { tradingPlatform, pokemonCard, owner, seller } = await loadFixture(deployTradingPlatformFixture);
      // Mint a *new* token for the seller
      const newTokenId = 1;
      await pokemonCard.connect(owner).safeMint(seller.address, "ipfs://new-token");

      // IMPORTANT: Seller does *not* approve the platform for this newTokenId

      await expect(
        tradingPlatform.connect(seller).listItem(newTokenId, listingPrice)
      ).to.be.revertedWith("Contract not approved to manage this token");
    });

    describe("Cancelling Listings", function () {
      it("Should allow the seller to cancel an active listing", async function () {
        const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);
        // List the item first
        await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);

        // Cancel the listing
        await expect(tradingPlatform.connect(seller).cancelListing(listingId))
          .to.emit(tradingPlatform, "ListingCancelled")
          .withArgs(listingId, seller.address, tokenId);

        // Check listing is inactive
        const listing = await tradingPlatform.listings(listingId);
        expect(listing.active).to.be.false;
      });

      it("Should fail if non-seller tries to cancel the listing", async function () {
        const { tradingPlatform, seller, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);

        await expect(
          tradingPlatform.connect(buyer).cancelListing(listingId)
        ).to.be.revertedWith("Not the seller");
      });

      it("Should fail if trying to cancel an already inactive listing", async function () {
        const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);
        await tradingPlatform.connect(seller).cancelListing(listingId); // Cancel it once

        // Try to cancel again
        await expect(
          tradingPlatform.connect(seller).cancelListing(listingId)
        ).to.be.revertedWith("Listing is not active");
      });

       it("Should fail if trying to cancel a non-existent listing", async function () {
        const { tradingPlatform, seller } = await loadFixture(deployTradingPlatformFixture);
        // Note: No item listed with nonExistentListingId
        await expect(
          tradingPlatform.connect(seller).cancelListing(nonExistentListingId)
          // It will revert because listing.seller will be address(0)
        ).to.be.revertedWith("Not the seller"); // Or potentially revert on active check depending on Solidity version/optimization
      });
    });

    describe("Buying Items", function () {
      it("Should allow a buyer to purchase an active listing with correct price", async function () {
        const { tradingPlatform, pokemonCard, seller, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);

        const sellerInitialBalance = await tradingPlatform.pendingWithdrawals(seller.address);

        // Buyer buys the item
        await expect(tradingPlatform.connect(buyer).buyItem(listingId, { value: listingPrice }))
          .to.emit(tradingPlatform, "ItemSold")
          .withArgs(listingId, buyer.address, seller.address, tokenId, listingPrice);

        // Check listing is inactive
        const listing = await tradingPlatform.listings(listingId);
        expect(listing.active).to.be.false;

        // Check NFT ownership transferred
        expect(await pokemonCard.ownerOf(tokenId)).to.equal(buyer.address);

        // Check seller's pending withdrawals increased
        const sellerFinalBalance = await tradingPlatform.pendingWithdrawals(seller.address);
        expect(sellerFinalBalance).to.equal(sellerInitialBalance + listingPrice);
      });

      it("Should fail if buyer sends insufficient funds", async function () {
        const { tradingPlatform, seller, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);

        const insufficientAmount = ethers.parseEther("0.5");
        await expect(
          tradingPlatform.connect(buyer).buyItem(listingId, { value: insufficientAmount })
        ).to.be.revertedWith("Incorrect price"); // Match contract error
      });

      it("Should fail if buyer sends excessive funds", async function () {
        const { tradingPlatform, seller, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);

        const excessiveAmount = ethers.parseEther("1.5");
        await expect(
          tradingPlatform.connect(buyer).buyItem(listingId, { value: excessiveAmount })
        ).to.be.revertedWith("Incorrect price"); // Match contract error
      });

      it("Should fail if trying to buy an inactive listing", async function () {
        const { tradingPlatform, seller, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);
        await tradingPlatform.connect(seller).cancelListing(listingId); // Make it inactive

        await expect(
          tradingPlatform.connect(buyer).buyItem(listingId, { value: listingPrice })
        ).to.be.revertedWith("Listing is not active");
      });
    });
  });

  describe("Auctions", function () {
    const startingPrice = ethers.parseEther("0.5");
    const auctionDurationSeconds = 60 * 60; // 1 hour
    const auctionId = 0; // First auction

    describe("Creating Auctions", function () {
      it("Should allow a token owner to create an auction for an approved item", async function () {
        const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);

        const blockTimestamp = await time.latest();
        const expectedEndTime = blockTimestamp + auctionDurationSeconds + 1; // Allow for 1 sec block mining time

        await expect(tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds))
          .to.emit(tradingPlatform, "AuctionCreated")
          .withArgs(auctionId, seller.address, tokenId, startingPrice, expectedEndTime); // Check event args

        const auction = await tradingPlatform.auctions(auctionId);
        expect(auction.seller).to.equal(seller.address);
        expect(auction.tokenId).to.equal(tokenId);
        expect(auction.startingPrice).to.equal(startingPrice);
        expect(auction.endTime).to.equal(expectedEndTime);
        expect(auction.highestBidder).to.equal(ethers.ZeroAddress);
        expect(auction.highestBid).to.equal(0);
        expect(auction.active).to.be.true;
        expect(auction.ended).to.be.false;
      });

      it("Should fail if non-owner tries to create an auction", async function () {
        const { tradingPlatform, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await expect(
          tradingPlatform.connect(buyer).createAuction(tokenId, startingPrice, auctionDurationSeconds)
        ).to.be.revertedWith("Not the owner of the token");
      });

      it("Should fail if starting price is zero", async function () {
        const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await expect(
          tradingPlatform.connect(seller).createAuction(tokenId, 0, auctionDurationSeconds)
        ).to.be.revertedWith("Starting price must be greater than 0");
      });

       it("Should fail if duration is zero", async function () {
        const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await expect(
          tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, 0)
        ).to.be.revertedWith("Duration must be greater than 0");
      });

      it("Should fail if the contract is not approved for the token", async function () {
        const { tradingPlatform, pokemonCard, owner, seller } = await loadFixture(deployTradingPlatformFixture);
        const newTokenId = 1;
        await pokemonCard.connect(owner).safeMint(seller.address, "ipfs://new-token");
        // Not approved
        await expect(
          tradingPlatform.connect(seller).createAuction(newTokenId, startingPrice, auctionDurationSeconds)
        ).to.be.revertedWith("Contract not approved to manage this token");
      });
    });

    describe("Bidding", function () {
      const bid1Amount = ethers.parseEther("0.6");
      const bid2Amount = ethers.parseEther("0.7");
      const lowBidAmount = ethers.parseEther("0.4"); // Less than startingPrice

      it("Should allow a user to place a valid first bid", async function () {
        const { tradingPlatform, seller, bidder1, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);

        await expect(tradingPlatform.connect(bidder1).bid(auctionId, { value: bid1Amount }))
          .to.emit(tradingPlatform, "BidPlaced")
          .withArgs(auctionId, bidder1.address, bid1Amount);

        const auction = await tradingPlatform.auctions(auctionId);
        expect(auction.highestBidder).to.equal(bidder1.address);
        expect(auction.highestBid).to.equal(bid1Amount);
        expect(await tradingPlatform.auctionBids(auctionId, bidder1.address)).to.equal(bid1Amount);
      });

       it("Should allow a user to place a higher subsequent bid and refund previous bidder", async function () {
        const { tradingPlatform, seller, bidder1, bidder2, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);
        await tradingPlatform.connect(bidder1).bid(auctionId, { value: bid1Amount });

        const bidder1InitialPending = await tradingPlatform.pendingWithdrawals(bidder1.address);

        // Bidder2 outbids Bidder1
        await expect(tradingPlatform.connect(bidder2).bid(auctionId, { value: bid2Amount }))
          .to.emit(tradingPlatform, "BidPlaced")
          .withArgs(auctionId, bidder2.address, bid2Amount);

        const auction = await tradingPlatform.auctions(auctionId);
        expect(auction.highestBidder).to.equal(bidder2.address);
        expect(auction.highestBid).to.equal(bid2Amount);
        expect(await tradingPlatform.auctionBids(auctionId, bidder2.address)).to.equal(bid2Amount);

        // Check Bidder1 was refunded (pending withdrawal increased)
        const bidder1FinalPending = await tradingPlatform.pendingWithdrawals(bidder1.address);
        expect(bidder1FinalPending).to.equal(bidder1InitialPending + bid1Amount);
      });

      it("Should fail if bid is lower than starting price (first bid)", async function () {
        const { tradingPlatform, seller, bidder1, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);

        await expect(
          tradingPlatform.connect(bidder1).bid(auctionId, { value: lowBidAmount })
        ).to.be.revertedWith("Bid not high enough");
      });

      it("Should fail if bid is not higher than current highest bid", async function () {
        const { tradingPlatform, seller, bidder1, bidder2, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);
        await tradingPlatform.connect(bidder1).bid(auctionId, { value: bid1Amount });

        await expect(
          tradingPlatform.connect(bidder2).bid(auctionId, { value: bid1Amount }) // Same as highest
        ).to.be.revertedWith("Bid not high enough");
      });

      it("Should fail if auction is not active", async function () {
         const { tradingPlatform, seller, bidder1, tokenId } = await loadFixture(deployTradingPlatformFixture);
         // No auction created
         await expect(
           tradingPlatform.connect(bidder1).bid(auctionId, { value: bid1Amount })
         ).to.be.revertedWith("Auction is not active");
      });

      it("Should fail if auction has ended", async function () {
        const { tradingPlatform, seller, bidder1, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);

        // Fast forward time
        const auction = await tradingPlatform.auctions(auctionId);
        await time.increaseTo(auction.endTime + BigInt(1));

        await expect(
          tradingPlatform.connect(bidder1).bid(auctionId, { value: bid1Amount })
        ).to.be.revertedWith("Auction has ended");
      });
    });

    describe("Ending Auctions", function () {
      it("Should allow ending the auction after duration, transferring NFT and funds", async function () {
        const { tradingPlatform, pokemonCard, seller, bidder1, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);
        await tradingPlatform.connect(bidder1).bid(auctionId, { value: startingPrice }); // Bidder1 places winning bid

        const sellerInitialPending = await tradingPlatform.pendingWithdrawals(seller.address);
        const auction = await tradingPlatform.auctions(auctionId);
        await time.increaseTo(auction.endTime + BigInt(1)); // Fast forward past end time

        await expect(tradingPlatform.connect(seller).endAuction(auctionId)) // Anyone can call endAuction
          .to.emit(tradingPlatform, "AuctionEnded")
          .withArgs(auctionId, bidder1.address, seller.address, startingPrice);

        // Check NFT ownership
        expect(await pokemonCard.ownerOf(tokenId)).to.equal(bidder1.address);
        // Check seller pending withdrawals
        expect(await tradingPlatform.pendingWithdrawals(seller.address)).to.equal(sellerInitialPending + startingPrice);
        // Check auction status
        const endedAuction = await tradingPlatform.auctions(auctionId);
        expect(endedAuction.active).to.be.false;
        expect(endedAuction.ended).to.be.true;
      });

      it("Should allow ending the auction with no bids, emitting cancellation", async function () {
        const { tradingPlatform, pokemonCard, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);

        const auction = await tradingPlatform.auctions(auctionId);
        await time.increaseTo(auction.endTime + BigInt(1)); // Fast forward past end time

        await expect(tradingPlatform.connect(seller).endAuction(auctionId))
          .to.emit(tradingPlatform, "AuctionCancelled") // Check for cancellation event
          .withArgs(auctionId, seller.address, tokenId);

        // Check NFT ownership (should still be seller)
        expect(await pokemonCard.ownerOf(tokenId)).to.equal(seller.address);
        // Check auction status
        const endedAuction = await tradingPlatform.auctions(auctionId);
        expect(endedAuction.active).to.be.false;
        expect(endedAuction.ended).to.be.true;
      });

      it("Should fail if trying to end auction before duration", async function () {
        const { tradingPlatform, seller, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);

        await expect(
          tradingPlatform.connect(seller).endAuction(auctionId)
        ).to.be.revertedWith("Auction has not ended yet");
      });

      it("Should fail if trying to end an already ended auction", async function () {
        const { tradingPlatform, seller, bidder1, tokenId } = await loadFixture(deployTradingPlatformFixture);
        await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);
        await tradingPlatform.connect(bidder1).bid(auctionId, { value: startingPrice });
        const auction = await tradingPlatform.auctions(auctionId);
        await time.increaseTo(auction.endTime + BigInt(1));
        await tradingPlatform.connect(seller).endAuction(auctionId); // End it once

        // Try ending again
        await expect(
          tradingPlatform.connect(seller).endAuction(auctionId)
        ).to.be.revertedWith("Auction is not active");
      });
    });
  });

  describe("Withdrawals", function () {
    const listingPrice = ethers.parseEther("1.0");
    const startingPrice = ethers.parseEther("0.5");
    const bidAmount = ethers.parseEther("0.6");
    const higherBidAmount = ethers.parseEther("0.7");
    const auctionDurationSeconds = 60;
    const listingId = 0;
    const auctionId = 0;

    it("Should allow a seller to withdraw funds after a sale", async function () {
      const { tradingPlatform, seller, buyer, tokenId } = await loadFixture(deployTradingPlatformFixture);
      // List and sell item
      await tradingPlatform.connect(seller).listItem(tokenId, listingPrice);
      await tradingPlatform.connect(buyer).buyItem(listingId, { value: listingPrice });

      const initialBalance = await ethers.provider.getBalance(seller.address);
      const pendingAmount = await tradingPlatform.pendingWithdrawals(seller.address);
      expect(pendingAmount).to.equal(listingPrice);

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

    it("Should allow an outbid bidder to withdraw their refunded bid", async function () {
      const { tradingPlatform, seller, bidder1, bidder2, tokenId } = await loadFixture(deployTradingPlatformFixture);
      // Create auction, bidder1 bids, bidder2 outbids
      await tradingPlatform.connect(seller).createAuction(tokenId, startingPrice, auctionDurationSeconds);
      await tradingPlatform.connect(bidder1).bid(auctionId, { value: bidAmount });
      await tradingPlatform.connect(bidder2).bid(auctionId, { value: higherBidAmount }); // bidder1's bidAmount is now pending

      const initialBalance = await ethers.provider.getBalance(bidder1.address);
      const pendingAmount = await tradingPlatform.pendingWithdrawals(bidder1.address);
      expect(pendingAmount).to.equal(bidAmount);

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

      await expect(
        tradingPlatform.connect(buyer).withdraw()
      ).to.be.revertedWith("No funds available for withdrawal");
    });
  });

  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      const { tradingPlatform, owner } = await loadFixture(deployTradingPlatformFixture);
      expect(await tradingPlatform.paused()).to.be.false;
      await expect(tradingPlatform.connect(owner).pause()).to.emit(tradingPlatform, "Paused").withArgs(owner.address);
      expect(await tradingPlatform.paused()).to.be.true;
      await expect(tradingPlatform.connect(owner).unpause()).to.emit(tradingPlatform, "Unpaused").withArgs(owner.address);
      expect(await tradingPlatform.paused()).to.be.false;
    });

    it("Should prevent non-owners from pausing or unpausing", async function () {
      const { tradingPlatform, buyer } = await loadFixture(deployTradingPlatformFixture);
      // Attempt pause from non-owner (buyer) - Use the correct owner signer from the fixture
      await expect(tradingPlatform.connect(buyer).pause()).to.be.revertedWithCustomError(tradingPlatform, "OwnableUnauthorizedAccount");
      // Owner pauses - Use the 'owner' signer obtained from the fixture
      // await tradingPlatform.connect(owner).pause();
      await tradingPlatform.pause();
      // Attempt unpause from non-owner (buyer)
      await expect(tradingPlatform.connect(buyer).unpause()).to.be.revertedWithCustomError(tradingPlatform, "OwnableUnauthorizedAccount");
    });

    it("Should prevent actions when paused", async function () {
      const { tradingPlatform, owner, seller, buyer, bidder1, tokenId } = await loadFixture(deployTradingPlatformFixture);
      const price = ethers.parseEther("1");
      await tradingPlatform.connect(seller).listItem(tokenId, price); // List item 0
      await tradingPlatform.connect(owner).pause(); // Pause the contract

      await expect(tradingPlatform.connect(seller).listItem(tokenId, price)).to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).cancelListing(0)).to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(buyer).buyItem(0, { value: price })).to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).createAuction(tokenId, price, 60)).to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      // Need an active auction to test bid/endAuction when paused
      // Unpause, create auction, pause again
      await tradingPlatform.connect(owner).unpause();
      await tradingPlatform.connect(seller).createAuction(tokenId, price, 60); // Auction ID 0
      await tradingPlatform.connect(owner).pause();
      await expect(tradingPlatform.connect(bidder1).bid(0, { value: price })).to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).endAuction(0)).to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
      await expect(tradingPlatform.connect(seller).withdraw()).to.be.revertedWithCustomError(tradingPlatform, "EnforcedPause");
    });
  });
});