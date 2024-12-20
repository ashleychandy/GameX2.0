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
    return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
  }, [selectedBets]);

  const handleBet = useCallback((numbers, type) => {
    if (!disabled) {
      onBetSelect(numbers, type);
    }
  }, [disabled, onBetSelect]);

  // Define number colors
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const isRed = (number) => redNumbers.includes(number);

  return (
    <div className="flex flex-col gap-2 p-4 bg-secondary-800 rounded-lg">
      {/* Main betting grid */}
      <div className="grid grid-cols-14 gap-1">
        {/* Zero */}
        <button
          onClick={() => handleBet([0], BetTypes.STRAIGHT)}
          className={`col-span-1 aspect-square rounded-md ${
            isRed(0) ? 'bg-gaming-primary' : 'bg-gaming-success'
          } hover:opacity-80 transition-opacity`}
        >
          0
        </button>
        
        {/* Numbers 1-36 */}
        {Array.from({ length: 36 }, (_, i) => i + 1).map((number) => (
          <button
            key={number}
            onClick={() => handleBet([number], BetTypes.STRAIGHT)}
            className={`aspect-square rounded-md ${
              isRed(number) ? 'bg-gaming-primary' : 'bg-secondary-700'
            } hover:opacity-80 transition-opacity text-white font-bold`}
          >
            {number}
          </button>
        ))}

        {/* 2:1 columns */}
        {[2, 1, 0].map((col) => (
          <button
            key={`2to1-${col}`}
            onClick={() => handleBet(
              Array.from({ length: 12 }, (_, i) => i * 3 + (3 - col)),
              BetTypes.COLUMN
            )}
            className="aspect-square rounded-md bg-secondary-700 hover:opacity-80 transition-opacity"
          >
            2:1
          </button>
        ))}
      </div>

      {/* Bottom betting options */}
      <div className="grid grid-cols-3 gap-1 mt-2">
        {/* Dozens */}
        <div className="grid grid-cols-3 col-span-3 gap-1 mb-2">
          <button
            onClick={() => handleBet(Array.from({ length: 12 }, (_, i) => i + 1), BetTypes.DOZEN)}
            className="p-2 rounded-md bg-secondary-700 hover:opacity-80 transition-opacity"
          >
            1 to 12
          </button>
          <button
            onClick={() => handleBet(Array.from({ length: 12 }, (_, i) => i + 13), BetTypes.DOZEN)}
            className="p-2 rounded-md bg-secondary-700 hover:opacity-80 transition-opacity"
          >
            13 to 24
          </button>
          <button
            onClick={() => handleBet(Array.from({ length: 12 }, (_, i) => i + 25), BetTypes.DOZEN)}
            className="p-2 rounded-md bg-secondary-700 hover:opacity-80 transition-opacity"
          >
            25 to 36
          </button>
        </div>

        {/* Other betting options */}
        <div className="grid grid-cols-6 col-span-3 gap-1">
          <button
            onClick={() => handleBet(Array.from({ length: 18 }, (_, i) => i + 1), BetTypes.LOW)}
            className="p-2 rounded-md bg-secondary-700 hover:opacity-80 transition-opacity col-span-1"
          >
            1 to 18
          </button>
          <button
            onClick={() => handleBet([], BetTypes.EVEN)}
            className="p-2 rounded-md bg-secondary-700 hover:opacity-80 transition-opacity col-span-1"
          >
            Even
          </button>
          <button
            onClick={() => handleBet(redNumbers, BetTypes.RED)}
            className="p-2 rounded-md bg-gaming-primary hover:opacity-80 transition-opacity col-span-2"
          >
            Red
          </button>
          <button
            onClick={() => handleBet([], BetTypes.ODD)}
            className="p-2 rounded-md bg-secondary-700 hover:opacity-80 transition-opacity col-span-1"
          >
            Odd
          </button>
          <button
            onClick={() => handleBet(Array.from({ length: 18 }, (_, i) => i + 19), BetTypes.HIGH)}
            className="p-2 rounded-md bg-secondary-700 hover:opacity-80 transition-opacity col-span-1"
          >
            19 to 36
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
      console.log("Checking approval status:", {
        hasToken: !!contracts?.token,
        hasRouletteContract: !!contracts?.roulette,
        hasAccount: !!account,
        rouletteAddress: contracts?.roulette?.target,
        tokenAddress: contracts?.token?.target
      });

      if (!contracts?.token || !account || !contracts?.roulette) {
        console.log("Missing contracts or account:", {
          hasToken: !!contracts?.token,
          hasRoulette: !!contracts?.roulette,
          hasAccount: !!account
        });
        setIsCheckingApproval(false);
        return;
      }

      try {
        // Get token allowance
        const allowance = await contracts.token.allowance(
          account,
          contracts.roulette.target
        );
        
        const isApprovedAmount = allowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT;
        console.log("Token approval check:", {
          tokenContract: contracts.token.target,
          rouletteContract: contracts.roulette.target,
          account,
          currentAllowance: ethers.formatEther(allowance),
          requiredAmount: ethers.formatEther(CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT),
          isApproved: isApprovedAmount
        });
        
        setIsApproved(isApprovedAmount);
      } catch (error) {
        console.error("Error checking approval:", error);
        setIsApproved(false);
      } finally {
        setIsCheckingApproval(false);
      }
    };

    checkApproval();
  }, [contracts?.token, contracts?.roulette, account]);

  // Handle token approval
  const handleApprove = async () => {
    if (!contracts?.token || !account || !contracts?.roulette) {
      console.error("Contracts or account not initialized");
      return;
    }

    try {
      setIsProcessing(true);
      console.log("Approving token spend:", {
        spender: contracts.roulette.target,
        amount: CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT.toString()
      });

      // Approve exact amount instead of max uint256
      const tx = await contracts.token.approve(
        contracts.roulette.target,
        CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT
      );
      console.log("Approval transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("Approval confirmed");
      
      // Verify the new allowance
      const newAllowance = await contracts.token.allowance(
        account,
        contracts.roulette.target
      );
      console.log("New allowance:", ethers.formatEther(newAllowance));
      
      setIsApproved(newAllowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT);
      addToast("Token approval successful", "success");
    } catch (error) {
      console.error("Error approving token:", error);
      addToast("Failed to approve token. Please try again.", "error");
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
