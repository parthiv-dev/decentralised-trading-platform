// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // 1. Deploy PokemonCard contract
  console.log("\nDeploying PokemonCard...");
  const PokemonCard = await hre.ethers.getContractFactory("PokemonCard");
  // Pass the deployer's address as the initial owner for PokemonCard
  const pokemonCard = await PokemonCard.deploy(deployer.address);
  await pokemonCard.waitForDeployment();
  const pokemonCardAddress = await pokemonCard.getAddress();
  console.log(`PokemonCard deployed to: ${pokemonCardAddress}`);

  // 2. Deploy TradingPlatform contract
  console.log("\nDeploying TradingPlatform...");
  const TradingPlatform = await hre.ethers.getContractFactory("TradingPlatform");
  // Pass the deployed PokemonCard address and the deployer's address as the initial owner
  const tradingPlatform = await TradingPlatform.deploy(pokemonCardAddress, deployer.address);
  await tradingPlatform.waitForDeployment();
  const tradingPlatformAddress = await tradingPlatform.getAddress();
  console.log(`TradingPlatform deployed to: ${tradingPlatformAddress}`);

  console.log("\nDeployment complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});