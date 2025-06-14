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

  // Default parameters for minting, to keep tests DRY
  const defaultMintValues = {
    name: "PikaTest",
    hp: 35,
    attack: 55,
    defense: 40,
    speed: 90,
    type1: "Electric",
    type2: "", // Can be empty
    special: 50,
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
      const expectedTokenId = 1; // First token ID is 1
      const tokenURI = "ipfs://somehash/0.json";

      await expect(pokemonCard.safeMint(
        otherAccount.address,
        tokenURI,
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special
      ))
        .to.emit(pokemonCard, "Transfer")
        .withArgs(ethers.ZeroAddress, otherAccount.address, expectedTokenId)
        .to.emit(pokemonCard, "PokemonMinted")
        .withArgs(owner.address, expectedTokenId);

      expect(await pokemonCard.ownerOf(expectedTokenId)).to.equal(otherAccount.address);
      expect(await pokemonCard.tokenURI(expectedTokenId)).to.equal(tokenURI);
      expect(await pokemonCard.balanceOf(otherAccount.address)).to.equal(1);
    });

    it("Should fail to mint if on-chain metadata is identical to an existing token", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      const tokenURI = "ipfs://somehash/0.json";

      // Mint first token
      await pokemonCard.safeMint(
        owner.address,
        tokenURI,
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special
      );

      // Attempt to mint second token with identical on-chain metadata
      await expect(
        pokemonCard.safeMint(
          owner.address,
          "ipfs://anotheruri.json", // Different URI is fine
          defaultMintValues.name, // Identical name
          defaultMintValues.hp, // Identical hp
          defaultMintValues.attack, // Identical attack
          defaultMintValues.defense, // Identical defense
          defaultMintValues.speed, // Identical speed
          defaultMintValues.type1, // Identical type1
          defaultMintValues.type2, // Identical type2
          defaultMintValues.special // Identical special
        )
      ).to.be.revertedWith("PokemonCard: This exact set of on-chain metadata has already been minted.");
    });

    it("Should allow minting if on-chain metadata is slightly different", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      await pokemonCard.safeMint(owner.address, "uri1", ...Object.values(defaultMintValues));
      // Mint second token with slightly different HP
      const slightlyDifferentValues = { ...defaultMintValues, hp: defaultMintValues.hp + 1 };
      await expect(pokemonCard.safeMint(owner.address, "uri2", ...Object.values(slightlyDifferentValues)))
        .to.emit(pokemonCard, "Transfer"); // Should succeed
    });

    it("Should not allow non-authorized non-owners to mint a token", async function () {
      const { pokemonCard, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenURI = "ipfs://somehash/1.json";
      const recipient = otherAccount.address;

      await expect(
        pokemonCard.connect(otherAccount).safeMint(
          recipient,
          tokenURI,
          defaultMintValues.name,
          defaultMintValues.hp,
          defaultMintValues.attack,
          defaultMintValues.defense,
          defaultMintValues.speed,
          defaultMintValues.type1,
          defaultMintValues.type2,
          defaultMintValues.special
        )
      ).to.be.revertedWith("User not authorized");
    });

     it("Should increment token IDs", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const uri1 = "uri1";
      const uri2 = "uri2";
      const recipient = otherAccount.address;

      // Mint first token (ID 1)
      await pokemonCard.safeMint(
        recipient,
        uri1,
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special
      );

      // Mint second token (ID 2)
      await pokemonCard.safeMint(
        recipient,
        uri2,
        "AnotherPoke",
        defaultMintValues.hp + 10,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special
      );

      expect(await pokemonCard.ownerOf(1)).to.equal(recipient);
      expect(await pokemonCard.tokenURI(1)).to.equal(uri1);
      expect(await pokemonCard.ownerOf(2)).to.equal(recipient);
      expect(await pokemonCard.tokenURI(2)).to.equal(uri2);
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
      const expectedTokenId = 1;
      const tokenURI = "ipfs://somehash/0.json";
      await pokemonCard.safeMint( // Mint to owner first
        owner.address,
        tokenURI,
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special
      );

      await pokemonCard.pause(); // Pause the contract

      await expect(
        pokemonCard.transferFrom(owner.address, otherAccount.address, expectedTokenId)
      ).to.be.revertedWithCustomError(pokemonCard, "EnforcedPause");

      // Also test safeMint when paused
      await expect(
        pokemonCard.safeMint(
          otherAccount.address,
          "uri2",
          `${defaultMintValues.name}Paused`, // Ensure unique metadata
          defaultMintValues.hp + 1,         // Ensure unique metadata
          defaultMintValues.attack,
          defaultMintValues.defense,
          defaultMintValues.speed,
          defaultMintValues.type1,
          defaultMintValues.type2,
          defaultMintValues.special
        ) // This mint is expected to fail due to pause, not metadata
      ).to.be.revertedWithCustomError(pokemonCard, "EnforcedPause");
    });

    it("Should prevent burn when paused, while approve and setApprovalForAll remain operational", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 1;
      await pokemonCard.safeMint(owner.address, "uri", ...Object.values(defaultMintValues));

      await pokemonCard.pause();
      expect(await pokemonCard.paused(), "Contract should be paused before testing pausable functions").to.be.true;

      // Approve and setApprovalForAll are NOT pausable by default in ERC721Pausable
      // as they don't go through the _update hook. They should succeed.
      await expect(pokemonCard.approve(otherAccount.address, tokenId)).to.not.be.reverted;
      // Verify approval took place
      expect(await pokemonCard.getApproved(tokenId)).to.equal(otherAccount.address);

      await expect(pokemonCard.setApprovalForAll(otherAccount.address, true)).to.not.be.reverted;
      expect(await pokemonCard.isApprovedForAll(owner.address, otherAccount.address)).to.be.true;

      await expect(pokemonCard.burn(tokenId))
        .to.be.revertedWithCustomError(pokemonCard, "EnforcedPause");
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
      const expectedTokenId = 1;
      const tokenURI = "ipfs://authorizedmint.json";
      const recipient = otherAccount.address;

      // Owner sets otherAccount as a minter
      await pokemonCard.setMinterTrue(otherAccount.address);

      // otherAccount (now a minter) mints a token
      await expect(pokemonCard.connect(otherAccount).safeMint(
        recipient,
        tokenURI,
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special
      ))
        .to.emit(pokemonCard, "Transfer")
        .withArgs(ethers.ZeroAddress, recipient, expectedTokenId)
        .to.emit(pokemonCard, "PokemonMinted")
        .withArgs(otherAccount.address, expectedTokenId);

      expect(await pokemonCard.ownerOf(expectedTokenId)).to.equal(recipient);
      expect(await pokemonCard.tokenURI(expectedTokenId)).to.equal(tokenURI);
      expect(await pokemonCard.balanceOf(recipient)).to.equal(1);
    });

    it("Should emit PokemonMinted event with correct minter address", async function () {
        const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
        const tokenURI = "ipfs://eventtest.json";
        const recipient = owner.address;

        // Owner mints
        await expect(pokemonCard.safeMint(
            recipient,
            tokenURI,
            defaultMintValues.name,
            defaultMintValues.hp,
            defaultMintValues.attack,
            defaultMintValues.defense,
            defaultMintValues.speed,
            defaultMintValues.type1,
            defaultMintValues.type2,
            defaultMintValues.special
        ))
            .to.emit(pokemonCard, "PokemonMinted")
            .withArgs(owner.address, 1); // tokenId 1

        // Authorized minter mints
        await pokemonCard.setMinterTrue(otherAccount.address);
        await expect(pokemonCard.connect(otherAccount).safeMint(
            otherAccount.address,
            tokenURI + "2",
            "AnotherPoke",
            defaultMintValues.hp,
            defaultMintValues.attack,
            defaultMintValues.defense,
            defaultMintValues.speed,
            defaultMintValues.type1,
            defaultMintValues.type2,
            defaultMintValues.special
        ))
            .to.emit(pokemonCard, "PokemonMinted")
            .withArgs(otherAccount.address, 2); // tokenId 2
    });
  });

  describe("Pokemon Data", function () {
    it("Should store and retrieve Pokemon data correctly after minting", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      const toAddress = owner.address;
      const tokenURI = "ipfs://pokemondata.json";
      const expectedTokenId = 1;
      const mintValues = {
        name: "CharTest",
        hp: 78,
        attack: 84,
        defense: 78,
        speed: 100,
        type1: "Fire",
        type2: "Flying",
        special: 109,
      };

      await pokemonCard.safeMint(
        toAddress,
        tokenURI,
        mintValues.name,
        mintValues.hp,
        mintValues.attack,
        mintValues.defense,
        mintValues.speed,
        mintValues.type1,
        mintValues.type2,
        mintValues.special
      );

      const pokemonData = await pokemonCard.getPokemon(expectedTokenId);

      expect(pokemonData.name).to.equal(mintValues.name);
      expect(pokemonData.hp).to.equal(mintValues.hp);
      expect(pokemonData.attack).to.equal(mintValues.attack);
      expect(pokemonData.defense).to.equal(mintValues.defense);
      expect(pokemonData.speed).to.equal(mintValues.speed);
      expect(pokemonData.type1).to.equal(mintValues.type1);
      expect(pokemonData.type2).to.equal(mintValues.type2);
      expect(pokemonData.special).to.equal(mintValues.special);

      // Also verify the standard tokenURI
      expect(await pokemonCard.tokenURI(expectedTokenId)).to.equal(tokenURI);
    });

    it("Should revert when trying to get data for a non-existent token", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      const nonExistentTokenId = 999;
      const revertMsg = "PokemonCard: Query for nonexistent token ID.";

      // No tokens minted yet, _nextTokenId is 0.
      // getPokemon(0) passes modifier (0 <= 0) but returns default struct.
      // getPokemon(1) should revert (1 <= 0 is false).
      await expect(pokemonCard.getPokemon(1)).to.be.revertedWith(revertMsg);

      // Mint one token (ID 1), _nextTokenId becomes 1.
      await pokemonCard.safeMint(
        owner.address,
        "uri",
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special
      );

      // getPokemon(0) still passes modifier (0 <= 1) and returns default struct.
      // getPokemon(2) should revert (2 <= 1 is false).
      await expect(pokemonCard.getPokemon(2)).to.be.revertedWith(revertMsg);
      await expect(pokemonCard.getPokemon(nonExistentTokenId))
        .to.be.revertedWith(revertMsg);
    });
  });

  describe("Burning", function () {
    it("Should allow an owner to burn their token", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 1;
      await pokemonCard.safeMint(owner.address, "uri", ...Object.values(defaultMintValues));

      await expect(pokemonCard.burn(tokenId))
        .to.emit(pokemonCard, "Transfer")
        .withArgs(owner.address, ethers.ZeroAddress, tokenId);
      expect(await pokemonCard.balanceOf(owner.address)).to.equal(0);
      await expect(pokemonCard.ownerOf(tokenId)).to.be.revertedWithCustomError(pokemonCard, "ERC721NonexistentToken").withArgs(tokenId);
    });

    it("Should allow an approved address to burn a token", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 1;
      await pokemonCard.safeMint(owner.address, "uri", ...Object.values(defaultMintValues));
      await pokemonCard.connect(owner).approve(otherAccount.address, tokenId);

      await expect(pokemonCard.connect(otherAccount).burn(tokenId))
        .to.emit(pokemonCard, "Transfer")
        .withArgs(owner.address, ethers.ZeroAddress, tokenId);
      expect(await pokemonCard.balanceOf(owner.address)).to.equal(0);
    });

    it("Should not allow a non-owner/non-approved address to burn a token", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 1;
      await pokemonCard.safeMint(owner.address, "uri", ...Object.values(defaultMintValues));

      await expect(pokemonCard.connect(otherAccount).burn(tokenId))
        .to.be.revertedWithCustomError(pokemonCard, "ERC721InsufficientApproval");
    });

    it("Should revert when trying to burn a non-existent token", async function () {
      const { pokemonCard } = await loadFixture(deployPokemonCardFixture);
      const nonExistentTokenId = 999;
      await expect(pokemonCard.burn(nonExistentTokenId))
        .to.be.revertedWithCustomError(pokemonCard, "ERC721NonexistentToken").withArgs(nonExistentTokenId);
    });

    it("Should prevent re-minting with identical on-chain metadata even after the original token is burned", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 1;
      // Mint and burn the first token
      await pokemonCard.safeMint(owner.address, "uri1", ...Object.values(defaultMintValues));
      await pokemonCard.burn(tokenId);

      // Attempt to mint a new token with the same metadata
      await expect(pokemonCard.safeMint(owner.address, "uri2", ...Object.values(defaultMintValues)))
        .to.be.revertedWith("PokemonCard: This exact set of on-chain metadata has already been minted.");
    });

    // Add more burn tests: approved can burn, non-owner cannot, etc.
  });

  describe("URI Storage", function () {
    it("tokenURI should return correct URI for existing token", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);
      const tokenId = 1;
      const customURI = "ipfs://customURI.json";
      await pokemonCard.safeMint(owner.address, customURI, ...Object.values(defaultMintValues));
      expect(await pokemonCard.tokenURI(tokenId)).to.equal(customURI);
    });

    it("tokenURI should revert for non-existent token", async function () {
      const { pokemonCard } = await loadFixture(deployPokemonCardFixture);
      await expect(pokemonCard.tokenURI(1)).to.be.revertedWithCustomError(pokemonCard, "ERC721NonexistentToken").withArgs(1);
    });
  });

  describe("Enumeration", function () {
    it("totalSupply should reflect minted and burned tokens", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      expect(await pokemonCard.totalSupply()).to.equal(0);

      // Mint token 1
      await pokemonCard.safeMint(owner.address, "uri1",
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special);
      expect(await pokemonCard.totalSupply()).to.equal(1);

      // Mint token 2 with unique metadata
      await pokemonCard.safeMint(otherAccount.address, "uri2",
        `${defaultMintValues.name}Two`, // Unique name
        defaultMintValues.hp + 1,       // Unique HP
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special);
      expect(await pokemonCard.totalSupply()).to.equal(2);

      await pokemonCard.burn(1); // Burn token 1
      expect(await pokemonCard.totalSupply()).to.equal(1);
    });

    it("tokenOfOwnerByIndex and tokenByIndex should work correctly", async function () {
      const { pokemonCard, owner, otherAccount } = await loadFixture(deployPokemonCardFixture);
      // Mint token 1 (ID 1) for owner
      await pokemonCard.safeMint(owner.address, "uriO1",
        defaultMintValues.name,
        defaultMintValues.hp,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special);

      // Mint token 2 (ID 2) for otherAccount with unique metadata
      await pokemonCard.safeMint(otherAccount.address, "uriA1",
        `${defaultMintValues.name}Two`,
        defaultMintValues.hp + 1,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special);

      // Mint token 3 (ID 3) for owner with unique metadata
      await pokemonCard.safeMint(owner.address, "uriO2",
        `${defaultMintValues.name}Three`,
        defaultMintValues.hp + 2,
        defaultMintValues.attack,
        defaultMintValues.defense,
        defaultMintValues.speed,
        defaultMintValues.type1,
        defaultMintValues.type2,
        defaultMintValues.special);

      expect(await pokemonCard.tokenOfOwnerByIndex(owner.address, 0)).to.equal(1);
      expect(await pokemonCard.tokenOfOwnerByIndex(owner.address, 1)).to.equal(3);
      expect(await pokemonCard.tokenOfOwnerByIndex(otherAccount.address, 0)).to.equal(2);

      expect(await pokemonCard.tokenByIndex(0)).to.equal(1);
      expect(await pokemonCard.tokenByIndex(1)).to.equal(2);
      expect(await pokemonCard.tokenByIndex(2)).to.equal(3);

      // Test reverts for out of bounds
      await expect(pokemonCard.tokenOfOwnerByIndex(owner.address, 2)).to.be.revertedWithCustomError(pokemonCard, "ERC721OutOfBoundsIndex");
      await expect(pokemonCard.tokenByIndex(3)).to.be.revertedWithCustomError(pokemonCard, "ERC721OutOfBoundsIndex");
    });
  });

  describe("Next Token ID", function () {
    it("should return correct next token ID", async function () {
      const { pokemonCard, owner } = await loadFixture(deployPokemonCardFixture);

      expect(await pokemonCard.getNextTokenId()).to.equal(1); // Before any mints

      await pokemonCard.safeMint(owner.address, "uri1", ...Object.values(defaultMintValues));
      expect(await pokemonCard.getNextTokenId()).to.equal(2); // After 1 mint

      const uniqueValues = { ...defaultMintValues, name: "PikaTest2" };
      await pokemonCard.safeMint(owner.address, "uri2", ...Object.values(uniqueValues));
      expect(await pokemonCard.getNextTokenId()).to.equal(3); // After 2 mints
    });
  });

  // Correcting a misleading comment in an existing test description
  describe("Pokemon Data", function () {
    // ... existing tests ...
    // The comment in "Should revert when trying to get data for a non-existent token"
    // regarding getPokemon(0) was potentially misleading based on the `pokemonExists` modifier.
    // The test itself is functionally correct.
  });
});