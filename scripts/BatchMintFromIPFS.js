// c:\Users\Carti\Desktop\ETH\Bsc\6 Semester\DeFi\defi_trading_platform\scripts\perfectBatchMintFromIPFS.js
const hre = require("hardhat");
// Note: Node.js v18+ has global fetch. If your environment supports it, you might not need 'node-fetch'.
const fetch = require("node-fetch"); // Or use global fetch if available and preferred
const fs = require('fs');
const path = require("path");

// --- Script Configuration ---

// REQUIRED: Address of your deployed PokemonCard contract.
let POKEMON_CARD_CONTRACT_ADDRESS; // This will be loaded from deployedAddresses.json

// REQUIRED: The IPFS CID of the DIRECTORY containing all your JSON metadata files (1.json, 2.json, ...).
const IPFS_BASE_DIRECTORY_CID = "bafybeib3a5is3s42srpxived3bdh7y3vwu6lozo6w7htjedcflnem4c2bu";

// The highest file number for your metadata (e.g., if you have 1.json to 100.json, this should be 100).
// The script will determine the starting file number based on the contract's totalSupply.
const END_FILE_NUMBER = 100; // Adjust if you have fewer or more than 100 files.

// Address to mint the NFTs to. Defaults to the first signer (deployer).
// Set this if you want to mint to a different address.
let RECIPIENT_ADDRESS; // Example: "0x0987654321098765432109876543210987654321"

// IPFS Gateway to fetch the JSON metadata.
const IPFS_GATEWAY = "https://ipfs.io/ipfs/"; // Common public gateway. Consider using a dedicated one for reliability.
// Other options: "https://gateway.pinata.cloud/ipfs/", "https://cloudflare-ipfs.com/ipfs/"

// --- Logging Prefixes ---
const LOG_PREFIXES = {
    INFO: "ℹ️ [INFO]",
    SUCCESS: "✅ [SUCCESS]",
    ERROR: "❌ [ERROR]",
    WARN: "⚠️ [WARN]",
    ACTION: "➡️ [ACTION]",
    FETCH: "📡 [FETCH]",
    MINT: "✨ [MINT]",
    TX: "⏳ [TX]",
    EVENT: "🔔 [EVENT]",
    SETUP: "🛠️ [SETUP]",
    CRITICAL: "🚨 [CRITICAL]"
};

// --- End Script Configuration ---

/**
 * Extracts a specific attribute value from the "attributes" array of the metadata.
 * @param {Array} attributes - The attributes array from the metadata (e.g., from 1.json).
 * @param {string} traitType - The trait_type to look for (e.g., "HP", "Attack"). Case-insensitive.
 * @param {any} defaultValue - The value to return if the trait is not found or value is not appropriate.
 * @param {boolean} isStringValue - Set to true if the expected value is a string (like for Types).
 * @returns {any} The value of the trait or the defaultValue.
 */
function getAttributeValue(attributes, traitType, defaultValue = 0, isStringValue = false) {
    if (!attributes || !Array.isArray(attributes)) {
        return defaultValue;
    }
    const trait = attributes.find(attr => attr.trait_type && attr.trait_type.toLowerCase() === traitType.toLowerCase());
    if (trait && trait.value !== undefined) {
        if (isStringValue) { // If we expect a string, return as is.
            return trait.value.toString(); // Ensure it's a string
        }
        // For numeric values
        const numericValue = parseInt(trait.value);
        if (!isNaN(numericValue)) {
            return numericValue;
        } else {
            console.warn(`${LOG_PREFIXES.WARN} Value for trait '${traitType}' is not a number: '${trait.value}'. Returning default.`);
            return defaultValue;
        }
    }
    return defaultValue;
}


async function main() {
    console.log(`\n🌟 ${LOG_PREFIXES.INFO} Starting Perfect Batch Pokémon Minting Script (from IPFS Directory) 🌟`);

    const [deployer] = await hre.ethers.getSigners(); // Get the first signer (deployer) from Hardhat
    RECIPIENT_ADDRESS = RECIPIENT_ADDRESS || deployer.address;

    // --- Load Contract Address from deployedAddresses.json ---
    const deployedAddressesPath = path.join(__dirname, "..", "wagmi-project", "src", "contracts", "deployedAddresses.json");
    try {
        if (fs.existsSync(deployedAddressesPath)) {
            const addressesJson = fs.readFileSync(deployedAddressesPath, 'utf8');
            const deployedAddresses = JSON.parse(addressesJson);
            const chainId = hre.network.config.chainId.toString();

            if (deployedAddresses[chainId] && deployedAddresses[chainId].pokemonCardAddress) {
                POKEMON_CARD_CONTRACT_ADDRESS = deployedAddresses[chainId].pokemonCardAddress;
                console.log(`${LOG_PREFIXES.SUCCESS} Loaded PokemonCard address for network ${chainId} (${deployedAddresses[chainId].name || 'Unknown Network'}): ${POKEMON_CARD_CONTRACT_ADDRESS}`);
            } else {
                console.error(`${LOG_PREFIXES.ERROR} PokemonCard address not found for network ID ${chainId} in ${deployedAddressesPath}.`);
                console.error(`${LOG_PREFIXES.INFO} Please ensure 'deploy.js' has been run for this network and the address is present.`);
                process.exit(1);
            }
        } else {
            console.error(`${LOG_PREFIXES.ERROR} ${deployedAddressesPath} not found.`);
            console.error(`${LOG_PREFIXES.INFO} Please run the 'deploy.js' script first to generate this file.`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`${LOG_PREFIXES.ERROR} Failed to load or parse ${deployedAddressesPath}:`, error);
        process.exit(1);
    }
    // --- End Load Contract Address ---

    if (!IPFS_BASE_DIRECTORY_CID) {
        console.error(`${LOG_PREFIXES.CRITICAL} IPFS_BASE_DIRECTORY_CID is not set. Please update it in the script.`);
        process.exit(1);
    }


    console.log(`${LOG_PREFIXES.SETUP} Contract Address: ${POKEMON_CARD_CONTRACT_ADDRESS}`);
    console.log(`${LOG_PREFIXES.SETUP} Recipient Address: ${RECIPIENT_ADDRESS}`);
    console.log(`${LOG_PREFIXES.SETUP} IPFS Directory CID: ${IPFS_BASE_DIRECTORY_CID}`);
    console.log(`${LOG_PREFIXES.SETUP} IPFS Gateway: ${IPFS_GATEWAY}`);

    const PokemonCardFactory = await hre.ethers.getContractFactory("PokemonCard");
    const pokemonCard = PokemonCardFactory.attach(POKEMON_CARD_CONTRACT_ADDRESS);

    // Determine the starting file number by asking the contract for the next token ID
    const nextTokenIdFromContract = await pokemonCard.getNextTokenId(); // Call the new getter
    const firstFileNumberToProcess = Number(nextTokenIdFromContract); // Convert BigInt from contract to Number for loop

    console.log(`${LOG_PREFIXES.INFO} Next Token ID from contract (via getNextTokenId): ${nextTokenIdFromContract.toString()}`);
    console.log(`${LOG_PREFIXES.INFO} Will attempt to mint metadata file: ${firstFileNumberToProcess}.json (expecting tokenId ${firstFileNumberToProcess}) and continue up to ${END_FILE_NUMBER}.json`);
    console.log("----------------------------------------------------\n");

    if (firstFileNumberToProcess > END_FILE_NUMBER) {
        console.log(`${LOG_PREFIXES.SUCCESS} All available Pokémon metadata (up to END_FILE_NUMBER) seems to be minted according to getNextTokenId.`);
        console.log(`${LOG_PREFIXES.INFO} If you added more metadata files, ensure END_FILE_NUMBER is updated.`);
        process.exit(0);
    }


    for (let currentFileNumber = firstFileNumberToProcess; currentFileNumber <= END_FILE_NUMBER; currentFileNumber++) {
        const jsonFileName = `${currentFileNumber}.json`;
        const metadataUrl = `${IPFS_GATEWAY}${IPFS_BASE_DIRECTORY_CID}/${jsonFileName}`;
        // This is the URI that will be stored on-chain by _setTokenURI
        const tokenUriForContract = `ipfs://${IPFS_BASE_DIRECTORY_CID}/${jsonFileName}`;

        console.log(`${LOG_PREFIXES.ACTION} Processing File: ${jsonFileName}`);
        console.log(`   ${LOG_PREFIXES.FETCH} Fetching metadata from: ${metadataUrl}`);

        let name, hp, attack, defense, speed, type1, type2, special;

        try {
            const response = await fetch(metadataUrl, { timeout: 20000 }); // 20-second timeout for IPFS fetch
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status} (${response.statusText}) when fetching ${metadataUrl}`);
            }
            const metadata = await response.json();
            const attrs = metadata.attributes;

            // Extract data based on the structure of 1.json
            name = metadata.name;
            hp = getAttributeValue(attrs, "hp");
            attack = getAttributeValue(attrs, "attack");
            defense = getAttributeValue(attrs, "defense");
            speed = getAttributeValue(attrs, "speed");
            // New attributes from your PokemonCard.sol struct
            type1 = getAttributeValue(attrs, "type 1", "", true); // Expect string, default empty
            type2 = getAttributeValue(attrs, "type 2", "", true); // Expect string, default empty
            special = getAttributeValue(attrs, "special");


            if (!name) {
                throw new Error(`'name' attribute not found or is empty in metadata for ${jsonFileName}.`);
            }

            console.log(`   ${LOG_PREFIXES.SUCCESS} Fetched Stats: Name: ${name}, HP: ${hp}, Atk: ${attack}, Def: ${defense}, Spd: ${speed}, Type1: '${type1}', Type2: '${type2}', Special: ${special}`);

        } catch (error) {
            console.error(`   ${LOG_PREFIXES.ERROR} Error fetching or parsing metadata for ${jsonFileName}: ${error.message}`);
            console.warn(`   ${LOG_PREFIXES.WARN} Skipping minting for ${jsonFileName} due to this error.`);
            console.log("----------------------------------------------------");
            continue; // Skip to the next Pokémon in the loop
        }

        console.log(`   ${LOG_PREFIXES.MINT} Attempting to mint '${name}' (from ${jsonFileName})...`);
        console.log(`      ${LOG_PREFIXES.INFO} Token URI to be stored: ${tokenUriForContract}`);

        try {
            const tx = await pokemonCard.safeMint(
                RECIPIENT_ADDRESS,
                tokenUriForContract,
                name,
                hp,
                // DEFAULT_POKEMON_LEVEL, // Removed as per contract change
                attack,
                defense,
                speed,
                type1,
                type2,
                special
            );
            console.log(`      ${LOG_PREFIXES.TX} Transaction sent: ${tx.hash}. Waiting for confirmation...`);
            const receipt = await tx.wait(); // Wait for 1 confirmation by default
            const gasUsed = receipt.gasUsed;
            let mintedTokenId = "N/A (Event not found or parsed)";
            // Attempt to parse the PokemonMinted event to get the tokenId
            const event = receipt.logs?.find(log => {
                try {
                    // Ensure the log address matches the contract address to avoid parsing unrelated events
                    if (log.address.toLowerCase() !== POKEMON_CARD_CONTRACT_ADDRESS.toLowerCase()) return false;
                    return pokemonCard.interface.parseLog(log)?.name === "PokemonMinted";
                } catch (e) { return false; }
            });
            if (event && event.args && event.args.tokenId !== undefined) {
                mintedTokenId = event.args.tokenId.toString();
            }

            if (mintedTokenId === currentFileNumber.toString()) {
                console.log(`   ${LOG_PREFIXES.SUCCESS} Successfully minted '${name}'! Token ID: ${mintedTokenId} (Matches expected metadata file number). Gas Used: ${gasUsed.toString()}`);
            } else {
                // Critical Mismatch: Throw an error to stop the script.
                const errorMessage = `CRITICAL MISMATCH: Minted Token ID '${mintedTokenId}' does not match the expected metadata file number '${currentFileNumber}' for Pokémon '${name}'. Halting script.`;
                console.error(`   ${LOG_PREFIXES.CRITICAL} ${errorMessage}`);
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error(`   ${LOG_PREFIXES.ERROR} Failed to mint '${name}' (from ${jsonFileName}):`);
            const reason = error.reason || (error.data ? error.data.message : null) || error.message;
            console.error(`      ${LOG_PREFIXES.ERROR} Reason: ${reason || "Unknown error"}`);
        }
        console.log("----------------------------------------------------");
    }

    console.log(`\n🎉🎉🎉 ${LOG_PREFIXES.SUCCESS} Batch minting process complete! 🎉🎉🎉`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`\n${LOG_PREFIXES.CRITICAL} Unhandled critical error in script execution:`);
        console.error(error);
        process.exit(1);
    });
