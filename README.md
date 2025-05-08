# Decentralised Trading Platform

## Checklist (to be removed later)
See TODO in each paragraph!

**Have to implement AND explain each criteria in atleast 1 paragraph**

TODO for 4.2 Code Quality Standards:
- minimization of code redundancy
- proper implementation
of design patterns
- code readability and organization
- quality of comments and documentation
- test coverage
- follow [Official Solidity style guide](https://soliditylang.org/)
- Proper error handling throughout codebase


## Table of Contents
TODO




## Introduction

TODO for 1. Overview:
- blockchain technology
-NFT concepts
- Implementation of smart contracts
- Frontend development
- Web3 technologies integration
- Completed function trading platform deployed on local testnet

In this project, we developed a decentralised application (dApp) for trading Pokémon cards. The project integrates **blockchain technology** with **NFT concepts**, requiring implementation of [smart contracts](#smart-contracts), [frontend development](#frontend-development), and Web3 technologies integration. We deliver a complete, functional trading platform deployed on a local testnet. 

In this [README](README.md) we explain what our project does, how to use it and what the purpose of individual files are (the essential part of every README). 

We highly encourage the reader to also read our [WIKI](WIKI.md) where we delve deeper into our design choices and overall work process. We aim to allow the reader hopefully better understand design choices.

## Setup Instruction

TODO: @Matteo:

- Prerequisites
    - Metamask wallet
    - NPM
    - NPX
    - Hardhard
    - Anything which is needed for a third person to 

- How to install dependencies

Instructions for them:
In the root directory (c:\Users\Carti\Desktop\ETH\Bsc\6 Semester\DeFi\defi_trading_platform\):  
```Run npm install``` (for Hardhat dependencies).
Run npx hardhat compile (to compile contracts and generate artifacts/).  
```Run npx hardhat node``` (to start a local blockchain).
In a new terminal, run   
```npx hardhat run scripts/deploy.js --network localhost``` (to deploy contracts; this will update wagmi-project/src/contracts/deployedAddresses.json).
In the wagmi-project directory (c:\Users\Carti\Desktop\ETH\Bsc\6 Semester\DeFi\defi_trading_platform\wagmi-project\):  
```Run npm install```  (for frontend dependencies).  
```Run npm run dev```.
Configure their wallet to their local Hardhat node.

- How to to build or compile

- How to to run tests

## Architecture Overview + Technical Documentation

### Smart Contracts



We implment two Solidity contracts:
- [PokemonCard.sol](contracts\PokemonCard.sol): To **securly mint** Pokemon NFTs and store comprehensive **metadata** for pokemon characteristics
-  [TradingPlatform.sol](contracts\TradingPlatform.sol):

#### PokemonCard Contract

TODO for 3.1. Smart Contracts:
- NFT contract for Pokemon cards following ERC271 contract (DONE)
- Comprehensive metadata for Pokemon characteristics
- Secure minting functionalities
- Access control (DONE)

- Understanding of smart contract optimization
- Security best practices in implementation
- Simplicity

[PokemonCard.sol](contracts\PokemonCard.sol) is a NFT contract for Pokemons based on the [OpenZeppelin ERC271 contract](https://docs.openzeppelin.com/contracts/4.x/erc721) contract for non-fungible tokens. In addition we used following extensions:


- [ERC721Burnable](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721Burnable): To enable token holders destroy their tokens.
- [ERC721Enumerable](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721Enumerable): To be able to call the `totalSupply()` function
- [ERC721Pausable](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721Pausable): To allow privileged accounts to pause the functionality marked as `whenNotPaused`. This is useful for emergency response.
- [ERC721URIStorage](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721URIStorage): To allow updating token URIs for individual token IDs.
- `Ownable`: To enable the contract owner of [TradingPlatform.sol](contracts\TradingPlatform.sol) to mint pokemon token i.e. authorize a single account for all privileged actions.

To be able to store comprehensive metadata for Pokemon characteristics we defined a Pokemon struct:

```
    struct Pokemon {
        string name;
        uint256 hp;
        uint256 attack;
        uint256 defense;
        uint256 speed;
        string type1;
        string type2;
        uint256 special;
    }
```

This struct was populated when minting a Pokemon NFT token by calling constructor of [PokemonCard.sol](contracts\PokemonCard.sol). In addition, we stored the metadata and images of Pokemons in a decentralised IPFS. More on this in the section [IPFS integration for metadata storage](#ipfs-integration-for-metadata-storage)

**Access control** is ensured by: 
- the in-built Ownable (modifier)
- an auxilary mapping which maps user addresses to bool (true = allowed to mint; false = not allowed to mint)
- a modifier onlyAuthorized which check if either of the above is true for a given user

#### TradingPlatform Contract

TODO for 3.1. Smart Contracts:
- NFT contract for Pokemon cards following ERC271 contract
- Comprehensive metadata for Pokemon characteristics
- Secure minting functionalities
- Access control

- Card listing
- Fixed-price sales
- Auctions
- Secure withdrawal patterns
- Understanding of smart contract optimization
- Security best practices in implementation
- Simplicity

The [TradingPlatform.sol](contracts\TradingPlatform.sol) is as the name says a contract for the trading plaform where tokens can be listed for selling, auctioned and bought. Additionally, users are able to securily their earned funds (by buying and selling NFT tokens) to their wallet (Metamask). 

[TradingPlatform.sol](contracts\TradingPlatform.sol) incoporates [PokemonCard.sol](contracts\PokemonCard.sol) in the sense that one first deploys [PokemonCard.sol](contracts\PokemonCard.sol), receives its contract address and then calls (the constructor of) [TradingPlatform.sol](contracts\TradingPlatform.sol), giving the contract address of [PokemonCard.sol](contracts\PokemonCard.sol) as an input. Furthermore, [TradingPlatform.sol](contracts\TradingPlatform.sol) calls several functions of [PokemonCard.sol](contracts\PokemonCard.sol) in its own functions. 


### Frontend Development

TODO for 3.2 Front Development:
- Intuitive user interface
- Wallet connection functionality
- Comprehensive card marketplace and trading interface
- Proper Web3 integration through event listeners for contract updates, transation  handling and wallet integration

TODO for 4.1 Development Environment:
- development environment setup should be clearly documented to ensure reproducibility


### Security Considerations

- Protection against Reentrancy attacks
- Access control using function modifiers and role-base access where necessary
- IF front-running is concern (IS IT?) => afront-running prevention e.g. through the implementation of commit-reveal schemes or similar mechanisms for sensitive
operations

- 

### Advanced Enhancements

#### IPFS integration for metadata storage

To be able to view images of pokemons on the web-based trading trading platform we decided to integrate IPFS metadata storage. 

First, we searched for a complete data set of open-source Pokemon pictures. We found a [kaggle dataset](https://www.kaggle.com/datasets/arenagrenade/the-complete-pokemon-images-data-set) with 898 images of all the Pokemons taken from the Pokedex database. Each image is of the format "name.png". We decide that we want to work with the first 100 (alphabetic) Pokemons for simplicty. 

We also renamed the original image files from the [kaggle dataset](https://www.kaggle.com/datasets/arenagrenade/the-complete-pokemon-images-data-set) to "1.png", "2.png" etc. for simplicity later on when we call the files based on the tokenId of the respective pokemon mint. This was done using a [Python script](data\pokemon_images\number_img.py). We then uploaded the [folder](data\pokemon_images\byNumber) consisting of the 100 numbered images to the [Pinata Cloud](https://pinata.cloud/) for easy access when minting on the blockchain.

For additional metadata for each Pokemon we referred to the [PokeApi](https://pokeapi.co/). We wrote a [Python script](data\pokemon_get_data.py) which gets the metadata based on the filenames of the kaggle image data set and stores the data (numerical and non-numerical charecteristics, and the IPFS link for each image) for each Pokemon in JSON files of [OpenSea format](https://docs.opensea.io/docs/metadata-standards). The files are purposefully name as "1.json", "2.json" etc. for same reason as before. The [folder](data\pokemon_metadata) with the JSON files was also uploaded to the [Pinata Cloud](https://pinata.cloud/).


[Pinata Cloud](https://pinata.cloud/) is a distributed storage platform used e.g. OpenSea to achieve secure, scalable storage with IPFS's decentralized infrastructure.

IMPORTANT NOTE: Since we integreated metadata storage through IPFS there was no need to keep the initial Pokemon struct in the [PokemonCard.sol](contracts\PokemonCard.sol)! For simplicity and clarity the Pokemon struct and associated functions where removed. For reference this was the original Pokemon struct:

```
    struct Pokemon {
        string name;
        uint256 hp;
        uint256 attack;
        uint256 defense;
        uint256 speed;
        string type1;
        string type2;
        uint256 special;
    }
```

This struct was populated when minting a Pokemon NFT token by the constructor.

## Demonstration

TODO for 3.4 Documentation and Presentation, 4.1 Development Environment
- Demostrate core functionality + security features while explaining key technical decisions
- Comprehensive test suite

## Group Work Specifications

TODO for 6. Group Work Specifications
- clear documentation required for individual contributions
- distribution of work should be equitable and clearly documented in the project submissions

We worked closely together, spending hours on Discord calls to collaborate on this project.

Matteo:
- Leading frontend development ()
- Leading making of demonstration video

Parthiv:
- Leading backend (Solidity contracts, IPFS integration for metadata storage)
- Leading documentation of codebase and ensuring code quality
- Leading documentation of work in [README](README.md) and [WIKI](WIKI.md)

## Use of GenAI
TODO for 8. Use of GenAI:
- indicate which AI tools you have used

We used Github Co-Pilot, Gemini and ChatGPT for various tasks:
- Understanding of tasks and technical terms in the coursework description
- Simple code completion (especially for comments)
- Understanding of code e.g. ERC721 contract of Open Zeppelin thoroughly
- Finding mistakes in our hand-written code
- Extensively used for Python scripts, test suites, deployment scripts and other work which involves more extensive typing than actual work

We did not use or barely used GenAI for:
- Implementing the actual contracts e.g. PokemonCard.sol
- Writing this extensive [README](README.md)
- Finding the key learning and implementation objectives to be completed in the coursework

## Code Quality

TODO for 4.2 Code Quality Standards:
- minimization of code redundancy
- proper implementation
of design patterns
- code readability and organization
- quality of comments and documentation
- test coverage
- follow [Official Solidity style guide](https://soliditylang.org/)
- Proper error handling throughout codebase

We used the [Official Solidity style guide](https://soliditylang.org/) to the best of our abilities to have clean, readable code for the reader. We also inspired ourselves from OpenZeppelin's way of commenting e.g. [here](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol).





## Conclusion

TODO for 2. Learning Objectives:
- Web3-integrated frontend applications
- Security best practices in DeFi development
- Understanding NFT standards + token economics

