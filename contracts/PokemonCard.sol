// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
/**
 * @title PokemonCard NFT Contract
 * @author DeFi Coursework Group Matteo & Parthiv
 * @notice This contract manages the creation and ownership of Pokemon Card NFTs.
 * @dev It implements ERC721 with extensions for enumerability, URI storage, pausable transfers,
 * burnable tokens, and ownable access control.
 */
contract PokemonCard is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Pausable, Ownable, ERC721Burnable {
    /// @notice Counter for the next token ID to be minted. Starts at 0, so the first token ID is 1.
    uint256 private _nextTokenId;

    /// @notice Mapping from a keccak256 hash of on-chain metadata to a boolean indicating if it has been used.
    mapping(bytes32 => bool) private _usedMetadataHashes;

    /**
     * @dev Struct to hold on-chain Pokemon metadata.
     * @param name The name of the Pokemon.
     * @param hp Hit Points of the Pokemon.
     * @param attack Attack stat of the Pokemon.
     * @param defense Defense stat of the Pokemon.
     * @param speed Speed stat of the Pokemon.
     * @param type1 Primary type of the Pokemon (e.g., "Fire", "Water").
     * @param type2 Secondary type of the Pokemon (e.g., "Flying", can be empty).
     * @param special Special Attack/Defense stat of the Pokemon.
     */
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

    /**
     * @notice Initializes the contract, setting the token name, symbol, and the initial owner.
     * @param initialOwner The address that will initially own this contract and have administrative privileges.
     */
    constructor(address initialOwner)
        ERC721("PokemonCard", "PKMN")
        Ownable(initialOwner)
    {}

    /// @notice Mapping from a token ID to its on-chain Pokemon metadata.
    mapping(uint256 => Pokemon) private _pokemons;

    /// @notice Mapping from an address to a boolean indicating if it's an authorized minter.
    /// @dev Public visibility creates a getter function `_minters(address) returns (bool)`.
    mapping(address => bool) public _minters;

    /**
     * @dev Modifier to restrict access to functions to only authorized minters or the contract owner.
     * An operation is authorized if `msg.sender` is true in the `_minters` mapping or is the current `owner()`.
     */
    modifier onlyAuthorized() {
        require(_minters[msg.sender] || owner() == msg.sender, "User not authorized");
        _;
    }

    /**
     * @dev Modifier to check if a `tokenId` corresponds to an existing, minted token.
     * @param tokenId The ID of the token to check.
     */
    modifier pokemonExists(uint256 tokenId) {
        // `_nextTokenId` holds the ID of the last token minted.
        // Valid token IDs are from 1 up to `_nextTokenId`.
        require(tokenId > 0 && tokenId <= _nextTokenId, "PokemonCard: Query for nonexistent token ID.");
        _;
    }

    /// @notice Emitted when a new Pokemon card NFT is minted.
    /// @param minter The address that initiated the minting process.
    /// @param tokenId The ID of the newly minted token.
    event PokemonMinted(address minter, uint256 tokenId);

    /// @notice Emitted when an address is granted minter privileges.
    /// @param minter The address that was set as a minter.
    event MinterSetTrue(address minter);

    /// @notice Emitted when an address has its minter privileges revoked.
    /// @param minter The address that was removed as a minter.
    event MinterSetFalse(address minter);

    /**
     * @notice Grants minter privileges to a specified address.
     * @dev Can only be called by the contract owner. Emits a {MinterSetTrue} event.
     * @param _addr The address to grant minter privileges to.
     */
    function setMinterTrue(address _addr) external onlyOwner {
        _minters[_addr] = true;
        emit MinterSetTrue(_addr);
    }

    /**
     * @notice Revokes minter privileges from a specified address.
     * @dev Can only be called by the contract owner. Emits a {MinterSetFalse} event.
     * @param _addr The address to revoke minter privileges from.
     */
    function setMinterFalse(address _addr) external onlyOwner {
        _minters[_addr] = false;
        emit MinterSetFalse(_addr);
    }

    /**
     * @notice Retrieves the on-chain metadata for a specific Pokemon token.
     * @dev Requires the `tokenId` to exist.
     * @param tokenId The ID of the token whose metadata is being queried.
     * @return Pokemon memory A struct containing the on-chain attributes of the Pokemon.
     */
    function getPokemon(uint256 tokenId) external view pokemonExists(tokenId) returns (Pokemon memory) {
        return _pokemons[tokenId];
    }

    /**
     * @notice Gets the token ID that will be assigned to the next token minted.
     * @return uint256 The ID for the next token.
     */
    function getNextTokenId() external view returns (uint256) {
        return _nextTokenId + 1;
    }
    
    /**
     * @notice Mints a new Pokemon card NFT and assigns it to the `to` address.
     * @dev Can only be called by an authorized minter or the contract owner.
     *      The `tokenId` is determined internally by incrementing `_nextTokenId`.
     *      On-chain metadata is stored, and an IPFS URI for off-chain metadata is set.
     *      Emits a {PokemonMinted} event.
     * @param to The address to receive the newly minted NFT.
     * @param uri The IPFS URI pointing to the JSON metadata for this token.
     * @param _name The name of the Pokemon.
     * @param _hp Hit Points.
     * @param _attack Attack stat.
     * @param _defense Defense stat.
     * @param _speed Speed stat.
     * @param _type1 Primary type.
     * @param _type2 Secondary type (can be empty).
     * @param _special Special stat.
     * @return tokenId The ID of the newly minted token.
     */
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
        // Create a unique hash for the combination of on-chain metadata
        bytes32 metadataHash = keccak256(abi.encodePacked(_name, _hp, _attack, _defense, _speed, _type1, _type2, _special));
        require(!_usedMetadataHashes[metadataHash], "PokemonCard: This exact set of on-chain metadata has already been minted.");
        _usedMetadataHashes[metadataHash] = true;


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

    /**
     * @notice Pauses all token transfers.
     * @dev Can only be called by the contract owner. See {ERC721Pausable-_pause}.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers.
     * @dev Can only be called by the contract owner. See {ERC721Pausable-_unpause}.
     */
    function unpause() public onlyOwner {
        _unpause();
    }


    // --- Overrides ---

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
