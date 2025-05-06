require("@nomicfoundation/hardhat-toolbox");
// Load environment variables from .env file
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || ""; // Get RPC URL from .env
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""; // Get Private Key from .env
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""; // Get Private Key from .env

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28", // Make sure this matches your pragma solidity line exactly!
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 // Standard default, adjust if needed
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL, // Use the variable holding the full URL
      // Ensure the private key is loaded and prefixed with 0x if needed
      accounts: PRIVATE_KEY !== "" ? [`0x${PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY.substring(2) : PRIVATE_KEY}`] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
       apiKey: ETHERSCAN_API_KEY,
     },
};
