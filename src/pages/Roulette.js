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

// Define red numbers for the roulette board
const redNumbers = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

// Helper function to check if a number is red
const isRed = (number) => redNumbers.includes(Number(number));

// Last Number Display component
const LastNumberDisplay = ({ number, getNumberBackgroundClass }) => {
  const bgClass = getNumberBackgroundClass(number);

  return (
    <div className="flex items-center justify-center w-24">
      <div
        className={`aspect-square w-full rounded-xl flex items-center justify-center font-bold relative transform transition-all duration-500 hover:scale-105 ${bgClass} shadow-lg hover:shadow-2xl border border-white/20 animate-float`}
      >
        <div className="absolute -top-8 left-0 right-0 text-center text-sm text-secondary-300 font-medium">
          Last Number
        </div>
        <span className="text-white text-3xl font-bold animate-fadeIn">
          {number !== null && number !== undefined && !isNaN(number)
            ? number
            : "-"}
        </span>
      </div>
    </div>
  );
};

const BettingBoard = ({
  onBetSelect,
  selectedBets,
  disabled,
  selectedChipValue,
  lastWinningNumber,
  getNumberBackgroundClass,
  onUndoBet,
  onClearBets,
}) => {
  // Add hover state
  const [hoveredNumbers, setHoveredNumbers] = useState([]);

  // Helper function to check if a number is currently hovered
  const isNumberHovered = (number) => hoveredNumbers.includes(number);

  // Helper function to get numbers for different bet types
  const getNumbersForBetType = useCallback((type, start = 1) => {
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
  }, []);

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

  // Define the grid layout in rows (top to bottom)
  const numberGrid = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="flex flex-col gap-3 p-8 bg-secondary-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-300">
      {/* Main betting grid */}
      <div className="grid grid-cols-[auto_45px_1fr] gap-2">
        <div className="flex flex-col gap-2">
          {/* Last Winning Number Display */}
          <LastNumberDisplay
            number={lastWinningNumber}
            getNumberBackgroundClass={getNumberBackgroundClass}
          />

          {/* Action Buttons under Last Number */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onUndoBet}
              className="btn-secondary bg-gradient-to-br from-orange-600/90 to-orange-700/90 hover:from-orange-500/90 hover:to-orange-600/90 rounded-xl py-2 px-3 font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 h-10"
              disabled={disabled || selectedBets.length === 0}
            >
              ↩
            </button>
            <button
              onClick={onClearBets}
              className="btn-secondary bg-gradient-to-br from-red-600/90 to-red-700/90 hover:from-red-500/90 hover:to-red-600/90 rounded-xl py-2 px-3 font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 h-10"
              disabled={disabled || selectedBets.length === 0}
            >
              Clear
            </button>
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
                ? "number-button-highlighted"
                : ""
            }`}
          >
            <span className="text-white/90 text-2xl">0</span>
            {getBetAmount([0], BetTypes.STRAIGHT_BET) > 0 && (
              <div
                className="chip-stack"
                data-value={getBetAmount([0], BetTypes.STRAIGHT_BET)}
              >
                <span className="chip-stack-value">
                  {getBetAmount([0], BetTypes.STRAIGHT_BET)}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Numbers grid */}
        <div className="grid grid-rows-3 gap-2">
          {numberGrid.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[repeat(12,minmax(45px,1fr))_45px] gap-2"
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
                      ? "number-button-highlighted"
                      : ""
                  }`}
                >
                  <span className="text-white/90 text-xl">{number}</span>
                  {getBetAmount([number], BetTypes.STRAIGHT_BET) > 0 && (
                    <div
                      className="chip-stack"
                      data-value={getBetAmount([number], BetTypes.STRAIGHT_BET)}
                    >
                      <span className="chip-stack-value">
                        {getBetAmount([number], BetTypes.STRAIGHT_BET)}
                      </span>
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
                className={`column-bet ${
                  getBetAmount(
                    [3 - rowIndex],
                    3 - rowIndex === 1
                      ? BetTypes.COLUMN_BET_FIRST
                      : 3 - rowIndex === 2
                        ? BetTypes.COLUMN_BET_SECOND
                        : BetTypes.COLUMN_BET_THIRD,
                  ) > 0 ||
                  hoveredNumbers.some((num) =>
                    getNumbersForBetType(
                      3 - rowIndex === 1
                        ? BetTypes.COLUMN_BET_FIRST
                        : 3 - rowIndex === 2
                          ? BetTypes.COLUMN_BET_SECOND
                          : BetTypes.COLUMN_BET_THIRD,
                    ).includes(num),
                  )
                    ? "column-bet-highlighted"
                    : ""
                }`}
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
                  <div
                    className="chip-stack"
                    data-value={getBetAmount(
                      [3 - rowIndex],
                      3 - rowIndex === 1
                        ? BetTypes.COLUMN_BET_FIRST
                        : 3 - rowIndex === 2
                          ? BetTypes.COLUMN_BET_SECOND
                          : BetTypes.COLUMN_BET_THIRD,
                    )}
                  >
                    <span className="chip-stack-value">
                      {getBetAmount(
                        [3 - rowIndex],
                        3 - rowIndex === 1
                          ? BetTypes.COLUMN_BET_FIRST
                          : 3 - rowIndex === 2
                            ? BetTypes.COLUMN_BET_SECOND
                            : BetTypes.COLUMN_BET_THIRD,
                      )}
                    </span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom betting options */}
      <div className="flex flex-col gap-3 mt-2">
        {/* Dozens */}
        <div className="grid grid-cols-[auto_45px_1fr] gap-2">
          <div className="w-24"></div>
          <div className="w-[45px]"></div>
          <div className="grid grid-cols-3 gap-3">
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
                className="h-12 rounded-xl bg-gradient-to-br from-purple-600/90 to-purple-700/90 hover:from-purple-500 hover:to-purple-600 shadow-lg hover:shadow-purple-500/30 transform transition-all duration-300 hover:scale-105 text-base font-bold flex items-center justify-center text-white/90 relative border border-white/10"
              >
                {dozen.label}
                {getBetAmount([dozen.start], dozen.type) > 0 && (
                  <div
                    className="chip-stack"
                    data-value={getBetAmount([dozen.start], dozen.type)}
                  >
                    <span className="chip-stack-value">
                      {getBetAmount([dozen.start], dozen.type)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Other betting options */}
        <div className="grid grid-cols-[auto_45px_1fr] gap-2">
          <div className="w-24"></div>
          <div className="w-[45px]"></div>
          <div className="grid grid-cols-6 gap-3">
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
                className={`h-12 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 text-base font-bold flex items-center justify-center relative border border-white/10 ${
                  option.isRed
                    ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-primary/80 hover:from-gaming-primary hover:to-gaming-primary/90 text-white/90 hover:shadow-gaming-primary/30"
                    : option.color === "gray"
                      ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700 hover:to-gray-800 text-white/90 hover:shadow-gray-500/30"
                      : `bg-gradient-to-br from-${option.color}-600/90 to-${option.color}-700/90 hover:from-${option.color}-500 hover:to-${option.color}-600 text-white/90 hover:shadow-${option.color}-500/30`
                }`}
              >
                {option.label}
                {getBetAmount([], option.type) > 0 && (
                  <div
                    className="chip-stack"
                    data-value={getBetAmount([], option.type)}
                  >
                    <span className="chip-stack-value">
                      {getBetAmount([], option.type)}
                    </span>
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
  onPlaceBets,
  onApprove,
  isApproved,
  isCheckingApproval,
  disabled,
  gameState,
}) => {
  return (
    <div className="bet-controls space-y-6">
      {/* Chip Selection */}
      <div>
        <h3 className="text-lg font-semibold text-secondary-300 mb-3">
          Select Chip Value
        </h3>
        <div className="chip-selector">
          {CHIP_VALUES.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onChipValueChange(chip.value)}
              disabled={disabled}
              className={`chip-button ${
                selectedChipValue === chip.value ? "ring-2 ring-white" : ""
              } chip-${chip.label.toLowerCase()}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Place Bet Button */}
      {isCheckingApproval ? (
        <button className="place-bet-button" disabled={true}>
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner size="small" />
            Checking Approval...
          </div>
        </button>
      ) : isApproved ? (
        <button
          onClick={onPlaceBets}
          className="place-bet-button"
          disabled={disabled || selectedBets.length === 0}
        >
          {gameState.isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="small" />
              Processing...
            </div>
          ) : (
            "Place Bets"
          )}
        </button>
      ) : (
        <button
          onClick={onApprove}
          className="place-bet-button"
          disabled={disabled}
        >
          Approve Token
        </button>
      )}
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
      px-4 py-2 rounded-lg
      backdrop-blur-sm
      border
      ${
        color === "success"
          ? "bg-gaming-success/10 border-gaming-success/20 shadow-gaming-success/10"
          : color === "error"
            ? "bg-gaming-error/10 border-gaming-error/20 shadow-gaming-error/10"
            : "bg-gaming-primary/10 border-gaming-primary/20 shadow-gaming-primary/10"
      }
      flex items-center gap-3
      transform hover:scale-105 transition-all duration-200 ease-out
    `}
  >
    <span
      className={`
      text-sm font-medium
      ${
        color === "success"
          ? "text-gaming-success/80"
          : color === "error"
            ? "text-gaming-error/80"
            : "text-gaming-primary/80"
      }
    `}
    >
      {label}
    </span>
    <span
      className={`
      text-lg font-bold
      ${
        color === "success"
          ? "text-gaming-success"
          : color === "error"
            ? "text-gaming-error"
            : "text-gaming-primary"
      }
    `}
    >
      {value}
    </span>
  </div>
);

// Add FilterButton component for history filters
const FilterButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg font-medium text-sm
      transition-all duration-200 ease-out
      transform hover:scale-105
      ${
        active
          ? "bg-gaming-primary text-white shadow-lg shadow-gaming-primary/20"
          : "bg-secondary-700/50 text-secondary-300 hover:bg-secondary-600/50 hover:text-white"
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

        // For new users with no bets, return empty array
        if (!bets || !Array.isArray(bets) || bets.length === 0) {
          console.log("No betting data found for new user");
          return [];
        }

        // Convert BigInts to strings for proper serialization
        return bets.map((bet) => ({
          timestamp: Number(bet.timestamp),
          winningNumber: Number(bet.winningNumber),
          bets: bet.bets.map((betDetail) => ({
            betType: Number(betDetail.betType),
            numbers: betDetail.numbers.map((n) => Number(n)),
            amount: betDetail.amount.toString(),
            payout: betDetail.payout.toString(),
          })),
        }));
      } catch (error) {
        console.log("Error fetching betting history (new user):", error);
        return []; // Return empty array instead of throwing error
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
    if (!userData || !Array.isArray(userData) || userData.length === 0) {
      return []; // Return empty array for new users
    }

    const grouped = userData.reduce((acc, bet) => {
      const key = bet.timestamp;
      if (!acc[key]) {
        acc[key] = {
          timestamp: bet.timestamp,
          winningNumber: bet.winningNumber,
          bets: bet.bets || [],
          totalAmount: BigInt(0),
          totalPayout: BigInt(0),
        };
      }

      // Calculate totals from all bets in this spin
      if (bet.bets && Array.isArray(bet.bets)) {
        bet.bets.forEach((betDetail) => {
          acc[key].totalAmount += BigInt(betDetail.amount);
          acc[key].totalPayout += BigInt(betDetail.payout);
        });
      }

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

  // Render bet details
  const renderBetDetails = (bets) => {
    if (!bets || !Array.isArray(bets)) return null;

    return (
      <div className="font-medium flex flex-wrap gap-1">
        {bets.map((bet, i) => (
          <span
            key={i}
            className="inline-block px-2 py-1 bg-secondary-800/50 rounded-md text-sm"
          >
            {getBetTypeName(bet.betType)} - {ethers.formatEther(bet.amount)}{" "}
            GAMA
            {bet.payout > bet.amount && (
              <span className="ml-1 text-gaming-success">
                (+{ethers.formatEther(BigInt(bet.payout) - BigInt(bet.amount))}{" "}
                GAMA)
              </span>
            )}
          </span>
        ))}
      </div>
    );
  };

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
    <div className="betting-history">
      {/* History Header */}
      <div className="history-header">
        <h2 className="history-title">Betting History</h2>
      </div>

      {/* Bet History List */}
      {filteredBets.length > 0 ? (
        <div className="history-list">
          <AnimatePresence>
            {filteredBets.map((group, index) => (
              <motion.div
                key={`${group.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  delay: index * 0.05,
                }}
                className={`history-item ${
                  group.totalPayout > group.totalAmount
                    ? "history-item-win"
                    : "history-item-loss"
                }`}
              >
                {/* Header with timestamp and result */}
                <div className="flex justify-between items-center mb-4">
                  <div className="history-timestamp">
                    <div
                      className={`history-status-indicator ${
                        group.totalPayout > group.totalAmount
                          ? "history-status-win"
                          : "history-status-loss"
                      }`}
                    ></div>
                    {new Date(group.timestamp * 1000).toLocaleString()}
                  </div>
                  <div
                    className={`history-result-badge ${
                      group.totalPayout > group.totalAmount
                        ? "history-result-badge-win"
                        : "history-result-badge-loss"
                    }`}
                  >
                    {group.totalPayout > group.totalAmount ? "WIN" : "LOSS"}
                  </div>
                </div>

                {/* Main bet information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Winning Number Section */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`history-number ${
                        isRed(group.winningNumber)
                          ? "history-number-red"
                          : "history-number-black"
                      }`}
                    >
                      <span className="history-number-text">
                        {group.winningNumber}
                      </span>
                    </div>
                    <div>
                      <div className="history-number-label">Winning Number</div>
                      <div className="history-number-tags">
                        <span
                          className={`history-tag ${
                            isRed(group.winningNumber)
                              ? "history-tag-red"
                              : "history-tag-black"
                          }`}
                        >
                          {isRed(group.winningNumber) ? "RED" : "BLACK"}
                        </span>
                        <span className="history-tag history-tag-range">
                          {group.winningNumber <= 18 ? "1-18" : "19-36"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bet Details Section */}
                  <div>
                    <div className="history-number-label">Bet Details</div>
                    <div className="history-bets">
                      {group.bets.map((bet, i) => (
                        <div key={i} className="history-bet-item">
                          <div className="history-bet-type">
                            {getBetTypeName(bet.betType)}
                          </div>
                          <div className="history-bet-amount">
                            {ethers.formatEther(bet.amount)} GAMA
                            {bet.payout > bet.amount && (
                              <span className="history-bet-payout">
                                (+
                                {ethers.formatEther(
                                  BigInt(bet.payout) - BigInt(bet.amount),
                                )}{" "}
                                GAMA)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Amounts Section */}
                <div className="history-totals">
                  <div>
                    <div className="history-total-label">Total Bet</div>
                    <div className="history-total-value history-total-value-bet">
                      {ethers.formatEther(group.totalAmount.toString())} GAMA
                    </div>
                  </div>
                  <div>
                    <div className="history-total-label">Total Payout</div>
                    <div
                      className={`history-total-value ${
                        group.totalPayout > group.totalAmount
                          ? "history-total-value-win"
                          : "history-total-value-loss"
                      }`}
                    >
                      {ethers.formatEther(group.totalPayout.toString())} GAMA
                      {group.totalPayout > group.totalAmount && (
                        <span className="history-total-diff">
                          (+
                          {ethers.formatEther(
                            BigInt(group.totalPayout) -
                              BigInt(group.totalAmount),
                          )}{" "}
                          GAMA)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-12 bg-secondary-800/30 rounded-xl border border-secondary-700/30">
          <div className="text-3xl mb-2 opacity-20">🎲</div>
          <div className="text-secondary-400 font-medium">
            No betting history available
          </div>
          <div className="text-secondary-500 text-sm mt-1">
            Place your first bet to start your journey
          </div>
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

  // Get the last winning number from the user's bet history
  const { data: lastWinningNumber } = useQuery({
    queryKey: ["lastWinningNumber", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) {
        console.log(
          "No contract or account available for lastWinningNumber query",
        );
        return null;
      }
      try {
        // Get all recent bets to ensure we get the latest one
        const [bets, total] = await contracts.roulette.getUserBetHistory(
          account,
          0,
          10, // Get more bets to ensure we have the latest
        );

        // Return the winning number from most recent bet if exists
        if (bets && bets.length > 0) {
          // Sort bets by timestamp in descending order to get the most recent
          const sortedBets = [...bets].sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp),
          );
          const lastNumber = Number(sortedBets[0].winningNumber);
          console.log(
            "Found last winning number:",
            lastNumber,
            "type:",
            typeof lastNumber,
            "raw value:",
            sortedBets[0].winningNumber,
            "timestamp:",
            new Date(Number(sortedBets[0].timestamp) * 1000).toLocaleString(),
            "total bets found:",
            bets.length,
          );
          return lastNumber;
        }
        // For new users with no bets, return null without error
        console.log("No bets found in history - new user");
        return null;
      } catch (error) {
        // Log the error but don't throw it - return null instead
        console.log("Error fetching last winning number (new user):", error);
        return null;
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 10000,
    staleTime: 5000,
    cacheTime: 30000,
    retry: 3,
    retryDelay: 1000,
    structuralSharing: false,
  });

  // Get background color class based on number
  const getNumberBackgroundClass = useCallback((number) => {
    if (number === null || number === undefined) {
      return "bg-gradient-to-br from-secondary-800 to-secondary-900 border-secondary-700";
    }
    const num = Number(number);
    if (num === 0) {
      return "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400";
    }
    if (isRed(num)) {
      return "bg-gradient-to-br from-gaming-primary to-gaming-primary/90 border-gaming-primary";
    }
    return "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700";
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-secondary-900 to-secondary-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gaming-primary to-gaming-accent bg-clip-text text-transparent">
              Roulette
            </h1>
            <p className="text-secondary-300">
              Place your bets and test your luck!
            </p>
          </div>

          {/* Main Game Section */}
          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            {/* Left Column - Betting Board */}
            <div className="space-y-6">
              <BettingBoard
                onBetSelect={handleBetSelect}
                selectedBets={selectedBets}
                disabled={isProcessing}
                selectedChipValue={selectedChipValue}
                lastWinningNumber={lastWinningNumber}
                getNumberBackgroundClass={getNumberBackgroundClass}
                onUndoBet={handleUndoBet}
                onClearBets={handleClearBets}
              />

              <BetControls
                selectedChipValue={selectedChipValue}
                onChipValueChange={handleChipValueChange}
                selectedBets={selectedBets}
                onPlaceBets={handlePlaceBets}
                onApprove={handleApprove}
                isApproved={isApproved}
                isCheckingApproval={isCheckingApproval}
                disabled={isProcessing}
                gameState={{ isProcessing }}
              />
            </div>

            {/* Right Column - Stats & History */}
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card">
                  <div className="stat-label">Total Bets</div>
                  <div className="stat-value animate-float">
                    {selectedBets.length}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Amount</div>
                  <div className="stat-value animate-float">
                    {ethers.formatEther(totalBetAmount)} GAMA
                  </div>
                </div>
              </div>

              {/* Betting History */}
              <BettingHistory account={account} contracts={contracts} />
            </div>
          </div>
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
