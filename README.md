# Decentralised Trading Platform

## Table of Contents
TODO




## Introduction

In this project, we developed a decentralised application (dApp) for trading Pokémon cards.  The project integrates blockchain technology with NFT concepts, requiring implementation of smart contracts, frontend development, and Web3 technologies integration. We deliver a complete, functional trading platform deployed on a local testnet. 

In this [README](README.md) we explain what our project does, how to use it and what the purpose of individual files are(the essential part of every README). 

We highly encourage the reader to also read our [WIKI](WIKI.md) where we delve deeper into our design choices and overall work process. We aim to allow the reader hopefully better understand design choices.

## Installation

TODO: @Matteo:

- Prerequisites (e.g. Node.js ≥ 14, Python ≥ 3.8)

- How to install dependencies

-  to build or compile

-  to run tests

## Smart Contracts

We implment two Solidity contracts:
- [PokemonCard.sol](contracts\PokemonCard.sol)
-  [TradingPlatform.sol](contracts\TradingPlatform.sol)

[TradingPlatform.sol](contracts\TradingPlatform.sol) incoporates [PokemonCard.sol](contracts\PokemonCard.sol) in the sense that one first deploys [PokemonCard.sol](contracts\PokemonCard.sol), receives its contract address and then calls (the constructor of) [TradingPlatform.sol](contracts\TradingPlatform.sol), giving the contract address of [PokemonCard.sol](contracts\PokemonCard.sol) as an input. Furthermore, [TradingPlatform.sol](contracts\TradingPlatform.sol) calls several functions of [PokemonCard.sol](contracts\PokemonCard.sol) in its own functions. 

## Frontend Development

## Security Considerations



 


