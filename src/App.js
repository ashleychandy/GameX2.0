import React, { useState, useEffect } from "react";
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
const BetSlider = ({ value = "0", onChange, min = "1", userBalance = "0" }) => {
  const formatValue = (val) => {
    try {
      return ethers.formatEther(val.toString());
    } catch (error) {
      console.error("Error formatting value:", error);
      return "0";
    }
  };

  const parseValue = (val) => {
    try {
      return ethers.parseEther(val.toString());
    } catch (error) {
      console.error("Error parsing value:", error);
      return BigInt(0);
    }
  };

  const calculatePercentage = (amount, percentage) => {
    try {
      const safeAmount = BigInt(amount || "0");
      const result = (safeAmount * BigInt(percentage)) / BigInt(100);
      const minValue = BigInt(min);
      return result < minValue ? minValue : result;
    } catch {
      return BigInt(min);
    }
  };

  const safeBigIntValue = BigInt(value || "0");
  const safeBigIntMin = BigInt(min);
  const safeBigIntBalance = BigInt(userBalance || "0");

  const presetAmounts = [
    safeBigIntMin,
    calculatePercentage(safeBigIntBalance, 25),
    calculatePercentage(safeBigIntBalance, 50),
    calculatePercentage(safeBigIntBalance, 75),
    safeBigIntBalance
  ].filter((amount, index, self) => 
    index === self.findIndex(a => a === amount) && 
    amount >= safeBigIntMin && 
    amount <= safeBigIntBalance
  );

  const handleSliderChange = (e) => {
    try {
      const newValue = parseValue(e.target.value);
      if (newValue < safeBigIntMin) return onChange(safeBigIntMin);
      if (newValue > safeBigIntBalance) return onChange(safeBigIntBalance);
      onChange(newValue);
    } catch (error) {
      console.error("Error converting slider value:", error);
      onChange(safeBigIntMin);
    }
  };

  const handleInputChange = (e) => {
    try {
      const newValue = parseValue(e.target.value);
      if (newValue < safeBigIntMin) return onChange(safeBigIntMin);
      if (newValue > safeBigIntBalance) return onChange(safeBigIntBalance);
      onChange(newValue);
    } catch (error) {
      console.error("Error converting input value:", error);
    }
  };

  return (
    <div className="bet-controls relative overflow-hidden rounded-2xl bg-secondary-800/40 
      backdrop-blur-lg border border-white/10 shadow-xl p-8 transform 
      hover:shadow-2xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-gaming-primary/5 
        to-gaming-accent/5 animate-gradient-shift"></div>

      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-primary-100">Place Your Bet</h3>
            <p className="text-sm text-secondary-400">Select amount of tokens to wager</p>
          </div>
          <div className="text-right">
            <input
              type="number"
              value={formatValue(safeBigIntValue)}
              onChange={handleInputChange}
              min={formatValue(safeBigIntMin)}
              max={formatValue(safeBigIntBalance)}
              step="0.000000000000000001"
              className="w-24 text-right bg-transparent text-2xl font-bold text-primary-400 
                focus:outline-none focus:ring-1 focus:ring-gaming-primary rounded-lg"
            />
            <div className="text-xs text-secondary-400">Current Bet Amount</div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {presetAmounts.map((amount, index) => (
            <button
              key={index}
              onClick={() => onChange(amount)}
              disabled={amount > safeBigIntBalance}
              className={`relative group px-3 py-2 rounded-xl transition-all duration-300
                ${safeBigIntValue === amount
                  ? "bg-gaming-primary text-white shadow-glow-primary scale-105"
                  : "bg-secondary-700/50 hover:bg-secondary-600/50 text-secondary-300"}
                ${amount > safeBigIntBalance ? "opacity-50 cursor-not-allowed" : ""}`}>
              <div className="relative z-10">
                <span className="block text-sm font-medium">{formatValue(amount)}</span>
                <span className="block text-xs opacity-75">
                  {index === 0 ? "Min" : index === presetAmounts.length - 1 ? "Max" : `${index * 25}%`}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <input
            type="range"
            min={formatValue(safeBigIntMin)}
            max={formatValue(safeBigIntBalance)}
            value={formatValue(safeBigIntValue)}
            onChange={handleSliderChange}
            step="0.000000000000000001"
            className="w-full h-2 bg-secondary-700/50 rounded-lg appearance-none 
              cursor-pointer relative z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gaming-primary
              [&::-webkit-slider-thumb]:shadow-glow-primary
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-all
              [&::-webkit-slider-thumb]:duration-300
              [&::-webkit-slider-thumb]:hover:scale-110"
          />

          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">Min: {formatValue(safeBigIntMin)} ETH</span>
            <span className="text-secondary-400">Balance: {formatValue(safeBigIntBalance)} ETH</span>
          </div>
        </div>
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
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white/90">Choose Your Number</h3>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
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

  useEffect(() => {
    const fetchGames = async () => {
      if (!diceContract || !account) {
        setGames([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const history = await diceContract.getPreviousBets(account);
        const processedGames = history.map((game) => ({
          chosenNumber: Number(game.chosenNumber),
          result: Number(game.rolledNumber),
          amount: game.amount,
          timestamp: Number(game.timestamp),
          status:
            game.chosenNumber.toString() === game.rolledNumber.toString()
              ? 2
              : 3,
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
  }, [diceContract, account]);

  const filteredGames = games.filter((game) => {
    if (filter === "wins") return game.status === 2;
    if (filter === "losses") return game.status === 3;
    return true;
  });

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
        game.status === 2
          ? "border-gaming-success/20 bg-gaming-success/5"
          : "border-gaming-error/20 bg-gaming-error/5"
      }
      hover:transform hover:scale-[1.02] transition-all duration-300
    `}
  >
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="dice-result w-8 h-8 rounded-lg bg-secondary-800/50 
            flex items-center justify-center font-bold"
          >
            {game.chosenNumber}
          </div>
          <span className="text-secondary-400">→</span>
          <div
            className="dice-result w-8 h-8 rounded-lg bg-secondary-800/50 
            flex items-center justify-center font-bold"
          >
            {game.result}
          </div>
        </div>

        <div className="text-lg font-semibold">
          {ethers.formatEther(game.amount)} ETH
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm text-secondary-400">
          {new Date(game.timestamp * 1000).toLocaleDateString()}
        </div>
        <div className="text-xs text-secondary-500">
          {new Date(game.timestamp * 1000).toLocaleTimeString()}
        </div>
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

// GameComponent
const GameComponent = ({
  diceContract,
  tokenContract,
  account,
  onGameStart,
  onGameResolve,
  onError,
  addToast,
}) => {
  const [chosenNumber, setChosenNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(
    window.BigInt(ethers.parseEther("0.01").toString())
  );
  const [canPlay, setCanPlay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [minBet, setMinBet] = useState(
    window.BigInt(ethers.parseEther("0.01").toString())
  );
  const [maxBet, setMaxBet] = useState(
    window.BigInt(ethers.parseEther("1.0").toString())
  );

  useEffect(() => {
    const checkGameState = async () => {
      if (diceContract && account) {
        try {
          const canStart = await diceContract.canStartNewGame(account);
          const hasPending = await diceContract.hasPendingRequest(account);
          setCanPlay(canStart && !hasPending);
        } catch (err) {
          onError(err);
        }
      }
    };

    checkGameState();
    const interval = setInterval(checkGameState, 5000);
    return () => clearInterval(interval);
  }, [diceContract, account, onError]);

  const handlePlay = async () => {
    if (!chosenNumber || !betAmount) {
      addToast("Please enter both number and bet amount", "error");
      return;
    }

    setLoading(true);
    try {
      const tx = await diceContract.playDice(chosenNumber, betAmount);
      await tx.wait();
      addToast("Bet placed successfully!", "success");
      onGameStart();
    } catch (err) {
      addToast(err.message, "error");
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-component glass-effect p-6 rounded-xl">
      <NumberSelector
        value={chosenNumber}
        onChange={setChosenNumber}
        disabled={loading}
      />

      <BetSlider
        value={betAmount}
        onChange={setBetAmount}
        min={minBet}
        max={maxBet}
      />

      <GameControls
        onRoll={handlePlay}
        isRolling={loading}
        canRoll={canPlay && chosenNumber && betAmount}
      />
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


// GameStatus Component
const GameStatus = ({ gameState }) => {
  if (!gameState) return null;

  const { isActive, status, chosenNumber, amount, timestamp } = gameState;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel relative p-6 rounded-xl border border-white/10
        bg-gradient-to-br from-gaming-primary/5 to-gaming-accent/5
        backdrop-blur-lg shadow-xl"
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-gaming-primary/10 
        to-gaming-accent/10 rounded-xl opacity-20"
      />

      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white/90">Game Status</h3>
          <StatusIndicator status={status} isActive={isActive} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card">
            <span className="text-sm text-secondary-400">Chosen Number</span>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg bg-gaming-primary/20 
                flex items-center justify-center text-lg font-bold"
              >
                {chosenNumber}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <span className="text-sm text-secondary-400">Bet Amount</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {ethers.formatEther(amount)} ETH
              </span>
            </div>
          </div>
        </div>

        {isActive && (
          <div className="mt-4">
            <div className="h-1 w-full bg-secondary-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gaming-primary"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <p className="text-sm text-secondary-400 mt-2">
              Transaction in progress...
            </p>
          </div>
        )}

        <div className="text-sm text-secondary-400">
          Last Updated: {new Date(timestamp * 1000).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
};

// PlayerStats Component
const PlayerStats = ({ diceContract, account, onError }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (diceContract && account) {
        try {
          // Match contract function return values
          const [
            currentGame,
            totalGames,
            totalBets,
            totalWinnings,
            totalLosses,
            lastPlayed,
          ] = await diceContract.getUserData(account);

          setStats({
            totalGames: totalGames.toString(),
            totalBets: ethers.formatEther(totalBets),
            totalWinnings: ethers.formatEther(totalWinnings),
            totalLosses: ethers.formatEther(totalLosses),
            lastPlayed: lastPlayed.toString(),
          });
        } catch (err) {
          onError(err);
        }
      }
    };
    fetchStats();
  }, [diceContract, account]);

  return (
    <div className="player-stats">
      <h3>Player Statistics</h3>
      {stats && (
        <div>
          <p>Total Games: {stats.totalGames}</p>
          <p>Total Bets: {stats.totalBets}</p>
          <p>Total Winnings: {stats.totalWinnings}</p>
          <p>Total Losses: {stats.totalLosses}</p>
          <p>
            Last Played: {new Date(stats.lastPlayed * 1000).toLocaleString()}
          </p>
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
              GameToken
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
              <a
                href="#learn-more"
                className="btn-outline-gaming hover:scale-105 transform transition-all"
              >
                Learn More
              </a>
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
    title: "Get GameToken",
    description: "Purchase tokens directly through our platform",
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
    wins: 0,
    losses: 0,
    totalWagered: 0,
    netProfit: 0,
    recentResults: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [games, totalBets, totalWinnings] = await Promise.all([
          diceContract.getTotalGames(),
          diceContract.getTotalBets(),
          diceContract.getTotalWinnings(account),
        ]);

        const gameHistory = await diceContract.getPlayerHistory(account);
        const processedHistory = gameHistory.map((game) => ({
          result: game.status === 2, // COMPLETED_WIN = 2
          amount: Number(ethers.formatEther(game.amount)),
          payout: Number(ethers.formatEther(game.payout)),
        }));

        setStats({
          totalGames: games.toString(),
          wins: processedHistory.filter((g) => g.result).length,
          losses: processedHistory.filter((g) => !g.result).length,
          totalWagered: Number(ethers.formatEther(totalBets)),
          netProfit: Number(ethers.formatEther(totalWinnings)),
          recentResults: processedHistory.slice(-10).reverse(),
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    if (diceContract && account) {
      fetchStats();
    }
  }, [diceContract, account]);

  const chartData = {
    labels: stats.recentResults.map((_, i) => `Game ${i + 1}`),
    datasets: [
      {
        label: "Profit/Loss",
        data: stats.recentResults.map((game) =>
          game.result ? game.payout - game.amount : -game.amount
        ),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "rgb(226, 232, 240)",
        bodyColor: "rgb(226, 232, 240)",
        borderColor: "rgba(148, 163, 184, 0.1)",
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
        },
        ticks: {
          color: "rgb(148, 163, 184)",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgb(148, 163, 184)",
        },
      },
    },
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      <h2 className="text-2xl font-bold text-white/90">Your Statistics</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Games", value: stats.totalGames },
          {
            label: "Win Rate",
            value: `${((stats.wins / stats.totalGames) * 100 || 0).toFixed(
              1
            )}%`,
          },
          { label: "Net Profit", value: `${stats.netProfit.toFixed(4)} ETH` },
          {
            label: "Total Wagered",
            value: `${stats.totalWagered.toFixed(4)} ETH`,
          },
          { label: "Wins", value: stats.wins },
          { label: "Losses", value: stats.losses },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="stat-card p-4 rounded-xl bg-secondary-800/40 border border-white/5"
          >
            <div className="text-sm text-secondary-400">{stat.label}</div>
            <div className="text-xl font-bold text-white mt-1">
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Profit Chart */}
      <div className="h-64 mt-6">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon }) => (
  <div className="bg-secondary-800 p-4 rounded-lg border border-secondary-700">
    <div className="flex items-center space-x-2 mb-2">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-secondary-400">{title}</span>
    </div>
    <div className="text-lg font-bold text-primary-400">{value}</div>
  </div>
);

// New Game Controls Component
const GameControls = ({ onRoll, isRolling, canRoll }) => {
  return (
    <div className="flex flex-col items-center space-y-4">
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
      return setError("Insufficient funds for transaction");
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

        <nav className="glass-effect sticky top-0 z-50 border-b border-secondary-700/50">
          <div className="responsive-container">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
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
              <div className="flex items-center">
                {account ? (
                  <div className="glass-effect px-4 py-2 rounded-lg text-sm">
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

        <main className="responsive-container py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/dice"
              element={
                <div className="grid gap-8">
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
                  <div className="grid md:grid-cols-2 gap-8">
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
                  {isAdmin && (
                    <AdminPanel
                      diceContract={diceContract}
                      tokenContract={tokenContract}
                      onError={handleError}
                    />
                  )}
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
