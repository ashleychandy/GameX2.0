// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMyToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function revokeRole(bytes32 role, address account) external;
    function grantRole(bytes32 role, address account) external;
}

enum GameStatus {
    COMPLETED_WIN,
    COMPLETED_LOSS
}

enum BetType {
    Straight,    // Single number bet
    Split,       // Two adjacent numbers
    Street,      // Three numbers in a row
    Corner,      // Four numbers in a square
    SixLine,     // Six numbers (two rows)
    Dozen,       // 12 numbers (1-12, 13-24, 25-36)
    Column,      // 12 numbers (vertical)
    Red,         // Red numbers
    Black,       // Black numbers
    Even,        // Even numbers
    Odd,         // Odd numbers
    Low,         // 1-18
    High         // 19-36
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
    Bet[] betHistory;
    uint8[] winningNumbersHistory;
    uint256 totalBets;
    uint256 totalWinnings;
    uint256 totalLosses;
    uint256 gamesPlayed;
    uint256 lastPlayedTimestamp;
    uint256 maxHistorySize;
}

struct BetRequest {
    uint8[] numbers;
    uint256 amount;
    BetType betType;
}


contract RouletteV2 is  Pausable, Ownable, ReentrancyGuard {
    // Constants
    uint8 public constant MAX_NUMBER = 36;
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant DEFAULT_HISTORY_SIZE = 10;
    uint256 private constant MAX_BETS_PER_SPIN = 15;

    // Token variables
    IMyToken public myToken;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // State variables
    mapping(address => UserGameData) public userData;
    uint256 public totalGamesPlayed;
    uint256 public totalPayoutAmount;
    mapping(address => bool) private owners;
    uint256 private numOwners;
    uint8 public winningNumber;

    // Events
    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event GameCompleted(address indexed player, uint8 winningNumber, uint256 totalPayout);

    // Errors
    error InvalidBetParameters(string reason);
    error InsufficientContractBalance(uint256 required, uint256 available);
    error InvalidBetType(uint256 betType);
    error InsufficientUserBalance(uint256 required, uint256 available);
    error TransferFailed(address from, address to, uint256 amount);
    error BurnFailed(address account, uint256 amount);
    error MintFailed(address account, uint256 amount);
    error MissingContractRole(bytes32 role);
    error InsufficientAllowance(uint256 required, uint256 allowed);

    constructor(address _myTokenAddress) Ownable(msg.sender) {
        require(_myTokenAddress != address(0), "Token address cannot be zero");
        
        myToken = IMyToken(_myTokenAddress);
        owners[msg.sender] = true;
        numOwners = 1;
        emit OwnerAdded(msg.sender);
    }


    function placeManyBetsAndSpin(BetRequest[] calldata bets) external nonReentrant whenNotPaused {
        UserGameData storage user = userData[msg.sender];
        
        if (bets.length == 0) revert InvalidBetParameters("No bets provided");
        if (bets.length > MAX_BETS_PER_SPIN) revert InvalidBetParameters("Too many bets");

        // Generate random winning number
        winningNumber = _generateRandomNumber();

        // Add explicit validation for bet amounts
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].amount == 0) revert InvalidBetParameters("Invalid bet amount");
            if (!_isValidBet(bets[i].numbers, bets[i].betType)) {
                revert InvalidBetParameters("Invalid bet configuration");
            }
        }

        // Initialize history size if not set
        if (user.maxHistorySize == 0) {
            user.maxHistorySize = DEFAULT_HISTORY_SIZE;
        }

        // Calculate total amount and validate bets
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < bets.length; i++) {
            totalAmount += bets[i].amount;
        }

        // Check user balance and allowance
        if (myToken.balanceOf(msg.sender) < totalAmount) {
            revert InsufficientUserBalance(totalAmount, myToken.balanceOf(msg.sender));
        }

        if (myToken.allowance(msg.sender, address(this)) < totalAmount) {
            revert InsufficientAllowance(totalAmount, myToken.allowance(msg.sender, address(this)));
        }

        // Process bets and calculate payouts immediately
        uint256 totalPayout = 0;
        Bet[] memory completedBets = new Bet[](bets.length);

        for (uint256 i = 0; i < bets.length; i++) {
            uint256 payout = _calculatePayout(
                bets[i].numbers,
                bets[i].betType,
                bets[i].amount,
                winningNumber
            );

            completedBets[i] = Bet({
                numbers: bets[i].numbers,
                amount: bets[i].amount,
                betType: bets[i].betType,
                timestamp: block.timestamp,
                winningNumber: winningNumber,
                completed: true,
                payout: payout,
                status: payout > 0 ? GameStatus.COMPLETED_WIN : GameStatus.COMPLETED_LOSS
            });

            if (payout > 0) {
                user.totalWinnings += payout;
                totalPayout += payout;
            } else {
                user.totalLosses += bets[i].amount;
            }
            
            // Add to bet history
            user.betHistory.push(completedBets[i]);
        }

        // Update winning numbers history
        _updateWinningHistory(user, winningNumber);

        // Process payouts
        if (totalPayout > 0) {
            if (!myToken.hasRole(MINTER_ROLE, address(this))) {
                revert MissingContractRole(MINTER_ROLE);
            }
            try myToken.mint(msg.sender, totalPayout) {
            } catch {
                revert MintFailed(msg.sender, totalPayout);
            }
        }

        // Update user data
        user.totalBets += totalAmount;
        user.gamesPlayed += 1;
        user.lastPlayedTimestamp = block.timestamp;

        // Update global stats
        totalGamesPlayed++;
        totalPayoutAmount += totalPayout;

        emit GameCompleted(msg.sender, winningNumber, totalPayout);
    }

    function _updateWinningHistory(UserGameData storage user, uint8 _winningNumber) private {
        if (user.maxHistorySize == 0) {
            user.maxHistorySize = DEFAULT_HISTORY_SIZE;
        }
        
        if (user.winningNumbersHistory.length >= user.maxHistorySize) {
            for (uint256 i = 0; i < user.winningNumbersHistory.length - 1; i++) {
                user.winningNumbersHistory[i] = user.winningNumbersHistory[i + 1];
            }
            user.winningNumbersHistory[user.winningNumbersHistory.length - 1] = _winningNumber;
        } else {
            user.winningNumbersHistory.push(_winningNumber);
        }
    }

    function _calculatePayout(uint8[] memory numbers, BetType betType, uint256 betAmount, uint8 _winningNumber) private pure returns (uint256) {
        if (betAmount == 0) return 0;
        
        if (_isBetWinning(numbers, betType, _winningNumber)) {
            uint256 multiplier = getPayoutMultiplier(betType);
            uint256 winnings = (betAmount * multiplier) / DENOMINATOR;
            require(winnings <= type(uint256).max - betAmount, "Payout overflow");
            return betAmount + winnings;
        }
        return 0;
    }

    function _isBetWinning(uint8[] memory numbers, BetType betType, uint8 _winningNumber) private pure returns (bool) {
        if (_winningNumber > MAX_NUMBER) return false;
        
        if (_winningNumber == 0) {
            return (betType == BetType.Straight && numbers.length == 1 && numbers[0] == 0);
        }
        
        if (betType == BetType.Red) return _isRed(_winningNumber);
        if (betType == BetType.Black) return !_isRed(_winningNumber) && _winningNumber != 0;
        if (betType == BetType.Even) return _winningNumber % 2 == 0 && _winningNumber != 0;
        if (betType == BetType.Odd) return _winningNumber % 2 == 1;
        if (betType == BetType.Low) return _winningNumber >= 1 && _winningNumber <= 18;
        if (betType == BetType.High) return _winningNumber >= 19 && _winningNumber <= 36;
        
        for (uint8 i = 0; i < numbers.length; i++) {
            if (numbers[i] == _winningNumber) return true;
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

    function getPayoutMultiplier(BetType betType) internal pure returns (uint256) {
        // DENOMINATOR = 10000
        if (betType == BetType.Straight) return 35 * DENOMINATOR;     // 35:1
        if (betType == BetType.Split) return 17 * DENOMINATOR;        // 17:1
        if (betType == BetType.Street) return 11 * DENOMINATOR;       // 11:1
        if (betType == BetType.Corner) return 8 * DENOMINATOR;        // 8:1
        if (betType == BetType.SixLine) return 5 * DENOMINATOR;       // 5:1
        if (betType == BetType.Dozen) return 2 * DENOMINATOR;         // 2:1 (Fixed)
        if (betType == BetType.Column) return 2 * DENOMINATOR;        // 2:1
        // Outside bets all pay 1:1
        return DENOMINATOR;                                           // 1:1
    }

    function calculatePayout(uint256 amount, BetType betType) internal pure returns (uint256) {
        if (amount == 0) return 0;
        
        uint256 multiplier = getPayoutMultiplier(betType);
        uint256 winnings = (amount * multiplier) / DENOMINATOR;
        return amount + winnings;
    }

    function _isValidBet(uint8[] memory numbers, BetType betType) private pure returns (bool) {
        for (uint8 i = 0; i < numbers.length; i++) {
            if (numbers[i] > MAX_NUMBER) return false;
        }

        if (betType == BetType.Straight) return numbers.length == 1;
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
        if (betType == BetType.Dozen) return _isValidDozen(numbers);
        if (betType == BetType.Column) return _isValidColumn(numbers);
        if (betType >= BetType.Red) return numbers.length == 0;
        return false;
    }

    // Helper functions for bet validation
    function _areAdjacentNumbers(uint8 a, uint8 b) private pure returns (bool) {
        if (a > MAX_NUMBER || b > MAX_NUMBER) return false;
        if (a > b) (a, b) = (b, a);
        return (b == a + 1 && a % 3 != 0) || (b == a + 3 && a <= 33);
    }

    function _isValidStreet(uint8[] memory numbers) private pure returns (bool) {
        if (numbers[0] > MAX_NUMBER - 2) return false;
        if (numbers[0] % 3 != 1) return false;
        return numbers[1] == numbers[0] + 1 && numbers[2] == numbers[0] + 2;
    }

    function _isValidCorner(uint8[] memory numbers) private pure returns (bool) {
        uint8[4] memory sortedNumbers = [numbers[0], numbers[1], numbers[2], numbers[3]];
        _sortNumbers4(sortedNumbers);
        if (sortedNumbers[0] > 32 || sortedNumbers[0] % 3 == 0) return false;
        return sortedNumbers[1] == sortedNumbers[0] + 1 &&
               sortedNumbers[2] == sortedNumbers[0] + 3 &&
               sortedNumbers[3] == sortedNumbers[0] + 4;
    }

    function _isValidSixLine(uint8[] memory numbers) private pure returns (bool) {
        uint8[6] memory sortedNumbers = [numbers[0], numbers[1], numbers[2], 
                                       numbers[3], numbers[4], numbers[5]];
        _sortNumbers6(sortedNumbers);
        if (sortedNumbers[0] > 31 || sortedNumbers[0] % 3 != 1) return false;
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

    // Admin functions
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

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

    // View functions
    function getUserGameData(address player) external view returns (UserGameData memory) {
        return userData[player];
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

    function isOwner(address account) public view returns (bool) {
        return owners[account];
    }

    function setHistorySize(uint256 newSize) external whenNotPaused {
        require(newSize > 0, "History size must be positive");
        require(newSize <= 100, "History size too large");
        
        UserGameData storage user = userData[msg.sender];
        user.maxHistorySize = newSize;
        
        while (user.betHistory.length > newSize) {
            user.betHistory.pop();
        }
    }

    // Emergency functions
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
    }

    function _generateRandomNumber() private view returns (uint8) {
        return uint8(uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            totalGamesPlayed
        ))) % (MAX_NUMBER + 1));
    }
}
