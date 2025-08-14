import React from 'react';

interface AudioLoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: 'electric' | 'purple' | 'blue' | 'gray' | 'white';
  message?: string;
  variant?: 'speaker' | 'waveform' | 'equalizer' | 'pulse';
}

export default function AudioLoadingSpinner({ 
  size = 'medium', 
  color = 'electric',
  message,
  variant = 'speaker'
}: AudioLoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-12 w-12',
    medium: 'h-16 w-16',
    large: 'h-24 w-24',
    xlarge: 'h-32 w-32'
  };

  const colorMap = {
    electric: '#3B82F6',
    purple: '#9333EA',
    blue: '#06B6D4',
    gray: '#6B7280',
    white: '#FFFFFF'
  };

  const selectedColor = colorMap[color];

  const renderSpeakerVariant = () => (
    <div className="relative">
      <svg
        className={`${sizeClasses[size]}`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Speaker body */}
        <path
          d="M25 35 L25 65 L35 65 L50 80 L50 20 L35 35 Z"
          fill={selectedColor}
          opacity="0.9"
        />
        
        {/* Sound waves */}
        <g className="animate-pulse">
          <path
            d="M60 40 Q65 50 60 60"
            stroke={selectedColor}
            strokeWidth="3"
            fill="none"
            opacity="0.8"
            className="animate-sound-wave-1"
          />
          <path
            d="M68 35 Q75 50 68 65"
            stroke={selectedColor}
            strokeWidth="3"
            fill="none"
            opacity="0.6"
            className="animate-sound-wave-2"
          />
          <path
            d="M76 30 Q85 50 76 70"
            stroke={selectedColor}
            strokeWidth="3"
            fill="none"
            opacity="0.4"
            className="animate-sound-wave-3"
          />
        </g>
      </svg>
    </div>
  );

  const renderWaveformVariant = () => (
    <div className={`flex items-center justify-center gap-1 ${sizeClasses[size]}`}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full animate-waveform"
          style={{
            backgroundColor: selectedColor,
            animationDelay: `${i * 0.1}s`,
            height: '100%'
          }}
        />
      ))}
    </div>
  );

  const renderEqualizerVariant = () => (
    <div className={`flex items-end justify-center gap-1 ${sizeClasses[size]}`}>
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="w-2 rounded-t-sm animate-equalizer"
          style={{
            backgroundColor: selectedColor,
            animationDelay: `${Math.random() * 0.5}s`,
            height: `${Math.random() * 60 + 20}%`
          }}
        />
      ))}
    </div>
  );

  const renderPulseVariant = () => (
    <div className="relative">
      <div className={`${sizeClasses[size]} flex items-center justify-center`}>
        <div 
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: selectedColor, opacity: 0.3 }}
        />
        <svg
          className="relative z-10 w-2/3 h-2/3"
          viewBox="0 0 100 100"
          fill={selectedColor}
        >
          <circle cx="50" cy="50" r="8" className="animate-pulse" />
          <circle cx="50" cy="50" r="20" fill="none" stroke={selectedColor} strokeWidth="2" opacity="0.5" className="animate-pulse" />
          <circle cx="50" cy="50" r="35" fill="none" stroke={selectedColor} strokeWidth="2" opacity="0.3" className="animate-pulse" />
        </svg>
      </div>
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'waveform':
        return renderWaveformVariant();
      case 'equalizer':
        return renderEqualizerVariant();
      case 'pulse':
        return renderPulseVariant();
      case 'speaker':
      default:
        return renderSpeakerVariant();
    }
  };

  return (
    <div className="flex flex-col justify-center items-center py-8">
      {renderVariant()}
      {message && (
        <p className="mt-4 text-gray-400 text-center animate-fade-in">{message}</p>
      )}
    </div>
  );
}