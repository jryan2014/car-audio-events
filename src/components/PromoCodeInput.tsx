import React, { useState } from 'react';
import { Tag, Loader, Check, X } from 'lucide-react';
import { billingService } from '../services/billingService';

interface PromoCodeInputProps {
  userId: string;
  onSuccess?: (discount: any) => void;
  onError?: (error: string) => void;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({ 
  userId, 
  onSuccess, 
  onError 
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;

    setIsApplying(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await billingService.applyPromoCode(userId, promoCode);
      
      setStatus('success');
      setMessage(result.message || 'Promo code applied successfully!');
      
      if (onSuccess) {
        onSuccess(result.discount);
      }

      // Clear the input after successful application
      setTimeout(() => {
        setPromoCode('');
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Invalid promo code');
      
      if (onError) {
        onError(error.message);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isApplying) {
      handleApplyPromoCode();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter promo code"
            className="w-full pl-10 pr-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
            disabled={isApplying}
          />
        </div>
        <button
          onClick={handleApplyPromoCode}
          disabled={isApplying || !promoCode.trim()}
          className="px-4 py-2 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isApplying ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </button>
      </div>

      {message && (
        <div className={`flex items-center space-x-2 text-sm ${
          status === 'success' ? 'text-green-400' : 'text-red-400'
        }`}>
          {status === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}; 