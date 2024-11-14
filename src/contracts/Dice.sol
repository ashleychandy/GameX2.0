// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IMyToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function revokeRole(bytes32 role, address account) external;
    function grantRole(bytes32 role, address account) external;
}

enum GameStatus {
    PENDING,
    STARTED,
    COMPLETED_WIN,
    COMPLETED_LOSS,
    CANCELLED
}

struct GameState {
    bool isActive;
    uint256 chosenNumber;
    uint256 result;
    uint256 amount;
    uint256 timestamp;
    uint256 payout;
    uint256 randomWord;
    GameStatus status;
}

struct BetHistory {
    uint256 chosenNumber;    // Number player bet on
    uint256 rolledNumber;    // Number that was rolled
    uint256 amount;          // Amount that was bet
    uint256 timestamp;       // When the bet was made
}

struct UserData {
    GameState currentGame;
    uint256 currentRequestId;
    bool requestFulfilled;
    BetHistory[] previousBets;     // Changed from previousResults to previousBets
    uint256 maxHistorySize;
    // Stats
    uint256 totalBets;
    uint256 totalWinnings;
    uint256 totalLosses;
    uint256 gamesPlayed;
    uint256 lastPlayedTimestamp;
}

contract Dice is Pausable, ReentrancyGuard, VRFConsumerBaseV2Plus {
    // Constants
    uint256 private constant MAX_ROLL = 6;
    uint256 private constant GAME_TIMEOUT = 1 hours;
    
    // Custom errors with error codes
    error InvalidBetParameters(uint256 code);
    error InsufficientContractBalance(uint256 required, uint256 available);
    error InsufficientUserBalance(uint256 required, uint256 available);
    error TransferFailed(uint256 code);
    error GameError(uint256 code);
    error VRFError(uint256 code);
    error RoleError(uint256 code);
    error PayoutCalculationError(string message);

    // Immutable VRF variables
    uint256 private immutable s_subscriptionId;
    bytes32 private immutable s_keyHash;
    uint32 private callbackGasLimit;
    uint16 private immutable requestConfirmations;
    uint32 private immutable numWords;

    // State variables
    IMyToken public immutable myToken;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Single mapping for all user data
    mapping(address => UserData) private userData;
    
    // Add this mapping at the contract level with other state variables
    mapping(uint256 => address) private requestToPlayer;

    // Add this mapping to the contract
    mapping(uint256 => bool) private activeRequestIds;

    uint256 public constant DEFAULT_HISTORY_SIZE = 10;  // Store last 10 results by default

    constructor(
        address _myTokenAddress,
        uint256 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        if (_myTokenAddress == address(0)) revert InvalidBetParameters(1);
        if (vrfCoordinator == address(0)) revert InvalidBetParameters(2);
        if (_callbackGasLimit == 0) revert InvalidBetParameters(3);
        if (_numWords == 0) revert InvalidBetParameters(4);

        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
        myToken = IMyToken(_myTokenAddress);
    }

    function playDice(uint256 chosenNumber, uint256 amount) external nonReentrant whenNotPaused returns (uint256 requestId) {
        UserData storage user = userData[msg.sender];
        
        // Validations
        if (amount == 0) revert InvalidBetParameters(5);
        if (user.currentGame.isActive) revert GameError(1);
        if (chosenNumber < 1 || chosenNumber > MAX_ROLL) revert InvalidBetParameters(6);

        // Token checks and burns...
        uint256 allowance = myToken.allowance(msg.sender, address(this));
        if (allowance < amount) revert InsufficientUserBalance(amount, allowance);

        uint256 userBalance = myToken.balanceOf(msg.sender);
        if (userBalance < amount) revert InsufficientUserBalance(amount, userBalance);

        if (!myToken.hasRole(BURNER_ROLE, address(this))) revert RoleError(1);

        // Burn tokens
        try myToken.burn(msg.sender, amount) {} catch {
            revert TransferFailed(1);
        }

        // Request VRF directly here instead of using _requestRandomWords()
        try s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: false
                    })
                )
            })
        ) returns (uint256 _requestId) {
            requestId = _requestId;
        } catch {
            revert VRFError(1);
        }
        
        // Store the mapping of requestId to player
        requestToPlayer[requestId] = msg.sender;
        activeRequestIds[requestId] = true;
        
        // Update user data
        user.currentGame = GameState({
            isActive: true,
            chosenNumber: chosenNumber,
            result: 0,
            amount: amount,
            timestamp: block.timestamp,
            payout: 0,
            randomWord: 0,
            status: GameStatus.STARTED
        });
        
        user.currentRequestId = requestId;
        user.requestFulfilled = false;
        user.totalBets += amount;
        user.gamesPlayed++;
        user.lastPlayedTimestamp = block.timestamp;
        
        return requestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        address player = requestToPlayer[requestId];
        if (player == address(0)) revert GameError(2);
        
        UserData storage user = userData[player];
        
        require(user.currentGame.isActive, "Game not active");
        require(user.currentRequestId == requestId, "Request ID mismatch");
        require(activeRequestIds[requestId], "Request ID not active");
        
        user.currentGame.randomWord = randomWords[0];
        user.requestFulfilled = true;
        
        // Clean up mappings
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];
    }

    function resolveGame() external nonReentrant {
        UserData storage user = userData[msg.sender];
        
        require(user.currentGame.isActive, "No active game");
        require(user.requestFulfilled, "Random number not ready");

        uint256 result = (user.currentGame.randomWord % MAX_ROLL) + 1;
        
        // Store the detailed bet history first
        if (user.maxHistorySize == 0) {
            user.maxHistorySize = DEFAULT_HISTORY_SIZE;
        }
        if (user.previousBets.length >= user.maxHistorySize) {
            // Remove oldest result if we've reached max size
            for (uint i = 0; i < user.previousBets.length - 1; i++) {
                user.previousBets[i] = user.previousBets[i + 1];
            }
            user.previousBets.pop();
        }
        user.previousBets.push(BetHistory({
            chosenNumber: user.currentGame.chosenNumber,
            rolledNumber: result,
            amount: user.currentGame.amount,
            timestamp: block.timestamp
        }));

        // Calculate payout after recording history
        uint256 payout = 0;
        if (user.currentGame.chosenNumber == result) {
            // Calculate payout only if numbers match
            if (user.currentGame.amount > type(uint256).max / 6) {
                revert PayoutCalculationError("Bet amount too large");
            }
            payout = user.currentGame.amount * 6;
            
            user.totalWinnings += payout;
            user.currentGame.status = GameStatus.COMPLETED_WIN;
            
            // Mint payout tokens only after confirming win
            if (!myToken.hasRole(MINTER_ROLE, address(this))) revert RoleError(2);
            try myToken.mint(msg.sender, payout) {} catch {
                revert TransferFailed(2);
            }
        } else {
            user.totalLosses += user.currentGame.amount;
            user.currentGame.status = GameStatus.COMPLETED_LOSS;
        }

        // Cleanup
        user.currentGame.isActive = false;
        user.requestFulfilled = false;
        user.currentRequestId = 0;
    }

    function recoverStuckGame(address player) external onlyOwner {
        UserData storage user = userData[player];
        
        require(user.currentGame.isActive, "No active game");
        require(block.timestamp > user.currentGame.timestamp + GAME_TIMEOUT, "Game not timed out");

        // Clean up all related mappings
        if (user.currentRequestId != 0) {
            delete requestToPlayer[user.currentRequestId];
            delete activeRequestIds[user.currentRequestId];
        }

        // Reset user's game state
        user.currentGame.isActive = false;
        user.requestFulfilled = false;
        user.currentRequestId = 0;
    }

    function getUserData(address player) external view returns (
        GameState memory currentGame,
        uint256 totalGames,
        uint256 totalBets,
        uint256 totalWinnings,
        uint256 totalLosses,
        uint256 lastPlayed
    ) {
        if (player == address(0)) revert InvalidBetParameters(7);
        UserData storage user = userData[player];
        return (
            user.currentGame,
            user.gamesPlayed,
            user.totalBets,
            user.totalWinnings,
            user.totalLosses,
            user.lastPlayedTimestamp
        );
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getContractBalance() public view returns (uint256) {
        return myToken.balanceOf(address(this));
    }

    function revokeTokenRole(bytes32 role, address account) external onlyOwner {
        myToken.revokeRole(role, account);
    }

    // Emergency function
    function forceStopGame(address player) external onlyOwner {
        UserData storage user = userData[player];
        
        require(user.currentGame.isActive, "No active game");

        // Refund the player's bet amount
        if (!myToken.hasRole(MINTER_ROLE, address(this))) revert RoleError(4);
        
        try myToken.mint(player, user.currentGame.amount) {} catch {
            revert TransferFailed(3);
        }

        // Reset user's game state
        user.currentGame.isActive = false;
        user.requestFulfilled = false;
        user.currentRequestId = 0;
    }

    function isRequestActive(uint256 requestId) public view returns (bool) {
        return activeRequestIds[requestId];
    }

    function getPlayerForRequest(uint256 requestId) public view returns (address) {
        return requestToPlayer[requestId];
    }

    function getCurrentGame(address player) public view returns (GameState memory) {
        if (player == address(0)) revert InvalidBetParameters(8);
        
        UserData storage user = userData[player];
        
        // Check for potential overflows in the active game data
        if (user.currentGame.isActive) {
            // Validate amount doesn't exceed maximum safe value
            if (user.currentGame.amount > type(uint256).max / 6) {
                revert PayoutCalculationError("Amount too large");
            }
            
            // Validate timestamp is reasonable
            if (user.currentGame.timestamp > block.timestamp) {
                revert GameError(3);
            }
            
            // Ensure chosen number is within valid range
            if (user.currentGame.chosenNumber > MAX_ROLL) {
                revert InvalidBetParameters(13);
            }
            
            return user.currentGame;
        }
        
        // Return safe default state for inactive game
        return GameState({
            isActive: false,
            chosenNumber: 0,
            result: 0,
            amount: 0,
            timestamp: 0,
            payout: 0,
            randomWord: 0,
            status: GameStatus.PENDING
        });
    }

    // Get detailed game status for a player
    function getGameStatus(address player) external view returns (
        bool isActive,
        GameStatus status,
        uint256 chosenNumber,
        uint256 amount,
        uint256 timestamp
    ) {
        if (player == address(0)) revert InvalidBetParameters(9);
        GameState memory game = userData[player].currentGame;
        return (
            game.isActive,
            game.status,
            game.chosenNumber,
            game.amount,
            game.timestamp
        );
    }

    // Check if a player has a pending VRF request
    function hasPendingRequest(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return user.currentRequestId != 0 && !user.requestFulfilled;
    }

    // Get player's game statistics
    function getPlayerStats(address player) external view returns (
        uint256 winRate,
        uint256 averageBet,
        uint256 totalGamesWon,
        uint256 totalGamesLost
    ) {
        if (player == address(0)) revert InvalidBetParameters(10);
        UserData storage user = userData[player];
        
        // Return zeros if no games played
        if (user.gamesPlayed == 0) {
            return (0, 0, 0, 0);
        }
        
        // Safe calculation for games won
        uint256 gamesWon;
        if (user.totalWinnings > 0) {
            // Since payout is 6x, divide by 6 to get number of wins
            gamesWon = user.totalWinnings / 6;
        }
        
        uint256 gamesLost = user.gamesPlayed - gamesWon;
        
        // Safe percentage calculation with higher precision (2 decimal places)
        // Multiply by 10000 first to preserve 2 decimal places
        if (user.gamesPlayed > 0) {
            if (gamesWon <= type(uint256).max / 10000) {
                winRate = (gamesWon * 10000) / user.gamesPlayed;
            } else {
                // Handle potential overflow by reducing precision
                winRate = (gamesWon / user.gamesPlayed) * 10000;
            }
        }
        
        // Safe average calculation
        if (user.gamesPlayed > 0) {
            if (user.totalBets <= type(uint256).max / 1e18) {
                // Maintain precision for average calculation
                averageBet = (user.totalBets * 1e18) / user.gamesPlayed;
            } else {
                // Handle potential overflow by reducing precision
                averageBet = user.totalBets / user.gamesPlayed;
            }
        }
        
        return (winRate, averageBet, gamesWon, gamesLost);
    }

    // Get current request details
    function getCurrentRequestDetails(address player) external view returns (
        uint256 requestId,
        bool requestFulfilled,
        bool requestActive
    ) {
        if (player == address(0)) revert InvalidBetParameters(11);
        UserData storage user = userData[player];
        
        if (user.currentRequestId == 0) {
            return (0, false, false);
        }
        
        return (
            user.currentRequestId,
            user.requestFulfilled,
            activeRequestIds[user.currentRequestId]
        );
    }

    // Check if a player can start a new game
    function canStartNewGame(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return !user.currentGame.isActive && user.currentRequestId == 0;
    }

    // Add new function to get previous results
    function getPreviousBets(address player) external view returns (BetHistory[] memory) {
        if (player == address(0)) revert InvalidBetParameters(12);
        UserData storage user = userData[player];
        
        uint256 length = user.previousBets.length;
        BetHistory[] memory bets = new BetHistory[](length);
        
        for (uint256 i = 0; i < length; i++) {
            bets[i] = user.previousBets[i];
        }
        
        return bets;
    }

    // Optional: Add function to set history size
    function setHistorySize(uint256 newSize) external {
        require(newSize > 0, "History size must be positive");
        require(newSize <= 100, "History size too large"); // Prevent excessive storage
        UserData storage user = userData[msg.sender];
        user.maxHistorySize = newSize;
        
        // Trim existing history if necessary
        while (user.previousBets.length > newSize) {
            user.previousBets.pop();
        }
    }

    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;
    }
}
