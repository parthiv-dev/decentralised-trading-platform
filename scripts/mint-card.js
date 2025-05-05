// scripts/mint-item.js
async function main() {{
    const [owner, player] = await ethers.getSigners();
    const PokemonCard = await ethers.getContractFactory("PokemonCard");
    // If you already deployed, use `.attach("0xDeployedAddress")` instead of `.deploy()`
    const pokemonCard = await PokemonCard.deploy(owner.address);  
    // await pokemonCard.deployed();
  
    console.log("Minting for", player.address);
    const tx = await pokemonCard.safeMint(
      player.address,
      "https://game.example/item-id-8u5h2m.json"
    );
    await tx.wait();
    console.log("Mint complete at:", pokemonCard.address);
  }}
  
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
  