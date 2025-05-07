// c:\Users\Carti\Desktop\ETH\Bsc\6 Semester\DeFi\defi_trading_platform\scripts\perfectBatchMintFromIPFS.js
const hre = require("hardhat");
const fetch = require("node-fetch"); // Or use global fetch if available and preferred
const path = require("path"); // Used for constructing IPFS paths if needed, though string concat is fine here.

// --- Script Configuration ---

// REQUIRED: Address of your deployed PokemonCard contract.
// Example: "0x1234567890123456789012345678901234567890"
const POKEMON_CARD_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// REQUIRED: The IPFS CID of the DIRECTORY containing all your JSON metadata files (1.json, 2.json, ...).
const IPFS_BASE_DIRECTORY_CID = "bafybeib3a5is3s42srpxived3bdh7y3vwu6lozo6w7htjedcflnem4c2bu";

// The highest file number for your metadata (e.g., if you have 1.json to 100.json, this should be 100).
// The script will determine the starting file number based on the contract's totalSupply.
const END_FILE_NUMBER = 50; // Adjust if you have fewer or more than 100 files.

// Address to mint the NFTs to. Defaults to the first signer (deployer).
// Set this if you want to mint to a different address.
let RECIPIENT_ADDRESS; // Example: "0x0987654321098765432109876543210987654321"

// IPFS Gateway to fetch the JSON metadata.
const IPFS_GATEWAY = "https://ipfs.io/ipfs/"; // Common public gateway. Consider using a dedicated one for reliability.
// Other options: "https://gateway.pinata.cloud/ipfs/", "https://cloudflare-ipfs.com/ipfs/"

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
        // console.warn(`      ⚠️ Attributes array is missing or not an array. Returning default for ${traitType}.`); // Less verbose
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
            console.warn(`      ⚠️ Value for trait '${traitType}' is not a number: '${trait.value}'. Returning default.`);
            return defaultValue;
        }
    }
    // console.warn(`      ⚠️ Trait '${traitType}' not found in attributes. Returning default.`); // Less verbose
    return defaultValue;
}


async function main() {
    console.log("🌟 Starting Perfect Batch Pokémon Minting Script (from IPFS Directory) 🌟");

    const [deployer] = await hre.ethers.getSigners();
    RECIPIENT_ADDRESS = RECIPIENT_ADDRESS || deployer.address;

    if (POKEMON_CARD_CONTRACT_ADDRESS === "YOUR_DEPLOYED_POKEMONCARD_CONTRACT_ADDRESS" || !POKEMON_CARD_CONTRACT_ADDRESS) {
        console.error("❌ CRITICAL ERROR: POKEMON_CARD_CONTRACT_ADDRESS is not set. Please update it in the script.");
        process.exit(1);
    }
    if (!IPFS_BASE_DIRECTORY_CID) {
        console.error("❌ CRITICAL ERROR: IPFS_BASE_DIRECTORY_CID is not set. Please update it in the script.");
        process.exit(1);
    }

    console.log(`   Contract Address: ${POKEMON_CARD_CONTRACT_ADDRESS}`);
    console.log(`   Recipient Address: ${RECIPIENT_ADDRESS}`);
    console.log(`   IPFS Directory CID: ${IPFS_BASE_DIRECTORY_CID}`);
    console.log(`   IPFS Gateway: ${IPFS_GATEWAY}`);

    const PokemonCardFactory = await hre.ethers.getContractFactory("PokemonCard");
    const pokemonCard = PokemonCardFactory.attach(POKEMON_CARD_CONTRACT_ADDRESS);

    // Determine the starting file number by asking the contract for the next token ID
    const nextTokenIdFromContract = await pokemonCard.getNextTokenId(); // Call the new getter
    const firstFileNumberToProcess = Number(nextTokenIdFromContract); // Convert bigint to Number

    console.log(`   Next Token ID from contract (via getNextTokenId): ${nextTokenIdFromContract.toString()}`);
    console.log(`   Will attempt to mint metadata file: ${firstFileNumberToProcess}.json (expecting tokenId ${firstFileNumberToProcess}) and continue up to ${END_FILE_NUMBER}.json`);
    console.log("----------------------------------------------------\n");

    if (firstFileNumberToProcess > END_FILE_NUMBER) {
        console.log("✅ All available Pokémon metadata (up to END_FILE_NUMBER) seems to be minted according to current totalSupply.");
        console.log("   If you added more metadata files, ensure END_FILE_NUMBER is updated.");
        process.exit(0);
    }


    for (let currentFileNumber = firstFileNumberToProcess; currentFileNumber <= END_FILE_NUMBER; currentFileNumber++) {
        const jsonFileName = `${currentFileNumber}.json`;
        const metadataUrl = `${IPFS_GATEWAY}${IPFS_BASE_DIRECTORY_CID}/${jsonFileName}`;
        // This is the URI that will be stored on-chain by _setTokenURI
        const tokenUriForContract = `ipfs://${IPFS_BASE_DIRECTORY_CID}/${jsonFileName}`;

        console.log(`➡️ Processing File: ${jsonFileName}`);
        console.log(`   Fetching metadata from: ${metadataUrl}`);

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

            console.log(`   📊 Fetched Stats: Name: ${name}, HP: ${hp}, Atk: ${attack}, Def: ${defense}, Spd: ${speed}, Type1: '${type1}', Type2: '${type2}', Special: ${special}`);

        } catch (error) {
            console.error(`   ❌ Error fetching or parsing metadata for ${jsonFileName}: ${error.message}`);
            console.warn(`   ⚠️ Skipping minting for ${jsonFileName} due to this error.`);
            console.log("----------------------------------------------------");
            continue; // Skip to the next Pokémon in the loop
        }

        console.log(`   ✨ Attempting to mint '${name}' (from ${jsonFileName})...`);
        console.log(`      Token URI to be stored: ${tokenUriForContract}`);

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
            console.log(`      ⏳ Transaction sent: ${tx.hash}. Waiting for confirmation...`);
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
                console.log(`   ✅ Successfully minted '${name}'! Token ID: ${mintedTokenId} (Matches expected metadata file number). Gas Used: ${gasUsed.toString()}`);
            } else {
                // Critical Mismatch: Throw an error to stop the script.
                const errorMessage = `CRITICAL MISMATCH: Minted Token ID '${mintedTokenId}' does not match the expected metadata file number '${currentFileNumber}' for Pokémon '${name}'. Halting script.`;
                console.error(`   ❌ ${errorMessage}`);
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error(`   ❌ Failed to mint '${name}' (from ${jsonFileName}):`);
            const reason = error.reason || (error.data ? error.data.message : null) || error.message;
            console.error(`      Error Reason: ${reason || "Unknown error"}`);
        }
        console.log("----------------------------------------------------");
    }

    console.log("\n🎉🎉🎉 Batch minting process complete! 🎉🎉🎉");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌❌❌ Unhandled critical error in script execution: ❌❌❌");
        console.error(error);
        process.exit(1);
    });
