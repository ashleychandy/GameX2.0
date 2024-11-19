import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import DiceABI from "./contracts/abi/Dice.json";
import TokenABI from "./contracts/abi/Token.json";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Environment variables
const DICE_CONTRACT_ADDRESS = process.env.REACT_APP_DICE_GAME_ADDRESS;
const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_ADDRESS;
const SUPPORTED_CHAIN_IDS = [80002];
// Add console logs for debugging
console.log("DICE_CONTRACT_ADDRESS:", DICE_CONTRACT_ADDRESS);
console.log("TOKEN_CONTRACT_ADDRESS:", TOKEN_CONTRACT_ADDRESS);

// Enhanced Toast Component
const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed bottom-4 right-4 flex items-center min-w-[300px] p-4 
    rounded-lg shadow-xl transform transition-all duration-300 ease-in-out
    ${
      type === "success"
        ? "bg-success-500"
        : type === "error"
        ? "bg-error-500"
        : "bg-primary-500"
    }
    animate-slide-up z-50`}
  >
    <div className="flex-1 text-white">
      <div className="flex items-center space-x-2">
        {type === "success" && (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {type === "error" && (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        <span className="font-medium">{message}</span>
      </div>
    </div>
    <button
      onClick={onClose}
      className="ml-4 text-white hover:text-gray-200 transition-colors"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
);

// // Number Selector Component with Dice Visual
// const DiceSelector = ({ value, onChange }) => {
//   return (
//     <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 my-6">
//       {[1, 2, 3, 4, 5, 6].map((num) => (
//         <button
//           key={num}
//           onClick={() => onChange(num)}
//           className={`relative group h-16 w-16 rounded-xl transition-all duration-300
//             ${Number(value) === num
//               ? 'bg-primary-500 shadow-glow scale-110'
//               : 'bg-secondary-800 hover:bg-secondary-700'}`}
//         >
//           <div className={`grid grid-cols-3 gap-1 p-2 h-full
//             ${Number(value) === num ? 'dice-face-selected' : 'dice-face'}`}>
//             {[...Array(num)].map((_, i) => (
//               <span key={i} className={`rounded-full
//                 ${Number(value) === num
//                   ? 'bg-white'
//                   : 'bg-secondary-400 group-hover:bg-secondary-300'}
//                 transition-colors duration-300`}
//               />
//             ))}
//           </div>
//           <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2
//             opacity-0 group-hover:opacity-100 transition-opacity duration-200">
//             <span className="text-sm text-primary-400">Select {num}</span>
//           </div>
//         </button>
//       ))}
//     </div>
//   );
// };

// Enhanced Bet Slider with Preset Amounts

const BetInput = ({
  value,
  onChange,
  min = "1",
  userBalance = "0",
  disabled,
}) => {
  const [error, setError] = useState("");
  const [localValue, setLocalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value) {
      setLocalValue(formatDisplayValue(value));
    }
  }, [value]);

  const formatDisplayValue = (weiValue) => {
    try {
      const formatted = ethers.formatEther(weiValue.toString());
      return formatted.replace(/\.?0+$/, "") || "0";
    } catch (error) {
      console.error("Error formatting display value:", error);
      return "0";
    }
  };

  const validateInput = (input) => {
    if (input === "") return true;
    const regex = /^\d*\.?\d{0,18}$/;
    if (!regex.test(input)) return false;
    if (input.startsWith("0") && !input.startsWith("0.")) return false;
    if ((input.match(/\./g) || []).length > 1) return false;
    return true;
  };

  const parseTokenAmount = (amount) => {
    try {
      if (!amount || isNaN(Number(amount))) {
        return BigInt(0);
      }

      const parts = amount.split(".");
      if (parts[1] && parts[1].length > 18) {
        throw new Error("Too many decimal places");
      }

      if (Number(amount) < 0) {
        throw new Error("Negative amount not allowed");
      }

      const weiValue = ethers.parseEther(amount);
      const minValue = BigInt(min);
      const maxValue = BigInt(userBalance);

      if (weiValue < minValue) {
        throw new Error(`Minimum bet is ${formatDisplayValue(minValue)} GameX`);
      }
      if (weiValue > maxValue) {
        throw new Error(`Maximum bet is ${formatDisplayValue(maxValue)} GameX`);
      }

      return weiValue;
    } catch (error) {
      throw error;
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value.trim();

    if (validateInput(inputValue)) {
      setLocalValue(inputValue);
      setError("");

      try {
        if (inputValue === "") {
          onChange(BigInt(min));
          return;
        }

        const weiValue = parseTokenAmount(inputValue);
        onChange(weiValue);
      } catch (error) {
        setError(error.message);
        onChange(BigInt(min));
      }
    }
  };

  const handleQuickAmount = (percentage) => {
    try {
      const balance = BigInt(userBalance);
      const amount = (balance * BigInt(percentage)) / BigInt(100);
      const minValue = BigInt(min);

      if (amount < minValue) {
        setError("Amount too small, using minimum bet");
        onChange(minValue);
        setLocalValue(formatDisplayValue(minValue));
      } else {
        setError("");
        onChange(amount);
        setLocalValue(formatDisplayValue(amount));
      }
    } catch (error) {
      console.error("Error calculating quick amount:", error);
      setError("Error calculating amount");
      onChange(BigInt(min));
      setLocalValue(formatDisplayValue(BigInt(min)));
    }
  };

  const handleAdjustAmount = (increment) => {
    try {
      const currentValue = BigInt(value);
      const balance = BigInt(userBalance);
      const step = balance / BigInt(100); // 1% step
      const minValue = BigInt(min);

      let newValue;
      if (increment) {
        newValue = currentValue + step;
        if (newValue > balance) newValue = balance;
      } else {
        newValue = currentValue - step;
        if (newValue < minValue) newValue = minValue;
      }

      setError("");
      onChange(newValue);
      setLocalValue(formatDisplayValue(newValue));
    } catch (error) {
      console.error("Error adjusting amount:", error);
      setError("Error adjusting amount");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAdjustAmount(false)}
            disabled={disabled || BigInt(value) <= BigInt(min)}
            className="w-10 h-10 rounded-lg bg-secondary-700/50 hover:bg-secondary-600/50 
                     flex items-center justify-center text-secondary-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrease amount"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={localValue}
              onChange={handleInputChange}
              disabled={disabled}
              className="w-full px-4 py-2 bg-secondary-800/50 rounded-lg
                       text-white placeholder-secondary-400 
                       focus:outline-none focus:ring-2 focus:ring-primary-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter bet amount"
            />
            <div
              className="absolute right-3 top-1/2 transform -translate-y-1/2 
                          text-sm text-secondary-400"
            >
              GameX
            </div>
          </div>

          <button
            onClick={() => handleAdjustAmount(true)}
            disabled={disabled || BigInt(value) >= BigInt(userBalance)}
            className="w-10 h-10 rounded-lg bg-secondary-700/50 hover:bg-secondary-600/50 
                     flex items-center justify-center text-secondary-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase amount"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="text-error-500 text-sm animate-fadeIn" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "25%", value: 25 },
          { label: "50%", value: 50 },
          { label: "75%", value: 75 },
          { label: "MAX", value: 100 },
        ].map(({ label, value: percentage }) => (
          <button
            key={percentage}
            onClick={() => handleQuickAmount(percentage)}
            disabled={disabled}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                     bg-secondary-700/50 hover:bg-secondary-600/50 text-secondary-300
                     hover:text-white active:scale-95 disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const NetworkWarning = () => (
  <div className="bg-gaming-error/90 text-white px-4 py-2 text-center">
    <p>Please switch to Amoy Testnet (Chain ID: 80002)</p>
    <button
      onClick={switchToAmoyNetwork}
      className="mt-2 px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
    >
      Switch Network
    </button>
  </div>
);

const switchToAmoyNetwork = async () => {
  if (!window.ethereum) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x13882" }], // 80002 in hex
    });
  } catch (switchError) {
    // If the network is not added to MetaMask, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x13882",
              chainName: "Polygon Amoy Testnet",
              nativeCurrency: {
                name: "MATIC",
                symbol: "MATIC",
                decimals: 18,
              },
              rpcUrls: ["https://rpc-amoy.polygon.technology"],
              blockExplorerUrls: ["https://www.oklink.com/amoy"],
            },
          ],
        });
      } catch (addError) {
        console.error("Error adding network:", addError);
      }
    }
    console.error("Error switching network:", switchError);
  }
};
// Enhanced Loading Spinner Component
const LoadingSpinner = ({ message }) => (
  <div className="flex items-center justify-center space-x-3">
    <div className="relative">
      <div className="w-8 h-8 border-4 border-primary-200 rounded-full"></div>
      <div
        className="absolute top-0 left-0 w-8 h-8 border-4 border-primary-500 rounded-full 
        border-t-transparent animate-spin"
      ></div>
    </div>
    <span className="text-primary-100 font-medium">{message}</span>
  </div>
);

// Enhanced Loading Overlay Component
const LoadingOverlay = ({ message }) => (
  <div
    className="fixed inset-0 bg-secondary-900/80 backdrop-blur-sm flex items-center 
    justify-center z-50 transition-opacity duration-300"
  >
    <div
      className="bg-secondary-800 p-6 rounded-xl shadow-xl border border-secondary-700
      transform transition-all duration-300 ease-out"
    >
      <LoadingSpinner message={message} />
    </div>
  </div>
);

const DiceVisualizer = ({ chosenNumber, isRolling, result }) => {
  const diceVariants = {
    rolling: {
      rotate: [0, 360, 720, 1080],
      transition: {
        duration: 2,
        ease: "easeInOut",
        times: [0, 0.2, 0.5, 1],
      },
    },
    static: {
      rotate: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const dotPositions = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const renderDots = (number) => {
    return Array(9)
      .fill(null)
      .map((_, index) => (
        <div
          key={index}
          className={`w-4 h-4 rounded-full transition-all duration-300
          ${
            dotPositions[number]?.includes(index)
              ? "bg-white scale-100 opacity-100"
              : "bg-transparent scale-0 opacity-0"
          }`}
        />
      ));
  };

  return (
    <div className="relative w-full aspect-square max-w-[300px] mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRolling ? "rolling" : result || chosenNumber}
          variants={diceVariants}
          animate={isRolling ? "rolling" : "static"}
          className="w-full h-full"
        >
          <div className="dice-container relative w-full h-full">
            {/* 3D Dice Face */}
            <div
              className={`
              absolute inset-0 rounded-2xl bg-gaming-primary/20
              backdrop-blur-lg border border-white/20
              shadow-[0_0_15px_rgba(59,130,246,0.5)]
              ${isRolling ? "animate-shake" : ""}
              transform transition-all duration-300
            `}
            >
              <div className="grid grid-cols-3 grid-rows-3 gap-2 p-6 h-full">
                {renderDots(result || chosenNumber || 1)}
              </div>
            </div>

            {/* Reflection Effect */}
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-tr 
              from-white/5 to-transparent pointer-events-none"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Result Overlay */}
      {result && !isRolling && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
        >
          <div
            className={`text-4xl font-bold ${
              result === chosenNumber
                ? "text-gaming-success animate-bounce"
                : "text-gaming-error animate-shake"
            }`}
          >
            {result === chosenNumber ? "WIN!" : "LOSE"}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const NumberSelector = ({ value, onChange, disabled }) => {
  const numbers = [1, 2, 3, 4, 5, 6];

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.05 },
    selected: { scale: 1.1 },
    disabled: { opacity: 0.5, scale: 1 },
  };

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-bold text-white/90">Choose Your Number</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
        {numbers.map((num) => (
          <motion.button
            key={num}
            variants={buttonVariants}
            initial="idle"
            whileHover={disabled ? "disabled" : "hover"}
            animate={
              value === num ? "selected" : disabled ? "disabled" : "idle"
            }
            onClick={() => !disabled && onChange(num)}
            disabled={disabled}
            className={`
              relative group p-4 rounded-xl
              ${
                value === num
                  ? "bg-gaming-primary shadow-neon"
                  : "bg-secondary-800/40 hover:bg-secondary-700/40"
              }
              backdrop-blur-sm border border-white/10
              transition-colors duration-300
            `}
          >
            {/* Number Display */}
            <div className="text-2xl font-bold text-center mb-2">{num}</div>

            {/* Probability Info */}
            <div className="text-xs text-center opacity-75">
              Win: {((1 / 6) * 100).toFixed(1)}%
            </div>

            {/* Selection Indicator */}
            {value === num && (
              <motion.div
                layoutId="selector"
                className="absolute inset-0 rounded-xl border-2 border-gaming-primary"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}

            {/* Hover Effect */}
            <div
              className="absolute inset-0 rounded-xl bg-gaming-primary/10 
              opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          </motion.button>
        ))}
      </div>

      {/* Selected Number Display */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-gaming-primary"
        >
          Selected Number: {value}
        </motion.div>
      )}
    </div>
  );
};

// Loading Dots Component
const LoadingDots = () => (
  <span className="loading-dots">
    <span className="dot">.</span>
    <span className="dot">.</span>
    <span className="dot">.</span>
  </span>
);

const RequestMonitor = ({ diceContract, requestId, onComplete }) => {
  useEffect(() => {
    if (!diceContract || !requestId) return;

    const checkRequest = async () => {
      try {
        const isActive = await diceContract.isRequestActive(requestId);
        if (!isActive) {
          onComplete && onComplete();
          return;
        }
        setTimeout(checkRequest, 2000);
      } catch (error) {
        console.error("Error monitoring request:", error);
      }
    };

    checkRequest();
  }, [diceContract, requestId]);

  return null; // This is a monitoring component, no UI needed
};

// Enhanced Game History Component
const GameHistory = ({ diceContract, account, onError }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [historySize, setHistorySize] = useState(10);
  const [stats, setStats] = useState({
    totalGamesWon: 0,
    totalGamesLost: 0,
  });

  // Filter games based on selected filter
  const filteredGames = useMemo(() => {
    if (filter === "all") return games;
    if (filter === "wins")
      return games.filter((game) => game.chosenNumber === game.rolledNumber);
    if (filter === "losses")
      return games.filter((game) => game.chosenNumber !== game.rolledNumber);
    return games;
  }, [games, filter]);

  // Fetch games and stats
  const fetchGamesAndStats = async () => {
    if (!diceContract || !account) {
      setGames([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [bets, playerStats] = await Promise.all([
        diceContract.getPreviousBets(account),
        diceContract.getPlayerStats(account),
      ]);

      // Process bets into readable format
      const processedGames = bets.map((bet) => ({
        chosenNumber: Number(bet.chosenNumber),
        rolledNumber: Number(bet.rolledNumber),
        amount: bet.amount.toString(),
        timestamp: Number(bet.timestamp),
        isWin: Number(bet.chosenNumber) === Number(bet.rolledNumber),
      }));

      setGames(processedGames);
      setStats({
        totalGamesWon: Number(playerStats.totalGamesWon),
        totalGamesLost: Number(playerStats.totalGamesLost),
      });
    } catch (error) {
      console.error("Error fetching game history:", error);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle history size change
  const handleHistorySizeChange = async (newSize) => {
    try {
      await diceContract.setHistorySize(newSize);
      setHistorySize(newSize);
      await fetchGamesAndStats(); // Refresh data after changing size
    } catch (error) {
      console.error("Error setting history size:", error);
      onError(error);
    }
  };

  useEffect(() => {
    fetchGamesAndStats();
    const interval = setInterval(fetchGamesAndStats, 10000);
    return () => clearInterval(interval);
  }, [diceContract, account]);

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white/90">Game History</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gaming-success">
              Wins: {stats.totalGamesWon}
            </span>
            <span className="mx-2">|</span>
            <span className="text-gaming-error">
              Losses: {stats.totalGamesLost}
            </span>
          </div>
        </div>
      </div>

      {/* History Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary-400">History Size:</span>
        <select
          value={historySize}
          onChange={(e) => handleHistorySizeChange(Number(e.target.value))}
          className="bg-gaming-primary/20 border border-gaming-primary/30 rounded-lg px-2 py-1 text-sm"
        >
          {[5, 10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-lg ${
            filter === "all"
              ? "bg-gaming-primary text-white"
              : "bg-gaming-primary/20 text-gaming-primary"
          } text-sm hover:bg-gaming-primary/30 transition-colors`}
        >
          All Games
        </button>
        <button
          onClick={() => setFilter("wins")}
          className={`px-3 py-1 rounded-lg ${
            filter === "wins"
              ? "bg-gaming-success text-white"
              : "bg-gaming-success/20 text-gaming-success"
          } text-sm hover:bg-gaming-success/30 transition-colors`}
        >
          Wins
        </button>
        <button
          onClick={() => setFilter("losses")}
          className={`px-3 py-1 rounded-lg ${
            filter === "losses"
              ? "bg-gaming-error text-white"
              : "bg-gaming-error/20 text-gaming-error"
          } text-sm hover:bg-gaming-error/30 transition-colors`}
        >
          Losses
        </button>
      </div>

      {/* Game List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-secondary-800/50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-8 text-secondary-400">
          No games found
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {filteredGames.map((game, index) => (
              <GameHistoryItem
                key={`${game.timestamp}-${index}`}
                game={game}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const GameHistoryItem = ({ game, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ delay: index * 0.05 }}
    className={`
      relative p-4 rounded-xl border backdrop-blur-sm
      ${
        game.isWin
          ? "border-gaming-success/20 bg-gaming-success/5"
          : "border-gaming-error/20 bg-gaming-error/5"
      }
      hover:transform hover:scale-[1.02] transition-all duration-300
    `}
  >
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <div className="text-lg font-semibold">
          {ethers.formatEther(game.amount)} GameX
        </div>
        <div className="text-sm text-secondary-400">
          <span
            className={game.isWin ? "text-gaming-success" : "text-gaming-error"}
          >
            {game.isWin ? "Won" : "Lost"}
          </span>
          <span className="mx-2">•</span>
          Rolled: {game.rolledNumber} | Chosen: {game.chosenNumber}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-secondary-400">
          {new Date(game.timestamp * 1000).toLocaleString()}
        </div>
        <div className="text-xs text-secondary-500 mt-1">
          {game.isWin
            ? `Won ${ethers.formatEther(BigInt(game.amount) * 6n)} GameX`
            : "No Payout"}
        </div>
      </div>
    </div>
  </motion.div>
);

// Enhanced GameComponent with better state management and polling
const GameComponent = ({
  diceContract,
  tokenContract,
  account,
  onError,
  addToast,
}) => {
  const [chosenNumber, setChosenNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(BigInt(1e18)); // 1 token default
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState("0");
  const [gameState, setGameState] = useState({
    isActive: false,
    requestId: null,
    status: "PENDING",
    result: null,
    timestamp: 0,
  });

  // Initialize and cleanup game state
  useEffect(() => {
    if (!diceContract || !account) return;

    const init = async () => {
      try {
        await updateGameState();
        await updateBalance();
      } catch (error) {
        console.error("Error initializing game:", error);
        onError(error);
      }
    };

    init();
    const interval = setInterval(init, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [diceContract, account]);

  // Update user balance
  const updateBalance = async () => {
    if (!tokenContract || !account) return;
    try {
      const balance = await tokenContract.balanceOf(account);
      setUserBalance(balance.toString());
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  };

  // Update game state
  const updateGameState = async () => {
    if (!diceContract || !account) return;
    try {
      const [isActive, status, chosenNum, amount, timestamp] =
        await diceContract.getGameStatus(account);

      const [requestId, requestFulfilled, requestActive] =
        await diceContract.getCurrentRequestDetails(account);

      setGameState({
        isActive,
        requestId: requestId.toString(),
        status: [
          "PENDING",
          "STARTED",
          "COMPLETED_WIN",
          "COMPLETED_LOSS",
          "CANCELLED",
        ][status],
        result: status > 1 ? chosenNum : null,
        timestamp: Number(timestamp),
      });

      // Start monitoring if there's an active request
      if (isActive && requestActive && !requestFulfilled) {
        startRequestMonitoring(requestId.toString());
      }
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  // Monitor VRF request
  const startRequestMonitoring = (requestId) => {
    const checkRequest = async () => {
      try {
        const isActive = await diceContract.isRequestActive(requestId);
        if (!isActive) {
          await updateGameState();
          await updateBalance();
          return;
        }
        setTimeout(checkRequest, 2000);
      } catch (error) {
        console.error("Error monitoring request:", error);
      }
    };
    checkRequest();
  };

  // Handle bet placement
  const handleBet = async () => {
    if (!chosenNumber || betAmount <= 0) {
      addToast("Please select a number and bet amount", "error");
      return;
    }

    try {
      setIsLoading(true);

      // Check if user can start new game
      const canStart = await diceContract.canStartNewGame(account);
      if (!canStart) {
        throw new Error("Cannot start new game - active game exists");
      }

      // Check balance
      const balance = await tokenContract.balanceOf(account);
      if (balance < betAmount) {
        throw new Error("Insufficient balance");
      }

      // Check/Request token approval
      const allowance = await tokenContract.allowance(
        account,
        diceContract.address
      );
      if (allowance < betAmount) {
        addToast("Approving tokens...", "info");
        const approveTx = await tokenContract.approve(
          diceContract.address,
          betAmount
        );
        await approveTx.wait();
        addToast("Tokens approved!", "success");
      }

      // Place bet
      addToast("Placing bet...", "info");
      const tx = await diceContract.playDice(chosenNumber, betAmount);
      const receipt = await tx.wait();

      // Find requestId from events
      const requestId = receipt.events
        .find((e) => e.event === "RequestSent")
        ?.args?.requestId.toString();

      setGameState((prev) => ({
        ...prev,
        isActive: true,
        requestId,
        status: "STARTED",
      }));

      addToast("Bet placed! Waiting for result...", "success");
      startRequestMonitoring(requestId);
    } catch (error) {
      console.error("Error placing bet:", error);
      onError(error);
      addToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <NumberSelector
        value={chosenNumber}
        onChange={setChosenNumber}
        disabled={isLoading || gameState.isActive}
      />

      <BetInput
        value={betAmount}
        onChange={setBetAmount}
        min="1"
        userBalance={userBalance}
        disabled={isLoading || gameState.isActive}
      />

      <div className="flex justify-center">
        <button
          onClick={handleBet}
          disabled={
            isLoading || gameState.isActive || !chosenNumber || betAmount <= 0
          }
          className={`
            px-8 py-4 rounded-xl text-lg font-bold
            ${
              isLoading || gameState.isActive
                ? "bg-secondary-700 cursor-not-allowed"
                : "bg-gaming-primary hover:bg-gaming-primary-dark"
            }
            transition-colors duration-200
          `}
        >
          {isLoading
            ? "Processing..."
            : gameState.isActive
            ? "Game in Progress"
            : "Roll Dice"}
        </button>
      </div>

      <DiceVisualizer
        chosenNumber={chosenNumber}
        isRolling={gameState.status === "STARTED"}
        result={gameState.result}
      />

      {/* Game Status */}
      {gameState.isActive && (
        <div className="text-center space-y-2">
          <StatusIndicator
            status={gameState.status}
            isActive={gameState.status === "STARTED"}
          />
          <p className="text-sm text-secondary-400">
            Request ID: {gameState.requestId}
          </p>
        </div>
      )}
    </div>
  );
};

const StatusIndicator = ({ status, isActive }) => (
  <div
    className={`relative flex items-center gap-2 ${
      isActive ? "animate-pulse" : ""
    }`}
  >
    <span
      className={`h-3 w-3 rounded-full ${
        status === "COMPLETED_WIN"
          ? "bg-gaming-success"
          : status === "COMPLETED_LOSS"
          ? "bg-gaming-error"
          : status === "PENDING"
          ? "bg-gaming-warning"
          : "bg-gaming-primary"
      }`}
    />
    <span className="text-sm font-medium">{status.replace("_", " ")}</span>
  </div>
);

// Enhanced GameStatus component
const GameStatus = ({ diceContract, account, onStatusChange, onError }) => {
  const [gameState, setGameState] = useState({
    isActive: false,
    status: "PENDING",
    chosenNumber: 0,
    amount: "0",
    timestamp: 0,
    hasPendingRequest: false,
    result: null,
    payout: "0",
    lastUpdate: Date.now(),
  });

  const [monitoringActive, setMonitoringActive] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!diceContract || !account) return;

    try {
      const [status, hasPending, currentGame] = await Promise.all([
        diceContract.getGameStatus(account),
        diceContract.hasPendingRequest(account),
        diceContract.getCurrentGame(account),
      ]);

      const newStatus = {
        isActive: status.isActive,
        status: getStatusText(status.status),
        chosenNumber: Number(status.chosenNumber),
        amount: status.amount.toString(),
        timestamp: Number(status.timestamp),
        hasPendingRequest: hasPending,
        result: Number(currentGame.result),
        payout: currentGame.payout.toString(),
        lastUpdate: Date.now(),
      };

      if (JSON.stringify(newStatus) !== JSON.stringify(gameState)) {
        setGameState(newStatus);
        onStatusChange?.(newStatus);

        if (isGameCompleted(status.status)) {
          setMonitoringActive(false);
        }
      }
    } catch (error) {
      console.error("Error checking game status:", error);
      onError?.(error);
      setMonitoringActive(false);
    }
  }, [diceContract, account, gameState, onStatusChange, onError]);

  const getStatusText = (statusEnum) =>
    ({
      0: "PENDING",
      1: "STARTED",
      2: "COMPLETED_WIN",
      3: "COMPLETED_LOSS",
      4: "CANCELLED",
    }[statusEnum] || "UNKNOWN");

  const isGameCompleted = (statusEnum) =>
    [2, 3, 4].includes(Number(statusEnum));

  useEffect(() => {
    setMonitoringActive(true);
    setGameState((prev) => ({
      ...prev,
      isActive: false,
      status: "PENDING",
      lastUpdate: Date.now(),
    }));
  }, [account]);

  useEffect(() => {
    if (!monitoringActive) return;

    const checkInterval = async () => {
      await checkStatus();
    };

    checkInterval();
    const interval = setInterval(checkInterval, 3000);

    return () => clearInterval(interval);
  }, [checkStatus, monitoringActive]);

  useEffect(() => {
    if (!diceContract || !account) return;

    const filters = {
      gameStarted: diceContract.filters.GameStarted(account),
      gameCompleted: diceContract.filters.GameCompleted(account),
      gameCancelled: diceContract.filters.GameCancelled(account),
    };

    const handleGameEvent = () => checkStatus();

    Object.values(filters).forEach((filter) => {
      diceContract.on(filter, handleGameEvent);
    });

    return () => {
      Object.values(filters).forEach((filter) => {
        diceContract.off(filter, handleGameEvent);
      });
    };
  }, [diceContract, account, checkStatus]);

  return (
    <div className="glass-panel p-6 rounded-xl space-y-4">
      <h2 className="text-2xl font-bold text-white/90">Current Game Status</h2>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Status"
          value={gameState.status.replace("_", " ")}
          color={
            gameState.status === "COMPLETED_WIN"
              ? "success"
              : gameState.status === "COMPLETED_LOSS"
              ? "error"
              : "primary"
          }
        />
        {gameState.isActive && (
          <>
            <StatCard title="Chosen Number" value={gameState.chosenNumber} />
            <StatCard
              title="Bet Amount"
              value={`${ethers.formatEther(gameState.amount)} GameX`}
            />
            <StatCard
              title="Time"
              value={new Date(gameState.timestamp * 1000).toLocaleString()}
            />
            {gameState.result > 0 && (
              <StatCard
                title="Result"
                value={gameState.result}
                color={
                  gameState.status === "COMPLETED_WIN" ? "success" : "error"
                }
              />
            )}
            {gameState.payout !== "0" && (
              <StatCard
                title="Payout"
                value={`${ethers.formatEther(gameState.payout)} GameX`}
                color="success"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// PlayerStats Component
const PlayerStats = ({ diceContract, account, onError }) => {
  const [stats, setStats] = useState({
    totalGamesWon: 0,
    totalGamesLost: 0,
    previousBets: [],
    winRate: 0,
    averageBet: "0",
    biggestWin: "0",
    totalBets: "0",
    totalWinnings: "0",
    totalLosses: "0",
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!diceContract || !account) return;

      try {
        // Fetch all stats in parallel
        const [playerStats, previousBets, userData] = await Promise.all([
          diceContract.getPlayerStats(account),
          diceContract.getPreviousBets(account),
          diceContract.getUserData(account),
        ]);

        // Calculate derived statistics
        const [totalGamesWon, totalGamesLost] = playerStats;
        const totalGames = totalGamesWon + totalGamesLost;
        const winRate = totalGames > 0 ? (totalGamesWon * 100) / totalGames : 0;

        // Find biggest win from previous bets
        const biggestWin = previousBets.reduce((max, bet) => {
          if (bet.chosenNumber.toString() === bet.rolledNumber.toString()) {
            return bet.amount > max ? bet.amount : max;
          }
          return max;
        }, BigInt(0));

        // Calculate average bet
        const averageBet =
          previousBets.length > 0
            ? (userData.totalBets / BigInt(previousBets.length)).toString()
            : "0";

        setStats({
          totalGamesWon: Number(totalGamesWon),
          totalGamesLost: Number(totalGamesLost),
          previousBets,
          winRate,
          averageBet,
          biggestWin: biggestWin.toString(),
          totalBets: userData.totalBets.toString(),
          totalWinnings: userData.totalWinnings.toString(),
          totalLosses: userData.totalLosses.toString(),
        });
      } catch (error) {
        console.error("Error fetching player stats:", error);
        onError(error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, [diceContract, account]);

  return (
    <div className="glass-panel p-6 rounded-xl">
      <h2 className="text-2xl font-bold text-white/90 mb-6">
        Player Statistics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(2)}%`}
          color={stats.winRate > 50 ? "success" : "primary"}
        />
        <StatCard
          title="Total Games Won"
          value={stats.totalGamesWon}
          color="success"
        />
        <StatCard
          title="Total Games Lost"
          value={stats.totalGamesLost}
          color="error"
        />
        <StatCard
          title="Average Bet"
          value={`${ethers.formatEther(stats.averageBet)} GameX`}
        />
        <StatCard
          title="Biggest Win"
          value={`${ethers.formatEther(stats.biggestWin)} GameX`}
          color="success"
        />
        <StatCard
          title="Total Wagered"
          value={`${ethers.formatEther(stats.totalBets)} GameX`}
        />
      </div>

      {/* Recent Bets History */}
      {stats.previousBets.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white/80 mb-4">
            Recent Bets
          </h3>
          <div className="space-y-2">
            {stats.previousBets.slice(-5).map((bet, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  bet.chosenNumber.toString() === bet.rolledNumber.toString()
                    ? "bg-gaming-success/10 border border-gaming-success/20"
                    : "bg-gaming-error/10 border border-gaming-error/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-secondary-400">
                    {new Date(
                      Number(bet.timestamp) * 1000
                    ).toLocaleTimeString()}
                  </span>
                  <span>
                    Rolled: {bet.rolledNumber.toString()} | Chosen:{" "}
                    {bet.chosenNumber.toString()}
                  </span>
                </div>
                <span className="font-medium">
                  {ethers.formatEther(bet.amount)} GameX
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// AdminPanel Component
const AdminPanel = ({ diceContract, tokenContract, onError }) => {
  const [historySize, setHistorySize] = useState("");
  const [playerAddress, setPlayerAddress] = useState("");

  const handlePause = async () => {
    await diceContract.pause();
  };

  const handleUnpause = async () => {
    await diceContract.unpause();
  };

  const handleSetHistorySize = async () => {
    await diceContract.setHistorySize(historySize);
  };

  const handleRecoverStuckGame = async () => {
    await diceContract.recoverStuckGame(playerAddress);
  };

  const handleForceStopGame = async () => {
    await diceContract.forceStopGame(playerAddress);
  };

  return (
    <div className="admin-panel">
      <h3>Admin Panel</h3>
      <div>
        <button onClick={handlePause}>Pause</button>
        <button onClick={handleUnpause}>Unpause</button>
        <div>
          <input
            type="number"
            value={historySize}
            onChange={(e) => setHistorySize(e.target.value)}
            placeholder="New history size"
          />
          <button onClick={handleSetHistorySize}>Set History Size</button>
        </div>
        <div>
          <input
            type="text"
            value={playerAddress}
            onChange={(e) => setPlayerAddress(e.target.value)}
            placeholder="Player address"
          />
          <button onClick={handleRecoverStuckGame}>Recover Stuck Game</button>
          <button onClick={handleForceStopGame}>Force Stop Game</button>
        </div>
      </div>
    </div>
  );
};

// AdminPage Component
const AdminPage = ({ diceContract, tokenContract, account, onError }) => (
  <div className="admin-page">
    <h2>Admin Dashboard</h2>
    <AdminPanel
      diceContract={diceContract}
      tokenContract={tokenContract}
      onError={onError}
    />
  </div>
);

// Home Component
const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Animated Background */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gaming-primary/20 to-gaming-accent/20" />
        <div className="responsive-container relative z-10 text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-gradient-gaming">
              GameX
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8">
              The Future of Decentralized Gaming
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/dice"
                className="btn-gaming hover:scale-105 transform transition-all"
              >
                Play Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-secondary-900/50">
        <div className="responsive-container">
          <h2 className="text-4xl font-bold text-center mb-16 text-gradient-gaming">
            Why Choose GameToken?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-effect p-6 rounded-xl hover:transform hover:scale-105 
                  transition-all duration-300"
              >
                <div className="text-3xl mb-4 text-gaming-accent">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-primary-100">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games Showcase */}
      <section className="py-20">
        <div className="responsive-container">
          <h2 className="text-4xl font-bold text-center mb-16 text-gradient-gaming">
            Available Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              className="glass-effect rounded-xl p-8 hover:transform hover:scale-105 
              transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-primary-100">
                  Dice Game
                </h3>
                <span
                  className="px-3 py-1 bg-gaming-primary/20 text-gaming-primary 
                  rounded-full text-sm"
                >
                  Live
                </span>
              </div>
              <p className="text-gray-400 mb-6">
                Test your luck with our provably fair dice game. Roll to win up
                to 6x your stake!
              </p>
              <Link to="/dice" className="btn-gaming inline-block">
                Play Now
              </Link>
            </div>
            <div
              className="glass-effect rounded-xl p-8 hover:transform hover:scale-105 
              transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-primary-100">
                  Coming Soon
                </h3>
                <span
                  className="px-3 py-1 bg-gaming-accent/20 text-gaming-accent 
                  rounded-full text-sm"
                >
                  Soon
                </span>
              </div>
              <div className="space-y-4 text-gray-400">
                <p>More exciting games are on the way:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Coin Flip</li>
                  <li>Lottery</li>
                  <li>Card Games</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Steps */}
      <section className="py-20 bg-secondary-900/50">
        <div className="responsive-container">
          <h2 className="text-4xl font-bold text-center mb-16 text-gradient-gaming">
            Get Started
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="glass-effect p-8 rounded-xl relative">
                <div
                  className="absolute -top-6 -left-6 w-12 h-12 rounded-full 
                  bg-gaming-primary flex items-center justify-center text-2xl font-bold"
                >
                  {index + 1}
                </div>
                <h3 className="text-xl font-bold mb-4 text-primary-100">
                  {step.title}
                </h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Data arrays for features and steps
const features = [
  {
    icon: "🔒",
    title: "Secure & Transparent",
    description: "Built on Ethereum blockchain with verifiable smart contracts",
  },
  {
    icon: "⚡",
    title: "Instant Settlements",
    description: "Immediate payouts and game resolutions",
  },
  {
    icon: "🎮",
    title: "Fair Gaming",
    description: "Provably fair mechanics using Chainlink VRF",
  },
];

const steps = [
  {
    title: "Connect Wallet",
    description: "Connect your MetaMask or any Web3 wallet to get started",
  },
  {
    title: "Get GameX",
    description: "Purchase GameX tokens directly through our platform",
  },
  {
    title: "Start Playing",
    description: "Choose your game and start your winning journey",
  },
];

// New Game Statistics Panel
const GameStats = ({ diceContract, account }) => {
  const [stats, setStats] = useState({
    totalGames: 0,
    totalBets: "0",
    totalWinnings: "0",
    totalLosses: "0",
    winRate: 0,
    biggestWin: "0",
    lastPlayed: 0,
    recentResults: []
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!diceContract || !account) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user data from contract
        const [gameData, previousBets] = await Promise.all([
          diceContract.getUserData(account),
          diceContract.getPreviousBets(account)
        ]);

        // Calculate win rate
        const gamesWon = previousBets.filter(
          bet => bet.chosenNumber.toString() === bet.rolledNumber.toString()
        ).length;
        const winRate = previousBets.length > 0 
          ? (gamesWon / previousBets.length) * 100 
          : 0;

        // Find biggest win
        const biggestWin = previousBets.reduce((max, bet) => {
          if (bet.chosenNumber.toString() === bet.rolledNumber.toString()) {
            return bet.amount > max ? bet.amount : max;
          }
          return max;
        }, BigInt(0));

        setStats({
          totalGames: Number(gameData.totalGames),
          totalBets: gameData.totalBets.toString(),
          totalWinnings: gameData.totalWinnings.toString(),
          totalLosses: gameData.totalLosses.toString(),
          winRate: Number(winRate.toFixed(2)),
          biggestWin: biggestWin.toString(),
          lastPlayed: Number(gameData.lastPlayed),
          recentResults: previousBets.slice(-5).reverse() // Get last 5 results
        });
      } catch (error) {
        console.error("Error fetching game stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [diceContract, account]);

  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-xl animate-pulse">
        <div className="h-48 bg-secondary-800/50 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-xl space-y-6">
      <h2 className="text-2xl font-bold text-white/90">Game Statistics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Main Stats */}
        <StatCard
          title="Total Games"
          value={stats.totalGames.toLocaleString()}
          icon="🎲"
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          icon="📈"
          color={stats.winRate > 50 ? "success" : "primary"}
        />
        <StatCard
          title="Total Wagered"
          value={`${ethers.formatEther(stats.totalBets)} GameX`}
          icon="💰"
        />
        <StatCard
          title="Biggest Win"
          value={`${ethers.formatEther(stats.biggestWin)} GameX`}
          icon="🏆"
          color="success"
        />
      </div>

      {/* Profit/Loss Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Winnings"
          value={`${ethers.formatEther(stats.totalWinnings)} GameX`}
          icon="✨"
          color="success"
        />
        <StatCard
          title="Total Losses"
          value={`${ethers.formatEther(stats.totalLosses)} GameX`}
          icon="📉"
          color="error"
        />
      </div>

      {/* Recent Results */}
      {stats.recentResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white/80">Recent Results</h3>
          <div className="grid gap-2">
            {stats.recentResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg
                  ${
                    result.chosenNumber.toString() === result.rolledNumber.toString()
                      ? "bg-gaming-success/10 border border-gaming-success/20"
                      : "bg-gaming-error/10 border border-gaming-error/20"
                  }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-secondary-400">
                    {new Date(Number(result.timestamp) * 1000).toLocaleTimeString()}
                  </span>
                  <span>
                    Rolled: {result.rolledNumber.toString()} | 
                    Chosen: {result.chosenNumber.toString()}
                  </span>
                </div>
                <span className="font-medium">
                  {ethers.formatEther(result.amount)} GameX
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Played */}
      {stats.lastPlayed > 0 && (
        <div className="text-sm text-secondary-400 text-right">
          Last played: {new Date(stats.lastPlayed * 1000).toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Helper StatCard component (can be moved to a separate file)
const StatCard = ({ title, value, icon, color = "primary" }) => (
  <div
    className={`
      p-4 rounded-xl border backdrop-blur-sm
      ${
        color === "success"
          ? "border-gaming-success/20 bg-gaming-success/5"
          : color === "error"
          ? "border-gaming-error/20 bg-gaming-error/5"
          : "border-gaming-primary/20 bg-gaming-primary/5"
      }
    `}
  >
    <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm text-secondary-400">{title}</span>
    </div>
    <div className="text-lg font-bold">
      <span
        className={
          color === "success"
            ? "text-gaming-success"
            : color === "error"
            ? "text-gaming-error"
            : "text-gaming-primary"
        }
      >
        {value}
      </span>
    </div>
  </div>
);


// New Game Controls Component
const GameControls = ({ 
  diceContract, 
  tokenContract, 
  account, 
  chosenNumber, 
  betAmount, 
  isRolling,
  onError,
  addToast,
  disabled
}) => {
  const [gameState, setGameState] = useState({
    canPlay: false,
    isProcessing: false,
    requestId: null,
    needsResolution: false
  });

  // Check if player can start a new game
  useEffect(() => {
    const checkGameState = async () => {
      if (!diceContract || !account) return;

      try {
        const [canStart, currentRequest] = await Promise.all([
          diceContract.canStartNewGame(account),
          diceContract.getCurrentRequestDetails(account)
        ]);

        setGameState(prev => ({
          ...prev,
          canPlay: canStart,
          needsResolution: currentRequest.requestFulfilled && !currentRequest.requestActive,
          requestId: currentRequest.requestId
        }));
      } catch (error) {
        console.error("Error checking game state:", error);
        onError(error);
      }
    };

    checkGameState();
    const interval = setInterval(checkGameState, 5000);
    return () => clearInterval(interval);
  }, [diceContract, account]);

  // Handle placing bet
  const handleRoll = async () => {
    if (!diceContract || !account || !chosenNumber || !betAmount) return;

    try {
      setGameState(prev => ({ ...prev, isProcessing: true }));
      addToast("Initiating game...", "info");

      // Check allowance and approve if needed
      const allowance = await tokenContract.allowance(account, diceContract.address);
      if (allowance < betAmount) {
        addToast("Approving tokens...", "info");
        const approveTx = await tokenContract.approve(diceContract.address, betAmount);
        await approveTx.wait();
        addToast("Tokens approved!", "success");
      }

      // Place bet
      addToast("Placing bet...", "info");
      const tx = await diceContract.playDice(chosenNumber, betAmount);
      const receipt = await tx.wait();

      // Find requestId from events
      const requestId = receipt.events
        .find(e => e.event === "RequestSent")
        ?.args?.requestId.toString();

      if (requestId) {
        setGameState(prev => ({ 
          ...prev, 
          requestId,
          isProcessing: false,
          canPlay: false 
        }));
        addToast("Bet placed! Waiting for result...", "success");
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      onError(error);
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Handle resolving game
  const handleResolve = async () => {
    if (!diceContract || !account) return;

    try {
      setGameState(prev => ({ ...prev, isProcessing: true }));
      addToast("Resolving game...", "info");

      const tx = await diceContract.resolveGame();
      await tx.wait();

      setGameState(prev => ({ 
        ...prev, 
        isProcessing: false,
        needsResolution: false,
        requestId: null
      }));
      addToast("Game resolved!", "success");
    } catch (error) {
      console.error("Error resolving game:", error);
      onError(error);
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Game Status */}
      {gameState.requestId && (
        <div className="text-sm text-secondary-400">
          Request ID: {gameState.requestId}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {gameState.needsResolution ? (
          <button
            onClick={handleResolve}
            disabled={gameState.isProcessing}
            className={`
              px-8 py-4 rounded-xl font-bold text-lg
              ${gameState.isProcessing
                ? "bg-secondary-700 cursor-not-allowed opacity-50"
                : "bg-gaming-success hover:bg-gaming-success/80"}
              transition-all duration-300 transform hover:scale-105
            `}
          >
            {gameState.isProcessing ? (
              <div className="flex items-center space-x-2">
                <span>Resolving</span>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              </div>
            ) : (
              "Resolve Game"
            )}
          </button>
        ) : (
          <button
            onClick={handleRoll}
            disabled={
              disabled ||
              gameState.isProcessing ||
              !gameState.canPlay ||
              !chosenNumber ||
              !betAmount
            }
            className={`
              px-8 py-4 rounded-xl font-bold text-lg
              ${disabled || gameState.isProcessing || !gameState.canPlay
                ? "bg-secondary-700 cursor-not-allowed opacity-50"
                : "bg-gaming-primary hover:bg-gaming-primary/80"}
              transition-all duration-300 transform hover:scale-105
            `}
          >
            {gameState.isProcessing ? (
              <div className="flex items-center space-x-2">
                <span>Rolling</span>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              </div>
            ) : (
              "Roll Dice"
            )}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {!gameState.canPlay && !gameState.needsResolution && (
        <p className="text-error-400 text-sm">
          {!account
            ? "Please connect your wallet"
            : !chosenNumber
            ? "Please select a number"
            : !betAmount
            ? "Please enter bet amount"
            : "Game in progress"}
        </p>
      )}
    </div>
  );
};

// Define Navbar component at the top of the file, before the App component
const Navbar = ({ account, connectWallet, loadingStates, isAdmin }) => (
  <nav className="glass-effect sticky top-0 z-50 border-b border-secondary-700/50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-20">
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-2xl font-bold text-gaming-primary">
            GameX
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/dice" className="nav-link">
              Play Dice
            </Link>
            {isAdmin && (
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {account ? (
            <div className="glass-effect px-6 py-3 rounded-lg text-sm">
              <span className="text-primary-400">Connected:</span>{" "}
              <span className="text-secondary-300">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="btn-gaming"
              disabled={loadingStates.wallet}
            >
              {loadingStates.wallet ? (
                <span className="flex items-center">
                  Connecting
                  <LoadingDots />
                </span>
              ) : (
                "Connect Wallet"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  </nav>
);

// Main App Component
function App() {
  // State Management
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({
    dice: null,
    token: null,
  });
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [loadingStates, setLoadingStates] = useState({
    provider: true,
    contracts: true,
    gameData: true,
    wallet: false,
    transaction: false,
  });
  const [loadingMessage, setLoadingMessage] = useState("");

  // Enhanced Error Handling
  const handleError = useCallback((error, context = "") => {
    console.error(`Error in ${context}:`, error);
    let errorMessage = "An unknown error occurred";

    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user";
    } else if (error.code === -32603) {
      errorMessage =
        "Internal JSON-RPC error. Please check your wallet connection.";
    } else if (error.message?.includes("insufficient funds")) {
      errorMessage = "Insufficient token balance for this operation";
    } else if (error.message?.includes("ERC20: insufficient allowance")) {
      errorMessage = "Please approve token usage before proceeding";
    } else if (error.message?.includes("user rejected")) {
      errorMessage = "Action cancelled by user";
    } else if (error.message) {
      errorMessage = error.message;
    }

    setError(errorMessage);
    addToast(errorMessage, "error");
  }, []);

  // Network Validation
  const validateNetwork = useCallback(async (provider) => {
  try {
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId); // Ensure it's a number
    setChainId(currentChainId);

    if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
      throw new Error("Please switch to Amoy Testnet (Chain ID: 80002)");
    }

    return currentChainId;
  } catch (error) {
    throw error;
  }
}, []);

// Update the handleChainChanged function
const handleChainChanged = async (newChainId) => {
  const chainIdDec = parseInt(newChainId, 16);
  setChainId(chainIdDec);

  if (!SUPPORTED_CHAIN_IDS.includes(chainIdDec)) {
    addToast("Please switch to Amoy Testnet (Chain ID: 80002)", "error");
    await switchToAmoyNetwork();
    return;
  }

  window.location.reload();
};
  // Contract Initialization
  const initializeContracts = useCallback(
    async (signer, chainId) => {
      try {
        if (!DICE_CONTRACT_ADDRESS || !TOKEN_CONTRACT_ADDRESS) {
          throw new Error(
            "Contract addresses not found in environment variables"
          );
        }

        const diceContract = new ethers.Contract(
          DICE_CONTRACT_ADDRESS,
          DiceABI.abi,
          signer
        );
        const tokenContract = new ethers.Contract(
          TOKEN_CONTRACT_ADDRESS,
          TokenABI.abi,
          signer
        );

        setContracts({
          dice: diceContract,
          token: tokenContract,
        });

        return { diceContract, tokenContract };
      } catch (err) {
        handleError(err, "initializeContracts");
        return null;
      }
    },
    [handleError]
  );

  // Wallet Connection
  const connectWallet = async () => {
    setLoadingStates((prev) => ({ ...prev, wallet: true }));
    setLoadingMessage("Connecting to wallet...");

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await validateNetwork(provider);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const signer = await provider.getSigner();
      setProvider(provider);
      setSigner(signer);

      const contractsData = await initializeContracts(signer);
      if (!contractsData) {
        throw new Error("Failed to initialize contracts");
      }

      await handleAccountsChanged(accounts);
      addToast("Wallet connected successfully!", "success");
    } catch (err) {
      handleError(err, "connectWallet");
    } finally {
      setLoadingStates((prev) => ({ ...prev, wallet: false }));
      setLoadingMessage("");
    }
  };

  // Account Change Handler
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setAccount("");
      setIsAdmin(false);
      addToast("Please connect your wallet", "warning");
    } else {
      const newAccount = accounts[0];
      setAccount(newAccount);

      if (contracts.token) {
        try {
          const ADMIN_ROLE = await contracts.token.DEFAULT_ADMIN_ROLE();
          const hasRole = await contracts.token.hasRole(ADMIN_ROLE, newAccount);
          setIsAdmin(hasRole);
        } catch (err) {
          console.error("Error checking admin status:", err);
          setIsAdmin(false);
        }
      }
    }
  };

  // Network Change Handler
  

  // Toast Management
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Initialization Effect
  useEffect(() => {
    const init = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const chainId = await validateNetwork(provider);
          const signer = await provider.getSigner();

          setProvider(provider);
          setSigner(signer);

          const contractsData = await initializeContracts(signer, chainId);
          if (!contractsData) return;

          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts.length > 0) {
            await handleAccountsChanged(accounts);
          }
        }
      } catch (err) {
        handleError(err, "initialization");
      } finally {
        setLoadingStates({
          provider: false,
          contracts: false,
          gameData: false,
          wallet: false,
          transaction: false,
        });
      }
    };

    init();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [handleError, initializeContracts, validateNetwork]);

  // Loading State Check
  if (Object.values(loadingStates).some((state) => state)) {
    return <LoadingOverlay message={loadingMessage} />;
  }

  // Error State Check
  if (error) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <div className="card border-error-500 p-8 max-w-md w-full">
          <h2 className="text-2xl font-display text-error-500 mb-4">Error</h2>
          <p className="text-secondary-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-error w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-secondary-900">
        {/* Network Warning */}
        {chainId && !SUPPORTED_CHAIN_IDS.includes(chainId) && (
          <NetworkWarning supportedNetworks={SUPPORTED_CHAIN_IDS} />
        )}

        {/* Loading Overlay */}
        {Object.values(loadingStates).some((state) => state) && (
          <LoadingOverlay message={loadingMessage} />
        )}

        <Navbar
          account={account}
          chainId={chainId}
          connectWallet={connectWallet}
          isAdmin={isAdmin}
        />

        <main className="responsive-container py-12 space-y-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/dice"
              element={
                <div className="space-y-12">
                  <GameComponent
                    diceContract={contracts.dice}
                    tokenContract={contracts.token}
                    account={account}
                    onError={handleError}
                    addToast={addToast}
                    setLoadingStates={setLoadingStates}
                    setLoadingMessage={setLoadingMessage}
                  />
                  <GameStatus
                    diceContract={contracts.dice}
                    account={account}
                    onError={handleError}
                    addToast={addToast}
                  />
                  <div className="grid md:grid-cols-2 gap-12">
                    <PlayerStats
                      diceContract={contracts.dice}
                      account={account}
                      onError={handleError}
                    />
                    <GameHistory
                      diceContract={contracts.dice}
                      account={account}
                      onError={handleError}
                    />
                  </div>
                </div>
              }
            />
            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <AdminPage
                    diceContract={contracts.dice}
                    tokenContract={contracts.token}
                    account={account}
                    onError={handleError}
                    addToast={addToast}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </main>

        {/* Toasts */}
        <AnimatePresence>
          <div className="fixed bottom-4 right-4 space-y-2 z-50">
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <Toast
                  message={toast.message}
                  type={toast.type}
                  onClose={() => removeToast(toast.id)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;
