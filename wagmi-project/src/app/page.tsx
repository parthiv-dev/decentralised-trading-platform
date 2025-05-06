'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance, // For displaying ETH balance if needed, not directly for contract interaction here
  usePublicClient, // To get a public client for read operations
} from 'wagmi'
import { parseEther, formatEther } from 'viem' // For converting ETH values

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
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const [newName, setNewName] = useState('')
  const [userPokemonIds, setUserPokemonIds] = useState<string[]>([])
  const [listTokenId, setListTokenId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [isTokenApproved, setIsTokenApproved] = useState(false);

  const [mintStatus, setMintStatus] = useState('');
  const [approveStatus, setApproveStatus] = useState('');
  const [listStatus, setListStatus] = useState('');
  const [isLoadingTokenIds, setIsLoadingTokenIds] = useState(false);
  const [fetchTokenIdsError, setFetchTokenIdsError] = useState<string | null>(null);
  const publicClient = usePublicClient();

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
    query: {
      enabled: !!account.address && !!POKEMON_CARD_ADDRESS, // Only run if address and contract address are available
    },
  });

  // Read user's Pokemon token IDs (more complex due to loop in old code)
  // This effect will fetch token IDs one by one after balance is known
  useEffect(() => {
    const fetchTokenIds = async () => {
      if (!publicClient) {
        // console.warn("Public client not available for fetching token IDs yet.");
        setUserPokemonIds([]);
        return;
      }
      if (pokemonBalance === undefined || !account.address || !POKEMON_CARD_ADDRESS ) {
        setUserPokemonIds([]);
        return;
      }

      const balanceNum = Number(pokemonBalance);
      if (balanceNum === 0) {
        setUserPokemonIds([]);
        return;
      }

      setIsLoadingTokenIds(true);
      setFetchTokenIdsError(null);
      const ids: string[] = [];

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
        if (ids.length > 0 && !listTokenId) {
          setListTokenId(ids[0]); // Default to first token
        }
      } catch (e: any) {
        console.error("Error fetching token IDs:", e);
        setFetchTokenIdsError(`Failed to fetch token IDs: ${e.message || 'Unknown error'}`);
        setUserPokemonIds([]); // Clear IDs on error
      } finally {
        setIsLoadingTokenIds(false);
      }
    };

    if (account.status === 'connected' && POKEMON_CARD_ADDRESS) {
      fetchTokenIds();
    } else {
      setUserPokemonIds([]);
      setIsLoadingTokenIds(false);
      setFetchTokenIdsError(null);
    }
  }, [pokemonBalance, account.address, POKEMON_CARD_ADDRESS, account.status, publicClient, listTokenId]);

  // Check if the selected token is approved for the marketplace
  const { data: approvedAddress, refetch: refetchApprovalStatus, isLoading: isLoadingApprovalStatus } = useReadContract({
    abi: pokemonCardAbi,
    address: POKEMON_CARD_ADDRESS,
    functionName: 'getApproved',
    args: [listTokenId ? BigInt(listTokenId) : BigInt(0)], // Pass a valid BigInt, even if 0
    query: {
      enabled: !!listTokenId && !!POKEMON_CARD_ADDRESS && !!TRADING_PLATFORM_ADDRESS,
    },
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
    try {
      const placeholderURI = "ipfs://bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"; // Example from old code
      await writeContractAsync({
        abi: pokemonCardAbi,
        address: POKEMON_CARD_ADDRESS,
        functionName: 'safeMint',
        args: [account.address, placeholderURI],
      });
      // isConfirming and isConfirmed will update via useWaitForTransactionReceipt
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
        functionName: 'listCardForSale',
        args: [BigInt(listTokenId), priceInWei],
      });
    } catch (e: any) {
      setListStatus(`Listing failed: ${e.shortMessage || e.message}`);
      console.error(e);
    }
  };

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
        // TODO: Refresh marketplace listings (not implemented in this snippet)
        // For now, could also refetch user's tokens if listing removes it from their direct view
        // refetchBalance(); // If listing affects user's direct balance view
      }
      // Reset generic statuses after a short delay
      setTimeout(() => {
        if (mintStatus.includes('successful')) setMintStatus('');
        if (approveStatus.includes('approved')) setApproveStatus('');
        if (listStatus.includes('listed')) setListStatus('');
      }, 4000);
    } else if (confirmationError) {
        const errorMsg = `⚠️ Transaction failed: ${confirmationError.shortMessage || confirmationError.message}`;
        if (mintStatus.includes('Minting')) setMintStatus(errorMsg);
        if (approveStatus.includes('Approving')) setApproveStatus(errorMsg);
        if (listStatus.includes('Listing')) setListStatus(errorMsg);

        // Clear error messages after a longer delay
        setTimeout(() => {
          if (mintStatus.includes('failed')) setMintStatus('');
          if (approveStatus.includes('failed')) setApproveStatus('');
          if (listStatus.includes('failed')) setListStatus('');
        }, 7000);
    }
  // Dependencies for reacting to transaction state changes.
  // Status messages (mintStatus, etc.) are set inside, so they are not dependencies here.
  }, [isConfirmed, receipt, confirmationError, listTokenId, refetchBalance, refetchApprovalStatus]);

  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === 'connected' && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>

      {account.status === 'connected' && currentNetworkConfig && (
        <>
          <hr style={{ margin: '20px 0' }} />
          <div>
            <h2>Pokémon Card dApp ({currentNetworkConfig.name})</h2>
            <p>Pokemon Contract: {POKEMON_CARD_ADDRESS}</p>
            <p>Trading Platform: {TRADING_PLATFORM_ADDRESS}</p>

            {/* Mint Button */}
            <div style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
              <h3>Mint a Pokémon Card</h3>
              <button onClick={handleMint} disabled={isWritePending || isConfirming || mintStatus.includes('Minting...') || isLoadingTokenIds}>
                {isLoadingTokenIds ? 'Refreshing NFTs...' : isWritePending && mintStatus.includes('Minting') ? 'Sending to Wallet...' :
                 isConfirming && mintStatus.includes('Minting') ? 'Minting (Confirming...)' :
                 mintStatus || 'Mint Test NFT'}
              </button>
              {(writeError && mintStatus) && <p style={{ color: 'red' }}>Mint Error: {writeError.shortMessage || writeError.message}</p>}
            </div>

            {/* Owned NFTs and Listing */}
            <div style={{ margin: '10px 0', padding: '10px', border: '1px solid #eee' }}>
              <h3>Your Pokémon Cards</h3>
              {isLoadingBalance && <p>Loading your balance...</p>}
              {isLoadingTokenIds && <p>Fetching your token IDs...</p>}
              {fetchTokenIdsError && <p style={{ color: 'red' }}>{fetchTokenIdsError}</p>}
              {!isLoadingBalance && !isLoadingTokenIds && !fetchTokenIdsError && userPokemonIds.length > 0 ? (
                <>
                  <p>IDs: {userPokemonIds.join(', ')} (Balance: {pokemonBalance?.toString()})</p>
                  <h4>List a Card for Sale</h4>
                  <label htmlFor="token-select">Token ID: </label>
                  <select id="token-select" value={listTokenId} onChange={(e) => setListTokenId(e.target.value)}>
                    {userPokemonIds.map(id => <option key={id} value={id}>{id}</option>)}
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
                !isLoadingBalance && !isLoadingTokenIds && !fetchTokenIdsError && <p>You don't own any Pokémon NFTs yet. Try minting one!</p>
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
