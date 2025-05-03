// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract ContractJoke {

    struct Joke {
        string setup;
        string punchline;
        address creator;
        bool isDeleted;
    }

    
    mapping(uint256 => Joke) private jokes;
    uint256 private jokeCount;

    mapping(address => uint256[]) public creatorBalances;

    uint256 public constant CLASSIC_REWARD = 1 ether;
    uint256 public constant FUNNY_REWARD = 5 ether;
    uint256 public constant GROANER_REWARD = 10 ether;

    mapping(uint256 => uint256) public rewardAmounts;

    constructor() {
        rewardAmounts[1] = CLASSIC_REWARD;
        rewardAmounts[2] = FUNNY_REWARD;
        rewardAmounts[3] = GROANER_REWARD;
    }

    event JokeAdded(
        uint256 indexed jokeId, 
        address indexed creator
    );

    event JokeRewarded(
        uint256 indexed jokeId, 
        address indexed creator, 
        uint256 rewardAmount
    );

    event JokeDeleted(
        uint256 indexed jokeId
    );

    event BalanceWithdrawn(
        address indexed creator, 
        uint256 amount
    );

    function addJoke(string memory setup, string memory punchline) public {

    }

    function getJoke() public view returns (Joke[] memory) {
        
    }

    function rewardJoke(uint256 jokeId, uint256 rewardType) public payable{
        
    }

    function deleteJoke(uint256 jokeId) public {
        
    }

    function withdrawBalance() public {
        
    }




}



