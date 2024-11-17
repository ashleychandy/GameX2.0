import React, { useState, useEffect, useMemo } from "react";
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
const BetInput = ({ value, onChange, min = "1", userBalance = "0", disabled }) => {
  const formatDisplayValue = (val) => {
    try {
      // Safely handle BigInt conversion and division
      const actualAmount = val / BigInt(1e18);
      return actualAmount.toString();
    } catch (error) {
      console.error("Error formatting display value:", error);
      return "0";
    }
  };

  const handleInputChange = (e) => {
    try {
      // Remove commas and non-digits
      const inputValue = e.target.value.replace(/[^\d]/g, '');
      if (!inputValue) {
        onChange(BigInt(min));
        return;
      }
      
      // Safely convert to wei (multiply by 1e18)
      const weiValue = BigInt(inputValue) * BigInt(1e18);
      
      // Validate against min and max values
      const minValue = BigInt(min);
      const maxValue = BigInt(userBalance);
      
      if (weiValue < minValue) {
        onChange(minValue);
      } else if (weiValue > maxValue) {
        onChange(maxValue);
      } else {
        onChange(weiValue);
      }
    } catch (error) {
      console.error("Error converting input value:", error);
      onChange(BigInt(min));
    }
  };

  const handleQuickAmount = (percentage) => {
    try {
      const balance = BigInt(userBalance);
      const amount = (balance * BigInt(percentage)) / BigInt(100);
      const minValue = BigInt(min);
      
      if (amount < minValue) {
        onChange(minValue);
      } else if (amount > balance) {
        onChange(balance);
      } else {
        onChange(amount);
      }
    } catch (error) {
      console.error("Error calculating quick amount:", error);
      onChange(BigInt(min));
    }
  };

  return (
    <div className="glass-effect p-8 rounded-xl space-y-6">
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-secondary-400">Bet Amount</label>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              try {
                const currentValue = BigInt(value);
                const minValue = BigInt(min);
                const decrement = BigInt(userBalance) / BigInt(100);
                const newValue = currentValue - decrement;
                onChange(newValue >= minValue ? newValue : minValue);
              } catch (error) {
                console.error("Error handling decrement:", error);
              }
            }}
            disabled={disabled || BigInt(value) <= BigInt(min)}
            className="w-10 h-10 rounded-lg bg-secondary-700/50 hover:bg-secondary-600/50 
                     flex items-center justify-center text-secondary-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={formatDisplayValue(value)}
              onChange={handleInputChange}
              disabled={disabled}
              className="w-full text-right bg-secondary-800/50 text-2xl font-bold 
                       text-primary-400 rounded-lg px-4 py-2
                       focus:outline-none focus:ring-2 focus:ring-gaming-primary
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-secondary-400">
              GameX
            </span>
          </div>

          <button
            onClick={() => {
              try {
                const currentValue = BigInt(value);
                const balance = BigInt(userBalance);
                const increment = balance / BigInt(100);
                const newValue = currentValue + increment;
                onChange(newValue <= balance ? newValue : balance);
              } catch (error) {
                console.error("Error handling increment:", error);
              }
            }}
            disabled={disabled || BigInt(value) >= BigInt(userBalance)}
            className="w-10 h-10 rounded-lg bg-secondary-700/50 hover:bg-secondary-600/50 
                     flex items-center justify-center text-secondary-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "25%", value: 25 },
          { label: "50%", value: 50 },
          { label: "75%", value: 75 },
          { label: "MAX", value: 100 }
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

      <div className="text-xs text-secondary-400 flex justify-between">
        <span>Min: {formatDisplayValue(min)} GameX</span>
        <span>Balance: {formatDisplayValue(userBalance)} GameX</span>
      </div>
    </div>
  );
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
  <span className="flex items-center">
    <span className="dot bg-primary-500"></span>
    <span className="dot bg-primary-500"></span>
    <span className="dot bg-primary-500"></span>
  </span>
);

// Enhanced Game History Component
const GameHistory = ({ diceContract, account, onError }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const filteredGames = useMemo(() => {
    if (filter === "all") return games;
    if (filter === "wins") return games.filter(game => game.status === "WIN");
    if (filter === "losses") return games.filter(game => game.status === "LOSS");
    return games;
  }, [games, filter]);

  useEffect(() => {
    const fetchGames = async () => {
      if (!diceContract || !account) {
        setGames([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const bets = await diceContract.getPreviousBets(account);
        
        // Map contract data to component state
        const processedGames = bets.map(bet => ({
          chosenNumber: Number(bet.chosenNumber),
          rolledNumber: Number(bet.rolledNumber),
          amount: bet.amount.toString(),
          timestamp: new Date(Number(bet.timestamp) * 1000),
          status: Number(bet.chosenNumber) === Number(bet.rolledNumber) ? "WIN" : "LOSS"
        }));

        setGames(processedGames);
      } catch (error) {
        console.error("Error fetching game history:", error);
        onError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchGames, 10000);
    return () => clearInterval(interval);
  }, [diceContract, account]);

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white/90">Game History</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg ${
              filter === "all"
                ? "bg-gaming-primary text-white"
                : "bg-gaming-primary/20 text-gaming-primary"
            } text-sm hover:bg-gaming-primary/30 transition-colors`}
          >
            All
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
      </div>

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
              <GameHistoryItem key={index} game={game} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const GameHistoryItem = ({ game, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ delay: index * 0.1 }}
    className={`
      relative p-4 rounded-xl border backdrop-blur-sm
      ${
        game.status === "WIN"
          ? "border-gaming-success/20 bg-gaming-success/5"
          : "border-gaming-error/20 bg-gaming-error/5"
      }
      hover:transform hover:scale-[1.02] transition-all duration-300
    `}
  >
    <div className="flex justify-between items-center">
      <div>
        <div className="text-lg font-semibold">
          {ethers.formatEther(game.amount)} GameX
        </div>
        <div className="text-sm text-secondary-400">
          Rolled: {game.rolledNumber} | Chosen: {game.chosenNumber}
        </div>
      </div>
      <div className="text-sm text-secondary-400">
        {new Date(game.timestamp).toLocaleString()}
      </div>
    </div>
  </motion.div>
);

// Environment variables
const DICE_CONTRACT_ADDRESS = process.env.REACT_APP_DICE_GAME_ADDRESS;
const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_ADDRESS;

// Add console logs for debugging
console.log("DICE_CONTRACT_ADDRESS:", DICE_CONTRACT_ADDRESS);
console.log("TOKEN_CONTRACT_ADDRESS:", TOKEN_CONTRACT_ADDRESS);

// Enhanced GameComponent with better state management and polling
const GameComponent = ({
  diceContract,
  tokenContract,
  account,
  onError,
  addToast,
}) => {
  const [chosenNumber, setChosenNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(
    window.BigInt(ethers.parseEther("0.01").toString())
  );
  const [gameState, setGameState] = useState({
    isActive: false,
    status: 0, // GameStatus enum
    chosenNumber: 0,
    amount: 0,
    timestamp: 0,
    requestId: 0,
    requestFulfilled: false,
    requestActive: false
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    winRate: 0,
    averageBet: 0,
    totalGamesWon: 0,
    totalGamesLost: 0
  });

  // Function to fetch game status
  const fetchGameStatus = async () => {
    try {
      const [isActive, status, chosenNumber, amount, timestamp] = 
        await diceContract.getGameStatus(account);
      const [requestId, requestFulfilled, requestActive] = 
        await diceContract.getCurrentRequestDetails(account);
      
      setGameState({
        isActive,
        status,
        chosenNumber: Number(chosenNumber),
        amount: amount.toString(),
        timestamp: Number(timestamp),
        requestId,
        requestFulfilled,
        requestActive
      });
    } catch (err) {
      console.error("Error fetching game status:", err);
    }
  };

  // Function to fetch player stats
  const fetchPlayerStats = async () => {
    try {
      const [winRate, averageBet, totalGamesWon, totalGamesLost] = 
        await diceContract.getPlayerStats(account);
      
      // Handle BigNumber conversions safely
      setStats({
        winRate: Number(winRate) / 100, // Convert basis points to percentage
        averageBet: averageBet.toString(), // Keep as string to avoid overflow
        totalGamesWon: Number(totalGamesWon),
        totalGamesLost: Number(totalGamesLost)
      });
    } catch (err) {
      console.error("Error fetching player stats:", err);
      // Set default values on error
      setStats({
        winRate: 0,
        averageBet: "0",
        totalGamesWon: 0,
        totalGamesLost: 0
      });
    }
  };

  // Enhanced handlePlay function
  const handlePlay = async () => {
    if (!validatePlay()) return;

    setLoading(true);
    try {
      // Check allowance and approve if needed
      const currentAllowance = await tokenContract.allowance(account, diceContract.address);
      if (currentAllowance < betAmount) {
        const approveTx = await tokenContract.approve(diceContract.address, betAmount);
        await approveTx.wait();
        addToast("Token approval successful!", "success");
      }

      // Place bet and get requestId
      const tx = await diceContract.playDice(chosenNumber, betAmount);
      const receipt = await tx.wait();
      
      // Find RequestId event from transaction receipt
      const requestId = receipt.events.find(e => e.event === "RequestSent")?.args?.requestId;
      addToast("Bet placed successfully! Waiting for random number...", "success");

      // Update game state
      await fetchGameStatus();
    } catch (err) {
      addToast(err.message, "error");
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  // Function to resolve game
  const handleResolve = async () => {
    if (!gameState.requestFulfilled) {
      addToast("Random number not ready yet", "error");
      return;
    }

    try {
      setLoading(true);
      const tx = await diceContract.resolveGame();
      await tx.wait();
      addToast("Game resolved successfully!", "success");
      
      // Refresh game state and stats
      await Promise.all([
        fetchGameStatus(),
        fetchPlayerStats()
      ]);
    } catch (err) {
      addToast(err.message, "error");
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  // Validation function
  const validatePlay = () => {
    if (!chosenNumber) {
      addToast("Please select a number", "error");
      return false;
    }
    if (chosenNumber < 1 || chosenNumber > 6) {
      addToast("Invalid number selected", "error");
      return false;
    }
    if (!betAmount || betAmount <= 0) {
      addToast("Invalid bet amount", "error");
      return false;
    }
    if (gameState.isActive) {
      addToast("You have an active game", "error");
      return false;
    }
    return true;
  };

  // Polling effect for game state
  useEffect(() => {
    if (account && diceContract) {
      fetchGameStatus();
      fetchPlayerStats();
      
      const interval = setInterval(() => {
        fetchGameStatus();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [account, diceContract]);

  return (
    <div className="game-container space-y-8">
      <div className="stats-panel grid grid-cols-2 gap-4">
        <StatCard
          title="Win Rate"
          value={`${Number(stats.winRate).toFixed(2)}%`}
          color={Number(stats.winRate) > 50 ? 'success' : 'primary'}
        />
        <StatCard
          title="Average Bet"
          value={`${ethers.formatEther(stats.averageBet || "0")} GameX`}
        />
        <StatCard
          title="Games Won"
          value={stats.totalGamesWon || 0}
          color="success"
        />
        <StatCard
          title="Games Lost"
          value={stats.totalGamesLost || 0}
          color="error"
        />
      </div>

      <div className="game-controls space-y-6">
        <NumberSelector
          value={chosenNumber}
          onChange={setChosenNumber}
          disabled={loading || gameState.isActive}
        />

        <BetInput
          value={betAmount}
          onChange={setBetAmount}
          disabled={loading || gameState.isActive}
        />

        <div className="flex flex-col gap-4">
          <button
            onClick={handlePlay}
            disabled={loading || gameState.isActive}
            className="btn-gaming-primary"
          >
            {loading ? "Processing..." : "Place Bet"}
          </button>

          {gameState.isActive && (
            <button
              onClick={handleResolve}
              disabled={loading || !gameState.requestFulfilled}
              className="btn-gaming-secondary"
            >
              {loading ? "Processing..." : "Resolve Game"}
            </button>
          )}
        </div>

        {gameState.isActive && (
          <div className="game-status-panel p-4 rounded-lg bg-gaming-surface">
            <h3 className="text-lg font-bold mb-2">Current Game Status</h3>
            <div className="space-y-2">
              <p>Status: {['Pending', 'Started', 'Won', 'Lost', 'Cancelled'][gameState.status]}</p>
              <p>Chosen Number: {gameState.chosenNumber}</p>
              <p>Bet Amount: {ethers.formatEther(gameState.amount)} GameX</p>
              {gameState.requestActive && !gameState.requestFulfilled && (
                <p className="text-gaming-accent animate-pulse">
                  Waiting for random number...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
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
const GameStatus = ({ diceContract, account, onError }) => {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGameStatus = async () => {
      if (!diceContract || !account) {
        setLoading(false);
        return;
      }

      try {
        const [isActive, status, chosenNumber, amount, timestamp] = 
          await diceContract.getGameStatus(account);
        
        setGameState({
          isActive,
          status: ['PENDING', 'STARTED', 'COMPLETED_WIN', 'COMPLETED_LOSS', 'CANCELLED'][status],
          chosenNumber: Number(chosenNumber),
          amount: amount.toString(),
          timestamp: Number(timestamp)
        });
      } catch (err) {
        console.error("Error fetching game status:", err);
        onError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameStatus();
    const interval = setInterval(fetchGameStatus, 5000);
    return () => clearInterval(interval);
  }, [diceContract, account]);

  if (loading) {
    return <LoadingSpinner message="Loading game status..." />;
  }

  if (!gameState) {
    return null;
  }

  return (
    <div className="glass-panel p-6 rounded-xl space-y-4">
      <h2 className="text-2xl font-bold text-white/90">Current Game Status</h2>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Status"
          value={gameState.status.replace('_', ' ')}
          color={
            gameState.status === 'COMPLETED_WIN' 
              ? 'success' 
              : gameState.status === 'COMPLETED_LOSS' 
                ? 'error' 
                : 'primary'
          }
        />
        {gameState.isActive && (
          <>
            <StatCard
              title="Chosen Number"
              value={gameState.chosenNumber}
            />
            <StatCard
              title="Bet Amount"
              value={`${ethers.formatEther(gameState.amount)} GameX`}
            />
            <StatCard
              title="Time"
              value={new Date(gameState.timestamp * 1000).toLocaleString()}
            />
          </>
        )}
      </div>
    </div>
  );
};

// PlayerStats Component
const PlayerStats = ({ diceContract, account, onError }) => {
  const [stats, setStats] = useState({
    winRate: 0,
    averageBet: "0",
    totalGamesWon: 0,
    totalGamesLost: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!diceContract || !account) return;

      try {
        const [winRate, averageBet, totalGamesWon, totalGamesLost] = 
          await diceContract.getPlayerStats(account);

        // Safely handle BigInt conversions
        const formattedStats = {
          // winRate comes in basis points (100 = 1%), so divide by 100
          winRate: Number(winRate) / 100,
          
          // Keep averageBet as string to avoid overflow
          averageBet: averageBet.toString(),
          
          // Convert game counts safely
          totalGamesWon: Number(totalGamesWon),
          totalGamesLost: Number(totalGamesLost)
        };

        setStats(formattedStats);
      } catch (error) {
        console.error("Error fetching player stats:", error);
        onError(error);
        // Set safe default values on error
        setStats({
          winRate: 0,
          averageBet: "0",
          totalGamesWon: 0,
          totalGamesLost: 0
        });
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, [diceContract, account]);

  return (
    <div className="glass-panel p-6 rounded-xl">
      <h2 className="text-2xl font-bold text-white/90 mb-6">Player Statistics</h2>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(2)}%`}
          color={stats.winRate > 50 ? 'success' : 'primary'}
        />
        <StatCard
          title="Average Bet"
          value={`${ethers.formatEther(stats.averageBet)} GameX`}
        />
        <StatCard
          title="Games Won"
          value={stats.totalGamesWon}
          color="success"
        />
        <StatCard
          title="Games Lost"
          value={stats.totalGamesLost}
          color="error"
        />
      </div>
    </div>
  );
};

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
const GameStats = ({ gameData }) => {
  return (
    <div className="stats-panel glass-effect p-6 rounded-xl">
      <h3 className="text-xl font-bold mb-4 text-primary-100">
        Game Statistics
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-secondary-400">Total Bets</p>
          <p className="text-2xl font-bold text-primary-100">
            {gameData.totalBets}
          </p>
        </div>
        <div>
          <p className="text-secondary-400">Total Volume</p>
          <p className="text-2xl font-bold text-primary-100">
            {ethers.formatEther(gameData.totalVolume)} GameX
          </p>
        </div>
        <div>
          <p className="text-secondary-400">Largest Win</p>
          <p className="text-2xl font-bold text-success-500">
            {ethers.formatEther(gameData.largestWin)} GameX
          </p>
        </div>
        <div>
          <p className="text-secondary-400">House Edge</p>
          <p className="text-2xl font-bold text-primary-100">
            {gameData.houseEdge}%
          </p>
        </div>
      </div>
    </div>
  );
};



// New Game Controls Component
const GameControls = ({ onRoll, isRolling, canRoll }) => {
  return (
    <div className="flex flex-col items-center space-y-6 mt-12">
      <button
        onClick={onRoll}
        disabled={!canRoll || isRolling}
        className={`
          w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg
          transition-all duration-300 transform
          ${
            canRoll && !isRolling
              ? "bg-primary-500 hover:bg-primary-400 hover:scale-105"
              : "bg-secondary-700 cursor-not-allowed opacity-50"
          }
          ${isRolling ? "animate-pulse" : ""}
        `}
      >
        {isRolling ? (
          <div className="flex items-center space-x-2">
            <span>Rolling</span>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          </div>
        ) : (
          "Roll Dice"
        )}
      </button>

      {!canRoll && (
        <p className="text-error-400 text-sm">
          Please connect your wallet and select a number to roll
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
  // State management
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [diceContract, setDiceContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loadingStates, setLoadingStates] = useState({
    provider: true,
    contracts: true,
    gameData: true,
  });
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Error handling utility
  const handleError = (error) => {
    console.error("Error details:", error);
    if (error.code === 4001) {
      return setError("Transaction rejected by user");
    } else if (error.code === -32603) {
      return setError("Internal JSON-RPC error");
    } else if (error.message.includes("insufficient funds")) {
      return setError("Insufficient token balance");
    } else if (error.message.includes("ERC20: insufficient allowance")) {
      return setError("Token approval needed");
    }
    setError(error.message);
  };

  // Provider initialization
  const initializeProvider = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("No Web3 provider detected. Please install MetaMask!");
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setProvider(provider);
      setSigner(signer);
      setLoadingStates((prev) => ({ ...prev, provider: false }));
      return { provider, signer };
    } catch (err) {
      handleError(err);
      setLoadingStates((prev) => ({ ...prev, provider: false }));
      return null;
    }
  };

  // Contract initialization
  const initializeContracts = async (signer) => {
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

      setDiceContract(diceContract);
      setTokenContract(tokenContract);
      setLoadingStates((prev) => ({ ...prev, contracts: false }));
      return { diceContract, tokenContract };
    } catch (err) {
      handleError(err);
      setLoadingStates((prev) => ({ ...prev, contracts: false }));
      return null;
    }
  };

  // Add missing checkAdminStatus function
  const checkAdminStatus = async (accountAddress) => {
    if (!tokenContract || !accountAddress) return;

    setIsCheckingAdmin(true);
    try {
      const ADMIN_ROLE = await tokenContract.DEFAULT_ADMIN_ROLE();
      const hasRole = await tokenContract.hasRole(ADMIN_ROLE, accountAddress);
      setIsAdmin(hasRole);
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  // Update connectWallet function to handle errors better
  const connectWallet = async () => {
    setLoadingStates((prev) => ({ ...prev, wallet: true }));
    setLoadingMessage("Connecting to wallet...");
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask!");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const providerData = await initializeProvider();
      if (!providerData) {
        throw new Error("Failed to initialize provider");
      }

      const contractsData = await initializeContracts(providerData.signer);
      if (!contractsData) {
        throw new Error("Failed to initialize contracts");
      }

      await handleAccountsChanged(accounts);
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, wallet: false }));
      setLoadingMessage("");
    }
  };

  // Update handleAccountsChanged to be more robust
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setError("Please connect to MetaMask.");
      setAccount("");
      setIsAdmin(false);
    } else {
      const newAccount = accounts[0];
      setAccount(newAccount);
      if (tokenContract) {
        await checkAdminStatus(newAccount);
      }
    }
  };

  // Chain change handler
  const handleChainChanged = () => {
    window.location.reload();
  };

  // Update initialization useEffect
  useEffect(() => {
    const init = async () => {
      try {
        const providerData = await initializeProvider();
        if (!providerData) return;

        const contractsData = await initializeContracts(providerData.signer);
        if (!contractsData) return;

        if (window.ethereum) {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            await handleAccountsChanged(accounts);
          }
        }
      } catch (err) {
        handleError(err);
      } finally {
        setLoadingStates({
          provider: false,
          contracts: false,
          gameData: false,
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
  }, []);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  // Loading state check
  if (Object.values(loadingStates).some((state) => state)) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <div className="card animate-pulse p-8 max-w-md w-full">
          <h2 className="text-2xl font-display text-primary-400 mb-4">
            Loading...
          </h2>
          {loadingStates.provider && (
            <p className="text-secondary-300 mb-2">
              Connecting to Web3 provider...
            </p>
          )}
          {loadingStates.contracts && (
            <p className="text-secondary-300 mb-2">Initializing contracts...</p>
          )}
          {loadingStates.gameData && (
            <p className="text-secondary-300 mb-2">Loading game data...</p>
          )}
        </div>
      </div>
    );
  }

  // Error state check
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

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <Router>
      <div className="min-h-screen bg-secondary-900">
        {/* Add loading overlay */}
        {Object.values(loadingStates).some((state) => state) && (
          <LoadingOverlay message={loadingMessage} />
        )}

        <Navbar 
          account={account}
          connectWallet={connectWallet}
          loadingStates={loadingStates}
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
                    diceContract={diceContract}
                    tokenContract={tokenContract}
                    account={account}
                    onError={handleError}
                    addToast={addToast}
                  />
                  <GameStatus
                    diceContract={diceContract}
                    account={account}
                    onError={handleError}
                  />
                  <div className="grid md:grid-cols-2 gap-12">
                    <PlayerStats
                      diceContract={diceContract}
                      account={account}
                      onError={handleError}
                    />
                    <GameHistory
                      diceContract={diceContract}
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
                isCheckingAdmin ? (
                  <div className="card animate-pulse p-8">
                    <h2 className="text-2xl font-display text-primary-400">
                      Verifying admin status...
                    </h2>
                  </div>
                ) : isAdmin ? (
                  <AdminPage
                    diceContract={diceContract}
                    tokenContract={tokenContract}
                    account={account}
                    onError={handleError}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </Router>
  );
}

export default App;
