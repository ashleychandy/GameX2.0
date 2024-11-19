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

// Enhanced Toast Component
const Toast = ({ message, type, onClose }) => {
  const bgColor =
    {
      success: "bg-success-500",
      error: "bg-error-500",
      warning: "bg-warning-500",
      info: "bg-primary-500",
    }[type] || "bg-primary-500";

  const Icon = {
    success: (
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
    ),
    error: (
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
    ),
    warning: (
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
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
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
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  }[type];

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center min-w-[300px] p-4 
      rounded-lg shadow-xl transform transition-all duration-300 ease-in-out
      ${bgColor} animate-slide-up z-50`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-1 text-white">
        <div className="flex items-center space-x-2">
          {Icon}
          <span className="font-medium">{message}</span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-white hover:text-gray-200 transition-colors"
        aria-label="Close notification"
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
};

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

const BalancePanel = ({ userBalance, allowance, potentialWinnings }) => {
  const [showDetails, setShowDetails] = useState(false);

  const balanceItems = [
    {
      label: "Token Balance",
      value: ethers.formatEther(userBalance.toString()),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Token Allowance",
      value: ethers.formatEther(allowance.toString()),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Potential Win",
      value: ethers.formatEther(potentialWinnings.toString()),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
  ];

  const formatValue = (value) => {
    const formatted = parseFloat(value).toFixed(6);
    return formatted.replace(/\.?0+$/, "");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold bg-clip-text text-transparent 
                       bg-gradient-to-r from-gaming-primary to-gaming-accent"
        >
          Balance Info
        </h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-secondary-400 hover:text-white transition-colors"
        >
          <svg
            className={`w-6 h-6 transform transition-transform duration-300
                          ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {balanceItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="balance-item"
          >
            <div
              className="flex items-center justify-between p-4 rounded-xl
                           bg-secondary-800/30 border border-secondary-700/30
                           hover:border-gaming-primary/30 transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg
                               bg-gaming-primary/10 text-gaming-primary
                               flex items-center justify-center"
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm text-secondary-400">{item.label}</p>
                  <p className="font-medium text-white">
                    {formatValue(item.value)}{" "}
                    <span className="text-sm text-secondary-400">GameX</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-secondary-800/30 border border-secondary-700/30">
                <h3 className="text-lg font-medium mb-3">Balance Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">
                      Available for Betting:
                    </span>
                    <span className="text-white">
                      {formatValue(
                        ethers.formatEther(
                          userBalance > allowance ? allowance : userBalance
                        )
                      )}{" "}
                      GameX
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">Win Multiplier:</span>
                    <span className="text-gaming-success">6x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">
                      Max Potential Win:
                    </span>
                    <span className="text-gaming-primary">
                      {formatValue(ethers.formatEther(userBalance * BigInt(6)))}{" "}
                      GameX
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

const StatusPanel = ({ gameState }) => {
  const statusItems = [
    {
      label: "Game Status",
      value: gameState.isActive ? "Active" : "Inactive",
      type: gameState.isActive ? "warning" : "success",
      icon: gameState.isActive ? (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
    {
      label: "Can Play",
      value: gameState.canPlay ? "Yes" : "No",
      type: gameState.canPlay ? "success" : "error",
      icon: gameState.canPlay ? (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Processing",
      value: gameState.isProcessing ? "Yes" : "No",
      type: gameState.isProcessing ? "warning" : "success",
      icon: gameState.isProcessing ? (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
    {
      label: "Needs Resolution",
      value: gameState.needsResolution ? "Yes" : "No",
      type: gameState.needsResolution ? "warning" : "success",
      icon: gameState.needsResolution ? (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h2
        className="text-2xl font-bold bg-clip-text text-transparent 
                     bg-gradient-to-r from-gaming-primary to-gaming-accent"
      >
        Game Status
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statusItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="status-item"
          >
            <div
              className={`flex items-center justify-between p-4 rounded-xl
                            bg-secondary-800/30 border border-secondary-700/30
                            hover:border-gaming-primary/30 transition-all duration-300`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg
                                flex items-center justify-center
                                ${
                                  item.type === "success"
                                    ? "text-gaming-success"
                                    : item.type === "warning"
                                    ? "text-gaming-warning"
                                    : "text-gaming-error"
                                }`}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm text-secondary-400">{item.label}</p>
                  <p
                    className={`font-medium ${
                      item.type === "success"
                        ? "text-gaming-success"
                        : item.type === "warning"
                        ? "text-gaming-warning"
                        : "text-gaming-error"
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              </div>
              <div
                className={`flex-shrink-0 w-2 h-2 rounded-full
                              ${
                                item.type === "success"
                                  ? "bg-gaming-success"
                                  : item.type === "warning"
                                  ? "bg-gaming-warning"
                                  : "bg-gaming-error"
                              }`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Loading Dots Component
const LoadingDots = () => (
  <span
    className="loading-dots inline-flex space-x-1"
    role="status"
    aria-label="Loading"
  >
    {[1, 2, 3].map((i) => (
      <span
        key={i}
        className="dot w-2 h-2 bg-current rounded-full animate-pulse"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </span>
);

const LoadingSpinner = ({ size = "medium", light = false }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  }[size];

  return (
    <div
      className={`inline-block ${sizeClasses} animate-spin rounded-full border-2 
      border-current border-t-transparent text-gaming-primary`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

const RequestMonitor = ({ diceContract, requestId, onComplete, onError }) => {
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 30; // 1 minute maximum (2s * 30)

  useEffect(() => {
    if (!diceContract || !requestId) return;

    let timeoutId;

    const checkRequest = async () => {
      try {
        const [isActive, requestDetails] = await Promise.all([
          diceContract.isRequestActive(requestId),
          diceContract.getPlayerForRequest(requestId),
        ]);

        if (!isActive) {
          onComplete && onComplete();
          return;
        }

        if (attempts >= MAX_ATTEMPTS) {
          onError && onError(new Error("Request monitoring timed out"));
          return;
        }

        setAttempts((prev) => prev + 1);
        timeoutId = setTimeout(checkRequest, 2000);
      } catch (error) {
        console.error("Error monitoring request:", error);
        onError && onError(error);
      }
    };

    checkRequest();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [diceContract, requestId, attempts, onComplete, onError]);

  // Optional: Return a progress indicator
  return attempts > 0 ? (
    <div className="text-sm text-secondary-400">
      Monitoring request... {((attempts / MAX_ATTEMPTS) * 100).toFixed(0)}%
    </div>
  ) : null;
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
    totalWinnings: BigInt(0),
    biggestWin: BigInt(0),
  });

  const fetchStats = async () => {
    if (!diceContract || !account) return;

    try {
      // Fetch all required data in parallel
      const [userData, previousBets] = await Promise.all([
        diceContract.getUserData(account),
        diceContract.getPreviousBets(account),
      ]);

      // From getUserData we get:
      // [currentGame, totalGames, totalBets, totalWinnings, totalLosses, lastPlayed]
      const totalGames = Number(userData[1]); // gamesPlayed is at index 1
      const totalWinnings = BigInt(userData[3]); // totalWinnings is at index 3

      // Calculate biggest win from previous bets
      const biggestWin = previousBets.reduce((max, bet) => {
        // Check if bet was won by comparing chosenNumber with rolledNumber
        if (Number(bet.chosenNumber) === Number(bet.rolledNumber)) {
          // Winning amount is 6x the bet amount as per contract
          const winAmount = BigInt(bet.amount) * BigInt(6);
          return winAmount > max ? winAmount : max;
        }
        return max;
      }, BigInt(0));

      setStats({
        totalGames,
        totalWinnings,
        biggestWin,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [diceContract, account]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Games"
          value={stats.totalGames.toString()}
          icon="🎲"
        />
        <StatCard
          title="Total Winnings"
          value={`${ethers.formatEther(stats.totalWinnings)} GameX`}
          icon="✨"
          color="success"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 mt-4">
        <StatCard
          title="Biggest Win"
          value={`${ethers.formatEther(stats.biggestWin)} GameX`}
          icon="🏆"
          color="success"
        />
      </div>
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
  onError,
  addToast,
  onGameStateChange,
  onBalanceChange,
}) => {
  const [gameState, setGameState] = useState({
    isActive: false,
    requestId: null,
    status: "PENDING",
    result: null,
    timestamp: 0,
    needsResolution: false,
    canPlay: true,
    isProcessing: false,
  });

  // Update game state
  const updateGameState = useCallback(async () => {
    if (!diceContract || !account) return;
    try {
      // Get game status and request details in parallel
      const [
        [isActive, status, chosenNum, amount, timestamp],
        [requestId, requestFulfilled, requestActive],
        canPlay,
      ] = await Promise.all([
        diceContract.getGameStatus(account),
        diceContract.getCurrentRequestDetails(account),
        diceContract.canStartNewGame(account),
      ]);

      const newGameState = {
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
        needsResolution: requestFulfilled && !requestActive,
        canPlay,
        isProcessing: false,
      };

      setGameState(newGameState);
      onGameStateChange(newGameState);

      // Start monitoring if there's an active request
      if (isActive && requestActive && !requestFulfilled) {
        startRequestMonitoring(requestId.toString());
      }
    } catch (error) {
      console.error("Error updating game state:", error);
      onError(error);
    }
  }, [diceContract, account, onError, onGameStateChange]);

  // Monitor VRF request
  const startRequestMonitoring = useCallback(
    (requestId) => {
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
          onError(error);
        }
      };
      checkRequest();
    },
    [diceContract, updateGameState, onError]
  );

  // Update token balance
  const updateBalance = useCallback(async () => {
    if (!tokenContract || !account) return;
    try {
      const balance = await tokenContract.balanceOf(account);
      onBalanceChange(balance);
    } catch (error) {
      console.error("Error updating balance:", error);
      onError(error);
    }
  }, [tokenContract, account, onBalanceChange, onError]);

  // Place bet
  const placeBet = async () => {
    if (!diceContract || !tokenContract || !account) return;
    if (gameState.isProcessing) return;

    try {
      setGameState((prev) => ({ ...prev, isProcessing: true }));

      // Check allowance
      const allowance = await tokenContract.allowance(
        account,
        diceContract.address
      );
      if (allowance < betAmount) {
        // Approve tokens if needed
        const approveTx = await tokenContract.approve(
          diceContract.address,
          betAmount
        );
        await approveTx.wait();
        addToast("Token approval successful", "success");
      }

      // Place the bet
      const tx = await diceContract.playDice(chosenNumber, betAmount);
      await tx.wait();

      addToast("Bet placed successfully!", "success");
      await updateGameState();
      await updateBalance();
    } catch (error) {
      console.error("Error placing bet:", error);
      onError(error);
    } finally {
      setGameState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Resolve game
  const resolveGame = async () => {
    if (!diceContract || !account) return;
    if (gameState.isProcessing) return;

    try {
      setGameState((prev) => ({ ...prev, isProcessing: true }));
      const tx = await diceContract.resolveGame();
      await tx.wait();

      addToast("Game resolved successfully!", "success");
      await updateGameState();
      await updateBalance();
    } catch (error) {
      console.error("Error resolving game:", error);
      onError(error);
    } finally {
      setGameState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Initial state update
  useEffect(() => {
    updateGameState();
    updateBalance();
  }, [updateGameState, updateBalance]);

  return (
    <div className="space-y-4">
      {/* Game Status */}
      <div className="text-lg font-semibold">
        Status: {gameState.status}
        {gameState.result && ` (Result: ${gameState.result})`}
      </div>

      {/* Action Buttons */}
      <div className="space-x-4">
        {/* Place Bet Button */}
        <button
          className={`btn btn-primary ${
            !gameState.canPlay || gameState.isProcessing
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          onClick={placeBet}
          disabled={!gameState.canPlay || gameState.isProcessing}
        >
          {gameState.isProcessing ? "Processing..." : "Place Bet"}
        </button>

        {/* Resolve Game Button */}
        {gameState.needsResolution && (
          <button
            className={`btn btn-secondary ${
              gameState.isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={resolveGame}
            disabled={gameState.isProcessing}
          >
            {gameState.isProcessing ? "Processing..." : "Resolve Game"}
          </button>
        )}
      </div>

      {/* Processing Indicator */}
      {gameState.isProcessing && (
        <div className="text-sm text-gray-500">Transaction in progress...</div>
      )}
    </div>
  );
};

const DicePage = ({
  contracts,
  account,
  onError,
  addToast,
  setLoadingStates,
  setLoadingMessage,
}) => {
  // Game State
  const [gameState, setGameState] = useState({
    isActive: false,
    isProcessing: false,
    canPlay: false,
    needsResolution: false,
    requestId: null,
    lastResult: null,
    isRolling: false,
  });

  // User Input State
  const [chosenNumber, setChosenNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(BigInt(0));
  const [userBalance, setUserBalance] = useState(BigInt(0));
  const [allowance, setAllowance] = useState(BigInt(0));
  const [betHistory, setBetHistory] = useState([]);
  const [showStats, setShowStats] = useState(false);

  // Calculate potential winnings
  const potentialWinnings = useMemo(() => {
    if (!betAmount) return BigInt(0);
    return betAmount * BigInt(6);
  }, [betAmount]);

  // Update user balance and allowance
  const updateBalance = useCallback(async () => {
    if (!contracts.token || !account) return;

    try {
      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.dice.target),
      ]);

      setUserBalance(balance);
      setAllowance(tokenAllowance);
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  }, [contracts.token, contracts.dice, account]);

  // Update game state
  const updateGameState = useCallback(async () => {
    if (!contracts.dice || !account) return;

    try {
      const [gameStatus, requestDetails, canPlay] = await Promise.all([
        contracts.dice.getGameStatus(account),
        contracts.dice.getCurrentRequestDetails(account),
        contracts.dice.canStartNewGame(account),
      ]);

      const [isActive, status, chosenNumber, amount, timestamp] = gameStatus;
      const [requestId, requestFulfilled, requestActive] = requestDetails;

      setGameState((prev) => ({
        ...prev,
        isActive,
        needsResolution: requestFulfilled && !requestActive,
        requestId: requestId.toString(),
        lastResult: status > 1 ? chosenNumber : null,
        canPlay: canPlay && !isActive,
      }));
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  }, [contracts.dice, account]);

  // Update bet history
  const updateBetHistory = useCallback(async () => {
    if (!contracts.dice || !account) return;

    try {
      const history = await contracts.dice.getPreviousBets(account);
      setBetHistory(history);
    } catch (error) {
      console.error("Error updating bet history:", error);
    }
  }, [contracts.dice, account]);

  // Initialize component
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        updateBalance(),
        updateGameState(),
        updateBetHistory(),
      ]);
    };

    init();
  }, [updateBalance, updateGameState, updateBetHistory]);

  // Handle number selection
  const handleNumberSelect = (number) => {
    setChosenNumber(number);
  };

  // Handle bet amount change
  const handleBetAmountChange = (amount) => {
    setBetAmount(amount);
  };

  // Handle approve tokens
  const handleApprove = async () => {
    if (!contracts.token || !account) return;

    setLoadingStates((prev) => ({ ...prev, approving: true }));
    setLoadingMessage("Approving tokens...");

    try {
      const tx = await contracts.token.approve(
        contracts.dice.target,
        betAmount
      );
      await tx.wait();
      await updateBalance();
      addToast("Tokens approved successfully!", "success");
    } catch (error) {
      onError(error, "approve");
    } finally {
      setLoadingStates((prev) => ({ ...prev, approving: false }));
      setLoadingMessage("");
    }
  };

  // Handle place bet
  const handlePlaceBet = async () => {
    if (!contracts.dice || !account || !chosenNumber) return;

    setLoadingStates((prev) => ({ ...prev, betting: true }));
    setLoadingMessage("Placing bet...");

    try {
      const tx = await contracts.dice.playDice(chosenNumber, betAmount);
      await tx.wait();

      setGameState((prev) => ({
        ...prev,
        isActive: true,
        isProcessing: true,
        canPlay: false,
        isRolling: true,
      }));

      await Promise.all([updateBalance(), updateGameState()]);
      addToast("Bet placed successfully!", "success");
    } catch (error) {
      onError(error, "placeBet");
    } finally {
      setLoadingStates((prev) => ({ ...prev, betting: false }));
      setLoadingMessage("");
    }
  };

  // Handle resolve game
  const handleResolveGame = async () => {
    if (!contracts.dice || !account) return;

    setLoadingStates((prev) => ({ ...prev, resolving: true }));
    setLoadingMessage("Resolving game...");

    try {
      const tx = await contracts.dice.resolveGame();
      await tx.wait();

      await Promise.all([
        updateBalance(),
        updateGameState(),
        updateBetHistory(),
      ]);

      addToast("Game resolved successfully!", "success");
    } catch (error) {
      onError(error, "resolveGame");
    } finally {
      setLoadingStates((prev) => ({ ...prev, resolving: false }));
      setLoadingMessage("");
      setGameState((prev) => ({ ...prev, isRolling: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Game Status Panel */}
        <div className="glass-effect p-6 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatusPanel gameState={gameState} />
            <BalancePanel
              userBalance={userBalance}
              allowance={allowance}
              potentialWinnings={potentialWinnings}
            />
          </div>
        </div>

        {/* Dice Visualization */}
        <div className="glass-effect p-6 rounded-2xl">
          <DiceVisualizer
            chosenNumber={chosenNumber}
            isRolling={gameState.isRolling}
            result={gameState.lastResult}
          />
        </div>

        {/* Game Controls */}
        <div className="glass-effect p-6 rounded-2xl">
          <h2
            className="text-2xl font-bold mb-6 bg-clip-text text-transparent 
                       bg-gradient-to-r from-gaming-primary to-gaming-accent"
          >
            Place Your Bet
          </h2>

          {/* Number Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Choose Your Number</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((number) => (
                <motion.button
                  key={number}
                  onClick={() => handleNumberSelect(number)}
                  className={`number-button ${
                    chosenNumber === number ? "number-button-selected" : ""
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!gameState.canPlay}
                >
                  <span>{number}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Bet Amount */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Bet Amount</h3>
            <BetInput
              value={betAmount}
              onChange={handleBetAmountChange}
              userBalance={userBalance.toString()}
              disabled={!gameState.canPlay}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {allowance < betAmount && (
              <motion.button
                onClick={handleApprove}
                className="btn-gaming flex-1"
                disabled={!gameState.canPlay}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Approve Tokens
              </motion.button>
            )}

            <motion.button
              onClick={handlePlaceBet}
              className="btn-gaming flex-1"
              disabled={
                !gameState.canPlay ||
                !chosenNumber ||
                betAmount <= BigInt(0) ||
                allowance < betAmount
              }
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Place Bet
            </motion.button>

            {gameState.needsResolution && (
              <motion.button
                onClick={handleResolveGame}
                className="btn-gaming flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Resolve Game
              </motion.button>
            )}
          </div>
        </div>

        {/* Game History */}
        <div className="glass-effect p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2
              className="text-2xl font-bold bg-clip-text text-transparent 
                         bg-gradient-to-r from-gaming-primary to-gaming-accent"
            >
              Betting History
            </h2>
            <button
              onClick={() => setShowStats(!showStats)}
              className="btn-secondary"
            >
              {showStats ? "Hide Stats" : "Show Stats"}
            </button>
          </div>

          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-6"
              >
                <GameStats diceContract={contracts.dice} account={account} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Chosen</th>
                  <th className="text-left p-2">Rolled</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Result</th>
                  <th className="text-left p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {betHistory.map((bet, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border-b border-secondary-800/30
                              ${
                                bet.rolledNumber === bet.chosenNumber
                                  ? "text-gaming-success"
                                  : "text-gaming-error"
                              }`}
                  >
                    <td className="p-2">{bet.chosenNumber.toString()}</td>
                    <td className="p-2">{bet.rolledNumber.toString()}</td>
                    <td className="p-2">
                      {ethers.formatEther(bet.amount.toString())}
                    </td>
                    <td className="p-2">
                      {bet.rolledNumber === bet.chosenNumber ? "WIN" : "LOSS"}
                    </td>
                    <td className="p-2">
                      {new Date(Number(bet.timestamp) * 1000).toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

function AdminPage({
  diceContract,
  tokenContract,
  account,
  onError,
  addToast,
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [minters, setMinters] = useState([]);
  const [burners, setBurners] = useState([]);
  const [newAddress, setNewAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState("MINTER_ROLE");
  const [activeGames, setActiveGames] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if game is paused
        const paused = await diceContract.paused();
        setIsPaused(paused);

        // Get minters and burners
        const { minters: m, burners: b } =
          await tokenContract.getMinterBurnerAddresses();
        setMinters(m);
        setBurners(b);
      } catch (err) {
        onError(err, "admin initialization");
      }
    };

    init();
  }, [diceContract, tokenContract]);

  const handlePauseToggle = async () => {
    try {
      if (isPaused) {
        await diceContract.unpause();
        addToast("Game unpaused successfully", "success");
      } else {
        await diceContract.pause();
        addToast("Game paused successfully", "success");
      }
      setIsPaused(!isPaused);
    } catch (err) {
      onError(err, "pause toggle");
    }
  };

  const handleRoleManagement = async (action) => {
    try {
      if (!ethers.isAddress(newAddress)) {
        addToast("Invalid address", "error");
        return;
      }

      const role = await tokenContract[selectedRole]();

      if (action === "grant") {
        await tokenContract.grantRole(role, newAddress);
        addToast(`${selectedRole} granted successfully`, "success");
      } else {
        await tokenContract.revokeRole(role, newAddress);
        addToast(`${selectedRole} revoked successfully`, "success");
      }

      // Refresh lists
      const { minters: m, burners: b } =
        await tokenContract.getMinterBurnerAddresses();
      setMinters(m);
      setBurners(b);
    } catch (err) {
      onError(err, "role management");
    }
  };

  const handleForceStopGame = async (playerAddress) => {
    try {
      await diceContract.forceStopGame(playerAddress);
      addToast("Game stopped successfully", "success");
      // Refresh active games list
    } catch (err) {
      onError(err, "force stop game");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Game Control */}
      <section className="glass-effect p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Game Control</h2>
        <button
          onClick={handlePauseToggle}
          className={`btn-gaming ${
            isPaused ? "bg-success-600" : "bg-error-600"
          }`}
        >
          {isPaused ? "Unpause Game" : "Pause Game"}
        </button>
      </section>

      {/* Role Management */}
      <section className="glass-effect p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Role Management</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Enter address"
              className="input-gaming flex-1"
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="select-gaming"
            >
              <option value="MINTER_ROLE">Minter</option>
              <option value="BURNER_ROLE">Burner</option>
            </select>
            <button
              onClick={() => handleRoleManagement("grant")}
              className="btn-gaming bg-success-600"
            >
              Grant
            </button>
            <button
              onClick={() => handleRoleManagement("revoke")}
              className="btn-gaming bg-error-600"
            >
              Revoke
            </button>
          </div>

          {/* Role Lists */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Minters</h3>
              <ul className="space-y-2">
                {minters.map((address) => (
                  <li key={address} className="text-sm text-gray-300">
                    {address}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Burners</h3>
              <ul className="space-y-2">
                {burners.map((address) => (
                  <li key={address} className="text-sm text-gray-300">
                    {address}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Active Games */}
      <section className="glass-effect p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Active Games</h2>
        <div className="space-y-4">
          {activeGames.map((game) => (
            <div
              key={game.player}
              className="flex justify-between items-center"
            >
              <span>{game.player}</span>
              <button
                onClick={() => handleForceStopGame(game.player)}
                className="btn-gaming bg-error-600"
              >
                Force Stop
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Main App Component
function App() {
  // Core States
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

  // Loading States
  const [loadingStates, setLoadingStates] = useState({
    provider: true,
    contracts: true,
    wallet: false,
    transaction: false,
  });
  const [loadingMessage, setLoadingMessage] = useState("");

  // Error Handler
  const handleError = useCallback((error, context = "") => {
    console.error(`Error in ${context}:`, error);
    let errorMessage = "An unknown error occurred";

    // Contract-specific error handling
    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user";
    } else if (error.code === -32603) {
      errorMessage =
        "Internal JSON-RPC error. Please check your wallet connection.";
    } else if (error.message?.includes("insufficient funds")) {
      errorMessage = "Insufficient token balance for this operation";
    } else if (error.message?.includes("ERC20: insufficient allowance")) {
      errorMessage = "Please approve token usage before proceeding";
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
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
        throw new Error("Please switch to Amoy Testnet (Chain ID: 80002)");
      }

      return currentChainId;
    } catch (error) {
      throw error;
    }
  }, []);

  // Contract Initialization
  const initializeContracts = useCallback(
    async (signer) => {
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
  // Update the handleAccountsChanged function
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
          // Check for both DEFAULT_ADMIN_ROLE and owner status
          const DEFAULT_ADMIN_ROLE = await contracts.token.DEFAULT_ADMIN_ROLE();
          const hasAdminRole = await contracts.token.hasRole(
            DEFAULT_ADMIN_ROLE,
            newAccount
          );
          const isOwner = await contracts.dice.isOwner(newAccount);

          setIsAdmin(hasAdminRole || isOwner);

          console.log("Admin check:", {
            account: newAccount,
            hasAdminRole,
            isOwner,
            isAdmin: hasAdminRole || isOwner,
          });
        } catch (err) {
          console.error("Error checking admin status:", err);
          setIsAdmin(false);
        }
      }
    }
  };

  // Add this useEffect to recheck admin status when contracts are initialized
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (contracts.token && contracts.dice && account) {
        try {
          const DEFAULT_ADMIN_ROLE = await contracts.token.DEFAULT_ADMIN_ROLE();
          const hasAdminRole = await contracts.token.hasRole(
            DEFAULT_ADMIN_ROLE,
            account
          );
          const isOwner = await contracts.dice.isOwner(account);
          setIsAdmin(hasAdminRole || isOwner);
        } catch (err) {
          console.error("Error checking admin status:", err);
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [contracts.token, contracts.dice, account]);

  // Chain Change Handler
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

          const contractsData = await initializeContracts(signer);
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
        setLoadingStates((prev) => ({
          ...prev,
          provider: false,
          contracts: false,
        }));
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

  // Loading Check
  if (Object.values(loadingStates).some((state) => state)) {
    return <LoadingOverlay message={loadingMessage} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-secondary-900">
        {/* Network Warning */}
        {chainId && !SUPPORTED_CHAIN_IDS.includes(chainId) && (
          <NetworkWarning />
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
                <DicePage
                  contracts={contracts}
                  account={account}
                  onError={handleError}
                  addToast={addToast}
                  setLoadingStates={setLoadingStates}
                  setLoadingMessage={setLoadingMessage}
                />
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
