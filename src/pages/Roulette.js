import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { Link } from "react-router-dom";

// Constants for bet types matching contract enum
const BetTypes = {
  STRAIGHT: 0,
  DOZEN: 1,
  COLUMN: 2,
  RED: 3,
  BLACK: 4,
  EVEN: 5,
  ODD: 6,
  LOW: 7,
  HIGH: 8,
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
    start >= 1 && start <= 3 && sorted.every((num, i) => num === start + i * 3)
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

// Add contract constants to match RouletteV2.sol
const CONTRACT_CONSTANTS = {
  MAX_BETS_PER_SPIN: 15,
  MAX_BET_AMOUNT: BigInt("100000000000000000000000"), // 100k tokens
  MAX_TOTAL_BET_AMOUNT: BigInt("500000000000000000000000"), // 500k tokens
  MAX_POSSIBLE_PAYOUT: BigInt("18000000000000000000000000"), // 18M tokens
};

// Update CHIP_VALUES to ensure they don't exceed contract limits
const CHIP_VALUES = [
  { value: ethers.parseEther("100"), label: "100", color: "#FF6B6B" },
  { value: ethers.parseEther("500"), label: "500", color: "#4ECDC4" },
  { value: ethers.parseEther("1000"), label: "1000", color: "#45B7D1" },
].filter((chip) => BigInt(chip.value) <= CONTRACT_CONSTANTS.MAX_BET_AMOUNT);

// Enhanced RouletteWheel Component
const RouletteWheel = ({ isSpinning, winningNumber }) => {
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  const radius = 160; // Radius for number positioning

  return (
    <div className="roulette-wheel">
      <div className="wheel-outer-ring" />
      <div className="wheel-inner-ring" />
      <motion.div
        animate={
          isSpinning
            ? {
                rotate: [0, 1800 + winningNumber * (360 / 37)],
              }
            : {}
        }
        transition={{
          duration: 5,
          ease: [0.32, 0, 0.67, 1],
          times: [0, 1],
        }}
        className="wheel-segments-container"
      >
        {Array.from({ length: 37 }).map((_, i) => {
          const angle = (i * 360) / 37;
          const numberAngle = angle + 360 / 74; // Center number in segment
          const x = radius * Math.cos((numberAngle * Math.PI) / 180);
          const y = radius * Math.sin((numberAngle * Math.PI) / 180);

          return (
            <div
              key={i}
              className={`wheel-segment ${
                i === 0
                  ? "wheel-segment-green"
                  : redNumbers.includes(i)
                  ? "wheel-segment-red"
                  : "wheel-segment-black"
              }`}
              style={{
                transform: `rotate(${angle}deg)`,
                clipPath: "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)",
              }}
            >
              <div
                className="wheel-number"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  "--number-rotation": `-${angle}deg`,
                }}
              >
                {i}
              </div>
            </div>
          );
        })}
      </motion.div>

      <div className="wheel-center">
        <div className="wheel-center-inner" />
      </div>

      {winningNumber !== null && (
        <motion.div
          className="roulette-ball"
          animate={{
            x: [
              0,
              Math.cos(winningNumber * (360 / 37) * (Math.PI / 180)) * 140,
            ],
            y: [
              0,
              Math.sin(winningNumber * (360 / 37) * (Math.PI / 180)) * 140,
            ],
          }}
          transition={{
            duration: 5,
            ease: [0.32, 0, 0.67, 1],
          }}
        />
      )}
    </div>
  );
};

// Enhanced BettingBoard Component
const BettingBoard = ({ onBetSelect, selectedBets, disabled }) => {
  // Numbers should be laid out in 3 rows, 12 columns
  const gridNumbers = [
    // Row 1 (top)
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    // Row 2 (middle)
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    // Row 3 (bottom)
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
  ];

  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
  ];

  return (
    <div className="space-y-4">
      {/* Main Grid */}
      <div className="grid grid-cols-14 gap-1">
        {/* Zero */}
        <button
          onClick={() => onBetSelect({ numbers: [0], type: BetTypes.STRAIGHT })}
          className={`
            col-span-1 row-span-3 
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            number-button-green
          `}
        >
          0
        </button>

        {/* Numbers 1-36 Grid */}
        <div className="col-span-12 grid grid-rows-3 gap-1">
          {gridNumbers.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="grid grid-cols-12 gap-1">
              {row.map((number) => (
                <button
                  key={number}
                  onClick={() => onBetSelect({ numbers: [number], type: BetTypes.STRAIGHT })}
                  className={`
                    aspect-square rounded-lg flex items-center justify-center font-bold
                    ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gaming-primary/20"}
                    ${redNumbers.includes(number) ? "bg-red-600/30 text-red-400" : "bg-gray-900/40 text-gray-300"}
                  `}
                >
                  {number}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* 2:1 Column Bets */}
        <div className="col-span-1 grid grid-rows-3 gap-1">
          {[1, 2, 3].map((column) => (
            <button
              key={`2to1-${column}`}
              onClick={() => onBetSelect({
                numbers: Array.from({ length: 12 }, (_, i) => i * 3 + column),
                type: BetTypes.COLUMN
              })}
              className="bg-secondary-700/50 text-secondary-300 rounded-lg
                       flex items-center justify-center font-bold
                       hover:bg-gaming-primary/20"
            >
              2:1
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Bets */}
      <div className="grid grid-cols-3 gap-1">
        {/* Dozen Bets */}
        <button
          onClick={() => onBetSelect({
            numbers: Array.from({ length: 12 }, (_, i) => i + 1),
            type: BetTypes.DOZEN
          })}
          className="outside-bet"
        >
          1 to 12
        </button>
        <button
          onClick={() => onBetSelect({
            numbers: Array.from({ length: 12 }, (_, i) => i + 13),
            type: BetTypes.DOZEN
          })}
          className="outside-bet"
        >
          13 to 24
        </button>
        <button
          onClick={() => onBetSelect({
            numbers: Array.from({ length: 12 }, (_, i) => i + 25),
            type: BetTypes.DOZEN
          })}
          className="outside-bet"
        >
          25 to 36
        </button>
      </div>

      {/* Outside Bets */}
      <div className="grid grid-cols-6 gap-1">
        <button
          onClick={() => onBetSelect({ numbers: [], type: BetTypes.LOW })}
          className="outside-bet"
        >
          1 to 18
        </button>
        <button
          onClick={() => onBetSelect({ numbers: [], type: BetTypes.EVEN })}
          className="outside-bet"
        >
          Even
        </button>
        <button
          onClick={() => onBetSelect({ numbers: [], type: BetTypes.RED })}
          className="outside-bet text-red-400"
        >
          Red
        </button>
        <button
          onClick={() => onBetSelect({ numbers: [], type: BetTypes.BLACK })}
          className="outside-bet"
        >
          Black
        </button>
        <button
          onClick={() => onBetSelect({ numbers: [], type: BetTypes.ODD })}
          className="outside-bet"
        >
          Odd
        </button>
        <button
          onClick={() => onBetSelect({ numbers: [], type: BetTypes.HIGH })}
          className="outside-bet"
        >
          19 to 36
        </button>
      </div>
    </div>
  );
};

// Add CSS for bet position indicators
const styles = `
  /* Remove unused bet position styles */
  .split-bet,
  .street-bet,
  .corner-bet,
  .sixline-bet {
    display: none;
  }

  /* Keep other styles ... */
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

  // Add validation for contract limits
  const exceedsMaxBets =
    selectedBets.length > CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN;
  const exceedsMaxTotalAmount =
    totalBetAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT;
  const hasInvalidBetAmount = selectedBets.some(
    (bet) => BigInt(bet.amount) > CONTRACT_CONSTANTS.MAX_BET_AMOUNT
  );

  const needsApproval = balanceData?.allowance < totalBetAmount;
  const insufficientBalance = balanceData?.balance < totalBetAmount;

  // Update error message handling
  const getErrorMessage = () => {
    if (exceedsMaxBets)
      return `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets per spin`;
    if (exceedsMaxTotalAmount) return "Total bet amount exceeds maximum";
    if (hasInvalidBetAmount) return "Individual bet amount exceeds maximum";
    if (insufficientBalance) return "Insufficient balance";
    if (needsApproval) return "Approval required";
    return null;
  };

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
    <div className="controls-panel">
      <div className="flex items-center justify-between">
        <div className="chip-selector">
          {CHIP_VALUES.map((chip) => (
            <button
              key={chip.label}
              onClick={() => onChipValueChange(chip.value)}
              className={`
                chip-button
                ${
                  selectedChipValue === chip.value ? "chip-button-selected" : ""
                }
                ${
                  BigInt(chip.value) > CONTRACT_CONSTANTS.MAX_BET_AMOUNT
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }
              `}
              disabled={
                disabled ||
                BigInt(chip.value) > CONTRACT_CONSTANTS.MAX_BET_AMOUNT
              }
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
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
              isApproving ||
              exceedsMaxBets ||
              exceedsMaxTotalAmount ||
              hasInvalidBetAmount
            }
            className={`
              px-6 py-2 rounded-lg font-bold
              ${
                disabled ||
                selectedBets.length === 0 ||
                needsApproval ||
                insufficientBalance ||
                isApproving ||
                exceedsMaxBets ||
                exceedsMaxTotalAmount ||
                hasInvalidBetAmount
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
            ) : (
              getErrorMessage() || "Place Bets & Spin"
            )}
          </button>
        </div>
      </div>

      {/* Enhanced stats display */}
      <div className="flex justify-between text-sm">
        <div className="text-secondary-400">
          Selected Bets:{" "}
          <span className="text-white font-bold">{selectedBets.length}</span>
          <span className="text-secondary-600">
            {" "}
            / {CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN}
          </span>
        </div>
        <div className="text-secondary-400">
          Balance:{" "}
          <span className="text-white font-bold">
            {formatBalance(balanceData?.balance)}
          </span>
          {totalBetAmount > 0 && (
            <span
              className={`ml-2 ${
                exceedsMaxTotalAmount ? "text-red-500" : "text-gaming-primary"
              }`}
            >
              (Bet: {formatBalance(totalBetAmount)})
            </span>
          )}
        </div>
      </div>

      {/* Error message display */}
      {getErrorMessage() && (
        <div className="mt-2 text-sm text-red-500">{getErrorMessage()}</div>
      )}
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
    if (
      typeof bet.betType !== "number" ||
      bet.betType < 0 ||
      bet.betType > 12
    ) {
      console.error("Invalid bet type:", bet.betType);
      return false;
    }

    // For outside bets (RED, BLACK, etc), numbers array should be empty
    if (
      [7, 8, 9, 10, 11, 12].includes(bet.betType) &&
      betNumbers.length !== 0
    ) {
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
      return parseFloat(formatted)
        .toFixed(4)
        .replace(/\.?0+$/, "");
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
      [BetTypes.HIGH]: "High (19-36)",
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
            {[...userData.betHistory].reverse().map((bet, index) => {
              const safeBet = {
                ...bet,
                numbers: Array.isArray(bet.numbers) ? [...bet.numbers] : [],
                betType: Number(bet.betType || 0),
                amount: bet.amount || "0",
                payout: bet.payout || "0",
                timestamp: Number(bet.timestamp || 0),
                winningNumber: Number(bet.winningNumber || 0),
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
                    {safeBet.numbers.length > 0
                      ? safeBet.numbers.join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-2">{formatAmount(safeBet.amount)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        safeBet.winningNumber === 0
                          ? "text-green-600"
                          : BigInt(safeBet.payout) > 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {safeBet.winningNumber}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        BigInt(safeBet.payout) > 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
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
      const betNumbers = isOutsideBet
        ? []
        : [...bet.numbers].sort((a, b) => a - b);

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
      const betRequests = selectedBets.map((bet) => ({
        numbers:
          bet.type >= BetTypes.RED
            ? []
            : [...bet.numbers].sort((a, b) => a - b),
        amount: BigInt(bet.amount.toString()),
        betType: bet.type,
      }));

      // Validate all bets before sending
      if (
        !betRequests.every((request) =>
          validateBet(request.numbers, request.betType)
        )
      ) {
        throw new Error("Invalid bet configuration detected");
      }

      // Send transaction using new contract method
      const tx = await contracts.roulette.placeBet(betRequests);
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
      const errorMessage = error.message?.toLowerCase() || "";
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
