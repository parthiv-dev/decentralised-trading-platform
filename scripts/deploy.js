// scripts/deploy.js
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();  // Get the first signer (deployer) from Hardhat

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

  // --- Storing addresses to JSON ---
  // Adjust the path to point to your frontend's contract configuration directory
  const contractsDir = path.join(__dirname, "..", "wagmi-project", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const deployedAddressesPath = path.join(contractsDir, "deployedAddresses.json");
  let existingAddresses = {};
  if (fs.existsSync(deployedAddressesPath)) {
    try {
      existingAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
    } catch (e) {
      console.error("Failed to parse existing deployedAddresses.json, will overwrite.", e);
      existingAddresses = {}; // Start fresh if parsing fails
    }
  }

  const chainId = hre.network.config.chainId.toString();

  existingAddresses[chainId] = {
    name: hre.network.name === 'hardhat' ? 'Localhost (Hardhat)' : hre.network.name, // Simplified naming
    pokemonCardAddress: pokemonCardAddress,
    tradingPlatformAddress: tradingPlatformAddress,
  };

  fs.writeFileSync(deployedAddressesPath, JSON.stringify(existingAddresses, null, 2));

  console.log(`\nDeployment complete! Contract addresses saved to ${deployedAddressesPath}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});