import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
import { debounce } from "lodash";

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
const Toast = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className={`fixed bottom-4 right-4 max-w-md w-full mx-4 p-4 rounded-xl shadow-xl 
                backdrop-blur-md border transition-all duration-300 z-50
                ${
                  type === "success"
                    ? "bg-gaming-success/10 border-gaming-success/30"
                    : type === "error"
                    ? "bg-gaming-error/10 border-gaming-error/30"
                    : type === "warning"
                    ? "bg-gaming-warning/10 border-gaming-warning/30"
                    : "bg-gaming-info/10 border-gaming-info/30"
                }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div
          className={`p-2 rounded-full 
                      ${
                        type === "success"
                          ? "bg-gaming-success/20"
                          : type === "error"
                          ? "bg-gaming-error/20"
                          : type === "warning"
                          ? "bg-gaming-warning/20"
                          : "bg-gaming-info/20"
                      }`}
        >
          {/* Icon based on type */}
        </div>
        <p className="text-white/90 font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white/90 transition-colors"
      >
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </motion.div>
);

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
  <div className="fixed inset-0 bg-secondary-900/90 backdrop-blur-lg flex items-center justify-center z-50">
    <div className="bg-secondary-800/80 p-8 rounded-2xl shadow-xl border border-gaming-primary/20 max-w-md w-full mx-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gaming-primary/20 animate-spin"></div>
          <div className="absolute inset-0 rounded-full border-4 border-gaming-primary border-t-transparent animate-spin-reverse"></div>
        </div>
        <p className="text-white/80 text-center font-medium">{message}</p>
      </div>
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
      value: allowance > 0 ? "Approved" : "Not Approved",
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
    if (value === "Approved" || value === "Not Approved") return value;
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
        duration: 1.5,
        ease: "easeInOut",
        times: [0, 0.2, 0.5, 1],
      },
    },
    static: {
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const dotPositions = {
    1: [{ index: 4 }],
    2: [{ index: 0 }, { index: 8 }],
    3: [{ index: 0 }, { index: 4 }, { index: 8 }],
    4: [{ index: 0 }, { index: 2 }, { index: 6 }, { index: 8 }],
    5: [{ index: 0 }, { index: 2 }, { index: 4 }, { index: 6 }, { index: 8 }],
    6: [
      { index: 0 },
      { index: 2 },
      { index: 3 },
      { index: 5 },
      { index: 6 },
      { index: 8 },
    ],
  };

  const renderDots = (number) => {
    const validNumber = Math.max(1, Math.min(6, Number(number) || 1));
    const dots = dotPositions[validNumber] || [];

    return (
      <div className="relative w-full h-full grid grid-cols-3 grid-rows-3 gap-2 p-4">
        {Array(9)
          .fill(null)
          .map((_, index) => {
            const isActive = dots.some((dot) => dot.index === index);
            return (
              <div
                key={index}
                className={`flex items-center justify-center transition-all duration-300
                ${isActive ? "scale-100" : "scale-0"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full 
                  ${
                    isActive
                      ? "bg-gradient-to-br from-white to-white/80 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                      : "bg-transparent"
                  }`}
                />
              </div>
            );
          })}
      </div>
    );
  };

  const displayNumber = result || chosenNumber || 1;

  return (
    <div className="relative w-full max-w-[200px] mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRolling ? "rolling" : displayNumber}
          variants={diceVariants}
          animate={isRolling ? "rolling" : "static"}
          className="w-full aspect-square"
        >
          <div className="dice-container">
            <div className="dice-face">
              <div className="absolute inset-0 bg-gradient-to-br from-gaming-primary/30 to-gaming-accent/30 rounded-xl backdrop-blur-sm" />
              {renderDots(displayNumber)}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
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
  const timeoutRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!diceContract || !requestId) return;

    const checkRequest = async () => {
      try {
        if (!isMounted.current) return;

        const [isActive, requestDetails] = await Promise.all([
          diceContract.isRequestActive(requestId),
          diceContract.getPlayerForRequest(requestId),
        ]);

        if (!isMounted.current) return;

        if (!isActive) {
          onComplete && onComplete();
          return;
        }

        if (attempts >= MAX_ATTEMPTS) {
          onError && onError(new Error("Request monitoring timed out"));
          return;
        }

        setAttempts((prev) => prev + 1);
        timeoutRef.current = setTimeout(checkRequest, 2000);
      } catch (error) {
        if (isMounted.current) {
          console.error("Error monitoring request:", error);
          onError && onError(error);
        }
      }
    };

    checkRequest();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [diceContract, requestId, attempts, onComplete, onError, MAX_ATTEMPTS]);

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

      // First get the bets
      const bets = await diceContract.getPreviousBets(account);

      // Process bets into readable format and calculate stats directly
      const processedGames = bets
        .map((bet) => ({
          chosenNumber: Number(bet.chosenNumber),
          rolledNumber: Number(bet.rolledNumber),
          amount: bet.amount.toString(),
          timestamp: Number(bet.timestamp),
          isWin: Number(bet.chosenNumber) === Number(bet.rolledNumber),
        }))
        .reverse(); // Add reverse() here to show most recent games first

      // Calculate stats from processed games
      const winsCount = processedGames.filter((game) => game.isWin).length;
      const lossesCount = processedGames.length - winsCount;

      setGames(processedGames);
      setStats({
        totalGamesWon: winsCount,
        totalGamesLost: lossesCount,
      });
    } catch (error) {
      console.error("Error fetching game history:", error);
      setGames([]);
      setStats({
        totalGamesWon: 0,
        totalGamesLost: 0,
      });
      onError(error);
    } finally {
      setLoading(false);
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

// Icons Component
const Icons = {
  Dice: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      <path d="M6.5 9L10 5.5 13.5 9 10 12.5z" />
    </svg>
  ),

  Roulette: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  MetaMask: ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15.75h.008v.008H12v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
};

// Game Card Component
const GameCard = ({ game }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="game-card relative"
  >
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-4">
        <div className="p-4 rounded-xl bg-gaming-primary/10">{game.icon}</div>
        <h3 className="text-2xl font-bold font-display">{game.title}</h3>
      </div>
      <span
        className={`status-${game.status === "Live" ? "success" : "warning"}`}
      >
        {game.status}
      </span>
    </div>
    <p className="text-secondary-300 font-sans">{game.description}</p>
    <Link
      to={game.link}
      className={`gaming-button w-full text-center mt-6 ${
        game.status !== "Live" && "opacity-50 cursor-not-allowed"
      }`}
      onClick={(e) => game.status !== "Live" && e.preventDefault()}
    >
      {game.status === "Live" ? "Play Now" : "Coming Soon"}
    </Link>
  </motion.div>
);

// Token Card Component
const TokenCard = ({ icon: Icon, title, description, buttonText, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="glass-card-hover p-8 space-y-6"
  >
    <div className="h-12 w-12 rounded-xl bg-gaming-primary/10 flex items-center justify-center">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h3 className="text-xl font-semibold font-display mb-2">{title}</h3>
      <p className="text-secondary-300 font-sans">{description}</p>
    </div>
    <button onClick={onClick} className="gaming-button w-full">
      {buttonText}
    </button>
  </motion.div>
);

const Home = () => {
  const games = [
    {
      title: "Dice Game",
      description:
        "Roll the dice and win up to 6x your bet with our provably fair game",
      icon: <Icons.Dice className="w-8 h-8" />,
      status: "Live",
      link: "/dice",
      features: ["Provably Fair", "Instant Payouts", "Low House Edge"],
    },
    {
      title: "Roulette",
      description:
        "Experience the thrill of blockchain roulette with multiple betting options",
      icon: <Icons.Roulette className="w-8 h-8" />,
      status: "Coming Soon",
      link: "#",
      features: ["Multiple Betting Options", "European Style", "Live Results"],
    },
  ];

  const addTokenToMetaMask = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;
      if (!tokenAddress) {
        throw new Error("Token address not configured");
      }

      // Create a contract instance to get the actual symbol
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        TokenABI.abi,
        provider
      );
      const symbol = await tokenContract.symbol();

      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: symbol, // Use the actual symbol from the contract
            decimals: 18,
            // image field removed since we don't have a token image
          },
        },
      });

      if (wasAdded) {
        console.log("Token was added to MetaMask");
      }
    } catch (error) {
      console.error("Error adding token to MetaMask:", error.message);
      // Optionally add user feedback here
      alert("Failed to add token to MetaMask: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Welcome to <span className="text-gradient">GameX</span>
            </h1>
            <p className="text-xl text-secondary-300 mb-8 max-w-2xl mx-auto">
              Experience the future of gaming with blockchain technology.
              Provably fair games, instant payouts, and complete transparency.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-gaming"
                onClick={addTokenToMetaMask}
              >
                <Icons.MetaMask className="w-5 h-5 mr-2 inline-block" />
                Add GameX to MetaMask
              </motion.button>
              <Link to="/dice">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-gaming bg-secondary-700 hover:bg-secondary-600"
                >
                  Play Now
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-16 bg-secondary-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Our Games
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {games.map((game, index) => (
              <motion.div
                key={game.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="game-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {game.icon}
                    <h3 className="text-xl font-semibold text-white">
                      {game.title}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      game.status === "Live"
                        ? "bg-gaming-success/20 text-gaming-success"
                        : "bg-gaming-warning/20 text-gaming-warning"
                    }`}
                  >
                    {game.status}
                  </span>
                </div>
                <p className="text-secondary-300 mb-4">{game.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {game.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-3 py-1 rounded-full text-sm bg-secondary-700 text-secondary-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <Link to={game.link}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full btn-gaming ${
                      game.status !== "Live"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={game.status !== "Live"}
                  >
                    {game.status === "Live" ? "Play Now" : "Coming Soon"}
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Choose GameX?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Provably Fair",
                description:
                  "All games use verifiable random numbers through Chainlink VRF",
                icon: "🎲",
              },
              {
                title: "Instant Payouts",
                description: "Winnings are automatically sent to your wallet",
                icon: "⚡",
              },
              {
                title: "Low House Edge",
                description: "Competitive odds and transparent house edge",
                icon: "💎",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="stat-card"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-secondary-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gaming-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Start Playing?
            </h2>
            <p className="text-xl text-secondary-300 mb-8 max-w-2xl mx-auto">
              Join the future of gaming today and experience provably fair
              gameplay with instant payouts.
            </p>
            <Link to="/dice">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-gaming"
              >
                Start Playing Now
              </motion.button>
            </Link>
          </motion.div>
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

const GameStats = ({ diceContract, account }) => {
  const [stats, setStats] = useState({
    gamesWon: 0,
    totalWinnings: BigInt(0),
    biggestWin: BigInt(0),
  });
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const fetchStats = async () => {
      if (!diceContract || !account) return;

      try {
        setLoading(true);
        const bets = await diceContract.getPreviousBets(account);

        if (!isMounted.current) return;

        let totalWins = 0;
        let totalWinAmount = BigInt(0);
        let maxWin = BigInt(0);

        bets.forEach((bet) => {
          const isWin = Number(bet.chosenNumber) === Number(bet.rolledNumber);
          if (isWin) {
            totalWins++;
            const winAmount = BigInt(bet.amount) * BigInt(6);
            totalWinAmount += winAmount;
            if (winAmount > maxWin) {
              maxWin = winAmount;
            }
          }
        });

        if (!isMounted.current) return;

        setStats({
          gamesWon: totalWins,
          totalWinnings: totalWinAmount,
          biggestWin: maxWin,
        });
      } catch (error) {
        console.error("Error fetching game stats:", error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted.current = false;
    };
  }, [diceContract, account]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-800/50 rounded w-1/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-2/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="stat-card">
        <h3 className="text-secondary-400">Games Won</h3>
        <p className="text-2xl font-bold text-gaming-success">
          {stats.gamesWon}
        </p>
      </div>
      <div className="stat-card">
        <h3 className="text-secondary-400">Total Winnings</h3>
        <p className="text-2xl font-bold text-gaming-primary">
          {ethers.formatEther(stats.totalWinnings)} GameX
        </p>
      </div>
      <div className="stat-card">
        <h3 className="text-secondary-400">Biggest Win</h3>
        <p className="text-2xl font-bold text-gaming-accent">
          {ethers.formatEther(stats.biggestWin)} GameX
        </p>
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
    isRolling: false,
  });

  const monitorIntervalRef = useRef(null);
  const isMounted = useRef(true);

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, []);

  // Update game state
  const updateGameState = useCallback(async () => {
    if (!diceContract || !account || !isMounted.current) return;

    try {
      const [gameStatus, requestDetails, canPlay] = await Promise.all([
        diceContract.getGameStatus(account),
        diceContract.getCurrentRequestDetails(account),
        diceContract.canStartNewGame(account),
      ]);

      if (!isMounted.current) return;

      setGameState((prev) => ({
        ...prev,
        isActive: gameStatus.isActive,
        status: [
          "PENDING",
          "STARTED",
          "COMPLETED_WIN",
          "COMPLETED_LOSS",
          "CANCELLED",
        ][Number(gameStatus.status)],
        result: gameStatus.status > 1 ? Number(gameStatus.rolledNumber) : null,
        requestId: requestDetails.requestId.toString(),
        needsResolution:
          requestDetails.requestFulfilled && !requestDetails.requestActive,
        canPlay,
        isProcessing: false,
      }));

      onGameStateChange && onGameStateChange(gameStatus);
    } catch (error) {
      if (isMounted.current) {
        console.error("Error updating game state:", error);
        onError(error);
      }
    }
  }, [diceContract, account, onGameStateChange, onError]);

  // Update balance
  const updateBalance = useCallback(async () => {
    if (!tokenContract || !account || !isMounted.current) return;

    try {
      const balance = await tokenContract.balanceOf(account);
      if (!isMounted.current) return;
      onBalanceChange && onBalanceChange(balance);
    } catch (error) {
      if (isMounted.current) {
        console.error("Error updating balance:", error);
        onError(error);
      }
    }
  }, [tokenContract, account, onBalanceChange, onError]);

  // Initialize component
  useEffect(() => {
    const init = async () => {
      await Promise.all([updateGameState(), updateBalance()]);
    };

    init();

    // Set up polling interval for updates
    const updateInterval = setInterval(init, 10000);

    return () => {
      clearInterval(updateInterval);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, [updateGameState, updateBalance]);

  // Resolve game
  const resolveGame = async () => {
    if (!diceContract || !account || !isMounted.current) return;
    if (gameState.isProcessing) return;

    try {
      if (isMounted.current) {
        setGameState((prev) => ({ ...prev, isProcessing: true }));
      }

      const tx = await diceContract.resolveGame();
      await tx.wait();

      if (!isMounted.current) return;

      addToast("Game resolved successfully!", "success");

      await Promise.all([updateGameState(), updateBalance()]);
    } catch (error) {
      if (isMounted.current) {
        console.error("Error resolving game:", error);
        onError(error);
      }
    } finally {
      if (isMounted.current) {
        setGameState((prev) => ({ ...prev, isProcessing: false }));
      }
    }
  };

  // Place bet
  const placeBet = async () => {
    if (!diceContract || !tokenContract || !account || !isMounted.current)
      return;
    if (gameState.isProcessing || !chosenNumber || betAmount <= 0) return;

    // Clear any existing monitoring interval
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }

    try {
      if (isMounted.current) {
        setGameState((prev) => ({ ...prev, isProcessing: true }));
      }

      // Check allowance
      const allowance = await tokenContract.allowance(
        account,
        diceContract.address
      );
      if (allowance < betAmount) {
        const approveTx = await tokenContract.approve(
          diceContract.address,
          ethers.MaxUint256
        );
        await approveTx.wait();
        if (!isMounted.current) return;
        addToast("Token approval successful", "success");
      }

      const tx = await diceContract.playDice(chosenNumber, betAmount);
      await tx.wait();

      if (!isMounted.current) return;

      addToast("Bet placed successfully!", "success");
      setGameState((prev) => ({ ...prev, isRolling: true }));
      await updateGameState();
      await updateBalance();

      // Start monitoring for game resolution
      monitorIntervalRef.current = setInterval(async () => {
        try {
          if (!isMounted.current) {
            clearInterval(monitorIntervalRef.current);
            return;
          }

          const status = await diceContract.getGameStatus(account);
          if (Number(status.status) > 1) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
            if (isMounted.current) {
              await resolveGame();
            }
          }
        } catch (error) {
          if (isMounted.current) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
            onError(error);
          }
        }
      }, 2000);
    } catch (error) {
      if (isMounted.current) {
        console.error("Error placing bet:", error);
        onError(error);
      }
    } finally {
      if (isMounted.current) {
        setGameState((prev) => ({ ...prev, isProcessing: false }));
      }
    }
  };

  // Handle component unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Game Status */}
      <div className="text-lg font-semibold">
        <div
          className={`status-badge ${
            gameState.status === "COMPLETED_WIN"
              ? "status-success"
              : gameState.status === "COMPLETED_LOSS"
              ? "status-error"
              : gameState.status === "STARTED"
              ? "status-warning"
              : "status-info"
          }`}
        >
          {gameState.status}
          {gameState.result && ` (Result: ${gameState.result})`}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        {/* Place Bet Button */}
        <button
          className={`btn-gaming ${
            !gameState.canPlay || gameState.isProcessing
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          onClick={placeBet}
          disabled={
            !gameState.canPlay ||
            gameState.isProcessing ||
            !chosenNumber ||
            betAmount <= 0
          }
        >
          {gameState.isProcessing ? (
            <span className="flex items-center">
              <LoadingSpinner size="small" />
              <span className="ml-2">Processing...</span>
            </span>
          ) : (
            "Place Bet"
          )}
        </button>

        {/* Resolve Game Button */}
        {gameState.needsResolution && (
          <button
            className={`btn-gaming ${
              gameState.isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={resolveGame}
            disabled={gameState.isProcessing}
          >
            {gameState.isProcessing ? (
              <span className="flex items-center">
                <LoadingSpinner size="small" />
                <span className="ml-2">Resolving...</span>
              </span>
            ) : (
              "Resolve Game"
            )}
          </button>
        )}
      </div>

      {/* Processing Indicator */}
      {gameState.isProcessing && (
        <div className="text-sm text-secondary-400 animate-pulse">
          Transaction in progress...
        </div>
      )}

      {/* Game Result Animation */}
      {gameState.isRolling && (
        <div className="dice-container">
          <div className="dice-face animate-spin">
            {/* Dice animation content */}
          </div>
        </div>
      )}
    </div>
  );
};

const ApprovalButton = ({ onApprove, amount, isLoading }) => {
  return (
    <button
      onClick={onApprove}
      disabled={isLoading}
      className="btn-gaming w-full mb-4"
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
          <span>Approving...</span>
        </div>
      ) : (
        `Approve ${amount} GameX tokens`
      )}
    </button>
  );
};

// Win Animation Component
const WinAnimation = ({ onComplete }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onAnimationComplete={onComplete}
    className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="text-6xl font-bold text-gaming-success"
    >
      Winner!
    </motion.div>
  </motion.div>
);

// Lose Animation Component
const LoseAnimation = ({ onComplete }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onAnimationComplete={onComplete}
    className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="text-6xl font-bold text-gaming-error"
    >
      Try Again!
    </motion.div>
  </motion.div>
);

function AdminPage({
  diceContract,
  tokenContract,
  account,
  onError,
  addToast,
}) {
  const [gameStats, setGameStats] = useState({
    contractBalance: BigInt(0),
    isPaused: false,
    ownerCount: 0,
  });

  const [formInputs, setFormInputs] = useState({
    newAddress: "",
    selectedRole: "MINTER_ROLE",
    withdrawAmount: "",
    newOwnerAddress: "",
    mintAddress: "",
    mintAmount: "",
  });

  const [roleAddresses, setRoleAddresses] = useState({
    minters: [],
    burners: [],
  });

  const [loading, setLoading] = useState({
    stats: false,
    action: false,
  });

  const fetchGameStats = async () => {
    try {
      setLoading((prev) => ({ ...prev, stats: true }));
      const [balance, isPaused, ownerCount, { minters, burners }] =
        await Promise.all([
          diceContract.getContractBalance(),
          diceContract.paused(),
          diceContract.getOwnerCount(),
          tokenContract.getMinterBurnerAddresses(),
        ]);

      setGameStats({
        contractBalance: balance,
        isPaused,
        ownerCount,
      });

      setRoleAddresses({
        minters,
        burners,
      });
    } catch (error) {
      onError(error, "Fetching game stats");
    } finally {
      setLoading((prev) => ({ ...prev, stats: false }));
    }
  };

  useEffect(() => {
    fetchGameStats();
    const interval = setInterval(fetchGameStats, 10000);
    return () => clearInterval(interval);
  }, [diceContract, tokenContract]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleManagement = async (action) => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      if (!ethers.isAddress(formInputs.newAddress)) {
        addToast("Invalid address", "error");
        return;
      }

      const tx =
        action === "grant"
          ? await tokenContract.grantRole(
              formInputs.selectedRole,
              formInputs.newAddress
            )
          : await tokenContract.revokeRole(
              formInputs.selectedRole,
              formInputs.newAddress
            );

      await tx.wait();
      addToast(`Role ${action}ed successfully`, "success");
      await fetchGameStats();
      setFormInputs((prev) => ({ ...prev, newAddress: "" }));
    } catch (error) {
      onError(error, `${action}ing role`);
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      const amount = ethers.parseEther(formInputs.withdrawAmount);
      const tx = await diceContract.withdraw(amount);
      await tx.wait();
      addToast("Withdrawal successful", "success");
      await fetchGameStats();
      setFormInputs((prev) => ({ ...prev, withdrawAmount: "" }));
    } catch (error) {
      onError(error, "Withdrawing funds");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handlePauseToggle = async () => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      const tx = gameStats.isPaused
        ? await diceContract.unpause()
        : await diceContract.pause();
      await tx.wait();
      addToast(
        `Game ${gameStats.isPaused ? "unpaused" : "paused"} successfully`,
        "success"
      );
      await fetchGameStats();
    } catch (error) {
      onError(error, `${gameStats.isPaused ? "Unpausing" : "Pausing"} game`);
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleAddOwner = async () => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      if (!ethers.isAddress(formInputs.newOwnerAddress)) {
        addToast("Invalid address", "error");
        return;
      }

      const tx = await diceContract.addOwner(formInputs.newOwnerAddress);
      await tx.wait();
      addToast("Owner added successfully", "success");
      await fetchGameStats();
      setFormInputs((prev) => ({ ...prev, newOwnerAddress: "" }));
    } catch (error) {
      onError(error, "Adding owner");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  const handleMintTokens = async () => {
    try {
      setLoading((prev) => ({ ...prev, action: true }));
      if (!ethers.isAddress(formInputs.mintAddress)) {
        addToast("Invalid address", "error");
        return;
      }

      const amount = ethers.parseEther(formInputs.mintAmount);
      const tx = await tokenContract.mint(formInputs.mintAddress, amount);
      await tx.wait();
      addToast("Tokens minted successfully", "success");
      await fetchGameStats();
      setFormInputs((prev) => ({ ...prev, mintAddress: "", mintAmount: "" }));
    } catch (error) {
      onError(error, "Minting tokens");
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="game-card">
        <h2 className="text-xl font-bold">Game Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-secondary-400">Contract Balance</p>
            <p className="text-xl font-bold">
              {loading.stats
                ? "Loading..."
                : ethers.formatEther(gameStats.contractBalance)}{" "}
              ETH
            </p>
          </div>
          <div>
            <p className="text-secondary-400">Game Status</p>
            <p className="text-xl font-bold">
              {loading.stats
                ? "Loading..."
                : gameStats.isPaused
                ? "Paused"
                : "Active"}
            </p>
          </div>
          <div>
            <p className="text-secondary-400">Owner Count</p>
            <p className="text-xl font-bold">
              {loading.stats ? "Loading..." : gameStats.ownerCount}
            </p>
          </div>
        </div>
      </div>

      <div className="game-card">
        <h2 className="text-xl font-bold">Role Management</h2>
        <div className="space-y-4">
          <div>
            <label className="text-secondary-400">Address</label>
            <input
              type="text"
              name="newAddress"
              value={formInputs.newAddress}
              onChange={handleInputChange}
              className="input-gaming w-full"
              placeholder="Enter address"
            />
          </div>
          <div>
            <label className="text-secondary-400">Role</label>
            <select
              name="selectedRole"
              value={formInputs.selectedRole}
              onChange={handleInputChange}
              className="input-gaming w-full"
            >
              <option value="MINTER_ROLE">Minter</option>
              <option value="BURNER_ROLE">Burner</option>
            </select>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleRoleManagement("grant")}
              disabled={loading.action}
              className="btn-gaming flex-1"
            >
              Grant Role
            </button>
            <button
              onClick={() => handleRoleManagement("revoke")}
              disabled={loading.action}
              className="btn-gaming flex-1"
            >
              Revoke Role
            </button>
          </div>
        </div>
      </div>

      <div className="game-card">
        <h2 className="text-xl font-bold">Token Minting</h2>
        <div className="space-y-4">
          <div>
            <label className="text-secondary-400">Recipient Address</label>
            <input
              type="text"
              name="mintAddress"
              value={formInputs.mintAddress}
              onChange={handleInputChange}
              className="input-gaming w-full"
              placeholder="Enter recipient address"
            />
          </div>
          <div>
            <label className="text-secondary-400">Amount to Mint</label>
            <input
              type="text"
              name="mintAmount"
              value={formInputs.mintAmount}
              onChange={handleInputChange}
              className="input-gaming w-full"
              placeholder="Enter amount in GameX"
            />
          </div>
          <button
            onClick={handleMintTokens}
            disabled={loading.action}
            className="btn-gaming w-full"
          >
            {loading.action ? "Minting..." : "Mint Tokens"}
          </button>
        </div>
      </div>

      <div className="game-card">
        <h2 className="text-xl font-bold">Withdraw Funds</h2>
        <div className="space-y-4">
          <div>
            <label className="text-secondary-400">Amount (ETH)</label>
            <input
              type="text"
              name="withdrawAmount"
              value={formInputs.withdrawAmount}
              onChange={handleInputChange}
              className="input-gaming w-full"
              placeholder="Enter amount in ETH"
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={loading.action}
            className="btn-gaming w-full"
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="game-card">
        <h2 className="text-xl font-bold">Game Control</h2>
        <div className="space-y-4">
          <button
            onClick={handlePauseToggle}
            disabled={loading.action}
            className="btn-gaming w-full"
          >
            {gameStats.isPaused ? "Unpause Game" : "Pause Game"}
          </button>
        </div>
      </div>

      <div className="game-card">
        <h2 className="text-xl font-bold">Owner Management</h2>
        <div className="space-y-4">
          <div>
            <label className="text-secondary-400">New Owner Address</label>
            <input
              type="text"
              name="newOwnerAddress"
              value={formInputs.newOwnerAddress}
              onChange={handleInputChange}
              className="input-gaming w-full"
              placeholder="Enter new owner address"
            />
          </div>
          <button
            onClick={handleAddOwner}
            disabled={loading.action}
            className="btn-gaming w-full"
          >
            Add Owner
          </button>
        </div>
      </div>
    </div>
  );
}

const DicePage = ({
  contracts,
  account,
  onError,
  addToast,
  setLoadingStates,
  setLoadingMessage,
}) => {
  // State declarations first
  const [gameState, setGameState] = useState({
    isActive: false,
    status: "PENDING",
    lastResult: null,
    requestId: null,
    needsResolution: false,
    canPlay: true,
    isProcessing: false,
    isRolling: false,
    currentGameData: null,
  });

  const [isLoading, setIsLoading] = useState({
    gameState: false,
    balance: false,
    history: false,
  });

  const [chosenNumber, setChosenNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(BigInt(0));
  const [userBalance, setUserBalance] = useState(BigInt(0));
  const [allowance, setAllowance] = useState(BigInt(0));
  const [showStats, setShowStats] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [showLoseAnimation, setShowLoseAnimation] = useState(false);

  // Refs
  const monitorIntervalRef = useRef(null);
  const isMounted = useRef(true);

  // Define updateGameState and updateBalance functions first
  const updateGameState = useCallback(async () => {
    if (!contracts.dice || !account || !isMounted.current) return;

    try {
      const [gameStatus, requestDetails, canPlay] = await Promise.all([
        contracts.dice.getGameStatus(account),
        contracts.dice.getCurrentRequestDetails(account),
        contracts.dice.canStartNewGame(account),
      ]);

      if (!isMounted.current) return;

      const currentGameData = {
        gameStatus,
        requestDetails,
        canPlay,
      };

      setGameState((prev) => ({
        ...prev,
        isActive: gameStatus.isActive,
        status: [
          "PENDING",
          "STARTED",
          "COMPLETED_WIN",
          "COMPLETED_LOSS",
          "CANCELLED",
        ][Number(gameStatus.status)],
        lastResult:
          gameStatus.status > 1 ? Number(gameStatus.rolledNumber) : null,
        requestId: requestDetails.requestId.toString(),
        needsResolution:
          requestDetails.requestFulfilled && !requestDetails.requestActive,
        canPlay,
        currentGameData,
      }));
    } catch (error) {
      if (isMounted.current) {
        console.error("Error updating game state:", error);
        onError(error);
      }
    }
  }, [contracts.dice, account, onError]);

  const updateBalance = useCallback(async () => {
    if (!contracts.token || !account || !isMounted.current) return;

    try {
      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.dice.target),
      ]);

      if (!isMounted.current) return;

      setUserBalance(balance);
      setAllowance(tokenAllowance);
    } catch (error) {
      if (isMounted.current) {
        console.error("Error updating balance:", error);
        onError(error);
      }
    }
  }, [contracts.token, contracts.dice, account, onError]);

  // Now define debouncedFetch after updateGameState and updateBalance are defined
  const debouncedFetch = useMemo(
    () =>
      debounce(async () => {
        try {
          await Promise.all([updateGameState(), updateBalance()]);
        } catch (error) {
          onError(error);
        }
      }, 1000),
    [updateGameState, updateBalance, onError]
  );

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      debouncedFetch.cancel();
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, [debouncedFetch]);

  // Data fetching effect
  useEffect(() => {
    if (!contracts.dice || !account) return;

    const fetchData = async () => {
      setIsLoading((prev) => ({ ...prev, gameState: true, balance: true }));
      try {
        await Promise.all([updateGameState(), updateBalance()]);
      } catch (error) {
        onError(error);
      } finally {
        setIsLoading((prev) => ({ ...prev, gameState: false, balance: false }));
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    return () => {
      clearInterval(interval);
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, [contracts.dice, account, updateGameState, updateBalance, onError]);

  // Calculate potential winnings
  const potentialWinnings = useMemo(() => {
    if (!betAmount || betAmount <= 0) return BigInt(0);
    return betAmount * BigInt(6); // 6x multiplier for correct guess
  }, [betAmount]);

  // Handle game resolution
  // Inside DicePage component, update the handleGameResolution function:

  // Replace the existing handleGameResolution function with this version:
  const handleGameResolution = async () => {
    if (
      !gameState.needsResolution ||
      !isMounted.current ||
      !contracts.dice ||
      !account
    )
      return;
    if (gameState.isProcessing) return;

    try {
      const currentGameData = gameState.currentGameData;
      if (!currentGameData || !currentGameData.gameStatus.isActive) {
        setGameState((prev) => ({
          ...prev,
          isProcessing: false,
          isRolling: false,
          needsResolution: false,
          status: "PENDING",
        }));
        return;
      }

      setGameState((prev) => ({
        ...prev,
        isProcessing: true,
        isRolling: false,
      }));

      const tx = await contracts.dice.resolveGame();
      await tx.wait();

      if (!isMounted.current) return;

      const finalStatus = await contracts.dice.getGameStatus(account);
      const isWin = Number(finalStatus.status) === 2;

      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        isRolling: false,
        needsResolution: false,
        status: isWin ? "COMPLETED_WIN" : "COMPLETED_LOSS",
        lastResult: Number(finalStatus.rolledNumber),
        currentGameData: null,
      }));

      if (isWin) {
        setShowWinAnimation(true);
        addToast("Congratulations! You won!", "success");
      } else {
        setShowLoseAnimation(true);
        addToast("Better luck next time!", "warning");
      }

      // Use debounced fetch
      debouncedFetch();
    } catch (error) {
      if (!isMounted.current) return;
      console.error("Error resolving game:", error);
      onError(error);
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        isRolling: false,
        needsResolution: false,
      }));
    }
  };

  // Check and approve token
  const checkAndApproveToken = async (amount) => {
    if (!isMounted.current) return false;

    try {
      if (allowance < amount) {
        setGameState((prev) => ({ ...prev, isProcessing: true }));
        const tx = await contracts.token.approve(
          contracts.dice.target,
          ethers.MaxUint256
        );
        await tx.wait();

        if (!isMounted.current) return false;

        await updateBalance();
        addToast("Token approval successful", "success");
        return true;
      }
      return true;
    } catch (error) {
      if (isMounted.current) {
        console.error("Error approving tokens:", error);
        onError(error);
      }
      return false;
    } finally {
      if (isMounted.current) {
        setGameState((prev) => ({ ...prev, isProcessing: false }));
      }
    }
  };

  // Place bet
  // Replace the existing handlePlaceBet function with this version:
  const handlePlaceBet = async () => {
    if (!contracts.dice || !account || !chosenNumber || !isMounted.current)
      return;
    if (gameState.isProcessing || betAmount <= BigInt(0)) return;

    try {
      setGameState((prev) => ({ ...prev, isProcessing: true }));

      const approved = await checkAndApproveToken(betAmount);
      if (!approved || !isMounted.current) return;

      const tx = await contracts.dice.playDice(chosenNumber, betAmount);
      await tx.wait();

      if (!isMounted.current) return;

      setGameState((prev) => ({
        ...prev,
        isActive: true,
        isRolling: true,
      }));

      addToast("Bet placed successfully!", "success");

      // Use debounced fetch
      debouncedFetch();

      // Start monitoring for game resolution
      monitorIntervalRef.current = setInterval(async () => {
        try {
          if (!isMounted.current) {
            clearInterval(monitorIntervalRef.current);
            return;
          }

          const status = await contracts.dice.getGameStatus(account);
          if (Number(status.status) > 1) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
            if (isMounted.current) {
              await handleGameResolution();
            }
          }
        } catch (error) {
          if (isMounted.current) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
            onError(error);
          }
        }
      }, 2000);
    } catch (error) {
      if (isMounted.current) {
        console.error("Error placing bet:", error);
        onError(error);
      }
    } finally {
      if (isMounted.current) {
        setGameState((prev) => ({ ...prev, isProcessing: false }));
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-10">
        {/* Game Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-gaming mb-4">
            Dice Game
          </h1>
          <p className="text-secondary-400 text-lg">
            Choose a number, place your bet, and test your luck!
          </p>
        </div>

        {/* Loading States */}
        {(isLoading.gameState || isLoading.balance) && (
          <div className="glass-panel p-4">
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span className="text-secondary-400">
                {isLoading.gameState
                  ? "Updating game state..."
                  : "Updating balance..."}
              </span>
            </div>
          </div>
        )}

        {/* Game Status */}
        <div className="glass-panel p-6">
          <StatusIndicator
            status={gameState.status}
            isActive={gameState.isActive}
          />
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Game Controls */}
          <div className="space-y-8">
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-8 text-white/90">
                Place Your Bet
              </h2>

              {/* Number Selection */}
              <div className="mb-8">
                <NumberSelector
                  value={chosenNumber}
                  onChange={setChosenNumber}
                  disabled={!gameState.canPlay || gameState.isProcessing}
                />
              </div>

              {/* Bet Amount Input */}
              <div className="mb-8">
                <BetInput
                  value={betAmount}
                  onChange={setBetAmount}
                  userBalance={userBalance.toString()}
                  disabled={!gameState.canPlay || gameState.isProcessing}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                {betAmount > BigInt(0) && allowance < betAmount && (
                  <button
                    onClick={() => checkAndApproveToken(betAmount)}
                    disabled={gameState.isProcessing}
                    className="btn-gaming h-14 w-full"
                  >
                    {gameState.isProcessing ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="small" />
                        <span className="ml-2">Approving...</span>
                      </span>
                    ) : (
                      "Approve Tokens"
                    )}
                  </button>
                )}

                <button
                  onClick={handlePlaceBet}
                  disabled={
                    !gameState.canPlay ||
                    !chosenNumber ||
                    betAmount <= BigInt(0) ||
                    allowance < betAmount ||
                    gameState.isProcessing
                  }
                  className="btn-gaming h-14 w-full"
                >
                  {gameState.isProcessing ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Processing...</span>
                    </span>
                  ) : (
                    "Place Bet"
                  )}
                </button>

                {gameState.needsResolution && (
                  <button
                    onClick={handleGameResolution}
                    disabled={gameState.isProcessing}
                    className="btn-gaming h-14 w-full"
                  >
                    {gameState.isProcessing ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="small" />
                        <span className="ml-2">Revealing...</span>
                      </span>
                    ) : (
                      "Reveal Result"
                    )}
                  </button>
                )}
              </div>
            </div>

            <BalancePanel
              userBalance={userBalance}
              allowance={allowance}
              potentialWinnings={potentialWinnings}
            />
          </div>

          {/* Right Column - Game Visualization */}
          <div className="space-y-8">
            <div className="glass-panel p-8 flex items-center justify-center min-h-[400px]">
              <DiceVisualizer
                chosenNumber={chosenNumber}
                isRolling={gameState.isRolling}
                result={gameState.lastResult}
              />
            </div>

            <div className="glass-panel p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white/90">Statistics</h2>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="btn-gaming px-4 py-2 text-sm"
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
                    className="overflow-hidden"
                  >
                    <GameStats
                      diceContract={contracts.dice}
                      account={account}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <GameHistory
          diceContract={contracts.dice}
          account={account}
          onError={onError}
        />
      </div>

      <AnimatePresence>
        {showWinAnimation && (
          <WinAnimation onComplete={() => setShowWinAnimation(false)} />
        )}
        {showLoseAnimation && (
          <LoseAnimation onComplete={() => setShowLoseAnimation(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

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
    let errorMessage = "Something went wrong. Please try again.";

    // User rejected transaction
    if (error.code === 4001) {
      errorMessage =
        "Transaction cancelled - No worries, you can try again when ready!";
    }
    // Network/RPC error
    else if (error.code === -32603) {
      errorMessage =
        "Network connection issue. Please check your wallet connection and try again.";
    }
    // Contract specific errors
    else if (error.message) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Not enough tokens in your wallet for this bet";
      } else if (error.message.includes("ERC20: insufficient allowance")) {
        errorMessage = "Please approve tokens before placing your bet";
      } else if (error.message.includes("user rejected")) {
        errorMessage =
          "Transaction cancelled - No worries, you can try again when ready!";
      } else if (error.message.includes("nonce")) {
        errorMessage = "Transaction sequence error. Please try again";
      } else if (error.message.includes("gas")) {
        errorMessage =
          "Network is busy. Please try again with higher gas or wait a moment";
      }
      // Contract custom errors
      else if (error.message.includes("InvalidBetParameters")) {
        errorMessage =
          "Invalid bet amount or number selection. Please check and try again";
      } else if (error.message.includes("InsufficientContractBalance")) {
        errorMessage =
          "Game contract balance too low for this bet. Please try a smaller amount";
      } else if (error.message.includes("PayoutCalculationError")) {
        errorMessage = "Error calculating potential winnings. Please try again";
      } else if (error.message.includes("GameError")) {
        errorMessage =
          "Game is currently paused or unavailable. Please try again later";
      }
      // Keep original message if it's a custom user-friendly message
      else if (
        error.message.length < 100 &&
        !error.message.includes("execution reverted")
      ) {
        errorMessage = error.message;
      }
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
  // Enhanced contract initialization with better error handling
  // Contract Initialization
  const initializeContracts = useCallback(
    async (signer) => {
      if (!signer) {
        throw new Error("No signer provided");
      }

      if (!DICE_CONTRACT_ADDRESS || !TOKEN_CONTRACT_ADDRESS) {
        throw new Error(
          "Contract addresses not found in environment variables"
        );
      }

      try {
        // First verify if contracts exist at the addresses
        const provider = signer.provider;
        const diceCode = await provider.getCode(DICE_CONTRACT_ADDRESS);
        const tokenCode = await provider.getCode(TOKEN_CONTRACT_ADDRESS);

        if (diceCode === "0x" || tokenCode === "0x") {
          throw new Error(
            "One or more contracts not deployed at specified addresses"
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

        // Use try/catch for each contract verification
        try {
          // Use a simple view function instead of complex ones
          await tokenContract.name();
          await diceContract.owner(); // or another simple view function from your Dice contract
        } catch (verifyError) {
          console.error("Contract verification failed:", verifyError);
          throw new Error(
            "Contract interface mismatch or contracts not properly deployed"
          );
        }

        setContracts({
          dice: diceContract,
          token: tokenContract,
        });

        return { diceContract, tokenContract };
      } catch (err) {
        const errorMessage = err.message || "Contract initialization failed";
        console.error("Contract initialization error details:", err);
        handleError(
          new Error(`Contract initialization failed: ${errorMessage}`),
          "initializeContracts"
        );
        throw err;
      }
    },
    [handleError]
  );

  // Enhanced wallet connection with better error handling
  const connectWallet = async () => {
    setLoadingStates((prev) => ({ ...prev, wallet: true }));
    setLoadingMessage("Connecting to wallet...");

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const chainId = await validateNetwork(provider);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const signer = await provider.getSigner();
      setProvider(provider);
      setSigner(signer);

      try {
        const contractsData = await initializeContracts(signer);
        if (!contractsData) {
          throw new Error("Failed to initialize contracts");
        }

        await handleAccountsChanged(accounts);
        addToast("Wallet connected successfully!", "success");
      } catch (contractError) {
        // Reset state on contract initialization failure
        setProvider(null);
        setSigner(null);
        throw contractError;
      }
    } catch (err) {
      handleError(err, "connectWallet");
      // Reset all states on error
      setProvider(null);
      setSigner(null);
      setContracts({ dice: null, token: null });
    } finally {
      setLoadingStates((prev) => ({ ...prev, wallet: false }));
      setLoadingMessage("");
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setAccount("");
      setIsAdmin(false);
      addToast("Please connect your wallet", "warning");
    } else {
      const newAccount = accounts[0];
      setAccount(newAccount);

      if (contracts.token && contracts.dice) {
        try {
          // First check token admin role
          const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // This is equivalent to bytes32(0)
          let hasAdminRole = false;
          let isOwner = false;

          try {
            hasAdminRole = await contracts.token.hasRole(
              DEFAULT_ADMIN_ROLE,
              newAccount
            );
          } catch (err) {
            console.error("Error checking token admin role:", err);
          }

          try {
            isOwner = await contracts.dice.isOwner(newAccount);
          } catch (err) {
            console.error("Error checking dice owner status:", err);
          }

          setIsAdmin(hasAdminRole || isOwner);
          console.log("Admin status check:", {
            account: newAccount,
            hasAdminRole,
            isOwner,
            isAdmin: hasAdminRole || isOwner,
          });
        } catch (err) {
          console.error("Error in admin status check:", err);
          setIsAdmin(false);
        }
      }
    }
  };

  // Update the useEffect for admin status check
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!contracts.token || !contracts.dice || !account) {
        setIsAdmin(false);
        return;
      }

      try {
        // Check token admin role
        const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // This is equivalent to bytes32(0)
        let hasAdminRole = false;
        let isOwner = false;

        try {
          hasAdminRole = await contracts.token.hasRole(
            DEFAULT_ADMIN_ROLE,
            account
          );
        } catch (err) {
          console.error("Error checking token admin role:", err);
        }

        // Check dice owner status using view function
        try {
          isOwner = await contracts.dice.isOwner(account);
        } catch (err) {
          console.error("Error checking dice owner status:", err);
        }

        setIsAdmin(hasAdminRole || isOwner);
        console.log("Admin status check:", {
          account,
          hasAdminRole,
          isOwner,
          isAdmin: hasAdminRole || isOwner,
        });
      } catch (err) {
        console.error("Error in admin status check:", err);
        setIsAdmin(false);
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
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Remove toast after 5 seconds
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
        <AnimatePresence mode="popLayout">
          <div className="fixed bottom-4 right-4 space-y-2 z-50">
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                layout
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
