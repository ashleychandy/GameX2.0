import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { ethers } from "ethers";
import "./App.css";
import DiceABI from "./contracts/abi/Dice.json";
import TokenABI from "./contracts/abi/Token.json";

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
}) => {
  const [chosenNumber, setChosenNumber] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [canPlay, setCanPlay] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    const interval = setInterval(checkGameState, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [diceContract, account]);

  const playGame = async () => {
    if (!chosenNumber || !betAmount) {
      setError("Please enter both number and bet amount");
      return;
    }

    const number = parseInt(chosenNumber);
    if (number < 1 || number > 6) {
      setError("Number must be between 1 and 6");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const parsedAmount = ethers.parseEther(betAmount);

      // Check allowance first
      const allowance = await tokenContract.allowance(
        account,
        diceContract.target
      );

      if (allowance < parsedAmount) {
        const approveTx = await tokenContract.approve(
          diceContract.target,
          parsedAmount
        );
        await approveTx.wait();
      }

      // Play the game
      const tx = await diceContract.playDice(number, parsedAmount);
      await tx.wait();

      // Clear inputs after successful transaction
      setChosenNumber("");
      setBetAmount("");
    } catch (err) {
      setError(err.message);
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance) => {
    if (!balance) return "0";
    return ethers.formatEther(balance);
  };

  const formatGameResult = (result) => {
    if (!result) return null;
    return {
      chosenNumber: Number(result.chosenNumber),
      result: Number(result.result),
      amount: formatBalance(result.amount),
      timestamp: new Date(Number(result.timestamp) * 1000).toLocaleString(),
      payout: formatBalance(result.payout),
      status: result.status,
    };
  };

  const formatBetHistory = (bet) => {
    return {
      chosenNumber: Number(bet.chosenNumber),
      rolledNumber: Number(bet.rolledNumber),
      amount: formatBalance(bet.amount),
      timestamp: new Date(Number(bet.timestamp) * 1000).toLocaleString(),
    };
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
          onChange={(e) => setChosenNumber(e.target.value)}
          placeholder="Choose number (1-6)"
          disabled={!canPlay || loading}
        />
        <input
          type="text"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          placeholder="Bet amount in ETH"
          disabled={!canPlay || loading}
        />
        <button
          onClick={playGame}
          disabled={!canPlay || loading || !chosenNumber || !betAmount}
        >
          {loading ? "Processing..." : "Play"}
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

      setLastUpdate(Date.now());
    } catch (err) {
      console.error("Error fetching game status:", err);
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
    <div className="game-status">
      <h3>Current Game Status</h3>
      <div>
        <p>Active: {gameStatus.isActive.toString()}</p>
        <p>Status: {gameStatus.status}</p>
        <p>Chosen Number: {gameStatus.chosenNumber}</p>
        <p>Amount: {ethers.formatEther(gameStatus.amount)} ETH</p>
        <p>Time: {new Date(gameStatus.timestamp * 1000).toLocaleString()}</p>

        <div
          className="debug-info"
          style={{
            fontSize: "0.8em",
            color: "#666",
            textAlign: "left",
            marginTop: "20px",
          }}
        >
          <h4>Debug Information:</h4>
          <p>Request ID: {requestDetails?.requestId || "None"}</p>
          <p>
            Request Fulfilled: {requestDetails?.requestFulfilled?.toString()}
          </p>
          <p>Request Active: {requestDetails?.requestActive?.toString()}</p>
          <p>Can Resolve: {canResolve.toString()}</p>
          <p>Last Updated: {new Date(lastUpdate).toLocaleString()}</p>
        </div>

        {canResolve && (
          <button onClick={resolveGame} disabled={loading}>
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

// GameHistory Component
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
          }));
          setBets(formattedBets);
        } catch (err) {
          onError(err);
        }
      }
    };
    fetchHistory();
  }, [diceContract, account]);

  // Format only when displaying
  const formatAmount = (amount) => {
    try {
      return `${ethers.formatEther(amount)} ETH`;
    } catch (err) {
      console.error("Error formatting amount:", err);
      return "0 ETH";
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

const Home = () => {
  return (
    <div className="home-container">
      <header className="hero-section">
        <h1>Welcome to GameToken</h1>
        <p className="hero-subtitle">Your Gateway to Decentralized Gaming</p>
      </header>

      <section className="token-info">
        <h2>About GameToken</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>What is GameToken?</h3>
            <p>
              GameToken is a specialized ERC20 token designed specifically for
              decentralized gaming platforms. It enables secure, transparent,
              and fair gaming experiences on the blockchain.
            </p>
          </div>
          <div className="info-card">
            <h3>Features</h3>
            <ul>
              <li>Secure transactions</li>
              <li>Instant settlements</li>
              <li>Verifiable fairness</li>
              <li>Decentralized gaming</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="games-showcase">
        <h2>Available Games</h2>
        <div className="games-grid">
          <div className="game-card">
            <h3>Dice Game</h3>
            <p>
              Test your luck with our blockchain-powered dice game! Choose a
              number, place your bet, and win up to 6x your stake.
            </p>
            <ul>
              <li>Provably fair results</li>
              <li>Instant payouts</li>
              <li>Multiple betting options</li>
            </ul>
            <Link to="/dice" className="play-button">
              Play Now
            </Link>
          </div>
          <div className="game-card coming-soon">
            <h3>Coming Soon</h3>
            <p>More exciting games are on the way! Stay tuned for:</p>
            <ul>
              <li>Coin Flip</li>
              <li>Lottery</li>
              <li>Card Games</li>
              <li>And more!</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="how-to-start">
        <h2>How to Get Started</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Connect Wallet</h3>
            <p>Connect your MetaMask or other Web3 wallet to get started</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Get Tokens</h3>
            <p>Acquire GameTokens through our faucet or supported exchanges</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Start Playing</h3>
            <p>Choose your favorite game and start playing!</p>
          </div>
        </div>
      </section>
    </div>
  );
};

const AdminPage = ({ diceContract, tokenContract, account, onError }) => {
  const [historySize, setHistorySize] = useState("");
  const [playerAddress, setPlayerAddress] = useState("");
  const [callbackGasLimit, setCallbackGasLimit] = useState("");
  const [roleAddress, setRoleAddress] = useState("");
  const [minters, setMinters] = useState([]);
  const [burners, setBurners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contractBalance, setContractBalance] = useState("0");

  useEffect(() => {
    fetchData();
  }, [diceContract, tokenContract]);

  const fetchData = async () => {
    try {
      if (diceContract && tokenContract) {
        const balance = await diceContract.getContractBalance();
        setContractBalance(ethers.formatEther(balance));

        const { minters: mintersArray, burners: burnersArray } =
          await tokenContract.getMinterBurnerAddresses();
        setMinters(mintersArray);
        setBurners(burnersArray);
      }
    } catch (err) {
      onError(err);
    }
  };

  const handleTransaction = async (operation) => {
    setLoading(true);
    try {
      let tx;
      switch (operation) {
        case "pause":
          tx = await diceContract.pause();
          break;
        case "unpause":
          tx = await diceContract.unpause();
          break;
        case "setHistorySize":
          tx = await diceContract.setHistorySize(historySize);
          break;
        case "recoverStuckGame":
          tx = await diceContract.recoverStuckGame(playerAddress);
          break;
        case "forceStopGame":
          tx = await diceContract.forceStopGame(playerAddress);
          break;
        case "setCallbackGasLimit":
          tx = await diceContract.setCallbackGasLimit(callbackGasLimit);
          break;
        case "revokeMinterRole":
          tx = await tokenContract.revokeRole(
            await tokenContract.MINTER_ROLE(),
            roleAddress
          );
          break;
        case "revokeBurnerRole":
          tx = await tokenContract.revokeRole(
            await tokenContract.BURNER_ROLE(),
            roleAddress
          );
          break;
        default:
          throw new Error("Invalid operation");
      }
      await tx.wait();
      await fetchData();
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      <section className="admin-section">
        <h2>Contract Status</h2>
        <div className="status-info">
          <p>Contract Balance: {contractBalance} Tokens</p>
        </div>
      </section>

      <section className="admin-section">
        <h2>Game Controls</h2>
        <div className="button-group">
          <button onClick={() => handleTransaction("pause")} disabled={loading}>
            Pause Game
          </button>
          <button
            onClick={() => handleTransaction("unpause")}
            disabled={loading}
          >
            Unpause Game
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>Game Settings</h2>
        <div className="input-group">
          <input
            type="number"
            value={historySize}
            onChange={(e) => setHistorySize(e.target.value)}
            placeholder="New history size"
          />
          <button
            onClick={() => handleTransaction("setHistorySize")}
            disabled={loading}
          >
            Set History Size
          </button>
        </div>

        <div className="input-group">
          <input
            type="number"
            value={callbackGasLimit}
            onChange={(e) => setCallbackGasLimit(e.target.value)}
            placeholder="Callback gas limit"
          />
          <button
            onClick={() => handleTransaction("setCallbackGasLimit")}
            disabled={loading}
          >
            Set Callback Gas Limit
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>Player Management</h2>
        <div className="input-group">
          <input
            type="text"
            value={playerAddress}
            onChange={(e) => setPlayerAddress(e.target.value)}
            placeholder="Player address"
          />
          <div className="button-group">
            <button
              onClick={() => handleTransaction("recoverStuckGame")}
              disabled={loading}
            >
              Recover Stuck Game
            </button>
            <button
              onClick={() => handleTransaction("forceStopGame")}
              disabled={loading}
            >
              Force Stop Game
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2>Role Management</h2>
        <div className="role-lists">
          <div className="role-group">
            <h3>Minters</h3>
            <ul>
              {minters.map((address, index) => (
                <li key={index}>{address}</li>
              ))}
            </ul>
          </div>
          <div className="role-group">
            <h3>Burners</h3>
            <ul>
              {burners.map((address, index) => (
                <li key={index}>{address}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="input-group">
          <input
            type="text"
            value={roleAddress}
            onChange={(e) => setRoleAddress(e.target.value)}
            placeholder="Address to revoke role from"
          />
          <div className="button-group">
            <button
              onClick={() => handleTransaction("revokeMinterRole")}
              disabled={loading}
            >
              Revoke Minter Role
            </button>
            <button
              onClick={() => handleTransaction("revokeBurnerRole")}
              disabled={loading}
            >
              Revoke Burner Role
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <div className="loading-overlay">Processing transaction...</div>
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

  // Account change handler
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setError("Please connect to MetaMask.");
      setAccount("");
      setIsAdmin(false);
    } else {
      setAccount(accounts[0]);
      await checkAdminStatus(accounts[0]);
    }
  };

  // Chain change handler
  const handleChainChanged = () => {
    window.location.reload();
  };

  // Add this new function
  const checkAdminStatus = async (accountAddress) => {
    if (!tokenContract || !accountAddress) {
      setIsAdmin(false);
      return;
    }

    setIsCheckingAdmin(true);
    try {
      const DEFAULT_ADMIN_ROLE = await tokenContract.DEFAULT_ADMIN_ROLE();
      const hasAdminRole = await tokenContract.hasRole(DEFAULT_ADMIN_ROLE, accountAddress);
      setIsAdmin(hasAdminRole);
    } catch (err) {
      console.error("Error checking admin status:", err);
      setIsAdmin(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  // Add this effect to recheck admin status when tokenContract changes
  useEffect(() => {
    if (account && tokenContract) {
      checkAdminStatus(account);
    }
  }, [tokenContract, account]);

  // Initialize everything
  useEffect(() => {
    const init = async () => {
      const providerData = await initializeProvider();
      if (!providerData) return;

      const contractsData = await initializeContracts(providerData.signer);
      if (!contractsData) return;

      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        await handleAccountsChanged(accounts);
        setLoadingStates((prev) => ({ ...prev, gameData: false }));
      } catch (err) {
        handleError(err);
        setLoadingStates((prev) => ({ ...prev, gameData: false }));
      }
    };

    init();

    // Event listeners
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  // Loading state check
  if (Object.values(loadingStates).some((state) => state)) {
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
    <Router>
      <div className="App">
        <nav className="navigation">
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
          <div className="account-info">
            {account && (
              <p>
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dice"
            element={
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
            }
          />
          <Route
            path="/admin"
            element={
              isCheckingAdmin ? (
                <div className="loading-container">
                  <h2>Verifying admin status...</h2>
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
      </div>
    </Router>
  );
}

export default App;
