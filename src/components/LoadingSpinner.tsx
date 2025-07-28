import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = 'electric-500',
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col justify-center items-center py-12">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-${color}`}></div>
      {message && (
        <p className="mt-4 text-gray-400 text-center">{message}</p>
      )}
    </div>
  );
}