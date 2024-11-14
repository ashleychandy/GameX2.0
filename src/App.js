import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import './App.css';

// Import ABIs
import DiceABI from './contracts/abi/Dice.json';
import TokenABI from './contracts/abi/Token.json';

function App() {
  // State Management
  const [walletData, setWalletData] = useState({
    isConnected: false,
    address: '',
    chainId: '',
    balance: '0',
    signer: null,
    provider: null
  });

  const [contracts, setContracts] = useState({
    diceGame: null,
    token: null
  });

  const [gameState, setGameState] = useState({
    tokenBalance: '0',
    canStartNewGame: false,
    betAmount: '',
    selectedNumber: '',
    gameResult: '',
    isLoading: false,
    requestDetails: {
      requestId: '0',
      requestFulfilled: false,
      requestActive: false
    }
  });

  const [gameHistory, setGameHistory] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Initialize Contracts
  const initializeContracts = async (signer) => {
    try {
      const diceGame = new ethers.Contract(
        process.env.REACT_APP_DICE_GAME_ADDRESS,
        DiceABI.abi,
        signer
      );

      const token = new ethers.Contract(
        process.env.REACT_APP_TOKEN_ADDRESS,
        TokenABI.abi,
        signer
      );

      setContracts({ diceGame, token });
    } catch (error) {
      console.error('Error initializing contracts:', error);
      setError('Failed to initialize contracts');
      throw error;
    }
  };

  // Connect Wallet
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      const provider = await detectEthereumProvider();
      
      if (!provider) {
        throw new Error('Please install MetaMask!');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethersProvider.getSigner();
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const balance = await ethersProvider.getBalance(accounts[0]);

      setWalletData({
        isConnected: true,
        address: accounts[0],
        chainId: chainId,
        balance: ethers.formatEther(balance),
        signer: signer,
        provider: ethersProvider
      });

      await initializeContracts(signer);
      await refreshGameData();

    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(`Error connecting wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Refresh Game Data
  const refreshGameData = async () => {
    if (!contracts.diceGame || !contracts.token || !walletData.address) return;

    try {
      const [
        balance,
        requestDetails,
        canStart
      ] = await Promise.all([
        contracts.token.balanceOf(walletData.address),
        contracts.diceGame.getCurrentRequestDetails(walletData.address),
        contracts.diceGame.canStartNewGame(walletData.address)
      ]);

      await fetchGameHistory();

      setGameState(prev => ({
        ...prev,
        tokenBalance: ethers.formatUnits(balance, 18),
        canStartNewGame: canStart,
        requestDetails: {
          requestId: requestDetails[0].toString(),
          requestFulfilled: requestDetails[1],
          requestActive: requestDetails[2]
        }
      }));
    } catch (error) {
      console.error('Error refreshing game data:', error);
      setError('Failed to refresh game data');
    }
  };

  // Fetch Game History
  const fetchGameHistory = async () => {
    if (!contracts.diceGame || !walletData.address) return;

    try {
      const filter = {
        address: process.env.REACT_APP_DICE_GAME_ADDRESS,
        topics: [
          ethers.id("GameResult(address,uint256,uint256,bool,uint256)"),
          ethers.zeroPadValue(walletData.address, 32)
        ]
      };

      const events = await walletData.provider.getLogs({
        ...filter,
        fromBlock: -1000
      });

      const iface = new ethers.Interface(DiceABI.abi);
      const history = await Promise.all(events.map(async (event) => {
        const parsedLog = iface.parseLog({
          topics: event.topics,
          data: event.data
        });
        const block = await walletData.provider.getBlock(event.blockNumber);
        
        return {
          timestamp: new Date(Number(block.timestamp) * 1000).toLocaleString(),
          playerNumber: parsedLog.args[1],
          randomNumber: parsedLog.args[2],
          won: parsedLog.args[3],
          payout: ethers.formatUnits(parsedLog.args[4], 18)
        };
      }));

      setGameHistory(history.reverse());
    } catch (error) {
      console.error('Error fetching game history:', error);
      setError('Failed to fetch game history');
    }
  };

  // Handle Bet
  const handleBet = async () => {
    if (!gameState.canStartNewGame || !gameState.betAmount || !gameState.selectedNumber) return;

    try {
      setGameState(prev => ({ ...prev, isLoading: true }));
      const betAmount = ethers.parseUnits(gameState.betAmount, 18);

      const approveTx = await contracts.token.approve(
        process.env.REACT_APP_DICE_GAME_ADDRESS,
        betAmount
      );
      await approveTx.wait();

      const betTx = await contracts.diceGame.placeBet(
        betAmount,
        gameState.selectedNumber
      );
      await betTx.wait();

      await refreshGameData();
      setGameState(prev => ({
        ...prev,
        gameResult: 'Bet placed successfully! Waiting for result...',
        betAmount: '',
        selectedNumber: ''
      }));
    } catch (error) {
      console.error('Error placing bet:', error);
      setGameState(prev => ({
        ...prev,
        gameResult: `Error placing bet: ${error.message}`
      }));
    } finally {
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGameState(prev => ({ ...prev, [name]: value }));
  };

  // Handle Number Selection
  const handleNumberSelect = (number) => {
    setGameState(prev => ({ ...prev, selectedNumber: number }));
  };

  // Auto connect wallet
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  // Event Listeners
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setWalletData({
            isConnected: false,
            address: '',
            chainId: '',
            balance: '0',
            signer: null,
            provider: null
          });
        } else {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return () => {
        window.ethereum.removeListener('accountsChanged', connectWallet);
        window.ethereum.removeListener('chainChanged', () => {
          window.location.reload();
        });
      };
    }
  }, []);

  // Auto-refresh game data
  useEffect(() => {
    if (walletData.isConnected) {
      const interval = setInterval(refreshGameData, 5000);
      return () => clearInterval(interval);
    }
  }, [walletData.isConnected, contracts]);

  // Components
  const WalletConnection = () => (
    <div className="wallet-connection">
      {!walletData.isConnected ? (
        <button 
          onClick={connectWallet} 
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="wallet-info">
          <p>Address: {walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}</p>
          <p>Balance: {Number(walletData.balance).toFixed(4)} ETH</p>
        </div>
      )}
    </div>
  );

  const GameInterface = () => (
    <div className="game-interface">
      <div className="game-stats">
        <p>Token Balance: {gameState.tokenBalance}</p>
        <p>Can Start New Game: {gameState.canStartNewGame ? 'Yes' : 'No'}</p>
      </div>

      <div className="game-controls">
        <input
          type="number"
          name="betAmount"
          value={gameState.betAmount}
          onChange={handleInputChange}
          placeholder="Bet Amount"
          disabled={!gameState.canStartNewGame || gameState.isLoading}
        />

        <div className="number-selector">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => handleNumberSelect(num)}
              className={gameState.selectedNumber === num ? 'selected' : ''}
              disabled={!gameState.canStartNewGame || gameState.isLoading}
            >
              {num}
            </button>
          ))}
        </div>

        <button
          onClick={handleBet}
          disabled={
            !gameState.canStartNewGame ||
            !gameState.betAmount ||
            !gameState.selectedNumber ||
            gameState.isLoading
          }
        >
          {gameState.isLoading ? 'Rolling...' : 'Roll Dice'}
        </button>
      </div>

      {gameState.gameResult && (
        <div className="game-result">
          {gameState.gameResult}
        </div>
      )}
    </div>
  );

  const GameHistory = () => (
    <div className="game-history">
      <h3>Game History</h3>
      <div className="history-list">
        {gameHistory.length === 0 ? (
          <p>No games played yet</p>
        ) : (
          gameHistory.map((game, index) => (
            <div key={index} className="history-item">
              <p>Time: {game.timestamp}</p>
              <p>Your Number: {game.playerNumber}</p>
              <p>Dice Roll: {game.randomNumber}</p>
              <p>Result: {game.won ? 'Won' : 'Lost'}</p>
              {game.won && <p>Payout: {game.payout} tokens</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render
  return (
    <div className="App">
      <WalletConnection />
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {!walletData.isConnected ? (
        <div className="connect-prompt">
          Please connect your wallet to play
        </div>
      ) : (
        <>
          <GameInterface />
          <GameHistory />
        </>
      )}
    </div>
  );
}

export default App;
