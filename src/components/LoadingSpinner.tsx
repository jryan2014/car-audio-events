import React from 'react';
import AudioLoadingSpinner from './AudioLoadingSpinner';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'electric' | 'purple' | 'blue' | 'gray';
  message?: string;
  variant?: 'speaker' | 'waveform' | 'equalizer' | 'pulse' | 'classic';
  useAudioTheme?: boolean;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = 'electric',
  message,
  variant = 'speaker',
  useAudioTheme = true
}: LoadingSpinnerProps) {
  // Map old size values to new ones for AudioLoadingSpinner
  const audioSize = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';
  
  // Use audio theme by default for better visual consistency
  if (useAudioTheme && variant !== 'classic') {
    return (
      <AudioLoadingSpinner
        size={audioSize}
        color={color as any}
        message={message}
        variant={variant as any}
      />
    );
  }

  // Classic spinner fallback
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col justify-center items-center py-12">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 ${
        color === 'electric' ? 'border-electric-500' : 
        color === 'purple' ? 'border-purple-500' : 
        color === 'blue' ? 'border-blue-500' : 
        'border-gray-500'
      }`}></div>
      {message && (
        <p className="mt-4 text-gray-400 text-center">{message}</p>
      )}
    </div>
  );
}