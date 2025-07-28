import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRequired?: boolean;
}

export default function PasswordChangeModal({ isOpen, onClose, isRequired = false }: PasswordChangeModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { updatePassword } = useAuth();

  // Security: Temporary password should never be exposed in frontend code
  // This should be handled server-side only
  const TEMP_PASSWORD_PATTERN = /^Temp[A-Za-z]+\d+!$/; // Pattern to detect temp passwords

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check if user is trying to use a temporary password pattern
    if (isRequired && TEMP_PASSWORD_PATTERN.test(newPassword)) {
      setError('New password must be different from the temporary password. Please choose a new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('Password does not meet security requirements');
      return;
    }

    setIsLoading(true);
    
    try {
      await updatePassword(newPassword);
      setSuccess(true);
      
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (error: any) {
      console.error('Password change failed:', error);
      
      // Handle specific Supabase error for same password
      if (error.message?.includes('same password') || error.message?.includes('New password should be different')) {
        setError('New password must be different from your current password. Please choose a different password.');
      } else {
        setError(error.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-electric-500 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {isRequired ? 'Password Change Required' : 'Change Password'}
              </h3>
              <p className="text-gray-400 text-sm">
                {isRequired 
                  ? 'You must change your password before continuing'
                  : 'Update your account password'
                }
              </p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Password Changed Successfully!</h3>
            <p className="text-gray-400">Your password has been updated securely.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {isRequired && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400">Security Notice</h4>
                    <p className="text-sm text-yellow-300 mt-1">
                      This is your first login or you're using a temporary password. 
                      Please create a new secure password to continue.
                    </p>
                    <p className="text-xs text-yellow-400 mt-2 font-mono">
                      Your current password is temporary and must be changed
                    </p>
                    <p className="text-xs text-yellow-300 mt-1">
                      Your new password must be different from this temporary password.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-400">Error</h4>
                    <p className="text-sm text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Show warning if user enters the temporary password */}
              {isRequired && TEMP_PASSWORD_PATTERN.test(newPassword) && (
                <div className="mt-2 text-xs text-yellow-400 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>This is your current temporary password. Please choose a different password.</span>
                </div>
              )}
              
              {/* Password Requirements */}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-gray-400 mb-2">Password Requirements:</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className={`flex items-center space-x-2 ${passwordValidation.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidation.minLength ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.hasUpper ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidation.hasUpper ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.hasLower ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidation.hasLower ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidation.hasNumber ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                      <span>One number</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.hasSpecial ? 'text-green-400' : 'text-gray-400'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidation.hasSpecial ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                      <span>One special character</span>
                    </div>
                    {isRequired && (
                      <div className={`flex items-center space-x-2 ${!TEMP_PASSWORD_PATTERN.test(newPassword) ? 'text-green-400' : 'text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${!TEMP_PASSWORD_PATTERN.test(newPassword) ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                        <span>Different from temporary password</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              {!isRequired && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !passwordValidation.isValid || (isRequired && TEMP_PASSWORD_PATTERN.test(newPassword))}
                className="bg-electric-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}