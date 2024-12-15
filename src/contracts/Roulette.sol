// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@goplugin/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@goplugin/contracts/src/v0.8/dev/VRFConsumerBaseV2.sol";


interface IMyToken is IERC20 {
    
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function revokeRole(bytes32 role, address account) external;
    function grantRole(bytes32 role, address account) external;
}

enum BetType {
    Straight,
    Split,
    Street,
    Corner,
    SixLine,
    Dozen,
    Column,
    Red,
    Black,
    Even,
    Odd,
    Low,
    High
}

enum GameStatus {
    PENDING,
    STARTED,
    COMPLETED_WIN,
    COMPLETED_LOSS,
    CANCELLED
}

struct BetRequest {
    uint8[] numbers;
    uint256 amount;
    BetType betType;
}

struct Bet {
    uint8[] numbers;
    uint256 amount;
    BetType betType;
    uint256 timestamp;
    uint8 winningNumber;
    bool completed;
    uint256 payout;
    GameStatus status;
}

struct UserGameData {
    Bet currentBet;
    bool isActive;
    uint256 currentRequestId;
    bool requestFulfilled;
    Bet[] betHistory;
    uint256 totalBets;
    uint256 totalWinnings;
    uint256 totalLosses;
    uint256 gamesPlayed;
    uint256 lastPlayedTimestamp;
    uint256 maxHistorySize;
}

// Enhanced custom errors with descriptive codes and messages
error InvalidBetParameters(uint256 code, string reason);
error InsufficientContractBalance(uint256 code, uint256 required, uint256 available);
error InsufficientUserBalance(uint256 code, uint256 required, uint256 available);
error InsufficientAllowance(uint256 required, uint256 available);
error TransferFailed(uint256 code, address from, address to, uint256 amount);
error GameError(uint256 code, string reason);
error VRFError(uint256 code, string reason);
error RoleError(uint256 code, bytes32 role);
error PayoutCalculationError(string message);
error MintFailed(address to, uint256 amount);
error BurnFailed(address from, uint256 amount);
error VRFRequestFailed(string reason);
error MissingContractRole(bytes32 role);

// Add request tracking struct similar to Dice
struct RequestStatus {
    bool fulfilled;
    bool exists;
    uint256[] randomWords;
}

contract Roulette is Pausable, Ownable, ReentrancyGuard, VRFConsumerBaseV2 {
    // Make constants more organized and explicit
    uint8 public constant MAX_NUMBER = 36;
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant DEFAULT_HISTORY_SIZE = 10;
    uint256 private constant MAX_BETS_PER_SPIN = 15;
    uint256 private constant GAME_TIMEOUT = 1 hours;
    uint256 private constant MAX_HISTORY_LIMIT = 100;

    // Enhanced state tracking similar to Dice
    uint256 private totalGamesPlayed;
    uint256 private totalPayoutAmount;

    // Enhanced mappings
    mapping(address => UserGameData) public userData;
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => address) private s_spinners;
    mapping(uint256 => bool) private activeRequestIds;
    mapping(address => bool) private owners;
    uint256 private numOwners;

    // Make VRF variables immutable like in Dice
    VRFCoordinatorV2Interface private immutable COORDINATOR;
    uint64 private immutable s_subscriptionId;
    bytes32 private immutable s_keyHash;
    uint32 private immutable callbackGasLimit;
    uint16 private immutable requestConfirmations;
    uint32 private immutable numWords;

    // Make token immutable
    IMyToken public immutable myToken;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event GameCleanup(address indexed player, uint256 requestId, GameStatus status);

    constructor(
        address _myTokenAddress,
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) VRFConsumerBaseV2(vrfCoordinator) Ownable(msg.sender) {
        if (_myTokenAddress == address(0)) revert InvalidBetParameters(1, "Invalid token address");
        if (vrfCoordinator == address(0)) revert InvalidBetParameters(2, "Invalid VRF coordinator");
        
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        myToken = IMyToken(_myTokenAddress);
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;

        // Initialize deployer as first owner
        owners[msg.sender] = true;
        numOwners = 1;
        emit OwnerAdded(msg.sender);
    }

    function placeBetAndSpin(BetRequest calldata bet) external nonReentrant whenNotPaused returns (uint256 requestId) {
        if (!_isValidBet(bet.numbers, bet.betType)) {
            revert InvalidBetParameters(1, "Invalid bet configuration");
        }

        UserGameData storage user = userData[msg.sender];
        
        if (user.isActive) {
            revert InvalidBetParameters(2, "Player has pending game");
        }

        // Check user balance and allowance
        if (myToken.balanceOf(msg.sender) < bet.amount) {
            revert InsufficientUserBalance(3, bet.amount, myToken.balanceOf(msg.sender));
        }

        if (myToken.allowance(msg.sender, address(this)) < bet.amount) {
            revert InsufficientAllowance(bet.amount, myToken.allowance(msg.sender, address(this)));
        }

        // Burn tokens from user
        try myToken.burn(msg.sender, bet.amount) {
        } catch {
            revert BurnFailed(msg.sender, bet.amount);
        }

        // Request random number
        try COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        ) returns (uint256 _requestId) {
            requestId = _requestId;
            
            s_requests[requestId] = RequestStatus({
                randomWords: new uint256[](0),
                exists: true,
                fulfilled: false
            });
            
            s_spinners[requestId] = msg.sender;
            activeRequestIds[requestId] = true;
            
            user.currentRequestId = requestId;
            user.requestFulfilled = false;
            user.isActive = true;
            
            // Store current bet
            user.currentBet = Bet({
                numbers: bet.numbers,
                amount: bet.amount,
                betType: bet.betType,
                timestamp: block.timestamp,
                winningNumber: 0,
                completed: false,
                payout: 0,
                status: GameStatus.STARTED
            });
            
        } catch Error(string memory reason) {
            revert VRFRequestFailed(reason);
        } catch {
            revert VRFRequestFailed("Unknown VRF error");
        }

        // Update user stats
        user.totalBets += bet.amount;
        user.gamesPlayed++;
        user.lastPlayedTimestamp = block.timestamp;

        return requestId;
    }

    function resolveGame() external nonReentrant {
        UserGameData storage user = userData[msg.sender];
        
        if (!user.isActive) revert GameError(1, "No active game");
        if (!user.requestFulfilled) revert GameError(2, "Random number not ready");
        if (!s_requests[user.currentRequestId].fulfilled) revert GameError(3, "VRF request not fulfilled");
        
        uint256[] memory randomWords = s_requests[user.currentRequestId].randomWords;
        uint8 winningNumber = uint8(randomWords[0] % (MAX_NUMBER + 1));
        
        uint256 payout = _calculatePayout(
            user.currentBet.numbers, 
            user.currentBet.betType, 
            user.currentBet.amount, 
            winningNumber
        );

        // Update current bet
        user.currentBet.winningNumber = winningNumber;
        user.currentBet.completed = true;
        user.currentBet.payout = payout;
        user.currentBet.status = payout > 0 ? GameStatus.COMPLETED_WIN : GameStatus.COMPLETED_LOSS;

        // Add to history
        if (user.betHistory.length >= user.maxHistorySize) {
            // Remove oldest bet if at max size
            for (uint256 i = 0; i < user.betHistory.length - 1; i++) {
                user.betHistory[i] = user.betHistory[i + 1];
            }
            user.betHistory.pop();
        }
        user.betHistory.push(user.currentBet);

        if (payout > 0) {
            user.totalWinnings += payout;
            if (!myToken.hasRole(MINTER_ROLE, address(this))) {
                revert MissingContractRole(MINTER_ROLE);
            }
            try myToken.mint(msg.sender, payout) {
            } catch {
                revert MintFailed(msg.sender, payout);
            }
        } else {
            user.totalLosses += user.currentBet.amount;
        }

        // Update global stats
        totalGamesPlayed++;
        totalPayoutAmount += payout;

        // Cleanup game state
        delete s_requests[user.currentRequestId];
        delete s_spinners[user.currentRequestId];
        delete activeRequestIds[user.currentRequestId];
        user.currentRequestId = 0;
        user.requestFulfilled = false;
        user.isActive = false;
        
        emit GameCleanup(msg.sender, user.currentRequestId, user.currentBet.status);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        require(s_requests[requestId].exists, "request not found");
        s_requests[requestId].fulfilled = true;
        s_requests[requestId].randomWords = randomWords;

        address spinner = s_spinners[requestId];
        if (spinner == address(0)) revert InvalidBetParameters("Invalid spinner address");
        
        UserGameData storage user = userData[spinner];
        require(user.currentRequestId == requestId, "Request ID mismatch");
        require(activeRequestIds[requestId], "Request ID not active");
        
        user.requestFulfilled = true;
    }

    function _calculatePayout(uint8[] memory numbers, BetType betType, uint256 betAmount, uint8 winningNumber) private pure returns (uint256) {
        // Prevent zero-amount bets
        if (betAmount == 0) return 0;
        
        if (_isBetWinning(numbers, betType, winningNumber)) {
            uint256 multiplier = getPayoutMultiplier(betType);
            // Safe multiplication pattern
            uint256 winnings = (betAmount * multiplier) / DENOMINATOR;
            // Check for overflow before final addition
            require(winnings <= type(uint256).max - betAmount, "Payout overflow");
            return betAmount + winnings;
        }
        return 0;
    }

    function _isBetWinning(uint8[] memory numbers, BetType betType, uint8 winningNumber) private pure returns (bool) {
        if (winningNumber > MAX_NUMBER) return false;
        
        // Handle zero case first
        if (winningNumber == 0) {
            // Only straight bet on zero can win
            return (betType == BetType.Straight && numbers.length == 1 && numbers[0] == 0);
        }
        
        // Outside bets
        if (betType == BetType.Red) return _isRed(winningNumber);
        if (betType == BetType.Black) return !_isRed(winningNumber) && winningNumber != 0;
        if (betType == BetType.Even) return winningNumber % 2 == 0 && winningNumber != 0;
        if (betType == BetType.Odd) return winningNumber % 2 == 1;
        if (betType == BetType.Low) return winningNumber >= 1 && winningNumber <= 18;
        if (betType == BetType.High) return winningNumber >= 19 && winningNumber <= 36;
        
        // Inside bets
        for (uint8 i = 0; i < numbers.length; i++) {
            if (numbers[i] == winningNumber) return true;
        }
        return false;
    }

    function _isRed(uint8 number) private pure returns (bool) {
        if (number == 0) return false;
        uint8[18] memory redNumbers = [
            1, 3, 5, 7, 9, 12, 14, 16, 18, 
            19, 21, 23, 25, 27, 30, 32, 34, 36
        ];
        for (uint8 i = 0; i < redNumbers.length; i++) {
            if (redNumbers[i] == number) return true;
        }
        return false;
    }

    function getPayoutMultiplier(BetType betType) public pure returns (uint256) {
        if (betType == BetType.Straight) return 35 * DENOMINATOR;
        if (betType == BetType.Split) return 17 * DENOMINATOR;
        if (betType == BetType.Street) return 11 * DENOMINATOR;
        if (betType == BetType.Corner) return 8 * DENOMINATOR;
        if (betType == BetType.SixLine) return 5 * DENOMINATOR;
        if (betType == BetType.Dozen || betType == BetType.Column) return 2 * DENOMINATOR;
        return DENOMINATOR; // For Red, Black, Even, Odd, Low, High (1:1)
    }

    function _isValidBet(uint8[] memory numbers, BetType betType) private pure returns (bool) {
        // First validate number range
        for (uint8 i = 0; i < numbers.length; i++) {
            if (numbers[i] > MAX_NUMBER) return false;
        }

        // Validate bet type and corresponding numbers
        if (betType == BetType.Straight) {
            return numbers.length == 1;
        }
        if (betType == BetType.Split) {
            if (numbers.length != 2) return false;
            return _areAdjacentNumbers(numbers[0], numbers[1]);
        }
        if (betType == BetType.Street) {
            if (numbers.length != 3) return false;
            return _isValidStreet(numbers);
        }
        if (betType == BetType.Corner) {
            if (numbers.length != 4) return false;
            return _isValidCorner(numbers);
        }
        if (betType == BetType.SixLine) {
            if (numbers.length != 6) return false;
            return _isValidSixLine(numbers);
        }
        if (betType == BetType.Dozen) {
            return _isValidDozen(numbers);
        }
        if (betType == BetType.Column) {
            return _isValidColumn(numbers);
        }
        // Outside bets don't require numbers
        if (betType >= BetType.Red) {
            return numbers.length == 0;
        }
        return false;
    }

    function _areAdjacentNumbers(uint8 a, uint8 b) private pure returns (bool) {
        if (a > MAX_NUMBER || b > MAX_NUMBER) return false;
        if (a > b) (a, b) = (b, a);
        
        // Horizontal adjacency
        if (b == a + 1 && a % 3 != 0) return true;
        
        // Vertical adjacency
        if (b == a + 3 && a <= 33) return true;
        
        return false;
    }

    function _isValidStreet(uint8[] memory numbers) private pure returns (bool) {
        if (numbers[0] > MAX_NUMBER - 2) return false;
        if (numbers[0] % 3 != 1) return false;
        
        return numbers[1] == numbers[0] + 1 && 
               numbers[2] == numbers[0] + 2;
    }

    function _isValidCorner(uint8[] memory numbers) private pure returns (bool) {
        uint8[4] memory sortedNumbers = [numbers[0], numbers[1], numbers[2], numbers[3]];
        _sortNumbers4(sortedNumbers); // Changed to specific function for 4 numbers
        
        // Check if the smallest number is valid for a corner
        if (sortedNumbers[0] > 32 || sortedNumbers[0] % 3 == 0) return false;
        
        // Verify corner pattern
        return sortedNumbers[1] == sortedNumbers[0] + 1 &&
               sortedNumbers[2] == sortedNumbers[0] + 3 &&
               sortedNumbers[3] == sortedNumbers[0] + 4;
    }

    function _isValidSixLine(uint8[] memory numbers) private pure returns (bool) {
        uint8[6] memory sortedNumbers = [numbers[0], numbers[1], numbers[2], 
                                       numbers[3], numbers[4], numbers[5]];
        _sortNumbers6(sortedNumbers); // Changed to specific function for 6 numbers
        
        // Check if the smallest number is valid for a six line
        if (sortedNumbers[0] > 31 || sortedNumbers[0] % 3 != 1) return false;
        
        // Verify six line pattern
        for (uint8 i = 1; i < 6; i++) {
            if (sortedNumbers[i] != sortedNumbers[0] + i) return false;
        }
        return true;
    }

    function _isValidDozen(uint8[] memory numbers) private pure returns (bool) {
        if (numbers.length != 12) return false;
        
        uint8 start = numbers[0];
        if (start != 1 && start != 13 && start != 25) return false;
        
        for (uint8 i = 0; i < 12; i++) {
            if (numbers[i] != start + i) return false;
        }
        return true;
    }

    function _isValidColumn(uint8[] memory numbers) private pure returns (bool) {
        if (numbers.length != 12) return false;
        
        uint8 start = numbers[0];
        if (start != 1 && start != 2 && start != 3) return false;
        
        for (uint8 i = 0; i < 12; i++) {
            if (numbers[i] != start + (i * 3)) return false;
        }
        return true;
    }

    // Replace the original _sortNumbers with two specific sorting functions
    function _sortNumbers4(uint8[4] memory arr) private pure {
        for (uint8 i = 0; i < 3; i++) {
            for (uint8 j = 0; j < 3 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    (arr[j], arr[j + 1]) = (arr[j + 1], arr[j]);
                }
            }
        }
    }

    function _sortNumbers6(uint8[6] memory arr) private pure {
        for (uint8 i = 0; i < 5; i++) {
            for (uint8 j = 0; j < 5 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    (arr[j], arr[j + 1]) = (arr[j + 1], arr[j]);
                }
            }
        }
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getBetTypeAsUint(BetType betType) public pure returns (uint256) {
        return uint256(betType);
    }

    function getContractBalance() public view returns (uint256) {
        return myToken.balanceOf(address(this));
    }

    function revokeTokenRole(bytes32 role, address account) external onlyOwner {
        myToken.revokeRole(role, account);
    }

    function grantTokenRole(bytes32 role, address account) external onlyOwner {
        myToken.grantRole(role, account);
    }

    function getUserGameData(address player) external view returns (UserGameData memory) {
        return userData[player];
    }

    function getLastPlayerBet(address player) external view returns (Bet memory) {
        Bet[] memory bets = userData[player].betHistory;
        if (bets.length == 0) revert("No bets found");
        return bets[bets.length - 1];
    }

    function getBetHistory(address player) external view returns (Bet[] memory) {
        if (player == address(0)) revert InvalidBetParameters("Invalid address");
        return userData[player].betHistory;
    }

    function getContractStats() external view returns (
        uint256 totalGames,
        uint256 totalPayout,
        uint256 currentBalance
    ) {
        return (
            totalGamesPlayed,
            totalPayoutAmount,
            myToken.balanceOf(address(this))
        );
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(myToken)) {
            if (amount > myToken.balanceOf(address(this))) {
                revert InsufficientContractBalance(amount, myToken.balanceOf(address(this)));
            }
            if (!myToken.transfer(owner(), amount)) {
                revert TransferFailed(address(this), owner(), amount);
            }
        } else {
            IERC20 otherToken = IERC20(token);
            if (amount > otherToken.balanceOf(address(this))) {
                revert InsufficientContractBalance(amount, otherToken.balanceOf(address(this)));
            }
            if (!otherToken.transfer(owner(), amount)) {
                revert TransferFailed(address(this), owner(), amount);
            }
        }
    }

    function verifyContractRoles() external view {
        if (!myToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
        if (!myToken.hasRole(BURNER_ROLE, address(this))) {
            revert MissingContractRole(BURNER_ROLE);
        }
        // If we reach here, the contract has both roles
    }

    

    function isRequestActive(uint256 requestId) public view returns (bool) {
        return activeRequestIds[requestId];
    }

    function getSpinnerForRequest(uint256 requestId) public view returns (address) {
        return s_spinners[requestId];
    }

    function hasPendingRequest(address player) external view returns (bool) {
        UserGameData storage user = userData[player];
        return user.currentRequestId != 0 && !user.requestFulfilled;
    }

    function getCurrentRequestDetails(address player) external view returns (
        uint256 requestId,
        bool requestFulfilled,
        bool requestActive,
        bool exists
    ) {
        UserGameData storage user = userData[player];
        
        if (user.currentRequestId == 0) {
            return (0, false, false, false);
        }
        
        RequestStatus storage request = s_requests[user.currentRequestId];
        return (
            user.currentRequestId,
            user.requestFulfilled,
            activeRequestIds[user.currentRequestId],
            request.exists
        );
    }

    
    // Add new data fetching functions
    function getUserData(address player) external view returns (
        uint256 totalGames,
        uint256 totalBets,
        uint256 totalWinnings,
        uint256 totalLosses,
        uint256 lastPlayed
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid address");
        UserGameData storage user = userData[player];
        return (
            user.gamesPlayed,
            user.totalBets,
            user.totalWinnings,
            user.totalLosses,
            user.lastPlayedTimestamp
        );
    }

    function getGameStatus(address player) external view returns (
        bool hasActiveBet,
        uint256 currentBetAmount,
        BetType currentBetType,
        uint8[] memory currentBetNumbers,
        uint256 timestamp
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid address");
        UserGameData storage user = userData[player];
        
        if (user.currentRequestId != 0) {
            Bet storage currentBet = user.betHistory[user.betHistory.length - 1];
            return (
                true,
                currentBet.amount,
                currentBet.betType,
                currentBet.numbers,
                currentBet.timestamp
            );
        }
        
        return (
            false,
            0,
            BetType.Straight, // Default value
            new uint8[](0),
            0
        );
    }

    // Add function to get current game details
    function getCurrentGame(address player) public view returns (
        bool isActive,
        uint256 requestId,
        bool requestFulfilled,
        Bet memory currentBet
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid address");
        
        UserGameData storage user = userData[player];
        
        if (user.currentRequestId != 0) {
            return (
                true,
                user.currentRequestId,
                user.requestFulfilled,
                user.betHistory[user.betHistory.length - 1]
            );
        }
        
        return (
            false,
            0,
            false,
            Bet({
                numbers: new uint8[](0),
                amount: 0,
                betType: BetType.Straight,
                timestamp: 0,
                winningNumber: 0,
                completed: false,
                payout: 0,
                status: GameStatus.PENDING
            })
        );
    }

    // Update getter functions
    function getCurrentBet(address player) external view returns (Bet memory) {
        UserGameData storage user = userData[player];
        if (!user.isActive) revert GameError(4, "No active game");
        return user.currentBet;
    }

    function getBetHistory(address player) external view returns (Bet[] memory) {
        return userData[player].betHistory;
    }

    function recoverOwnStuckGame() external nonReentrant {
        UserGameData storage user = userData[msg.sender];
        
        if (!user.isActive) revert GameError(1, "No active game");
        if (block.timestamp <= user.currentBet.timestamp + GAME_TIMEOUT) {
            revert GameError(2, "Game not timed out");
        }

        // Clean up request mappings
        if (user.currentRequestId != 0) {
            delete s_requests[user.currentRequestId];
            delete s_spinners[user.currentRequestId];
            delete activeRequestIds[user.currentRequestId];
        }

        // Refund the player's bet amount
        if (!myToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
        
        try myToken.mint(msg.sender, user.currentBet.amount) {
        } catch {
            revert MintFailed(msg.sender, user.currentBet.amount);
        }

        // Update bet status
        user.currentBet.status = GameStatus.CANCELLED;
        user.currentBet.completed = true;

        // Reset game state
        user.currentRequestId = 0;
        user.requestFulfilled = false;
        user.isActive = false;
    }

    // Add owner management functions similar to Dice
    function addOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert("Invalid address");
        if (owners[newOwner]) revert("Already owner");
        
        owners[newOwner] = true;
        numOwners++;
        emit OwnerAdded(newOwner);
    }

    function removeOwner(address ownerToRemove) external onlyOwner {
        if (!owners[ownerToRemove]) revert("Not owner");
        if (numOwners <= 1) revert("Cannot remove last owner");
        if (ownerToRemove == msg.sender) revert("Cannot remove self");
        
        owners[ownerToRemove] = false;
        numOwners--;
        emit OwnerRemoved(ownerToRemove);
    }

    function isOwner(address account) public view returns (bool) {
        return owners[account];
    }

    function forceStopGame(address player) external onlyOwner {
        UserGameData storage user = userData[player];
        
        if (user.currentRequestId == 0) revert("No active game");

        // Find all pending bets
        uint256 startIndex = user.betHistory.length;
        while (startIndex > 0 && !user.betHistory[startIndex - 1].completed) {
            startIndex--;
        }
        
        // Refund all pending bets
        uint256 totalRefund = 0;
        for (uint256 i = startIndex; i < user.betHistory.length; i++) {
            totalRefund += user.betHistory[i].amount;
            user.betHistory[i].completed = true;
            user.betHistory[i].status = GameStatus.CANCELLED;
        }
        
        if (totalRefund > 0) {
            if (!myToken.hasRole(MINTER_ROLE, address(this))) {
                revert MissingContractRole(MINTER_ROLE);
            }
            try myToken.mint(player, totalRefund) {
            } catch {
                revert MintFailed(player, totalRefund);
            }
        }

        // Reset game state
        delete s_requests[user.currentRequestId];
        delete s_spinners[user.currentRequestId];
        delete activeRequestIds[user.currentRequestId];
        user.currentRequestId = 0;
        user.requestFulfilled = false;
        user.isActive = false;
        user.currentBet.status = GameStatus.CANCELLED;
        
        emit GameCleanup(player, user.currentRequestId, GameStatus.CANCELLED);
    }

    function setHistorySize(uint256 newSize) external {
        require(newSize > 0, "History size must be positive");
        require(newSize <= 100, "History size too large"); // Prevent excessive storage
        UserGameData storage user = userData[msg.sender];
        user.maxHistorySize = newSize;
        
        // Trim existing bets history if necessary
        while (user.betHistory.length > newSize) {
            user.betHistory.pop();
        }
    }

    function getHistorySize(address player) external view returns (uint256) {
        UserGameData storage user = userData[player];
        return user.maxHistorySize == 0 ? DEFAULT_HISTORY_SIZE : user.maxHistorySize;
    }

    // Add a more detailed request status function
    function getRequestStatus(uint256 requestId) external view returns (
        bool exists,
        bool fulfilled,
        uint256[] memory randomWords
    ) {
        RequestStatus storage request = s_requests[requestId];
        return (
            request.exists,
            request.fulfilled,
            request.randomWords
        );
    }
}
