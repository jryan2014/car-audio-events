import React from 'react';

interface CreditCardLogosProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const CreditCardLogos: React.FC<CreditCardLogosProps> = ({ 
  size = 'md', 
  showText = true,
  className = '' 
}) => {
  const logoSizes = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-10'
  };

  const logoHeight = logoSizes[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showText && (
        <span className="text-gray-400 text-sm font-medium">We accept:</span>
      )}
      <img 
        src="/images/Stripe-CC-LogosV2.png" 
        alt="We accept Visa, Mastercard, American Express, and Discover" 
        className={`${logoHeight} w-auto`}
      />
    </div>
  );
};

export default CreditCardLogos; 