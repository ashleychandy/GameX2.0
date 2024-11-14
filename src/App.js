import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import DiceABI from './contracts/abi/Dice.json';
import TokenABI from './contracts/abi/Token.json';

// Environment variables
const DICE_CONTRACT_ADDRESS = process.env.REACT_APP_DICE_GAME_ADDRESS;
const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_ADDRESS;

// Add console logs for debugging
console.log('DICE_CONTRACT_ADDRESS:', DICE_CONTRACT_ADDRESS);
console.log('TOKEN_CONTRACT_ADDRESS:', TOKEN_CONTRACT_ADDRESS);

// GameComponent
const GameComponent = ({ diceContract, tokenContract, account, onGameStart, onGameResolve, onError }) => {
  const [chosenNumber, setChosenNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canPlay, setCanPlay] = useState(true);

  // Utility functions
  const isValidEthAmount = (value) => {
    if (!value) return false;
    try {
      ethers.parseEther(value);
      return true;
    } catch {
      return false;
    }
  };

  const isValidDiceNumber = (value) => {
    const num = parseInt(value);
    return !isNaN(num) && num >= 1 && num <= 6;
  };

  const handleBetAmountChange = (e) => {
    const value = e.target.value.replace(/[^\d.]/g, '');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBetAmount(value);
      setError('');
    }
  };

  const handleChosenNumberChange = (e) => {
    const value = e.target.value;
    if (value === '' || (isValidDiceNumber(value))) {
      setChosenNumber(value);
      setError('');
    }
  };

  const playGame = async () => {
    if (!isValidDiceNumber(chosenNumber)) {
      setError('Please choose a number between 1 and 6');
      return;
    }
    if (!isValidEthAmount(betAmount)) {
      setError('Please enter a valid bet amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const amountInWei = ethers.parseEther(betAmount);
      const tx = await diceContract.placeBet(chosenNumber, { value: amountInWei });
      onGameStart();
      await tx.wait();
      
      // Wait for game resolution
      const result = await diceContract.getLastGameResult(account);
      onGameResolve(result);
    } catch (err) {
      setError(err.message || 'An error occurred while placing the bet');
      onError(err);
    } finally {
      setLoading(false);
      setBetAmount('');
      setChosenNumber('');
    }
  };

  return (
    <div className="game-component">
      <h2>Play Dice</h2>
      {error && <div className="error">{error}</div>}
      <div className="game-controls">
        <input
          type="number"
          min="1"
          max="6"
          value={chosenNumber}
          onChange={handleChosenNumberChange}
          placeholder="Choose number (1-6)"
          disabled={!canPlay || loading}
        />
        <input
          type="text"
          value={betAmount}
          onChange={handleBetAmountChange}
          placeholder="Bet amount in ETH"
          disabled={!canPlay || loading}
        />
        <button 
          onClick={playGame} 
          disabled={!canPlay || loading || !isValidDiceNumber(chosenNumber) || !isValidEthAmount(betAmount)}
        >
          {loading ? 'Processing...' : 'Play'}
        </button>
      </div>
    </div>
  );
};

// GameStatus Component
const GameStatus = ({ diceContract, account, onError }) => {
  const [gameStatus, setGameStatus] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Define status mapping object
  const STATUS_MAP = {
    0: 'PENDING',
    1: 'STARTED',
    2: 'COMPLETED_WIN',
    3: 'COMPLETED_LOSS',
    4: 'CANCELLED'
  };

  const fetchGameStatus = async () => {
    if (!diceContract || !account) return;

    try {
      const [status, reqDetails] = await Promise.all([
        diceContract.getGameStatus(account),
        diceContract.getCurrentRequestDetails(account)
      ]);

      console.log('Raw Game Status:', status);
      console.log('Raw Request Details:', reqDetails);

      const currentGame = await diceContract.getCurrentGame(account);
      console.log('Current Game Details:', currentGame);

      setGameStatus({
        isActive: status[0],
        status: STATUS_MAP[Number(status[1])] || 'UNKNOWN',
        chosenNumber: status[2].toString(),
        amount: status[3],
        timestamp: Number(status[4])
      });

      setRequestDetails({
        requestId: reqDetails[0].toString(),
        requestFulfilled: reqDetails[1],
        requestActive: reqDetails[2]
      });

      setLastUpdate(Date.now());
    } catch (err) {
      console.error('Error fetching game status:', err);
      onError(err);
    }
  };

  useEffect(() => {
    fetchGameStatus();
    const interval = setInterval(fetchGameStatus, 3000);
    return () => clearInterval(interval);
  }, [diceContract, account]);

  const resolveGame = async () => {
    if (!diceContract || loading) return;

    setLoading(true);
    try {
      const tx = await diceContract.resolveGame();
      await tx.wait();
      await fetchGameStatus();
    } catch (err) {
      console.error('Error resolving game:', err);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  if (!gameStatus) return <div>Loading game status...</div>;

  const canResolve = gameStatus.isActive && 
                     requestDetails?.requestFulfilled && 
                     !requestDetails?.requestActive;

  return (
    <div className="game-status">
      <h3>Current Game Status</h3>
      <div>
        <p>Active: {gameStatus.isActive.toString()}</p>
        <p>Status: {gameStatus.status}</p>
        <p>Chosen Number: {gameStatus.chosenNumber}</p>
        <p>Amount: {ethers.formatEther(gameStatus.amount)} ETH</p>
        <p>Time: {new Date(gameStatus.timestamp * 1000).toLocaleString()}</p>
        
        <div className="debug-info" style={{fontSize: '0.8em', color: '#666', textAlign: 'left', marginTop: '20px'}}>
          <h4>Debug Information:</h4>
          <p>Request ID: {requestDetails?.requestId || 'None'}</p>
          <p>Request Fulfilled: {requestDetails?.requestFulfilled?.toString()}</p>
          <p>Request Active: {requestDetails?.requestActive?.toString()}</p>
          <p>Can Resolve: {canResolve.toString()}</p>
          <p>Last Updated: {new Date(lastUpdate).toLocaleString()}</p>
        </div>
        
        {canResolve && (
          <button 
            onClick={resolveGame}
            disabled={loading}
          >
            {loading ? 'Resolving...' : 'Resolve Game'}
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
          const playerStats = await diceContract.getPlayerStats(account);
          setStats({
            totalBets: playerStats.totalBets.toString(),
            totalWinnings: playerStats.totalWinnings,
            totalLosses: playerStats.totalLosses,
            gamesPlayed: playerStats.gamesPlayed.toString(),
            winRate: playerStats.winRate.toString(),
            averageBet: playerStats.averageBet
          });
        } catch (err) {
          onError(err);
        }
      }
    };
    fetchStats();
  }, [diceContract, account, onError]);

  const formatAmount = (amount) => {
    try {
      return `${ethers.formatEther(amount)} ETH`;
    } catch (err) {
      console.error('Error formatting amount:', err);
      return '0 ETH';
    }
  };

  if (!stats) return null;

  return (
    <div className="player-stats">
      <h3>Player Statistics</h3>
      <p>Total Games: {stats.gamesPlayed}</p>
      <p>Win Rate: {stats.winRate}%</p>
      <p>Total Winnings: {formatAmount(stats.totalWinnings)}</p>
      <p>Total Losses: {formatAmount(stats.totalLosses)}</p>
      <p>Average Bet: {formatAmount(stats.averageBet)}</p>
    </div>
  );
};

// GameHistory Component
const GameHistory = ({ diceContract, account, onError }) => {
  const [bets, setBets] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (diceContract && account) {
        try {
          const previousBets = await diceContract.getPreviousBets(account);
          const formattedBets = previousBets.map(bet => ({
            chosenNumber: bet.chosenNumber.toString(),
            rolledNumber: bet.rolledNumber.toString(),
            amount: bet.amount, // Keep as BigNumber
            timestamp: Number(bet.timestamp)
          }));
          setBets(formattedBets);
        } catch (err) {
          onError(err);
        }
      }
    };
    fetchHistory();
  }, [diceContract, account, onError]);

  const formatAmount = (amount) => {
    try {
      return `${ethers.formatEther(amount)} ETH`;
    } catch (err) {
      console.error('Error formatting amount:', err);
      return '0 ETH';
    }
  };

  return (
    <div className="game-history">
      <h3>Game History</h3>
      <div className="history-list">
        {bets.map((bet, index) => (
          <div key={index} className="history-item">
            <p>Chosen: {bet.chosenNumber}</p>
            <p>Rolled: {bet.rolledNumber}</p>
            <p>Amount: {formatAmount(bet.amount)}</p>
            <p>Time: {new Date(bet.timestamp * 1000).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// AdminPanel Component
const AdminPanel = ({ diceContract, tokenContract, onError }) => {
  const [historySize, setHistorySize] = useState('');
  const [playerAddress, setPlayerAddress] = useState('');

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

// Main App Component
function App() {
  // State management
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [diceContract, setDiceContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loadingStates, setLoadingStates] = useState({
    provider: true,
    contracts: true,
    gameData: true
  });

  // Error handling utility
  const handleError = (error) => {
    console.error('Error details:', error);
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
      setLoadingStates(prev => ({ ...prev, provider: false }));
      return { provider, signer };
    } catch (err) {
      handleError(err);
      setLoadingStates(prev => ({ ...prev, provider: false }));
      return null;
    }
  };

  // Contract initialization
  const initializeContracts = async (signer) => {
    try {
      if (!DICE_CONTRACT_ADDRESS || !TOKEN_CONTRACT_ADDRESS) {
        throw new Error("Contract addresses not found in environment variables");
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
      setLoadingStates(prev => ({ ...prev, contracts: false }));
      return { diceContract, tokenContract };
    } catch (err) {
      handleError(err);
      setLoadingStates(prev => ({ ...prev, contracts: false }));
      return null;
    }
  };

  // Account change handler
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setError("Please connect to MetaMask.");
      setAccount('');
      setIsAdmin(false);
    } else {
      setAccount(accounts[0]);
      if (diceContract) {
        const owner = await diceContract.owner();
        setIsAdmin(owner.toLowerCase() === accounts[0].toLowerCase());
      }
    }
  };

  // Chain change handler
  const handleChainChanged = () => {
    window.location.reload();
  };

  // Initialize everything
  useEffect(() => {
    const init = async () => {
      const providerData = await initializeProvider();
      if (!providerData) return;

      const contractsData = await initializeContracts(providerData.signer);
      if (!contractsData) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        await handleAccountsChanged(accounts);
        setLoadingStates(prev => ({ ...prev, gameData: false }));
      } catch (err) {
        handleError(err);
        setLoadingStates(prev => ({ ...prev, gameData: false }));
      }
    };

    init();

    // Event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Loading state check
  if (Object.values(loadingStates).some(state => state)) {
    return (
      <div className="App">
        <div className="loading-container">
          <h2>Loading...</h2>
          {loadingStates.provider && <p>Connecting to Web3 provider...</p>}
          {loadingStates.contracts && <p>Initializing contracts...</p>}
          {loadingStates.gameData && <p>Loading game data...</p>}
        </div>
      </div>
    );
  }

  // Error state check
  if (error) {
    return (
      <div className="App">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>Dice Game</h1>
        <p>Connected Account: {account}</p>
      </header>

      <main>
        <GameComponent
          diceContract={diceContract}
          tokenContract={tokenContract}
          account={account}
          onError={handleError}
        />

        <GameStatus
          diceContract={diceContract}
          account={account}
          onError={handleError}
        />

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

        {isAdmin && (
          <AdminPanel
            diceContract={diceContract}
            tokenContract={tokenContract}
            onError={handleError}
          />
        )}
      </main>
    </div>
  );
}

export default App;
