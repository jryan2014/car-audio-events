import React from 'react';
import { 
  Trophy, Calendar, MapPin, Car, Edit3, Trash2, Shield, 
  CheckCircle, Clock, AlertTriangle, Award, Target, Hash,
  User, ExternalLink, MoreVertical
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';

interface CompetitionResult {
  id: string;
  user_id: string;
  event_id?: number;
  event_attendance_id?: string;
  category: string;
  class?: string;
  division_id?: string;
  class_id?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  score?: number;
  position?: number;
  total_participants?: number;
  points_earned: number;
  notes?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  is_cae_event: boolean;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  created_at: string;
  updated_at: string;
  events?: {
    id: number;
    title: string;
    start_date: string;
    city: string;
    state: string;
  };
  users?: {
    id: string;
    name: string;
    email: string;
    membership_type: string;
  };
  competition_divisions?: {
    name: string;
  };
  competition_classes?: {
    name: string;
  };
}

interface CompetitionResultCardProps {
  result: CompetitionResult;
  onEdit?: (result: CompetitionResult) => void;
  onDelete?: (result: CompetitionResult) => void;
  onToggleVerified?: (result: CompetitionResult) => void;
  showAdminControls?: boolean;
  showUserControls?: boolean;
  compact?: boolean;
}

export default function CompetitionResultCard({
  result,
  onEdit,
  onDelete,
  onToggleVerified,
  showAdminControls = false,
  showUserControls = false,
  compact = false
}: CompetitionResultCardProps) {
  
  // Helper functions
  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400 bg-yellow-500/20';
    if (position <= 3) return 'text-orange-400 bg-orange-500/20';
    if (position <= 10) return 'text-green-400 bg-green-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const getVerificationStatus = () => {
    if (result.verified) {
      return {
        icon: CheckCircle,
        text: 'Verified',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30'
      };
    }
    return {
      icon: Clock,
      text: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30'
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SPL (Sound Pressure Level)':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'SQ (Sound Quality)':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Install Quality':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Bass Race':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Demo':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatEventDate = () => {
    const dateStr = result.event_date || result.events?.start_date;
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return null;
    }
  };

  const formatVehicle = () => {
    const parts = [
      result.vehicle_year,
      result.vehicle_make,
      result.vehicle_model
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(' ') : null;
  };

  const getEventDisplayName = () => {
    return result.event_name || result.events?.title || 'Competition Event';
  };

  const getEventLocation = () => {
    if (result.event_location) return result.event_location;
    if (result.events) return `${result.events.city}, ${result.events.state}`;
    return null;
  };

  const verificationStatus = getVerificationStatus();
  const VerificationIcon = verificationStatus.icon;
  const eventDate = formatEventDate();
  const vehicle = formatVehicle();
  const eventName = getEventDisplayName();
  const eventLocation = getEventLocation();

  // Show action controls if editing is allowed
  const canEdit = (showUserControls && !result.is_cae_event) || showAdminControls;
  const canDelete = showUserControls || showAdminControls;
  const canToggleVerification = showAdminControls && onToggleVerified;

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-electric-500/30 transition-all duration-200 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {!result.is_cae_event && (
              <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs font-medium">
                Non-CAE
              </span>
            )}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${verificationStatus.bgColor} ${verificationStatus.color} ${verificationStatus.borderColor}`}>
              <VerificationIcon className="h-3 w-3" />
              {verificationStatus.text}
            </div>
          </div>
          
          <h3 className="text-white font-semibold text-lg leading-tight truncate" title={eventName}>
            {eventName}
          </h3>
          
          {eventLocation && (
            <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {eventLocation}
            </p>
          )}
        </div>

        {/* Actions Menu */}
        {(canEdit || canDelete || canToggleVerification) && (
          <div className="flex items-center gap-1 ml-3">
            {canToggleVerification && (
              <button
                onClick={() => onToggleVerified?.(result)}
                className={`p-2 rounded-lg transition-colors ${
                  result.verified 
                    ? 'text-green-400 hover:bg-green-500/20' 
                    : 'text-yellow-400 hover:bg-yellow-500/20'
                }`}
                title={result.verified ? 'Remove verification' : 'Verify result'}
              >
                <Shield className="h-4 w-4" />
              </button>
            )}
            
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(result)}
                className="p-2 text-electric-400 hover:text-electric-300 hover:bg-electric-500/20 rounded-lg transition-colors"
                title="Edit result"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(result)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Delete result"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Event Details */}
      <div className="space-y-3 mb-4">
        {eventDate && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar className="h-4 w-4" />
            <span>{eventDate}</span>
          </div>
        )}

        {/* Category */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${getCategoryColor(result.category)}`}>
          <Trophy className="h-4 w-4" />
          {result.category}
        </div>

        {/* Division and Class */}
        {(result.competition_divisions?.name || result.competition_classes?.name) && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Target className="h-4 w-4" />
            <span>
              {result.competition_divisions?.name}
              {result.competition_divisions?.name && result.competition_classes?.name && ' / '}
              {result.competition_classes?.name}
            </span>
          </div>
        )}

        {/* Vehicle */}
        {vehicle && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Car className="h-4 w-4" />
            <span>{vehicle}</span>
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Score */}
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {result.score?.toFixed(1) || 'N/A'}
          </div>
          <div className="text-gray-400 text-xs">Score</div>
        </div>

        {/* Placement */}
        <div className="text-center">
          <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${getPositionColor(result.position || 0).split(' ')[0]}`}>
            {result.position ? getPositionIcon(result.position) : 'N/A'}
          </div>
          <div className="text-gray-400 text-xs">
            {result.total_participants ? `of ${result.total_participants}` : 'Placement'}
          </div>
        </div>

        {/* Points */}
        <div className="text-center">
          <div className="text-2xl font-bold text-electric-400">
            {result.points_earned || 0}
          </div>
          <div className="text-gray-400 text-xs">Points</div>
        </div>

        {/* Performance Indicator */}
        <div className="text-center">
          <div className="text-lg font-bold text-white flex items-center justify-center">
            {result.position === 1 ? (
              <Trophy className="h-5 w-5 text-yellow-400" />
            ) : result.position && result.position <= 3 ? (
              <Award className="h-5 w-5 text-orange-400" />
            ) : result.position && result.position <= 10 ? (
              <Target className="h-5 w-5 text-green-400" />
            ) : (
              <Hash className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="text-gray-400 text-xs">
            {result.position === 1 ? 'Winner' : 
             result.position && result.position <= 3 ? 'Podium' :
             result.position && result.position <= 10 ? 'Top 10' : 'Participant'}
          </div>
        </div>
      </div>

      {/* Notes */}
      {result.notes && !compact && (
        <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
          <p className="text-gray-300 text-sm line-clamp-2">
            {result.notes}
          </p>
        </div>
      )}

      {/* User Info (Admin View) */}
      {showAdminControls && result.users && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-white text-sm font-medium">{result.users.name}</span>
              <span className="text-gray-400 text-xs ml-2">{result.users.email}</span>
            </div>
          </div>
          
          <div className="text-gray-400 text-xs">
            {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
          </div>
        </div>
      )}

      {/* Footer (User View) */}
      {showUserControls && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50 text-xs text-gray-400">
          <div>
            Created {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
          </div>
          
          {result.updated_at && result.updated_at !== result.created_at && (
            <div>
              Updated {formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })}
            </div>
          )}
        </div>
      )}

      {/* Event Link */}
      {result.events && (
        <div className="pt-3 border-t border-gray-700/50 mt-4">
          <Link
            to={`/events/${result.events.id}`}
            className="flex items-center gap-2 text-electric-400 hover:text-electric-300 text-sm transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View Event Details
          </Link>
        </div>
      )}
    </div>
  );
}