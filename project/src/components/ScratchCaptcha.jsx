import React, { useRef, useEffect, useState } from 'react';

export function ScratchCaptcha({ onVerify }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [verified, setVerified] = useState(false);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const totalPixelsRef = useRef(0);
  const scratchStartedRef = useRef(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#1E293B';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scratch here', canvas.width / 2, canvas.height / 2);

    totalPixelsRef.current = canvas.width * canvas.height;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const calculateCoverage = (ctx) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const pixels = imageData.data;
    let clearedPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) clearedPixels++;
    }

    return (clearedPixels / totalPixelsRef.current) * 100;
  };

  const verifyAfterTimeout = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coverage = calculateCoverage(ctx);
    const isHuman = coverage > 34;

    setVerified(true);
    setTimeLeft(null);
    setIsDrawing(false);
    scratchStartedRef.current = false;
    onVerify(isHuman);
  };

  const startVerification = () => {
    if (verified || timeLeft !== null || scratchStartedRef.current) return;
    
    scratchStartedRef.current = true;
    setTimeLeft(5);

    timerRef.current = setTimeout(() => {
      verifyAfterTimeout();
    }, 5000);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStart = (e) => {
    if (verified) return;
    
    setIsDrawing(true);
    startVerification();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e 
      ? e.touches[0].clientX - rect.left 
      : e.clientX - rect.left;
    const y = 'touches' in e 
      ? e.touches[0].clientY - rect.top 
      : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handleMove = (e) => {
    if (!isDrawing || verified || !scratchStartedRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e 
      ? e.touches[0].clientX - rect.left 
      : e.clientX - rect.left;
    const y = 'touches' in e 
      ? e.touches[0].clientY - rect.top 
      : e.clientY - rect.top;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={200}
          height={140}
          className="border border-slate-300 rounded-lg cursor-pointer touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {timeLeft !== null && !verified && (
          <div className="absolute top-2 right-2 bg-slate-800 text-white px-2 py-1 rounded-md text-sm">
            {timeLeft}s
          </div>
        )}
      </div>
    </div>
  );
}