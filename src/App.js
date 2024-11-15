import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { ethers } from "ethers";
import DiceABI from "./contracts/abi/Dice.json";
import TokenABI from "./contracts/abi/Token.json";

// Enhanced Toast Component
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-4 right-4 flex items-center min-w-[300px] p-4 
    rounded-lg shadow-xl transform transition-all duration-300 ease-in-out
    ${type === 'success' ? 'bg-success-500' : type === 'error' ? 'bg-error-500' : 'bg-primary-500'}
    animate-slide-up z-50`}>
    <div className="flex-1 text-white">
      <div className="flex items-center space-x-2">
        {type === 'success' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {type === 'error' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="font-medium">{message}</span>
      </div>
    </div>
    <button onClick={onClose} className="ml-4 text-white hover:text-gray-200 transition-colors">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

// Number Selector Component with Dice Visual
const DiceSelector = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 my-6">
      {[1, 2, 3, 4, 5, 6].map((num) => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className={`relative group h-16 w-16 rounded-xl transition-all duration-300
            ${Number(value) === num 
              ? 'bg-primary-500 shadow-glow scale-110' 
              : 'bg-secondary-800 hover:bg-secondary-700'}`}
        >
          <div className={`grid grid-cols-3 gap-1 p-2 h-full
            ${Number(value) === num ? 'dice-face-selected' : 'dice-face'}`}>
            {[...Array(num)].map((_, i) => (
              <span key={i} className={`rounded-full
                ${Number(value) === num 
                  ? 'bg-white' 
                  : 'bg-secondary-400 group-hover:bg-secondary-300'} 
                transition-colors duration-300`} 
              />
            ))}
          </div>
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
            opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="text-sm text-primary-400">Select {num}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

// Enhanced Bet Slider with Preset Amounts
const BetSlider = ({ value, onChange, min, max }) => {
  const formatValue = (val) => {
    try {
      return Number(ethers.formatEther(val.toString())).toFixed(3);
    } catch (error) {
      console.error('Error formatting value:', error);
      return "0.000";
    }
  };

  const presetAmounts = [
    min,
    (max * window.BigInt(25)) / window.BigInt(100),
    (max * window.BigInt(50)) / window.BigInt(100),
    (max * window.BigInt(75)) / window.BigInt(100),
    max
  ];

  const handleSliderChange = (e) => {
    const newValue = window.BigInt(e.target.value);
    onChange(newValue);
  };

  return (
    <div className="bet-controls relative overflow-hidden rounded-2xl bg-secondary-800/40 
      backdrop-blur-lg border border-white/10 shadow-xl p-8 transform 
      hover:shadow-2xl transition-all duration-300">
      
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gaming-primary/5 
        to-gaming-accent/5 animate-gradient-shift"></div>

      {/* Main Content */}
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-primary-100">
              Place Your Bet
            </h3>
            <p className="text-sm text-secondary-400">
              Select amount to wager
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-400 
              transition-all duration-300 animate-value-change">
              {formatValue(value)} ETH
            </div>
            <div className="text-xs text-secondary-400">
              Current Bet Amount
            </div>
          </div>
        </div>

        {/* Preset Amount Buttons */}
        <div className="grid grid-cols-5 gap-3">
          {presetAmounts.map((amount, index) => (
            <button
              key={index}
              onClick={() => onChange(amount)}
              className={`relative group px-3 py-2 rounded-xl transition-all duration-300
                ${value === amount 
                  ? 'bg-gaming-primary text-white shadow-glow-primary scale-105' 
                  : 'bg-secondary-700/50 hover:bg-secondary-600/50 text-secondary-300'}`}
            >
              {/* Hover Glow Effect */}
              <div className={`absolute inset-0 rounded-xl bg-gaming-primary/20 
                opacity-0 group-hover:opacity-100 transition-opacity duration-300
                ${value === amount ? 'animate-pulse-subtle' : ''}`}></div>
              
              {/* Button Content */}
              <div className="relative z-10">
                <span className="block text-sm font-medium">
                  {formatValue(amount)}
                </span>
                <span className="block text-xs opacity-75">
                  {index === 0 ? 'Min' : index === 4 ? 'Max' : `${index * 25}%`}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Slider */}
        <div className="space-y-4">
          <input
            type="range"
            min={min.toString()}
            max={max.toString()}
            value={value.toString()}
            onChange={handleSliderChange}
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
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-webkit-slider-thumb]:hover:shadow-glow-primary-lg"
          />

          {/* Min/Max Labels */}
          <div className="flex justify-between text-sm">
            <span className="text-secondary-400">
              Min: {formatValue(min)} ETH
            </span>
            <span className="text-secondary-400">
              Max: {formatValue(max)} ETH
            </span>
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
      <div className="absolute top-0 left-0 w-8 h-8 border-4 border-primary-500 rounded-full 
        border-t-transparent animate-spin"></div>
    </div>
    <span className="text-primary-100 font-medium">{message}</span>
  </div>
);

// Enhanced Loading Overlay Component
const LoadingOverlay = ({ message }) => (
  <div className="fixed inset-0 bg-secondary-900/80 backdrop-blur-sm flex items-center 
    justify-center z-50 transition-opacity duration-300">
    <div className="bg-secondary-800 p-6 rounded-xl shadow-xl border border-secondary-700
      transform transition-all duration-300 ease-out">
      <LoadingSpinner message={message} />
    </div>
  </div>
);

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
  const [bets, setBets] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (diceContract && account) {
        try {
          const previousBets = await diceContract.getPreviousBets(account);
          const formattedBets = previousBets.map((bet) => ({
            chosenNumber: bet.chosenNumber.toString(),
            rolledNumber: bet.rolledNumber.toString(),
            amount: bet.amount,
            timestamp: Number(bet.timestamp),
            won: bet.chosenNumber.toString() === bet.rolledNumber.toString()
          }));
          setBets(formattedBets);
        } catch (err) {
          onError(err);
        }
      }
    };
    fetchHistory();
  }, [diceContract, account]);

  const formatAmount = (amount) => {
    try {
      return `${ethers.formatEther(amount)} ETH`;
    } catch (err) {
      console.error("Error formatting amount:", err);
      return "0 ETH";
    }
  };

  return (
    <div className="glass-effect p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-primary-100 mb-4">
        Recent Games
      </h3>
      <div className="space-y-3">
        {bets.map((bet, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 bg-secondary-800 
              rounded-lg border border-secondary-700"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                bet.won ? 'bg-success-500' : 'bg-error-500'
              }`} />
              <span className="text-sm text-secondary-300">
                {new Date(bet.timestamp * 1000).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                Chosen: {bet.chosenNumber}
              </span>
              <span className="text-sm">
                Rolled: {bet.rolledNumber}
              </span>
              <span className="text-sm">
                {formatAmount(bet.amount)}
              </span>
              <span className={`font-medium ${
                bet.won ? 'text-success-400' : 'text-error-400'
              }`}>
                {bet.won ? 'Won!' : 'Lost'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [chosenNumber, setChosenNumber] = useState("");
  const [betAmount, setBetAmount] = useState("0.01");
  const [canPlay, setCanPlay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [minBet, setMinBet] = useState("0.01");
  const [maxBet, setMaxBet] = useState("1.0");

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
      const parsedAmount = ethers.parseEther(betAmount);
      const tx = await diceContract.playDice(chosenNumber, parsedAmount);
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
      <DiceSelector value={chosenNumber} onChange={setChosenNumber} />
      
      <BetSlider 
        value={betAmount} 
        onChange={setBetAmount}
        min={ethers.parseEther(minBet)}
        max={ethers.parseEther(maxBet)}
      />

      <GameControls 
        onRoll={handlePlay}
        isRolling={loading}
        canRoll={canPlay && chosenNumber && betAmount}
      />
    </div>
  );
};

// GameStatus Component
const GameStatus = ({ diceContract, account, onError }) => {
  const [gameStatus, setGameStatus] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Define status mapping object
  const STATUS_MAP = {
    0: "PENDING",
    1: "STARTED",
    2: "COMPLETED_WIN",
    3: "COMPLETED_LOSS",
    4: "CANCELLED",
  };

  const fetchGameStatus = async () => {
    if (!diceContract || !account) return;

    try {
      const [status, reqDetails] = await Promise.all([
        diceContract.getGameStatus(account),
        diceContract.getCurrentRequestDetails(account),
      ]);

      console.log("Raw Game Status:", status);
      console.log("Raw Request Details:", reqDetails);

      const currentGame = await diceContract.getCurrentGame(account);
      console.log("Current Game Details:", currentGame);

      setGameStatus({
        isActive: status[0],
        status: STATUS_MAP[Number(status[1])] || "UNKNOWN",
        chosenNumber: status[2].toString(),
        amount: status[3],
        timestamp: Number(status[4]),
      });

      setRequestDetails({
        requestId: reqDetails[0].toString(),
        requestFulfilled: reqDetails[1],
        requestActive: reqDetails[2],
      });
    } catch (err) {
      console.error("Error fetching game status:", err);
      onError(err);
    }
  };

  useEffect(() => {
    fetchGameStatus();
    const interval = setInterval(fetchGameStatus, 3000);
    return () => clearInterval(interval);
  }, [diceContract, account, onError]);

  const resolveGame = async () => {
    if (!diceContract || loading) return;

    setLoading(true);
    try {
      const tx = await diceContract.resolveGame();
      await tx.wait();
      await fetchGameStatus();
    } catch (err) {
      console.error("Error resolving game:", err);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  if (!gameStatus) return <div>Loading game status...</div>;

  const canResolve =
    gameStatus.isActive &&
    requestDetails?.requestFulfilled &&
    !requestDetails?.requestActive;

  return (
    <div className="card game-status">
      <h3 className="text-xl font-bold mb-4">Game Status</h3>
      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Game Active:</span>
          <span
            className={`status-badge ${
              gameStatus.isActive ? "bg-success" : "bg-error"
            }`}
          >
            {gameStatus.isActive ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Status:</span>
          <span
            className={`status-badge ${
              gameStatus.status === "COMPLETED_WIN"
                ? "status-win"
                : gameStatus.status === "COMPLETED_LOSS"
                ? "status-loss"
                : "status-pending"
            }`}
          >
            {gameStatus.status}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Chosen Number:</span>
          <span className="font-mono">{gameStatus.chosenNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Bet Amount:</span>
          <span className="font-mono">
            {ethers.formatEther(gameStatus.amount)} ETH
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Time:</span>
          <span className="font-mono">
            {new Date(gameStatus.timestamp * 1000).toLocaleString()}
          </span>
        </div>

        {canResolve && (
          <button
            onClick={resolveGame}
            disabled={loading}
            className="btn-gaming mt-4"
          >
            {loading ? "Resolving..." : "Resolve Game"}
          </button>
        )}
      </div>
    </div>
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
                <div className="text-3xl mb-4 text-gaming-accent">{feature.icon}</div>
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
            <div className="glass-effect rounded-xl p-8 hover:transform hover:scale-105 
              transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-primary-100">Dice Game</h3>
                <span className="px-3 py-1 bg-gaming-primary/20 text-gaming-primary 
                  rounded-full text-sm">Live</span>
              </div>
              <p className="text-gray-400 mb-6">
                Test your luck with our provably fair dice game. Roll to win up to 6x your stake!
              </p>
              <Link 
                to="/dice" 
                className="btn-gaming inline-block"
              >
                Play Now
              </Link>
            </div>
            <div className="glass-effect rounded-xl p-8 hover:transform hover:scale-105 
              transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-primary-100">Coming Soon</h3>
                <span className="px-3 py-1 bg-gaming-accent/20 text-gaming-accent 
                  rounded-full text-sm">Soon</span>
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
              <div 
                key={index} 
                className="glass-effect p-8 rounded-xl relative"
              >
                <div className="absolute -top-6 -left-6 w-12 h-12 rounded-full 
                  bg-gaming-primary flex items-center justify-center text-2xl font-bold">
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
    description: "Built on Ethereum blockchain with verifiable smart contracts"
  },
  {
    icon: "⚡",
    title: "Instant Settlements",
    description: "Immediate payouts and game resolutions"
  },
  {
    icon: "🎮",
    title: "Fair Gaming",
    description: "Provably fair mechanics using Chainlink VRF"
  }
];

const steps = [
  {
    title: "Connect Wallet",
    description: "Connect your MetaMask or any Web3 wallet to get started"
  },
  {
    title: "Get GameToken",
    description: "Purchase tokens directly through our platform"
  },
  {
    title: "Start Playing",
    description: "Choose your game and start your winning journey"
  }
];

// New Game Statistics Panel
const GameStats = ({ stats }) => {
  return (
    <div className="glass-effect p-6 rounded-xl">
      <h3 className="text-lg font-semibold text-primary-100 mb-4">
        Game Statistics
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Games"
          value={stats.totalGames}
          icon="🎲"
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          icon="📈"
        />
        <StatCard
          title="Biggest Win"
          value={`${stats.biggestWin} ETH`}
          icon="🏆"
        />
        <StatCard
          title="Total Winnings"
          value={`${stats.totalWinnings} ETH`}
          icon="💰"
        />
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
          ${canRoll && !isRolling
            ? 'bg-primary-500 hover:bg-primary-400 hover:scale-105'
            : 'bg-secondary-700 cursor-not-allowed opacity-50'
          }
          ${isRolling ? 'animate-pulse' : ''}
        `}
      >
        {isRolling ? (
          <div className="flex items-center space-x-2">
            <span>Rolling</span>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          </div>
        ) : (
          'Roll Dice'
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
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
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
