import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// Updated BetTypes object to match contract constants exactly
const BetTypes = {
  STRAIGHT: 0, // STRAIGHT_BET
  DOZEN_FIRST: 1, // DOZEN_BET_FIRST
  DOZEN_SECOND: 2, // DOZEN_BET_SECOND
  DOZEN_THIRD: 3, // DOZEN_BET_THIRD
  COLUMN_FIRST: 4, // COLUMN_BET_FIRST
  COLUMN_SECOND: 5, // COLUMN_BET_SECOND
  COLUMN_THIRD: 6, // COLUMN_BET_THIRD
  RED: 7, // RED_BET
  BLACK: 8, // BLACK_BET
  EVEN: 9, // EVEN_BET
  ODD: 10, // ODD_BET
  LOW: 11, // LOW_BET
  HIGH: 12, // HIGH_BET
  isValid: function (type) {
    return type >= 0 && type <= 12;
  },
  getNumbers: function (type) {
    switch (Number(type)) {
      case this.STRAIGHT:
        return []; // Numbers provided directly for straight bets
      case this.DOZEN_FIRST:
        return Array.from({ length: 12 }, (_, i) => i + 1);
      case this.DOZEN_SECOND:
        return Array.from({ length: 12 }, (_, i) => i + 13);
      case this.DOZEN_THIRD:
        return Array.from({ length: 12 }, (_, i) => i + 25);
      case this.COLUMN_FIRST:
        return Array.from({ length: 12 }, (_, i) => 1 + i * 3);
      case this.COLUMN_SECOND:
        return Array.from({ length: 12 }, (_, i) => 2 + i * 3);
      case this.COLUMN_THIRD:
        return Array.from({ length: 12 }, (_, i) => 3 + i * 3);
      case this.RED:
        return [
          1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
        ];
      case this.BLACK:
        return [
          2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
        ];
      case this.EVEN:
        return Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
      case this.ODD:
        return Array.from({ length: 18 }, (_, i) => i * 2 + 1);
      case this.LOW:
        return Array.from({ length: 18 }, (_, i) => i + 1);
      case this.HIGH:
        return Array.from({ length: 18 }, (_, i) => i + 19);
      default:
        return [];
    }
  },
};

// Update betting options arrays to match contract order
const dozenBettingOptions = [
  { label: "1st 12", type: BetTypes.DOZEN_FIRST },
  { label: "2nd 12", type: BetTypes.DOZEN_SECOND },
  { label: "3rd 12", type: BetTypes.DOZEN_THIRD },
];

const bottomBettingOptions = [
  { label: "1-18", type: BetTypes.LOW },
  { label: "EVEN", type: BetTypes.EVEN },
  { label: "RED", type: BetTypes.RED },
  { label: "BLACK", type: BetTypes.BLACK },
  { label: "ODD", type: BetTypes.ODD },
  { label: "19-36", type: BetTypes.HIGH },
];

// Fix column betting in BettingBoard component
const handleColumnBet = (rowIndex, onBetPlace) => {
  // rowIndex is 0 for bottom row, 1 for middle, 2 for top
  const columnType =
    rowIndex === 0
      ? BetTypes.COLUMN_FIRST // 1,4,7...
      : rowIndex === 1
        ? BetTypes.COLUMN_SECOND // 2,5,8...
        : BetTypes.COLUMN_THIRD; // 3,6,9...

  const numbers = BetTypes.getNumbers(columnType);
  onBetPlace(numbers, columnType);
};

// Update bet validation in handlePlaceBets
const validateBet = (bet) => {
  // Validate bet type range
  if (bet.type < 0 || bet.type > 12) {
    throw new Error(`Invalid bet type: ${bet.type}`);
  }

  // Validate straight bets
  if (bet.type === BetTypes.STRAIGHT) {
    if (!bet.numbers || bet.numbers.length !== 1 || bet.numbers[0] > 36) {
      throw new Error(`Invalid number for straight bet: ${bet.numbers?.[0]}`);
    }
  }

  // Validate column bets
  if (
    [
      BetTypes.COLUMN_FIRST,
      BetTypes.COLUMN_SECOND,
      BetTypes.COLUMN_THIRD,
    ].includes(bet.type)
  ) {
    const expectedNumbers = BetTypes.getNumbers(bet.type);
    if (
      !bet.numbers ||
      !bet.numbers.every((num, idx) => num === expectedNumbers[idx])
    ) {
      throw new Error(`Invalid numbers for column bet type: ${bet.type}`);
    }
  }

  return true;
};

// Update bet request formatting
const formatBetRequest = (bet) => ({
  betTypeId: bet.type,
  number: bet.type === BetTypes.STRAIGHT ? bet.numbers[0] : 0,
  amount: BigInt(bet.amount).toString(),
});

// Contract constants
const CONTRACT_CONSTANTS = {
  MAX_BETS_PER_SPIN: 15,
  MAX_BET_AMOUNT: BigInt("100000000000000000000000"), // 100k tokens
  MAX_TOTAL_BET_AMOUNT: BigInt("500000000000000000000000"), // 500k tokens
  MAX_POSSIBLE_PAYOUT: BigInt("17500000000000000000000000"), // 17.5M tokens
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
  BURNER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE")),
};
const CONTRACT_ERRORS = {
  InvalidBetParameters: "Invalid bet parameters. Please check your bets.",
  InvalidBetType: "Invalid bet type selected.",
  InsufficientUserBalance: "Insufficient balance to place bet.",
  TransferFailed: "Token transfer failed.",
  BurnFailed: "Token burn failed.",
  MintFailed: "Token mint failed.",
  MissingContractRole: "Contract is missing required roles.",
  InsufficientAllowance: "Insufficient token allowance.",
  MaxPayoutExceeded: "Maximum potential payout exceeded.",
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
  const isNumberHovered = useCallback(
    (number) => {
      return hoveredNumbers.includes(number);
    },
    [hoveredNumbers],
  );

  // Helper function to check if a bet type is currently hovered
  const isBetTypeHovered = useCallback(
    (type, numbers) => {
      if (!hoveredNumbers.length) return false;
      // Only consider this bet type hovered if ALL its numbers are hovered AND
      // the number of hovered numbers matches exactly (prevents overlap highlighting)
      return (
        numbers.every((num) => hoveredNumbers.includes(num)) &&
        hoveredNumbers.length === numbers.length
      );
    },
    [hoveredNumbers],
  );

  // Helper function to get total bet amount for a position
  const getBetAmount = useCallback(
    (numbers, type) => {
      // For straight bets
      if (type === BetTypes.STRAIGHT) {
        const bet = selectedBets.find(
          (bet) =>
            bet.type === type &&
            bet.numbers?.[0] ===
              (Array.isArray(numbers) ? numbers[0] : numbers),
        );
        return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
      }

      // For all other bets
      const bet = selectedBets.find((bet) => bet.type === type);
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
    <div className="flex flex-col gap-3 p-8 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-300">
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
              className="w-24 h-10 bg-gray-900 hover:bg-gray-800 text-secondary-300 hover:text-white rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10"
              disabled={disabled || selectedBets.length === 0}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
              </svg>
              Undo
            </button>
            <button
              onClick={onClearBets}
              className="w-24 h-10 bg-gaming-error/10 hover:bg-gaming-error/20 text-gaming-error rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-gaming-error/20"
              disabled={disabled || selectedBets.length === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Zero */}
        <div className="row-span-3 flex items-stretch">
          <button
            onClick={() => handleBet([0], BetTypes.STRAIGHT)}
            onMouseEnter={() => setHoveredNumbers([0])}
            onMouseLeave={() => setHoveredNumbers([])}
            disabled={disabled}
            className={`w-[45px] h-[147px] rounded-xl text-white/90 font-bold flex items-center justify-center transition-all duration-300 hover:scale-105 
              ${
                getBetAmount([0], BetTypes.STRAIGHT) > 0 || isNumberHovered(0)
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-emerald-500/80 to-emerald-600/80 border-emerald-400/50"
              } border hover:shadow-lg hover:from-emerald-500 hover:to-emerald-600`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">0</span>
              {getBetAmount([0], BetTypes.STRAIGHT) > 0 && (
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg transform hover:scale-110 transition-all duration-200">
                  {getBetAmount([0], BetTypes.STRAIGHT)}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Numbers grid */}
        <div className="grid grid-rows-3 gap-2 h-[147px]">
          {numberGrid.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[repeat(12,minmax(45px,1fr))_45px] gap-2 h-[45px]"
            >
              {row.map((number) => (
                <button
                  key={number}
                  onClick={() => handleBet([number], BetTypes.STRAIGHT)}
                  onMouseEnter={() => setHoveredNumbers([number])}
                  onMouseLeave={() => setHoveredNumbers([])}
                  disabled={disabled}
                  className={`relative rounded-xl text-xl font-bold transition-all duration-300 transform border border-white/10 hover:scale-105 hover:z-10 active:scale-95 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-2xl text-white ${
                    isRed(number)
                      ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-accent/90 hover:from-gaming-primary hover:to-gaming-accent border-gaming-primary/20 hover:shadow-gaming-primary/30"
                      : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700 hover:to-gray-800 border-gray-700/20 hover:shadow-gray-500/30"
                  } ${
                    getBetAmount([number], BetTypes.STRAIGHT) > 0 ||
                    isNumberHovered(number)
                      ? "ring-2 ring-offset-2 ring-offset-secondary-900 scale-105 z-20 shadow-[0_0_20px_rgba(var(--gaming-primary),0.4)] border-gaming-primary/50"
                      : ""
                  }`}
                >
                  <span className="text-white/90 text-xl">{number}</span>
                  {getBetAmount([number], BetTypes.STRAIGHT) > 0 && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg transform hover:scale-110 transition-all duration-200">
                      {getBetAmount([number], BetTypes.STRAIGHT)}
                    </div>
                  )}
                </button>
              ))}
              {/* 2:1 button for each row */}
              <button
                onClick={() => {
                  const columnType =
                    rowIndex === 0
                      ? BetTypes.COLUMN_THIRD // Top row (3,6,9...)
                      : rowIndex === 1
                        ? BetTypes.COLUMN_SECOND // Middle row (2,5,8...)
                        : BetTypes.COLUMN_FIRST; // Bottom row (1,4,7...)
                  const numbers = BetTypes.getNumbers(columnType);
                  handleBet(numbers, columnType);
                }}
                onMouseEnter={() => {
                  const columnType =
                    rowIndex === 0
                      ? BetTypes.COLUMN_THIRD // Top row (3,6,9...)
                      : rowIndex === 1
                        ? BetTypes.COLUMN_SECOND // Middle row (2,5,8...)
                        : BetTypes.COLUMN_FIRST; // Bottom row (1,4,7...)
                  const numbers = BetTypes.getNumbers(columnType);
                  setHoveredNumbers(numbers);
                }}
                onMouseLeave={() => setHoveredNumbers([])}
                disabled={disabled}
                className={`h-[45px] rounded-xl relative text-white border border-white/10 shadow-lg hover:shadow-purple-500/30 transition-all duration-300 font-bold`}
              >
                2:1
                {(() => {
                  const columnType =
                    rowIndex === 0
                      ? BetTypes.COLUMN_THIRD // Top row (3,6,9...)
                      : rowIndex === 1
                        ? BetTypes.COLUMN_SECOND // Middle row (2,5,8...)
                        : BetTypes.COLUMN_FIRST; // Bottom row (1,4,7...)
                  const amount = getBetAmount([], columnType);
                  return (
                    amount > 0 && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg transform hover:scale-110 transition-all duration-200">
                        {amount}
                      </div>
                    )
                  );
                })()}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dozen bets */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {dozenBettingOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              const numbers = BetTypes.getNumbers(option.type);
              handleBet(numbers, option.type);
            }}
            onMouseEnter={() => {
              const numbers = BetTypes.getNumbers(option.type);
              setHoveredNumbers(numbers);
            }}
            onMouseLeave={() => setHoveredNumbers([])}
            disabled={disabled}
            className={`h-[45px] rounded-xl relative text-white border border-white/10 shadow-lg hover:shadow-purple-500/30 transition-all duration-300 font-bold`}
          >
            {option.label}
            {getBetAmount([], option.type) > 0 && (
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg transform hover:scale-110 transition-all duration-200">
                {getBetAmount([], option.type)}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom betting options */}
      <div className="grid grid-cols-6 gap-2">
        {bottomBettingOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              const numbers = BetTypes.getNumbers(option.type);
              handleBet(numbers, option.type);
            }}
            onMouseEnter={() => {
              const numbers = BetTypes.getNumbers(option.type);
              setHoveredNumbers(numbers);
            }}
            onMouseLeave={() => setHoveredNumbers([])}
            disabled={disabled}
            className={`h-[45px] rounded-xl relative text-white border border-white/10 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 ${
              option.isRed
                ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-primary/80 hover:from-gaming-primary hover:to-gaming-primary/90 text-white/90 hover:shadow-gaming-primary/30"
                : option.color === "gray"
                  ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700 hover:to-gray-800 text-white/90 hover:shadow-gray-500/30"
                  : `bg-gradient-to-br from-${option.color}-600/90 to-${option.color}-700/90 hover:from-${option.color}-500 hover:to-${option.color}-600 text-white/90 hover:shadow-${option.color}-500/30`
            } ${
              getBetAmount([], option.type) > 0 ||
              isBetTypeHovered(option.type, BetTypes.getNumbers(option.type))
                ? "ring-2 ring-offset-2 ring-offset-secondary-900 scale-105 z-20 shadow-[0_0_20px_rgba(var(--gaming-primary),0.4)] border-gaming-primary/50"
                : ""
            }`}
          >
            {option.label}
            {getBetAmount([], option.type) > 0 && (
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg transform hover:scale-110 transition-all duration-200">
                {getBetAmount([], option.type)}
              </div>
            )}
          </button>
        ))}
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
    <div className="bet-controls grid grid-cols-[2fr_1fr] gap-6">
      {/* Chip Selection */}
      <div>
        <h3 className="text-lg font-semibold text-secondary-300 mb-3">
          Select Chip Value
        </h3>
        <div className="chip-selector flex flex-wrap gap-2">
          {CHIP_VALUES.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onChipValueChange(chip.value)}
              disabled={disabled}
              className={`h-12 px-6 rounded-xl flex items-center justify-center font-bold transition-all duration-300 
                ${
                  selectedChipValue === chip.value
                    ? "bg-gaming-primary text-white shadow-glow scale-105"
                    : "bg-secondary-800/50 text-secondary-300 hover:bg-secondary-700/50 hover:text-white hover:scale-105"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Place Bet Button */}
      <div className="flex items-end">
        {isCheckingApproval ? (
          <button
            className="h-14 w-full bg-secondary-800/50 text-secondary-300 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={true}
          >
            <LoadingSpinner size="small" />
            Checking Approval...
          </button>
        ) : isApproved ? (
          <button
            onClick={onPlaceBets}
            disabled={disabled || selectedBets.length === 0}
            className={`h-14 w-full rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
              ${
                disabled || selectedBets.length === 0
                  ? "bg-secondary-800/50 text-secondary-300"
                  : "bg-gradient-to-br from-gray-900 to-gray-800 text-white hover:scale-105 shadow-lg hover:shadow-white/20 border border-white/10 hover:border-white/20"
              }`}
          >
            {gameState.isProcessing ? (
              <>
                <LoadingSpinner size="small" />
                Processing...
              </>
            ) : (
              <>
                <span className="text-xl">🎲</span>
                Place Bets
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onApprove}
            disabled={disabled}
            className={`h-14 w-full rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
              ${
                disabled
                  ? "bg-secondary-800/50 text-secondary-300"
                  : "bg-gradient-to-br from-gaming-success to-emerald-500 text-white hover:scale-105 shadow-lg hover:shadow-gaming-success/20"
              }`}
          >
            Approve Token
          </button>
        )}
      </div>
    </div>
  );
};

// Add helper function to get bet type name
const getBetTypeName = (betType, numbers) => {
  // Convert contract's internal enum to our frontend bet type
  const convertedType = (() => {
    switch (Number(betType)) {
      case 0:
        return BetTypes.STRAIGHT; // Straight
      case 1: // Dozen
        if (numbers[0] === 1) return BetTypes.DOZEN_FIRST;
        if (numbers[0] === 13) return BetTypes.DOZEN_SECOND;
        if (numbers[0] === 25) return BetTypes.DOZEN_THIRD;
        break;
      case 2: // Column
        if (numbers[0] === 1) return BetTypes.COLUMN_FIRST;
        if (numbers[0] === 2) return BetTypes.COLUMN_SECOND;
        if (numbers[0] === 3) return BetTypes.COLUMN_THIRD;
        break;
      case 3:
        return BetTypes.RED; // Red
      case 4:
        return BetTypes.BLACK; // Black
      case 5:
        return BetTypes.EVEN; // Even
      case 6:
        return BetTypes.ODD; // Odd
      case 7:
        return BetTypes.LOW; // Low
      case 8:
        return BetTypes.HIGH; // High
      default:
        console.error("Unknown bet type:", betType);
        return betType;
    }
  })();

  // Now use the converted type to get the display name
  switch (convertedType) {
    case BetTypes.STRAIGHT:
      return `Number ${numbers[0]}`;
    case BetTypes.DOZEN_FIRST:
      return "First Dozen (1-12)";
    case BetTypes.DOZEN_SECOND:
      return "Second Dozen (13-24)";
    case BetTypes.DOZEN_THIRD:
      return "Third Dozen (25-36)";
    case BetTypes.COLUMN_FIRST:
      return "First Column";
    case BetTypes.COLUMN_SECOND:
      return "Second Column";
    case BetTypes.COLUMN_THIRD:
      return "Third Column";
    case BetTypes.RED:
      return "Red";
    case BetTypes.BLACK:
      return "Black";
    case BetTypes.EVEN:
      return "Even";
    case BetTypes.ODD:
      return "Odd";
    case BetTypes.LOW:
      return "Low (1-18)";
    case BetTypes.HIGH:
      return "High (19-36)";
    default:
      return "Unknown Bet";
  }
};

// Get all possible winning numbers for a bet type
function getPossibleWinningNumbers(betTypeId, startNumber = 1) {
  const type = Number(betTypeId);

  if (type === BetTypes.STRAIGHT) {
    const numbers = new Array(37);
    for (let i = 0; i <= 36; i++) {
      numbers[i] = i;
    }
    return numbers;
  }

  return BetTypes.getNumbers(type, startNumber);
}

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
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rouletteHistory", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) return null;
      try {
        const [bets, total] = await contracts.roulette.getUserBetHistory(
          account,
          0,
          10,
        );

        if (!bets || !Array.isArray(bets) || bets.length === 0) {
          console.log("No betting data found for new user");
          return [];
        }

        // Debug the raw contract response
        console.log("Raw contract response:", bets);

        const processedBets = bets.map((bet) => {
          // Debug each bet's raw data
          console.log("Processing bet:", bet);

          const processed = {
            timestamp: Number(bet.timestamp),
            winningNumber: Number(bet.winningNumber),
            bets: bet.bets.map((betDetail) => {
              // Debug each bet detail
              console.log("Processing bet detail:", betDetail);

              return {
                betType: Number(betDetail.betType),
                numbers: betDetail.numbers.map((n) => Number(n)),
                amount: betDetail.amount.toString(),
                payout: betDetail.payout.toString(),
              };
            }),
            totalAmount: bet.bets.reduce(
              (sum, b) => sum + BigInt(b.amount),
              BigInt(0),
            ),
            totalPayout: bet.bets.reduce(
              (sum, b) => sum + BigInt(b.payout),
              BigInt(0),
            ),
          };

          // Debug the processed bet
          console.log("Processed bet:", processed);

          return processed;
        });

        return processedBets;
      } catch (error) {
        console.log("Error fetching betting history:", error);
        return [];
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Group bets by timestamp
  const groupedBets = useMemo(() => {
    if (!userData || !Array.isArray(userData) || userData.length === 0) {
      return [];
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
        const isLoss = group.totalPayout < group.totalAmount;
        const profit = group.totalPayout - group.totalAmount;

        return {
          totalWins: acc.totalWins + (isWin ? 1 : 0),
          totalLosses: acc.totalLosses + (isLoss ? 1 : 0),
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
          (group) => group.totalPayout < group.totalAmount,
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
    <div className="betting-history rounded-2xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-300 p-6 bg-secondary-900/80">
      {/* History Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white/90">
            Betting History
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "all"
                  ? "bg-gaming-primary text-white"
                  : "text-secondary-300 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("wins")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "wins"
                  ? "bg-gaming-success text-white"
                  : "text-secondary-300 hover:text-white"
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => setFilter("losses")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "losses"
                  ? "bg-gaming-error text-white"
                  : "text-secondary-300 hover:text-white"
              }`}
            >
              Losses
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-secondary-300 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
        >
          {isExpanded ? "↑" : "↓"}
        </button>
      </div>

      {/* History List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
                  className={`history-item p-4 rounded-xl border ${
                    group.totalPayout > group.totalAmount
                      ? "bg-gaming-success/5 border-gaming-success/20"
                      : group.totalPayout < group.totalAmount
                        ? "bg-gaming-error/5 border-gaming-error/20"
                        : "bg-secondary-800/5 border-secondary-700/20"
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ${
                          group.winningNumber === 0
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isRed(group.winningNumber)
                              ? "bg-gaming-primary/20 text-gaming-primary"
                              : "bg-gray-800/20 text-gray-300"
                        }`}
                      >
                        {group.winningNumber}
                      </div>
                      <div className="text-sm text-secondary-300">
                        {group.bets.map((bet, idx) => {
                          // Map contract bet type to frontend bet type
                          const betType = Number(bet.betType);
                          const numbers = bet.numbers.map((n) => Number(n));
                          return (
                            <span key={idx} className="mr-2">
                              {getBetTypeName(betType, numbers)}
                              {idx < group.bets.length - 1 ? ", " : ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        group.totalPayout > group.totalAmount
                          ? "text-gaming-success"
                          : group.totalPayout < group.totalAmount
                            ? "text-gaming-error"
                            : "text-secondary-400"
                      }`}
                    >
                      {group.totalPayout > group.totalAmount
                        ? "WIN"
                        : group.totalPayout < group.totalAmount
                          ? "LOSS"
                          : "EVEN"}
                    </div>
                  </div>

                  {/* Bets */}
                  <div className="space-y-2">
                    {group.bets.map((bet, i) => {
                      // Map contract bet type to frontend bet type
                      const betType = Number(bet.betType);
                      const numbers = bet.numbers.map((n) => Number(n));
                      return (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-secondary-300">
                            {getBetTypeName(betType, numbers)}
                          </span>
                          <span className="font-medium">
                            {parseFloat(ethers.formatEther(bet.amount)).toFixed(
                              0,
                            )}{" "}
                            GAMA
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary-300">
                        Total Payout
                      </span>
                      <span className="font-bold">
                        {parseFloat(
                          ethers.formatEther(group.totalPayout),
                        ).toFixed(0)}{" "}
                        GAMA
                        {group.totalPayout > group.totalAmount && (
                          <span className="text-gaming-success ml-1">
                            (+
                            {parseFloat(
                              ethers.formatEther(
                                BigInt(group.totalPayout) -
                                  BigInt(group.totalAmount),
                              ),
                            ).toFixed(0)}
                            )
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredBets.length === 0 && (
        <div className="text-center py-8 bg-secondary-800/30 rounded-xl border border-secondary-700/30">
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

// Add CompactHistory component
const CompactHistory = ({ bets, account, contracts }) => {
  // Add balance query
  const { data: balanceData } = useQuery({
    queryKey: ["balance", account, contracts?.token?.target],
    queryFn: async () => {
      if (!contracts?.token || !account) return null;

      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.roulette.target),
      ]);

      return {
        balance,
        allowance: tokenAllowance,
      };
    },
    enabled: !!contracts?.token && !!account,
    refetchInterval: 5000,
  });

  if (!bets || bets.length === 0) return null;

  // Sort bets by timestamp in descending order (most recent first)
  const sortedBets = (bets || []).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-300 p-3 space-y-3 bg-secondary-900/80">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-xs font-medium text-secondary-300">Last Results</h2>
      </div>
      <div className="flex gap-1">
        {sortedBets.slice(0, 3).map((bet, index) => (
          <div
            key={`${bet.timestamp}-${index}`}
            className={`flex-1 p-1.5 rounded-lg border ${
              bet.totalPayout > bet.totalAmount
                ? "bg-gaming-success/10 border-gaming-success/20"
                : "bg-gaming-error/10 border-gaming-error/20"
            }`}
          >
            <div
              className={`w-full h-6 rounded flex items-center justify-center text-sm font-medium ${
                isRed(bet.winningNumber)
                  ? "bg-gaming-primary/20 text-gaming-primary"
                  : "bg-gray-800/20 text-gray-300"
              }`}
            >
              {bet.winningNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Balance Display */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-xs text-secondary-400">Balance:</span>
        <span className="text-sm font-medium text-white">
          {balanceData?.balance
            ? `${parseFloat(ethers.formatEther(balanceData.balance)).toFixed(2)} GAMA`
            : "Loading..."}
        </span>
      </div>
    </div>
  );
};

// Add this helper function to validate column numbers
const validateColumnNumbers = (type, numbers) => {
  if (!numbers || !Array.isArray(numbers)) return false;

  switch (type) {
    case BetTypes.COLUMN_FIRST: // 1,4,7...
      return numbers.every((n, i) => n === 1 + i * 3);
    case BetTypes.COLUMN_SECOND: // 2,5,8...
      return numbers.every((n, i) => n === 2 + i * 3);
    case BetTypes.COLUMN_THIRD: // 3,6,9...
      return numbers.every((n, i) => n === 3 + i * 3);
    default:
      return true;
  }
};

// Add helper functions to match contract functionality
const BetHelpers = {
  // Get all possible winning numbers for a bet type (matches contract's getPossibleWinningNumbers)
  getPossibleWinningNumbers: (betTypeId) => {
    switch (Number(betTypeId)) {
      case BetTypes.STRAIGHT:
        return Array.from({ length: 37 }, (_, i) => i); // 0-36
      case BetTypes.RED:
        return [
          1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
        ];
      case BetTypes.BLACK:
        return [
          2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
        ];
      case BetTypes.EVEN:
        return Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
      case BetTypes.ODD:
        return Array.from({ length: 18 }, (_, i) => i * 2 + 1);
      case BetTypes.LOW:
        return Array.from({ length: 18 }, (_, i) => i + 1);
      case BetTypes.HIGH:
        return Array.from({ length: 18 }, (_, i) => i + 19);
      case BetTypes.DOZEN_FIRST:
        return Array.from({ length: 12 }, (_, i) => i + 1);
      case BetTypes.DOZEN_SECOND:
        return Array.from({ length: 12 }, (_, i) => i + 13);
      case BetTypes.DOZEN_THIRD:
        return Array.from({ length: 12 }, (_, i) => i + 25);
      case BetTypes.COLUMN_FIRST:
        return Array.from({ length: 12 }, (_, i) => 1 + i * 3);
      case BetTypes.COLUMN_SECOND:
        return Array.from({ length: 12 }, (_, i) => 2 + i * 3);
      case BetTypes.COLUMN_THIRD:
        return Array.from({ length: 12 }, (_, i) => 3 + i * 3);
      default:
        throw new Error("Invalid bet type ID for number generation");
    }
  },

  // Get bet type info (matches contract's getBetTypeInfo)
  getBetTypeInfo: (betTypeId) => {
    switch (Number(betTypeId)) {
      case BetTypes.STRAIGHT:
        return { name: "Straight", requiresNumber: true, multiplier: 35000 }; // 35x
      case BetTypes.DOZEN_FIRST:
        return {
          name: "First Dozen (1-12)",
          requiresNumber: false,
          multiplier: 20000,
        }; // 2x
      case BetTypes.DOZEN_SECOND:
        return {
          name: "Second Dozen (13-24)",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.DOZEN_THIRD:
        return {
          name: "Third Dozen (25-36)",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_FIRST:
        return {
          name: "First Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_SECOND:
        return {
          name: "Second Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_THIRD:
        return {
          name: "Third Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.RED:
        return { name: "Red", requiresNumber: false, multiplier: 10000 }; // 1x
      case BetTypes.BLACK:
        return { name: "Black", requiresNumber: false, multiplier: 10000 };
      case BetTypes.EVEN:
        return { name: "Even", requiresNumber: false, multiplier: 10000 };
      case BetTypes.ODD:
        return { name: "Odd", requiresNumber: false, multiplier: 10000 };
      case BetTypes.LOW:
        return { name: "Low (1-18)", requiresNumber: false, multiplier: 10000 };
      case BetTypes.HIGH:
        return {
          name: "High (19-36)",
          requiresNumber: false,
          multiplier: 10000,
        };
      default:
        throw new Error("Invalid bet type");
    }
  },

  // Calculate potential payout (helper for UI)
  calculatePotentialPayout: (betAmount, betTypeId) => {
    const { multiplier } = BetHelpers.getBetTypeInfo(betTypeId);
    return (BigInt(betAmount) * BigInt(multiplier)) / BigInt(10000);
  },

  // Validate bet parameters (matches contract's validation)
  validateBetParameters: (bet) => {
    // Check bet type range
    if (bet.type < 0 || bet.type > 12) {
      throw new Error("Invalid bet type");
    }

    // Check bet amount
    if (bet.amount <= 0 || bet.amount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
      throw new Error("Invalid bet amount");
    }

    // For straight bets, validate number
    if (bet.type === BetTypes.STRAIGHT) {
      if (bet.numbers.length !== 1 || bet.numbers[0] > 36) {
        throw new Error("Invalid number for straight bet");
      }
    }

    // For column and dozen bets, validate numbers array
    if (
      [
        BetTypes.COLUMN_FIRST,
        BetTypes.COLUMN_SECOND,
        BetTypes.COLUMN_THIRD,
      ].includes(bet.type)
    ) {
      const expectedNumbers = BetHelpers.getPossibleWinningNumbers(bet.type);
      if (!bet.numbers.every((num, idx) => num === expectedNumbers[idx])) {
        throw new Error("Invalid numbers for bet type");
      }
    }

    return true;
  },
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

  // Fetch user's betting data
  const { data: userData } = useQuery({
    queryKey: ["rouletteHistory", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) return null;
      try {
        const [bets, total] = await contracts.roulette.getUserBetHistory(
          account,
          0,
          10,
        );

        if (!bets || !Array.isArray(bets) || bets.length === 0) {
          console.log("No betting data found for new user");
          return [];
        }

        // Debug the raw contract response
        console.log("Raw contract response:", bets);

        const processedBets = bets.map((bet) => {
          // Debug each bet's raw data
          console.log("Processing bet:", bet);

          const processed = {
            timestamp: Number(bet.timestamp),
            winningNumber: Number(bet.winningNumber),
            bets: bet.bets.map((betDetail) => {
              // Debug each bet detail
              console.log("Processing bet detail:", betDetail);

              return {
                betType: Number(betDetail.betType),
                numbers: betDetail.numbers.map((n) => Number(n)),
                amount: betDetail.amount.toString(),
                payout: betDetail.payout.toString(),
              };
            }),
            totalAmount: bet.bets.reduce(
              (sum, b) => sum + BigInt(b.amount),
              BigInt(0),
            ),
            totalPayout: bet.bets.reduce(
              (sum, b) => sum + BigInt(b.payout),
              BigInt(0),
            ),
          };

          // Debug the processed bet
          console.log("Processed bet:", processed);

          return processed;
        });

        return processedBets;
      } catch (error) {
        console.log("Error fetching betting history:", error);
        return [];
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 10000,
    staleTime: 5000,
  });

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
      } else {
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler functions
  const handleBetSelect = useCallback(
    (numbers, type) => {
      if (isProcessing) return;

      setSelectedBets((prev) => {
        // Validate bet type matches contract expectations
        if (!BetTypes.isValid(type)) {
          console.error("Invalid bet type:", type);
          addToast("Invalid bet type selected", "error");
          return prev;
        }

        // Format bet for contract
        const betRequest = {
          betTypeId: type,
          number: type === BetTypes.STRAIGHT ? numbers[0] : 0,
          amount: BigInt(selectedChipValue).toString(),
        };

        // Check if bet already exists
        const existingBetIndex = prev.findIndex(
          (bet) =>
            bet.type === type &&
            JSON.stringify((bet.numbers || []).sort()) ===
              JSON.stringify((numbers || []).sort()),
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
            numbers,
            type: betRequest.betTypeId,
            amount: betRequest.amount,
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

          // Validate column numbers
          if (
            [
              BetTypes.COLUMN_FIRST,
              BetTypes.COLUMN_SECOND,
              BetTypes.COLUMN_THIRD,
            ].includes(bet.type)
          ) {
            if (!validateColumnNumbers(bet.type, bet.numbers)) {
              throw new Error(
                `Invalid numbers for column bet type: ${bet.type}`,
              );
            }
          }

          // For straight bets, validate number
          if (
            bet.type === BetTypes.STRAIGHT &&
            (bet.numbers.length !== 1 || bet.numbers[0] > 36)
          ) {
            throw new Error(
              `Invalid number for straight bet: ${bet.numbers[0]}`,
            );
          }

          return {
            betTypeId: bet.type,
            number: bet.type === BetTypes.STRAIGHT ? bet.numbers[0] : 0,
            amount: BigInt(bet.amount).toString(),
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

          const errorMessage =
            CONTRACT_ERRORS[errorName] ||
            `Transaction failed: ${error.message || "Unknown error"}`;
          addToast(errorMessage, "error");
          if (!CONTRACT_ERRORS[errorName]) {
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
    <div className="min-h-screen bg-white bg-mesh bg-fixed">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-3 animate-fade-in">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gaming-primary to-gaming-accent bg-clip-text text-transparent drop-shadow-xl">
              Roulette
            </h1>
            <p className="text-secondary-400 text-lg max-w-2xl mx-auto">
              Place your bets and test your luck on the ultimate gaming
              experience!
            </p>
          </div>

          {/* Main Game Section */}
          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            {/* Left Column - Betting Board */}
            <div className="space-y-6">
              <div className="glass-panel transform hover:scale-[1.01] transition-all duration-300 hover:shadow-glow">
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
              </div>

              <div className="glass-panel p-6 transform hover:scale-[1.01] transition-all duration-300">
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
            </div>

            {/* Right Column - Stats & Compact History */}
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="glass-panel p-4 transform hover:scale-105 transition-all duration-300">
                  <div className="text-secondary-300 text-sm font-medium mb-1">
                    Total Bets
                  </div>
                  <div className="text-white text-2xl font-bold animate-float flex items-baseline gap-2">
                    {selectedBets.length}
                    <span className="text-sm text-secondary-400 font-normal">
                      positions
                    </span>
                  </div>
                </div>
                <div className="glass-panel p-4 transform hover:scale-105 transition-all duration-300">
                  <div className="text-secondary-300 text-sm font-medium mb-1">
                    Total Amount
                  </div>
                  <div className="text-white text-2xl font-bold animate-float flex items-baseline gap-2">
                    {parseFloat(ethers.formatEther(totalBetAmount)).toFixed(0)}
                    <span className="text-sm text-secondary-400 font-normal">
                      GAMA
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact History */}
              <div className="glass-panel p-4 transform hover:scale-[1.01] transition-all duration-300">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white/90 mb-1">
                    Recent Activity
                  </h3>
                  <div className="h-0.5 w-16 bg-gradient-to-r from-gaming-primary to-gaming-accent"></div>
                </div>
                <CompactHistory
                  bets={userData}
                  account={account}
                  contracts={contracts}
                />
              </div>
            </div>
          </div>

          {/* Bottom Section - Detailed History */}
          <div className="glass-panel p-6 transform hover:scale-[1.01] transition-all duration-300">
            <div className="mb-4">
              <h3 className="text-2xl font-semibold text-white/90 mb-2">
                Betting History
              </h3>
              <div className="h-0.5 w-24 bg-gradient-to-r from-gaming-primary to-gaming-accent"></div>
            </div>
            <BettingHistory account={account} contracts={contracts} />
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
