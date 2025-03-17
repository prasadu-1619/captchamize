import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function GifCaptcha({ onVerify }) {
  const [captchaData, setCaptchaData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [verified, setVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNewCaptcha = async () => {
    try {
      setIsLoading(true);
      const categories = ["vehicles", "animals", "sports", "buildings", "cartoons", "actions"];
      const correctAnswer = categories[Math.floor(Math.random() * categories.length)];
      const options = categories
        .filter(cat => cat !== correctAnswer)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${import.meta.env.VITE_GIPHY_API_KEY}&q=${correctAnswer}&limit=1`
      );
      const data = await response.json();
      const gifUrl = data.data[0].images.fixed_height.url;

      setCaptchaData({
        gifUrl,
        correctAnswer,
        options: [correctAnswer, ...options].sort(() => 0.5 - Math.random())
      });
      setSelected(null);
      setVerified(false);
    } catch (error) {
      console.error('Error fetching CAPTCHA:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNewCaptcha();
  }, []);

  const handleOptionClick = (option) => {
    if (verified || !captchaData) return;
    
    setSelected(option);
    const isCorrect = option === captchaData.correctAnswer;
    setVerified(true);
    onVerify(isCorrect);
  };

  if (!captchaData) {
    return <div className="animate-pulse bg-gray-800 rounded-lg w-[200px] h-[140px]" />;
  }

  return (
    <div className="space-y-4">
      <div className="relative w-[200px] h-[140px] rounded-lg overflow-hidden bg-gray-800">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <img
            src={captchaData.gifUrl}
            alt="CAPTCHA GIF"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {captchaData.options.map((option) => (
          <button
            key={option}
            onClick={() => handleOptionClick(option)}
            disabled={verified || isLoading}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${verified && option === selected
                ? option === captchaData.correctAnswer
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
                : verified
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}