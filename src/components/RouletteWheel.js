import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RouletteWheel = ({ isSpinning, winningNumber }) => {
  const wheelRef = useRef(null);
  
  useEffect(() => {
    if (isSpinning && wheelRef.current) {
      // Add spinning animation
      wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheelRef.current.style.transform = `rotate(${1800 + Math.random() * 360}deg)`;
    }
  }, [isSpinning]);

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto">
      <motion.div
        ref={wheelRef}
        className="absolute inset-0 rounded-full border-4 border-gaming-primary"
        initial={{ rotate: 0 }}
        animate={isSpinning ? { rotate: 360 } : {}}
      >
        {ROULETTE_NUMBERS.map((number, index) => {
          const rotation = (index * (360 / ROULETTE_NUMBERS.length));
          const isRed = [
            1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
          ].includes(number);
          
          return (
            <div
              key={number}
              className="absolute top-0 left-1/2 -translate-x-1/2 origin-bottom"
              style={{
                transform: `rotate(${rotation}deg)`,
                height: '50%'
              }}
            >
              <div 
                className={`
                  w-12 h-12 -mt-6 rounded-full flex items-center justify-center
                  font-bold text-white
                  ${number === 0 ? 'bg-gaming-primary' : isRed ? 'bg-gaming-error' : 'bg-secondary-900'}
                `}
              >
                {number}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Ball */}
      {isSpinning && (
        <motion.div
          className="absolute w-4 h-4 rounded-full bg-white shadow-lg"
          animate={{
            rotate: [0, 360, 720, 1080],
            scale: [1, 0.8, 1, 0.8, 1]
          }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            times: [0, 0.2, 0.5, 0.8, 1],
            repeat: Infinity
          }}
        />
      )}
    </div>
  );
};

export default RouletteWheel; 