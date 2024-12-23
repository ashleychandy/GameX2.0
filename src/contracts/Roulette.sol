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
    uint8 betTypeId;     // Using the constants above instead of enum
    uint8 number;        // Single number for straight bets
    uint256 amount;      // Amount of tokens to bet
}


contract RouletteV2 is ReentrancyGuard {
    // Constants
    uint8 public constant MAX_NUMBER = 36;
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant MAX_HISTORY_SIZE = 10;
    uint256 private constant MAX_BETS_PER_SPIN = 15;
    uint256 public constant MAX_BET_AMOUNT = 100_000 * 10**18;     // 100k tokens per bet
    uint256 public constant MAX_TOTAL_BET_AMOUNT = 500_000 * 10**18;  // 500k tokens total per spin
    uint256 public constant MAX_POSSIBLE_PAYOUT = 17_500_000 * 10**18; // 17.5M tokens (500k * 35)

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

    // Bet type number mappings for frontend
    uint8 public constant STRAIGHT_BET = 0;
    uint8 public constant DOZEN_BET_FIRST = 1;    // 1-12
    uint8 public constant DOZEN_BET_SECOND = 2;   // 13-24
    uint8 public constant DOZEN_BET_THIRD = 3;    // 25-36
    uint8 public constant COLUMN_BET_FIRST = 4;   // 1,4,7...
    uint8 public constant COLUMN_BET_SECOND = 5;  // 2,5,8...
    uint8 public constant COLUMN_BET_THIRD = 6;   // 3,6,9...
    uint8 public constant RED_BET = 7;
    uint8 public constant BLACK_BET = 8;
    uint8 public constant EVEN_BET = 9;
    uint8 public constant ODD_BET = 10;
    uint8 public constant LOW_BET = 11;
    uint8 public constant HIGH_BET = 12;

    constructor(address _gamaTokenAddress) {
        require(_gamaTokenAddress != address(0), "Token address cannot be zero");
        
        gamaToken = IERC20(_gamaTokenAddress);
    }


    function placeBet(BetRequest[] calldata betRequests) external nonReentrant {
        // 1. Input validation
        if (betRequests.length == 0) revert InvalidBetParameters("No bets provided");
        if (betRequests.length > MAX_BETS_PER_SPIN) revert InvalidBetParameters("Too many bets");

        // 2. State checks and initial setup
        UserGameData storage user = userData[msg.sender];
        uint256 totalAmount;
        uint256 maxPossiblePayout;
        
        // 3. Pre-validate all bets and calculate totals in a single pass
        (totalAmount, maxPossiblePayout) = _validateAndCalculateTotals(betRequests);

        // 4. Balance and allowance checks
        _checkBalancesAndAllowances(msg.sender, totalAmount, maxPossiblePayout);

        // 5. Process the game
        uint256 totalPayout = _processGame(betRequests, user, totalAmount);

        // 6. Update global stats
        totalGamesPlayed++;
        totalPayoutAmount += totalPayout;
    }

    function _validateAndCalculateTotals(BetRequest[] calldata bets) private pure returns (uint256 totalAmount, uint256 maxPossiblePayout) {
        for (uint256 i = 0; i < bets.length; i++) {
            // Each bet can have a different amount
            if (bets[i].amount == 0) revert InvalidBetParameters("Invalid bet amount");
            if (bets[i].amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Single bet amount too large");
            
            totalAmount += bets[i].amount;
            
            // Calculate potential payout based on bet type
            (BetType betType,) = _processBetRequest(bets[i]);
            uint256 multiplier = getPayoutMultiplier(betType);
            uint256 potentialPayout = (bets[i].amount * multiplier) / DENOMINATOR;
            
            maxPossiblePayout += potentialPayout;
            
            // Ensures total of all bets doesn't exceed MAX_TOTAL_BET_AMOUNT (500k tokens)
            if (totalAmount > MAX_TOTAL_BET_AMOUNT) revert InvalidBetParameters("Total bet amount too large");
        }
    }

    function _checkBalancesAndAllowances(address player, uint256 totalAmount, uint256 maxPossiblePayout) private view {
        if (gamaToken.balanceOf(player) < totalAmount) {
            revert InsufficientUserBalance(totalAmount, gamaToken.balanceOf(player));
        }

        if (gamaToken.allowance(player, address(this)) < totalAmount) {
            revert InsufficientAllowance(totalAmount, gamaToken.allowance(player, address(this)));
        }

        if (gamaToken.balanceOf(address(this)) + totalAmount < maxPossiblePayout) {
            revert InsufficientContractBalance(maxPossiblePayout, gamaToken.balanceOf(address(this)) + totalAmount);
        }

        if (!gamaToken.hasRole(BURNER_ROLE, address(this))) {
            revert MissingContractRole(BURNER_ROLE);
        }

        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
    }

    function _processGame(BetRequest[] calldata bets, UserGameData storage user, uint256 totalAmount) private returns (uint256 totalPayout) {
        // Burn tokens first
        try gamaToken.burn(msg.sender, totalAmount) {
        } catch {
            revert BurnFailed(msg.sender, totalAmount);
        }

        // Generate winning number once for all bets
        winningNumber = _generateRandomNumber();
        
        // Process all bets
        for (uint256 i = 0; i < bets.length; i++) {
            // Convert betTypeId to BetType and get numbers
            (BetType betType, uint8[] memory numbers) = _processBetRequest(bets[i]);
            
            uint256 payout = _calculatePayout(
                numbers,
                betType,
                bets[i].amount,
                winningNumber
            );

            if (totalPayout + payout < totalPayout) revert("Payout overflow");
            totalPayout += payout;

            // Create Bet struct for history
            Bet memory newBet = Bet({
                timestamp: block.timestamp,
                betType: betType,
                numbers: numbers,
                amount: bets[i].amount,
                payout: payout,
                winningNumber: winningNumber
            });

            _updateUserHistory(user, newBet);
        }

        // Process payouts if any wins
        if (totalPayout > 0) {
            try gamaToken.mint(msg.sender, totalPayout) {
            } catch {
                revert MintFailed(msg.sender, totalPayout);
            }
        }
        
        return totalPayout;
    }

    function _updateUserHistory(UserGameData storage user, Bet memory newBet) private {
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
        if (betType == BetType.Straight) return 35 * DENOMINATOR;     // 35:1 payout (get 35x plus original bet)
        if (betType == BetType.Dozen) return 2 * DENOMINATOR;         // 2:1 payout (get 2x plus original bet)
        if (betType == BetType.Column) return 2 * DENOMINATOR;        // 2:1 payout (get 2x plus original bet)
        if (betType >= BetType.Red && betType <= BetType.High) {
            return DENOMINATOR;                                        // 1:1 payout (get 1x plus original bet)
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

    

    function _generateRandomNumber() private view returns (uint8) {
        return uint8(uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            totalGamesPlayed
        ))) % (MAX_NUMBER + 1));
    }

    // Move getBetTypeInfo before _processBetRequest
    function getBetTypeInfo(uint8 betTypeId) public pure returns (
        string memory name,
        bool requiresNumber,
        uint256 payoutMultiplier
    ) {
        if (betTypeId == STRAIGHT_BET) 
            return ("Straight", true, 35 * DENOMINATOR);
        if (betTypeId == DOZEN_BET_FIRST) 
            return ("First Dozen (1-12)", false, 2 * DENOMINATOR);
        if (betTypeId == DOZEN_BET_SECOND)
            return ("Second Dozen (13-24)", false, 2 * DENOMINATOR);
        if (betTypeId == DOZEN_BET_THIRD)
            return ("Third Dozen (25-36)", false, 2 * DENOMINATOR);
        if (betTypeId == COLUMN_BET_FIRST)
            return ("First Column", false, 2 * DENOMINATOR);
        if (betTypeId == COLUMN_BET_SECOND) 
            return ("Second Column", false, 2 * DENOMINATOR);
        if (betTypeId == COLUMN_BET_THIRD)
            return ("Third Column", false, 2 * DENOMINATOR);
        if (betTypeId == RED_BET)
            return ("Red", false, DENOMINATOR);
        if (betTypeId == BLACK_BET)
            return ("Black", false, DENOMINATOR);
        if (betTypeId == EVEN_BET)
            return ("Even", false, DENOMINATOR);
        if (betTypeId == ODD_BET)
            return ("Odd", false, DENOMINATOR);
        if (betTypeId == LOW_BET)
            return ("Low (1-18)", false, DENOMINATOR);
        if (betTypeId == HIGH_BET)
            return ("High (19-36)", false, DENOMINATOR);
        revert InvalidBetParameters("Invalid bet type ID");
    }

    // Add helper function to convert betTypeId to BetType and generate numbers
    function _processBetRequest(BetRequest calldata bet) private pure returns (
        BetType betType,
        uint8[] memory numbers
    ) {
        if (bet.betTypeId == STRAIGHT_BET) {
            require(bet.number <= MAX_NUMBER, "Invalid number for straight bet");
            numbers = new uint8[](1);
            numbers[0] = bet.number;
            return (BetType.Straight, numbers);
        }
        else if (bet.betTypeId == DOZEN_BET_FIRST) {
            return (BetType.Dozen, _getDozenNumbers(1));
        }
        else if (bet.betTypeId == DOZEN_BET_SECOND) {
            return (BetType.Dozen, _getDozenNumbers(13));
        }
        else if (bet.betTypeId == DOZEN_BET_THIRD) {
            return (BetType.Dozen, _getDozenNumbers(25));
        }
        else if (bet.betTypeId == COLUMN_BET_FIRST) {
            return (BetType.Column, _getColumnNumbers(1));
        }
        else if (bet.betTypeId == COLUMN_BET_SECOND) {
            return (BetType.Column, _getColumnNumbers(2));
        }
        else if (bet.betTypeId == COLUMN_BET_THIRD) {
            return (BetType.Column, _getColumnNumbers(3));
        }
        else if (bet.betTypeId == RED_BET) {
            return (BetType.Red, new uint8[](0));
        }
        else if (bet.betTypeId == BLACK_BET) {
            return (BetType.Black, new uint8[](0));
        }
        else if (bet.betTypeId == EVEN_BET) {
            return (BetType.Even, new uint8[](0));
        }
        else if (bet.betTypeId == ODD_BET) {
            return (BetType.Odd, new uint8[](0));
        }
        else if (bet.betTypeId == LOW_BET) {
            return (BetType.Low, new uint8[](0));
        }
        else if (bet.betTypeId == HIGH_BET) {
            return (BetType.High, new uint8[](0));
        }
        
        revert InvalidBetParameters("Invalid bet type ID");
    }

    // Get all valid bet types and their info
    function getAllBetTypes() external pure returns (
        uint8[] memory betTypeIds,
        string[] memory names,
        bool[] memory requiresNumbers,
        uint256[] memory payoutMultipliers
    ) {
        betTypeIds = new uint8[](13);
        names = new string[](13);
        requiresNumbers = new bool[](13);
        payoutMultipliers = new uint256[](13);

        for (uint8 i = 0; i < 13; i++) {
            (string memory name, bool requiresNumber, uint256 multiplier) = getBetTypeInfo(i);
            betTypeIds[i] = i;
            names[i] = name;
            requiresNumbers[i] = requiresNumber;
            payoutMultipliers[i] = multiplier;
        }
    }

    // Get user's bet history with pagination
    function getUserBetHistory(
        address player,
        uint256 offset,
        uint256 limit
    ) external view returns (
        Bet[] memory bets,
        uint256 total
    ) {
        Bet[] memory allBets = userData[player].recentBets;
        uint256 totalBets = allBets.length;
        
        if (offset >= totalBets) {
            return (new Bet[](0), totalBets);
        }
        
        uint256 end = offset + limit;
        if (end > totalBets) {
            end = totalBets;
        }
        
        uint256 size = end - offset;
        bets = new Bet[](size);
        
        for (uint256 i = 0; i < size; i++) {
            bets[i] = allBets[offset + i];
        }
        
        return (bets, totalBets);
    }

    // Get detailed info about a specific bet from history
    function getBetDetails(address player, uint256 betIndex) external view returns (
        uint256 timestamp,
        string memory betTypeName,
        uint8[] memory numbers,
        uint256 amount,
        uint256 payout,
        uint8 resultNumber,
        bool isWin
    ) {
        require(betIndex < userData[player].recentBets.length, "Invalid bet index");
        
        Bet memory bet = userData[player].recentBets[betIndex];
        (string memory name,,) = getBetTypeInfo(uint8(bet.betType));
        
        return (
            bet.timestamp,
            name,
            bet.numbers,
            bet.amount,
            bet.payout,
            bet.winningNumber,
            bet.payout > 0
        );
    }

    // Check if contract has sufficient balance and permissions
    function checkContractHealth() external view returns (
        bool hasSufficientBalance,
        bool hasMinterRole,
        bool hasBurnerRole,
        uint256 currentBalance,
        uint256 maxRequiredBalance
    ) {
        currentBalance = gamaToken.balanceOf(address(this));
        maxRequiredBalance = MAX_POSSIBLE_PAYOUT;
        
        return (
            currentBalance >= maxRequiredBalance,
            gamaToken.hasRole(MINTER_ROLE, address(this)),
            gamaToken.hasRole(BURNER_ROLE, address(this)),
            currentBalance,
            maxRequiredBalance
        );
    }

    // Get all possible winning numbers for a bet type
    function getPossibleWinningNumbers(uint8 betTypeId) external pure returns (uint8[] memory numbers) {
        if (betTypeId == STRAIGHT_BET) {
            numbers = new uint8[](37); // 0-36
            for (uint8 i = 0; i <= 36; i++) {
                numbers[i] = i;
            }
        }
        else if (betTypeId == RED_BET) {
            numbers = new uint8[](18);
            uint8[18] memory redNumbers = [
                1, 3, 5, 7, 9, 12, 14, 16, 18, 
                19, 21, 23, 25, 27, 30, 32, 34, 36
            ];
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = redNumbers[i];
            }
        }
        else if (betTypeId == BLACK_BET) {
            numbers = new uint8[](18);
            uint8[18] memory blackNumbers = [
                2, 4, 6, 8, 10, 11, 13, 15, 17,
                20, 22, 24, 26, 28, 29, 31, 33, 35
            ];
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = blackNumbers[i];
            }
        }
        else if (betTypeId == EVEN_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = (i + 1) * 2;
            }
        }
        else if (betTypeId == ODD_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = (i * 2) + 1;
            }
        }
        else if (betTypeId == LOW_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = i + 1;
            }
        }
        else if (betTypeId == HIGH_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = i + 19;
            }
        }
        else {
            revert InvalidBetParameters("Invalid bet type ID for number generation");
        }
    }
}
