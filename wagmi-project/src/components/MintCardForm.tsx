import React from 'react';

interface MintCardFormProps {
  // Removed: mintPokemonIdInput, setMintPokemonIdInput, isLoadingTokenIds
  onMint: () => void; // Assuming onMint from page.tsx is now just () => void
  mintStatus: string;
  isMintingInProgress: boolean;
  mintingError: Error | null; // Simplified error type to match page.tsx
  expectedNextPokemonId?: bigint;
  maxPokemonIdReached: boolean;
  isLoadingNextId: boolean;
}

export function MintCardForm({
  onMint,
  mintStatus,
  isMintingInProgress,
  mintingError,
  expectedNextPokemonId,
  maxPokemonIdReached,
  isLoadingNextId,
}: MintCardFormProps) {

  const buttonText = () => {
    if (isLoadingNextId) return "Loading Next ID...";
    if (maxPokemonIdReached) return "All Pokémon Minted!";
    if (isMintingInProgress) return mintStatus.includes("submitted, awaiting confirmation") ? "Awaiting Confirmation..." : "Minting..."; // More specific for minting
    return expectedNextPokemonId
      ? `Mint Next Pokémon (ID: ${expectedNextPokemonId.toString()})`
      : "Mint Next Pokémon";
  };

  return (
    <div style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
      <h4>Mint a New Pokémon Card</h4> {/* Changed from h3 to h4 to match page.tsx structure better */}
      <button
        onClick={onMint}
        disabled={isMintingInProgress || maxPokemonIdReached || isLoadingNextId}
      >
        {buttonText()}
      </button>
      {mintStatus && <p><small>{mintStatus}</small></p>}
      {mintingError && <p style={{ color: 'red' }}><small>Error: {mintingError.message}</small></p>}
    </div>
  );
}