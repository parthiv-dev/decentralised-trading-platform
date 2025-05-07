export interface PokemonJsonData {
  name: string;
  description?: string;
  image: string; // e.g., ipfs://<IMAGE_CID>/1.png
  attributes: Array<{ trait_type: string; value: string | number }>;
}

export interface DisplayPokemonData {
  tokenId: string;
  name: string; hp: string; attack: string; defense: string; speed: string;
  type1: string; type2: string; special: string;
  imageUrl?: string; description?: string; metadataUri?: string;
}

// You can add other shared interfaces here as your project grows
// For example, the MarketplaceItem interface could also live here.