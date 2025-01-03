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
import {
  useQuery,
  useQueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import RoulettePage from "./pages/Roulette";

import DiceABI from "./contracts/abi/Dice.json";
import TokenABI from "./contracts/abi/GamaToken.json";
import RouletteABI from "./contracts/abi/Roulette.json";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// Environment variables
const DICE_CONTRACT_ADDRESS = process.env.REACT_APP_DICE_GAME_ADDRESS;
const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_ADDRESS;

// Add network constants at the top of the file
const NETWORKS = {
  MAINNET: {
    chainId: 50,
    name: "XDC Mainnet",
    rpcUrl: process.env.REACT_APP_XDC_MAINNET_RPC_URL,
    contracts: {
      dice: process.env.REACT_APP_DICE_GAME_ADDRESS,
      token: process.env.REACT_APP_TOKEN_ADDRESS,
      roulette: process.env.REACT_APP_ROULETTE_ADDRESS, // Make sure this is set
    },
  },
  APOTHEM: {
    chainId: 51,
    name: "XDC Apothem Testnet",
    rpcUrl: process.env.REACT_APP_XDC_APOTHEM_RPC_URL,
    contracts: {
      dice: process.env.REACT_APP_APOTHEM_DICE_GAME_ADDRESS,
      token: process.env.REACT_APP_APOTHEM_TOKEN_ADDRESS,
      roulette: process.env.REACT_APP_APOTHEM_ROULETTE_ADDRESS, // Make sure this is set
    },
  },
  AMOY: {
    chainId: 80002,
    name: "Amoy Testnet",
    rpcUrl: process.env.REACT_APP_AMOY_RPC_URL,
    contracts: {
      dice: process.env.REACT_APP_AMOY_DICE_GAME_ADDRESS,
      token: process.env.REACT_APP_AMOY_TOKEN_ADDRESS,
      roulette: process.env.REACT_APP_AMOY_ROULETTE_ADDRESS, // Make sure this is set
    },
  },
};

// Update supported chain IDs
const SUPPORTED_CHAIN_IDS = [
  NETWORKS.MAINNET.chainId,
  NETWORKS.APOTHEM.chainId,
  NETWORKS.AMOY.chainId,
];

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

const NetworkIndicator = ({ chainId }) => {
  const isApothem = chainId === NETWORKS.APOTHEM.chainId;
  const isAmoy = chainId === NETWORKS.AMOY.chainId;

  return (
    <div
      className={`
      flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
      ${
        isApothem
          ? "bg-blue-500/20 text-blue-400"
          : isAmoy
            ? "bg-purple-500/20 text-purple-400"
            : "bg-green-500/20 text-green-400"
      }
    `}
    >
      <span
        className={`
        w-2 h-2 rounded-full animate-pulse
        ${isApothem ? "bg-blue-400" : isAmoy ? "bg-purple-400" : "bg-green-400"}
      `}
      />
      {isApothem ? "Apothem Testnet" : isAmoy ? "Amoy Testnet" : "XDC Mainnet"}
    </div>
  );
};

const Navbar = ({
  account,
  connectWallet,
  loadingStates,
  isAdmin,
  chainId,
}) => (
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
              Dice
            </Link>
            <Link to="/roulette" className="nav-link">
              Roulette
            </Link>
            {isAdmin && (
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {chainId && <NetworkIndicator chainId={chainId} />}
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
    <p>
      Please switch to XDC Network(Chain ID: 50), Apothem Testnet(Chain ID: 51),
      or Amoy Testnet(Chain ID: 80002)
    </p>
    <div className="flex justify-center gap-4 mt-2">
      <button
        onClick={() => switchNetwork("mainnet")}
        className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
      >
        Switch to XDC Mainnet
      </button>
      <button
        onClick={() => switchNetwork("testnet")}
        className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
      >
        Switch to Apothem Testnet
      </button>
      <button
        onClick={() => switchNetwork("amoy")}
        className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
      >
        Switch to Amoy Testnet
      </button>
    </div>
  </div>
);

// Add network switching function
const switchNetwork = async (networkType) => {
  if (!window.ethereum) return;

  const network =
    networkType === "mainnet"
      ? NETWORKS.MAINNET
      : networkType === "testnet"
        ? NETWORKS.APOTHEM
        : NETWORKS.AMOY;
  const chainIdHex = `0x${network.chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });

    // Add a delay before reloading to allow the network switch to complete
    setTimeout(() => window.location.reload(), 1000);
  } catch (switchError) {
    console.error("Network switch error:", switchError);

    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: [network.blockExplorer],
              nativeCurrency: {
                name: "XDC",
                symbol: "XDC",
                decimals: 18,
              },
            },
          ],
        });
        console.log("Network added successfully");
      } catch (addError) {
        console.error("Error adding network:", addError);
        throw addError;
      }
    } else {
      throw switchError;
    }
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
      // Convert from wei to whole tokens
      return (BigInt(weiValue) / BigInt("1000000000000000000")).toString();
    } catch (error) {
      console.error("Error formatting display value:", error);
      return "0";
    }
  };

  const validateInput = (input) => {
    if (input === "") return true;
    // Only allow whole numbers
    const regex = /^\d+$/;
    if (!regex.test(input)) return false;
    if (input.startsWith("0") && input.length > 1) return false;
    return true;
  };

  const parseTokenAmount = (amount) => {
    try {
      if (!amount || isNaN(Number(amount))) {
        return BigInt(0);
      }

      // Convert to wei (multiply by 10^18)
      const weiValue = BigInt(amount) * BigInt("1000000000000000000");
      const minValue = BigInt(min);
      const maxValue = BigInt(userBalance);

      // Check if potential win (6x bet) would overflow uint256
      const MAX_UINT256 = BigInt(
        "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      );
      const potentialWin = weiValue * BigInt(6);
      if (potentialWin > MAX_UINT256) {
        throw new Error("Bet amount too large - potential win would overflow");
      }

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
        // If the value is too high, use the maximum allowed value instead
        if (weiValue > BigInt(userBalance)) {
          setLocalValue(formatDisplayValue(BigInt(userBalance)));
          onChange(BigInt(userBalance));
        } else {
          onChange(weiValue);
        }
      } catch (error) {
        setError(error.message);
        // Don't reset to min value, keep the current value
        if (error.message.includes("too large")) {
          setLocalValue(formatDisplayValue(BigInt(userBalance)));
          onChange(BigInt(userBalance));
        } else {
          onChange(BigInt(min));
        }
      }
    }
  };

  const handleQuickAmount = (percentage) => {
    try {
      const balance = BigInt(userBalance);
      const amount = (balance * BigInt(percentage)) / BigInt(100);
      const minValue = BigInt(min);

      // Check if potential win (6x bet) would overflow uint256
      const MAX_UINT256 = BigInt(
        "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      );
      const potentialWin = amount * BigInt(6);
      if (potentialWin > MAX_UINT256) {
        setError("Amount too large - potential win would overflow");
        onChange(minValue);
        setLocalValue(formatDisplayValue(minValue));
        return;
      }

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
      const MAX_UINT256 = BigInt(
        "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      );

      let newValue;
      if (increment) {
        newValue = currentValue + step;
        if (newValue > balance) newValue = balance;

        // Check for potential win overflow
        const potentialWin = newValue * BigInt(6);
        if (potentialWin > MAX_UINT256) {
          setError("Cannot increase - potential win would overflow");
          return;
        }
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
    const formatted = parseFloat(value).toFixed(0);
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
                          userBalance > allowance ? allowance : userBalance,
                        ),
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

function RequestMonitor({ diceContract, account }) {
  const fetchRequestStatus = async () => {
    if (!diceContract || !account) return null;
    // Fetch the request status from the contract
    const status = await diceContract.getCurrentRequestDetails(account);
    return status;
  };

  const {
    data: requestStatus,
    isLoading,
    error,
  } = useQuery(["requestStatus", account], fetchRequestStatus, {
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: !!diceContract && !!account, // Only run if these are available
  });

  useEffect(() => {
    if (requestStatus) {
      // Handle the request status update
      console.log("Request Status:", requestStatus);
    }
  }, [requestStatus]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {/* Render request status or other UI elements */}
      <p>Request ID: {requestStatus?.requestId}</p>
      <p>Request Fulfilled: {requestStatus?.requestFulfilled ? "Yes" : "No"}</p>
      <p>Request Active: {requestStatus?.requestActive ? "Yes" : "No"}</p>
    </div>
  );
}

const GameHistory = ({ diceContract, account, onError }) => {
  const [filter, setFilter] = useState("all");

  // Use React Query for fetching and caching game history
  const { data: gameData, isLoading } = useQuery({
    queryKey: ["gameHistory", account],
    queryFn: async () => {
      if (!diceContract || !account)
        return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };

      try {
        // Fetch bets
        const bets = await diceContract.getPreviousBets(account);

        // Process bets and calculate stats
        const processedGames = bets
          .map((bet) => ({
            chosenNumber: Number(bet.chosenNumber),
            rolledNumber: Number(bet.rolledNumber),
            amount: bet.amount.toString(),
            timestamp: Number(bet.timestamp),
            isWin: Number(bet.chosenNumber) === Number(bet.rolledNumber),
            payout:
              Number(bet.chosenNumber) === Number(bet.rolledNumber)
                ? BigInt(bet.amount) * BigInt(6)
                : BigInt(0),
          }))
          .reverse();

        // Calculate stats
        const stats = processedGames.reduce(
          (acc, game) => ({
            totalGamesWon: acc.totalGamesWon + (game.isWin ? 1 : 0),
            totalGamesLost: acc.totalGamesLost + (game.isWin ? 0 : 1),
            totalWinAmount: acc.totalWinAmount + game.payout,
            totalBetAmount: acc.totalBetAmount + BigInt(game.amount),
          }),
          {
            totalGamesWon: 0,
            totalGamesLost: 0,
            totalWinAmount: BigInt(0),
            totalBetAmount: BigInt(0),
          },
        );

        return { games: processedGames, stats };
      } catch (error) {
        console.error("Error fetching game history:", error);
        onError(error);
        return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!diceContract && !!account,
  });

  // Filter games based on selected filter
  const filteredGames = useMemo(() => {
    if (!gameData?.games) return [];
    if (filter === "all") return gameData.games;
    if (filter === "wins") return gameData.games.filter((game) => game.isWin);
    if (filter === "losses")
      return gameData.games.filter((game) => !game.isWin);
    return gameData.games;
  }, [gameData?.games, filter]);

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white/90">Game History</h2>
        <div className="flex flex-wrap items-center gap-4">
          <StatBadge
            label="Wins"
            value={gameData?.stats.totalGamesWon || 0}
            color="success"
          />
          <StatBadge
            label="Losses"
            value={gameData?.stats.totalGamesLost || 0}
            color="error"
          />
          <StatBadge
            label="Win Rate"
            value={`${
              gameData?.stats.totalGamesWon + gameData?.stats.totalGamesLost > 0
                ? (
                    (gameData.stats.totalGamesWon /
                      (gameData.stats.totalGamesWon +
                        gameData.stats.totalGamesLost)) *
                    100
                  ).toFixed(1)
                : 0
            }%`}
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
          All Games
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

      {/* Game List */}
      {isLoading ? (
        <GameHistoryLoader />
      ) : filteredGames.length === 0 ? (
        <EmptyState />
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

// Helper Components
const StatBadge = ({ label, value, color }) => (
  <div className={`px-3 py-1 rounded-lg bg-${color}/10 text-${color}`}>
    <span className="text-sm font-medium">{label}: </span>
    <span className="font-bold">{value}</span>
  </div>
);

const FilterButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
      active
        ? "bg-gaming-primary text-white"
        : "bg-gaming-primary/20 text-gaming-primary hover:bg-gaming-primary/30"
    }`}
  >
    {children}
  </button>
);

const GameHistoryLoader = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-24 bg-secondary-800/50 rounded-xl" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="text-center py-8">
    <div className="inline-block p-3 rounded-full bg-secondary-800/50 mb-4">
      <svg
        className="w-6 h-6 text-secondary-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <p className="text-secondary-400">No games found</p>
  </div>
);

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

const StatusIndicator = ({ status, isActive }) => {
  // Remove any direct access to router/navigation here
  return (
    <div className="flex items-center space-x-2">
      <div
        className={`h-3 w-3 rounded-full ${
          isActive
            ? status === "COMPLETED_WIN"
              ? "bg-gaming-success"
              : status === "COMPLETED_LOSS"
                ? "bg-gaming-error"
                : "bg-gaming-warning animate-pulse"
            : "bg-secondary-600"
        }`}
      />
      <span
        className={`text-sm ${
          isActive
            ? status === "COMPLETED_WIN"
              ? "text-gaming-success"
              : status === "COMPLETED_LOSS"
                ? "text-gaming-error"
                : "text-gaming-warning"
            : "text-secondary-400"
        }`}
      >
        {status || "PENDING"}
      </span>
    </div>
  );
};

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

const GameBoard = ({ chosenNumber, gameState, onNumberSelect }) => {
  return (
    <div className="game-card space-y-8">
      <DiceVisualizer
        chosenNumber={chosenNumber}
        isRolling={gameState.isRolling}
        result={gameState.lastResult}
      />

      <NumberSelector
        value={chosenNumber}
        onChange={onNumberSelect}
        disabled={gameState.isProcessing}
      />

      <StatusPanel gameState={gameState} />
    </div>
  );
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
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type) => {
    setToasts((prev) => [...prev, { message, type }]);
  }, []);

  // Add this section right after the Hero Section, before the Games Section
  const NetworkSwitcher = () => (
    <section className="py-8 bg-secondary-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card-hover p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Select Network</h2>
          <p className="text-secondary-300 mb-6">
            Choose between XDC Mainnet for real gameplay, Apothem Testnet or
            Amoy Testnet for testing
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => switchNetwork("mainnet")}
              className="btn-gaming bg-gaming-primary"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                XDC Mainnet
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => switchNetwork("testnet")}
              className="btn-gaming bg-gaming-accent"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                Apothem Testnet
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => switchNetwork("amoy")}
              className="btn-gaming bg-gaming-secondary"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                Amoy Testnet
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );

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
      status: "Live", // Change from "Coming Soon" to "Live"
      link: "/roulette",
      features: ["Multiple Betting Options", "European Style", "Live Results"],
    },
  ];

  const addTokenToMetaMask = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      // Get current chain ID
      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      // Convert chainId to decimal for comparison
      const chainIdDecimal = parseInt(chainId, 16);

      // Determine which network's token address to use
      let tokenAddress;
      let networkName;

      if (chainIdDecimal === 50) {
        // XDC Mainnet
        tokenAddress = NETWORKS.MAINNET.contracts.token;
        networkName = "XDC Mainnet";
      } else if (chainIdDecimal === 51) {
        // Apothem Testnet
        tokenAddress = NETWORKS.APOTHEM.contracts.token;
        networkName = "Apothem Testnet";
      } else if (chainIdDecimal === 80002) {
        // Amoy Testnet
        tokenAddress = NETWORKS.AMOY.contracts.token;
        networkName = "Amoy Testnet";
      } else {
        throw new Error(
          `Please connect to XDC Mainnet, Apothem Testnet, or Amoy Testnet (current network: chain ID ${chainIdDecimal})`,
        );
      }

      if (!tokenAddress) {
        throw new Error(`Token address not configured for ${networkName}`);
      }

      // Create a contract instance to get the actual symbol and name
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        TokenABI.abi,
        provider,
      );

      // Fetch token details
      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
      ]);

      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: symbol,
            decimals: decimals,
            name: name,
            // Optional image URL
            image: "https://your-token-image-url.com/gamex.png", // Add your token's image URL if available
          },
        },
      });

      if (wasAdded) {
        addToast(
          `GameX token was added to MetaMask on ${networkName} successfully!`,
          "success",
        );
      } else {
        throw new Error("User rejected the request");
      }
    } catch (error) {
      console.error("Error adding token to MetaMask:", error);
      addToast(error.message || "Failed to add token to MetaMask", "error");
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

      {/* Add NetworkSwitcher here */}
      <NetworkSwitcher />

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
  // Use React Query for fetching stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["gameStats", account],
    queryFn: async () => {
      if (!diceContract || !account) {
        return {
          gamesWon: 0,
          totalWinnings: BigInt(0),
          biggestWin: BigInt(0),
        };
      }

      try {
        const bets = await diceContract.getPreviousBets(account);

        // Process bets and calculate stats
        return bets.reduce(
          (acc, bet) => {
            const isWin = Number(bet.chosenNumber) === Number(bet.rolledNumber);
            if (isWin) {
              const winAmount = BigInt(bet.amount) * BigInt(6);
              return {
                gamesWon: acc.gamesWon + 1,
                totalWinnings: acc.totalWinnings + winAmount,
                biggestWin:
                  winAmount > acc.biggestWin ? winAmount : acc.biggestWin,
              };
            }
            return acc;
          },
          {
            gamesWon: 0,
            totalWinnings: BigInt(0),
            biggestWin: BigInt(0),
          },
        );
      } catch (error) {
        console.error("Error fetching game stats:", error);
        throw error;
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!diceContract && !!account,
  });

  if (isLoading) {
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
          {stats?.gamesWon || 0}
        </p>
      </div>
      <div className="stat-card">
        <h3 className="text-secondary-400">Total Winnings</h3>
        <p className="text-2xl font-bold text-gaming-primary">
          {ethers.formatEther(stats?.totalWinnings || BigInt(0))} GameX
        </p>
      </div>
      <div className="stat-card">
        <h3 className="text-secondary-400">Biggest Win</h3>
        <p className="text-2xl font-bold text-gaming-accent">
          {ethers.formatEther(stats?.biggestWin || BigInt(0))} GameX
        </p>
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
    chosenNumber: null,
    result: null,
    amount: BigInt(0),
    timestamp: 0,
    payout: BigInt(0),
    randomWord: BigInt(0),
    status: "PENDING", // Now matches GameStatus enum from contract
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
        diceContract.address,
      );
      if (allowance < betAmount) {
        const approveTx = await tokenContract.approve(
          diceContract.address,
          ethers.MaxUint256,
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
  setLoadingStates,
  contracts,
}) {
  // Add logging of environment variables at component mount
  useEffect(() => {
    console.log("Environment Variables Used:");
    console.log(
      "REACT_APP_DICE_GAME_ADDRESS:",
      process.env.REACT_APP_DICE_GAME_ADDRESS,
    );
    console.log(
      "REACT_APP_TOKEN_ADDRESS:",
      process.env.REACT_APP_TOKEN_ADDRESS,
    );
    console.log(
      "REACT_APP_XDC_MAINNET_RPC_URL:",
      process.env.REACT_APP_XDC_MAINNET_RPC_URL,
    );
    console.log(
      "REACT_APP_XDC_MAINNET_BLOCK_EXPLORER_URL:",
      process.env.REACT_APP_XDC_MAINNET_BLOCK_EXPLORER_URL,
    );
  }, []);

  // Add network-specific contract addresses
  const [selectedNetwork, setSelectedNetwork] = useState(() => {
    // Initialize based on current chainId
    const chainId = window.ethereum?.chainId;
    if (chainId === "0x32") return "MAINNET";
    if (chainId === "0x33") return "APOTHEM";
    if (chainId === "0x13881") return "AMOY";
    return "MAINNET"; // default
  });

  const getContractAddresses = (network) => {
    switch (network) {
      case "MAINNET":
        return {
          dice: process.env.REACT_APP_DICE_GAME_ADDRESS,
          token: process.env.REACT_APP_TOKEN_ADDRESS,
          roulette: process.env.REACT_APP_ROULETTE_ADDRESS,
        };
      case "APOTHEM":
        return {
          dice: process.env.REACT_APP_APOTHEM_DICE_GAME_ADDRESS,
          token: process.env.REACT_APP_APOTHEM_TOKEN_ADDRESS,
          roulette: process.env.REACT_APP_APOTHEM_ROULETTE_ADDRESS,
        };
      case "AMOY":
        return {
          dice: process.env.REACT_APP_AMOY_DICE_GAME_ADDRESS,
          token: process.env.REACT_APP_AMOY_TOKEN_ADDRESS,
          roulette: process.env.REACT_APP_AMOY_ROULETTE_ADDRESS,
        };
      default:
        return {
          dice: process.env.REACT_APP_DICE_GAME_ADDRESS,
          token: process.env.REACT_APP_TOKEN_ADDRESS,
          roulette: process.env.REACT_APP_ROULETTE_ADDRESS,
        };
    }
  };

  const [gameStats, setGameStats] = useState({
    contractBalance: BigInt(0),
    isPaused: false,
    ownerCount: 0,
  });

  const [formInputs, setFormInputs] = useState({
    selectedRole: "MINTER_ROLE",
    selectedContract: "token",
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
      setLoadingStates((prev) => ({ ...prev, action: true }));

      // Validate inputs
      if (!formInputs.selectedContract || !formInputs.selectedRole) {
        addToast("Please select both contract and role", "error");
        return;
      }

      // Get the target contract address that will receive the role
      const targetAddress =
        getContractAddresses(selectedNetwork)[formInputs.selectedContract];
      if (!targetAddress) {
        throw new Error("Invalid contract selection");
      }

      // Get role hash based on the selected role
      let roleHash;
      switch (formInputs.selectedRole) {
        case "MINTER_ROLE":
          roleHash = await contracts.token.MINTER_ROLE();
          break;
        case "BURNER_ROLE":
          roleHash = await contracts.token.BURNER_ROLE();
          break;
        case "DEFAULT_ADMIN_ROLE":
          roleHash = ethers.ZeroHash;
          break;
        default:
          throw new Error("Invalid role selection");
      }

      // Execute the role management transaction on the token contract
      const tx =
        action === "grant"
          ? await contracts.token.grantRole(roleHash, targetAddress)
          : await contracts.token.revokeRole(roleHash, targetAddress);

      await tx.wait();

      addToast(
        `${formInputs.selectedRole} ${action}ed successfully for ${formInputs.selectedContract} contract`,
        "success",
      );

      // Refresh stats
      await fetchGameStats();
    } catch (error) {
      console.error("Role management error:", error);
      let errorMessage = error.message || "An unknown error occurred";

      // Add specific error handling
      if (errorMessage.includes("missing role")) {
        errorMessage = "You don't have permission to manage roles";
      } else if (errorMessage.includes("already has role")) {
        errorMessage = "Contract already has this role";
      } else if (errorMessage.includes("invalid address")) {
        errorMessage = "Invalid contract address";
      }

      onError({ ...error, message: errorMessage }, `${action}ing role`);
    } finally {
      setLoadingStates((prev) => ({ ...prev, action: false }));
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
        "success",
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

  // Get current network's contract addresses
  const getCurrentNetworkContracts = useCallback(async () => {
    if (!window.ethereum) return null;

    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const chainIdDecimal = parseInt(chainId, 16);

    // Find matching network
    const network = Object.values(NETWORKS).find(
      (n) => n.chainId === chainIdDecimal,
    );
    if (!network) {
      throw new Error("Unsupported network");
    }

    return network.contracts;
  }, []);

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

      {/* Network Selection */}
      <div className="mb-8 p-4 bg-secondary-800/30 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Network Selection</h2>
        <select
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value)}
          className="w-full p-2 bg-secondary-700/50 rounded-lg border border-secondary-600 
                     text-white focus:outline-none focus:ring-2 focus:ring-gaming-primary"
        >
          <option value="MAINNET">XDC Mainnet</option>
          <option value="APOTHEM">Apothem Testnet</option>
          <option value="AMOY">Amoy Testnet</option>
        </select>

        {/* Display current network addresses */}
        <div className="mt-4 space-y-2 text-sm text-secondary-400">
          <p>Current Network: {selectedNetwork}</p>
          <p>Dice Contract: {getContractAddresses(selectedNetwork).dice}</p>
          <p>Token Contract: {getContractAddresses(selectedNetwork).token}</p>
          <p>
            Roulette Contract: {getContractAddresses(selectedNetwork).roulette}
          </p>
        </div>
      </div>

      {/* Role Management Section */}
      <div className="mb-8 p-4 bg-secondary-800/30 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Role Management</h2>
        <div className="space-y-4">
          {/* Contract Selection Dropdown */}
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              Contract
            </label>
            <select
              name="selectedContract"
              value={formInputs.selectedContract}
              onChange={handleInputChange}
              className="w-full p-2 bg-secondary-700/50 rounded-lg border border-secondary-600"
            >
              <option value="">Select Contract</option>
              <option value="token">Token Contract</option>
              <option value="dice">Dice Contract</option>
              <option value="roulette">Roulette Contract</option>
            </select>
            {formInputs.selectedContract && (
              <p className="mt-1 text-xs text-secondary-400">
                Address:{" "}
                {
                  getContractAddresses(selectedNetwork)[
                    formInputs.selectedContract
                  ]
                }
              </p>
            )}
          </div>

          {/* Role Selection Dropdown */}
          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">
              Role
            </label>
            <select
              name="selectedRole"
              value={formInputs.selectedRole}
              onChange={handleInputChange}
              className="w-full p-2 bg-secondary-700/50 rounded-lg border border-secondary-600"
            >
              <option value="">Select Role</option>
              <option value="MINTER_ROLE">Minter Role</option>
              <option value="BURNER_ROLE">Burner Role</option>
              <option value="DEFAULT_ADMIN_ROLE">Admin Role</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => handleRoleManagement("grant")}
              disabled={
                !formInputs.selectedContract ||
                !formInputs.selectedRole ||
                loading.action
              }
              className={`btn-gaming flex-1 ${
                (!formInputs.selectedContract || !formInputs.selectedRole) &&
                "opacity-50 cursor-not-allowed"
              }`}
            >
              {loading.action ? "Processing..." : "Grant Role"}
            </button>
            <button
              onClick={() => handleRoleManagement("revoke")}
              disabled={
                !formInputs.selectedContract ||
                !formInputs.selectedRole ||
                loading.action
              }
              className={`btn-gaming bg-gaming-error flex-1 ${
                (!formInputs.selectedContract || !formInputs.selectedRole) &&
                "opacity-50 cursor-not-allowed"
              }`}
            >
              {loading.action ? "Processing..." : "Revoke Role"}
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
  contracts, // Add this prop
  account,
  onError,
  addToast,
  setLoadingStates, // Add this prop
  setLoadingMessage,
}) => {
  const queryClient = useQueryClient();
  const [chosenNumber, setChosenNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(BigInt(0));
  const [showStats, setShowStats] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [showLoseAnimation, setShowLoseAnimation] = useState(false);
  const [gameState, setGameState] = useState({
    isActive: false,
    chosenNumber: null,
    result: null,
    amount: BigInt(0),
    timestamp: 0,
    payout: BigInt(0),
    randomWord: BigInt(0),
    status: "PENDING",
    needsResolution: false,
    canPlay: true,
    isProcessing: false,
    isRolling: false,
    currentGameData: null,
  });

  // Add new state for recovery timer
  const [recoveryTime, setRecoveryTime] = useState(null);
  const [canRecover, setCanRecover] = useState(false);

  // Add function to handle recovery
  const handleRecoverGame = async () => {
    if (!contracts.dice || !account) return;

    try {
      setGameState((prev) => ({ ...prev, isProcessing: true }));
      const tx = await contracts.dice.recoverOwnStuckGame();
      await tx.wait();

      // Invalidate queries to refresh state
      queryClient.invalidateQueries(["gameState", account]);
      queryClient.invalidateQueries(["balance", account]);

      addToast("Game recovered successfully!", "success");
    } catch (error) {
      console.error("Recovery error:", error);
      handleContractError(error, onError);
    } finally {
      setGameState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Add effect to check recovery timer
  useEffect(() => {
    if (!gameState.currentGameData?.timestamp || !gameState.isActive) {
      setRecoveryTime(null);
      setCanRecover(false);
      return;
    }

    const gameTimestamp = Number(gameState.currentGameData.timestamp) * 1000; // Convert to milliseconds
    const timeoutDuration = 60 * 60 * 1000; // 1 hour in milliseconds

    const checkRecovery = () => {
      const now = Date.now();
      const timeLeft = gameTimestamp + timeoutDuration - now;

      if (timeLeft <= 0) {
        setCanRecover(true);
        setRecoveryTime(0);
      } else {
        setCanRecover(false);
        setRecoveryTime(timeLeft);
      }
    };

    // Initial check
    checkRecovery();

    // Set up interval
    const interval = setInterval(checkRecovery, 1000);

    return () => clearInterval(interval);
  }, [gameState.currentGameData?.timestamp, gameState.isActive]);

  // Add helper function to format time
  const formatTime = (ms) => {
    if (!ms) return "";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Add this near your other UI elements, perhaps after the bet button
  const recoveryButton = (
    <>
      {gameState.isActive && (
        <div className="glass-panel p-4 mt-4">
          {canRecover ? (
            <button
              onClick={handleRecoverGame}
              disabled={gameState.isProcessing}
              className="btn-gaming h-10 w-full"
            >
              {gameState.isProcessing ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Recovering...</span>
                </span>
              ) : (
                "Recover Stuck Game"
              )}
            </button>
          ) : recoveryTime ? (
            <div className="text-center">
              <p className="text-secondary-400 text-sm">
                Recovery available in
              </p>
              <p className="text-white font-mono text-lg">
                {formatTime(recoveryTime)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </>
  );

  const monitorIntervalRef = useRef(null);
  const isMounted = useRef(true);

  const GameStatus = {
    PENDING: 0,
    STARTED: 1,
    COMPLETED_WIN: 2,
    COMPLETED_LOSS: 3,
    CANCELLED: 4,
  };

  // Game State Query
  const { data: gameStateData, isLoading: gameStateLoading } = useQuery({
    queryKey: ["gameState", account, contracts.dice?.target],
    queryFn: async () => {
      if (!contracts.dice || !account) return null;

      try {
        const [currentGame, requestDetails, canPlay] = await Promise.all([
          contracts.dice.getCurrentGame(account),
          contracts.dice.getCurrentRequestDetails(account),
          contracts.dice.canStartNewGame(account),
        ]);

        // Get request details
        const [requestId, requestFulfilled, requestActive] = requestDetails;

        return {
          currentGame,
          requestDetails: {
            requestId: Number(requestId),
            requestFulfilled,
            requestActive,
          },
          canPlay,
        };
      } catch (error) {
        console.error("Error fetching game state:", error);
        return null;
      }
    },
    enabled: !!contracts.dice && !!account,
    refetchInterval: 5000,
  });

  // Balance Query
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance", account, contracts.token?.target],
    queryFn: async () => {
      if (!contracts.token || !account) return null;

      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.dice.target),
      ]);

      return {
        balance,
        allowance: tokenAllowance,
      };
    },
    enabled: !!contracts.token && !!account,
    refetchInterval: 5000,
  });

  // Update game state based on query results
  useEffect(() => {
    if (gameStateData) {
      const { currentGame, requestDetails } = gameStateData;

      setGameState((prev) => ({
        ...prev,
        isActive: currentGame.isActive,
        status: Object.keys(GameStatus)[currentGame.status],
        result: currentGame.result > 0 ? currentGame.result : null,
        amount: currentGame.amount,
        timestamp: currentGame.timestamp,
        payout: currentGame.payout,
        randomWord: currentGame.randomWord,
        needsResolution:
          currentGame.isActive && requestDetails.requestFulfilled,
        canPlay: !currentGame.isActive && !requestDetails.requestActive,
        currentGameData: currentGame,
      }));
    }
  }, [gameStateData]);

  const handleGameResolution = async () => {
    if (!gameState.needsResolution || !contracts.dice || !account) return;
    if (gameState.isProcessing) return;

    try {
      setGameState((prev) => ({
        ...prev,
        isProcessing: true,
        isRolling: true,
      }));

      const tx = await contracts.dice.resolveGame();
      await tx.wait();

      // Invalidate queries
      queryClient.invalidateQueries(["gameState", account]);
      queryClient.invalidateQueries(["balance", account]);

      // Show appropriate animation after resolution
      const updatedGame = await contracts.dice.getCurrentGame(account);
      const isWin = updatedGame.status === GameStatus.COMPLETED_WIN;

      if (isWin) {
        setShowWinAnimation(true);
        addToast(
          `Congratulations! You won ${ethers.formatEther(
            updatedGame.payout,
          )} GameX!`,
          "success",
        );
      } else {
        setShowLoseAnimation(true);
        addToast("Better luck next time!", "warning");
      }
    } catch (error) {
      console.error("Game resolution error:", error);
      handleContractError(error, onError);
    } finally {
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        isRolling: false,
      }));
    }
  };

  // Add new error handling function
  const handleContractError = (error, onError) => {
    if (error.code === "CALL_EXCEPTION") {
      const errorName = error.errorName;
      switch (errorName) {
        case "InvalidBetParameters":
          addToast("Invalid bet parameters", "error");
          break;
        case "InsufficientContractBalance":
          addToast("Insufficient contract balance", "error");
          break;
        case "InsufficientUserBalance":
          addToast("Insufficient balance", "error");
          break;
        case "GameError":
          addToast("Game error occurred", "error");
          break;
        case "PayoutCalculationError":
          addToast("Error calculating payout", "error");
          break;
        default:
          onError(error);
      }
    } else {
      onError(error);
    }
  };

  const checkAndApproveToken = async (amount) => {
    if (!contracts.token || !contracts.dice || !amount) {
      throw new Error("Missing required parameters for token approval");
    }

    try {
      setGameState((prev) => ({ ...prev, isProcessing: true }));

      // Get current allowance using updated function name
      const currentAllowance = await contracts.token.allowance(
        account,
        contracts.dice.target,
      );

      if (currentAllowance < amount) {
        const maxApproval = ethers.MaxUint256;
        const tx = await contracts.token.approve(
          contracts.dice.target,
          maxApproval,
        );
        const receipt = await tx.wait();

        if (!receipt.status) {
          throw new Error("Token approval transaction failed");
        }

        // Verify new allowance using updated function name
        const newAllowance = await contracts.token.allowance(
          account,
          contracts.dice.target,
        );

        if (newAllowance < amount) {
          throw new Error("Allowance not set correctly");
        }

        addToast("Token approval successful", "success");
        return true;
      }

      return true;
    } catch (error) {
      console.error("Token approval error:", error);
      throw error;
    } finally {
      setGameState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const checkApprovals = async () => {
    const allowance = await contracts.token.allowance(
      account,
      contracts.dice.target,
    );
    const balance = await contracts.token.balanceOf(account);
    console.log({
      allowance: allowance.toString(),
      balance: balance.toString(),
      betAmount: betAmount.toString(),
    });
  };

  console.log({
    canPlay: gameState.canPlay,
    isProcessing: gameState.isProcessing,
    chosenNumber,
    betAmount: betAmount.toString(),
    userBalance: balanceData?.balance?.toString() || "0", // Fixed reference to userBalance
  });

  const debouncedPlaceBet = useCallback(
    debounce(async () => {
      if (
        !contracts.dice ||
        !account ||
        !chosenNumber ||
        betAmount <= BigInt(0)
      )
        return;
      if (gameState.isProcessing) return;

      try {
        setGameState((prev) => ({ ...prev, isProcessing: true }));

        const tx = await contracts.dice.playDice(chosenNumber, betAmount);
        await tx.wait();

        queryClient.invalidateQueries(["gameState", account]);
        queryClient.invalidateQueries(["balance", account]);

        setGameState((prev) => ({
          ...prev,
          isActive: true,
          isRolling: true,
          status: "STARTED",
        }));

        addToast("Bet placed successfully!", "success");
      } catch (error) {
        console.error("Bet placement error:", error);

        let errorMessage = "Failed to place bet";

        // Handle specific error codes
        if (error.code === "CALL_EXCEPTION") {
          if (error.action === "estimateGas") {
            // This usually means there's a revert at the contract level
            errorMessage =
              "Transaction would fail - please check your balance and permissions";

            // Try to get more specific error info if available
            if (error.info?.error?.data) {
              const errorData = error.info.error.data;
              // Add specific contract error handling here if needed
            }
          }
        } else if (error.code === "ACTION_REJECTED") {
          errorMessage = "Transaction rejected by user";
        }

        onError({ ...error, message: errorMessage });
      } finally {
        setGameState((prev) => ({ ...prev, isProcessing: false }));
      }
    }, 500),
    [contracts.dice, account, chosenNumber, betAmount, gameState.isProcessing],
  );

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, []);

  const handlePlaceBet = async () => {
    try {
      console.log("Starting bet placement...");

      // Check if user has an active game
      const gameStatus = await contracts.dice.getCurrentGame(account);
      console.log("Current game status:", gameStatus);

      // Check token approvals
      const allowance = await contracts.token.allowance(
        account,
        contracts.dice.target,
      );
      const balance = await contracts.token.balanceOf(account);
      console.log("Token status:", {
        allowance: allowance.toString(),
        balance: balance.toString(),
        betAmount: betAmount.toString(),
      });

      // Attempt to place bet
      const tx = await contracts.dice.playDice(chosenNumber, betAmount);
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      console.log("Transaction confirmed");
    } catch (error) {
      console.error("Bet placement failed:", error);
      // Check for specific error types
      if (error.code === "CALL_EXCEPTION") {
        const errorName = error.errorName;
        switch (errorName) {
          case "InvalidBetParameters":
            addToast(
              "Invalid bet parameters. Check your bet amount and chosen number.",
              "error",
            );
            break;
          case "InsufficientUserBalance":
            addToast("Insufficient balance to place bet.", "error");
            break;
          case "GameError":
            addToast(
              "You have an active game. Please resolve it first.",
              "error",
            );
            break;
          default:
            onError(error);
        }
      } else {
        onError(error);
      }
    }
  };

  // Add a check for zero balance
  const hasNoTokens = balanceData?.balance === BigInt(0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-gaming mb-4">
            Dice Game
          </h1>
          <p className="text-secondary-400 text-lg">
            Choose a number, place your bet, and test your luck!
          </p>
        </div>

        {(gameStateLoading || balanceLoading) && (
          <div className="glass-panel p-4">
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span className="text-secondary-400">
                {gameStateLoading
                  ? "Updating game state..."
                  : "Updating balance..."}
              </span>
            </div>
          </div>
        )}

        <div className="glass-panel p-6">
          <StatusIndicator
            status={gameState.status}
            isActive={gameState.isActive}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-8 text-white/90">
                Place Your Bet
              </h2>

              <div className="mb-8">
                <NumberSelector
                  value={chosenNumber}
                  onChange={setChosenNumber}
                  disabled={!gameState.canPlay || gameState.isProcessing}
                />
              </div>

              <div className="mb-8">
                <BetInput
                  value={betAmount}
                  onChange={setBetAmount}
                  userBalance={balanceData?.balance.toString() || "0"}
                  disabled={
                    !gameState.canPlay || gameState.isProcessing || hasNoTokens
                  }
                />
                {hasNoTokens && (
                  <p className="text-red-500 mt-2 text-sm">
                    You don't have any tokens to play. Please acquire tokens
                    first.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {betAmount > BigInt(0) &&
                  balanceData?.allowance < betAmount && (
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
                    (balanceData?.allowance || BigInt(0)) < betAmount ||
                    (balanceData?.balance || BigInt(0)) < betAmount ||
                    hasNoTokens || // Add this condition
                    gameState.isProcessing ||
                    !account ||
                    !contracts.dice
                  }
                  className="btn-gaming h-14 w-full"
                >
                  {gameState.isProcessing ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Processing...</span>
                    </span>
                  ) : hasNoTokens ? ( // Add this condition
                    "No Tokens Available"
                  ) : (
                    "Place Bet"
                  )}
                </button>

                {gameState.isActive && (
                  <>
                    {gameState.needsResolution ? (
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
                    ) : (
                      <div className="text-center text-gaming-accent">
                        Waiting for random number...
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <BalancePanel
              userBalance={balanceData?.balance || BigInt(0)}
              allowance={balanceData?.allowance || BigInt(0)}
              potentialWinnings={betAmount * BigInt(6)}
            />
            {recoveryButton}
          </div>

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

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({
    dice: null,
    token: null,
    roulette: null,
  });
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [loadingStates, setLoadingStates] = useState({
    provider: true,
    contracts: true,
    wallet: false,
    transaction: false,
    gameState: false, // Add missing state
  });
  const [loadingMessage, setLoadingMessage] = useState("");

  const queryClient = useQueryClient();

  // Define addToast first
  const addToast = useCallback((message, type = "info") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  // Define removeToast next
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Then define handleError which uses addToast
  const handleError = useCallback(
    (error, context = "") => {
      console.error(`Error in ${context}:`, error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      let errorType = "error";

      // Extract error details
      const errorString = error.reason || error.message || error.toString();
      const errorCode = error.code;

      // Wallet/MetaMask Errors
      if (errorCode === 4001) {
        errorMessage =
          "Transaction cancelled - No worries, you can try again when ready!";
        errorType = "warning";
      } else if (errorCode === -32002) {
        errorMessage =
          "Please check MetaMask - a connection request is pending";
        errorType = "warning";
      } else if (errorCode === -32603) {
        errorMessage =
          "Network connection issue. Please check your wallet connection.";
        errorType = "error";
      }

      // Contract/Game Errors
      else if (errorString.includes("execution reverted")) {
        if (errorString.includes("game not ready")) {
          errorMessage =
            "The random number is still being generated. Please wait a moment.";
          errorType = "info";
        } else if (errorString.includes("already resolved")) {
          errorMessage =
            "This game has already been resolved. Start a new game!";
          errorType = "info";
        } else if (errorString.includes("active game exists")) {
          errorMessage =
            "You have an active game. Please resolve it before starting a new one.";
          errorType = "warning";
        } else if (errorString.includes("insufficient balance")) {
          errorMessage =
            "Insufficient balance to place this bet. Please check your token balance.";
          errorType = "error";
        } else if (errorString.includes("invalid number")) {
          errorMessage = "Please choose a valid number between 1 and 6.";
          errorType = "warning";
        } else if (errorString.includes("contract paused")) {
          errorMessage =
            "The game is currently paused for maintenance. Please try again later.";
          errorType = "info";
        }
      }

      // Network Errors
      else if (errorString.includes("network changed")) {
        errorMessage =
          "Network changed. Please ensure you're connected to the correct network.";
        errorType = "warning";
      } else if (errorString.includes("nonce")) {
        errorMessage =
          "Transaction error. Please reset your wallet or try again.";
        errorType = "error";
      }

      // Token Approval Errors
      else if (errorString.includes("allowance")) {
        errorMessage = "Please approve tokens before placing a bet.";
        errorType = "warning";
      }

      // RPC Errors
      else if (errorString.includes("timeout")) {
        errorMessage = "Network request timed out. Please try again.";
        errorType = "error";
      }

      // Wallet Connection Errors
      else if (!window.ethereum) {
        errorMessage = "Please install MetaMask to use this application.";
        errorType = "error";
      } else if (errorString.includes("not connected")) {
        errorMessage = "Please connect your wallet to continue.";
        errorType = "warning";
      }

      // Recovery-related Errors
      else if (errorString.includes("recovery")) {
        if (errorString.includes("too early")) {
          errorMessage =
            "It's too early to recover this game. Please wait for the timeout period.";
          errorType = "warning";
        } else if (errorString.includes("not eligible")) {
          errorMessage = "This game is not eligible for recovery.";
          errorType = "info";
        }
      }

      // Add debug information to console in development
      if (process.env.NODE_ENV === "development") {
        console.group("Error Details");
        console.log("Context:", context);
        console.log("Error Code:", errorCode);
        console.log("Error String:", errorString);
        console.log("Error Type:", errorType);
        console.log("Full Error:", error);
        console.groupEnd();
      }

      // Show error toast with appropriate styling
      addToast(errorMessage, errorType);

      // Set error state for potential UI updates
      setError(errorMessage);

      // Return the error message in case the caller needs it
      return errorMessage;
    },
    [addToast, setError],
  );

  // Update the validateNetwork function to be more detailed
  const validateNetwork = useCallback(async (provider) => {
    try {
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      console.log("Network Detection:", {
        detectedChainId: currentChainId,
        isSupportedChain: SUPPORTED_CHAIN_IDS.includes(currentChainId),
        supportedChains: SUPPORTED_CHAIN_IDS,
        networkName:
          currentChainId === NETWORKS.MAINNET.chainId
            ? "XDC Mainnet"
            : currentChainId === NETWORKS.APOTHEM.chainId
              ? "XDC Apothem"
              : currentChainId === NETWORKS.AMOY.chainId
                ? "Amoy Testnet"
                : "Unknown",
      });

      if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
        throw new Error(
          `Please switch to a supported network. Connected to chain ID: ${currentChainId}`,
        );
      }

      // Get the current network configuration
      const currentNetwork =
        currentChainId === NETWORKS.MAINNET.chainId
          ? NETWORKS.MAINNET
          : currentChainId === NETWORKS.APOTHEM.chainId
            ? NETWORKS.APOTHEM
            : NETWORKS.AMOY;

      console.log("Network Configuration:", {
        network: currentNetwork.name,
        rpcUrl: currentNetwork.rpcUrl,
        contracts: {
          dice: currentNetwork.contracts.dice,
          token: currentNetwork.contracts.token,
          roulette: currentNetwork.contracts.roulette,
        },
      });

      // Verify RPC connection
      try {
        const blockNumber = await provider.getBlockNumber();
        console.log("RPC Connection Verified:", {
          blockNumber,
          rpcUrl: currentNetwork.rpcUrl,
        });
      } catch (rpcError) {
        console.error("RPC Connection Failed:", rpcError);
        throw new Error(`Failed to connect to ${currentNetwork.name}`);
      }

      return currentChainId;
    } catch (error) {
      console.error("Network Validation Error:", error);
      throw error;
    }
  }, []);

  // Update the getNetworkConfig function to properly determine network type and addresses
  const getNetworkConfig = async (provider) => {
    try {
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      let networkType, diceAddress, tokenAddress, rouletteAddress;

      // Explicitly check chain IDs
      if (chainId === NETWORKS.MAINNET.chainId) {
        networkType = "mainnet";
        diceAddress = NETWORKS.MAINNET.contracts.dice;
        tokenAddress = NETWORKS.MAINNET.contracts.token;
        rouletteAddress = NETWORKS.MAINNET.contracts.roulette;
      } else if (chainId === NETWORKS.APOTHEM.chainId) {
        networkType = "apothem";
        diceAddress = NETWORKS.APOTHEM.contracts.dice;
        tokenAddress = NETWORKS.APOTHEM.contracts.token;
        rouletteAddress = NETWORKS.APOTHEM.contracts.roulette;
      } else if (chainId === NETWORKS.AMOY.chainId) {
        networkType = "amoy";
        diceAddress = NETWORKS.AMOY.contracts.dice;
        tokenAddress = NETWORKS.AMOY.contracts.token;
        rouletteAddress = NETWORKS.AMOY.contracts.roulette;
      } else {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      console.log("Network Configuration:", {
        chainId,
        networkType,
        diceAddress,
        tokenAddress,
        rouletteAddress,
      });

      return {
        chainId,
        networkType,
        diceAddress,
        tokenAddress,
        rouletteAddress,
      };
    } catch (error) {
      console.error("Error getting network config:", error);
      throw error;
    }
  };

  // Update the initializeContracts function
  const initializeContracts = async (provider, account) => {
    try {
      setLoadingStates((prev) => ({ ...prev, contracts: true }));
      const networkConfig = await getNetworkConfig(provider);
      console.log("Current Network:", networkConfig);

      // Validate required addresses (dice and token are always required)
      if (!networkConfig.diceAddress || !networkConfig.tokenAddress) {
        throw new Error(
          "Missing required contract addresses for current network",
        );
      }

      // Ensure addresses are strings and properly formatted
      const contractAddresses = {
        dice: ethers.getAddress(networkConfig.diceAddress.toString()),
        token: ethers.getAddress(networkConfig.tokenAddress.toString()),
        // Only include roulette if the address exists
        ...(networkConfig.rouletteAddress && {
          roulette: ethers.getAddress(networkConfig.rouletteAddress.toString()),
        }),
      };

      console.log("Using contract addresses:", contractAddresses);

      // Verify contract deployment for required contracts
      const [diceCode, tokenCode] = await Promise.all([
        provider.getCode(contractAddresses.dice),
        provider.getCode(contractAddresses.token),
      ]);

      // Only check roulette code if the address exists
      const rouletteCode = contractAddresses.roulette
        ? await provider.getCode(contractAddresses.roulette)
        : null;

      const isDeployed = {
        diceCode: diceCode !== "0x",
        tokenCode: tokenCode !== "0x",
        rouletteCode: rouletteCode ? rouletteCode !== "0x" : true, // Skip check if no address
      };

      console.log("Contract deployment status:", isDeployed);

      if (!isDeployed.diceCode || !isDeployed.tokenCode) {
        throw new Error("Required contracts not deployed");
      }

      const signer = await provider.getSigner(account);

      const diceContract = new ethers.Contract(
        contractAddresses.dice,
        DiceABI.abi,
        signer,
      );

      const tokenContract = new ethers.Contract(
        contractAddresses.token,
        TokenABI.abi,
        signer,
      );

      // Only initialize roulette contract if address exists
      const rouletteContract = contractAddresses.roulette
        ? new ethers.Contract(
            contractAddresses.roulette,
            RouletteABI.abi,
            signer,
          )
        : null;

      // Set the contracts state
      setContracts({
        dice: diceContract,
        token: tokenContract,
        roulette: rouletteContract,
      });

      if (!diceContract || !tokenContract) {
        throw new Error("Failed to initialize required contracts");
      }

      return { diceContract, tokenContract, rouletteContract };
    } finally {
      setLoadingStates((prev) => ({ ...prev, contracts: false }));
    }
  };

  // Update the connectWallet function to handle network switching
  const connectWallet = async () => {
    setLoadingStates((prev) => ({ ...prev, wallet: true }));
    setLoadingMessage("Connecting to wallet...");

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      // Fix the network switching condition
      if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
        console.log("Switching to supported network...");
        await switchNetwork("mainnet"); // Default to mainnet if unsupported
        return; // Return here as switchNetwork will reload the page
      }

      const chainId = await validateNetwork(provider);
      console.log("Network validated:", { chainId });

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
        const contractsData = await initializeContracts(provider, signer);
        if (!contractsData) {
          throw new Error("Failed to initialize contracts");
        }

        await handleAccountsChanged(accounts);
        addToast("Wallet connected successfully!", "success");
      } catch (contractError) {
        console.error("Contract initialization failed:", contractError);
        setProvider(null);
        setSigner(null);
        throw contractError;
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      handleError(err, "connectWallet");
      setProvider(null);
      setSigner(null);
      setContracts({ dice: null, token: null, roulette: null });
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
          const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
          let hasAdminRole = false;
          let isOwner = false;

          try {
            hasAdminRole = await contracts.token.hasRole(
              DEFAULT_ADMIN_ROLE,
              newAccount,
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

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!contracts.token || !contracts.dice || !account) {
        setIsAdmin(false);
        return;
      }

      try {
        const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
        let hasAdminRole = false;
        let isOwner = false;

        try {
          hasAdminRole = await contracts.token.hasRole(
            DEFAULT_ADMIN_ROLE,
            account,
          );
        } catch (err) {
          console.error("Error checking token admin role:", err);
        }

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

  const handleChainChanged = async (newChainId) => {
    const chainIdDec = parseInt(newChainId, 16);
    setChainId(chainIdDec);

    if (!SUPPORTED_CHAIN_IDS.includes(chainIdDec)) {
      addToast("Please switch to a supported network", "error");
      // Don't automatically switch networks here, just show the warning
      return;
    }

    // Add a delay before reloading to allow state updates to complete
    setTimeout(() => window.location.reload(), 1000);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!window.ethereum) {
        setLoadingStates((prev) => ({
          ...prev,
          provider: false,
          contracts: false,
        }));
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const chainId = await validateNetwork(provider);

        if (!mounted) return;

        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (!mounted) return;

        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          setProvider(provider);
          setSigner(signer);

          await initializeContracts(provider, accounts[0]);
          await handleAccountsChanged(accounts);
        } else {
          // No accounts connected, clear states
          setProvider(null);
          setSigner(null);
          setContracts({ dice: null, token: null, roulette: null });
        }
      } catch (err) {
        console.error("Initialization error:", err);
        handleError(err, "initialization");
      } finally {
        if (mounted) {
          setLoadingStates((prev) => ({
            ...prev,
            provider: false,
            contracts: false,
          }));
        }
      }
    };

    init();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  if (Object.values(loadingStates).some((state) => state)) {
    return <LoadingOverlay message={loadingMessage} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-secondary-900">
        {chainId && !SUPPORTED_CHAIN_IDS.includes(chainId) && (
          <NetworkWarning />
        )}

        <Navbar
          account={account}
          connectWallet={connectWallet}
          loadingStates={loadingStates}
          isAdmin={isAdmin}
          chainId={chainId}
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
              path="/roulette"
              element={
                <RoulettePage
                  contracts={contracts}
                  account={account}
                  onError={handleError}
                  addToast={addToast}
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
                    setLoadingStates={setLoadingStates}
                    contracts={contracts}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </main>

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
