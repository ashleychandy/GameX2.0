import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { Link } from "react-router-dom";

// Constants for bet types matching contract enum
const BetTypes = {
  STRAIGHT: 0,
  SPLIT: 1,
  STREET: 2,
  CORNER: 3,
  SIXLINE: 4,
  DOZEN: 5,
  COLUMN: 6,
  RED: 7,
  BLACK: 8,
  EVEN: 9,
  ODD: 10,
  LOW: 11,
  HIGH: 12
};

// Bet validation helpers
const areAdjacentNumbers = (a, b) => {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return (max === min + 1 && min % 3 !== 0) || (max === min + 3 && min <= 33);
};

const isValidStreet = (numbers) => {
  if (numbers.length !== 3) return false;
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const start = sortedNumbers[0];
  return (
    start % 3 === 1 &&
    sortedNumbers[1] === start + 1 &&
    sortedNumbers[2] === start + 2
  );
};

const isValidCorner = (numbers) => {
  if (numbers.length !== 4) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  const start = sorted[0];
  return (
    start % 3 !== 0 &&
    start <= 32 &&
    sorted[1] === start + 1 &&
    sorted[2] === start + 3 &&
    sorted[3] === start + 4
  );
};

const isValidSixLine = (numbers) => {
  if (numbers.length !== 6) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  const start = sorted[0];
  return (
    start % 3 === 1 &&
    start <= 31 &&
    sorted.every((num, i) => num === start + i)
  );
};

const isValidDozen = (numbers) => {
  if (numbers.length !== 12) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  const start = sorted[0];
  return (
    (start === 1 || start === 13 || start === 25) &&
    sorted.every((num, i) => num === start + i)
  );
};

const isValidColumn = (numbers) => {
  if (numbers.length !== 12) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  const start = sorted[0];
  return (
    (start >= 1 && start <= 3) &&
    sorted.every((num, i) => num === start + (i * 3))
  );
};

const validateBet = (numbers, betType) => {
  // Create a new sorted array for validation
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  
  // Helper function to check if numbers are valid
  const isValidNumber = (num) => num >= 0 && num <= 36;

  // Check all numbers are valid
  if (!sortedNumbers.every(isValidNumber)) return false;

  switch (betType) {
    case BetTypes.STRAIGHT:
      return sortedNumbers.length === 1;

    case BetTypes.SPLIT:
      return sortedNumbers.length === 2 && areAdjacentNumbers(sortedNumbers[0], sortedNumbers[1]);

    case BetTypes.STREET:
      return isValidStreet(sortedNumbers);

    case BetTypes.CORNER:
      return isValidCorner(sortedNumbers);

    case BetTypes.SIXLINE:
      return isValidSixLine(sortedNumbers);

    case BetTypes.DOZEN:
      return isValidDozen(sortedNumbers);

    case BetTypes.COLUMN:
      return isValidColumn(sortedNumbers);

    case BetTypes.RED:
    case BetTypes.BLACK:
    case BetTypes.EVEN:
    case BetTypes.ODD:
    case BetTypes.LOW:
    case BetTypes.HIGH:
      return sortedNumbers.length === 0; // Outside bets should have empty numbers array

    default:
      return false;
  }
};

// Update CHIP_VALUES to use proper token amounts
const CHIP_VALUES = [
  { value: ethers.parseEther("100"), label: "100", color: "#FF6B6B" }, // Red
  { value: ethers.parseEther("500"), label: "500", color: "#4ECDC4" }, // Teal
  { value: ethers.parseEther("1000"), label: "1000", color: "#45B7D1" }, // Blue
];

// Enhanced RouletteWheel Component
const RouletteWheel = ({ isSpinning, winningNumber }) => {
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];

  return (
    <div className="relative w-full aspect-square max-w-[400px] mx-auto">
      <motion.div
        animate={
          isSpinning ? { rotate: 360 * 5 + winningNumber * (360 / 37) } : {}
        }
        transition={{ duration: 3, ease: "easeOut" }}
        className="w-full h-full rounded-full border-4 border-gaming-primary relative overflow-hidden"
      >
        {/* Wheel segments */}
        {Array.from({ length: 37 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-full h-full origin-center
              ${
                i === 0
                  ? "bg-green-600"
                  : redNumbers.includes(i)
                  ? "bg-red-600"
                  : "bg-black"
              }
            `}
            style={{
              transform: `rotate(${(i * 360) / 37}deg)`,
              clipPath: "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)",
            }}
          >
            <span className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white">
              {i}
            </span>
          </div>
        ))}

        {/* Ball */}
        {winningNumber !== null && (
          <motion.div
            className="absolute w-4 h-4 bg-white rounded-full shadow-lg"
            initial={{ x: "50%", y: "0%" }}
            animate={{
              x: `${
                Math.cos((((winningNumber * 360) / 37) * Math.PI) / 180) * 45 +
                50
              }%`,
              y: `${
                Math.sin((((winningNumber * 360) / 37) * Math.PI) / 180) * 45 +
                50
              }%`,
            }}
            transition={{ duration: 3, ease: "easeOut" }}
          />
        )}
      </motion.div>
    </div>
  );
};

// Enhanced BettingBoard Component
const BettingBoard = ({ onBetSelect, selectedBets, disabled }) => {
  const numbers = Array.from({ length: 37 }, (_, i) => i);
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];

  const handleBetClick = (numbers, betType) => {
    if (disabled) return;
    onBetSelect({ numbers, type: betType });
  };

  const isBetSelected = (numbers, betType) => {
    return selectedBets.some(
      (bet) =>
        bet.type === betType &&
        JSON.stringify(bet.numbers.sort()) === JSON.stringify(numbers.sort())
    );
  };

  // Helper to generate split bet buttons
  const renderSplitBets = () => {
    const splitBets = [];
    for (let i = 1; i <= 36; i++) {
      // Horizontal splits
      if (i % 3 !== 0) {
        splitBets.push({
          numbers: [i, i + 1],
          position: `split-h-${i}`,
        });
      }
      // Vertical splits
      if (i <= 33) {
        splitBets.push({
          numbers: [i, i + 3],
          position: `split-v-${i}`,
        });
      }
    }
    return splitBets.map((bet) => (
      <button
        key={bet.position}
        onClick={() => handleBetClick(bet.numbers, BetTypes.SPLIT)}
        className={`absolute split-bet ${bet.position}`}
      />
    ));
  };

  // Helper to render chips on a bet
  const renderBetChips = (numbers, betType) => {
    const betsOnThisSpot = selectedBets.filter(
      (bet) =>
        bet.type === betType &&
        JSON.stringify(bet.numbers.sort()) === JSON.stringify(numbers.sort())
    );

    if (betsOnThisSpot.length === 0) return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {betsOnThisSpot.map((bet, index) => {
            const chipInfo = CHIP_VALUES.find(
              (chip) => chip.value === bet.amount
            );
            return (
              <div
                key={`${bet.amount}-${index}`}
                className="absolute rounded-full text-white text-xs flex items-center justify-center"
                style={{
                  width: "24px",
                  height: "24px",
                  backgroundColor: chipInfo?.color || "#6B7280",
                  transform: `translateY(${index * -4}px)`,
                  border: "2px solid rgba(255, 255, 255, 0.5)",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  zIndex: index + 1,
                }}
              >
                {chipInfo?.label ||
                  ethers.formatEther(bet.amount).replace(/\.0$/, "")}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Number Grid */}
      <div className="grid grid-cols-3 gap-2 relative">
        {/* Zero */}
        <button
          onClick={() => handleBetClick([0], BetTypes.STRAIGHT)}
          className={`
            p-4 rounded-lg text-center font-bold relative
            ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gaming-primary/20"
            }
            ${
              isBetSelected([0], BetTypes.STRAIGHT)
                ? "bg-gaming-primary text-white"
                : "bg-green-600/20 text-green-400"
            }
          `}
        >
          0{renderBetChips([0], BetTypes.STRAIGHT)}
        </button>

        {/* Numbers 1-36 */}
        {numbers.slice(1).map((number) => (
          <button
            key={number}
            onClick={() => handleBetClick([number], BetTypes.STRAIGHT)}
            className={`
              p-4 rounded-lg text-center font-bold relative
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gaming-primary/20"
              }
              ${
                isBetSelected([number], BetTypes.STRAIGHT)
                  ? "bg-gaming-primary text-white"
                  : redNumbers.includes(number)
                  ? "bg-red-600/20 text-red-400"
                  : "bg-black/20 text-gray-400"
              }
            `}
          >
            {number}
            {renderBetChips([number], BetTypes.STRAIGHT)}
          </button>
        ))}

        {/* Split Bets */}
        {renderSplitBets()}

        {/* Street Bets */}
        {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map((start) => (
          <button
            key={`street-${start}`}
            onClick={() =>
              handleBetClick([start, start + 1, start + 2], BetTypes.STREET)
            }
            className="street-bet"
          />
        ))}

        {/* Corner Bets */}
        {[
          1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28,
          29, 31, 32,
        ].map((start) => (
          <button
            key={`corner-${start}`}
            onClick={() =>
              handleBetClick(
                [start, start + 1, start + 3, start + 4],
                BetTypes.CORNER
              )
            }
            className="corner-bet"
          />
        ))}

        {/* Six Line Bets */}
        {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31].map((start) => (
          <button
            key={`sixline-${start}`}
            onClick={() =>
              handleBetClick(
                [start, start + 1, start + 2, start + 3, start + 4, start + 5],
                BetTypes.SIXLINE
              )
            }
            className="sixline-bet"
          />
        ))}
      </div>

      {/* Dozen Bets */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "1st 12",
            numbers: Array.from({ length: 12 }, (_, i) => i + 1).sort((a, b) => a - b),
          },
          {
            label: "2nd 12",
            numbers: Array.from({ length: 12 }, (_, i) => i + 13).sort((a, b) => a - b),
          },
          {
            label: "3rd 12",
            numbers: Array.from({ length: 12 }, (_, i) => i + 25).sort((a, b) => a - b),
          },
        ].map((dozen) => (
          <button
            key={dozen.label}
            onClick={() => handleBetClick(dozen.numbers, BetTypes.DOZEN)}
            className={`
              p-2 rounded-lg text-center font-bold
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gaming-primary/20"
              }
              ${
                isBetSelected(dozen.numbers, BetTypes.DOZEN)
                  ? "bg-gaming-primary text-white"
                  : "bg-secondary-700/50 text-secondary-300"
              }
            `}
          >
            {dozen.label}
          </button>
        ))}
      </div>

      {/* Column Bets */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "2:1",
            numbers: Array.from({ length: 12 }, (_, i) => i * 3 + 1),
          },
          {
            label: "2:1",
            numbers: Array.from({ length: 12 }, (_, i) => i * 3 + 2),
          },
          {
            label: "2:1",
            numbers: Array.from({ length: 12 }, (_, i) => i * 3 + 3),
          },
        ].map((column, i) => (
          <button
            key={`column-${i}`}
            onClick={() => handleBetClick(column.numbers, BetTypes.COLUMN)}
            className={`
              p-2 rounded-lg text-center font-bold
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gaming-primary/20"
              }
              ${
                isBetSelected(column.numbers, BetTypes.COLUMN)
                  ? "bg-gaming-primary text-white"
                  : "bg-secondary-700/50 text-secondary-300"
              }
            `}
          >
            {column.label}
          </button>
        ))}
      </div>

      {/* Outside Bets */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "1-18",
            type: BetTypes.LOW,
            numbers: Array.from({ length: 18 }, (_, i) => i + 1),
          },
          {
            label: "19-36",
            type: BetTypes.HIGH,
            numbers: Array.from({ length: 18 }, (_, i) => i + 19),
          },
          {
            label: "RED",
            type: BetTypes.RED,
            numbers: redNumbers,
          },
          {
            label: "BLACK",
            type: BetTypes.BLACK,
            numbers: numbers.filter((n) => n !== 0 && !redNumbers.includes(n)),
          },
          {
            label: "EVEN",
            type: BetTypes.EVEN,
            numbers: numbers.filter((n) => n !== 0 && n % 2 === 0),
          },
          {
            label: "ODD",
            type: BetTypes.ODD,
            numbers: numbers.filter((n) => n % 2 === 1),
          },
        ].map((bet) => (
          <button
            key={bet.label}
            onClick={() => handleBetClick(bet.numbers, bet.type)}
            className={`
              p-4 rounded-lg text-center font-bold relative
              ${
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gaming-primary/20"
              }
              ${
                isBetSelected(bet.numbers, bet.type)
                  ? "bg-gaming-primary text-white"
                  : "bg-secondary-700/50 text-secondary-300"
              }
            `}
          >
            {bet.label}
            {renderBetChips(bet.numbers, bet.type)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Add CSS for bet position indicators
const styles = `
  .split-bet {
    width: 20px;
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
  }

  .street-bet {
    width: 20px;
    height: 60px;
    background: rgba(255, 255, 255, 0.2);
  }

  .corner-bet {
    width: 20px;
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
  }

  .sixline-bet {
    width: 20px;
    height: 120px;
    background: rgba(255, 255, 255, 0.2);
  }

  .bet-chip {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: white;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(-50%, -50%);
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.5);
    transition: transform 0.2s ease;
  }

  .bet-chip:hover {
    transform: translate(-50%, -50%) scale(1.1);
    z-index: 20;
  }

  .chip-stack {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .chip-stack > * {
    margin-top: -12px;
  }

  .chip-stack > *:first-child {
    margin-top: 0;
  }

  button {
    position: relative;
    overflow: visible !important;
  }

  .chip-container {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .chip-stack {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateY(-50%);
  }
`;

// Add the styles to the document
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Add this component before the RoulettePage component
const BetControls = ({
  selectedChipValue,
  onChipValueChange,
  selectedBets,
  onClearBets,
  onPlaceBets,
  disabled,
  maxBets,
  balanceData,
  gameState,
  checkAndApproveToken,
  account,
  contracts,
}) => {
  const [isApproving, setIsApproving] = useState(false);

  const totalBetAmount = selectedBets.reduce(
    (sum, bet) => sum + BigInt(bet.amount),
    BigInt(0)
  );

  const needsApproval = balanceData?.allowance < totalBetAmount;
  const insufficientBalance = balanceData?.balance < totalBetAmount;

  // Format balance with proper decimal places (18 decimals for ERC20)
  const formatBalance = (value) => {
    if (!value) return "0.0";
    try {
      const valueString = value.toString().padStart(19, "0");
      const decimalIndex = valueString.length - 18;
      const wholeNumber = valueString.slice(0, decimalIndex) || "0";
      const decimals = valueString
        .slice(decimalIndex, decimalIndex + 4)
        .replace(/0+$/, "");
      return `${wholeNumber}${decimals ? "." + decimals : ""}`;
    } catch (error) {
      console.error("Error formatting balance:", error);
      return "0.0";
    }
  };

  const handleApprove = async () => {
    if (!account || !contracts?.token || !contracts?.roulette) return;

    setIsApproving(true);
    try {
      await checkAndApproveToken(totalBetAmount);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {CHIP_VALUES.map((chip) => (
            <button
              key={chip.label}
              onClick={() => onChipValueChange(chip.value)}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center font-bold
                transition-all duration-200
                ${
                  selectedChipValue === chip.value
                    ? "ring-2 ring-white ring-offset-4 ring-offset-secondary-900 transform scale-110"
                    : ""
                }
                ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90"
                }
                text-white
              `}
              style={{
                backgroundColor: chip.color,
                boxShadow:
                  selectedChipValue === chip.value
                    ? `0 0 10px ${chip.color}`
                    : "none",
              }}
              disabled={disabled}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="space-x-4">
          {account && needsApproval && selectedBets.length > 0 && (
            <button
              onClick={handleApprove}
              disabled={isApproving || gameState.isProcessing}
              className={`
                px-6 py-2 rounded-lg font-bold
                ${
                  isApproving || gameState.isProcessing
                    ? "bg-secondary-700 text-secondary-500 cursor-not-allowed"
                    : "bg-gaming-primary text-white hover:bg-gaming-primary/80"
                }
              `}
            >
              {isApproving ? (
                <span className="flex items-center">
                  <LoadingSpinner />
                  <span className="ml-2">Approving...</span>
                </span>
              ) : (
                "Approve Tokens"
              )}
            </button>
          )}

          <button
            onClick={onClearBets}
            disabled={disabled || selectedBets.length === 0}
            className={`
              px-6 py-2 rounded-lg font-bold
              ${
                disabled || selectedBets.length === 0
                  ? "bg-secondary-700 text-secondary-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }
            `}
          >
            Clear Bets
          </button>
          <button
            onClick={onPlaceBets}
            disabled={
              disabled ||
              selectedBets.length === 0 ||
              needsApproval ||
              insufficientBalance ||
              gameState.isProcessing ||
              isApproving
            }
            className={`
              px-6 py-2 rounded-lg font-bold
              ${
                disabled ||
                selectedBets.length === 0 ||
                needsApproval ||
                insufficientBalance ||
                isApproving
                  ? "bg-secondary-700 text-secondary-500 cursor-not-allowed"
                  : "bg-gaming-primary text-white hover:bg-gaming-primary/80"
              }
            `}
          >
            {gameState.isProcessing ? (
              <span className="flex items-center">
                <LoadingSpinner />
                <span className="ml-2">Processing...</span>
              </span>
            ) : insufficientBalance ? (
              "Insufficient Balance"
            ) : needsApproval ? (
              "Approval Required"
            ) : (
              "Place Bets & Spin"
            )}
          </button>
        </div>
      </div>

      {/* Update balance display */}
      <div className="flex justify-between text-secondary-400 text-sm">
        <div>
          Selected Bets: {selectedBets.length} / {maxBets}
        </div>
        <div>
          Balance: {formatBalance(balanceData?.balance)} tokens
          {totalBetAmount > 0 && ` (Bet: ${formatBalance(totalBetAmount)})`}
        </div>
      </div>
    </div>
  );
};

// Add LoadingSpinner component directly in the file
const LoadingSpinner = ({ size = "default" }) => (
  <div
    className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${
      size === "small" ? "h-4 w-4" : "h-6 w-6"
    }`}
    role="status"
  />
);

// Add this helper function at the top of the file
const parseTokenAmount = (amount) => {
  try {
    // Ensure amount is a valid BigInt
    return BigInt(amount.toString());
  } catch (error) {
    console.error("Error parsing token amount:", error);
    throw new Error("Invalid token amount");
  }
};

// Add this validation helper function
const validateBetRequest = (bet) => {
  try {
    // Create a new array for bet numbers
    const betNumbers = [...(bet.numbers || [])];
    
    // Check if numbers array exists and is valid
    if (!Array.isArray(betNumbers)) {
      console.error("Invalid bet numbers:", betNumbers);
      return false;
    }

    // Check if amount is valid
    if (!bet.amount || BigInt(bet.amount) <= 0) {
      console.error("Invalid bet amount:", bet.amount);
      return false;
    }

    // Check if betType is valid (matches contract enum)
    if (typeof bet.betType !== "number" || bet.betType < 0 || bet.betType > 12) {
      console.error("Invalid bet type:", bet.betType);
      return false;
    }

    // For outside bets (RED, BLACK, etc), numbers array should be empty
    if ([7, 8, 9, 10, 11, 12].includes(bet.betType) && betNumbers.length !== 0) {
      console.error("Outside bet should have empty numbers array");
      return false;
    }

    // Validate numbers based on bet type
    return validateBet(betNumbers, bet.betType);
  } catch (error) {
    console.error("Error validating bet:", error);
    return false;
  }
};

// Add this new component after the BetControls component and before the RoulettePage component
const BettingHistory = ({ userData }) => {
  if (!userData?.betHistory?.length) return null;

  const formatAmount = (amount) => {
    try {
      if (!amount) return "0";
      // Format to a maximum of 4 decimal places
      const formatted = ethers.formatEther(amount);
      return parseFloat(formatted).toFixed(4).replace(/\.?0+$/, '');
    } catch (error) {
      console.error("Error formatting amount:", error);
      return "0";
    }
  };

  const getBetTypeLabel = (betType) => {
    const labels = {
      [BetTypes.STRAIGHT]: "Straight",
      [BetTypes.SPLIT]: "Split",
      [BetTypes.STREET]: "Street",
      [BetTypes.CORNER]: "Corner",
      [BetTypes.SIXLINE]: "Six Line",
      [BetTypes.DOZEN]: "Dozen",
      [BetTypes.COLUMN]: "Column",
      [BetTypes.RED]: "Red",
      [BetTypes.BLACK]: "Black",
      [BetTypes.EVEN]: "Even",
      [BetTypes.ODD]: "Odd",
      [BetTypes.LOW]: "Low (1-18)",
      [BetTypes.HIGH]: "High (19-36)"
    };
    return labels[betType] || `Unknown (${betType})`;
  };

  return (
    <div className="bg-secondary-800 rounded-lg p-4">
      <h2 className="text-xl font-bold text-white mb-4">Betting History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-secondary-400">
          <thead className="text-xs uppercase bg-secondary-700">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Bet Type</th>
              <th className="px-4 py-2">Numbers</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Result</th>
              <th className="px-4 py-2">Payout</th>
            </tr>
          </thead>
          <tbody>
            {[...userData.betHistory]
              .reverse()
              .map((bet, index) => {
                const safeBet = {
                  ...bet,
                  numbers: Array.isArray(bet.numbers) ? [...bet.numbers] : [],
                  betType: Number(bet.betType || 0),
                  amount: bet.amount || "0",
                  payout: bet.payout || "0",
                  timestamp: Number(bet.timestamp || 0),
                  winningNumber: Number(bet.winningNumber || 0)
                };

                return (
                  <tr key={index} className="border-b border-secondary-700">
                    <td className="px-4 py-2">
                      {new Date(safeBet.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {getBetTypeLabel(safeBet.betType)}
                    </td>
                    <td className="px-4 py-2">
                      {safeBet.numbers.length > 0 ? safeBet.numbers.join(", ") : "-"}
                    </td>
                    <td className="px-4 py-2">{formatAmount(safeBet.amount)}</td>
                    <td className="px-4 py-2">
                      <span className={
                        safeBet.winningNumber === 0
                          ? "text-green-600"
                          : BigInt(safeBet.payout) > 0
                          ? "text-green-500"
                          : "text-red-500"
                      }>
                        {safeBet.winningNumber}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={
                        BigInt(safeBet.payout) > 0
                          ? "text-green-500"
                          : "text-red-500"
                      }>
                        {formatAmount(safeBet.payout)}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Roulette Page Component
const RoulettePage = ({ contracts, account, onError, addToast }) => {
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectedChipValue, setSelectedChipValue] = useState(
    CHIP_VALUES[0].value
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState(null);
  const [gameState, setGameState] = useState({
    isProcessing: false,
    isActive: false,
    canPlay: true,
    status: "READY",
    isRolling: false,
  });
  const [balanceData, setBalanceData] = useState({
    balance: BigInt(0),
    allowance: BigInt(0),
  });
  const [userData, setUserData] = useState(null);

  // Add debug logging for contracts
  useEffect(() => {
    console.log("Contracts received:", {
      token: contracts?.token?.target,
      roulette: contracts?.roulette?.target,
      account,
    });
  }, [contracts, account]);

  // Update the handleBetSelect function to handle proper token amounts
  const handleBetSelect = useCallback(
    (bet) => {
      if (!selectedChipValue) return;

      // For outside bets, ensure numbers array is empty
      const isOutsideBet = bet.type >= BetTypes.RED;
      const betNumbers = isOutsideBet ? [] : [...bet.numbers].sort((a, b) => a - b);

      // Validate bet configuration
      if (!validateBet(betNumbers, bet.type)) {
        console.error("Invalid bet configuration:", bet);
        addToast("Invalid bet configuration", "error");
        return;
      }

      setSelectedBets((prev) => {
        const newBet = {
          numbers: betNumbers,
          type: bet.type,
          amount: BigInt(selectedChipValue.toString()),
          timestamp: Date.now(),
          chipInfo: CHIP_VALUES.find(
            (chip) => chip.value === selectedChipValue
          ),
        };

        return [...prev, newBet];
      });
    },
    [selectedChipValue]
  );

  // Add this useEffect for initial balance check
  useEffect(() => {
    console.log("Account or contracts changed:", {
      hasAccount: !!account,
      hasToken: !!contracts.token,
      hasRoulette: !!contracts.roulette,
    });

    const checkInitialBalance = async () => {
      if (!contracts.token || !account || !contracts.roulette) {
        console.log("Missing requirements for balance check");
        return;
      }

      try {
        const [balance, allowance] = await Promise.all([
          contracts.token.balanceOf(account),
          contracts.token.allowance(account, contracts.roulette.target),
        ]);

        console.log("Initial balances:", {
          balance: balance.toString(),
          allowance: allowance.toString(),
        });

        setBalanceData({
          balance: balance,
          allowance: allowance,
        });
      } catch (error) {
        console.error("Error checking balances:", error);
        onError(error);
      }
    };

    checkInitialBalance();
  }, [contracts.token, contracts.roulette, account]);

  // Update the checkAndApproveToken function to properly handle BigInt values
  const checkAndApproveToken = async (amount) => {
    if (!contracts?.token || !account || !contracts?.roulette) {
      throw new Error("Missing required contracts or account");
    }

    try {
      // Convert amount to BigInt if it isn't already
      const amountBigInt = BigInt(amount.toString());

      // Get current allowance
      const allowance = await contracts.token.allowance(
        account,
        contracts.roulette.target
      );

      console.log("Token approval check:", {
        currentAllowance: allowance.toString(),
        requiredAmount: amountBigInt.toString(),
        rouletteAddress: contracts.roulette.target,
      });

      if (allowance >= amountBigInt) {
        console.log("Sufficient allowance already exists");
        return true;
      }

      // Request max approval
      const tx = await contracts.token.approve(
        contracts.roulette.target,
        ethers.MaxUint256 // Use MaxUint256 for unlimited approval
      );

      addToast("Approval transaction sent", "info");

      // Wait for transaction confirmation
      await tx.wait();

      // Verify new allowance
      const newAllowance = await contracts.token.allowance(
        account,
        contracts.roulette.target
      );

      console.log("New allowance after approval:", newAllowance.toString());

      setBalanceData((prev) => ({
        ...prev,
        allowance: newAllowance,
      }));

      addToast("Token approval successful!", "success");
      return true;
    } catch (error) {
      console.error("Token approval error:", error);
      if (error.code === "ACTION_REJECTED") {
        addToast("Token approval rejected", "error");
      } else {
        addToast("Token approval failed", "error");
      }
      throw error;
    }
  };

  // Update the balance checking effect to properly handle BigInt values
  useEffect(() => {
    const checkBalances = async () => {
      if (!contracts.token || !account || !contracts.roulette) {
        console.log("Missing requirements for balance check:", {
          hasToken: !!contracts.token,
          hasAccount: !!account,
          hasRoulette: !!contracts.roulette,
        });
        return;
      }

      try {
        const [balance, allowance] = await Promise.all([
          contracts.token.balanceOf(account),
          contracts.token.allowance(account, contracts.roulette.target),
        ]);

        console.log("Balance check results:", {
          balance: balance.toString(),
          allowance: allowance.toString(),
          account,
          rouletteAddress: contracts.roulette.target,
        });

        setBalanceData({
          balance: BigInt(balance.toString()),
          allowance: BigInt(allowance.toString()),
        });
      } catch (error) {
        console.error("Error checking balances:", error);
        console.error("Contract state:", {
          tokenAddress: contracts.token?.target,
          rouletteAddress: contracts.roulette?.target,
          account,
        });
        onError(error);
      }
    };

    checkBalances();

    // Set up event listeners for balance updates
    if (contracts.token) {
      const transferFilter = contracts.token.filters.Transfer(null, account);
      const transferFromFilter = contracts.token.filters.Transfer(
        account,
        null
      );
      const approvalFilter = contracts.token.filters.Approval(
        account,
        contracts.roulette?.target
      );

      contracts.token.on(transferFilter, checkBalances);
      contracts.token.on(transferFromFilter, checkBalances);
      contracts.token.on(approvalFilter, checkBalances);

      return () => {
        contracts.token.off(transferFilter, checkBalances);
        contracts.token.off(transferFromFilter, checkBalances);
        contracts.token.off(approvalFilter, checkBalances);
      };
    }
  }, [contracts.token, contracts.roulette, account]);

  // Add this event listener for contract events
  useEffect(() => {
    if (!contracts.roulette) return;

    const gameCompletedFilter =
      contracts.roulette.filters.GameCompleted(account);

    const handleGameCompleted = (player, winningNumber, totalPayout) => {
      setWinningNumber(winningNumber);
      setIsSpinning(true);

      // After spin animation completes
      setTimeout(() => {
        setIsSpinning(false);
        if (totalPayout > 0) {
          addToast(
            `You won ${ethers.formatEther(totalPayout)} tokens!`,
            "success"
          );
        } else {
          addToast("Better luck next time!", "info");
        }
        setSelectedBets([]);
      }, 3000); // Match this with wheel animation duration
    };

    contracts.roulette.on(gameCompletedFilter, handleGameCompleted);

    return () => {
      contracts.roulette.off(gameCompletedFilter, handleGameCompleted);
    };
  }, [contracts.roulette, account]);

  // Add bet validation before sending to contract
  const validateBets = (bets) => {
    return bets.every((bet) => {
      // Check if numbers are valid for bet type
      if (!validateBet(bet.numbers, bet.type)) {
        addToast(`Invalid bet configuration detected`, "error");
        return false;
      }
      return true;
    });
  };

  // Update handlePlaceBets function to ensure proper BigInt handling
  const handlePlaceBets = async () => {
    if (!contracts.roulette || !account) {
      console.log("Missing requirements for placing bets:", {
        hasRoulette: !!contracts.roulette,
        hasAccount: !!account,
      });
      addToast("Please connect your wallet", "error");
      return;
    }

    if (gameState.isProcessing || selectedBets.length === 0) return;

    try {
      setGameState((prev) => ({ ...prev, isProcessing: true }));

      // Format bets for contract
      const betRequests = selectedBets.map((bet) => {
        // For outside bets, ensure empty numbers array
        const isOutsideBet = bet.type >= BetTypes.RED;
        
        // For other bets, ensure numbers are properly sorted
        let numbers = isOutsideBet ? [] : [...bet.numbers].sort((a, b) => a - b);

        return {
          numbers,
          amount: BigInt(bet.amount.toString()),
          betType: bet.type
        };
      });

      // Validate all bets before sending
      if (!betRequests.every(request => validateBet(request.numbers, request.betType))) {
        throw new Error("Invalid bet configuration detected");
      }

      // Debug logging
      console.log("Formatted bets for contract:", 
        betRequests.map(bet => ({
          numbers: Array.from(bet.numbers),
          betType: bet.betType,
          amount: bet.amount.toString(),
          amountInEther: ethers.formatEther(bet.amount)
        }))
      );

      // Calculate total amount
      const totalAmount = betRequests.reduce(
        (sum, bet) => sum + BigInt(bet.amount.toString()),
        BigInt(0)
      );

      // Check allowance
      const allowance = await contracts.token.allowance(
        account, 
        contracts.roulette.target
      );

      if (allowance < totalAmount) {
        addToast("Insufficient token approval", "error");
        return;
      }

      // Estimate gas with properly formatted parameters
      const gasEstimate = await contracts.roulette.placeManyBetsAndSpin.estimateGas(
        betRequests.map(bet => ({
          numbers: bet.numbers,
          amount: bet.amount,
          betType: bet.betType
        }))
      );

      // Add 20% buffer to gas estimate
      const gasLimit = BigInt(Math.floor(Number(gasEstimate) * 1.2));

      // Send transaction
      const tx = await contracts.roulette.placeManyBetsAndSpin(
        betRequests,
        { gasLimit }
      );

      console.log("Transaction sent:", tx.hash);
      addToast("Transaction submitted", "info");

      await tx.wait();

    } catch (error) {
      console.error("Error placing bets:", error);
      handleBetError(error);
    } finally {
      setGameState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Update handleBetError to be more specific
  const handleBetError = (error) => {
    if (error.code === "CALL_EXCEPTION") {
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes("invalidbetparameters")) {
        addToast("Invalid bet configuration", "error");
      } else if (errorMessage.includes("insufficientuserbalance")) {
        addToast("Insufficient balance", "error");
      } else if (errorMessage.includes("insufficientallowance")) {
        addToast("Token approval required", "error");
      } else {
        console.error("Unknown contract error:", error);
        addToast("Transaction failed - check console for details", "error");
      }
    } else if (error.code === "ACTION_REJECTED") {
      addToast("Transaction rejected by user", "error");
    } else {
      console.error("Unexpected error:", error);
      addToast("An unexpected error occurred", "error");
      onError(error);
    }
  };

  // Update the UserStats component
  const UserStats = ({ userData }) => {
    if (!userData) return null;

    const calculateWinRate = () => {
      if (!userData.gamesPlayed || userData.gamesPlayed === 0) return "0";

      // Convert BigInts to numbers for division
      const totalBets = Number(ethers.formatEther(userData.totalBets));
      const totalWinnings = Number(ethers.formatEther(userData.totalWinnings));

      if (totalBets === 0) return "0";
      return ((totalWinnings / totalBets) * 100).toFixed(1);
    };

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary-800 rounded-lg">
        <StatItem
          label="Total Bets"
          value={ethers.formatEther(userData.totalBets)}
        />
        <StatItem
          label="Total Winnings"
          value={ethers.formatEther(userData.totalWinnings)}
        />
        <StatItem
          label="Games Played"
          value={userData.gamesPlayed.toString()}
        />
        <StatItem label="Win Rate" value={`${calculateWinRate()}%`} />
      </div>
    );
  };

  const StatItem = ({ label, value }) => (
    <div className="text-center">
      <div className="text-secondary-400 text-sm">{label}</div>
      <div className="text-white font-bold">{value}</div>
    </div>
  );

  // Add this effect to fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!contracts.roulette || !account) return;

      try {
        const data = await contracts.roulette.getUserGameData(account);
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        onError(error);
      }
    };

    fetchUserData();

    // Also fetch after each game completion
    if (contracts.roulette) {
      const gameCompletedFilter =
        contracts.roulette.filters.GameCompleted(account);
      const handleGameCompleted = () => {
        fetchUserData();
      };

      contracts.roulette.on(gameCompletedFilter, handleGameCompleted);
      return () => {
        contracts.roulette.off(gameCompletedFilter, handleGameCompleted);
      };
    }
  }, [contracts.roulette, account]);

  // Update RoulettePage render to include stats
  return (
    <div className="space-y-8">
      <UserStats userData={userData} />
      <RouletteWheel isSpinning={isSpinning} winningNumber={winningNumber} />
      <BettingBoard
        onBetSelect={handleBetSelect}
        selectedBets={selectedBets}
        disabled={gameState.isProcessing || isSpinning}
      />
      <BetControls
        selectedChipValue={selectedChipValue}
        onChipValueChange={setSelectedChipValue}
        selectedBets={selectedBets}
        onClearBets={() => setSelectedBets([])}
        onPlaceBets={handlePlaceBets}
        disabled={gameState.isProcessing || isSpinning}
        maxBets={15}
        balanceData={balanceData}
        gameState={gameState}
        checkAndApproveToken={checkAndApproveToken}
        account={account}
        contracts={contracts}
      />
      <BettingHistory userData={userData} />
    </div>
  );
};

export default RoulettePage;
