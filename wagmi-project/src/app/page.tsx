'use client'

import { useState, useEffect, useMemo, useRef } from 'react' // Added useRef
import { useAccount, // Removed useConnect, useDisconnect
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance, // For displaying ETH balance if needed, not directly for contract interaction here
  usePublicClient, // To get a public client for read operations
  useWatchContractEvent, // For listening to contract events
} from 'wagmi'; 
import { parseEther, formatEther, parseAbiItem, decodeErrorResult } from 'viem'; // For converting ETH values and parsing event ABI. Added decodeErrorResult.
import { AccountConnect } from '../components/AccountConnect'; // New
import { MintCardForm } from '../components/MintCardForm';   // New
import { PokemonJsonData, DisplayPokemonData } from '../interfaces'; // New
// Extend DisplayPokemonData for listing/auction status
interface DisplayPokemonDataWithStatus extends DisplayPokemonData {
  isListed?: boolean; listingId?: string;
  isInAuction?: boolean; auctionId?: string; auctionHasBids?: boolean;
}


const pokemonCardAbi =  [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ERC721EnumerableForbiddenBatchMint",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ERC721IncorrectOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ERC721InsufficientApproval",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      }
    ],
    "name": "ERC721InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "ERC721InvalidOperator",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ERC721InvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ERC721InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ERC721InvalidSender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ERC721NonexistentToken",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "ERC721OutOfBoundsIndex",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EnforcedPause",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ExpectedPause",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "approved",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "ApprovalForAll",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "_fromTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "_toTokenId",
        "type": "uint256"
      }
    ],
    "name": "BatchMetadataUpdate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "MetadataUpdate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "MinterSetFalse",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "MinterSetTrue",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "minter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "PokemonMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "_minters",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getApproved",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNextTokenId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getPokemon",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "hp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "attack",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "defense",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "speed",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "type1",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "type2",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "special",
            "type": "uint256"
          }
        ],
        "internalType": "struct PokemonCard.Pokemon",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_hp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_attack",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_defense",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_speed",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_type1",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_type2",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_special",
        "type": "uint256"
      }
    ],
    "name": "safeMint",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "setMinterFalse",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "setMinterTrue",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "tokenByIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const // <-- Important: use "as const"

const tradingPlatformAbi =  [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_pokemonCardAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "EnforcedPause",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ExpectedPause",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradingPlatform__AuctionHasBids",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__AuctionHasEnded",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__AuctionNotActive",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__AuctionNotEndedYet",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__AuctionNotFound",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "requiredBid",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "sentBid",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__BidTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradingPlatform__DurationMustBePositive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradingPlatform__IncorrectPrice",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__ListingNotActive",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__ListingNotFound",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "TradingPlatform__NoFundsToWithdraw",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__NotApprovedForToken",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__NotAuctionSeller",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__NotListingSeller",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__NotTokenOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradingPlatform__PriceMustBePositive",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__SellerNoLongerOwnsToken",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "TradingPlatform__TokenAlreadyListedOrInAuction",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradingPlatform__WithdrawalFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "AuctionCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startingPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      }
    ],
    "name": "AuctionCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "winningBid",
        "type": "uint256"
      }
    ],
    "name": "AuctionEnded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "bidder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BidPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "FundsWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      }
    ],
    "name": "ItemListed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      }
    ],
    "name": "ItemSold",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ListingCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "auctions",
    "outputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startingPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "highestBidder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "highestBid",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "ended",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "bid",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "buyItem",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "cancelAuction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "cancelListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startingPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "durationSeconds",
        "type": "uint256"
      }
    ],
    "name": "createAuction",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "endAuction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "auctionId",
        "type": "uint256"
      }
    ],
    "name": "getAuction",
    "outputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startingPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "highestBidder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "highestBid",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "ended",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "getListing",
    "outputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      }
    ],
    "name": "listItem",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "listings",
    "outputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "onERC721Received",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "pendingWithdrawals",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pokemonCardContract",
    "outputs": [
      {
        "internalType": "contract IERC721",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tokenIsListedOrInAuction",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const // <-- Important: use "as const"

// Contract Addresses from your old App.js
const contractAddresses = {
  [31337]: { // localhost (Hardhat)
    name: 'Localhost (Hardhat)',
    pokemonCardAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
    tradingPlatformAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
  },
  [11155111]: { // sepolia
    name: 'Sepolia Testnet',
    pokemonCardAddress: '0x3ff18B652E50419c81dbAeddC02B7E42ce0D7bC0' as `0x${string}`,
    tradingPlatformAddress: '0xBB1186fD51d9eeAFA3A8FDB9144AEA32cb2CF98e' as `0x${string}`,
  }
  // Add other networks here if needed
};

function App() {
  const account = useAccount()
  const [newName, setNewName] = useState('')
  const [userPokemonIds, setUserPokemonIds] = useState<string[]>([])
  const [rawOwnedPokemonDetails, setRawOwnedPokemonDetails] = useState<DisplayPokemonData[]>([]); // Stores base data without market status
  // ownedPokemonDetails will be derived using useMemo later
  const [listTokenId, setListTokenId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [isTokenApproved, setIsTokenApproved] = useState(false);
  const [cancelListingStatus, setCancelListingStatus] = useState('');
  const [isLoadingRawPokemonDetails, setIsLoadingRawPokemonDetails] = useState(false); // For fetching base details of owned Pokemon

  // Auction State
  interface AuctionItem {
    auctionId: string; seller: `0x${string}`; tokenId: string; pokemonData?: DisplayPokemonData;
    startingPrice: string; startingPriceInWei: bigint;
    endTime: number; // Unix timestamp
    highestBidder: `0x${string}`; highestBid: string; highestBidInWei: bigint;
    active: boolean; ended: boolean;
  }
  const [activeAuctions, setActiveAuctions] = useState<AuctionItem[]>([]);
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(false);
  const [auctionsError, setAuctionsError] = useState<string | null>(null);
  const [createAuctionTokenId, setCreateAuctionTokenId] = useState('');
  const [createAuctionStartingPrice, setCreateAuctionStartingPrice] = useState('');
  const [createAuctionDurationMinutes, setCreateAuctionDurationMinutes] = useState('');
  const [bidInputs, setBidInputs] = useState<{[auctionId: string]: string}>({}); // For bid amounts per auction
  const [refreshAuctionsTrigger, setRefreshAuctionsTrigger] = useState(0);

  // State for minting status
  const [mintStatus, setMintStatus] = useState('');

  // State to track the current ongoing transaction type and associated data
  const [currentActionInfo, setCurrentActionInfo] = useState<{ type: string | null; tokenId?: string; details?: string }>({ type: null });


  // IPFS Configuration
  const IPFS_METADATA_CID = 'bafybeib3a5is3s42srpxived3bdh7y3vwu6lozo6w7htjedcflnem4c2bu';
  // const IPFS_IMAGES_CID = 'bafybeif5inisqdaiu7kbv7gnwe6zbwpvr4kr5wuiebfb6cidaq6ipxwbua'; // Not directly used if image URI is in metadata JSON
  const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

  // Helper to resolve IPFS URIs
  const resolveIpfsUri = (ipfsUri?: string) => {
    if (!ipfsUri || !ipfsUri.startsWith('ipfs://')) return undefined;
    return ipfsUri.replace('ipfs://', IPFS_GATEWAY);
  };

  const [approveStatus, setApproveStatus] = useState('');
  const [listStatus, setListStatus] = useState('');
  const [burnStatus, setBurnStatus] = useState('');
  const [isLoadingTokenIds, setIsLoadingTokenIds] = useState(false);
  const [fetchTokenIdsError, setFetchTokenIdsError] = useState<string | null>(null);
  const publicClient = usePublicClient();
  // To keep track of processed event logs for ItemSold
  const processedItemSoldLogIds = useRef(new Set<string>());

  // Marketplace State
  interface MarketplaceItem {
    listingId: string; seller: `0x${string}`; tokenId: string; price: string; priceInWei: bigint;
    pokemonData?: DisplayPokemonData;
  }
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceItem[]>([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [buyStatus, setBuyStatus] = useState('');
  // Status messages for auction actions
  const [createAuctionStatus, setCreateAuctionStatus] = useState('');
  const [bidStatus, setBidStatus] = useState('');
  const [cancelAuctionStatus, setCancelAuctionStatus] = useState('');
  const [endAuctionStatus, setEndAuctionStatus] = useState('');
  const [refreshMarketplaceTrigger, setRefreshMarketplaceTrigger] = useState(0);

    // Admin Panel State (for PokemonCard contract owner)
    const [contractOwner, setContractOwner] = useState<`0x${string}` | null>(null);
    const [isLoadingOwner, setIsLoadingOwner] = useState(false);
    const [minterAddressInput, setMinterAddressInput] = useState('');
    const [currentMinters, setCurrentMinters] = useState<`0x${string}`[]>([]);
    const [isLoadingMinters, setIsLoadingMinters] = useState(false);
    const [mintersError, setMintersError] = useState<string | null>(null);
    const [setMinterStatus, setSetMinterStatus] = useState('');
    const [refreshMintersTrigger, setRefreshMintersTrigger] = useState(0);
    const [totalNftSupply, setTotalNftSupply] = useState<bigint | null>(null);
    // Admin Panel State for Pausing PokemonCard contract
    const [isContractPaused, setIsContractPaused] = useState<boolean>(false);
    const [isLoadingPausedStatus, setIsLoadingPausedStatus] = useState(false);
    const [pauseContractStatus, setPauseContractStatus] = useState('');

  // UI State
  const [activeSection, setActiveSection] = useState<'myCards' | 'marketplace' | 'auctions' | 'admin'>('myCards');

  // Withdrawal State
  const [pendingWithdrawalAmount, setPendingWithdrawalAmount] = useState<bigint>(0n);
  const [withdrawStatus, setWithdrawStatus] = useState('');
  const [isUserMinter, setIsUserMinter] = useState(false);
  
  // Determine current network's contract addresses
  const currentNetworkConfig = account.chainId ? contractAddresses[account.chainId as keyof typeof contractAddresses] : null;
  const POKEMON_CARD_ADDRESS = currentNetworkConfig?.pokemonCardAddress;
  const TRADING_PLATFORM_ADDRESS = currentNetworkConfig?.tradingPlatformAddress;

  // --- Wagmi Hooks for Contract Interactions ---
  const { writeContractAsync, data: writeTxHash, isPending: isWritePending, error: writeError, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt, error: confirmationError } = useWaitForTransactionReceipt({
    hash: writeTxHash,
  });

  // Read the next token ID that will be minted
  const { data: nextTokenIdData, refetch: refetchNextTokenId, isLoading: isLoadingNextTokenId } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'getNextTokenId',
    query: { // wagmi v2 query options
      enabled: !!POKEMON_CARD_ADDRESS,
    }
  });
  // Read PokemonCard contract owner
  const { data: fetchedOwner, isLoading: ownerLoadingStatus, refetch: refetchOwner } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'owner',
    query: { enabled: !!POKEMON_CARD_ADDRESS },
  });

  // Read total supply of NFTs
  const { data: fetchedTotalSupply, isLoading: isLoadingTotalSupply, refetch: refetchTotalSupply } = useReadContract({
    abi: pokemonCardAbi, // Ensure totalSupply is in this ABI (it's standard for ERC721Enumerable)
    address: POKEMON_CARD_ADDRESS,
    functionName: 'totalSupply',
    query: { enabled: !!POKEMON_CARD_ADDRESS },
  });

  // Read PokemonCard contract paused status (for Admin Panel)
  const { data: fetchedPausedStatus, isLoading: pausedStatusLoading, refetch: refetchPausedStatus } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'paused',
    query: { enabled: !!POKEMON_CARD_ADDRESS }, // Anyone can view, only owner can change
  });

  useEffect(() => {
    if (fetchedPausedStatus !== undefined) {
      setIsContractPaused(fetchedPausedStatus as boolean);
    }
    setIsLoadingPausedStatus(pausedStatusLoading);
  });
  useEffect(() => {
    if (fetchedOwner) setContractOwner(fetchedOwner as `0x${string}`);
    setIsLoadingOwner(ownerLoadingStatus);
  }, [fetchedOwner, ownerLoadingStatus]);

  useEffect(() => {
    if (fetchedTotalSupply !== undefined) {
      setTotalNftSupply(fetchedTotalSupply as bigint);
    }
  }, [fetchedTotalSupply]);
  // Check if the current user is an authorized minter
  const { data: minterStatusForUser, refetch: refetchMinterStatusForUser, isLoading: isLoadingMinterStatusForUser } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: '_minters', // The public getter for the mapping
    args: [account.address!], // Pass the current user's address
    query: {
      enabled: !!account.address && !!POKEMON_CARD_ADDRESS,
    }
  });
  useEffect(() => {
    if (minterStatusForUser !== undefined) {
      setIsUserMinter(minterStatusForUser as boolean);
    }
  }, [minterStatusForUser]);

  // Read user's pending withdrawals from TradingPlatform
  const { data: fetchedPendingWithdrawals, refetch: refetchPendingWithdrawals, isLoading: isLoadingPendingWithdrawals } = useReadContract({
    abi: tradingPlatformAbi,
    address: TRADING_PLATFORM_ADDRESS,
    functionName: 'pendingWithdrawals',
    args: [account.address!],
    query: {
      enabled: !!account.address && !!TRADING_PLATFORM_ADDRESS,
    }
  });
  
  const MAX_POKEMON_ID = 100; // Define the maximum ID that can be minted

  // Read user's Pokemon balance
  const { data: pokemonBalance, refetch: refetchBalance, isLoading: isLoadingBalance } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'balanceOf',
    args: [account.address!], // Ensure account.address is defined
    enabled: !!account.address && !!POKEMON_CARD_ADDRESS, // Only run if address and contract address are available
  });

  useEffect(() => {
    if (fetchedPendingWithdrawals !== undefined) {
      setPendingWithdrawalAmount(fetchedPendingWithdrawals as bigint);
    }
  }, [fetchedPendingWithdrawals]);


  // Helper function to get a specific stat from Pokemon JSON attributes
  function getStatFromJsonAttributes(attributes: Array<{ trait_type: string; value: string | number }>, trait: string, isNumeric = true): any {
    const attr = attributes.find(a => a.trait_type.toLowerCase() === trait.toLowerCase());
    if (!attr) return isNumeric ? 0 : "";
    if (isNumeric) {
        const numValue = Number(attr.value);
        return isNaN(numValue) ? 0 : numValue;
    }
    return attr.value.toString();
  }

  // Reusable function to fetch full Pokemon data (on-chain + off-chain)
  async function fetchPokemonDisplayData(
    tokenId: string | bigint,
    currentPublicClient: typeof publicClient, // Use the specific type
    pokemonCardAddr: `0x${string}`,
  ): Promise<DisplayPokemonData | null> {
    if (!currentPublicClient || !pokemonCardAddr) return null;
    try {
      const tokenIdBigInt = BigInt(tokenId);
      const onChainData = await currentPublicClient.readContract({
        abi: pokemonCardAbi, address: pokemonCardAddr, functionName: 'getPokemon', args: [tokenIdBigInt],
      }) as { name: string; hp: bigint; attack: bigint; defense: bigint; speed: bigint; type1: string; type2: string; special: bigint };

      const metadataUri = await currentPublicClient.readContract({
        abi: pokemonCardAbi, address: pokemonCardAddr, functionName: 'tokenURI', args: [tokenIdBigInt],
      }) as string;

      let imageUrl: string | undefined, description: string | undefined;
      if (metadataUri) {
        const resolvedMetadataUrl = resolveIpfsUri(metadataUri);
        if (resolvedMetadataUrl) {
          const response = await fetch(resolvedMetadataUrl);
          if (response.ok) {
            const json: PokemonJsonData = await response.json();
            imageUrl = resolveIpfsUri(json.image);
            description = json.description;
          } else console.warn(`Failed to fetch metadata for ${tokenIdBigInt} from ${resolvedMetadataUrl}`);
        }
      }
      return {
        tokenId: tokenIdBigInt.toString(),
        name: onChainData.name, hp: onChainData.hp.toString(), attack: onChainData.attack.toString(),
        defense: onChainData.defense.toString(), speed: onChainData.speed.toString(),
        type1: onChainData.type1, type2: onChainData.type2, special: onChainData.special.toString(),
        imageUrl, description, metadataUri,
      };
    } catch (error) {
      console.error(`Error fetching display data for token ${tokenId}:`, error);
      return null;
    }
  }

  // Read user's Pokemon token IDs (more complex due to loop in old code)
  // This effect will fetch token IDs one by one after balance is known
  useEffect(() => {
    const fetchTokenIds = async () => {
      if (!publicClient) {
        // If publicClient is not ready, don't clear existing data, just return.
        // Data will be fetched when publicClient becomes available.
        return;
      }
      if (pokemonBalance === undefined || !account.address || !POKEMON_CARD_ADDRESS ) {
        // If critical info is missing, clear data as it's likely invalid.
        if (userPokemonIds.length > 0) setUserPokemonIds([]);
        if (rawOwnedPokemonDetails.length > 0) setRawOwnedPokemonDetails([]);
        return;
      }

      const balanceNum = Number(pokemonBalance);
      if (balanceNum === 0) {
        // If balance is 0, clear data.
        if (userPokemonIds.length > 0) setUserPokemonIds([]);
        if (rawOwnedPokemonDetails.length > 0) setRawOwnedPokemonDetails([]);
        return;
      }

      setIsLoadingTokenIds(true);
      setFetchTokenIdsError(null);
      setIsLoadingRawPokemonDetails(true); // Indicate raw details are being fetched/updated
      const ids: string[] = [];
      
      try { // Main try block for all fetching operations
        // Step 1: Fetching token IDs
        if (balanceNum > 0) {
          for (let i = 0; i < balanceNum; i++) {
            const tokenIdResult = await publicClient.readContract({
              abi: pokemonCardAbi,
              address: POKEMON_CARD_ADDRESS!,
              functionName: 'tokenOfOwnerByIndex',
              args: [account.address!, BigInt(i)],
            });
            if (typeof tokenIdResult === 'bigint' || typeof tokenIdResult === 'number') {
              ids.push(tokenIdResult.toString());
            } else {
              console.warn(`Unexpected token ID format for index ${i}:`, tokenIdResult);
            }
          }
        }
        setUserPokemonIds(ids);

        // Step 2: Fetching full details for each token ID
        if (ids.length > 0) {
          const detailsPromises = ids.map(id =>
            fetchPokemonDisplayData(id, publicClient, POKEMON_CARD_ADDRESS!)
          );
          const resolvedDetails = (await Promise.all(detailsPromises)).filter(d => d !== null) as DisplayPokemonData[];
          setRawOwnedPokemonDetails(resolvedDetails);
        } else {
          // If ids array is empty (either from 0 balance or if the loop above didn't populate it)
          setRawOwnedPokemonDetails([]);
        }

      } catch (e: any) { // Main catch block for any error in the try block
        console.error("Error during token ID or details fetching:", e);
        setFetchTokenIdsError(`Failed to fetch Pokémon data: ${e.message || 'Unknown error'}`);
        // Ensure states are reset on error
        setUserPokemonIds([]); // Clear IDs if any part of the try failed
        setRawOwnedPokemonDetails([]);
      }
    finally { // Main finally block, attached to the main try-catch
        setIsLoadingTokenIds(false);
        setIsLoadingRawPokemonDetails(false);
      }
    };

    fetchTokenIds();
  }, [pokemonBalance, account.address, POKEMON_CARD_ADDRESS, account.status, publicClient]); // Removed marketplaceListings, activeAuctions, refetchBalance

  // Derive ownedPokemonDetails with status using useMemo
  const ownedPokemonDetails = useMemo(() => {
    return rawOwnedPokemonDetails.map(pokemon => {
      const listedItem = marketplaceListings.find(l => l.tokenId === pokemon.tokenId && l.seller === account.address);
      const auctionedItem = activeAuctions.find(a => a.tokenId === pokemon.tokenId && a.seller === account.address);
      
      return {
        ...pokemon,
        isListed: !!listedItem,
        listingId: listedItem?.listingId,
        isInAuction: !!auctionedItem,
        auctionId: auctionedItem?.auctionId,
        auctionHasBids: auctionedItem?.highestBidder !== '0x0000000000000000000000000000000000000000',
      };
    });
  }, [rawOwnedPokemonDetails, marketplaceListings, activeAuctions, account.address]);

  // Effect to update listTokenId when ownedPokemonDetails change
  useEffect(() => {
    if (ownedPokemonDetails.length > 0 && (!listTokenId || !ownedPokemonDetails.some(p => p.tokenId === listTokenId))) {
      setListTokenId(ownedPokemonDetails[0].tokenId);
    } else if (ownedPokemonDetails.length === 0 && listTokenId) {
      setListTokenId('');
    }
  }, [ownedPokemonDetails, listTokenId]); // listTokenId is included to prevent potential loops if setListTokenId itself triggers a change that would re-evaluate this.

  // Check if the selected token is approved for the marketplace
  const { data: approvedAddress, refetch: refetchApprovalStatus, isLoading: isLoadingApprovalStatus } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'getApproved',
    args: [listTokenId ? BigInt(listTokenId) : BigInt(0)], // Pass a valid BigInt, even if 0
    query: { // For wagmi v2, query options like 'enabled' go inside the 'query' object
      enabled: !!listTokenId && !!POKEMON_CARD_ADDRESS && !!TRADING_PLATFORM_ADDRESS,
    }
  });

  useEffect(() => {
    if (approvedAddress && TRADING_PLATFORM_ADDRESS) {
      setIsTokenApproved(approvedAddress.toLowerCase() === TRADING_PLATFORM_ADDRESS.toLowerCase());
    } else {
      setIsTokenApproved(false);
    }
  }, [approvedAddress, TRADING_PLATFORM_ADDRESS]);

  const handleSetMinter = async (addressToSet: string, makeMinter: boolean) => {
    if (!POKEMON_CARD_ADDRESS || !account.address || !contractOwner || account.address.toLowerCase() !== contractOwner.toLowerCase()) {
      alert("This action can only be performed by the contract owner.");
      return;
    }
    if (!addressToSet || !/^0x[a-fA-F0-9]{40}$/.test(addressToSet)) {
      alert("Please enter a valid Ethereum address for the minter.");
      setSetMinterStatus("Invalid address provided.");
      return;
    }

    const functionName = makeMinter ? 'setMinterTrue' : 'setMinterFalse';
    const actionVerb = makeMinter ? 'Adding' : 'Removing';
    setCurrentActionInfo({ type: functionName, details: `Address: ${addressToSet}` });

    try {
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: functionName,
        args: [addressToSet as `0x${string}`],
      });
      setSetMinterStatus(`${actionVerb} minter ${addressToSet.substring(0,6)}...: Transaction submitted...`);
    } catch (e: any) {
      setSetMinterStatus(`Failed to ${actionVerb.toLowerCase()} minter: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null }); // Reset on direct failure
      setMinterAddressInput(''); // Clear input on direct failure
    }
  };

  
  // --- Transaction Functions ---
  const handleMint = async () => {
    if (!POKEMON_CARD_ADDRESS || !account.address || !publicClient) {
      alert("Please connect your wallet, ensure you are on a supported network, and public client is available.");
      setCurrentActionInfo({ type: null });
      return;
    }

    // Fetch the latest nextTokenId directly to ensure we're checking against the most current state
    let expectedNextPokemonId: bigint;
    try {
      const nextIdResult = await publicClient.readContract({ // Use publicClient for one-off read
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'getNextTokenId',
      });
      expectedNextPokemonId = BigInt(nextIdResult as number | bigint);
    } catch (e) {
      setMintStatus(`Failed to fetch next token ID: ${(e as Error).message}`);
      setCurrentActionInfo({ type: null });
      return;
    }

    if (expectedNextPokemonId > BigInt(MAX_POKEMON_ID)) {
      setMintStatus(`All ${MAX_POKEMON_ID} Pokémon have been minted! No more can be minted.`);
      setCurrentActionInfo({ type: null }); // Clear action if pre-check fails
      return;
    }

    const pokemonIdForMetadata = expectedNextPokemonId.toString(); // This ID should match the metadata file name (e.g., 50.json)

    try {
      const metadataIpfsUri = `ipfs://${IPFS_METADATA_CID}/${pokemonIdForMetadata}.json`;
      // Set current action info with the expected ID for user feedback
      setCurrentActionInfo({ type: 'mint', details: `Pokemon (Expected ID: ${pokemonIdForMetadata})` });

      const resolvedMetadataUrl = resolveIpfsUri(metadataIpfsUri);
      if (!resolvedMetadataUrl) throw new Error("Could not resolve IPFS metadata URL.");

      const response = await fetch(resolvedMetadataUrl);
      if (!response.ok) throw new Error(`Failed to fetch Pokemon metadata from IPFS (for expected ID: ${pokemonIdForMetadata})`);
      const jsonData: PokemonJsonData = await response.json();

      const name = jsonData.name;
      const hp = BigInt(getStatFromJsonAttributes(jsonData.attributes, "HP"));
      const attack = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Attack"));
      const defense = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Defense"));
      const speed = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Speed"));
      const type1 = getStatFromJsonAttributes(jsonData.attributes, "Type 1", false);
      let type2 = getStatFromJsonAttributes(jsonData.attributes, "Type 2", false);
      if (type2 === 0 || type2 === "0") type2 = ""; // Ensure type2 is empty string if not found or numeric 0
      const special = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Special"));

      if (!name || !type1) {
        throw new Error("Essential Pokemon data (name, type1) missing from metadata.");
      }

      // 3. Call safeMint
      // safeMint does not take tokenId, it's assigned by the contract.
      // The URI and attributes correspond to the *next available* Pokemon ID.
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'safeMint',
        args: [account.address, metadataIpfsUri, name, hp, attack, defense, speed, type1, type2, special],
      });
      setMintStatus(`Minting Pokemon (Expected ID: ${pokemonIdForMetadata}): Transaction submitted, awaiting confirmation...`);
    } catch (e: any) {
      setMintStatus(`Minting failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null }); // Reset action on direct failure from writeContractAsync
    }
  };

  const handleApprove = async () => {
    if (!POKEMON_CARD_ADDRESS || !TRADING_PLATFORM_ADDRESS || !listTokenId) {
      alert("Please select a token and ensure contract addresses are available.");
      return;
    }
    setCurrentActionInfo({ type: 'approve', tokenId: listTokenId });
    try {
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'approve',
        args: [TRADING_PLATFORM_ADDRESS, BigInt(listTokenId)],
      });
      setApproveStatus(`Approving token ${listTokenId}: Transaction submitted, awaiting confirmation...`);
    } catch (e: any) {
      setApproveStatus(`Approval failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleListCard = async () => {
    if (!TRADING_PLATFORM_ADDRESS || !listTokenId || !listPrice || !isTokenApproved) {
      alert("Ensure token is selected, price is set, and token is approved.");
      return;
    }
    setCurrentActionInfo({ type: 'list', tokenId: listTokenId, details: `for ${listPrice} ETH` });
    try {
      const priceInWei = parseEther(listPrice);
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'listItem',
        args: [BigInt(listTokenId), priceInWei],
      });
      setListStatus(`Listing token ${listTokenId}: Transaction submitted, awaiting confirmation...`);
    } catch (e: any) {
      setListStatus(`Listing failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleCancelListing = async (listingId: string) => {
    if (!TRADING_PLATFORM_ADDRESS) {
      alert("Trading platform address not found. Ensure you are on a supported network.");
      return;
    }
    setCurrentActionInfo({ type: 'cancelListing', details: `Listing ID: ${listingId}` });
    try {
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'cancelListing',
        args: [BigInt(listingId)],
      });
      setCancelListingStatus(`Cancelling listing ${listingId}: Transaction submitted...`);
    } catch (e: any) {
      setCancelListingStatus(`Cancel listing failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleBuyItem = async (listingId: string, priceInWei: bigint) => {
    if (!TRADING_PLATFORM_ADDRESS || !account.address) {
      alert("Please connect your wallet and ensure contract addresses are available.");
      return;
    }
    setCurrentActionInfo({ type: 'buy', tokenId: listingId });
    try {
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'buyItem',
        args: [BigInt(listingId)],
        value: priceInWei, // Send ETH with the transaction
      });
      // If writeContractAsync is successful, the useEffect for confirmation will handle status updates.
    } catch (e: any) {
      setBuyStatus(`Buy failed for item ${listingId}: ${e.shortMessage || e.message}`);
      console.error(`Error in handleBuyItem for listing ${listingId}:`, e);
      setCurrentActionInfo({ type: null }); // Reset action on direct failure
    }
  };

  const handleBurn = async (tokenIdToBurn: string) => {
    if (!POKEMON_CARD_ADDRESS || !account.address) {
      alert("Please connect your wallet and ensure contract addresses are available.");
      return;
    }
    setCurrentActionInfo({ type: 'burn', tokenId: tokenIdToBurn });
    try {
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'burn',
        args: [BigInt(tokenIdToBurn)],
      });
      setBurnStatus(`Burning token ${tokenIdToBurn}: Transaction submitted, awaiting confirmation...`);
    } catch (e: any) {
      setBurnStatus(`Burn failed for token ${tokenIdToBurn}: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleCreateAuction = async () => {
    if (!TRADING_PLATFORM_ADDRESS || !POKEMON_CARD_ADDRESS || !createAuctionTokenId || !createAuctionStartingPrice || !createAuctionDurationMinutes || !isTokenApproved) {
      alert("Ensure token is selected for auction, starting price and duration are set, and token is approved for the marketplace.");
      return;
    }
    // Note: Approval check for createAuctionTokenId should be similar to listTokenId
    // For simplicity, we assume `isTokenApproved` (which checks `listTokenId`) is sufficient if `createAuctionTokenId === listTokenId`.
    // A more robust solution would check approval specifically for `createAuctionTokenId`.
    // We will rely on the `approve` button for the selected `listTokenId` to also cover auction creation if the same token is used.

    setCurrentActionInfo({ type: 'createAuction', tokenId: createAuctionTokenId, details: `Price: ${createAuctionStartingPrice} ETH, Duration: ${createAuctionDurationMinutes} min` });
    try {
      const priceInWei = parseEther(createAuctionStartingPrice);
      const durationInSeconds = BigInt(parseInt(createAuctionDurationMinutes, 10) * 60);
      if (durationInSeconds <= 0) {
        alert("Auction duration must be positive.");
        setCurrentActionInfo({ type: null });
        return;
      }

      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'createAuction',
        args: [BigInt(createAuctionTokenId), priceInWei, durationInSeconds],
      });
      setCreateAuctionStatus(`Creating auction for token ${createAuctionTokenId}: Transaction submitted...`);
    } catch (e: any) {
      setCreateAuctionStatus(`Auction creation failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleBid = async (auctionId: string) => {
    if (!TRADING_PLATFORM_ADDRESS || !account.address) {
      alert("Connect wallet and ensure contract addresses are available.");
      return;
    }
    const bidAmountString = bidInputs[auctionId];
    if (!bidAmountString || parseFloat(bidAmountString) <= 0) {
      alert("Please enter a valid bid amount.");
      return;
    }
    setCurrentActionInfo({ type: 'bid', details: `Auction ID: ${auctionId}, Amount: ${bidAmountString} ETH` });
    try {
      const bidValueWei = parseEther(bidAmountString);
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'bid',
        args: [BigInt(auctionId)],
        value: bidValueWei,
      });
      setBidStatus(`Placing bid on auction ${auctionId}: Transaction submitted...`);
    } catch (e: any) {
      setBidStatus(`Bid failed for auction ${auctionId}: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleCancelAuction = async (auctionId: string) => {
    if (!TRADING_PLATFORM_ADDRESS) return;
    setCurrentActionInfo({ type: 'cancelAuction', details: `Auction ID: ${auctionId}` });
    try {
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'cancelAuction',
        args: [BigInt(auctionId)],
      });
      setCancelAuctionStatus(`Cancelling auction ${auctionId}: Transaction submitted...`);
    } catch (e: any) {
      setCancelAuctionStatus(`Cancel auction failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleEndAuction = async (auctionId: string) => {
    if (!TRADING_PLATFORM_ADDRESS) return;
    setCurrentActionInfo({ type: 'endAuction', details: `Auction ID: ${auctionId}` });
    try {
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'endAuction',
        args: [BigInt(auctionId)],
      });
      setEndAuctionStatus(`Ending auction ${auctionId}: Transaction submitted...`);
    } catch (e: any) {
      setEndAuctionStatus(`End auction failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  // Helper to update bid input state
  const handleBidInputChange = (auctionId: string, value: string) => {
    setBidInputs(prev => ({ ...prev, [auctionId]: value }));
  };

  const handleWithdrawFunds = async () => {
    if (!TRADING_PLATFORM_ADDRESS || !account.address || pendingWithdrawalAmount === 0n) {
      alert("No funds to withdraw or trading platform not available.");
      return;
    }
    setCurrentActionInfo({ type: 'withdraw', details: `Amount: ${formatEther(pendingWithdrawalAmount)} ETH` });
    try {
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'withdraw',
        args: [], // withdraw function takes no arguments
      });
      setWithdrawStatus(`Withdrawing funds: Transaction submitted...`);
    } catch (e: any) {
      setWithdrawStatus(`Withdrawal failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handlePauseContract = async () => {
    if (!POKEMON_CARD_ADDRESS || !account.address || !contractOwner || account.address.toLowerCase() !== contractOwner.toLowerCase()) {
      alert("This action can only be performed by the contract owner.");
      return;
    }
    if (isContractPaused) {
      alert("PokemonCard contract is already paused.");
      return;
    }
    setCurrentActionInfo({ type: 'pauseContract', details: 'Pausing PokemonCard contract' });
    try {
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'pause',
      });
      setPauseContractStatus('Pausing PokemonCard contract: Transaction submitted...');
    } catch (e: any) {
      setPauseContractStatus(`Pausing PokemonCard contract failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };

  const handleUnpauseContract = async () => {
    if (!POKEMON_CARD_ADDRESS || !account.address || !contractOwner || account.address.toLowerCase() !== contractOwner.toLowerCase()) {
      alert("This action can only be performed by the contract owner.");
      return;
    }
    if (!isContractPaused) {
      alert("PokemonCard contract is not paused.");
      return;
    }
    setCurrentActionInfo({ type: 'unpauseContract', details: 'Unpausing PokemonCard contract' });
    try {
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'unpause',
      });
      setPauseContractStatus('Unpausing PokemonCard contract: Transaction submitted...');
    } catch (e: any) {
      setPauseContractStatus(`Unpausing PokemonCard contract failed: ${e.shortMessage || e.message}`);
      setCurrentActionInfo({ type: null });
    }
  };



 // Watch for ItemSold events
 useWatchContractEvent({
  address: TRADING_PLATFORM_ADDRESS,
  abi: tradingPlatformAbi,
  eventName: 'ItemSold',
  enabled: !!TRADING_PLATFORM_ADDRESS,
  onLogs(logs) {
    console.log('[Event Watcher] ItemSold logs received:', logs);
    logs.forEach(log => {
      // Create a unique ID for this specific log emission
      const logId = `${log.transactionHash}-${log.logIndex}`;

      // Check if this log has   already been processed
      if (processedItemSoldLogIds.current.has(logId)) {
        // console.log(`[Event Watcher] Log ${logId} (ItemSold) already processed. Skipping.`);
        return;
      }

      // Type assertion for log.args, ensure it matches your event structure
      const args = log.args as { listingId?: bigint; buyer?: `0x${string}`; seller?: `0x${string}`; tokenId?: bigint; price?: bigint };
      
      console.log(`[Event Watcher] Item ${args.listingId?.toString()} (Token ID: ${args.tokenId?.toString()}) sold by ${args.seller} to ${args.buyer} for ${args.price ? formatEther(args.price) : 'N/A'} ETH.`);
      setRefreshMarketplaceTrigger(prev => prev + 1); // Refresh marketplace for everyone

      // If the current user is the seller or buyer, refresh their balance
      if (account.address && (args.seller?.toLowerCase() === account.address.toLowerCase() || args.buyer?.toLowerCase() === account.address.toLowerCase())) {
        refetchBalance(); 
      }

      // Specific notification for the seller (already existing logic, slightly adapted)
      if (args.seller && account.address && args.seller.toLowerCase() === account.address.toLowerCase()) {
        if (!processedItemSoldLogIds.current.has(logId)) { // Check if already processed for notification
          const message = `🎉 Your item (Token ID: ${args.tokenId?.toString()}) was sold for ${args.price ? formatEther(args.price) : 'N/A'} ETH! Listing ID: ${args.listingId?.toString()}`;
          processedItemSoldLogIds.current.add(logId); // Mark as processed for notification
          alert(message); 
          console.log(message);
        }
      }
    });
  },
});

  // Watch for ItemListed events
  useWatchContractEvent({
    address: TRADING_PLATFORM_ADDRESS,
    abi: tradingPlatformAbi,
    eventName: 'ItemListed',
    enabled: !!TRADING_PLATFORM_ADDRESS,
    onLogs(logs) {
      logs.forEach(log => {
        const args = log.args as { listingId?: bigint; seller?: `0x${string}`; tokenId?: bigint; price?: bigint };
        console.log(`[Event Watcher] Item ${args.listingId?.toString()} (Token ID: ${args.tokenId?.toString()}) listed by ${args.seller} for ${args.price ? formatEther(args.price) : 'N/A'} ETH.`);
        setRefreshMarketplaceTrigger(prev => prev + 1); // Refresh marketplace
      });
    }
  });

  // Watch for ListingCancelled events
  useWatchContractEvent({
    address: TRADING_PLATFORM_ADDRESS,
    abi: tradingPlatformAbi,
    eventName: 'ListingCancelled',
    enabled: !!TRADING_PLATFORM_ADDRESS,
    onLogs(logs) {
      logs.forEach(log => {
        const args = log.args as { listingId?: bigint; seller?: `0x${string}`; tokenId?: bigint };
        console.log(`[Event Watcher] Listing ${args.listingId?.toString()} cancelled by ${args.seller}`);
        setRefreshMarketplaceTrigger(prev => prev + 1); // Refresh marketplace
        // If the current user is the seller, refresh their balance
        if (account.address && args.seller?.toLowerCase() === account.address.toLowerCase()) {
          refetchBalance(); 
        }
      });
    }
  });

  // Watch for Auction events
  const auctionEventsToWatch: ('AuctionCreated' | 'BidPlaced' | 'AuctionEnded' | 'AuctionCancelled')[] = ['AuctionCreated', 'BidPlaced', 'AuctionEnded', 'AuctionCancelled'];
  auctionEventsToWatch.forEach(eventName => {
    useWatchContractEvent({
      address: TRADING_PLATFORM_ADDRESS,
      abi: tradingPlatformAbi,
      eventName: eventName,
      enabled: !!TRADING_PLATFORM_ADDRESS,
      onLogs(logs) {
        logs.forEach(log => {
          console.log(`[Event Watcher] ${eventName} event:`, log.args);
          setRefreshAuctionsTrigger(prev => prev + 1); // Refresh auction list
          if (eventName === 'AuctionEnded' || eventName === 'AuctionCancelled') {
            refetchBalance(); // Token ownership might change
            if (refetchPendingWithdrawals) refetchPendingWithdrawals(); // Seller might have funds
          }
        });
      }
    });
  });

    // Watch for MinterSetTrue and MinterSetFalse events to update minter list
    useWatchContractEvent({
      address: POKEMON_CARD_ADDRESS,
      abi: pokemonCardAbi,
      eventName: 'MinterSetTrue',
      enabled: !!POKEMON_CARD_ADDRESS,
      onLogs(logs) {
        logs.forEach(log => {
          const args = log.args as { minter?: `0x${string}` };
          console.log(`[Event Watcher] MinterSetTrue for ${args.minter}`);
          // If the event is for the current user, refresh their specific minter status
          if (account.address && args.minter?.toLowerCase() === account.address.toLowerCase()) {
            if (refetchMinterStatusForUser) refetchMinterStatusForUser();
          }
          setRefreshMintersTrigger(prev => prev + 1); // Refresh minters list
        });
      }
    });
  
    useWatchContractEvent({
      address: POKEMON_CARD_ADDRESS,
      abi: pokemonCardAbi,
      eventName: 'MinterSetFalse',
      enabled: !!POKEMON_CARD_ADDRESS,
      onLogs(logs) {
        logs.forEach(log => {
          const args = log.args as { minter?: `0x${string}` };
          console.log(`[Event Watcher] MinterSetFalse for ${args.minter}`);
          // If the event is for the current user, refresh their specific minter status
          if (account.address && args.minter?.toLowerCase() === account.address.toLowerCase()) {
            if (refetchMinterStatusForUser) refetchMinterStatusForUser();
          }
          setRefreshMintersTrigger(prev => prev + 1); // Refresh minters list
        });
      }
    });

    // Watch for PokemonCard Paused and Unpaused events
    useWatchContractEvent({
      address: POKEMON_CARD_ADDRESS,
      abi: pokemonCardAbi,
      eventName: 'Paused',
      enabled: !!POKEMON_CARD_ADDRESS,
      onLogs(logs) {
        logs.forEach(log => {
          console.log('[Event Watcher] PokemonCard Paused event:', log.args);
          if (refetchPausedStatus) refetchPausedStatus();
          // Optionally, provide immediate feedback if desired, though refetch is safer
          // setIsContractPaused(true);
          // setPauseContractStatus('PokemonCard contract has been paused (event received).');
        });
      }
    });

    useWatchContractEvent({
      address: POKEMON_CARD_ADDRESS,
      abi: pokemonCardAbi,
      eventName: 'Unpaused',
      enabled: !!POKEMON_CARD_ADDRESS,
      onLogs(logs) {
        logs.forEach(log => {
          console.log('[Event Watcher] PokemonCard Unpaused event:', log.args);
          if (refetchPausedStatus) refetchPausedStatus();
        });
      }
    });
  
  // Effect to fetch marketplace listings
  useEffect(() => {
    const fetchListings = async () => {
      if (!publicClient || !TRADING_PLATFORM_ADDRESS || !POKEMON_CARD_ADDRESS) {
        // Don't clear listings here if it's just a configuration issue temporarily
        return;
      }
      setIsLoadingMarketplace(true);
      setMarketplaceError(null);
      try {
        const itemListedLogs = await publicClient.getLogs({
          address: TRADING_PLATFORM_ADDRESS,
          event: parseAbiItem('event ItemListed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 price)'),
          fromBlock: 0n, // Consider a more recent block for performance in production
        });

        if (!itemListedLogs || itemListedLogs.length === 0) {
          setMarketplaceListings([]); // Clear if no logs found, meaning no items ever listed or all are gone
          setIsLoadingMarketplace(false); // Ensure loading is set to false
          return;
        }

        const uniqueListingIds = [...new Set(itemListedLogs.map(log => log.args.listingId!))];

        let processedListingDetails: Array<{ status: 'success' | 'failure', result?: readonly [ `0x${string}`, bigint, bigint, boolean ], error?: Error, originalListingId: bigint }> = [];


        // The chain does not have the contract "multicall3" configured. Version: viem@2.29.0

        if (account.chainId === 31337 && publicClient) { // Hardhat chain ID
          console.log("[Marketplace] Using sequential calls for Hardhat network to fetch listing details.");
          for (const id of uniqueListingIds) {
            try {
              const result = await publicClient.readContract({
                abi: tradingPlatformAbi,
                address: TRADING_PLATFORM_ADDRESS!,
                functionName: 'getListing',
                args: [id],
              });
              processedListingDetails.push({ status: 'success', result, originalListingId: id });
            } catch (e: any) {
              console.warn(`[Marketplace] Failed to fetch listing ${id} sequentially:`, e);
              processedListingDetails.push({ status: 'failure', error: e, originalListingId: id });
            }
          }
        } else if (publicClient) {
          console.log("[Marketplace] Using multicall for non-Hardhat network to fetch listing details.");
          const listingDetailsContracts = uniqueListingIds.map(id => ({
            abi: tradingPlatformAbi,
            address: TRADING_PLATFORM_ADDRESS!,
            functionName: 'getListing',
            args: [id] as const, // Ensure args are const-asserted for multicall
          }));
          const multicallResults = await publicClient.multicall({ contracts: listingDetailsContracts, allowFailure: true });
          processedListingDetails = multicallResults.map((res, index) => ({ ...res, originalListingId: uniqueListingIds[index] }));
        }

        const activeListingsData = processedListingDetails
          .map((res, index) => ({ ...res, originalListingId: uniqueListingIds[index] }))
          .filter(res => res.status === 'success' && res.result && (res.result as any)[3] === true) // result[3] is 'active'
          .map(res => ({
            listingId: res.originalListingId!.toString(),
            seller: (res.result as any)![0] as `0x${string}`,
            tokenId: ((res.result as any)![1] as bigint).toString(),
            priceInWei: (res.result as any)![2] as bigint,
          }));

        if (activeListingsData.length === 0) {
          setMarketplaceListings([]); // Clear if no active listings remain
          setIsLoadingMarketplace(false);
          return;
        }

        // Fetch full Pokemon data for each listing
        const finalMarketplaceListingsPromises = activeListingsData.map(async (listing) => {
          const pokemonData = await fetchPokemonDisplayData(
            listing.tokenId,
            publicClient,
            POKEMON_CARD_ADDRESS!
          );
          return {
            listingId: listing.listingId,
            seller: listing.seller,
            tokenId: listing.tokenId,
            price: formatEther(listing.priceInWei),
            priceInWei: listing.priceInWei,
            pokemonData: pokemonData || undefined,
          };
        });

        const resolvedMarketplaceListings = await Promise.all(finalMarketplaceListingsPromises);
        // Filter out items where Pokemon data fetch might have failed
        const finalMarketplaceListings = resolvedMarketplaceListings.filter(item => item.pokemonData);
        setMarketplaceListings(finalMarketplaceListings);
      } catch (error: any) {
        setMarketplaceError(`Failed to load marketplace: ${error.message}`);
        // Potentially keep stale data on error instead of clearing, or show error prominently
      } finally {
        setIsLoadingMarketplace(false);
      }
    };
    fetchListings();
  }, [account.status, TRADING_PLATFORM_ADDRESS, POKEMON_CARD_ADDRESS, publicClient, refreshMarketplaceTrigger]);

  // // Effect for auto-refreshing marketplace listings periodically (REPLACED BY EVENT WATCHERS)
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     console.log('[Marketplace Auto-Refresh] Triggering marketplace refresh.');
  //     setRefreshMarketplaceTrigger(prev => prev + 1);
  //   }, 30000); // Refresh every 30 seconds

  //   return () => {
  //     clearInterval(intervalId); // Clear interval on component unmount
  //   };
  // }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Effect to fetch active auctions
  useEffect(() => {
    const fetchAuctions = async () => {
      if (!publicClient || !TRADING_PLATFORM_ADDRESS || !POKEMON_CARD_ADDRESS) {
        // Don't clear auctions here if it's just a configuration issue temporarily
        return;
      }
      setIsLoadingAuctions(true);
      setAuctionsError(null);
      try {
        const auctionCreatedLogs = await publicClient.getLogs({
          address: TRADING_PLATFORM_ADDRESS,
          event: parseAbiItem('event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 indexed tokenId, uint256 startingPrice, uint256 endTime)'),
          fromBlock: 0n,
        });

        if (!auctionCreatedLogs || auctionCreatedLogs.length === 0) {
          setActiveAuctions([]); // Clear if no auctions ever created or all are gone
          setIsLoadingAuctions(false); // Ensure loading is set to false
          return;
        }

        const uniqueAuctionIds = [...new Set(auctionCreatedLogs.map(log => log.args.auctionId!))];

        let processedAuctionDetails: Array<{ status: 'success' | 'failure', result?: ReturnType<typeof tradingPlatformAbi[0]['outputs']>, error?: Error, originalAuctionId: bigint }> = [];

        if (account.chainId === 31337 && publicClient) { // Hardhat
          for (const id of uniqueAuctionIds) {
            try {
              const result = await publicClient.readContract({ abi: tradingPlatformAbi, address: TRADING_PLATFORM_ADDRESS!, functionName: 'getAuction', args: [id] });
              processedAuctionDetails.push({ status: 'success', result: result as any, originalAuctionId: id });
            } catch (e: any) {
              processedAuctionDetails.push({ status: 'failure', error: e, originalAuctionId: id });
            }
          }
        } else if (publicClient) {
          const auctionDetailsContracts = uniqueAuctionIds.map(id => ({ abi: tradingPlatformAbi, address: TRADING_PLATFORM_ADDRESS!, functionName: 'getAuction', args: [id] as const }));
          const multicallResults = await publicClient.multicall({ contracts: auctionDetailsContracts, allowFailure: true });
          processedAuctionDetails = multicallResults.map((res, index) => ({ ...res, originalAuctionId: uniqueAuctionIds[index] } as any));
        }

        const activeAuctionsData = processedAuctionDetails
          .filter(res => res.status === 'success' && res.result && (res.result as any)[6] === true && (res.result as any)[7] === false) // result[6] is 'active', result[7] is 'ended'
          .map(res => {
            const auctionData = res.result as any; // seller, tokenId, startingPrice, endTime, highestBidder, highestBid, active, ended
            return {
              auctionId: res.originalAuctionId!.toString(),
              seller: auctionData[0] as `0x${string}`,
              tokenId: (auctionData[1] as bigint).toString(),
              startingPriceInWei: auctionData[2] as bigint,
              endTime: Number(auctionData[3] as bigint),
              highestBidder: auctionData[4] as `0x${string}`,
              highestBidInWei: auctionData[5] as bigint,
              active: auctionData[6] as boolean,
              ended: auctionData[7] as boolean,
            };
          });

        const finalAuctionsPromises = activeAuctionsData.map(async (auction) => {
          const pokemonData = await fetchPokemonDisplayData(auction.tokenId, publicClient, POKEMON_CARD_ADDRESS!);
          return {
            ...auction,
            startingPrice: formatEther(auction.startingPriceInWei),
            highestBid: formatEther(auction.highestBidInWei),
            pokemonData: pokemonData || undefined,
          };
        });

        const resolvedAuctions = (await Promise.all(finalAuctionsPromises)).filter(item => item.pokemonData);
        setActiveAuctions(resolvedAuctions);
      } catch (error: any) {
        setAuctionsError(`Failed to load auctions: ${error.message}`);
        // Potentially keep stale data on error
      } finally {
        setIsLoadingAuctions(false);
      }
    };
    fetchAuctions();
  }, [account.status, TRADING_PLATFORM_ADDRESS, POKEMON_CARD_ADDRESS, publicClient, refreshAuctionsTrigger]);


  // Effect to fetch current minters for the Admin Panel
  useEffect(() => {
    const fetchCurrentMinters = async () => {
      if (!publicClient || !POKEMON_CARD_ADDRESS) {
        setCurrentMinters([]);
        return;
      }
      setIsLoadingMinters(true);
      setMintersError(null);
      try {
        // Fetch all MinterSetTrue events
        const trueLogs = await publicClient.getLogs({
          address: POKEMON_CARD_ADDRESS,
          event: parseAbiItem('event MinterSetTrue(address minter)'),
          fromBlock: 0n, // Fetch all logs from the beginning
        });
        // Fetch all MinterSetFalse events
        const falseLogs = await publicClient.getLogs({
          address: POKEMON_CARD_ADDRESS,
          event: parseAbiItem('event MinterSetFalse(address minter)'),
          fromBlock: 0n,
        });

        const minterStatusMap = new Map<`0x${string}`, boolean>();
        // Process true logs, then false logs to ensure the latest status is recorded
        trueLogs.forEach(log => {
          const args = log.args as { minter?: `0x${string}` };
          if (args.minter) minterStatusMap.set(args.minter, true);
        });
        falseLogs.forEach(log => {
          const args = log.args as { minter?: `0x${string}` };
          if (args.minter) minterStatusMap.set(args.minter, false);
        });

        const activeMinters = Array.from(minterStatusMap.entries()).filter(([, isMinter]) => isMinter).map(([address]) => address);
        setCurrentMinters(activeMinters);
      } catch (error: any) {
        setMintersError(`Failed to load minters: ${error.message}`);
        setCurrentMinters([]);
      } finally {
        setIsLoadingMinters(false);
      }
    };
    fetchCurrentMinters();
  }, [POKEMON_CARD_ADDRESS, publicClient, refreshMintersTrigger]); // Depends on contract address, client, and manual trigger


  // Effect to handle transaction confirmation feedback and refetch data
  useEffect(() => {
    // Define these here to be available for both success and error paths if currentActionInfo.type is true
    const actionType = currentActionInfo.type;
    const actionTokenId = currentActionInfo.tokenId;
    const actionDetails = currentActionInfo.details;

    if (isConfirmed && receipt) {
      let successMessage = ''; // This line was missing
      if (actionType === 'mint') {
        successMessage = `✅ Mint successful! (${actionDetails || ''})`;
        setMintStatus(successMessage);
        refetchBalance(); // Refetch user's balance of NFTs
        if (refetchTotalSupply) refetchTotalSupply(); // Refetch total supply
        if (refetchNextTokenId) refetchNextTokenId(); // Refetch next token ID for next mint
      } else if (actionType === 'approve' && actionTokenId) {
        successMessage = `✅ Token ${actionTokenId} approved!`;
        setApproveStatus(successMessage);
        refetchApprovalStatus();
      } else if (actionType === 'list' && actionTokenId) {
        successMessage = `✅ Token ${actionTokenId} listed ${actionDetails || ''}!`;
        setListStatus(successMessage);
        refetchApprovalStatus();
        refetchBalance();
        setRefreshMarketplaceTrigger(prev => prev + 1); // Refresh marketplace
      } else if (actionType === 'buy' && actionTokenId) {
        successMessage = `✅ Item (Listing ID: ${actionTokenId}) bought successfully!`;
        setBuyStatus(successMessage); // Keep specific status for UI
        setRefreshMarketplaceTrigger(prev => prev + 1);
        refetchBalance();
      } else if (actionType === 'burn' && actionTokenId) {
        successMessage = `✅ Token ${actionTokenId} burned successfully!`;
        setBurnStatus(successMessage);
        refetchBalance(); // Refresh user's NFT list
        if (refetchTotalSupply) refetchTotalSupply(); // Refetch total supply
        if (listTokenId === actionTokenId) {
          setListTokenId(''); // Clear selection if burned token was selected for listing
        }
      } else if (actionType === 'cancelListing' && actionDetails) {
        successMessage = `✅ Listing cancelled successfully! (${actionDetails})`;
        setCancelListingStatus(successMessage);
        setRefreshMarketplaceTrigger(prev => prev + 1);
        refetchBalance();
      } else if (actionType === 'createAuction' && actionTokenId) {
        successMessage = `✅ Auction for token ${actionTokenId} created! (${actionDetails})`;
        setCreateAuctionStatus(successMessage);
        setRefreshAuctionsTrigger(prev => prev + 1);
        refetchBalance(); // User's token is now in auction
      } else if (actionType === 'bid' && actionDetails) {
        successMessage = `✅ Bid placed successfully! (${actionDetails})`;
        setBidStatus(successMessage);
        setRefreshAuctionsTrigger(prev => prev + 1);
        // Potentially refresh user's ETH balance if wagmi doesn't do it automatically
      } else if (actionType === 'cancelAuction' && actionDetails) {
        successMessage = `✅ Auction cancelled successfully! (${actionDetails})`;
        setCancelAuctionStatus(successMessage);
        setRefreshAuctionsTrigger(prev => prev + 1);
        refetchBalance(); // Token returns to owner's control
      } else if (actionType === 'endAuction' && actionDetails) {
        successMessage = `✅ Auction ended successfully! (${actionDetails})`;
        setEndAuctionStatus(successMessage);
        setRefreshAuctionsTrigger(prev => prev + 1);
        refetchBalance(); // Ownership might change, or funds become withdrawable
      } else if (actionType === 'setMinterTrue' || actionType === 'setMinterFalse') {
        const verb = actionType === 'setMinterTrue' ? 'added' : 'removed';
        successMessage = `✅ Minter ${verb} successfully! (${actionDetails})`;
        setSetMinterStatus(successMessage);
        setRefreshMintersTrigger(prev => prev + 1); // Refresh the list of minters
        setMinterAddressInput(''); // Clear input on success
      } else if (actionType === 'withdraw') {
        successMessage = `✅ Funds withdrawn successfully! (${actionDetails})`;
        setWithdrawStatus(successMessage);
        if (refetchPendingWithdrawals) refetchPendingWithdrawals();
        if (refetchMinterStatusForUser) refetchMinterStatusForUser(); // In case owner status changed something relevant
        refetchBalance(); // User's ETH balance will change
      } else if (actionType === 'pauseContract') {
        successMessage = `✅ PokemonCard contract paused successfully!`;
        setPauseContractStatus(successMessage);
        if (refetchPausedStatus) refetchPausedStatus();
      } else if (actionType === 'unpauseContract') {
        successMessage = `✅ PokemonCard contract unpaused successfully!`;
        setPauseContractStatus(successMessage);
        if (refetchPausedStatus) refetchPausedStatus();
        refetchBalance(); // User's ETH balance will change
      }
      setCurrentActionInfo({ type: null }); // Reset action info
      if (resetWriteContract) resetWriteContract(); // Reset wagmi write hook state for all confirmed TXs

      const timer = setTimeout(() => {
        // Clear status messages
        if (mintStatus.includes('✅')) setMintStatus('');
        if (approveStatus.includes('✅')) setApproveStatus('');
        if (listStatus.includes('✅')) setListStatus('');
        if (buyStatus.includes('✅')) setBuyStatus('');
        if (burnStatus.includes('✅')) setBurnStatus('');
        if (cancelListingStatus.includes('✅')) setCancelListingStatus('');
        if (createAuctionStatus.includes('✅')) setCreateAuctionStatus('');
        if (bidStatus.includes('✅')) setBidStatus('');
        if (cancelAuctionStatus.includes('✅')) setCancelAuctionStatus('');
        if (setMinterStatus.includes('✅')) setSetMinterStatus('');
        if (endAuctionStatus.includes('✅')) setEndAuctionStatus('');
        if (withdrawStatus.includes('✅')) setWithdrawStatus('');
        if (pauseContractStatus.includes('✅')) setPauseContractStatus('');
      }, 4000);
      return () => clearTimeout(timer);

    } else if (confirmationError) {
      const specificErrorMsg = `⚠️ Transaction failed: ${confirmationError.shortMessage || confirmationError.message}`;
      // Use currentActionInfo to determine which action failed
      if (actionType) {
      let userFacingError = specificErrorMsg;

      if (actionType === 'mint') {
        // actionDetails already contains "Pokemon (Expected ID: X)"
        userFacingError = `⚠️ Minting failed ${actionDetails || ''}: ${confirmationError.shortMessage || confirmationError.message}`;
        setMintStatus(userFacingError);
      } else if (actionType === 'approve' && actionTokenId) {
        userFacingError = `⚠️ Approval for token ${actionTokenId} failed: ${confirmationError.shortMessage || confirmationError.message}`;
        setApproveStatus(userFacingError);
      } else if (actionType === 'list' && actionTokenId) {
        userFacingError = `⚠️ Listing token ${actionTokenId} failed: ${confirmationError.shortMessage || confirmationError.message}`;
        setListStatus(userFacingError);
      } else if (actionType === 'buy' && actionTokenId) {
        userFacingError = `⚠️ Buying item (Listing ID: ${actionTokenId}) failed: ${confirmationError.shortMessage || confirmationError.message}`;
        setBuyStatus(userFacingError); // Keep specific status for UI
      } else if (actionType === 'burn' && actionTokenId) {
        userFacingError = `⚠️ Burning token ${actionTokenId} failed: ${confirmationError.shortMessage || confirmationError.message}`;
        setBurnStatus(userFacingError);
      } else if (actionType === 'cancelListing' && actionDetails) {
        userFacingError = `⚠️ Cancelling listing failed (${actionDetails}): ${confirmationError.shortMessage || confirmationError.message}`;
        setCancelListingStatus(userFacingError);
      } else if (actionType === 'createAuction' && actionTokenId) {
        userFacingError = `⚠️ Creating auction for token ${actionTokenId} failed: ${confirmationError.shortMessage || confirmationError.message}`;
        setCreateAuctionStatus(userFacingError);
      } else if (actionType === 'bid' && actionDetails) {
        userFacingError = `⚠️ Bid failed (${actionDetails}): ${confirmationError.shortMessage || confirmationError.message}`;
        setBidStatus(userFacingError);
      } else if (actionType === 'cancelAuction' && actionDetails) {
        userFacingError = `⚠️ Cancelling auction failed (${actionDetails}): ${confirmationError.shortMessage || confirmationError.message}`;
        setCancelAuctionStatus(userFacingError);
      } else if (actionType === 'endAuction' && actionDetails) {
        userFacingError = `⚠️ Ending auction failed (${actionDetails}): ${confirmationError.shortMessage || confirmationError.message}`;
        setEndAuctionStatus(userFacingError);
      } else if (actionType === 'setMinterTrue' || actionType === 'setMinterFalse') {
        const verb = actionType === 'setMinterTrue' ? 'adding' : 'removing';
        userFacingError = `⚠️ Failed ${verb} minter (${actionDetails}): ${confirmationError.shortMessage || confirmationError.message}`;
        setSetMinterStatus(userFacingError);
        setMinterAddressInput(''); // Clear input on transaction confirmation error
      } else if (actionType === 'withdraw') {
        userFacingError = `⚠️ Withdrawal failed (${actionDetails}): ${confirmationError.shortMessage || confirmationError.message}`;
        setWithdrawStatus(userFacingError);
      } else if (actionType === 'pauseContract') {
        userFacingError = `⚠️ Pausing PokemonCard contract failed: ${confirmationError.shortMessage || confirmationError.message}`;
        setPauseContractStatus(userFacingError);
      } else if (actionType === 'unpauseContract') {
        userFacingError = `⚠️ Unpausing PokemonCard contract failed: ${confirmationError.shortMessage || confirmationError.message}`;
        setPauseContractStatus(userFacingError);
        // Don't clear pending amount here, as the withdrawal failed. It might still be there.
      }
      setCurrentActionInfo({ type: null }); // Reset action info
      }
      if (resetWriteContract) resetWriteContract();

      const errorTimer = setTimeout(() => {
        // Clear error messages
        if (mintStatus.includes('⚠️')) setMintStatus('');
        if (approveStatus.includes('⚠️')) setApproveStatus('');
        if (listStatus.includes('⚠️')) setListStatus('');
        if (buyStatus.includes('⚠️')) setBuyStatus('');
        if (burnStatus.includes('⚠️')) setBurnStatus('');
        if (cancelListingStatus.includes('⚠️')) setCancelListingStatus('');
        if (createAuctionStatus.includes('⚠️')) setCreateAuctionStatus('');
        if (bidStatus.includes('⚠️')) setBidStatus('');
        if (cancelAuctionStatus.includes('⚠️')) setCancelAuctionStatus('');
        if (endAuctionStatus.includes('⚠️')) setEndAuctionStatus('');
        if (setMinterStatus.includes('⚠️')) setSetMinterStatus('');
        if (withdrawStatus.includes('⚠️')) setWithdrawStatus('');
        if (pauseContractStatus.includes('⚠️')) setPauseContractStatus('');
      }, 7000);
      return () => clearTimeout(errorTimer);
    }
  }, [
    isConfirmed, receipt, confirmationError, currentActionInfo,
    refetchBalance, refetchApprovalStatus, refetchNextTokenId, resetWriteContract, refetchPendingWithdrawals, refetchMinterStatusForUser, refetchTotalSupply, refetchPausedStatus,
    listTokenId, setListTokenId,
    setRefreshMarketplaceTrigger, setRefreshAuctionsTrigger, setRefreshMintersTrigger,
    setMintStatus, setApproveStatus, setListStatus, setBuyStatus, setBurnStatus, setWithdrawStatus, setPauseContractStatus,
    setCancelListingStatus, setCreateAuctionStatus, setBidStatus, setCancelAuctionStatus, setEndAuctionStatus, setSetMinterStatus, 
    mintStatus, approveStatus, listStatus, buyStatus, burnStatus, withdrawStatus, pauseContractStatus,
    cancelListingStatus, createAuctionStatus, bidStatus, cancelAuctionStatus, endAuctionStatus, setMinterStatus
  ]);  
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}> {/* Centered content */}
        <AccountConnect />

        {/* Contract Paused Banner - Visible to all users if contract is paused */}
        {account.status === 'connected' && currentNetworkConfig && !isLoadingPausedStatus && isContractPaused && (
          <div className="contract-paused-banner">
            <p>⚠️ The PokemonCard contract is currently PAUSED. Some actions like minting, approving, and transferring NFTs may be temporarily unavailable. ⚠️</p>
          </div>
        )}


        {account.status === 'connected' && currentNetworkConfig && (
          <>
            <hr />
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2>Pokémon Card dApp ({currentNetworkConfig.name})</h2>
              <p><small>Pokemon Contract: {POKEMON_CARD_ADDRESS}</small></p>
              <p><small>Trading Platform: {TRADING_PLATFORM_ADDRESS}</small></p>
            </div>

            <nav className="navbar">
              <button 
                onClick={() => setActiveSection('myCards')} 
                className={activeSection === 'myCards' ? 'active' : ''}
              >
                My Cards & Mint
              </button>
              <button 
                onClick={() => setActiveSection('marketplace')} 
                className={activeSection === 'marketplace' ? 'active' : ''}
              >
                Marketplace
              </button>
              <button 
                onClick={() => setActiveSection('auctions')} 
                className={activeSection === 'auctions' ? 'active' : ''}
              >
                Auctions
              </button>
              {contractOwner && account.address?.toLowerCase() === contractOwner.toLowerCase() && (
                <button 
                  onClick={() => setActiveSection('admin')} 
                  className={activeSection === 'admin' ? 'active' : ''}
                >
                  Admin Panel
                </button>
              )}
            </nav>

            {/* Transaction Status Area - Visible across sections */}
            {currentActionInfo.type && (isWritePending || isConfirming || writeTxHash) && (
              <div className="transaction-status-area" style={{marginBottom: '20px'}}>
                <h4>Transaction: {currentActionInfo.type} {currentActionInfo.tokenId || currentActionInfo.details || ''}</h4>
                {isWritePending && <p>Please confirm in your wallet...</p>}
                {writeTxHash && !isConfirming && <p>Transaction sent (Hash: {writeTxHash.substring(0,10)}...). Waiting for confirmation...</p>}
                {isConfirming && <p>Confirming transaction (Hash: {writeTxHash?.substring(0,10)}...)...</p>}
              </div>
            )}

            {/* Conditionally Rendered Sections */}
            {activeSection === 'myCards' && (
              <div className="section-container" style={{marginTop: '20px'}}>
              {(isUserMinter || (contractOwner && account.address?.toLowerCase() === contractOwner.toLowerCase())) && (
                <>
                  <MintCardForm
                    onMint={handleMint}
                    mintStatus={mintStatus}
                    isMintingInProgress={(isWritePending || isConfirming) && currentActionInfo.type === 'mint'}
                    mintingError={writeError && currentActionInfo.type === 'mint' ? writeError : null}
                    expectedNextPokemonId={nextTokenIdData !== undefined ? BigInt(nextTokenIdData as number | bigint) : undefined}
                    maxPokemonIdReached={nextTokenIdData !== undefined ? (BigInt(nextTokenIdData as number | bigint) > BigInt(MAX_POKEMON_ID)) : false}
                    isLoadingNextId={isLoadingNextTokenId}
                  />
                  <hr/>
                </>
              )}
              
              {TRADING_PLATFORM_ADDRESS && (
                <div style={{padding: '10px', border: '1px dashed #777', borderRadius: '8px', marginBottom: '20px'}}>
                  <h4>Your Funds on Platform</h4>
                  {isLoadingPendingWithdrawals && <p>Loading your withdrawable balance...</p>}
                  {!isLoadingPendingWithdrawals && (
                    <p>Withdrawable: {formatEther(pendingWithdrawalAmount)} ETH</p>
                  )}
                  <button onClick={handleWithdrawFunds} disabled={pendingWithdrawalAmount === 0n || ((isWritePending || isConfirming) && currentActionInfo.type === 'withdraw')}>
                    {((isWritePending || isConfirming) && currentActionInfo.type === 'withdraw') ? 'Withdrawing...' : 'Withdraw Funds'}
                  </button>
                  {withdrawStatus && <p><small>{withdrawStatus}</small></p>}
                </div>
              )}
              <hr/>
              <h3>Your Pokémon Cards</h3>
              {/* More nuanced loading states */}
              {(isLoadingBalance && !pokemonBalance) && <p>Loading your card balance...</p>}
              {!isLoadingBalance && pokemonBalance !== undefined && isLoadingTokenIds && <p>Fetching your token IDs...</p>}
              {!isLoadingBalance && pokemonBalance !== undefined && !isLoadingTokenIds && userPokemonIds.length > 0 && isLoadingRawPokemonDetails && <p>Fetching details for your Pokémon...</p>}
              


              {fetchTokenIdsError && <p style={{ color: 'red' }}>{fetchTokenIdsError}</p>}
              {!isLoadingTokenIds && !isLoadingRawPokemonDetails && !fetchTokenIdsError && ownedPokemonDetails.length > 0 ? (
                <>
                  <p>Your Card Balance: {pokemonBalance?.toString()}</p>
                  <div className="flex-wrap-container">
                    {ownedPokemonDetails.map(pokemon => ( // Ensure key is unique
                      <div key={pokemon.tokenId} className="card" style={{ width: '220px' }}>
                        {pokemon.imageUrl && <img src={pokemon.imageUrl} alt={pokemon.name || `Token ${pokemon.tokenId}`} style={{ maxWidth: '100%', height: 'auto', marginBottom: '5px' }} />}
                        <strong>{pokemon.name} (ID: {pokemon.tokenId})</strong>
                        <p style={{fontSize: '0.8em', margin: '2px 0'}}>HP: {pokemon.hp}, Atk: {pokemon.attack}, Def: {pokemon.defense}</p>
                        <p style={{fontSize: '0.8em', margin: '2px 0'}}>Speed: {pokemon.speed}, Special: {pokemon.special}</p>
                        <p style={{fontSize: '0.8em', margin: '2px 0'}}>Types: {pokemon.type1}{pokemon.type2 ? ` / ${pokemon.type2}` : ''}</p>
                        {pokemon.isListed && pokemon.listingId && (
                          <>
                            <p style={{color: 'orange', fontSize: '0.9em', fontWeight: 'bold'}}>Status: Listed (ID: {pokemon.listingId})</p>
                            <button onClick={() => handleCancelListing(pokemon.listingId!)} disabled={((isWritePending || isConfirming) && currentActionInfo.type === 'cancelListing' && currentActionInfo.details?.includes(pokemon.listingId!))}>
                              {((isWritePending || isConfirming) && currentActionInfo.type === 'cancelListing' && currentActionInfo.details?.includes(pokemon.listingId!)) ? 'Cancelling...' : 'Cancel Listing'}
                            </button>
                          </>
                        )}
                        {pokemon.isInAuction && pokemon.auctionId && (
                          <>
                            <p style={{color: 'cyan', fontSize: '0.9em', fontWeight: 'bold'}}>Status: In Auction (ID: {pokemon.auctionId})</p>
                            {!pokemon.auctionHasBids && (
                              <button onClick={() => handleCancelAuction(pokemon.auctionId!)} disabled={((isWritePending || isConfirming) && currentActionInfo.type === 'cancelAuction' && currentActionInfo.details?.includes(pokemon.auctionId!))}>
                                {((isWritePending || isConfirming) && currentActionInfo.type === 'cancelAuction' && currentActionInfo.details?.includes(pokemon.auctionId!)) ? 'Cancelling...' : 'Cancel Auction'}
                              </button>
                            )}
                            {pokemon.auctionHasBids && <p style={{fontSize: '0.8em', color: '#aaa'}}>Cannot cancel, auction has bids.</p>}
                          </>
                        )}
                        {!pokemon.isListed && !pokemon.isInAuction && (
                          <button onClick={() => handleBurn(pokemon.tokenId)} disabled={(isWritePending || isConfirming) && currentActionInfo.type === 'burn' && currentActionInfo.tokenId === pokemon.tokenId} style={{ marginTop: '5px', width: '100%' }}>
                            { (isWritePending && currentActionInfo.type === 'burn' && currentActionInfo.tokenId === pokemon.tokenId) ? 'Sending...' : (isConfirming && currentActionInfo.type === 'burn' && currentActionInfo.tokenId === pokemon.tokenId) ? 'Confirming Burn...' : `Burn Token ${pokemon.tokenId}` }
                          </button>
                        )}
                      </div>
                    ))}
                    {burnStatus && <p><small>{burnStatus}</small></p>}
                  </div>

                  {/* Combined Listing and Auction Creation Form */}
                  <div style={{marginTop: '25px', padding: '15px', border: '1px dashed #555', borderRadius: '8px'}}>
                    <h4>Manage Your Card (ID: {listTokenId || 'Select a card'})</h4>
                    <p><small>Select a card from your collection above to manage. The approval step is for the Trading Platform contract to manage your selected token.</small></p>
                    
                    <div style={{marginBottom: '10px'}}>
                      <label htmlFor="token-select" style={{marginRight: '5px'}}>Token ID: </label>
                      <select id="token-select" value={listTokenId} onChange={(e) => setListTokenId(e.target.value)}>
                        {ownedPokemonDetails.map(p => <option key={p.tokenId} value={p.tokenId}>{p.name} (ID: {p.tokenId})</option>)}
                      </select>
                    </div>

                    <button
                      onClick={handleApprove}
                      disabled={!listTokenId || isTokenApproved || isLoadingApprovalStatus || ((isWritePending || isConfirming) && currentActionInfo.type === 'approve')}
                    >
                      {isLoadingApprovalStatus ? 'Checking Approval...' :
                       isTokenApproved ? '✅ Approved for Marketplace' :
                       ((isWritePending || isConfirming) && currentActionInfo.type === 'approve') ? (isConfirming ? 'Approving (Confirming...)' : 'Sending to Wallet...') :
                       (approveStatus && !approveStatus.includes('approved') && !approveStatus.includes('failed')) ? approveStatus : '1. Approve Marketplace'}
                    </button>
                    <hr style={{margin: '15px 0', borderTop: '1px dotted #555'}}/>
                    
                    <h5>Fixed Price Sale</h5>
                    <label htmlFor="price-input" style={{marginRight: '5px'}}>Price (ETH): </label>
                    <input id="price-input" type="text" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="e.g., 0.1" style={{width: '100px'}}/>
                    <button
                      onClick={handleListCard}
                      disabled={!listTokenId || !listPrice || !isTokenApproved || ((isWritePending || isConfirming) && currentActionInfo.type === 'list')}
                    >
                      {((isWritePending || isConfirming) && currentActionInfo.type === 'list') ? (isConfirming ? 'Listing (Confirming...)' : 'Sending to Wallet...') :
                       (listStatus && !listStatus.includes('listed') && !listStatus.includes('failed')) ? listStatus : '2. List Card'}
                    </button>
                    
                    <h5 style={{marginTop: '20px'}}>Auction</h5>
                    <label htmlFor="auction-start-price" style={{marginRight: '5px'}}>Start Price (ETH): </label>
                    <input id="auction-start-price" type="text" value={createAuctionStartingPrice} onChange={(e) => setCreateAuctionStartingPrice(e.target.value)} placeholder="e.g., 0.05" style={{width: '100px'}}/>
                    <br/>
                    <label htmlFor="auction-duration" style={{marginRight: '5px'}}>Duration (minutes): </label>
                    <input id="auction-duration" type="number" value={createAuctionDurationMinutes} onChange={(e) => setCreateAuctionDurationMinutes(e.target.value)} placeholder="e.g., 60" style={{width: '100px'}}/>
                    <button
                      onClick={() => {
                        if (listTokenId) {
                          setCreateAuctionTokenId(listTokenId); 
                          handleCreateAuction();
                        } else {
                          alert("Please select a token ID from the dropdown first.");
                        }
                      }}
                      disabled={!listTokenId || !createAuctionStartingPrice || !createAuctionDurationMinutes || !isTokenApproved || ((isWritePending || isConfirming) && currentActionInfo.type === 'createAuction')}
                    >
                      {((isWritePending || isConfirming) && currentActionInfo.type === 'createAuction') ? (isConfirming ? 'Creating Auction (Confirming...)' : 'Sending...') : '3. Create Auction'}
                    </button>
                  </div>
                  {/* Display specific errors if they occurred during these actions */}
                  {(writeError && (currentActionInfo.type === 'approve' || currentActionInfo.type === 'list' || currentActionInfo.type === 'createAuction')) && <p style={{ color: 'red' }}>Tx Error: {writeError.shortMessage || writeError.message}</p>}
                  {/* Display final status messages (success/failure) */}
                  {approveStatus && (approveStatus.includes('approved') || approveStatus.includes('failed')) && <p><small>{approveStatus}</small></p>}
                  {listStatus && (listStatus.includes('listed') || listStatus.includes('failed')) &&  <p><small>{listStatus}</small></p>}
                  {createAuctionStatus && <p><small>{createAuctionStatus}</small></p>}
                </>
              ) : ( // Conditions for "no cards" message
                !isLoadingBalance && pokemonBalance !== undefined && Number(pokemonBalance) === 0 && !isLoadingTokenIds && !isLoadingRawPokemonDetails && !fetchTokenIdsError && <p>You don't own any Pokémon NFTs yet. Try minting one!</p>
              )}
            </div>
            )}

            {activeSection === 'marketplace' && (
            <div className="section-container">
              <h2>Marketplace Listings</h2>
              <button onClick={() => setRefreshMarketplaceTrigger(prev => prev + 1)} disabled={isLoadingMarketplace}>
                {isLoadingMarketplace ? 'Refreshing Marketplace...' : 'Refresh Marketplace'}
              </button>

              {/* Display loading or error messages */}
              {/* The "Refreshing..." message will show above the list if it's a refresh */}
              {isLoadingMarketplace && marketplaceListings.length > 0 && <p><small>Refreshing marketplace data...</small></p>}
              {/* The "Loading..." message will show if it's an initial load (no items yet) */}
              {isLoadingMarketplace && marketplaceListings.length === 0 && <p>Loading marketplace...</p>}
              {marketplaceError && !isLoadingMarketplace && <p style={{ color: 'red' }}>{marketplaceError}</p>}

              {/* Display "No items" message only if not loading, no error, and list is truly empty */}
              {!isLoadingMarketplace && !marketplaceError && marketplaceListings.length === 0 &&  (
                <p>No items currently listed in the marketplace.</p>
              )}

              {/* Display the list if it has items. Apply opacity effect during refresh. */}
              {/* This section will remain visible even if isLoadingMarketplace is true, showing old items until new ones arrive. */}
              {marketplaceListings.length > 0 && (
                <div className="flex-wrap-container" style={{ opacity: isLoadingMarketplace ? 0.6 : 1, transition: 'opacity 0.3s ease-in-out' }}>
                  {marketplaceListings.map((item) => (
                    <div key={item.listingId} className="card" style={{ width: '250px' }}>
                      {item.pokemonData?.imageUrl && <img src={item.pokemonData.imageUrl} alt={item.pokemonData.name || `Token ${item.tokenId}`} style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }} />}
                      <h4>{item.pokemonData?.name || `Token ID: ${item.tokenId}`}</h4>
                      <p>Listing ID: {item.listingId}</p>
                      {item.pokemonData && (
                        <p style={{fontSize: '0.8em'}}>HP: {item.pokemonData.hp}, Atk: {item.pokemonData.attack}, Def: {item.pokemonData.defense}<br/>
                        Types: {item.pokemonData.type1}{item.pokemonData.type2 ? ` / ${item.pokemonData.type2}` : ''}</p>
                      )}
                      <p>Price: {item.price} ETH</p>
                      <p><small>Seller: {item.seller === account.address ? 'You' : item.seller}</small></p>
                      {item.seller !== account.address && (
                        <button onClick={() => handleBuyItem(item.listingId, item.priceInWei)} disabled={((isWritePending || isConfirming) && currentActionInfo.type === 'buy' && currentActionInfo.tokenId === item.listingId)}>
                          {((isWritePending || isConfirming) && currentActionInfo.type === 'buy' && currentActionInfo.tokenId === item.listingId) ? (isConfirming ? 'Confirming Buy...' : 'Sending...') : 'Buy Now'}
                        </button>
                      )}
                      {item.seller === account.address && (
                        <button onClick={() => handleCancelListing(item.listingId)} disabled={((isWritePending || isConfirming) && currentActionInfo.type === 'cancelListing' && currentActionInfo.details?.includes(item.listingId))}>
                          {((isWritePending || isConfirming) && currentActionInfo.type === 'cancelListing' && currentActionInfo.details?.includes(item.listingId)) ? (isConfirming ? 'Confirming Cancel...' : 'Sending...') : 'Cancel Listing'}
                        </button>
                      )}
                      {/* Display final buy status for this specific item */}
                      {buyStatus && buyStatus.includes(item.listingId) && (buyStatus.includes('✅') || buyStatus.includes('⚠️')) && <p><small>{buyStatus.replace(`item ${item.listingId}`, 'this item')}</small></p>}
                      {cancelListingStatus && cancelListingStatus.includes(item.listingId) && <p><small>{cancelListingStatus}</small></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {activeSection === 'auctions' && (
            <div className="section-container">
              <h2>Active Auctions</h2>
              <button onClick={() => setRefreshAuctionsTrigger(prev => prev + 1)} disabled={isLoadingAuctions}>
                {isLoadingAuctions ? 'Refreshing Auctions...' : 'Refresh Auctions'}
              </button>
              {isLoadingAuctions && activeAuctions.length > 0 && <p><small>Refreshing auction data...</small></p>}
              {isLoadingAuctions && activeAuctions.length === 0 && <p>Loading auctions...</p>}
              {auctionsError && !isLoadingAuctions && <p style={{ color: 'red' }}>{auctionsError}</p>}
              {!isLoadingAuctions && !auctionsError && activeAuctions.length === 0 && <p>No active auctions at the moment.</p>}

              {activeAuctions.length > 0 && (
                <div className="flex-wrap-container" style={{ opacity: isLoadingAuctions ? 0.6 : 1, transition: 'opacity 0.3s ease-in-out' }}>
                  {activeAuctions.map((auction) => (
                    <div key={auction.auctionId} className="card" style={{ width: '280px' }}>
                      {auction.pokemonData?.imageUrl && <img src={auction.pokemonData.imageUrl} alt={auction.pokemonData.name || `Token ${auction.tokenId}`} style={{ maxWidth: '100%', height: 'auto', marginBottom: '10px' }} />}
                      <h4>{auction.pokemonData?.name || `Token ID: ${auction.tokenId}`} (Auction ID: {auction.auctionId})</h4>
                      {auction.pokemonData && <p style={{fontSize: '0.8em'}}>HP: {auction.pokemonData.hp}, Atk: {auction.pokemonData.attack}, Def: {auction.pokemonData.defense}</p>}
                      <p>Seller: {auction.seller === account.address ? 'You' : auction.seller.substring(0,6)}</p>
                      <p>Ends: {new Date(auction.endTime * 1000).toLocaleString()}</p>
                      <p>Starting Price: {auction.startingPrice} ETH</p>
                      <p>Highest Bid: {auction.highestBid} ETH by {auction.highestBidder === '0x0000000000000000000000000000000000000000' ? 'N/A' : auction.highestBidder.substring(0,6)}</p>

                      {auction.active && !auction.ended && new Date().getTime() / 1000 < auction.endTime && ( // Auction is ongoing
                        <>
                          {auction.seller !== account.address && (
                            <div>
                              <input
                                type="text"
                                placeholder="Your bid (ETH)"
                                value={bidInputs[auction.auctionId] || ''}
                                onChange={(e) => handleBidInputChange(auction.auctionId, e.target.value)}
                                style={{width: '100px', marginRight: '5px'}}
                              />
                              <button onClick={() => handleBid(auction.auctionId)} disabled={((isWritePending || isConfirming) && currentActionInfo.type === 'bid' && currentActionInfo.details?.includes(auction.auctionId))}>
                                {((isWritePending || isConfirming) && currentActionInfo.type === 'bid' && currentActionInfo.details?.includes(auction.auctionId)) ? 'Bidding...' : 'Place Bid'}
                              </button>
                            </div>
                          )}
                          {auction.seller === account.address && auction.highestBidder === '0x0000000000000000000000000000000000000000' && ( // Seller can cancel if no bids
                            <button onClick={() => handleCancelAuction(auction.auctionId)} disabled={((isWritePending || isConfirming) && currentActionInfo.type === 'cancelAuction' && currentActionInfo.details?.includes(auction.auctionId))}>
                              {((isWritePending || isConfirming) && currentActionInfo.type === 'cancelAuction' && currentActionInfo.details?.includes(auction.auctionId)) ? 'Cancelling...' : 'Cancel Auction'}
                            </button>
                          )}
                        </>
                      )}

                      {auction.active && !auction.ended && new Date().getTime() / 1000 >= auction.endTime && ( // Auction time has passed, can be ended
                        <button onClick={() => handleEndAuction(auction.auctionId)} disabled={((isWritePending || isConfirming) && currentActionInfo.type === 'endAuction' && currentActionInfo.details?.includes(auction.auctionId))}>
                          {((isWritePending || isConfirming) && currentActionInfo.type === 'endAuction' && currentActionInfo.details?.includes(auction.auctionId)) ? 'Ending...' : 'End Auction'}
                        </button>
                      )}

                      {!auction.active && auction.ended && (
                        <p style={{fontWeight: 'bold'}}>
                          {auction.highestBidder !== '0x0000000000000000000000000000000000000000'
                            ? `Ended. Winner: ${auction.highestBidder.substring(0,6)}`
                            : 'Ended (No Bids/Cancelled)'}
                        </p>
                      )}
                      
                      {/* Status messages for this auction item */}
                      {bidStatus && bidStatus.includes(auction.auctionId) && <p><small>{bidStatus}</small></p>}
                      {cancelAuctionStatus && cancelAuctionStatus.includes(auction.auctionId) && <p><small>{cancelAuctionStatus}</small></p>}
                      {endAuctionStatus && endAuctionStatus.includes(auction.auctionId) && <p><small>{endAuctionStatus}</small></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
            
            {/* Admin Panel - Rendered based on activeSection and ownership */}
            {activeSection === 'admin' && contractOwner && account.address?.toLowerCase() === contractOwner.toLowerCase() && (
              <div className="admin-panel">
                <h2>👑 Admin Panel (PokemonCard Contract)</h2>
                <p style={{color: '#1a237e'}}>Contract Owner: <strong style={{color: '#0d47a1'}}>{contractOwner}</strong></p>
                <p><small style={{color: '#555'}}>This panel is exclusively for you, the contract owner.</small></p>

                <div style={{ marginTop: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color-dark)' }}>
                  <h4>Contract Stats</h4>
                  {isLoadingTotalSupply && <p>Loading total NFT supply...</p>}
                  {totalNftSupply !== null && !isLoadingTotalSupply && <p>Total NFTs in Circulation: <strong>{totalNftSupply.toString()}</strong></p>}
                  <button onClick={() => refetchTotalSupply()} disabled={isLoadingTotalSupply}>Refresh Stats</button>
                </div>

                <div style={{ marginTop: '15px' }}>
                  <h4>Manage Minter Addresses</h4>
                  <input
                    type="text"
                    placeholder="Enter Address (0x...)"
                    value={minterAddressInput}
                    onChange={(e) => setMinterAddressInput(e.target.value)}
                    style={{ marginRight: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '300px' }}
                  />
                  <button onClick={() => handleSetMinter(minterAddressInput, true)} disabled={!minterAddressInput || ((isWritePending || isConfirming) && currentActionInfo.type === 'setMinterTrue')} style={{ backgroundColor: '#28a745' }}> {/* Green for add */}
                    {((isWritePending || isConfirming) && currentActionInfo.type === 'setMinterTrue') ? 'Adding...' : 'Add as Minter'}
                  </button>
                  <button onClick={() => handleSetMinter(minterAddressInput, false)} disabled={!minterAddressInput || ((isWritePending || isConfirming) && currentActionInfo.type === 'setMinterFalse')} style={{ backgroundColor: '#dc3545' }}> {/* Red for remove */}
                    {((isWritePending || isConfirming) && currentActionInfo.type === 'setMinterFalse') ? 'Removing...' : 'Remove Minter'}
                  </button>
                  {setMinterStatus && <p><small style={{color: setMinterStatus.includes('✅') ? 'green' : (setMinterStatus.includes('⚠️') ? 'red' : '#333')}}>{setMinterStatus}</small></p>}
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4>Current Authorized Minters:</h4>
                  {isLoadingMinters && <p>Loading minters list...</p>}
                  {mintersError && <p style={{ color: 'red' }}>{mintersError}</p>}
                  {!isLoadingMinters && !mintersError && currentMinters.length === 0 && <p style={{fontStyle: 'italic'}}>No addresses are currently authorized as minters.</p>}
                  {!isLoadingMinters && !mintersError && currentMinters.length > 0 && (
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>{currentMinters.map(minter => <li key={minter}><small style={{fontFamily: 'monospace'}}>{minter}</small></li>)}</ul>
                  )}
                  <button onClick={() => setRefreshMintersTrigger(p => p + 1)} disabled={isLoadingMinters} style={{ marginTop: '10px' }}>Refresh Minters List</button>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color-dark)' }}>
                  <h4>Contract Paused State (PokemonCard)</h4>
                  {isLoadingPausedStatus && <p>Loading paused status...</p>}
                  {!isLoadingPausedStatus && (
                    <p>Currently: <strong>{isContractPaused ? 'PAUSED' : 'ACTIVE (Not Paused)'}</strong></p>
                  )}
                  <button
                    onClick={handlePauseContract}
                    disabled={isContractPaused || isLoadingPausedStatus || ((isWritePending || isConfirming) && currentActionInfo.type === 'pauseContract')}
                    style={{ backgroundColor: '#ffc107', marginRight: '10px', color: 'black' }} // Yellow for pause
                  >
                    {((isWritePending || isConfirming) && currentActionInfo.type === 'pauseContract') ? 'Pausing...' : 'Pause Contract'}
                  </button>
                  <button
                    onClick={handleUnpauseContract}
                    disabled={!isContractPaused || isLoadingPausedStatus || ((isWritePending || isConfirming) && currentActionInfo.type === 'unpauseContract')}
                    style={{ backgroundColor: '#17a2b8' }} // Teal for unpause
                  >
                    {((isWritePending || isConfirming) && currentActionInfo.type === 'unpauseContract') ? 'Unpausing...' : 'Unpause Contract'}
                  </button>
                  {pauseContractStatus && <p><small style={{color: pauseContractStatus.includes('✅') ? 'green' : (pauseContractStatus.includes('⚠️') ? 'red' : '#333')}}>{pauseContractStatus}</small></p>}
                </div>
              </div>
            )}

          {/* End of main content div for connected state */}
        </>
      )}
      {!currentNetworkConfig && account.status === 'connected' && (
        <p style={{ color: 'orange', fontWeight: 'bold' }}>
          ⚠️ Your wallet is connected to an unsupported network (Chain ID: {account.chainId}).
          Please switch to Localhost (31337) or Sepolia (11155111).
        </p>
      )}

    </div>
  )
}

export default App
