import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

// Constants for bet types to match contract
const BetTypes = {
  STRAIGHT: 0,    // Single number bet
  DOZEN: 1,       // 12 numbers (1-12, 13-24, 25-36)
  COLUMN: 2,      // 12 numbers (vertical 2:1)
  RED: 3,         // Red numbers
  BLACK: 4,       // Black numbers
  EVEN: 5,        // Even numbers
  ODD: 6,         // Odd numbers
  LOW: 7,         // 1-18
  HIGH: 8         // 19-36
};

// Contract constants
const CONTRACT_CONSTANTS = {
  MAX_BETS_PER_SPIN: 15,
  MAX_BET_AMOUNT: BigInt("100000000000000000000000"), // 100k tokens
  MAX_TOTAL_BET_AMOUNT: BigInt("500000000000000000000000"), // 500k tokens
  MAX_POSSIBLE_PAYOUT: BigInt("18000000000000000000000000"), // 18M tokens
};

// Chip values for betting
const CHIP_VALUES = [
  { value: "1000000000000000000", label: "1" },
  { value: "5000000000000000000", label: "5" },
  { value: "10000000000000000000", label: "10" },
  { value: "50000000000000000000", label: "50" },
  { value: "100000000000000000000", label: "100" },
  { value: "500000000000000000000", label: "500" },
  { value: "1000000000000000000000", label: "1K" },
  { value: "5000000000000000000000", label: "5K" },
];

const BettingBoard = ({ onBetSelect, selectedBets, disabled, selectedChipValue }) => {
  // Helper function to get total bet amount for a position
  const getBetAmount = useCallback((numbers, type) => {
    const bet = selectedBets.find(
      bet => bet.type === type && 
      JSON.stringify(bet.numbers.sort()) === JSON.stringify(numbers.sort())
    );
    
    if (!bet) return 0;
    
    try {
      return Math.floor(parseFloat(ethers.formatEther(bet.amount)));
    } catch (error) {
      console.error('Error parsing bet amount:', error);
      return 0;
    }
  }, [selectedBets]);

  // Helper function to check if a bet exists
  const hasBet = useCallback((numbers, type) => {
    return selectedBets.some(
      bet => bet.type === type && 
      JSON.stringify(bet.numbers.sort()) === JSON.stringify(numbers.sort())
    );
  }, [selectedBets]);

  // Handle bet placement
  const handleBetPlacement = useCallback((numbers, type) => {
    onBetSelect({ numbers, type });
  }, [onBetSelect]);

  // Helper function to determine if a number is red
  const isRedNumber = (number) => {
    return [
      1, 3, 5, 7, 9, 12, 14, 16, 18,
      19, 21, 23, 25, 27, 30, 32, 34, 36
    ].includes(number);
  };

  // Create the number grid layout
  const numberGrid = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
  ];

  // Helper function to get numbers for special bets
  const getBetNumbers = (type) => {
    switch (type) {
      case BetTypes.RED:
        return [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
      case BetTypes.BLACK:
        return [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
      case BetTypes.EVEN:
        return Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
      case BetTypes.ODD:
        return Array.from({ length: 18 }, (_, i) => (i * 2) + 1);
      case BetTypes.LOW:
        return Array.from({ length: 18 }, (_, i) => i + 1);
      case BetTypes.HIGH:
        return Array.from({ length: 18 }, (_, i) => i + 19);
      default:
        return [];
    }
  };

  return (
    <div className="roulette-board-section">
      <div className="roulette-grid">
        {/* Zero */}
        <div 
          className="stacked-chips" 
          style={{ gridRow: 'span 3' }}
          onClick={() => !disabled && handleBetPlacement([0], BetTypes.STRAIGHT)}
        >
          <button
            className={`number-button number-button-zero h-full ${
              hasBet([0], BetTypes.STRAIGHT) ? "number-button-selected" : ""
            }`}
            disabled={disabled}
          >
            <span>0</span>
          </button>
          {hasBet([0], BetTypes.STRAIGHT) && (
            <div 
              className="chip-stack"
              onClick={(e) => {
                e.stopPropagation();
                !disabled && handleBetPlacement([0], BetTypes.STRAIGHT);
              }}
            >
              {getBetAmount([0], BetTypes.STRAIGHT)}
            </div>
          )}
        </div>

        {/* Numbers 1-36 in grid layout */}
        {numberGrid.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((number) => (
              <div 
                key={number} 
                className="stacked-chips"
                onClick={() => !disabled && handleBetPlacement([number], BetTypes.STRAIGHT)}
              >
                <button
                  className={`number-button ${
                    isRedNumber(number) ? "number-button-red" : "number-button-black"
                  } ${
                    hasBet([number], BetTypes.STRAIGHT) ? "number-button-selected" : ""
                  }`}
                  disabled={disabled}
                >
                  <span>{number}</span>
                </button>
                {hasBet([number], BetTypes.STRAIGHT) && (
                  <div 
                    className="chip-stack"
                    onClick={(e) => {
                      e.stopPropagation();
                      !disabled && handleBetPlacement([number], BetTypes.STRAIGHT);
                    }}
                  >
                    {getBetAmount([number], BetTypes.STRAIGHT)}
                  </div>
                )}
              </div>
            ))}
            <button
              key={`column-${rowIndex}`}
              className="column-bet"
              onClick={() => 
                handleBetPlacement({
                  numbers: Array.from({ length: 12 }, (_, i) => i * 3 + (3 - rowIndex)),
                  type: BetTypes.COLUMN
                })
              }
              disabled={disabled}
            >
              2:1
            </button>
          </React.Fragment>
        ))}

        {/* Dozen Bets */}
        <div style={{ gridColumn: '2 / span 12' }} className="grid grid-cols-3 gap-1">
          <button
            className="dozen-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: Array.from({ length: 12 }, (_, i) => i + 1),
                type: BetTypes.DOZEN
              })
            }
            disabled={disabled}
          >
            1st 12
          </button>
          <button
            className="dozen-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: Array.from({ length: 12 }, (_, i) => i + 13),
                type: BetTypes.DOZEN
              })
            }
            disabled={disabled}
          >
            2nd 12
          </button>
          <button
            className="dozen-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: Array.from({ length: 12 }, (_, i) => i + 25),
                type: BetTypes.DOZEN
              })
            }
            disabled={disabled}
          >
            3rd 12
          </button>
        </div>

        {/* Bottom Bets */}
        <div style={{ gridColumn: '2 / span 12' }} className="grid grid-cols-6 gap-1">
          <button
            className="bottom-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: getBetNumbers(BetTypes.LOW),
                type: BetTypes.LOW
              })
            }
            disabled={disabled}
          >
            1-18
          </button>
          <button
            className="bottom-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: getBetNumbers(BetTypes.EVEN),
                type: BetTypes.EVEN
              })
            }
            disabled={disabled}
          >
            EVEN
          </button>
          <button
            className="bottom-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: getBetNumbers(BetTypes.RED),
                type: BetTypes.RED
              })
            }
            disabled={disabled}
          >
            RED
          </button>
          <button
            className="bottom-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: getBetNumbers(BetTypes.BLACK),
                type: BetTypes.BLACK
              })
            }
            disabled={disabled}
          >
            BLACK
          </button>
          <button
            className="bottom-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: getBetNumbers(BetTypes.ODD),
                type: BetTypes.ODD
              })
            }
            disabled={disabled}
          >
            ODD
          </button>
          <button
            className="bottom-bet"
            onClick={() => 
              handleBetPlacement({
                numbers: getBetNumbers(BetTypes.HIGH),
                type: BetTypes.HIGH
              })
            }
            disabled={disabled}
          >
            19-36
          </button>
        </div>
      </div>
    </div>
  );
};

// Add BetControls component
const BetControls = ({
  selectedChipValue,
  onChipValueChange,
  selectedBets,
  onClearBets,
  onPlaceBets,
  onApprove,
  isApproved,
  isCheckingApproval,
  disabled,
  gameState
}) => {
  return (
    <div className="bet-controls glass-panel p-4 space-y-4">
      <div className="chip-selector flex flex-wrap gap-2">
        {CHIP_VALUES.map((chip) => (
          <button
            key={chip.value}
            onClick={() => onChipValueChange(chip.value)}
            disabled={disabled}
            className={`chip-button ${
              selectedChipValue === chip.value ? 'ring-2 ring-white' : ''
            } ${
              chip.label === "1" ? "chip-1" :
              chip.label === "5" ? "chip-5" :
              chip.label === "10" ? "chip-10" :
              `chip-button-${chip.label}`
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Bet Controls */}
      <div className="flex gap-4">
        <button
          onClick={onClearBets}
          className="btn-secondary flex-1"
          disabled={disabled || selectedBets.length === 0}
        >
          Clear Bets
        </button>
        {isCheckingApproval ? (
          <button
            className="place-bet-button flex-1"
            disabled={true}
          >
            Checking Approval...
          </button>
        ) : isApproved ? (
          <button
            onClick={onPlaceBets}
            className="place-bet-button flex-1"
            disabled={disabled || selectedBets.length === 0}
          >
            {gameState.isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="small" />
                Processing...
              </span>
            ) : (
              "Place Bets"
            )}
          </button>
        ) : (
          <button
            onClick={onApprove}
            className="approve-button flex-1"
            disabled={disabled}
          >
            Approve Token
          </button>
        )}
      </div>
    </div>
  );
};

// Add BettingHistory component
const BettingHistory = ({ userData }) => {
  return (
    <div className="betting-history">
      <h3 className="text-xl font-bold mb-4">Recent Bets</h3>
      {userData?.recentBets?.length > 0 ? (
        <div className="space-y-2">
          {userData.recentBets.map((bet, index) => (
            <div key={index} className="history-item">
              <div className="flex items-center gap-4">
                <div className="text-gaming-primary font-bold">
                  #{bet.winningNumber}
                </div>
                <div>
                  <div className="text-sm text-secondary-400">
                    {new Date(bet.timestamp * 1000).toLocaleString()}
                  </div>
                  <div>Bet: {ethers.formatEther(bet.amount)} GAMA</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-secondary-400">Payout</div>
                <div className={bet.payout > 0 ? "text-gaming-success" : ""}>
                  {ethers.formatEther(bet.payout)} GAMA
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-secondary-400">
          No betting history available
        </div>
      )}
    </div>
  );
};

const RoulettePage = ({ contracts, account, onError, addToast }) => {
  // State management
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectedChipValue, setSelectedChipValue] = useState(CHIP_VALUES[0].value);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalBetAmount, setTotalBetAmount] = useState(BigInt(0));
  const [userGameData, setUserGameData] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);

  // Get React Query client
  const queryClient = useQueryClient();

  // Check token approval
  useEffect(() => {
    const checkApproval = async () => {
      if (!contracts?.token || !account || !contracts?.roulette) {
        setIsCheckingApproval(false);
        return;
      }

      try {
        const allowance = await contracts.token.allowance(
          account,
          contracts.roulette.target
        );
        setIsApproved(allowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT);
      } catch (error) {
        console.error("Error checking approval:", error);
      } finally {
        setIsCheckingApproval(false);
      }
    };

    checkApproval();
  }, [contracts?.token, contracts?.roulette, account]);

  // Handle token approval
  const handleApprove = async () => {
    if (!contracts?.token || !account || !contracts?.roulette) return;

    try {
      setIsProcessing(true);
      const tx = await contracts.token.approve(
        contracts.roulette.target,
        ethers.MaxUint256
      );
      await tx.wait();
      setIsApproved(true);
      addToast("Token approval successful", "success");
    } catch (error) {
      console.error("Error approving token:", error);
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler functions
  const handleBetSelect = useCallback(({ numbers, type }) => {
    setSelectedBets(prev => {
      // Find if there's an existing bet for this position
      const existingBetIndex = prev.findIndex(
        bet => bet.type === type && 
        JSON.stringify(bet.numbers.sort()) === JSON.stringify(numbers.sort())
      );

      if (existingBetIndex !== -1) {
        // Add to existing bet
        const updatedBets = [...prev];
        const existingBet = updatedBets[existingBetIndex];
        const newAmount = BigInt(existingBet.amount) + BigInt(selectedChipValue);
        updatedBets[existingBetIndex] = {
          ...existingBet,
          amount: newAmount.toString()
        };
        return updatedBets;
      } else {
        // Add new bet
        return [...prev, { 
          numbers, 
          type,
          amount: selectedChipValue 
        }];
      }
    });
  }, [selectedChipValue]);

  const handlePlaceBets = useCallback(async () => {
    if (!contracts?.roulette || !account || selectedBets.length === 0) return;
    if (selectedBets.length > CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
      onError(new Error(`Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`));
      return;
    }

    try {
      setIsProcessing(true);

      // Format bets for contract
      const betRequests = selectedBets.map(bet => ({
        numbers: bet.numbers,
        amount: bet.amount,
        betType: bet.type
      }));

      // Calculate total amount
      const totalAmount = selectedBets.reduce(
        (sum, bet) => sum + BigInt(bet.amount),
        BigInt(0)
      );

      // Validate total amount
      if (totalAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
        throw new Error("Total bet amount exceeds maximum allowed");
      }

      // Place bets
      const tx = await contracts.roulette.placeBet(betRequests);
      await tx.wait();

      // Reset state and update UI
      setSelectedBets([]);
      addToast("Bets placed successfully!", "success");

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(["rouletteHistory", account]);
      queryClient.invalidateQueries(["balance", account]);

    } catch (error) {
      console.error("Error placing bets:", error);
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    contracts?.roulette, 
    account, 
    selectedBets, 
    addToast, 
    onError, 
    queryClient
  ]);

  const handleChipValueChange = useCallback((value) => {
    setSelectedChipValue(value);
  }, []);

  const handleClearBets = useCallback(() => {
    setSelectedBets([]);
  }, []);

  // Load user game data
  useEffect(() => {
    const loadUserData = async () => {
      if (!contracts?.roulette || !account) return;
      try {
        const data = await contracts.roulette.userData(account);
        setUserGameData(data);
      } catch (error) {
        console.error("Error loading user data:", error);
        onError?.("Failed to load user data");
      }
    };

    loadUserData();
  }, [contracts?.roulette, account, onError]);

  return (
    <div className="page-container">
      <div className="roulette-container">
        <BettingBoard
          onBetSelect={handleBetSelect}
          selectedBets={selectedBets}
          disabled={isProcessing}
          selectedChipValue={selectedChipValue}
        />

        <div className="betting-controls">
          <BetControls
            selectedChipValue={selectedChipValue}
            onChipValueChange={handleChipValueChange}
            selectedBets={selectedBets}
            onClearBets={handleClearBets}
            onPlaceBets={handlePlaceBets}
            onApprove={handleApprove}
            isApproved={isApproved}
            isCheckingApproval={isCheckingApproval}
            disabled={isProcessing}
            gameState={{ isProcessing }}
          />

          <div className="roulette-stats">
            <div className="stat-card">
              <div className="stat-label">Total Bets</div>
              <div className="stat-value">{selectedBets.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Amount</div>
              <div className="stat-value">
                {ethers.formatEther(totalBetAmount)} GAMA
              </div>
            </div>
          </div>
        </div>

        {userGameData?.recentBets?.length > 0 && (
          <div className="betting-history">
            <h3 className="text-xl font-bold mb-4">Recent Bets</h3>
            <div className="space-y-2">
              {userGameData.recentBets.map((bet, index) => (
                <div key={index} className="history-item">
                  <div className="flex items-center gap-4">
                    <div className="text-gaming-primary font-bold">
                      #{bet.winningNumber}
                    </div>
                    <div>
                      <div className="text-sm text-secondary-400">
                        {new Date(bet.timestamp * 1000).toLocaleString()}
                      </div>
                      <div>Bet: {ethers.formatEther(bet.amount)} GAMA</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-secondary-400">Payout</div>
                    <div className={bet.payout > 0 ? "text-gaming-success" : ""}>
                      {ethers.formatEther(bet.payout)} GAMA
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add LoadingSpinner component
const LoadingSpinner = ({ size = "default" }) => (
  <div
    className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${
      size === "small" ? "h-4 w-4" : "h-6 w-6"
    }`}
    role="status"
  />
);

export default RoulettePage;
