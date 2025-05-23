import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { ScratchCaptcha } from './components/ScratchCaptcha';
import devanagariCodes from './assets/devanagari/codes.json';
import { createClient } from '@supabase/supabase-js';
//Push

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const CAPTCHA_TYPES = ['image', 'devanagari', 'gif', 'scratch'];

const categories = [
  "Nature", "Technology", "Animals", "Architecture", 
  "Food", "Sports", "Space", "Art", 
  "Vehicles", "Fashion", "Music", "Travel",
  "Business", "Health", "Education", "Science"
];

const gifCategories = ["vehicles", "animals", "sports", "buildings", "cartoons", "actions"];

function App() {
  const [captchaType, setCaptchaType] = useState('image');
  const [previousCaptchaType, setPreviousCaptchaType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [correctCategory, setCorrectCategory] = useState("");
  const [options, setOptions] = useState([]);
  const [imageUrl, setImageUrl] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [devanagariInput, setDevanagariInput] = useState('');
  const [currentDevanagari, setCurrentDevanagari] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [screenshotAttempted, setScreenshotAttempted] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const timerRef = useRef(null);
  const modalRef = useRef(null);
  const isInitialMount = useRef(true);
  const overlayRef = useRef(null);
  const notificationTimerRef = useRef(null);

const [passCount, setPassCount] = useState(0);
const [failCount, setFailCount] = useState(0);

  // Detect if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Prevent screenshots
 // Add this to your useEffect for screenshot prevention
useEffect(() => {
  // Improved PrintScreen detection
  const handleKeyDown = (e) => {
    // PrintScreen key (44) or Ctrl+Shift+S or Cmd+Shift+S or Ctrl+P or Cmd+P
    if (
      e.keyCode === 44 || 
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') ||
      ((e.ctrlKey || e.metaKey) && e.key === 'p')
    ) {
      e.preventDefault();
      setScreenshotAttempted(true);
      
      // Reset the warning after 3 seconds
      setTimeout(() => {
        setScreenshotAttempted(false);
      }, 3000);
      
      return false;
    }
  };

  // Enhanced visual protection on key press
  const handleKeyUp = (e) => {
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      // Flash the screen or add visual noise to disrupt screenshot
      const flashOverlay = document.createElement('div');
      flashOverlay.style.position = 'fixed';
      flashOverlay.style.top = '0';
      flashOverlay.style.left = '0';
      flashOverlay.style.width = '100%';
      flashOverlay.style.height = '100%';
      flashOverlay.style.backgroundColor = 'white';
      flashOverlay.style.opacity = '0.9';
      flashOverlay.style.zIndex = '9999';
      flashOverlay.style.pointerEvents = 'none';
      document.body.appendChild(flashOverlay);
      
      // Remove after a very short time (just enough to disrupt screenshot)
      setTimeout(() => {
        document.body.removeChild(flashOverlay);
      }, 50);
      
      setScreenshotAttempted(true);
      setTimeout(() => {
        setScreenshotAttempted(false);
      }, 3000);
    }
  };

  // Additional protection against screen capture API
  const addVisualNoise = () => {
    if (isModalOpen && overlayRef.current) {
      // Create a more aggressive noise pattern
      const interval = setInterval(() => {
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create a more visible pattern when screenshot is attempted
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add random colored pixels
          for (let i = 0; i < canvas.width; i += 5) {
            for (let j = 0; j < canvas.height; j += 5) {
              ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
              ctx.fillRect(i, j, 5, 5);
            }
          }
          
          const dataUrl = canvas.toDataURL();
          if (overlayRef.current) {
            overlayRef.current.style.backgroundImage = `url(${dataUrl})`;
          }
        }
      }, 50); // Change pattern rapidly
      
      // Clear interval after short time
      setTimeout(() => {
        clearInterval(interval);
      }, 300);
    }
  };

  // Use the native HTML5 "clipboard" event
  const handleCopy = (e) => {
    if (isModalOpen) {
      e.preventDefault();
      setScreenshotAttempted(true);
      addVisualNoise();
      
      setTimeout(() => {
        setScreenshotAttempted(false);
      }, 3000);
      
      return false;
    }
  };

  // Monitor clipboard API more aggressively
  const monitorClipboard = () => {
    // Try to detect programmatic clipboard access
    const originalClipboard = window.navigator.clipboard;
    
    if (originalClipboard && originalClipboard.writeText) {
      const originalWriteText = originalClipboard.writeText;
      window.navigator.clipboard.writeText = function(text) {
        if (isModalOpen) {
          setScreenshotAttempted(true);
          addVisualNoise();
          setTimeout(() => {
            setScreenshotAttempted(false);
          }, 3000);
          return Promise.reject(new Error('Clipboard access denied'));
        }
        return originalWriteText.apply(this, arguments);
      };
    }
  };

  try {
    monitorClipboard();
  } catch (e) {
    console.error('Clipboard API monitoring failed', e);
  }

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  window.addEventListener('contextmenu', (e) => e.preventDefault(), true);
  document.addEventListener('copy', handleCopy, true);
  document.addEventListener('paste', handleCopy, true);
  document.addEventListener('cut', handleCopy, true);

  // Additional mutation observer to prevent DOM-based screenshots
  const observer = new MutationObserver((mutations) => {
    if (isModalOpen) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && 
            mutation.addedNodes.length > 0 &&
            Array.from(mutation.addedNodes).some(node => 
              node.nodeType === 1 && 
              (node.tagName === 'CANVAS' || 
               node.tagName === 'VIDEO' || 
               (node.className && typeof node.className === 'string' && 
                node.className.includes('screenshot')))
            )) {
          setScreenshotAttempted(true);
          addVisualNoise();
          setTimeout(() => {
            setScreenshotAttempted(false);
          }, 3000);
        }
      }
    }
  });
  
  observer.observe(document.body, { 
    childList: true,
    subtree: true,
    attributes: true
  });

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keyup', handleKeyUp, true);
    window.removeEventListener('contextmenu', (e) => e.preventDefault(), true);
    document.removeEventListener('copy', handleCopy, true);
    document.removeEventListener('paste', handleCopy, true);
    document.removeEventListener('cut', handleCopy, true);
    observer.disconnect();
  };
}, [isModalOpen, setScreenshotAttempted]);
useEffect(() => {
  if (isMobile && isModalOpen) {
    // Create visual noise pattern for mobile screens
    const createVisualNoise = () => {
      if (!overlayRef.current) return;
      
      // Create rapidly changing patterns to disrupt screenshots
      const interval = setInterval(() => {
        // Generate a canvas with random noise
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create subtle visual noise
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Moving watermark pattern
          const timestamp = Date.now();
          const offset = timestamp % 100;
          
          // Add pattern that will show in screenshots but is subtle for users
          ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
          for (let i = 0; i < canvas.width; i += 20) {
            for (let j = (offset % 20); j < canvas.height; j += 20) {
              ctx.fillRect(i, j, 10, 1);
            }
          }
          
          // Add dynamic text watermark
          ctx.fillStyle = 'rgba(200, 200, 200, 0.03)';
          ctx.font = '16px Arial';
          ctx.save();
          ctx.translate(canvas.width/2, canvas.height/2);
          ctx.rotate(Math.sin(timestamp / 1000) * 0.05);
          ctx.fillText(`SECURE • ${new Date().toISOString()} • NO SCREENSHOTS`, -150, 0);
          ctx.restore();
          
          const dataUrl = canvas.toDataURL();
          overlayRef.current.style.backgroundImage = `url(${dataUrl})`;
        }
      }, 100); // Update rapidly
      
      return () => clearInterval(interval);
    };
    
    const cleanup = createVisualNoise();
    return cleanup;
  }
}, [isMobile, isModalOpen]);

// Detect when app goes to background - potential screenshot indicator on iOS
useEffect(() => {
  if (isMobile) {
    let lastActiveTime = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastActiveTime = Date.now();
      } else {
        // If we return in less than 500ms, it might be a screenshot on iOS
        const timeDiff = Date.now() - lastActiveTime;
        if (timeDiff < 500 && timeDiff > 50 && isModalOpen) {
          setScreenshotAttempted(true);
          setTimeout(() => {
            setScreenshotAttempted(false);
          }, 3000);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
}, [isMobile, isModalOpen, setScreenshotAttempted]);

// Mobile-specific fullscreen API events
useEffect(() => {
  if (isMobile) {
    const handleFullscreenChange = () => {
      // When exiting fullscreen, might indicate screenshot on some devices
      if (!document.fullscreenElement && isModalOpen) {
        setScreenshotAttempted(true);
        setTimeout(() => {
          setScreenshotAttempted(false);
        }, 3000);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }
}, [isMobile, isModalOpen, setScreenshotAttempted]);

// Enhanced mobile image protection
const renderProtectedImage = () => {
  if (!imageUrl) return null;
  
  if (isMobile) {
    // For mobile, we'll use canvas rendering instead of direct image
    return (
      <div className="relative w-full h-full">
        <CanvasImage 
          src={imageUrl} 
          alt="CAPTCHA" 
          className="w-full h-full object-contain bg-gray-900"
        />
        <div className="absolute inset-0 pointer-events-none select-none" style={{
          background: 'linear-gradient(rgba(0,0,0,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          mixBlendMode: 'difference'
        }} />
      </div>
    );
  }
  
  return (
    <img
      src={imageUrl}
      alt="CAPTCHA"
      className="w-full h-full object-contain bg-gray-900"
      style={{ 
        maxHeight: '300px',
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onDragStart={(e) => e.preventDefault()}
    />
  );
};

// Canvas image component for mobile protection
const CanvasImage = ({ src, alt, className }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    
    img.onload = () => {
      // Set canvas dimensions to match image aspect ratio
      const containerWidth = canvas.clientWidth;
      const containerHeight = canvas.clientHeight;
      
      // Calculate the scaling to fit the container while preserving aspect ratio
      const scale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height
      );
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Center the image
      const x = (containerWidth - scaledWidth) / 2;
      const y = (containerHeight - scaledHeight) / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      // Add subtle watermark that shows in screenshots
      ctx.save();
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      
      // Add watermark text diagonally across the image
      ctx.translate(canvas.width/2, canvas.height/2);
      ctx.rotate(-Math.PI/6);
      
      for (let i = -canvas.width; i < canvas.width; i += 100) {
        for (let j = -canvas.height; j < canvas.height; j += 30) {
          ctx.fillText(`SECURE • DO NOT COPY • ${new Date().toISOString()}`, i, j);
        }
      }
      
      ctx.restore();
    };
    
    // Continuous canvas refresh to make screenshots more difficult
    const interval = setInterval(() => {
      if (ctx && img.complete) {
        // Add subtle dynamic elements
        ctx.save();
        ctx.globalAlpha = 0.02;
        ctx.fillStyle = '#ffffff';
        
        // Add moving element
        const timestamp = Date.now();
        const x = canvas.width/2 + Math.sin(timestamp / 1000) * 100;
        const y = canvas.height/2 + Math.cos(timestamp / 1000) * 50;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [src]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className={className} 
      width={window.innerWidth} 
      height={300}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    />
  );
};
  const getRandomDevanagari = useCallback(() => {
    const devanagariNames = Object.keys(devanagariCodes);
    const randomName = devanagariNames[Math.floor(Math.random() * devanagariNames.length)];
    return {
      name: randomName,
      code: devanagariCodes[randomName]
    };
  }, []);

  const getRandomImage = async (category) => {
    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${category}&per_page=20&page=${Math.floor(Math.random() * 5) + 1}`,
        {
          headers: {
            Authorization: import.meta.env.VITE_PEXELS_API_KEY
          }
        }
      );
      const data = await response.json();
      const photos = data.photos;
      if (photos && photos.length > 0) {
        const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
        return randomPhoto.src.large;
      }
      throw new Error('No images found');
    } catch (error) {
      console.error('Error fetching image:', error);
      return `https://source.unsplash.com/featured/800x600/?${category}`;
    }
  };

  const getRandomGif = async (category) => {
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${import.meta.env.VITE_GIPHY_API_KEY}&q=${category}&limit=1&offset=${Math.floor(Math.random() * 20)}`
      );
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].images.fixed_height.url;
      }
      throw new Error('No GIF found');
    } catch (error) {
      console.error('Error fetching GIF:', error);
      return null;
    }
  };

  const loadImageCaptcha = useCallback(async () => {
    const newOptions = [...categories].sort(() => 0.5 - Math.random()).slice(0, 4);
    const newCorrectCategory = newOptions[Math.floor(Math.random() * newOptions.length)];
    setOptions(newOptions);
    setCorrectCategory(newCorrectCategory);
    try {
      const newImageUrl = await getRandomImage(newCorrectCategory);
      setImageUrl(newImageUrl);
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }, []);

  const loadGifCaptcha = useCallback(async () => {
    const newOptions = [...gifCategories].sort(() => 0.5 - Math.random()).slice(0, 4);
    const newCorrectCategory = newOptions[Math.floor(Math.random() * newOptions.length)];
    setOptions(newOptions);
    setCorrectCategory(newCorrectCategory);
    try {
      const newGifUrl = await getRandomGif(newCorrectCategory);
      if (newGifUrl) {
        setImageUrl(newGifUrl);
      }
    } catch (error) {
      console.error('Failed to load GIF:', error);
    }
  }, []);

  const loadDevanagariCaptcha = useCallback(() => {
    const randomDevanagari = getRandomDevanagari();
    setCurrentDevanagari(randomDevanagari);
    setImageUrl(`/devanagari/${randomDevanagari.name}.png`);
  }, [getRandomDevanagari]);

  // Show notification
  const showNotification = useCallback((type, message) => {
    // Clear any existing timeout
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    
    // Set notification
    setNotification({
      show: true,
      type,
      message
    });
    
    // Auto-hide after 3 seconds
    notificationTimerRef.current = setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // Replace or modify the existing handleVerify function (around line 489)
  const handleVerify = useCallback(async (isCorrect) => {
    setVerificationResult(isCorrect);
    
    if (isCorrect) {
      setPassCount(prev => prev + 1);
      showNotification('success', 'Verification successful!');
    } else {
      setFailCount(prev => prev + 1);
      showNotification('error', 'Verification failed. Please try again.');
    }
    
    // Log the verification attempt to Supabase
    try {
      const { error } = await supabase
        .from('captcha_attempts')
        .insert({
          captcha_type: captchaType,
          is_success: isCorrect,
          user_agent: navigator.userAgent,
          device_type: isMobile ? 'mobile' : 'desktop',
          timestamp: new Date().toISOString()
        });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error logging to Supabase:', error);
    }
    
    setTimeout(refreshCaptcha, 1500);
  }, [captchaType, isMobile, showNotification]);

  // Get a random CAPTCHA type with weighted probability based on device
  // Ensures the new type is different from the previous one
  const getRandomCaptchaType = useCallback(() => {
    // Create a copy of CAPTCHA_TYPES without the previous type
    const availableTypes = CAPTCHA_TYPES.filter(type => type !== previousCaptchaType);
    
    // Apply device-specific weighting to the available types
    if (isMobile) {
      // Mobile: Higher probability for scratch, others share the rest
      const weights = availableTypes.map(type => {
        if (type === 'scratch') return 0.5;
        return 0.5 / (availableTypes.length - (availableTypes.includes('scratch') ? 1 : 0));
      });
      
      // Normalize weights if scratch was the previous type
      if (!availableTypes.includes('scratch')) {
        const equalWeight = 1 / availableTypes.length;
        weights.fill(equalWeight);
      }
      
      // Select based on weighted probability
      const rand = Math.random();
      let cumulativeWeight = 0;
      
      for (let i = 0; i < availableTypes.length; i++) {
        cumulativeWeight += weights[i];
        if (rand < cumulativeWeight) {
          return availableTypes[i];
        }
      }
      
      // Fallback
      return availableTypes[availableTypes.length - 1];
    } else {
      // Desktop: Lower probability for scratch, others share the rest
      const weights = availableTypes.map(type => {
        if (type === 'scratch') return 0.1;
        return 0.9 / (availableTypes.length - (availableTypes.includes('scratch') ? 1 : 0));
      });
      
      // Normalize weights if scratch was the previous type
      if (!availableTypes.includes('scratch')) {
        const equalWeight = 1 / availableTypes.length;
        weights.fill(equalWeight);
      }
      
      // Select based on weighted probability
      const rand = Math.random();
      let cumulativeWeight = 0;
      
      for (let i = 0; i < availableTypes.length; i++) {
        cumulativeWeight += weights[i];
        if (rand < cumulativeWeight) {
          return availableTypes[i];
        }
      }
      
      // Fallback
      return availableTypes[availableTypes.length - 1];
    }
  }, [isMobile, previousCaptchaType]);

  const refreshCaptcha = useCallback(async () => {
    setIsLoading(true);
    setHasViewed(false);
    setSelectedCategory("");
    setDevanagariInput('');
    setVerificationResult(null);
    
    // Store current type as previous before changing
    setPreviousCaptchaType(captchaType);
    
    // Get a new type that's different from the current one
    const newType = getRandomCaptchaType();
    setCaptchaType(newType);

    switch (newType) {
      case 'image':
        await loadImageCaptcha();
        break;
      case 'gif':
        await loadGifCaptcha();
        break;
      case 'devanagari':
        loadDevanagariCaptcha();
        break;
      // scratch is handled by its component
    }

    setTimeLeft(5);
    setIsLoading(false);
  }, [loadImageCaptcha, loadGifCaptcha, loadDevanagariCaptcha, getRandomCaptchaType, captchaType]);

  const handleSecurityViolation = useCallback(() => {
    setIsModalOpen(false);
    setHasViewed(true);
    refreshCaptcha();
  }, [refreshCaptcha]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setHasViewed(true);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      refreshCaptcha();
    }
  }, [refreshCaptcha]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isModalOpen) {
        handleSecurityViolation();
      }
    };

    const handleKeyPress = () => {
      if (isModalOpen) {
        handleSecurityViolation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isModalOpen, handleSecurityViolation]);

  useEffect(() => {
    if (isModalOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleCloseModal();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isModalOpen, handleCloseModal]);

  const handleCategoryVerify = () => {
    const isCorrect = selectedCategory === correctCategory;
    handleVerify(isCorrect);
  };

  const handleDevanagariVerify = () => {
    const isCorrect = devanagariInput === currentDevanagari?.code;
    handleVerify(isCorrect);
  };

  const renderCaptchaContent = () => {
    switch (captchaType) {
      case 'image':
      case 'gif':
        return (
          <div className="grid grid-cols-2 gap-4">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedCategory(option)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors
                  ${selectedCategory === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        );
      case 'devanagari':
        return (
          <div className="space-y-4">
            <input
              type="text"
              maxLength={4}
              placeholder="Enter 4-digit code"
              value={devanagariInput}
              onChange={(e) => setDevanagariInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 text-center text-xl tracking-widest"
            />
          </div>
        );
      case 'scratch':
        return <ScratchCaptcha onVerify={handleVerify} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      {/* Screenshot warning notification */}
      {screenshotAttempted && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce">
          <p className="font-medium">Screenshot detected! This action is not allowed.</p>
        </div>
      )}
      
      {/* Custom alert notification */}
      {notification.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <p className="font-medium">{notification.message}</p>
        </div>
      )}
      
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h1 className="text-3xl font-bold mb-2">Secure CAPTCHA</h1>
          <p className="text-gray-400">
            {captchaType === 'image' && 'Select the matching category for the image'}
            {captchaType === 'gif' && 'Select the matching category for the GIF'}
            {captchaType === 'devanagari' && 'Enter the highlighted digits from the Devanagari text'}
            {captchaType === 'scratch' && 'Scratch the gray area within 4 secs to verify'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {isMobile ? 'Mobile device detected' : 'Desktop device detected'}
          </p>
        </div>

        <div className="space-y-4">
          {renderCaptchaContent()}

          {(captchaType === 'image' || captchaType === 'gif' || captchaType === 'devanagari') && (
            <>
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  setTimeLeft(5);
                }}
                disabled={hasViewed}
                className={`w-full py-3 rounded-lg font-medium transition-colors
                  ${!hasViewed
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
              >
                View {captchaType === 'gif' ? 'GIF' : 'Image'}
              </button>

              <button
                onClick={captchaType === 'devanagari' ? handleDevanagariVerify : handleCategoryVerify}
                disabled={captchaType === 'devanagari' ? devanagariInput.length !== 4 : !selectedCategory}
                className={`w-full py-3 rounded-lg font-medium transition-colors
                  ${(captchaType === 'devanagari' ? devanagariInput.length === 4 : selectedCategory)
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
              >
                Verify
              </button>
            </>
          )}
        </div>

        {isModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleSecurityViolation();
            }}
          >
            {/* Anti-screenshot overlay */}
            <div 
              ref={overlayRef}
              className="fixed inset-0 pointer-events-none select-none z-10"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
            />
            
            <div 
              ref={modalRef}
              className="bg-gray-800 rounded-xl p-6 max-w-lg w-full relative z-20"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Verify {captchaType === 'gif' ? 'GIF' : 'Image'}
                </h2>
                <span className={`font-mono ${timeLeft <= 2 ? 'text-red-500' : 'text-gray-400'}`}>
                  {timeLeft}s
                </span>
              </div>

              <div 
                className="relative rounded-lg overflow-hidden aspect-video"
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                }}
              >
                {isLoading ? (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt="CAPTCHA"
                    className="w-full h-full object-contain bg-gray-900"
                    style={{ 
                      maxHeight: '300px',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                    }}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}
              </div>
            </div>
          </div>

        )}
      </div>
    </div>
  );
}

export default App;