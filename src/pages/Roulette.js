import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// Constants for bet types to match contract
const BetTypes = {
  STRAIGHT_BET: 0, // Single number bet
  DOZEN_BET_FIRST: 1, // 1-12
  DOZEN_BET_SECOND: 2, // 13-24
  DOZEN_BET_THIRD: 3, // 25-36
  COLUMN_BET_FIRST: 4, // 1,4,7...
  COLUMN_BET_SECOND: 5, // 2,5,8...
  COLUMN_BET_THIRD: 6, // 3,6,9...
  RED_BET: 7, // Red numbers
  BLACK_BET: 8, // Black numbers
  EVEN_BET: 9, // Even numbers
  ODD_BET: 10, // Odd numbers
  LOW_BET: 11, // 1-18
  HIGH_BET: 12, // 19-36

  // Helper function to validate bet type
  isValid: function (type) {
    return type >= 0 && type <= 12;
  },

  // Helper function to get numbers for a bet type
  getNumbers: function (type, number = 0) {
    switch (type) {
      case this.STRAIGHT_BET:
        return [number];
      case this.DOZEN_BET_FIRST:
        return Array.from({ length: 12 }, (_, i) => 1 + i);
      case this.DOZEN_BET_SECOND:
        return Array.from({ length: 12 }, (_, i) => 13 + i);
      case this.DOZEN_BET_THIRD:
        return Array.from({ length: 12 }, (_, i) => 25 + i);
      case this.COLUMN_BET_FIRST:
        return Array.from({ length: 12 }, (_, i) => 1 + i * 3);
      case this.COLUMN_BET_SECOND:
        return Array.from({ length: 12 }, (_, i) => 2 + i * 3);
      case this.COLUMN_BET_THIRD:
        return Array.from({ length: 12 }, (_, i) => 3 + i * 3);
      case this.RED_BET:
      case this.BLACK_BET:
      case this.EVEN_BET:
      case this.ODD_BET:
      case this.LOW_BET:
      case this.HIGH_BET:
        return [];
      default:
        throw new Error(`Invalid bet type: ${type}`);
    }
  },
};

// Contract constants
const CONTRACT_CONSTANTS = {
  MAX_BETS_PER_SPIN: 15,
  MAX_BET_AMOUNT: BigInt("100000000000000000000000"), // 100k tokens
  MAX_TOTAL_BET_AMOUNT: BigInt("500000000000000000000000"), // 500k tokens
  MAX_POSSIBLE_PAYOUT: BigInt("17500000000000000000000000"), // 17.5M tokens
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
  BURNER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE")),
};

// Chip values for betting
const CHIP_VALUES = [
  { value: "1000000000000000000", label: "1" },
  { value: "5000000000000000000", label: "5" },
  { value: "10000000000000000000", label: "10" },
  { value: "50000000000000000000", label: "50" },
  { value: "100000000000000000000", label: "100" },
  { value: "500000000000000000000", label: "500" },
  { value: "1000000000000000000000", label: "1K" },
  { value: "5000000000000000000000", label: "5K" },
];

const BettingBoard = ({
  onBetSelect,
  selectedBets,
  disabled,
  selectedChipValue,
  contracts,
  account,
}) => {
  // Add hover state
  const [hoveredNumbers, setHoveredNumbers] = useState([]);

  // Helper function to check if a number is currently hovered
  const isNumberHovered = (number) => hoveredNumbers.includes(number);

  // Helper function to get numbers for different bet types
  const getNumbersForBetType = (type, start = 1) => {
    switch (type) {
      case BetTypes.DOZEN_BET_FIRST:
        return Array.from({ length: 12 }, (_, i) => i + 1);
      case BetTypes.DOZEN_BET_SECOND:
        return Array.from({ length: 12 }, (_, i) => i + 13);
      case BetTypes.DOZEN_BET_THIRD:
        return Array.from({ length: 12 }, (_, i) => i + 25);
      case BetTypes.COLUMN_BET_FIRST:
        return Array.from({ length: 12 }, (_, i) => 1 + i * 3);
      case BetTypes.COLUMN_BET_SECOND:
        return Array.from({ length: 12 }, (_, i) => 2 + i * 3);
      case BetTypes.COLUMN_BET_THIRD:
        return Array.from({ length: 12 }, (_, i) => 3 + i * 3);
      case BetTypes.RED_BET:
        return redNumbers;
      case BetTypes.BLACK_BET:
        return Array.from({ length: 36 }, (_, i) => i + 1).filter(
          (num) => !redNumbers.includes(num),
        );
      case BetTypes.EVEN_BET:
        return Array.from({ length: 36 }, (_, i) => i + 1).filter(
          (num) => num % 2 === 0,
        );
      case BetTypes.ODD_BET:
        return Array.from({ length: 36 }, (_, i) => i + 1).filter(
          (num) => num % 2 === 1,
        );
      case BetTypes.LOW_BET:
        return Array.from({ length: 18 }, (_, i) => i + 1);
      case BetTypes.HIGH_BET:
        return Array.from({ length: 18 }, (_, i) => i + 19);
      default:
        return [];
    }
  };

  // Helper function to get total bet amount for a position
  const getBetAmount = useCallback(
    (numbers, type) => {
      // For column bets, find by first number
      if (
        type === BetTypes.COLUMN_BET_FIRST ||
        type === BetTypes.COLUMN_BET_SECOND ||
        type === BetTypes.COLUMN_BET_THIRD
      ) {
        const columnStart = Array.isArray(numbers) ? numbers[0] : numbers;
        const bet = selectedBets.find(
          (bet) =>
            bet.type === type &&
            bet.numbers.length === 12 &&
            bet.numbers[0] === columnStart,
        );
        return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
      }

      // For dozen bets, find by first number
      if (
        type === BetTypes.DOZEN_BET_FIRST ||
        type === BetTypes.DOZEN_BET_SECOND ||
        type === BetTypes.DOZEN_BET_THIRD
      ) {
        const dozenStart = Array.isArray(numbers) ? numbers[0] : numbers;
        const bet = selectedBets.find(
          (bet) =>
            bet.type === type &&
            bet.numbers.length === 12 &&
            bet.numbers[0] === dozenStart,
        );
        return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
      }

      // For other bets
      const bet = selectedBets.find(
        (bet) =>
          bet.type === type &&
          JSON.stringify(bet.numbers.sort()) ===
            JSON.stringify(
              Array.isArray(numbers) ? numbers.sort() : [numbers].sort(),
            ),
      );
      return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
    },
    [selectedBets],
  );

  const handleBet = useCallback(
    (numbers, type) => {
      if (!disabled) {
        onBetSelect(numbers, type);
      }
    },
    [disabled, onBetSelect],
  );

  // Define number colors and grid layout
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  const isRed = (number) => redNumbers.includes(Number(number));

  // Get background color class based on number
  const getNumberBackgroundClass = (number) => {
    const num = Number(number);
    console.log("Getting background for number:", num, typeof num);
    if (num === 0 || number === "0") {
      return "bg-gradient-to-br from-emerald-500 to-emerald-600";
    }
    if (isRed(num)) {
      return "bg-gradient-to-br from-gaming-primary to-gaming-primary/90";
    }
    if (num > 0 && num <= 36) {
      return "bg-gradient-to-br from-gray-800 to-gray-900";
    }
    return "bg-gradient-to-br from-secondary-700 to-secondary-800"; // Default for no number
  };

  // Define the grid layout in rows (top to bottom)
  const numberGrid = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  // Get the last winning number from the user's bet history
  const { data: lastWinningNumber } = useQuery({
    queryKey: ["lastWinningNumber", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) {
        return null;
      }
      try {
        // First get total number of bets to calculate the offset for most recent bet
        const [_, total] = await contracts.roulette.getUserBetHistory(
          account,
          0,
          0,
        );

        // Convert total to number since it might be BigInt
        const totalBets = Number(total);

        if (totalBets === 0) {
          return null;
        }

        // Get the most recent bet using total count as offset
        const [bets] = await contracts.roulette.getUserBetHistory(
          account,
          totalBets - 1, // Get the last bet
          1,
        );

        // Return the winning number from most recent bet if exists
        if (bets && bets.length > 0) {
          const lastNumber = Number(bets[0].winningNumber);
          console.log(
            "Found user's last winning number:",
            lastNumber,
            "from total bets:",
            totalBets,
          );
          return lastNumber;
        }
        return null;
      } catch (error) {
        console.error("Error fetching user's winning number:", error);
        return null;
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Log when lastWinningNumber changes
  useEffect(() => {
    console.log(
      "User's last winning number updated:",
      lastWinningNumber,
      typeof lastWinningNumber,
      "for account:",
      account,
    );
  }, [lastWinningNumber, account]);

  return (
    <div className="flex flex-col gap-3 p-6 bg-secondary-900/90 backdrop-blur-lg rounded-xl border border-white/5 shadow-2xl">
      {/* Main betting grid */}
      <div className="grid grid-cols-[auto_45px_1fr] gap-1">
        {/* Last Winning Number Display */}
        <div className="flex items-center justify-center w-24">
          <div
            className={`aspect-square w-full rounded-lg flex items-center justify-center font-bold text-3xl relative ${getNumberBackgroundClass(lastWinningNumber)}`}
          >
            <span className="text-white/90">{lastWinningNumber ?? "-"}</span>
            <div className="absolute -top-8 left-0 right-0 text-center text-sm text-secondary-400 font-medium">
              Last Number
            </div>
          </div>
        </div>

        {/* Zero */}
        <div className="row-span-3">
          <button
            onClick={() => handleBet([0], BetTypes.STRAIGHT_BET)}
            onMouseEnter={() => setHoveredNumbers([0])}
            onMouseLeave={() => setHoveredNumbers([])}
            className={`number-button-zero ${
              getBetAmount([0], BetTypes.STRAIGHT_BET) > 0 || isNumberHovered(0)
                ? "ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-secondary-900"
                : ""
            }`}
          >
            <span className="text-white/90">0</span>
            {getBetAmount([0], BetTypes.STRAIGHT_BET) > 0 && (
              <div className="chip-stack">
                {getBetAmount([0], BetTypes.STRAIGHT_BET)}
              </div>
            )}
          </button>
        </div>

        {/* Numbers grid */}
        <div className="grid grid-rows-3 gap-1">
          {numberGrid.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[repeat(12,minmax(45px,1fr))_45px] gap-1"
            >
              {row.map((number) => (
                <button
                  key={number}
                  onClick={() => handleBet([number], BetTypes.STRAIGHT_BET)}
                  onMouseEnter={() => setHoveredNumbers([number])}
                  onMouseLeave={() => setHoveredNumbers([])}
                  className={`number-button ${
                    isRed(number) ? "number-button-red" : "number-button-black"
                  } ${
                    getBetAmount([number], BetTypes.STRAIGHT_BET) > 0 ||
                    isNumberHovered(number)
                      ? "number-button-selected"
                      : ""
                  }`}
                >
                  <span className="text-white/90">{number}</span>
                  {getBetAmount([number], BetTypes.STRAIGHT_BET) > 0 && (
                    <div className="chip-stack">
                      {getBetAmount([number], BetTypes.STRAIGHT_BET)}
                    </div>
                  )}
                </button>
              ))}
              {/* 2:1 button */}
              <button
                onClick={() => {
                  const columnStart = 3 - rowIndex;
                  const numbers = Array.from(
                    { length: 12 },
                    (_, i) => columnStart + i * 3,
                  );
                  const columnType =
                    columnStart === 1
                      ? BetTypes.COLUMN_BET_FIRST
                      : columnStart === 2
                        ? BetTypes.COLUMN_BET_SECOND
                        : BetTypes.COLUMN_BET_THIRD;
                  handleBet(numbers, columnType);
                }}
                onMouseEnter={() => {
                  const columnStart = 3 - rowIndex;
                  const numbers = Array.from(
                    { length: 12 },
                    (_, i) => columnStart + i * 3,
                  );
                  setHoveredNumbers(numbers);
                }}
                onMouseLeave={() => setHoveredNumbers([])}
                className="column-bet"
              >
                2:1
                {getBetAmount(
                  [3 - rowIndex],
                  3 - rowIndex === 1
                    ? BetTypes.COLUMN_BET_FIRST
                    : 3 - rowIndex === 2
                      ? BetTypes.COLUMN_BET_SECOND
                      : BetTypes.COLUMN_BET_THIRD,
                ) > 0 && (
                  <div className="chip-stack">
                    {getBetAmount(
                      [3 - rowIndex],
                      3 - rowIndex === 1
                        ? BetTypes.COLUMN_BET_FIRST
                        : 3 - rowIndex === 2
                          ? BetTypes.COLUMN_BET_SECOND
                          : BetTypes.COLUMN_BET_THIRD,
                    )}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom betting options */}
      <div className="flex flex-col gap-2 mt-1">
        {/* Dozens */}
        <div className="grid grid-cols-[auto_45px_1fr] gap-1">
          <div className="w-24"></div>
          <div className="w-[45px]"></div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { start: 1, label: "1 to 12", type: BetTypes.DOZEN_BET_FIRST },
              { start: 13, label: "13 to 24", type: BetTypes.DOZEN_BET_SECOND },
              { start: 25, label: "25 to 36", type: BetTypes.DOZEN_BET_THIRD },
            ].map((dozen) => (
              <button
                key={dozen.start}
                onClick={() => {
                  const numbers = Array.from(
                    { length: 12 },
                    (_, i) => dozen.start + i,
                  );
                  handleBet(numbers, dozen.type);
                }}
                onMouseEnter={() =>
                  setHoveredNumbers(getNumbersForBetType(dozen.type))
                }
                onMouseLeave={() => setHoveredNumbers([])}
                className="h-12 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-lg hover:shadow-purple-500/20 transition-all duration-200 text-base font-bold flex items-center justify-center text-white/90 relative"
              >
                {dozen.label}
                {getBetAmount([dozen.start], dozen.type) > 0 && (
                  <div className="absolute -top-2 -right-2 bg-white/95 text-purple-600 text-xs px-2 py-0.5 rounded-full z-10 shadow-lg font-bold border border-purple-200/20">
                    {getBetAmount([dozen.start], dozen.type)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Other betting options */}
        <div className="grid grid-cols-[auto_45px_1fr] gap-1">
          <div className="w-24"></div>
          <div className="w-[45px]"></div>
          <div className="grid grid-cols-6 gap-2">
            {[
              { type: BetTypes.LOW_BET, label: "1 to 18", color: "cyan" },
              { type: BetTypes.EVEN_BET, label: "Even", color: "cyan" },
              {
                type: BetTypes.RED_BET,
                label: "Red",
                color: "gaming-primary",
                isRed: true,
              },
              { type: BetTypes.BLACK_BET, label: "Black", color: "gray" },
              { type: BetTypes.ODD_BET, label: "Odd", color: "cyan" },
              { type: BetTypes.HIGH_BET, label: "19 to 36", color: "cyan" },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => handleBet([], option.type)}
                onMouseEnter={() =>
                  setHoveredNumbers(getNumbersForBetType(option.type))
                }
                onMouseLeave={() => setHoveredNumbers([])}
                className={`h-12 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base font-bold flex items-center justify-center relative ${
                  option.isRed
                    ? "bg-gradient-to-br from-gaming-primary to-gaming-primary/90 hover:from-gaming-primary hover:to-gaming-primary/80 text-white/90"
                    : option.color === "gray"
                      ? "bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white/90"
                      : `bg-gradient-to-br from-${option.color}-600 to-${option.color}-700 hover:from-${option.color}-500 hover:to-${option.color}-600 text-white/90 hover:shadow-${option.color}-500/20`
                }`}
              >
                {option.label}
                {getBetAmount([], option.type) > 0 && (
                  <div
                    className={`absolute -top-2 -right-2 bg-white/95 ${
                      option.isRed
                        ? "text-gaming-primary"
                        : option.color === "gray"
                          ? "text-gray-800"
                          : `text-${option.color}-600`
                    } text-xs px-2 py-0.5 rounded-full z-10 shadow-lg font-bold border ${
                      option.isRed
                        ? "border-gaming-primary/20"
                        : option.color === "gray"
                          ? "border-gray-300/20"
                          : `border-${option.color}-200/20`
                    }`}
                  >
                    {getBetAmount([], option.type)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Add BetControls component
const BetControls = ({
  selectedChipValue,
  onChipValueChange,
  selectedBets,
  onClearBets,
  onPlaceBets,
  onApprove,
  isApproved,
  isCheckingApproval,
  disabled,
  gameState,
  onUndoBet,
}) => {
  return (
    <div className="bet-controls glass-panel p-4 space-y-4">
      <div className="chip-selector flex flex-wrap gap-2">
        {CHIP_VALUES.map((chip) => (
          <button
            key={chip.value}
            onClick={() => onChipValueChange(chip.value)}
            disabled={disabled}
            className={`chip-button ${
              selectedChipValue === chip.value ? "ring-2 ring-white" : ""
            } ${
              chip.label === "1"
                ? "chip-1"
                : chip.label === "5"
                  ? "chip-5"
                  : chip.label === "10"
                    ? "chip-10"
                    : `chip-button-${chip.label}`
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Bet Controls */}
      <div className="flex gap-2">
        <button
          onClick={onUndoBet}
          className="btn-secondary flex-1 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600"
          disabled={disabled || selectedBets.length === 0}
        >
          Undo Last Bet
        </button>
        <button
          onClick={onClearBets}
          className="btn-secondary flex-1"
          disabled={disabled || selectedBets.length === 0}
        >
          Clear Bets
        </button>
        {isCheckingApproval ? (
          <button className="place-bet-button flex-1" disabled={true}>
            Checking Approval...
          </button>
        ) : isApproved ? (
          <button
            onClick={onPlaceBets}
            className="place-bet-button flex-1"
            disabled={disabled || selectedBets.length === 0}
          >
            {gameState.isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="small" />
                Processing...
              </span>
            ) : (
              "Place Bets"
            )}
          </button>
        ) : (
          <button
            onClick={onApprove}
            className="approve-button flex-1"
            disabled={disabled}
          >
            Approve Token
          </button>
        )}
      </div>
    </div>
  );
};

// Add helper function to get bet type name
const getBetTypeName = (betType) => {
  const types = {
    [BetTypes.STRAIGHT_BET]: "Straight",
    [BetTypes.DOZEN_BET_FIRST]: "First Dozen",
    [BetTypes.DOZEN_BET_SECOND]: "Second Dozen",
    [BetTypes.DOZEN_BET_THIRD]: "Third Dozen",
    [BetTypes.COLUMN_BET_FIRST]: "First Column",
    [BetTypes.COLUMN_BET_SECOND]: "Second Column",
    [BetTypes.COLUMN_BET_THIRD]: "Third Column",
    [BetTypes.RED_BET]: "Red",
    [BetTypes.BLACK_BET]: "Black",
    [BetTypes.EVEN_BET]: "Even",
    [BetTypes.ODD_BET]: "Odd",
    [BetTypes.LOW_BET]: "Low (1-18)",
    [BetTypes.HIGH_BET]: "High (19-36)",
  };
  return types[betType] || "Unknown";
};

// Add StatBadge component for history stats
const StatBadge = ({ label, value, color = "primary" }) => (
  <div
    className={`
    px-3 py-1 rounded-lg 
    ${
      color === "success"
        ? "bg-gaming-success/20 text-gaming-success"
        : color === "error"
          ? "bg-gaming-error/20 text-gaming-error"
          : "bg-gaming-primary/20 text-gaming-primary"
    }
    flex items-center gap-2
  `}
  >
    <span className="text-sm font-medium">{label}</span>
    <span className="text-sm font-bold">{value}</span>
  </div>
);

// Add FilterButton component for history filters
const FilterButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg font-medium text-sm
      transition-all duration-200
      ${
        active
          ? "bg-gaming-primary text-white"
          : "bg-secondary-700 text-secondary-300 hover:bg-secondary-600"
      }
    `}
  >
    {children}
  </button>
);

// Add BettingHistory component
const BettingHistory = ({ account, contracts }) => {
  const [filter, setFilter] = useState("all");

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rouletteHistory", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) return null;
      try {
        // Get bet history with pagination (first 10 bets)
        const [bets, total] = await contracts.roulette.getUserBetHistory(
          account,
          0,
          10,
        );

        // Check if data exists and is an array
        if (!bets || !Array.isArray(bets)) {
          console.log("No betting data found or invalid format:", bets);
          return [];
        }

        // Convert BigInts to strings for proper serialization
        return bets.map((bet) => ({
          timestamp: Number(bet.timestamp),
          betType: Number(bet.betType),
          numbers: Array.isArray(bet.numbers)
            ? bet.numbers.map((n) => Number(n))
            : [],
          amount: bet.amount.toString(),
          payout: bet.payout.toString(),
          winningNumber: Number(bet.winningNumber),
        }));
      } catch (error) {
        console.error("Error fetching betting history:", error);
        throw error;
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
    cacheTime: 30000, // Keep data in cache for 30 seconds
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
    structuralSharing: false, // Disable structural sharing to prevent serialization issues
  });

  // Group bets by timestamp
  const groupedBets = useMemo(() => {
    if (!userData || !Array.isArray(userData)) return [];

    const grouped = userData.reduce((acc, bet) => {
      const key = bet.timestamp;
      if (!acc[key]) {
        acc[key] = {
          timestamp: bet.timestamp,
          winningNumber: bet.winningNumber,
          bets: [],
          totalAmount: BigInt(0),
          totalPayout: BigInt(0),
        };
      }
      acc[key].bets.push(bet);
      acc[key].totalAmount += BigInt(bet.amount);
      acc[key].totalPayout += BigInt(bet.payout);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.timestamp - a.timestamp);
  }, [userData]);

  // Calculate stats from betting history
  const stats = useMemo(() => {
    if (!groupedBets || groupedBets.length === 0)
      return {
        totalWins: 0,
        totalLosses: 0,
        totalProfit: BigInt(0),
        winRate: 0,
      };

    return groupedBets.reduce(
      (acc, group) => {
        const isWin = group.totalPayout > group.totalAmount;
        const profit = group.totalPayout - group.totalAmount;

        return {
          totalWins: acc.totalWins + (isWin ? 1 : 0),
          totalLosses: acc.totalLosses + (isWin ? 0 : 1),
          totalProfit: acc.totalProfit + profit,
          winRate:
            groupedBets.length > 0
              ? (
                  ((acc.totalWins + (isWin ? 1 : 0)) / groupedBets.length) *
                  100
                ).toFixed(1)
              : 0,
        };
      },
      { totalWins: 0, totalLosses: 0, totalProfit: BigInt(0), winRate: 0 },
    );
  }, [groupedBets]);

  // Filter bets based on selected filter
  const filteredBets = useMemo(() => {
    if (!groupedBets) return [];

    switch (filter) {
      case "wins":
        return groupedBets.filter(
          (group) => group.totalPayout > group.totalAmount,
        );
      case "losses":
        return groupedBets.filter(
          (group) => group.totalPayout <= group.totalAmount,
        );
      default:
        return groupedBets;
    }
  }, [groupedBets, filter]);

  if (isLoading) {
    return (
      <div className="betting-history glass-panel p-6 space-y-6">
        <h3 className="text-2xl font-bold text-white/90">Recent Bets</h3>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Betting history error:", error);
    return (
      <div className="betting-history glass-panel p-6 space-y-6">
        <h3 className="text-2xl font-bold text-white/90">Recent Bets</h3>
        <div className="text-center text-gaming-error py-4">
          Failed to load betting history. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="betting-history glass-panel p-6 space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-2xl font-bold text-white/90">Recent Bets</h3>
        <div className="flex flex-wrap items-center gap-3">
          <StatBadge label="Wins" value={stats.totalWins} color="success" />
          <StatBadge label="Losses" value={stats.totalLosses} color="error" />
          <StatBadge
            label="Win Rate"
            value={`${stats.winRate}%`}
            color="primary"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All Bets
        </FilterButton>
        <FilterButton
          active={filter === "wins"}
          onClick={() => setFilter("wins")}
        >
          Wins
        </FilterButton>
        <FilterButton
          active={filter === "losses"}
          onClick={() => setFilter("losses")}
        >
          Losses
        </FilterButton>
      </div>

      {/* Bet History List */}
      {filteredBets.length > 0 ? (
        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {filteredBets.map((group, index) => (
              <motion.div
                key={`${group.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  history-item bg-secondary-700/50 backdrop-blur-sm
                  ${
                    group.totalPayout > group.totalAmount
                      ? "border-gaming-success/20 bg-gaming-success/5 hover:border-gaming-success/30"
                      : "border-gaming-error/20 bg-gaming-error/5 hover:border-gaming-error/30"
                  }
                `}
              >
                {/* Header with timestamp and result */}
                <div className="flex justify-between items-start">
                  <div className="text-sm text-secondary-400">
                    {new Date(group.timestamp * 1000).toLocaleString()}
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      group.totalPayout > group.totalAmount
                        ? "text-gaming-success"
                        : "text-gaming-error"
                    }`}
                  >
                    {group.totalPayout > group.totalAmount ? "WIN" : "LOSS"}
                  </div>
                </div>

                {/* Main bet information */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-sm text-secondary-400">
                      Winning Number
                    </div>
                    <div className="text-2xl font-bold">
                      #{group.winningNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-secondary-400">Bet Types</div>
                    <div className="font-medium flex flex-wrap gap-1">
                      {group.bets.map((bet, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-1 bg-secondary-800/50 rounded-md text-sm"
                        >
                          {getBetTypeName(bet.betType)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Numbers and amounts */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-sm text-secondary-400">
                      Selected Numbers
                    </div>
                    <div className="max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-secondary-600 scrollbar-track-secondary-800">
                      <div className="font-medium flex flex-wrap gap-1 p-1">
                        {group.bets.flatMap((bet) => bet.numbers).length > 0 ? (
                          group.bets.flatMap((bet) => bet.numbers).length <=
                          5 ? (
                            group.bets
                              .flatMap((bet) => bet.numbers)
                              .map((num, i) => (
                                <span
                                  key={i}
                                  className="bg-secondary-600/50 backdrop-blur-sm min-w-[2rem] h-8 flex items-center justify-center rounded-md text-sm border border-white/5"
                                >
                                  {num}
                                </span>
                              ))
                          ) : (
                            <div className="grid grid-cols-6 gap-1 w-full">
                              {group.bets
                                .flatMap((bet) => bet.numbers)
                                .map((num, i) => (
                                  <span
                                    key={i}
                                    className="bg-secondary-600/50 backdrop-blur-sm w-7 h-7 flex items-center justify-center rounded-md text-xs border border-white/5"
                                  >
                                    {num}
                                  </span>
                                ))}
                            </div>
                          )
                        ) : (
                          <span className="text-secondary-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-secondary-400">
                      Amount & Payout
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">
                        Total Bet:{" "}
                        {ethers.formatEther(group.totalAmount.toString())} GAMA
                      </div>
                      <div
                        className={`font-bold ${
                          group.totalPayout > 0
                            ? "text-gaming-success"
                            : "text-secondary-400"
                        }`}
                      >
                        Total Payout:{" "}
                        {ethers.formatEther(group.totalPayout.toString())} GAMA
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multiplier and profit/loss */}
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-secondary-600/50">
                  <div>
                    <div className="text-sm text-secondary-400">
                      Average Multiplier
                    </div>
                    <div className="font-medium">
                      {group.totalPayout > 0
                        ? `${(
                            Number(
                              ethers.formatEther(group.totalPayout.toString()),
                            ) /
                            Number(
                              ethers.formatEther(group.totalAmount.toString()),
                            )
                          ).toFixed(2)}x`
                        : "0x"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-secondary-400">
                      Profit/Loss
                    </div>
                    <div
                      className={`font-bold ${
                        group.totalPayout > group.totalAmount
                          ? "text-gaming-success"
                          : "text-gaming-error"
                      }`}
                    >
                      {ethers.formatEther(
                        (group.totalPayout - group.totalAmount).toString(),
                      )}{" "}
                      GAMA
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center text-secondary-400 py-8">
          No betting history available
        </div>
      )}
    </div>
  );
};

const RoulettePage = ({ contracts, account, onError, addToast }) => {
  // State management
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectedChipValue, setSelectedChipValue] = useState(
    CHIP_VALUES[0].value,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalBetAmount, setTotalBetAmount] = useState(BigInt(0));
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);

  // Get React Query client
  const queryClient = useQueryClient();

  // Check token approval
  useEffect(() => {
    const checkApproval = async () => {
      if (!contracts?.token || !account || !contracts?.roulette) {
        setIsApproved(false);
        setIsCheckingApproval(false);
        return;
      }

      try {
        setIsCheckingApproval(true);

        // Check if roulette contract has required roles
        const [hasMinterRole, hasBurnerRole, allowance] = await Promise.all([
          contracts.token.hasRole(
            CONTRACT_CONSTANTS.MINTER_ROLE,
            contracts.roulette.target,
          ),
          contracts.token.hasRole(
            CONTRACT_CONSTANTS.BURNER_ROLE,
            contracts.roulette.target,
          ),
          contracts.token.allowance(account, contracts.roulette.target),
        ]);

        // Log approval status for debugging
        console.log("Token approval check:", {
          tokenContract: contracts.token.target,
          rouletteContract: contracts.roulette.target,
          account,
          currentAllowance: allowance.toString(),
          requiredAmount: CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT.toString(),
          hasMinterRole,
          hasBurnerRole,
        });

        // Contract must have both roles and sufficient allowance
        const hasRequiredRoles = hasMinterRole && hasBurnerRole;
        const hasSufficientAllowance =
          allowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT;

        setIsApproved(hasRequiredRoles && hasSufficientAllowance);

        if (!hasRequiredRoles) {
          console.error("Roulette contract missing required roles:", {
            hasMinterRole,
            hasBurnerRole,
          });
        }
      } catch (error) {
        console.error("Error checking approval:", error);
        setIsApproved(false);
      } finally {
        setIsCheckingApproval(false);
      }
    };

    // Check approval on mount and when dependencies change
    checkApproval();
  }, [contracts?.token, contracts?.roulette, account]);

  // Handle token approval
  const handleApprove = async () => {
    if (!contracts?.token || !account || !contracts?.roulette) {
      console.error("Contracts or account not initialized");
      return;
    }

    try {
      setIsProcessing(true);

      // First check if roulette contract has required roles
      const [hasMinterRole, hasBurnerRole] = await Promise.all([
        contracts.token.hasRole(
          CONTRACT_CONSTANTS.MINTER_ROLE,
          contracts.roulette.target,
        ),
        contracts.token.hasRole(
          CONTRACT_CONSTANTS.BURNER_ROLE,
          contracts.roulette.target,
        ),
      ]);

      if (!hasMinterRole || !hasBurnerRole) {
        addToast(
          "Roulette contract is not properly configured. Please contact support.",
          "error",
        );
        return;
      }

      console.log("Approving token spend:", {
        spender: contracts.roulette.target,
        amount: CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT.toString(),
      });

      // Approve exact amount instead of max uint256 to match contract's expectations
      const tx = await contracts.token.approve(
        contracts.roulette.target,
        CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT,
      );
      console.log("Approval transaction sent:", tx.hash);

      await tx.wait();
      console.log("Approval confirmed");

      // Verify the new allowance
      const newAllowance = await contracts.token.allowance(
        account,
        contracts.roulette.target,
      );
      console.log("New allowance:", newAllowance.toString());

      if (newAllowance < CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
        throw new Error("Approval failed - insufficient allowance");
      }

      setIsApproved(true);
      addToast("Token approval successful", "success");
    } catch (error) {
      console.error("Error approving token:", error);
      setIsApproved(false);

      // Handle specific error cases
      if (error.code === "ACTION_REJECTED") {
        addToast("Token approval was rejected", "error");
      } else if (error.code === "CALL_EXCEPTION") {
        // Try to decode the error
        if (error.data) {
          const errorData = error.data;
          if (errorData.includes("MissingContractRole")) {
            addToast(
              "Contract is missing required roles. Please contact support.",
              "error",
            );
            return;
          }
        }
        addToast("Token approval failed - contract error", "error");
      } else {
        addToast("Failed to approve token. Please try again.", "error");
      }
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler functions
  const handleBetSelect = useCallback(
    (numbers, type) => {
      if (isProcessing) return;

      setSelectedBets((prev) => {
        // Validate bet type
        if (!BetTypes.isValid(type)) {
          console.error("Invalid bet type:", type);
          addToast("Invalid bet type selected", "error");
          return prev;
        }

        // Get the correct numbers array for this bet type
        let betNumbers;
        try {
          betNumbers =
            type === BetTypes.STRAIGHT_BET
              ? [Array.isArray(numbers) ? numbers[0] : numbers]
              : BetTypes.getNumbers(type);
        } catch (error) {
          console.error("Error getting bet numbers:", error);
          addToast("Invalid bet numbers", "error");
          return prev;
        }

        // Additional validation for straight bets
        if (type === BetTypes.STRAIGHT_BET) {
          if (betNumbers[0] > 36) {
            addToast("Invalid number for straight bet", "error");
            return prev;
          }
        }

        // Check if bet already exists
        const existingBetIndex = prev.findIndex(
          (bet) =>
            bet.type === type &&
            JSON.stringify(bet.numbers.sort()) ===
              JSON.stringify(betNumbers.sort()),
        );

        const newBets = [...prev];
        const betAmount = BigInt(selectedChipValue);

        // Validate single bet amount
        if (betAmount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
          addToast("Maximum bet amount exceeded for single bet", "error");
          return prev;
        }

        if (existingBetIndex !== -1) {
          // Update existing bet
          const newAmount =
            BigInt(newBets[existingBetIndex].amount) + betAmount;
          if (newAmount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
            addToast("Maximum bet amount exceeded for this position", "error");
            return prev;
          }
          newBets[existingBetIndex] = {
            ...newBets[existingBetIndex],
            amount: newAmount.toString(),
          };
        } else {
          // Check maximum number of bets
          if (newBets.length >= CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
            addToast(
              `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`,
              "error",
            );
            return prev;
          }

          newBets.push({
            numbers: betNumbers,
            type: type,
            amount: betAmount.toString(),
          });
        }

        // Calculate and validate total bet amount
        const newTotalAmount = newBets.reduce(
          (sum, bet) => sum + BigInt(bet.amount),
          BigInt(0),
        );
        if (newTotalAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
          addToast("Maximum total bet amount exceeded", "error");
          return prev;
        }

        setTotalBetAmount(newTotalAmount);
        return newBets;
      });
    },
    [isProcessing, selectedChipValue, addToast],
  );

  const handlePlaceBets = useCallback(async () => {
    if (!contracts?.roulette || !account || selectedBets.length === 0) return;
    if (selectedBets.length > CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
      onError(
        new Error(
          `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`,
        ),
      );
      return;
    }

    let retryCount = 0;
    const MAX_RETRIES = 3;

    const attemptTransaction = async () => {
      try {
        setIsProcessing(true);

        // Add debug checks for contract roles and balances
        console.log("Checking contract roles and balances...");
        const [hasMinterRole, hasBurnerRole, allowance, userBalance] =
          await Promise.all([
            contracts.token.hasRole(
              CONTRACT_CONSTANTS.MINTER_ROLE,
              contracts.roulette.target,
            ),
            contracts.token.hasRole(
              CONTRACT_CONSTANTS.BURNER_ROLE,
              contracts.roulette.target,
            ),
            contracts.token.allowance(account, contracts.roulette.target),
            contracts.token.balanceOf(account),
          ]);

        console.log("Contract status:", {
          rouletteAddress: contracts.roulette.target,
          hasMinterRole,
          hasBurnerRole,
          allowance: allowance.toString(),
          userBalance: userBalance.toString(),
          requiredAllowance: CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT.toString(),
        });

        // Validate contract roles
        if (!hasMinterRole || !hasBurnerRole) {
          addToast(
            "Roulette contract is missing required roles. Please contact support.",
            "error",
          );
          return;
        }

        // Format bets for contract according to BetRequest structure
        const betRequests = selectedBets.map((bet) => {
          // Validate bet type
          if (bet.type < 0 || bet.type > 12) {
            throw new Error(`Invalid bet type: ${bet.type}`);
          }

          // For straight bets, validate number
          if (
            bet.type === BetTypes.STRAIGHT_BET &&
            (bet.numbers.length !== 1 || bet.numbers[0] > 36)
          ) {
            throw new Error(
              `Invalid number for straight bet: ${bet.numbers[0]}`,
            );
          }

          // Convert to contract format
          return {
            betTypeId: bet.type,
            number: bet.type === BetTypes.STRAIGHT_BET ? bet.numbers[0] : 0,
            amount: BigInt(bet.amount).toString(), // Ensure amount is BigInt
          };
        });

        // Calculate total amount
        const totalAmount = selectedBets.reduce(
          (sum, bet) => sum + BigInt(bet.amount),
          BigInt(0),
        );

        console.log("Bet validation:", {
          totalAmount: totalAmount.toString(),
          userBalance: userBalance.toString(),
        });

        // Additional validations
        if (userBalance < totalAmount) {
          addToast("Insufficient balance to place bets.", "error");
          return;
        }

        // Validate total amount
        if (totalAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
          addToast("Total bet amount exceeds maximum allowed.", "error");
          return;
        }

        // Log raw values for debugging
        console.log("Sending bets to contract:", {
          rouletteAddress: contracts.roulette.target,
          totalAmount: totalAmount.toString(),
          numBets: betRequests.length,
          betRequests: betRequests.map((bet) => ({
            betTypeId: bet.betTypeId,
            number: bet.number,
            amount: bet.amount,
          })),
        });

        // Get current gas price and add 20% buffer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const gasPrice = await provider.getFeeData();
        const adjustedGasPrice =
          (gasPrice.gasPrice * BigInt(120)) / BigInt(100);

        // Try to estimate gas with a 30% buffer
        let gasEstimate;
        try {
          gasEstimate =
            await contracts.roulette.placeBet.estimateGas(betRequests);
          gasEstimate = (gasEstimate * BigInt(130)) / BigInt(100); // Add 30% buffer
          console.log("Gas estimate with buffer:", gasEstimate.toString());
        } catch (estimateError) {
          console.error("Gas estimation failed:", estimateError);
          // Try to decode the error
          if (estimateError.data) {
            const errorData = estimateError.data;
            console.log("Error data:", errorData);
            // Check for known error signatures
            if (errorData.includes("InvalidBetParameters")) {
              addToast(
                "Invalid bet parameters. Please check your bets.",
                "error",
              );
              return;
            }
            if (errorData.includes("InsufficientUserBalance")) {
              addToast("Insufficient balance to place bets.", "error");
              return;
            }
            if (errorData.includes("MaxPayoutExceeded")) {
              addToast("Maximum potential payout exceeded.", "error");
              return;
            }
            if (errorData.includes("MissingContractRole")) {
              addToast(
                "Contract is missing required roles. Please contact support.",
                "error",
              );
              return;
            }
            if (errorData.includes("InsufficientAllowance")) {
              addToast(
                "Insufficient token allowance. Please approve more tokens.",
                "error",
              );
              return;
            }
          }
          throw estimateError;
        }

        // Place bets with adjusted gas settings
        const tx = await contracts.roulette.placeBet(betRequests, {
          gasLimit: gasEstimate,
          gasPrice: adjustedGasPrice,
        });
        console.log("Transaction sent:", tx.hash);

        // Wait for more confirmations
        const receipt = await tx.wait(2); // Wait for 2 confirmations
        console.log("Transaction confirmed:", receipt);

        // Reset state and update UI
        setSelectedBets([]);
        setTotalBetAmount(BigInt(0));
        addToast("Bets placed successfully!", "success");

        // Invalidate queries to refresh data
        queryClient.invalidateQueries(["rouletteHistory", account]);
        queryClient.invalidateQueries(["balance", account]);
      } catch (error) {
        console.error("Error placing bets:", error);

        // Check if error is due to network or transaction issues
        if (
          error.code === "NETWORK_ERROR" ||
          error.code === "TIMEOUT" ||
          error.code === "UNPREDICTABLE_GAS_LIMIT" ||
          error.message.includes("transaction failed") ||
          error.message.includes("timeout")
        ) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying transaction (attempt ${retryCount})...`);
            // Wait for a short delay before retrying
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return attemptTransaction();
          }
        }

        // Enhanced error handling
        if (error.code === "CALL_EXCEPTION") {
          // Log the full error object for debugging
          console.log("Full error object:", {
            code: error.code,
            message: error.message,
            data: error.data,
            transaction: error.transaction,
            error: error,
          });

          // Try to extract error name from data if available
          const errorName = error.data ? error.data.split("(")[0] : null;

          switch (errorName) {
            case "InvalidBetParameters":
              addToast(
                "Invalid bet parameters. Please check your bets.",
                "error",
              );
              break;
            case "InsufficientUserBalance":
              addToast("Insufficient balance", "error");
              break;
            case "MaxPayoutExceeded":
              addToast("Maximum potential payout exceeded", "error");
              break;
            case "MissingContractRole":
              addToast(
                "Contract is missing required roles. Please contact support.",
                "error",
              );
              break;
            case "InsufficientAllowance":
              addToast(
                "Insufficient token allowance. Please approve more tokens.",
                "error",
              );
              break;
            default:
              // If we can't determine the specific error, show the raw error message
              addToast(
                `Transaction failed: ${error.message || "Unknown error"}`,
                "error",
              );
              onError(error);
          }
        } else if (error.code === "ACTION_REJECTED") {
          addToast("Transaction rejected by user", "error");
        } else {
          onError(error);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // Start the first attempt
    await attemptTransaction();
  }, [
    contracts?.roulette,
    contracts?.token,
    account,
    selectedBets,
    addToast,
    onError,
    queryClient,
  ]);

  const handleChipValueChange = useCallback((value) => {
    setSelectedChipValue(value);
  }, []);

  const handleClearBets = useCallback(() => {
    setSelectedBets([]);
    setTotalBetAmount(BigInt(0));
  }, []);

  const handleUndoBet = useCallback(() => {
    setSelectedBets((prev) => {
      const newBets = [...prev];
      newBets.pop(); // Remove the last bet

      // Update total bet amount
      const newTotalAmount = newBets.reduce(
        (sum, bet) => sum + BigInt(bet.amount),
        BigInt(0),
      );
      setTotalBetAmount(newTotalAmount);

      return newBets;
    });
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <div className="page-container">
        <div className="roulette-container">
          <BettingBoard
            onBetSelect={handleBetSelect}
            selectedBets={selectedBets}
            disabled={isProcessing}
            selectedChipValue={selectedChipValue}
            contracts={contracts}
            account={account}
          />

          <div className="betting-controls">
            <BetControls
              selectedChipValue={selectedChipValue}
              onChipValueChange={handleChipValueChange}
              selectedBets={selectedBets}
              onClearBets={handleClearBets}
              onPlaceBets={handlePlaceBets}
              onApprove={handleApprove}
              isApproved={isApproved}
              isCheckingApproval={isCheckingApproval}
              disabled={isProcessing}
              gameState={{ isProcessing }}
              onUndoBet={handleUndoBet}
            />

            <div className="roulette-stats">
              <div className="stat-card">
                <div className="stat-label">Total Bets</div>
                <div className="stat-value">{selectedBets.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Amount</div>
                <div className="stat-value">
                  {ethers.formatEther(totalBetAmount)} GAMA
                </div>
              </div>
            </div>
          </div>

          <BettingHistory account={account} contracts={contracts} />
        </div>
      </div>
    </div>
  );
};

// Add LoadingSpinner component
const LoadingSpinner = ({ size = "default" }) => (
  <div
    className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${
      size === "small" ? "h-4 w-4" : "h-6 w-6"
    }`}
    role="status"
  />
);

export default RoulettePage;
