import React from 'react';

interface MintCardFormProps {
  mintPokemonIdInput: string;
  setMintPokemonIdInput: (value: string) => void;
  onMint: () => Promise<void>;
  mintStatus: string;
  isMintingInProgress: boolean; // True if (isWritePending or isConfirming) AND related to minting
  isLoadingTokenIds: boolean;
  mintingError: { shortMessage?: string; message: string } | null | undefined;
}

export function MintCardForm({
  mintPokemonIdInput,
  setMintPokemonIdInput,
  onMint,
  mintStatus,
  isMintingInProgress,
  isLoadingTokenIds,
  mintingError,
}: MintCardFormProps) {
  
  const getButtonText = () => {
    if (isLoadingTokenIds) return 'Refreshing NFTs...';
    if (mintStatus.includes('Sending to Wallet...')) return 'Sending to Wallet...';
    if (mintStatus.includes('Minting (Confirming...)')) return 'Minting (Confirming...)';
    if (mintStatus.includes('Minting...')) return 'Processing Mint...'; // Generic "in progress"
    return mintStatus || `Mint Pokemon #${mintPokemonIdInput || 'ID'}`;
  };

  return (
    <div style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
      <h3>Mint a New Pokémon Card</h3>
      <div>
        <label htmlFor="mint-pokemon-id">Pokemon ID (1-100): </label>
        <input
          id="mint-pokemon-id"
          type="number"
          value={mintPokemonIdInput}
          onChange={(e) => setMintPokemonIdInput(e.target.value)}
          min="1"
          max="100"
          style={{ width: '60px', marginRight: '10px' }}
        />
        <button onClick={onMint} disabled={isMintingInProgress || isLoadingTokenIds}>
          {getButtonText()}
        </button>
      </div>
      {mintingError && <p style={{ color: 'red' }}>Mint Error: {mintingError.shortMessage || mintingError.message}</p>}
      {mintStatus && !mintStatus.includes('Minting...') && !mintStatus.includes('Sending') && !mintStatus.includes('Confirming') && !mintingError && <p><small>{mintStatus}</small></p>}
    </div>
  );
}