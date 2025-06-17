import React from 'react';

interface BadgeProps {
  text: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({ text, color, size = 'sm', className = '' }: BadgeProps) {
  const getColorClasses = (color: string): string => {
    switch (color.toLowerCase()) {
      case 'green':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'purple':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'orange':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'red':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'indigo':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'yellow':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'blue':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'gray':
      case 'grey':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'sm':
        return 'px-1.5 py-0.5 text-xs';
      case 'md':
        return 'px-2 py-1 text-sm';
      case 'lg':
        return 'px-3 py-1.5 text-base';
      default:
        return 'px-1.5 py-0.5 text-xs';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-bold rounded border
        ${getColorClasses(color)}
        ${getSizeClasses(size)}
        ${className}
      `.trim()}
    >
      {text}
    </span>
  );
} 