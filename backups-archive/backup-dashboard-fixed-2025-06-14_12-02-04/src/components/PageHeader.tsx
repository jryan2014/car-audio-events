import React from 'react';

interface PageHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  subtitleSize?: 'small' | 'normal' | 'large';
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  subtitleSize = 'normal',
  children,
  className = ''
}: PageHeaderProps) {
  const getSubtitleClass = () => {
    switch (subtitleSize) {
      case 'small':
        return 'page-subtitle-small';
      case 'large':
        return 'page-subtitle-large';
      default:
        return 'page-subtitle';
    }
  };

  return (
    <div className={`text-center mb-12 ${className}`}>
      <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
        {title}
      </h1>
      {subtitle && (
        <p className={getSubtitleClass()}>
          {subtitle}
        </p>
      )}
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  );
} 