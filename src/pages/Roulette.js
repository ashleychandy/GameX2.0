import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// Constants for bet types to match contract
const BetTypes = {
  STRAIGHT: 0, // Single number bet
  DOZEN: 1, // 12 numbers (1-12, 13-24, 25-36)
  COLUMN: 2, // 12 numbers (vertical 2:1)
  RED: 3, // Red numbers
  BLACK: 4, // Black numbers
  EVEN: 5, // Even numbers
  ODD: 6, // Odd numbers
  LOW: 7, // 1-18
  HIGH: 8, // 19-36
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

const BettingBoard = ({
  onBetSelect,
  selectedBets,
  disabled,
  selectedChipValue,
}) => {
  // Helper function to get total bet amount for a position
  const getBetAmount = useCallback(
    (numbers, type) => {
      // For column bets, find by first number
      if (type === BetTypes.COLUMN) {
        const columnStart = Array.isArray(numbers) ? numbers[0] : numbers;
        const bet = selectedBets.find(
          (bet) =>
            bet.type === type &&
            bet.numbers.length === 12 &&
            bet.numbers[0] === columnStart
        );
        return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
      }

      // For dozen bets, find by first number
      if (type === BetTypes.DOZEN) {
        const dozenStart = Array.isArray(numbers) ? numbers[0] : numbers;
        const bet = selectedBets.find(
          (bet) =>
            bet.type === type &&
            bet.numbers.length === 12 &&
            bet.numbers[0] === dozenStart
        );
        return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
      }

      // For other bets
      const bet = selectedBets.find(
        (bet) =>
          bet.type === type &&
          JSON.stringify(bet.numbers.sort()) ===
            JSON.stringify(
              Array.isArray(numbers) ? numbers.sort() : [numbers].sort()
            )
      );
      return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
    },
    [selectedBets]
  );

  const handleBet = useCallback(
    (numbers, type) => {
      if (!disabled) {
        onBetSelect(numbers, type);
      }
    },
    [disabled, onBetSelect]
  );

  // Define number colors and grid layout
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  const isRed = (number) => redNumbers.includes(number);

  // Define the grid layout in rows (top to bottom)
  const numberGrid = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="flex flex-col gap-3 p-6 bg-secondary-900/90 backdrop-blur-lg rounded-xl border border-white/5 shadow-2xl">
      {/* Main betting grid */}
      <div className="grid grid-cols-[45px_1fr] gap-2">
        {/* Zero */}
        <div className="row-span-3">
          <button
            onClick={() => handleBet([0], BetTypes.STRAIGHT)}
            className={`h-full w-full rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 flex items-center justify-center font-bold text-2xl relative ${
              getBetAmount([0], BetTypes.STRAIGHT) > 0
                ? "ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-secondary-900"
                : ""
            }`}
          >
            <span className="text-white/90">0</span>
            {getBetAmount([0], BetTypes.STRAIGHT) > 0 && (
              <div className="absolute -top-2 -right-2 bg-white/95 text-emerald-600 text-xs px-2 py-0.5 rounded-full z-10 shadow-lg font-bold border border-emerald-200/20">
                {getBetAmount([0], BetTypes.STRAIGHT)}
              </div>
            )}
          </button>
        </div>

        {/* Numbers 1-36 in grid layout with 2:1 buttons */}
        <div className="grid grid-rows-3 gap-2">
          {numberGrid.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[repeat(12,minmax(0,1fr))_45px] gap-2"
            >
              {row.map((number) => (
                <button
                  key={number}
                  onClick={() => handleBet([number], BetTypes.STRAIGHT)}
                  className={`aspect-square rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ${
                    isRed(number)
                      ? "bg-gradient-to-br from-gaming-primary to-gaming-primary/90 hover:from-gaming-primary hover:to-gaming-primary/80"
                      : "bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800"
                  } text-white font-bold text-xl relative ${
                    getBetAmount([number], BetTypes.STRAIGHT) > 0
                      ? `ring-2 ${
                          isRed(number)
                            ? "ring-gaming-primary/50"
                            : "ring-gray-500/50"
                        } ring-offset-2 ring-offset-secondary-900`
                      : ""
                  }`}
                >
                  <span className="text-white/90">{number}</span>
                  {getBetAmount([number], BetTypes.STRAIGHT) > 0 && (
                    <div className="absolute -top-2 -right-2 bg-white/95 text-secondary-900 text-xs px-2 py-0.5 rounded-full z-10 shadow-lg font-bold border border-secondary-300/20">
                      {getBetAmount([number], BetTypes.STRAIGHT)}
                    </div>
                  )}
                </button>
              ))}
              {/* 2:1 button for each row */}
              <button
                onClick={() => {
                  // Generate all 12 numbers for the column
                  const columnStart = 3 - rowIndex;
                  const numbers = Array.from(
                    { length: 12 },
                    (_, i) => columnStart + i * 3
                  );
                  handleBet(numbers, BetTypes.COLUMN);
                }}
                className="aspect-square rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 font-bold text-lg flex items-center justify-center text-white/90 relative"
              >
                2:1
                {getBetAmount([3 - rowIndex], BetTypes.COLUMN) > 0 && (
                  <div className="absolute -top-2 -right-2 bg-white/95 text-indigo-600 text-xs px-2 py-0.5 rounded-full z-10 shadow-lg font-bold border border-indigo-200/20">
                    {getBetAmount([3 - rowIndex], BetTypes.COLUMN)}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom betting options */}
      <div className="flex flex-col gap-2 mt-1">
        {/* Dozens */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { start: 1, label: "1 to 12" },
            { start: 13, label: "13 to 24" },
            { start: 25, label: "25 to 36" },
          ].map((dozen) => (
            <button
              key={dozen.start}
              onClick={() => {
                // Generate all 12 numbers for the dozen
                const numbers = Array.from(
                  { length: 12 },
                  (_, i) => dozen.start + i
                );
                handleBet(numbers, BetTypes.DOZEN);
              }}
              className="h-12 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-lg hover:shadow-purple-500/20 transition-all duration-200 text-base font-bold flex items-center justify-center text-white/90 relative"
            >
              {dozen.label}
              {getBetAmount([dozen.start], BetTypes.DOZEN) > 0 && (
                <div className="absolute -top-2 -right-2 bg-white/95 text-purple-600 text-xs px-2 py-0.5 rounded-full z-10 shadow-lg font-bold border border-purple-200/20">
                  {getBetAmount([dozen.start], BetTypes.DOZEN)}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Other betting options */}
        <div className="grid grid-cols-6 gap-2">
          {[
            { type: BetTypes.LOW, label: "1 to 18", color: "cyan" },
            { type: BetTypes.EVEN, label: "Even", color: "cyan" },
            {
              type: BetTypes.RED,
              label: "Red",
              color: "gaming-primary",
              isRed: true,
            },
            { type: BetTypes.BLACK, label: "Black", color: "gray" },
            { type: BetTypes.ODD, label: "Odd", color: "cyan" },
            { type: BetTypes.HIGH, label: "19 to 36", color: "cyan" },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => handleBet([], option.type)}
              className={`h-12 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base font-bold flex items-center justify-center relative ${
                option.isRed
                  ? "bg-gradient-to-br from-gaming-primary to-gaming-primary/90 hover:from-gaming-primary hover:to-gaming-primary/80 text-white/90"
                  : option.color === "gray"
                  ? "bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white/90"
                  : `bg-gradient-to-br from-${option.color}-600 to-${option.color}-700 hover:from-${option.color}-500 hover:to-${option.color}-600 text-white/90 hover:shadow-${option.color}-500/20`
              }`}
            >
              {option.label}
              {getBetAmount([], option.type) > 0 && (
                <div
                  className={`absolute -top-2 -right-2 bg-white/95 ${
                    option.isRed
                      ? "text-gaming-primary"
                      : option.color === "gray"
                      ? "text-gray-800"
                      : `text-${option.color}-600`
                  } text-xs px-2 py-0.5 rounded-full z-10 shadow-lg font-bold border ${
                    option.isRed
                      ? "border-gaming-primary/20"
                      : option.color === "gray"
                      ? "border-gray-300/20"
                      : `border-${option.color}-200/20`
                  }`}
                >
                  {getBetAmount([], option.type)}
                </div>
              )}
            </button>
          ))}
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
  gameState,
  onUndoBet,
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
              selectedChipValue === chip.value ? "ring-2 ring-white" : ""
            } ${
              chip.label === "1"
                ? "chip-1"
                : chip.label === "5"
                ? "chip-5"
                : chip.label === "10"
                ? "chip-10"
                : `chip-button-${chip.label}`
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Bet Controls */}
      <div className="flex gap-2">
        <button
          onClick={onUndoBet}
          className="btn-secondary flex-1 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600"
          disabled={disabled || selectedBets.length === 0}
        >
          Undo Last Bet
        </button>
        <button
          onClick={onClearBets}
          className="btn-secondary flex-1"
          disabled={disabled || selectedBets.length === 0}
        >
          Clear Bets
        </button>
        {isCheckingApproval ? (
          <button className="place-bet-button flex-1" disabled={true}>
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

// Add helper function to get bet type name
const getBetTypeName = (betType) => {
  const types = {
    0: "Straight",
    1: "Dozen",
    2: "Column",
    3: "Red",
    4: "Black",
    5: "Even",
    6: "Odd",
    7: "Low",
    8: "High",
  };
  return types[betType] || "Unknown";
};

// Add BettingHistory component
const BettingHistory = ({ account, contracts }) => {
  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rouletteHistory", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) return null;
      try {
        const data = await contracts.roulette.getUserGameData(account);

        // Check if data exists and is an array
        if (!data || !Array.isArray(data)) {
          console.log("No betting data found or invalid format:", data);
          return [];
        }

        // Convert BigInts to strings for proper serialization
        return data.map((bet) => ({
          timestamp: Number(bet.timestamp),
          betType: Number(bet.betType),
          numbers: Array.isArray(bet.numbers)
            ? bet.numbers.map((n) => Number(n))
            : [],
          amount: bet.amount.toString(),
          payout: bet.payout.toString(),
          winningNumber: Number(bet.winningNumber),
        }));
      } catch (error) {
        console.error("Error fetching betting history:", error);
        throw error;
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
    cacheTime: 30000, // Keep data in cache for 30 seconds
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries,
    structuralSharing: false, // Disable structural sharing to prevent serialization issues
  });

  if (isLoading) {
    return (
      <div className="betting-history">
        <h3 className="text-xl font-bold mb-4">Recent Bets</h3>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Betting history error:", error);
    return (
      <div className="betting-history">
        <h3 className="text-xl font-bold mb-4">Recent Bets</h3>
        <div className="text-center text-gaming-error py-4">
          Failed to load betting history. Please try again later.
        </div>
      </div>
    );
  }

  // Ensure userData is an array before rendering
  const bettingHistory = Array.isArray(userData) ? userData : [];

  return (
    <div className="betting-history bg-secondary-800 rounded-lg p-4">
      <h3 className="text-xl font-bold mb-4">Recent Bets</h3>
      {bettingHistory.length > 0 ? (
        <div className="space-y-4">
          {bettingHistory.map((bet, index) => (
            <div
              key={`${bet.timestamp}-${index}`}
              className="history-item bg-secondary-700 rounded-lg p-4 space-y-3"
            >
              {/* Header with timestamp and result */}
              <div className="flex justify-between items-start">
                <div className="text-sm text-secondary-400">
                  {new Date(bet.timestamp * 1000).toLocaleString()}
                </div>
                <div
                  className={`text-lg font-bold ${
                    BigInt(bet.payout) > 0
                      ? "text-gaming-success"
                      : "text-gaming-error"
                  }`}
                >
                  {BigInt(bet.payout) > 0 ? "WIN" : "LOSS"}
                </div>
              </div>

              {/* Main bet information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-secondary-400">
                    Winning Number
                  </div>
                  <div className="text-2xl font-bold">#{bet.winningNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-400">Bet Type</div>
                  <div className="font-medium">
                    {getBetTypeName(bet.betType)}
                  </div>
                </div>
              </div>

              {/* Numbers and amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-secondary-400">
                    Selected Numbers
                  </div>
                  <div className="max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-secondary-600 scrollbar-track-secondary-800">
                    <div className="font-medium flex flex-wrap gap-1 p-1">
                      {bet.numbers.length > 0 ? (
                        bet.numbers.length <= 5 ? (
                          bet.numbers.map((num, i) => (
                            <span
                              key={i}
                              className="bg-secondary-600 min-w-[2rem] h-8 flex items-center justify-center rounded-md text-sm"
                            >
                              {num}
                            </span>
                          ))
                        ) : (
                          <div className="grid grid-cols-6 gap-1 w-full">
                            {bet.numbers.map((num, i) => (
                              <span
                                key={i}
                                className="bg-secondary-600 w-7 h-7 flex items-center justify-center rounded-md text-xs"
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        )
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary-400">
                    Amount & Payout
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">
                      Bet: {ethers.formatEther(bet.amount)} GAMA
                    </div>
                    <div
                      className={`font-bold ${
                        BigInt(bet.payout) > 0
                          ? "text-gaming-success"
                          : "text-secondary-400"
                      }`}
                    >
                      Payout: {ethers.formatEther(bet.payout)} GAMA
                    </div>
                  </div>
                </div>
              </div>

              {/* Multiplier and profit/loss */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-secondary-600">
                <div>
                  <div className="text-sm text-secondary-400">Multiplier</div>
                  <div className="font-medium">
                    {BigInt(bet.payout) > 0
                      ? `${(
                          Number(ethers.formatEther(bet.payout)) /
                          Number(ethers.formatEther(bet.amount))
                        ).toFixed(2)}x`
                      : "0x"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary-400">Profit/Loss</div>
                  <div
                    className={`font-bold ${
                      BigInt(bet.payout) > BigInt(bet.amount)
                        ? "text-gaming-success"
                        : "text-gaming-error"
                    }`}
                  >
                    {ethers.formatEther(
                      BigInt(bet.payout) - BigInt(bet.amount)
                    )}{" "}
                    GAMA
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-secondary-400 py-8">
          No betting history available
        </div>
      )}
    </div>
  );
};

const RoulettePage = ({ contracts, account, onError, addToast }) => {
  // State management
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectedChipValue, setSelectedChipValue] = useState(
    CHIP_VALUES[0].value
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalBetAmount, setTotalBetAmount] = useState(BigInt(0));
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
        tokenAddress: contracts?.token?.target,
      });

      if (!contracts?.token || !account || !contracts?.roulette) {
        console.log("Missing contracts or account:", {
          hasToken: !!contracts?.token,
          hasRoulette: !!contracts?.roulette,
          hasAccount: !!account,
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

        const isApprovedAmount =
          allowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT;
        console.log("Token approval check:", {
          tokenContract: contracts.token.target,
          rouletteContract: contracts.roulette.target,
          account,
          currentAllowance: ethers.formatEther(allowance),
          requiredAmount: ethers.formatEther(
            CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT
          ),
          isApproved: isApprovedAmount,
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
        amount: CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT.toString(),
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
  const handleBetSelect = useCallback(
    (numbers, type) => {
      if (isProcessing) return;

      setSelectedBets((prev) => {
        // Initialize numbers array based on bet type
        let betNumbers = [];
        switch (type) {
          case BetTypes.STRAIGHT:
            betNumbers = numbers;
            break;
          case BetTypes.DOZEN:
            const dozenStart = numbers[0];
            betNumbers = Array.from({ length: 12 }, (_, i) => dozenStart + i);
            break;
          case BetTypes.COLUMN:
            const columnStart = numbers[0];
            betNumbers = Array.from(
              { length: 12 },
              (_, i) => columnStart + i * 3
            );
            break;
          case BetTypes.RED:
            betNumbers = [
              1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
            ];
            break;
          case BetTypes.BLACK:
            betNumbers = [
              2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33,
              35,
            ];
            break;
          case BetTypes.EVEN:
            betNumbers = Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
            break;
          case BetTypes.ODD:
            betNumbers = Array.from({ length: 18 }, (_, i) => i * 2 + 1);
            break;
          case BetTypes.LOW:
            betNumbers = Array.from({ length: 18 }, (_, i) => i + 1);
            break;
          case BetTypes.HIGH:
            betNumbers = Array.from({ length: 18 }, (_, i) => i + 19);
            break;
        }

        // Check if bet already exists
        const existingBetIndex = prev.findIndex(
          (bet) =>
            bet.type === type &&
            JSON.stringify(bet.numbers.sort()) ===
              JSON.stringify(betNumbers.sort())
        );

        const newBets = [...prev];
        const betAmount = BigInt(selectedChipValue);

        if (existingBetIndex !== -1) {
          // Update existing bet
          newBets[existingBetIndex] = {
            ...newBets[existingBetIndex],
            amount: (
              BigInt(newBets[existingBetIndex].amount) + betAmount
            ).toString(),
          };
        } else {
          // Add new bet
          newBets.push({
            numbers: betNumbers,
            type,
            amount: betAmount.toString(),
          });
        }

        // Update total bet amount
        const newTotalAmount = newBets.reduce(
          (sum, bet) => sum + BigInt(bet.amount),
          BigInt(0)
        );
        setTotalBetAmount(newTotalAmount);

        return newBets;
      });
    },
    [isProcessing, selectedChipValue]
  );

  const handlePlaceBets = useCallback(async () => {
    if (!contracts?.roulette || !account || selectedBets.length === 0) return;
    if (selectedBets.length > CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
      onError(
        new Error(
          `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`
        )
      );
      return;
    }

    try {
      setIsProcessing(true);

      // Check contract roles
      try {
        const MINTER_ROLE = await contracts.token.MINTER_ROLE();
        const BURNER_ROLE = await contracts.token.BURNER_ROLE();

        console.log("Checking contract roles:", {
          tokenAddress: contracts.token.target,
          rouletteAddress: contracts.roulette.target,
          minterRole: MINTER_ROLE,
          burnerRole: BURNER_ROLE,
        });

        const [hasMinterRole, hasBurnerRole] = await Promise.all([
          contracts.token.hasRole(MINTER_ROLE, contracts.roulette.target),
          contracts.token.hasRole(BURNER_ROLE, contracts.roulette.target),
        ]);

        console.log("Contract role check results:", {
          hasMinterRole,
          hasBurnerRole,
        });
      } catch (error) {
        console.error("Error checking contract roles:", error);
      }

      // Format bets for contract
      const consolidatedBets = selectedBets.reduce((acc, bet) => {
        const existingBetIndex = acc.findIndex(
          (b) =>
            b.type === bet.type &&
            JSON.stringify(b.numbers.sort()) ===
              JSON.stringify(bet.numbers.sort())
        );

        if (existingBetIndex !== -1) {
          // Add amounts for same bet type and numbers
          acc[existingBetIndex].amount = (
            BigInt(acc[existingBetIndex].amount) + BigInt(bet.amount)
          ).toString();
        } else {
          acc.push(bet);
        }
        return acc;
      }, []);

      const betRequests = consolidatedBets.map((bet) => {
        let numbers = [];

        // Handle different bet types
        switch (bet.type) {
          case BetTypes.STRAIGHT:
            numbers = bet.numbers;
            break;
          case BetTypes.DOZEN:
            const dozenStart = bet.numbers[0];
            numbers = Array.from({ length: 12 }, (_, i) => dozenStart + i);
            break;
          case BetTypes.COLUMN:
            const columnStart = bet.numbers[0];
            numbers = Array.from({ length: 12 }, (_, i) => columnStart + i * 3);
            break;
          case BetTypes.RED:
            numbers = [
              1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
            ];
            break;
          case BetTypes.BLACK:
            numbers = [
              2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33,
              35,
            ];
            break;
          case BetTypes.EVEN:
            numbers = Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
            break;
          case BetTypes.ODD:
            numbers = Array.from({ length: 18 }, (_, i) => i * 2 + 1);
            break;
          case BetTypes.LOW:
            numbers = Array.from({ length: 18 }, (_, i) => i + 1);
            break;
          case BetTypes.HIGH:
            numbers = Array.from({ length: 18 }, (_, i) => i + 19);
            break;
        }

        return {
          numbers,
          amount: bet.amount,
          betType: bet.type,
        };
      });

      console.log("Original selected bets:", selectedBets);
      console.log("Consolidated bets:", consolidatedBets);
      console.log(
        "Formatted bet requests:",
        betRequests.map((bet) => ({
          ...bet,
          amount: ethers.formatEther(bet.amount),
          betType: Object.keys(BetTypes)[bet.betType],
          numbers: bet.numbers,
        }))
      );

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
      try {
        console.log("Sending transaction to contract:", {
          rouletteAddress: contracts.roulette.target,
          totalAmount: ethers.formatEther(totalAmount),
          numBets: betRequests.length,
          betRequests: betRequests.map((bet) => ({
            numbers: bet.numbers,
            amount: ethers.formatEther(bet.amount),
            betType: Object.keys(BetTypes)[bet.betType],
          })),
        });

        // Validate bet numbers before sending
        for (const bet of betRequests) {
          if (bet.betType === BetTypes.STRAIGHT && bet.numbers.length !== 1) {
            throw new Error("Invalid straight bet numbers");
          }
          if (
            (bet.betType === BetTypes.DOZEN ||
              bet.betType === BetTypes.COLUMN) &&
            bet.numbers.length !== 12
          ) {
            throw new Error(
              `Invalid ${
                bet.betType === BetTypes.DOZEN ? "dozen" : "column"
              } bet numbers`
            );
          }
          if (
            [
              BetTypes.RED,
              BetTypes.BLACK,
              BetTypes.EVEN,
              BetTypes.ODD,
              BetTypes.LOW,
              BetTypes.HIGH,
            ].includes(bet.betType) &&
            bet.numbers.length !== 18
          ) {
            throw new Error("Invalid outside bet numbers");
          }
        }

        const tx = await contracts.roulette.placeBet(betRequests);
        console.log("Transaction sent:", {
          hash: tx.hash,
          nonce: tx.nonce,
          gasLimit: tx.gasLimit.toString(),
          from: account,
          to: contracts.roulette.target,
        });

        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
          events: receipt.logs.map((log) => ({
            address: log.address,
            topics: log.topics,
          })),
        });
      } catch (error) {
        console.error("Transaction failed:", {
          error: error.message,
          code: error.code,
          reason: error.reason,
          data: error.data,
        });
        throw error;
      }

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
    queryClient,
  ]);

  const handleChipValueChange = useCallback((value) => {
    setSelectedChipValue(value);
  }, []);

  const handleClearBets = useCallback(() => {
    setSelectedBets([]);
    setTotalBetAmount(BigInt(0));
  }, []);

  const handleUndoBet = useCallback(() => {
    setSelectedBets((prev) => {
      const newBets = [...prev];
      newBets.pop(); // Remove the last bet

      // Update total bet amount
      const newTotalAmount = newBets.reduce(
        (sum, bet) => sum + BigInt(bet.amount),
        BigInt(0)
      );
      setTotalBetAmount(newTotalAmount);

      return newBets;
    });
  }, []);

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
            onUndoBet={handleUndoBet}
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

        <BettingHistory account={account} contracts={contracts} />
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
