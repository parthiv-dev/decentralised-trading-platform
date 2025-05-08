# Decentralised Trading Platform

## Introduction

In this project, we developed a decentralised application (dApp) for trading Pokémon cards. The project integrates **blockchain technology** with **NFT concepts**, requiring implementation of [smart contracts](#smart-contracts), [frontend development](#frontend-development), and **Web3 technologies integration**. We deliver a complete, functional trading platform deployed on a local testnet. 

In this [README](README.md) we explain how set up and use our trading platform in [Setup Instructions](#setup-instructions) a provide a [technical documentation](#technical-documentation) of individual files (the essential part of every README). 

We highly encourage the reader to also read our [WIKI](WIKI.md) where we delve deeper into our design choices and overall work process. We aim to allow the reader hopefully better understand design choices.

## Setup Instructions

To run the Pokémon Card dApp locally, follow the steps in this section.

> Note: We faced some issues when trying to deploy and run on Firefox. We suggest that the user uses Chromium-based browsers.


### Prerequisites

* **Node.js & npm**: Download and install from [nodejs.org](https://nodejs.org/).
* **MetaMask**: Install the browser extension from [metamask.io](https://metamask.io/).

> **Tip for advanced testers:** For a deeper experience and to simulate multiple users, consider using separate browser profiles, each with MetaMask installed. More on this in the followin sections.
---

### 1. Backend (Smart Contracts)

> **Tip:** We recommend that the user has at least 3 separate windows when setting up the local deployment:
> - Setup Instructions (this page)
> - A browser window with the MetaMask account open in full-window mode
> - Terminal (with multiple tabs)

> ![alt text](screenshots_for_readme\image2.png)

First, clone/unzip the project folder and perform the following commands in the **project root** directory:

```bash
npm install
```

Compile the Solidity contracts:

```bash
npx hardhat compile
```

Start a local Hardhat node:

```bash
npx hardhat node
```

> Keep this terminal open — it runs your local blockchain on [http://127.0.0.1:8545](http://127.0.0.1:8545) (chain ID: 31337).

In a **new terminal**, deploy the contracts to the local network from the **project root** directory:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This updates `wagmi-project/src/contracts/deployedAddresses.json` with the deployed addresses.

---

### 2. Frontend (Next.js dApp)

Switch to the frontend folder in the same terminal:

```bash
cd wagmi-project
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000) to interact with the dApp. The compilation in the terminal will only start if you open the [localhost](http://localhost:3000)! The compilation will need ~1 minute.

---

### 3. MetaMask Configuration


##### 3.1. **Add Local Hardhat Network** in MetaMask:

- Open the MetaMask extension
- To get full-screen mode: Click on the **button with 3 dots** and select **Expand View**
- Click the **network selector button** in the top-left corner.
- Click on **+ Add a custom network**

Fill in the following specifications:
- **Network Name:** Hardhat Local
- **Default RPC URL:** [http://127.0.0.1:8545](http://127.0.0.1:8545)
- **Chain ID:** 31337
- **Currency Symbol:** PokeCoin

Now do the following:
- Select **Save**
- Click the **network selector button** in the top-left corner and select your newly created network "Hardhat Local"


##### 3.2. **Import Pre-Funded Accounts**

> **Tip:** If the user would like to simulate the interactive multi-user functionalities, we recommend creating multiple browser profiles, a metamask wallet for each browser profile and opening instances of [http://localhost:3000](http://localhost:3000) in each browser profile:

> ![alt text](screenshots_for_readme\image.png)

>**Note:** Having multiple browser profiles is not the same  as having browser windows!


**In each browser profile:**

1. Open Metamask and click on your current account (**Account 1** on the top by default). 
2. A page with the title "Select Account" should open up. On this page, select **+ Add account or hardware wallet**. 
3. Select **Import account**
4. Choose **Private Key** and paste one of the keys below (or any other private key from your Hardhat node terminal output).
5. Switch to the newly created account

> **Tip:** **Account #0** is the deployer and has administrative privileges (such as minting, authorising other minters, etc.). We recommend selecting **Account #0** for the first browser profile.

**Available accounts:**

* **#0**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
    **Private Key:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
* **#1**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
    **Private Key:** `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
* **#2**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
    **Private Key:** `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

MetaMask will now be connected to your local blockchain network named "Hardhat Local" with "PokeCoin" as your crypto currentcy.


---

### 5. Connect MetaMask to the Trading Platform

- Go to [http://localhost:3000](http://localhost:3000)
- You should see 4 buttons under **Connect**
- Select **MetaMask**
- Under Use your enabled networks, click **Edit**
- Select **Hardhat Local** only. You do not need any other networks.
 **Connect** your MetaMask with our Pokemon trading platform residing on [localhost](http://localhost:3000)

### 6. Trading Platform!

At the very top you are going to see some basic account and wallet information. Here you can also connect and disconnect you wallet.

Next, you will see the title, as well as your Pokémon contract and Trading Platform contract address. 

Underneath you will find the following tabs: 
- My Cards & Mint
- Marketplace
- Auctions
- Admin Panel (only for the contract owner at address #0)

We encourage the user to test the intuitive functionalities of the trading platform without providing step-by-step instructions!

#### My Cards & Mint

Here you can:
- Mint new Pokémon (if the user is the owner of the contract)
- View your Pokémon Cards
- Manage your cards, i.e. list them for fixed price sale or auctions
- Withdraw funds you made from (re-)selling Pokémons

#### Marketplace

Here you can:
- View Pokémon which have been listed for fixed price sale
- Buy Pokémon which other users have listed for fixed price sale

#### Auctions

Here you can:
- View Pokémon which have been listed for the auction
- Bid for Pokémon which other users have listed for fixed price sale
- Close the auction after expiry of the auction duration

>**Tip**: Set a low auction duration (e.g. 1 minute)

#### Admin Panel (only for the contract owner)

Here, the owner of the contract can 
- add/remove `_minters`
- Pause/unpause the contract for security purposes


---

### 7. Tests (Optional)

We have written a comprehensive test suite for both the [PokemonCard](#pokemoncard-contract) and the [TradingPlatform](#tradingplatform-contract) contract. You may find them in the [test](test) folder.

In a new terminal, in the **project root**, run the contract tests:

```bash
npx hardhat test
```
---
### 8. Batch Minting NFTs (Optional)

To batch mint Pokémon Card NFTs up to ID 100, run:

```bash
npx hardhat run scripts/BatchMintFromIPFS.js --network localhost
```

This script will mint all cards from ID 1 through 100 using metadata on IPFS. This will allow the user to view all 100 Pokémons on the trading platform without having to mint each one individually!


## Technical Documentation

> Note: Some of the links to files might not work on the tester's file system because of the switch of / and \. For Windows users, there should be no issues if this [README](README.md) is read on the local file system or on GitHub.

### Smart Contracts

We implement two Solidity contracts:
- [PokemonCard.sol](contracts/PokemonCard.sol): To **securely mint** Pokemon NFTs and **store comprehensive metadata for pokemon characteristics**
-  [TradingPlatform.sol](contracts/TradingPlatform.sol): To provide a trading platform for users to sell, auction and buy Pokemon NFTs.

We have focussed on **simplicity** and intuitive understanding of the contracts by **minimizing code redundancy** and adding **meaningful comments** to each important section.

#### PokemonCard Contract

[PokemonCard.sol](contracts/PokemonCard.sol) is an NFT contract for Pokemons based on the [OpenZeppelin ERC271 contract](https://docs.openzeppelin.com/contracts/4.x/erc721) contract for non-fungible tokens. In addition, we used the following extensions:


- [ERC721Burnable](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721Burnable): To enable token holders destroy their tokens.
- [ERC721Enumerable](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721Enumerable): To be able to call the `totalSupply()` function
- [ERC721Pausable](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721Pausable): To allow privileged accounts to pause the functionality marked as `whenNotPaused`. This is useful for emergency response when facing security issues.
- [ERC721URIStorage](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721URIStorage): To allow updating token URIs for individual token IDs.
- `Ownable`: To enable the contract owner of [TradingPlatform.sol](contracts/TradingPlatform.sol) to mint pokemon token i.e. authorize a single account for all privileged actions.

To be able to store **comprehensive metadata for Pokemon characteristics** we defined a Pokemon struct:

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

This struct was populated when minting a Pokemon NFT token by calling the constructor of [PokemonCard.sol](contracts/PokemonCard.sol). In addition, we stored the metadata and images of Pokémons in a decentralised IPFS. More on this in the section [IPFS integration for metadata storage](#ipfs-integration-for-metadata-storage)

**Access control** is ensured by: 
- the in-built `Ownable` (modifier)
- an auxiliary mapping `_minters` which maps user addresses to bool (true = allowed to mint; false = not allowed to mint)
- a modifier `onlyAuthorized` which checks if either of the above is true for a given user

**Secure minting** has been implemented by the use of the [OpenZeppelin ERC271 contract](https://docs.openzeppelin.com/contracts/4.x/erc721). Specifically, we used the modified `safeMint()` function.

#### TradingPlatform Contract

The [TradingPlatform.sol](contracts/TradingPlatform.sol) is, as the name says, a contract for the trading platform. Tokens can be listed for **fixed-price sales** and **auctions**. Consequently, other users can buy and bid respectively. Additionally, users can securely **withdraw** their earned funds, which they have earned by (re-)selling NFT tokens, to their wallet.

We have implemented **best practices for security** by making use of existing OpenZeppelin contracts:
- [IERC721Receiver](https://docs.openzeppelin.com/contracts/3.x/api/token/erc721#IERC721Receiver): To prevent tokens from becoming forever locked in contracts and support safe transfer of tokens from buyer to seller.
- [IERC721](https://docs.openzeppelin.com/contracts/3.x/api/token/erc721#IERC721): A required interface of an [ERC271 compliant contract](https://docs.openzeppelin.com/contracts/4.x/erc721).
- [ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard): To Protects functions marked `nonReentrant` against reentrancy attacks.
- [ERC721Pausable](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721#ERC721Pausable): To allow privileged accounts to pause the functionality marked as `whenNotPaused`. This is useful for emergency response when facing security issues.
- `Ownable`: To enable the contract owner of [TradingPlatform.sol](contracts/TradingPlatform.sol) to mint pokemon token i.e. authorize a single account for all privileged actions.

> **Difference between ERC721 & IERC721**: [ERC271](https://docs.openzeppelin.com/contracts/4.x/erc721) is the actual implementation standard for non-fungible tokens (NFTs), defining the rules and functions a smart contract must implement. [IERC721](https://docs.openzeppelin.com/contracts/3.x/api/token/erc721#IERC721), on the other hand, is the interface that specifies the functions and events expected to be present in a contract adhering to the ERC721 standard

### Interaction between PokemonCard & TradingPlatform

[TradingPlatform.sol](contracts/TradingPlatform.sol) incorporates [PokemonCard.sol](contracts/PokemonCard.sol) in the sense that one first deploys [PokemonCard.sol](contracts/PokemonCard.sol), receives its contract address and then calls (the constructor of) [TradingPlatform.sol](contracts/TradingPlatform.sol), giving the contract address of [PokemonCard.sol](contracts/PokemonCard.sol) as an input. Furthermore, [TradingPlatform.sol](contracts/TradingPlatform.sol) calls several functions of [PokemonCard.sol](contracts/PokemonCard.sol) in its own functions. 


### Frontend Development

TODO for 3.2 Front Development:
- Intuitive user interface
- Wallet connection functionality
- Comprehensive card marketplace and trading interface
- Proper Web3 integration through event listeners for contract updates, transaction  handling and wallet integration

TODO for 4.1 Development Environment:
- The development environment setup should be documented to ensure reproducibility

MATTEO!!!


### Security Considerations

- Protection against Reentrancy attacks (DONE)
- Access control using function modifiers and role-based access where necessary (DONE)
- IF front-running is a  concern (IS IT?) => a front-running prevention, e.g. through the implementation of commit-reveal schemes or similar mechanisms for sensitive operations (NOT DONE)

As mentioned in section on the [TradingPlatform Contract](#tradingplatform-contract), we protected the trading platform against **reentrancy attacks** by making use of OpenZeppelin's [ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard).

We also implement **access control** in [PokemonCard.sol](contracts/PokemonCard.sol) by using: 
- the in-built `Ownable` (modifier)
- an auxiliary mapping `_minters` which maps user addresses to bool (true = allowed to mint; false = not allowed to mint)
- a modifier `onlyAuthorized` which checks if either of the above is true for a given user

### Advanced Enhancements

#### IPFS integration for metadata storage

To be able to view images of Pokemons on the web-based trading trading platform we decided to integrate IPFS metadata storage. 

First, we searched for a complete data set of open-source Pokémon pictures. We found a [kaggle dataset](https://www.kaggle.com/datasets/arenagrenade/the-complete-pokemon-images-data-set) with 898 images of all the Pokémons taken from the Pokedex database. Each image is of the format "name.png". We decided that we want to work with the first 100 (alphabetical) Pokémons for simplicity. 

We also renamed the original image files from the [kaggle dataset](https://www.kaggle.com/datasets/arenagrenade/the-complete-pokemon-images-data-set) to "1.png", "2.png", etc, for simplicity later on when we call the files based on the tokenId of the respective pokemon mint. This was done using a [Python script](data\pokemon_images\number_img.py). We then uploaded the [folder](data\pokemon_images\byNumber), consisting of the 100 numbered images, to the [Pinata Cloud](https://pinata.cloud/) for easy access when minting on the blockchain.

For additional metadata for each Pokémon, we referred to the [PokeApi](https://pokeapi.co/). We wrote a [Python script](data\pokemon_get_data.py) which gets the metadata based on the filenames of the kaggle image data set and stores the data (numerical and non-numerical characteristics, and the IPFS link for each image) for each Pokemon in JSON files of [OpenSea format](https://docs.opensea.io/docs/metadata-standards). The files are purposefully named as "1.json", "2.json", etc., for the  same reason as before. The [folder](data\pokemon_metadata) with the JSON files was also uploaded to the [Pinata Cloud](https://pinata.cloud/).


[Pinata Cloud](https://pinata.cloud/) is a distributed storage platform used e.g. OpenSea to achieve secure, scalable storage with IPFS's decentralized infrastructure.

IMPORTANT NOTE: Since we integrated metadata storage through IPFS, there was theoretically no need to keep the initial Pokemon struct in the [PokemonCard.sol](contracts/PokemonCard.sol) contract! For simplicity and clarity, the Pokémon struct and associated functions were kept to enable proper functioning of the trading platform without IPFS integration. For reference, this is the Pokémon struct:

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

This struct was populated  by the constructor when minting a Pokémon NFT token.

## Demonstration

TODO for 3.4 Documentation and Presentation, 4.1 Development Environment
- Demonstrate core functionality + security features while explaining key technical decisions
- Comprehensive test suite

## Group Work Specifications

We worked closely together, spending hours on Discord calls to collaborate on this project.

Matteo:
- Leading frontend development
- Leading the making of the demonstration video

Parthiv:
- Leading backend (Solidity contracts, IPFS integration for metadata storage)
- Leading documentation of the codebase and ensuring code quality
- Leading documentation of work in [README](README.md) and [WIKI](WIKI.md)

## Use of GenAI

We used Github Co-Pilot, Gemini and ChatGPT for various tasks:
- Understanding of tasks and technical terms in the coursework description
- Simple code completion (especially for comments)
- Understanding of code, e.g. ERC721 contract of Open Zeppelin, thoroughly
- Finding mistakes in our handwritten code
- Extensively used for JavaScript scripts, test suites, deployment scripts and other work which involves more extensive typing than actual work

We did not use or barely used GenAI for:
- Implementing the actual contracts, e.g. PokemonCard.sol
- Writing this extensive [README](README.md)
- Finding the key learning and implementation objectives to be completed in the coursework

## Code Quality

We used the [Official Solidity style guide](https://soliditylang.org/) to the best of our abilities to have clean, readable code for the reader. We were also inspired by OpenZeppelin's way of commenting, e.g. [here](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol).

We implemented extensive **test coverage** for both the PokemonCard and the TradingPlatform contracts in the [test folder](test) to ensure proper **error handling** throughout the codebase. 

Lastly, we have focussed on **simplicity** and intuitive understanding of the contracts by **minimizing code redundancy** and adding **meaningful comments** to each important section.


## Conclusion

In this project we learned about Web3-integrated frontend applications, security best practices in DeFi development, and got an introduciton to NFT standards and token economics.
