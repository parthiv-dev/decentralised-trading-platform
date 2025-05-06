const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonCard", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployPokemonCardFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const PokemonCard = await ethers.getContractFactory("PokemonCard");
    const pokemonCard = await PokemonCard.deploy(owner.address);
    await pokemonCard.waitForDeployment(); // Wait for deployment transaction

    return { pokemonCard, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      expect(await pokemonCard.owner()).to.equal(owner.address);
    });

    it("Should have the correct name and symbol", async function () {
      const { pokemonCard } = await loadFixture(deployPokemonCardFixture);
      expect(await pokemonCard.name()).to.equal("PokemonCard");
      expect(await pokemonCard.symbol()).to.equal("PKMN");
    });
  });

  describe("Minting", function () {
    it("Should allow the owner to mint a token", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 0;
      const tokenURI = "ipfs://somehash/0.json";

      await expect(pokemonCard.safeMint(otherAccount.address, tokenURI))
        .to.emit(pokemonCard, "Transfer")
        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId); // Minting emits Transfer from address 0

      expect(await pokemonCard.ownerOf(tokenId)).to.equal(otherAccount.address);
      expect(await pokemonCard.tokenURI(tokenId)).to.equal(tokenURI);
      expect(await pokemonCard.balanceOf(otherAccount.address)).to.equal(1);
    });

    it("Should not allow non-authorized non-owners to mint a token", async function () {
      const { pokemonCard, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenURI = "ipfs://somehash/1.json";

      await expect(
        pokemonCard.connect(otherAccount).safeMint(otherAccount.address, tokenURI)
      ).to.be.revertedWith("User not authorized");
    });

     it("Should increment token IDs", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const uri1 = "uri1";
      const uri2 = "uri2";

      await pokemonCard.safeMint(otherAccount.address, uri1); // Mints tokenId 0
      await pokemonCard.safeMint(otherAccount.address, uri2); // Mints tokenId 1

      expect(await pokemonCard.ownerOf(0)).to.equal(otherAccount.address);
      expect(await pokemonCard.ownerOf(1)).to.equal(otherAccount.address);
      expect(await pokemonCard.tokenURI(1)).to.equal(uri2);
    });
  });

  describe("Pausing", function () {
    it("Should allow the owner to pause and unpause", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);

      await expect(pokemonCard.pause())
        .to.emit(pokemonCard, "Paused")
        .withArgs(owner.address);
      expect(await pokemonCard.paused()).to.equal(true);

      await expect(pokemonCard.unpause())
        .to.emit(pokemonCard, "Unpaused")
        .withArgs(owner.address);
      expect(await pokemonCard.paused()).to.equal(false);
    });

    it("Should prevent transfers when paused", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 0;
      const tokenURI = "ipfs://somehash/0.json";
      await pokemonCard.safeMint(owner.address, tokenURI); // Mint to owner first

      await pokemonCard.pause(); // Pause the contract

      await expect(
        pokemonCard.transferFrom(owner.address, otherAccount.address, tokenId)
      ).to.be.revertedWithCustomError(pokemonCard, "EnforcedPause");

      // Also test safeMint when paused
      await expect(
        pokemonCard.safeMint(otherAccount.address, "uri2")
      ).to.be.revertedWithCustomError(pokemonCard, "EnforcedPause");
    });
  });

  describe("Minter Management", function () {
    it("Should allow the owner to set and unset a minter", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);

      // Set minter
      await expect(pokemonCard.setMinterTrue(otherAccount.address))
        .to.emit(pokemonCard, "MinterSetTrue")
        .withArgs(otherAccount.address);
      expect(await pokemonCard._minters(otherAccount.address)).to.equal(true);

      // Unset minter
      await expect(pokemonCard.setMinterFalse(otherAccount.address))
        .to.emit(pokemonCard, "MinterSetFalse")
        .withArgs(otherAccount.address);
      expect(await pokemonCard._minters(otherAccount.address)).to.equal(false);
    });

    it("Should not allow non-owners to set or unset minters", async function () {
      const { pokemonCard, otherAccount, owner } = await loadFixture(deployPokemonCardFixture);

      await expect(
        pokemonCard.connect(otherAccount).setMinterTrue(owner.address)
      ).to.be.revertedWithCustomError(pokemonCard, "OwnableUnauthorizedAccount")
       .withArgs(otherAccount.address);

      await expect(
        pokemonCard.connect(otherAccount).setMinterFalse(owner.address)
      ).to.be.revertedWithCustomError(pokemonCard, "OwnableUnauthorizedAccount")
       .withArgs(otherAccount.address);
    });
  });

  describe("Authorized Minting", function () {
    it("Should allow an authorized minter to mint a token", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 0;
      const tokenURI = "ipfs://authorizedmint.json";

      // Owner sets otherAccount as a minter
      await pokemonCard.setMinterTrue(otherAccount.address);

      // otherAccount (now a minter) mints a token
      await expect(pokemonCard.connect(otherAccount).safeMint(otherAccount.address, tokenURI))
        .to.emit(pokemonCard, "Transfer")
        .withArgs(ethers.ZeroAddress, otherAccount.address, tokenId)
        .to.emit(pokemonCard, "PokemonMinted")
        .withArgs(otherAccount.address, tokenId);

      expect(await pokemonCard.ownerOf(tokenId)).to.equal(otherAccount.address);
      expect(await pokemonCard.tokenURI(tokenId)).to.equal(tokenURI);
      expect(await pokemonCard.balanceOf(otherAccount.address)).to.equal(1);
    });

    it("Should emit PokemonMinted event with correct minter address", async function () {
        const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
        const tokenURI = "ipfs://eventtest.json";

        // Owner mints
        await expect(pokemonCard.safeMint(owner.address, tokenURI))
            .to.emit(pokemonCard, "PokemonMinted")
            .withArgs(owner.address, 0); // tokenId 0

        // Authorized minter mints
        await pokemonCard.setMinterTrue(otherAccount.address);
        await expect(pokemonCard.connect(otherAccount).safeMint(otherAccount.address, tokenURI + "2"))
            .to.emit(pokemonCard, "PokemonMinted")
            .withArgs(otherAccount.address, 1); // tokenId 1
    });
  });

  describe("Pokemon Data", function () {
    it("Should store and retrieve Pokemon data correctly after minting", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      const toAddress = owner.address;
      const tokenURI = "ipfs://pokemondata.json";
      const expectedTokenId = 0;

      await pokemonCard.safeMint(toAddress, tokenURI);

      const pokemonData = await pokemonCard.getPokemon(expectedTokenId);

      expect(pokemonData.tokenId).to.equal(expectedTokenId);
      expect(pokemonData.hp).to.equal(100);
      expect(pokemonData.name).to.equal("PokemonName");
      expect(pokemonData.level).to.equal(1);
      expect(pokemonData.attack).to.equal(25);
      expect(pokemonData.defense).to.equal(78);
      expect(pokemonData.speed).to.equal(100);
      expect(pokemonData.imageURI).to.equal(""); // As per current contract logic

      // Also verify the standard tokenURI
      expect(await pokemonCard.tokenURI(expectedTokenId)).to.equal(tokenURI);
    });

    it("Should revert when trying to get data for a non-existent token", async function () {
      const { pokemonCard } = await loadFixture(deployPokemonCardFixture);
      const nonExistentTokenId = 999;

      // Test with totalSupply = 0
      await expect(pokemonCard.getPokemon(0))
        .to.be.revertedWith("Token does not exist");

      // Mint one token (ID 0), so totalSupply = 1
      await pokemonCard.safeMint(ethers.Wallet.createRandom().address, "uri");
      await expect(pokemonCard.getPokemon(nonExistentTokenId))
        .to.be.revertedWith("Token does not exist"); // 999 is not < 1
    });
  });

  // TODO: Add tests for Burning, URI Storage, Enumeration, etc.
});