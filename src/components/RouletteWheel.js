import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RouletteWheel = ({ isSpinning, winningNumber }) => {
  const wheelRef = useRef(null);

  useEffect(() => {
    if (isSpinning && wheelRef.current) {
      wheelRef.current.style.transition =
        "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
      wheelRef.current.style.transform = `rotate(${1800 + Math.random() * 360}deg)`;
    }
  }, [isSpinning]);

  return (
    <div className="relative w-full max-w-[500px] mx-auto">
      {/* Outer ring decoration */}
      <div className="absolute inset-0 rounded-full border-8 border-gaming-primary/20 animate-pulse-border" />

      {/* Main wheel */}
      <motion.div
        ref={wheelRef}
        className="relative aspect-square rounded-full border-4 border-gaming-primary bg-secondary-900/90 backdrop-blur-xl shadow-[0_0_50px_rgba(var(--gaming-primary),0.3)]"
        initial={{ rotate: 0 }}
        animate={isSpinning ? { rotate: 360 } : {}}
      >
        {/* Numbers */}
        {ROULETTE_NUMBERS.map((number, index) => {
          const rotation = index * (360 / ROULETTE_NUMBERS.length);
          const isRed = [
            1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
          ].includes(number);

          return (
            <div
              key={number}
              className="absolute top-0 left-1/2 -translate-x-1/2 origin-bottom h-[50%]"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <motion.div
                className={`
                  w-12 h-12 -mt-6 rounded-full 
                  flex items-center justify-center
                  font-bold text-white text-lg
                  border border-white/10
                  shadow-lg backdrop-blur-sm
                  ${
                    number === 0
                      ? "bg-gradient-to-br from-emerald-500/90 to-emerald-600/90"
                      : isRed
                        ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-accent/90"
                        : "bg-gradient-to-br from-gray-800/90 to-gray-900/90"
                  }
                `}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {number}
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* Center decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gaming-primary/20 backdrop-blur-xl border-2 border-gaming-primary flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gaming-primary animate-pulse" />
      </div>

      {/* Ball */}
      {isSpinning && (
        <motion.div
          className="absolute w-4 h-4 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)]"
          animate={{
            rotate: [0, 360, 720, 1080],
            scale: [1, 0.8, 1, 0.8, 1],
            opacity: [1, 0.8, 1, 0.8, 1],
          }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            times: [0, 0.2, 0.5, 0.8, 1],
            repeat: Infinity,
          }}
        />
      )}

      {/* Winning number display */}
      {winningNumber !== null && !isSpinning && (
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <div className="text-4xl font-bold text-white bg-gaming-primary/90 backdrop-blur-xl rounded-xl px-6 py-3 shadow-lg border border-white/20">
            {winningNumber}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RouletteWheel;
