const fs = require('fs-extra'); // Use fs-extra for easier directory handling
const path = require('path');

const sourceDir = path.resolve(__dirname, '../artifacts/contracts');
const targetDir = path.resolve(__dirname, '../frontend/src/abis');

async function copyAbis() {
  try {
    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    // Copy specific ABI files
    await fs.copy(path.join(sourceDir, 'PokemonCard.sol/PokemonCard.json'), path.join(targetDir, 'PokemonCard.json'));
    await fs.copy(path.join(sourceDir, 'TradingPlatform.sol/TradingPlatform.json'), path.join(targetDir, 'TradingPlatform.json'));

    console.log('Successfully copied ABIs to frontend/src/abis');
  } catch (err) {
    console.error('Error copying ABIs:', err);
  }
}

copyAbis();