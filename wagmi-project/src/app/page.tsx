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
import { parseEther, formatEther, parseAbiItem } from 'viem'; // For converting ETH values and parsing event ABI
import { AccountConnect } from '../components/AccountConnect'; // New
import { MintCardForm } from '../components/MintCardForm';   // New
import { PokemonJsonData, DisplayPokemonData } from '../interfaces'; // New

// --- IMPORTANT: REPLACE THESE WITH YOUR ACTUAL ABIs ---
const pokemonCardAbi = [
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

const tradingPlatformAbi = [
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
    pokemonCardAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
    tradingPlatformAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as `0x${string}`,
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
  const [ownedPokemonDetails, setOwnedPokemonDetails] = useState<DisplayPokemonData[]>([]);
  const [listTokenId, setListTokenId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [isTokenApproved, setIsTokenApproved] = useState(false);

  // New state for minting
  const [mintPokemonIdInput, setMintPokemonIdInput] = useState('1'); // Default to Pokemon ID 1
  const [mintStatus, setMintStatus] = useState('');

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
  const [refreshMarketplaceTrigger, setRefreshMarketplaceTrigger] = useState(0);

  // Determine current network's contract addresses
  const currentNetworkConfig = account.chainId ? contractAddresses[account.chainId as keyof typeof contractAddresses] : null;
  const POKEMON_CARD_ADDRESS = currentNetworkConfig?.pokemonCardAddress;
  const TRADING_PLATFORM_ADDRESS = currentNetworkConfig?.tradingPlatformAddress;

  // --- Wagmi Hooks for Contract Interactions ---
  const { writeContractAsync, data: writeTxHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt, error: confirmationError } = useWaitForTransactionReceipt({
    hash: writeTxHash,
  });

  // Read user's Pokemon balance
  const { data: pokemonBalance, refetch: refetchBalance, isLoading: isLoadingBalance } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'balanceOf',
    args: [account.address!], // Ensure account.address is defined
    enabled: !!account.address && !!POKEMON_CARD_ADDRESS, // Only run if address and contract address are available
  });

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
    pokemonCardAddr: `0x${string}`
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
        // console.warn("Public client not available for fetching token IDs yet.");
        setUserPokemonIds([]);
        setOwnedPokemonDetails([]);
        return;
      }
      if (pokemonBalance === undefined || !account.address || !POKEMON_CARD_ADDRESS ) {
        setUserPokemonIds([]);
        setOwnedPokemonDetails([]);
        return;
      }

      const balanceNum = Number(pokemonBalance);
      if (balanceNum === 0) {
        setUserPokemonIds([]);
        setOwnedPokemonDetails([]);
        return;
      }

      setIsLoadingTokenIds(true);
      setFetchTokenIdsError(null);
      const ids: string[] = [];

      // Fetching token IDs
      try {
        for (let i = 0; i < balanceNum; i++) {
          const tokenIdResult = await publicClient.readContract({
            abi: pokemonCardAbi,
            address: POKEMON_CARD_ADDRESS!,
            functionName: 'tokenOfOwnerByIndex',
            args: [account.address!, BigInt(i)],
          });
          // Ensure tokenIdResult is not undefined and can be converted to string
          if (typeof tokenIdResult === 'bigint' || typeof tokenIdResult === 'number') {
            ids.push(tokenIdResult.toString());
          } else {
            // Handle cases where tokenOfOwnerByIndex might not return a simple number/bigint
            // or if the type is unexpected. For now, we'll log and skip.
            console.warn(`Unexpected token ID format for index ${i}:`, tokenIdResult);
          }
        }
        setUserPokemonIds(ids);
      } catch (e: any) {
        console.error("Error fetching token IDs (tokenOfOwnerByIndex):", e);
        setFetchTokenIdsError(`Failed to fetch token IDs: ${e.message || 'Unknown error'}`);
        setUserPokemonIds([]); // Clear IDs on error
        setOwnedPokemonDetails([]);
        setIsLoadingTokenIds(false);
        return; // Stop if IDs couldn't be fetched
      }

      // Fetching full details for each token ID
      if (ids.length > 0) {
        try {
          const detailsPromises = ids.map(id =>
            fetchPokemonDisplayData(id, publicClient, POKEMON_CARD_ADDRESS!)
          );
          const resolvedDetails = (await Promise.all(detailsPromises)).filter(d => d !== null) as DisplayPokemonData[];
          setOwnedPokemonDetails(resolvedDetails);

          if (resolvedDetails.length > 0) {
            if (!listTokenId || !resolvedDetails.some(p => p.tokenId === listTokenId)) {
              setListTokenId(resolvedDetails[0].tokenId);
            }
          } else {
            setListTokenId('');
          }
        } catch (e: any) {
            console.error("Error fetching Pokemon details for owned tokens:", e);
            setFetchTokenIdsError(`Failed to fetch Pokemon details: ${e.message || 'Unknown error'}`);
            setOwnedPokemonDetails([]);
        }
      } else {
        // This case handles if the ids array is empty after attempting to fetch them.
        // For example, if balanceNum > 0 but tokenOfOwnerByIndex didn't yield any valid IDs,
        // or if the initial fetch of IDs failed and cleared the ids array.
        setOwnedPokemonDetails([]);
        setListTokenId(''); // Also clear listTokenId if there are no details to show
      }
    } finally {
        setIsLoadingTokenIds(false);
      }
    };

    fetchTokenIds();
  }, [pokemonBalance, account.address, POKEMON_CARD_ADDRESS, account.status, publicClient, refetchBalance]); // Added refetchBalance as it signals a change

  // Check if the selected token is approved for the marketplace
  const { data: approvedAddress, refetch: refetchApprovalStatus, isLoading: isLoadingApprovalStatus } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'getApproved',
    args: [listTokenId ? BigInt(listTokenId) : BigInt(0)], // Pass a valid BigInt, even if 0
    enabled: !!listTokenId && !!POKEMON_CARD_ADDRESS && !!TRADING_PLATFORM_ADDRESS, // `enabled` is a top-level option
  });

  useEffect(() => {
    if (approvedAddress && TRADING_PLATFORM_ADDRESS) {
      setIsTokenApproved(approvedAddress.toLowerCase() === TRADING_PLATFORM_ADDRESS.toLowerCase());
    } else {
      setIsTokenApproved(false);
    }
  }, [approvedAddress, TRADING_PLATFORM_ADDRESS]);


  // --- Transaction Functions ---
  const handleMint = async () => {
    if (!POKEMON_CARD_ADDRESS || !account.address) {
      alert("Please connect your wallet and ensure you are on a supported network.");
      return
    }
    setMintStatus('Minting...');
    if (!mintPokemonIdInput || isNaN(parseInt(mintPokemonIdInput)) || parseInt(mintPokemonIdInput) < 1 || parseInt(mintPokemonIdInput) > 100) {
      setMintStatus("Please enter a valid Pokemon ID (1-100).");
      return;
    }

    try {
      // 1. Construct metadata URI and fetch JSON
      const metadataIpfsUri = `ipfs://${IPFS_METADATA_CID}/${mintPokemonIdInput}.json`;
      const resolvedMetadataUrl = resolveIpfsUri(metadataIpfsUri);
      if (!resolvedMetadataUrl) throw new Error("Could not resolve IPFS metadata URL.");

      const response = await fetch(resolvedMetadataUrl);
      if (!response.ok) throw new Error(`Failed to fetch Pokemon metadata from IPFS (ID: ${mintPokemonIdInput})`);
      const jsonData: PokemonJsonData = await response.json();

      // 2. Parse stats from JSON
      const name = jsonData.name;
      const hp = BigInt(getStatFromJsonAttributes(jsonData.attributes, "HP"));
      const attack = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Attack"));
      const defense = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Defense"));
      const speed = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Speed"));
      const type1 = getStatFromJsonAttributes(jsonData.attributes, "Type 1", false);
      let type2 = getStatFromJsonAttributes(jsonData.attributes, "Type 2", false);
      if (type2 === 0) type2 = ""; // Ensure type2 is empty string if not found or numeric 0
      const special = BigInt(getStatFromJsonAttributes(jsonData.attributes, "Special"));

      if (!name || !type1) {
        throw new Error("Essential Pokemon data (name, type1) missing from metadata.");
      }

      // 3. Call safeMint
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'safeMint',
        args: [account.address, metadataIpfsUri, name, hp, attack, defense, speed, type1, type2, special],
      });
    } catch (e: any) {
      setMintStatus(`Minting failed: ${e.shortMessage || e.message}`);
      console.error(e);
    }
  };

  const handleApprove = async () => {
    if (!POKEMON_CARD_ADDRESS || !TRADING_PLATFORM_ADDRESS || !listTokenId) {
      alert("Please select a token and ensure contract addresses are available.");
      return;
    }
    setApproveStatus(`Approving token ${listTokenId}...`);
    try {
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'approve',
        args: [TRADING_PLATFORM_ADDRESS, BigInt(listTokenId)],
      });
    } catch (e: any) {
      setApproveStatus(`Approval failed: ${e.shortMessage || e.message}`);
      console.error(e);
    }
  };

  const handleListCard = async () => {
    if (!TRADING_PLATFORM_ADDRESS || !listTokenId || !listPrice || !isTokenApproved) {
      alert("Ensure token is selected, price is set, and token is approved.");
      return;
    }
    setListStatus(`Listing token ${listTokenId} for ${listPrice} ETH...`);
    try {
      const priceInWei = parseEther(listPrice);
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'listItem',
        args: [BigInt(listTokenId), priceInWei],
      });
    } catch (e: any) {
      setListStatus(`Listing failed: ${e.shortMessage || e.message}`);
      console.error(e);
    }
  };

  const handleBuyItem = async (listingId: string, priceInWei: bigint) => {
    if (!TRADING_PLATFORM_ADDRESS || !account.address) {
      alert("Please connect your wallet and ensure contract addresses are available.");
      return;
    }
    setBuyStatus(`Buying item ${listingId}...`);
    try {
      await writeContractAsync({
        abi: tradingPlatformAbi,
        address: TRADING_PLATFORM_ADDRESS,
        functionName: 'buyItem',
        args: [BigInt(listingId)],
        value: priceInWei, // Send ETH with the transaction
      });
    } catch (e: any) {
      setBuyStatus(`Buy failed for item ${listingId}: ${e.shortMessage || e.message}`);
      console.error(e);
    }
  };

  const handleBurn = async (tokenIdToBurn: string) => {
    if (!POKEMON_CARD_ADDRESS || !account.address) {
      alert("Please connect your wallet and ensure contract addresses are available.");
      return;
    }
    setBurnStatus(`Burning token ${tokenIdToBurn}...`);
    try {
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'burn',
        args: [BigInt(tokenIdToBurn)],
      });
    } catch (e: any) {
      setBurnStatus(`Burn failed for token ${tokenIdToBurn}: ${e.shortMessage || e.message}`);
      console.error(e);
    }
  };


 // Watch for ItemSold events to notify the seller
 useWatchContractEvent({
  address: TRADING_PLATFORM_ADDRESS,
  abi: tradingPlatformAbi,
  eventName: 'ItemSold',
  enabled: !!TRADING_PLATFORM_ADDRESS && !!account.address, // Only watch when relevant data is available
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
      if (args.seller && account.address && args.seller.toLowerCase() === account.address.toLowerCase()) {
        // This user is the seller of the item that was just sold
        const message = `🎉 Your item (Token ID: ${args.tokenId?.toString()}) was sold for ${args.price ? formatEther(args.price) : 'N/A'} ETH! Listing ID: ${args.listingId?.toString()}`;
        
        // Mark this log as processed BEFORE showing the alert
        processedItemSoldLogIds.current.add(logId);
        
        alert(message); // Simple alert for now, could be a more sophisticated notification
        console.log(message);

        // Optionally, trigger a refresh of data relevant to the seller
        refetchBalance(); // Seller's ETH balance might change due to pending withdrawals
        setRefreshMarketplaceTrigger(prev => prev + 1); // Refresh general marketplace view
      }
    });
  },
});

  // Effect to fetch marketplace listings
  useEffect(() => {
    const fetchListings = async () => {
      if (!publicClient || !TRADING_PLATFORM_ADDRESS || !POKEMON_CARD_ADDRESS) {
        setMarketplaceListings([]);
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
          setMarketplaceListings([]);
          setIsLoadingMarketplace(false);
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
          setMarketplaceListings([]);
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
        setMarketplaceListings([]);
      } finally {
        setIsLoadingMarketplace(false);
      }
    };
    fetchListings();
  }, [account.status, TRADING_PLATFORM_ADDRESS, POKEMON_CARD_ADDRESS, publicClient, refreshMarketplaceTrigger]);

  // Effect for auto-refreshing marketplace listings periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('[Marketplace Auto-Refresh] Triggering marketplace refresh.');
      setRefreshMarketplaceTrigger(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(intervalId); // Clear interval on component unmount
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Effect to handle transaction confirmation feedback and refetch data
  useEffect(() => {
    if (isConfirmed && receipt) {
      // A transaction was confirmed. Determine what it was and update UI.
      if (mintStatus.includes('Minting')) {
        setMintStatus('✅ Mint successful!');
        refetchBalance(); // This will trigger the useEffect to fetch token IDs
      }
      if (approveStatus.includes('Approving')) {
        setApproveStatus(`✅ Token ${listTokenId} approved!`);
        refetchApprovalStatus(); // Re-check approval status
      }
      if (listStatus.includes('Listing')) {
        setListStatus(`✅ Token ${listTokenId} listed!`);
        // After listing, the token is still owned by the user but is approved and marked as listed in the platform.
        // We should re-check its approval status and potentially refresh the list of owned tokens,
        // especially if the UI logic changes to filter out or differently display listed tokens.
        refetchApprovalStatus();
        refetchBalance(); // This will re-trigger fetching token IDs.
        setRefreshMarketplaceTrigger(prev => prev + 1); // Refresh marketplace
      }
      if (buyStatus.includes('Buying')) {
        setBuyStatus(`✅ Item bought successfully!`);
        setRefreshMarketplaceTrigger(prev => prev + 1); // Refresh marketplace
        refetchBalance(); // Buyer's NFT balance and ETH balance changed
      }
      if (burnStatus.includes('Burning')) {
        setBurnStatus(`✅ Token burned successfully!`);
        refetchBalance(); // Refresh user's NFT list
        // If the burned token was selected for listing, clear it
      }
      // Reset generic statuses after a short delay
      setTimeout(() => {
        if (mintStatus.includes('successful')) setMintStatus('');
        if (approveStatus.includes('approved')) setApproveStatus('');
        if (listStatus.includes('listed')) setListStatus('');
        if (buyStatus.includes('successful')) setBuyStatus('');
        if (burnStatus.includes('successfully')) setBurnStatus('');
      }, 4000);
    } else if (confirmationError) {
        const errorMsg = `⚠️ Transaction failed: ${confirmationError.shortMessage || confirmationError.message}`;
        if (mintStatus.includes('Minting')) setMintStatus(errorMsg);
        if (approveStatus.includes('Approving')) setApproveStatus(errorMsg);
        if (listStatus.includes('Listing')) setListStatus(errorMsg);
        if (buyStatus.includes('Buying')) setBuyStatus(errorMsg);
        if (burnStatus.includes('Burning')) setBurnStatus(errorMsg);

        // Clear error messages after a longer delay
        setTimeout(() => {
          if (mintStatus.includes('failed')) setMintStatus('');
          if (approveStatus.includes('failed')) setApproveStatus('');
          if (listStatus.includes('failed')) setListStatus('');
          if (buyStatus.includes('failed')) setBuyStatus('');
          if (burnStatus.includes('failed')) setBurnStatus('');
        }, 7000);
    }
  // Dependencies for reacting to transaction state changes.
  // Status messages (mintStatus, etc.) are set inside, so they are not dependencies here.
  // `listTokenId` is included because it's used in status messages.
  // `refetchBalance` and `refetchApprovalStatus` are stable functions from wagmi hooks.
  // The actual status strings are included to ensure the effect re-evaluates if a similar action is retried.
  }, [isConfirmed, receipt, confirmationError, listTokenId, refetchBalance, refetchApprovalStatus, mintStatus, approveStatus, listStatus, buyStatus, burnStatus]);

  return (
    <>
      <div>
        <AccountConnect />
      </div>

      {account.status === 'connected' && currentNetworkConfig && (
        <>
          <hr style={{ margin: '20px 0' }} />
          <div>
            <h2>Pokémon Card dApp ({currentNetworkConfig.name})</h2>
            <p>Pokemon Contract: {POKEMON_CARD_ADDRESS}</p>
            <p>Trading Platform: {TRADING_PLATFORM_ADDRESS}</p>

            <MintCardForm
              mintPokemonIdInput={mintPokemonIdInput}
              setMintPokemonIdInput={setMintPokemonIdInput}
              onMint={handleMint}
              mintStatus={mintStatus}
              isMintingInProgress={(isWritePending || isConfirming) && mintStatus.includes('Minting')}
              isLoadingTokenIds={isLoadingTokenIds}
              mintingError={writeError && mintStatus.includes('Minting') ? writeError : null}
            />

            {/* Owned NFTs and Listing */}
            <div style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
              <h3>Your Pokémon Cards</h3>
              {(isLoadingBalance && !pokemonBalance) && <p>Loading your balance...</p>}
              {isLoadingTokenIds && <p>Fetching your token IDs...</p>}
              {fetchTokenIdsError && <p style={{ color: 'red' }}>{fetchTokenIdsError}</p>}
              {!isLoadingTokenIds && !fetchTokenIdsError && ownedPokemonDetails.length > 0 ? (
                <>
                  <p>Balance: {pokemonBalance?.toString()}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                    {ownedPokemonDetails.map(pokemon => (
                      <div key={pokemon.tokenId} style={{ border: '1px solid #ddd', padding: '10px', width: '200px' }}>
                        {pokemon.imageUrl && <img src={pokemon.imageUrl} alt={pokemon.name} style={{ maxWidth: '100%', height: 'auto', marginBottom: '5px' }} />}
                        <strong>{pokemon.name} (ID: {pokemon.tokenId})</strong>
                        <p style={{fontSize: '0.8em', margin: '2px 0'}}>HP: {pokemon.hp}, Atk: {pokemon.attack}, Def: {pokemon.defense}</p>
                        <p style={{fontSize: '0.8em', margin: '2px 0'}}>Speed: {pokemon.speed}, Special: {pokemon.special}</p>
                        <p style={{fontSize: '0.8em', margin: '2px 0'}}>Types: {pokemon.type1}{pokemon.type2 ? ` / ${pokemon.type2}` : ''}</p>
                        <button
                          onClick={() => handleBurn(pokemon.tokenId)}
                          disabled={isWritePending || isConfirming || (burnStatus.includes('Burning') && burnStatus.includes(pokemon.tokenId))}
                          style={{ marginTop: '5px', width: '100%' }}
                        >
                          { (isWritePending && burnStatus.includes(pokemon.tokenId)) ? 'Sending...' : (isConfirming && burnStatus.includes(pokemon.tokenId)) ? 'Confirming Burn...' : `Burn Token ${pokemon.tokenId}` }
                        </button>
                      <button
                      </div>
                    ))}
                    {burnStatus && <p><small>{burnStatus}</small></p>}
                  </div>
                  <h4 style={{marginTop: '15px'}}>List a Card for Sale</h4>
                  <label htmlFor="token-select">Token ID: </label>
                  <select id="token-select" value={listTokenId} onChange={(e) => setListTokenId(e.target.value)}>
                    {ownedPokemonDetails.map(p => <option key={p.tokenId} value={p.tokenId}>{p.name} (ID: {p.tokenId})</option>)}
                  </select>
                  <br />
                  <label htmlFor="price-input">Price (ETH): </label>
                  <input id="price-input" type="text" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="e.g., 0.1" />
                  <br />
                  <button
                    onClick={handleApprove}
                    disabled={!listTokenId || isTokenApproved || isWritePending || isConfirming || isLoadingApprovalStatus || approveStatus.includes('Approving')}
                  >
                    {isLoadingApprovalStatus ? 'Checking Approval...' :
                     isTokenApproved ? '✅ Approved' :
                     (isWritePending && approveStatus.includes('Approving')) ? 'Sending to Wallet...' :
                     (isConfirming && approveStatus.includes('Approving')) ? 'Approving (Confirming...)' :
                     approveStatus || '1. Approve Marketplace'}
                  </button>
                  <button
                    onClick={handleListCard}
                    disabled={!listTokenId || !listPrice || !isTokenApproved || isWritePending || isConfirming || listStatus.includes('Listing')}
                  >
                    {(isWritePending && listStatus.includes('Listing')) ? 'Sending to Wallet...' :
                     (isConfirming && listStatus.includes('Listing')) ? 'Listing (Confirming...)' :
                     listStatus || '2. List Card'}
                  </button>
                  {(writeError && (approveStatus || listStatus)) && <p style={{ color: 'red' }}>Tx Error: {writeError.shortMessage || writeError.message}</p>}
                  {approveStatus && !approveStatus.includes('Approving') && !isTokenApproved && <p><small>{approveStatus}</small></p>}
                  {listStatus && !listStatus.includes('Listing') && <p><small>{listStatus}</small></p>}
                </>
              ) : (
                !isLoadingTokenIds && !fetchTokenIdsError && <p>You don't own any Pokémon NFTs yet. Try minting one!</p>
              )}
            </div>

            {/* Transaction Status Area */}
            {(isWritePending || isConfirming) && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0' }}>
                <h4>Transaction Status</h4>
                {isWritePending && <p>Sending transaction to your wallet...</p>}
                {writeTxHash && <p>Transaction Hash: {writeTxHash}</p>}
                {isConfirming && <p>Waiting for confirmation...</p>}
              </div>
            )}
            <div>
              <hr style={{ margin: '20px 0' }} />
              <h2>Marketplace Listings</h2>
              <button onClick={() => setRefreshMarketplaceTrigger(prev => prev + 1)} disabled={isLoadingMarketplace}>
                {isLoadingMarketplace ? 'Refreshing Marketplace...' : 'Refresh Marketplace'}
              </button>

              {/* Display loading or error messages */}
              {/* The "Refreshing..." message will show above the list if it's a refresh */}
              {isLoadingMarketplace && marketplaceListings.length > 0 && <p>Refreshing marketplace data...</p>}
              {/* The "Loading..." message will show if it's an initial load (no items yet) */}
              {isLoadingMarketplace && marketplaceListings.length === 0 && <p>Loading marketplace...</p>}
              {marketplaceError && <p style={{ color: 'red' }}>{marketplaceError}</p>}

              {/* Display "No items" message only if not loading, no error, and list is truly empty */}
              {!isLoadingMarketplace && !marketplaceError && marketplaceListings.length === 0 &&  (
                <p>No items currently listed in the marketplace.</p>
              )}

              {/* Display the list if it has items. Apply opacity effect during refresh. */}
              {/* This section will remain visible even if isLoadingMarketplace is true, showing old items until new ones arrive. */}
              {marketplaceListings.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px',
                  marginTop: '10px',
                  opacity: isLoadingMarketplace ? 0.6 : 1, // Fade slightly during refresh
                  transition: 'opacity 0.3s ease-in-out', // Smooth transition for opacity
                }}>
                  {marketplaceListings.map((item) => (
                    <div key={item.listingId} style={{ border: '1px solid #ccc', padding: '15px', width: '250px' }}>
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
                        <button
                          onClick={() => handleBuyItem(item.listingId, item.priceInWei)}
                          disabled={isWritePending || isConfirming || (buyStatus.includes('Buying') && buyStatus.includes(item.listingId))}
                        >
                          {(isWritePending && buyStatus.includes(item.listingId)) ? 'Sending...' :
                           (isConfirming && buyStatus.includes(item.listingId)) ? 'Confirming Buy...' :
                           (buyStatus.includes(item.listingId) && buyStatus.includes('failed')) ? 'Buy Failed - Retry?' :
                           'Buy Now'}
                        </button>
                      )}
                      {buyStatus.includes(item.listingId) && !buyStatus.includes('Buying') && <p><small>{buyStatus.replace(`item ${item.listingId}`, 'this item')}</small></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {!currentNetworkConfig && account.status === 'connected' && (
        <p style={{ color: 'orange', fontWeight: 'bold' }}>
          ⚠️ Your wallet is connected to an unsupported network (Chain ID: {account.chainId}).
          Please switch to Localhost (31337) or Sepolia (11155111).
        </p>
      )}
    </>
  )
}

export default App
