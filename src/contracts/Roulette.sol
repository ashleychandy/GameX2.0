// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address callerConfirmation) external;
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}



enum BetType {
    Straight,    // Single number bet
    Dozen,       // 12 numbers (1-12, 13-24, 25-36)
    Column,      // 12 numbers (vertical 2:1)
    Red,         // Red numbers
    Black,       // Black numbers
    Even,        // Even numbers
    Odd,         // Odd numbers
    Low,         // 1-18
    High         // 19-36
}

struct Bet {
    uint256 timestamp;
    BetType betType;
    uint8[] numbers;
    uint256 amount;
    uint256 payout;
    uint8 winningNumber;
}

struct UserGameData {
    Bet[] recentBets;
    uint256 maxHistorySize;
}

struct BetRequest {
    uint8[] numbers;
    uint256 amount;
    BetType betType;
}


contract RouletteV2 is ReentrancyGuard {
    // Constants
    uint8 public constant MAX_NUMBER = 36;
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant MAX_HISTORY_SIZE = 10;
    uint256 private constant MAX_BETS_PER_SPIN = 15;
    uint256 public constant MAX_BET_AMOUNT = 100_000 * 10**18;     // 100k tokens per bet
    uint256 public constant MAX_TOTAL_BET_AMOUNT = 500_000 * 10**18;  // 500k tokens total per spin
    uint256 public constant MAX_POSSIBLE_PAYOUT = 18_000_000 * 10**18; // 18M tokens (500k * 36)

    // Token variables
    IERC20 public gamaToken;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // State variables
    mapping(address => UserGameData) public userData;
    uint256 public totalGamesPlayed;
    uint256 public totalPayoutAmount;
    uint8 public winningNumber;

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
    error MaxPayoutExceeded(uint256 potentialPayout, uint256 maxAllowed);

    constructor(address _gamaTokenAddress) {
        require(_gamaTokenAddress != address(0), "Token address cannot be zero");
        
        gamaToken = IERC20(_gamaTokenAddress);
    }


    function placeBet(BetRequest[] calldata bets) external nonReentrant {
        // 1. Input validation
        if (bets.length == 0) revert InvalidBetParameters("No bets provided");
        if (bets.length > MAX_BETS_PER_SPIN) revert InvalidBetParameters("Too many bets");

        // 2. State checks and initial setup
        UserGameData storage user = userData[msg.sender];

        // 3. Calculate totals and validate bet configurations
        uint256 totalAmount = 0;
        uint256 maxPossiblePayout = 0;
        
        for (uint256 i = 0; i < bets.length; i++) {
            // Validate individual bet parameters
            if (bets[i].amount == 0) revert InvalidBetParameters("Invalid bet amount");
            if (bets[i].amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Single bet amount too large");
            if (!_isValidBet(bets[i].numbers, bets[i].betType)) {
                revert InvalidBetParameters("Invalid bet configuration");
            }
            
            // Calculate and validate potential payout
            uint256 potentialPayout = calculatePayout(bets[i].amount, bets[i].betType);
            if (maxPossiblePayout + potentialPayout < maxPossiblePayout) revert("Payout overflow");
            maxPossiblePayout += potentialPayout;
            
            if (maxPossiblePayout > MAX_POSSIBLE_PAYOUT) {
                revert MaxPayoutExceeded(maxPossiblePayout, MAX_POSSIBLE_PAYOUT);
            }
            
            // Update and validate total amount
            totalAmount += bets[i].amount;
            if (totalAmount > MAX_TOTAL_BET_AMOUNT) revert InvalidBetParameters("Total bet amount too large");
        }

        // 4. Balance and allowance checks
        if (gamaToken.balanceOf(msg.sender) < totalAmount) {
            revert InsufficientUserBalance(totalAmount, gamaToken.balanceOf(msg.sender));
        }

        if (gamaToken.allowance(msg.sender, address(this)) < totalAmount) {
            revert InsufficientAllowance(totalAmount, gamaToken.allowance(msg.sender, address(this)));
        }

        if (gamaToken.balanceOf(address(this)) + totalAmount < maxPossiblePayout) {
            revert InsufficientContractBalance(maxPossiblePayout, gamaToken.balanceOf(address(this)) + totalAmount);
        }

        // 5. Role checks
        if (!gamaToken.hasRole(BURNER_ROLE, address(this))) {
            revert MissingContractRole(BURNER_ROLE);
        }

        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }

        // 6. Core game logic
        try gamaToken.burn(msg.sender, totalAmount) {
        } catch {
            revert BurnFailed(msg.sender, totalAmount);
        }

        // Generate winning number once for all bets in this round
        winningNumber = _generateRandomNumber();
        
        // Process bets and calculate payouts
        uint256 totalPayout = 0;

        for (uint256 i = 0; i < bets.length; i++) {
            uint256 payout = _calculatePayout(
                bets[i].numbers,
                bets[i].betType,
                bets[i].amount,
                winningNumber
            );

            if (totalPayout + payout < totalPayout) {
                revert("Payout overflow");
            }
            totalPayout += payout;

            Bet memory newBet = Bet({
                numbers: bets[i].numbers,
                amount: bets[i].amount,
                betType: bets[i].betType,
                timestamp: block.timestamp,
                payout: payout,
                winningNumber: winningNumber
            });

            // Add to user's bet history
            if (user.recentBets.length >= MAX_HISTORY_SIZE) {
                // Shift elements to make room for new bet
                for (uint256 j = 0; j < user.recentBets.length - 1; j++) {
                    user.recentBets[j] = user.recentBets[j + 1];
                }
                user.recentBets[user.recentBets.length - 1] = newBet;
            } else {
                user.recentBets.push(newBet);
            }
        }

        // Process payouts if any wins
        if (totalPayout > 0) {
            // Verify contract has minter role before proceeding
            if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
                revert MissingContractRole(MINTER_ROLE);
            }
            try gamaToken.mint(msg.sender, totalPayout) {
            } catch {
                revert MintFailed(msg.sender, totalPayout);
            }
        }

        // Update global stats
        totalGamesPlayed++;
        totalPayoutAmount += totalPayout;
    }

    function _calculatePayout(uint8[] memory numbers, BetType betType, uint256 betAmount, uint8 _winningNumber) private pure returns (uint256) {
        if (betAmount == 0) return 0;
        if (betAmount > MAX_BET_AMOUNT) revert InvalidBetParameters("Bet amount exceeds maximum");
        
        if (_isBetWinning(numbers, betType, _winningNumber)) {
            uint256 multiplier = getPayoutMultiplier(betType);
            if (multiplier == 0) revert("Invalid multiplier");
            
            uint256 winnings = (betAmount * multiplier) / DENOMINATOR;
            
            if (winnings > MAX_POSSIBLE_PAYOUT) {
                revert MaxPayoutExceeded(winnings, MAX_POSSIBLE_PAYOUT);
            }
            
            return winnings;
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
        if (betType == BetType.Dozen) return 2 * DENOMINATOR;         // 2:1
        if (betType == BetType.Column) return 2 * DENOMINATOR;        // 2:1
        if (betType >= BetType.Red && betType <= BetType.High) {
            return DENOMINATOR;                                       // 1:1
        }
        revert InvalidBetType(uint256(betType));
    }

    function calculatePayout(uint256 amount, BetType betType) internal pure returns (uint256) {
        if (amount == 0) return 0;
        if (amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Bet amount exceeds maximum");
        
        uint256 multiplier = getPayoutMultiplier(betType);
        if (multiplier == 0) revert("Invalid multiplier");
        
        uint256 winnings = (amount * multiplier) / DENOMINATOR;
        
        // Verify against maximum possible payout
        if (winnings > MAX_POSSIBLE_PAYOUT) {
            revert MaxPayoutExceeded(winnings, MAX_POSSIBLE_PAYOUT);
        }
        
        return winnings;
    }

    function _isValidBet(uint8[] memory numbers, BetType betType) private pure returns (bool) {
        // Validate number range for relevant bet types
        if (betType == BetType.Straight || betType == BetType.Dozen || betType == BetType.Column) {
            for (uint8 i = 0; i < numbers.length; i++) {
                if (numbers[i] > MAX_NUMBER) return false;
            }
        }

        // Specific validations for each bet type
        if (betType == BetType.Straight) {
            return numbers.length == 1;
        } else if (betType == BetType.Dozen) {
            return _isValidDozen(numbers);
        } else if (betType == BetType.Column) {
            return _isValidColumn(numbers);
        } else if (betType == BetType.Red || betType == BetType.Black || betType == BetType.Even || betType == BetType.Odd || betType == BetType.Low || betType == BetType.High) {
            // For these bet types, the numbers array is ignored
            return true;
        } else {
            return false;
        }
    }

    // Helper functions for bet validation
    function _isValidDozen(uint8[] memory numbers) private pure returns (bool) {
        if (numbers.length != 12) return false;
        
        // Check if first number is valid starting point for dozens
        uint8 start = numbers[0];
        if (start != 1 && start != 13 && start != 25) return false;
        
        // Ensure numbers are sequential within the dozen
        for (uint8 i = 0; i < 12; i++) {
            if (numbers[i] != start + i) return false;
        }
        
        return true;
    }

    function _isValidColumn(uint8[] memory numbers) private pure returns (bool) {
        if (numbers.length != 12) return false;
        
        // Check if numbers form a valid column based on the visual layout
        // Column 1 (right): 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
        // Column 2 (middle): 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
        // Column 3 (left): 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
        
        uint8[] memory validStarts = new uint8[](3);
        validStarts[0] = 3;
        validStarts[1] = 2;
        validStarts[2] = 1;
        
        bool isValidStart = false;
        uint8 start = numbers[0];
        
        // Check if it starts with a valid column number
        for (uint8 i = 0; i < validStarts.length; i++) {
            if (start == validStarts[i]) {
                isValidStart = true;
                break;
            }
        }
        if (!isValidStart) return false;

        // For column starting with 3: increment by 3
        // For column starting with 2: increment by 3
        // For column starting with 1: increment by 3
        for (uint8 i = 0; i < 12; i++) {
            uint8 expected = start + (i * 3);
            if (numbers[i] != expected || expected > MAX_NUMBER) return false;
        }
        
        return true;
    }

    // Add helper function to get column numbers
    function _getColumnNumbers(uint8 columnStart) private pure returns (uint8[] memory) {
        uint8[] memory numbers = new uint8[](12);
        for (uint8 i = 0; i < 12; i++) {
            numbers[i] = columnStart + (i * 3);
        }
        return numbers;
    }

    // Add helper function to get dozen numbers
    function _getDozenNumbers(uint8 dozenStart) private pure returns (uint8[] memory) {
        uint8[] memory numbers = new uint8[](12);
        for (uint8 i = 0; i < 12; i++) {
            numbers[i] = dozenStart + i;
        }
        return numbers;
    }

    // Add view function to help frontend validate bets
    function getValidBetNumbers(BetType betType, uint8 start) external pure returns (uint8[] memory) {
        if (betType == BetType.Column) {
            require(start == 1 || start == 2 || start == 3, "Invalid column start");
            return _getColumnNumbers(start);
        } else if (betType == BetType.Dozen) {
            require(start == 1 || start == 13 || start == 25, "Invalid dozen start");
            return _getDozenNumbers(start);
        } else {
            revert("Invalid bet type for number generation");
        }
    }

    // View functions
    function getUserGameData(address player) external view returns (Bet[] memory) {
        return userData[player].recentBets;
    }

    function getContractStats() external view returns (
        uint256 totalGames,
        uint256 totalPayout,
        uint256 currentBalance
    ) {
        return (
            totalGamesPlayed,
            totalPayoutAmount,
            gamaToken.balanceOf(address(this))
        );
    }

    function getBettingLimits() external pure returns (
        uint256 maxBetsPerSpin,
        uint256 maxBetAmount,
        uint256 maxTotalBetAmount,
        uint256 maxPossiblePayout
    ) {
        return (
            MAX_BETS_PER_SPIN,
            MAX_BET_AMOUNT,
            MAX_TOTAL_BET_AMOUNT,
            MAX_POSSIBLE_PAYOUT
        );
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
