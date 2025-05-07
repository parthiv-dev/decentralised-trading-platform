// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonCard is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Pausable, Ownable, ERC721Burnable {
    uint256 private _nextTokenId;

    // Struct to hold Pokemon metadata
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

    // Constructor to initialize the contract with the name and symbol of the token
    // and set the initial owner of the contract
    constructor(address initialOwner)
        ERC721("PokemonCard", "PKMN")
        Ownable(initialOwner)
    {}

    // Mapping from TokenId to Pokemon struct (metadata)
    mapping(uint256 => Pokemon) private _pokemons;

    // Mapping from user address to minter boolean
    mapping(address => bool) public _minters;

    // Modifier to check if the caller is authorized (owner or minter) to mint tokens
    modifier onlyAuthorized() {
        require(_minters[msg.sender] || owner() == msg.sender, "User not authorized");
        _;
    }

    // Modifier to check if the tokenId exists (is valid)
    modifier pokemonExists(uint256 tokenId) {
        // _nextTokenId is incremented *before* _safeMint is called with the *previous* value of _nextTokenId.
        // => valid tokenId must be less than the current _nextTokenId.
        // Also correctly handles the case where _nextTokenId is 0 (no tokens minted yet).
        require(tokenId > 0 && tokenId <= _nextTokenId, "PokemonCard: Query for nonexistent token ID.");
        _;
    }

    // Events for minting and setting minters
    event PokemonMinted(address minter, uint256 tokenId);
    event MinterSetTrue(address minter);
    event MinterSetFalse(address minter);

    // Function to set a user as a minter
    function setMinterTrue(address _addr) external onlyOwner {
        _minters[_addr] = true;
        emit MinterSetTrue(_addr);
    }

    // Function to remove a user as a minter
    function setMinterFalse(address _addr) external onlyOwner {
        _minters[_addr] = false;
        emit MinterSetFalse(_addr);
    }

    // Function to get the metadata of a Pokemon by its tokenId
    function getPokemon(uint256 tokenId) external view pokemonExists(tokenId) returns (Pokemon memory) {
        return _pokemons[tokenId];
    }

    // Function to get the ID that will be assigned to the next token minted
    function getNextTokenId() external view returns (uint256) {
        return _nextTokenId + 1;
    }
    
    // Secure minting functionality that allows only the authorized owner to mint new tokens
    function safeMint(
        address to,
        string memory uri, // IPFS URI for the JSON metadata file
        string memory _name,
        uint256 _hp,
        uint256 _attack,
        uint256 _defense,
        uint256 _speed,
        string memory _type1,
        string memory _type2,
        uint256 _special
    )
        public
        onlyAuthorized
        returns (uint256)
    {
        uint256 tokenId = ++_nextTokenId;
    
        // Store core stats on-chain. These could be useful for direct contract interactions
        // or simpler queries without fetching the full IPFS JSON.
        Pokemon memory pkmn = Pokemon({
            name: _name,
            hp: _hp,
            attack: _attack,
            defense: _defense,
            speed: _speed,
            type1: _type1,
            type2: _type2,
            special: _special
        });
        _pokemons[tokenId] = pkmn;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit PokemonMinted(msg.sender, tokenId);
        return tokenId;
    }

    // Function to pause the contract (only owner)
    function pause() public onlyOwner {
        _pause();
    }

    // Function to unpause the contract (only owner)
    function unpause() public onlyOwner {
        _unpause();
    }


    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable, ERC721Pausable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
