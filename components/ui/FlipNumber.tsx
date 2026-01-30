'use client';

import { useEffect, useRef, useState } from 'react';

interface FlipNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  animateOnLoad?: boolean;
  staggerDelay?: number;
}

interface DigitProps {
  digit: string;
  prevDigit: string;
  duration: number;
  index: number;
  staggerDelay: number;
  animateInitial: boolean;
}

function FlipDigit({ digit, prevDigit, duration, index, staggerDelay, animateInitial }: DigitProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayDigit, setDisplayDigit] = useState(digit);
  const isInitialMount = useRef(true);
  const hasTriggeredInitial = useRef(false);

  // Handle initial load animation
  useEffect(() => {
    if (animateInitial && isInitialMount.current && digit && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      const initialDelay = 100 + (index * staggerDelay);
      
      const timeout = setTimeout(() => {
        setIsFlipping(true);
        setTimeout(() => {
          setIsFlipping(false);
        }, duration);
      }, initialDelay);
      
      return () => clearTimeout(timeout);
    }
    isInitialMount.current = false;
  }, [animateInitial, digit, duration, index, staggerDelay]);

  // Handle subsequent value changes
  useEffect(() => {
    if (!isInitialMount.current && digit !== prevDigit) {
      setIsFlipping(true);
      const timeout = setTimeout(() => {
        setDisplayDigit(digit);
        setIsFlipping(false);
      }, duration / 2);
      return () => clearTimeout(timeout);
    } else {
      setDisplayDigit(digit);
    }
  }, [digit, prevDigit, duration]);

  const isNumber = /\d/.test(digit);

  return (
    <span 
      className={`flip-digit-container inline-block relative ${isNumber ? 'tabular-nums' : ''}`}
      style={{ 
        perspective: '500px',
        perspectiveOrigin: 'center center',
        width: isNumber ? '0.65em' : 'auto',
      }}
    >
      <span
        className={`flip-digit inline-block ${isFlipping ? 'flipping' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {displayDigit}
      </span>
    </span>
  );
}

export function FlipNumber({ 
  value, 
  decimals = 2, 
  prefix = '', 
  suffix = '',
  className = '',
  duration = 800,
  animateOnLoad = true,
  staggerDelay = 60
}: FlipNumberProps) {
  const [currentDigits, setCurrentDigits] = useState<string[]>([]);
  const [prevDigits, setPrevDigits] = useState<string[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const formatted = value.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
    
    const newDigits = (prefix + formatted + suffix).split('');
    
    if (isFirstRender.current) {
      setCurrentDigits(newDigits);
      setPrevDigits(newDigits); // Same as current for initial render
      isFirstRender.current = false;
    } else {
      setPrevDigits(currentDigits);
      setCurrentDigits(newDigits);
    }
  }, [value, decimals, prefix, suffix]);

  // Handle cases where digit count changes (pad with spaces)
  const maxLength = Math.max(currentDigits.length, prevDigits.length);
  const paddedCurrent = currentDigits.join('').padStart(maxLength, ' ').split('');
  const paddedPrev = prevDigits.join('').padStart(maxLength, ' ').split('');

  return (
    <span className={`flip-number inline-flex ${className}`}>
      {paddedCurrent.map((digit, index) => (
        <FlipDigit 
          key={`${index}-${maxLength}`}
          digit={digit} 
          prevDigit={paddedPrev[index] || digit}
          duration={duration}
          index={index}
          staggerDelay={staggerDelay}
          animateInitial={animateOnLoad}
        />
      ))}
    </span>
  );
}

// Special variant for prices with smart decimal handling
interface FlipPriceProps {
  value: number;
  className?: string;
  duration?: number;
  animateOnLoad?: boolean;
  staggerDelay?: number;
}

export function FlipPrice({ 
  value, 
  className = '',
  duration = 800,
  animateOnLoad = true,
  staggerDelay = 60
}: FlipPriceProps) {
  const decimals = value < 1 ? 6 : 2;
  
  return (
    <FlipNumber 
      value={value}
      decimals={decimals}
      prefix="$"
      className={className}
      duration={duration}
      animateOnLoad={animateOnLoad}
      staggerDelay={staggerDelay}
    />
  );
}

// Variant for percentages
interface FlipPercentProps {
  value: number;
  className?: string;
  duration?: number;
  showSign?: boolean;
  animateOnLoad?: boolean;
  staggerDelay?: number;
}

export function FlipPercent({ 
  value, 
  className = '',
  duration = 800,
  showSign = true,
  animateOnLoad = true,
  staggerDelay = 60
}: FlipPercentProps) {
  const [currentDigits, setCurrentDigits] = useState<string[]>([]);
  const [prevDigits, setPrevDigits] = useState<string[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const sign = showSign ? (value >= 0 ? '+' : '') : '';
    const formatted = `${sign}${value.toFixed(2)}%`;
    const newDigits = formatted.split('');
    
    if (isFirstRender.current) {
      setCurrentDigits(newDigits);
      setPrevDigits(newDigits); // Same as current for initial render
      isFirstRender.current = false;
    } else {
      setPrevDigits(currentDigits);
      setCurrentDigits(newDigits);
    }
  }, [value, showSign]);

  const maxLength = Math.max(currentDigits.length, prevDigits.length);
  const paddedCurrent = currentDigits.join('').padStart(maxLength, ' ').split('');
  const paddedPrev = prevDigits.join('').padStart(maxLength, ' ').split('');

  return (
    <span className={`flip-number inline-flex ${className}`}>
      {paddedCurrent.map((digit, index) => (
        <FlipDigit 
          key={`${index}-${maxLength}`}
          digit={digit} 
          prevDigit={paddedPrev[index] || digit}
          duration={duration}
          index={index}
          staggerDelay={staggerDelay}
          animateInitial={animateOnLoad}
        />
      ))}
    </span>
  );
}

// Simple variant for integers (like Fear & Greed index)
interface FlipIntegerProps {
  value: number;
  className?: string;
  duration?: number;
  animateOnLoad?: boolean;
  staggerDelay?: number;
}

export function FlipInteger({ 
  value, 
  className = '',
  duration = 800,
  animateOnLoad = true,
  staggerDelay = 60
}: FlipIntegerProps) {
  return (
    <FlipNumber 
      value={value}
      decimals={0}
      className={className}
      duration={duration}
      animateOnLoad={animateOnLoad}
      staggerDelay={staggerDelay}
    />
  );
}

