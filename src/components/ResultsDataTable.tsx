import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, ChevronDown, Edit3, Trash2, Shield, CheckCircle, 
  Clock, User, Calendar, Trophy, Award, Target, Hash, Car,
  MapPin, ExternalLink, Eye, MoreVertical, Filter, Search
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

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  visible: boolean;
}

interface ResultsDataTableProps {
  results: CompetitionResult[];
  loading?: boolean;
  selectedResults?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectResult?: (id: string, checked: boolean) => void;
  onEdit?: (result: CompetitionResult) => void;
  onDelete?: (result: CompetitionResult) => void;
  onToggleVerified?: (result: CompetitionResult) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  showAdminControls?: boolean;
  showUserControls?: boolean;
  showColumnToggle?: boolean;
  compact?: boolean;
}

export default function ResultsDataTable({
  results,
  loading = false,
  selectedResults = new Set(),
  onSelectAll,
  onSelectResult,
  onEdit,
  onDelete,
  onToggleVerified,
  sortBy = 'created_at',
  sortOrder = 'desc',
  onSort,
  showAdminControls = false,
  showUserControls = false,
  showColumnToggle = true,
  compact = false
}: ResultsDataTableProps) {

  // Column configuration
  const [columns, setColumns] = useState<Column[]>([
    { key: 'user', label: 'User', sortable: true, visible: showAdminControls },
    { key: 'event', label: 'Event', sortable: true, visible: true },
    { key: 'category', label: 'Category', sortable: true, visible: true },
    { key: 'division', label: 'Division/Class', sortable: true, visible: !compact },
    { key: 'vehicle', label: 'Vehicle', sortable: false, visible: !compact },
    { key: 'score', label: 'Score', sortable: true, align: 'center', visible: true },
    { key: 'position', label: 'Position', sortable: true, align: 'center', visible: true },
    { key: 'points', label: 'Points', sortable: true, align: 'center', visible: true },
    { key: 'verified', label: 'Status', sortable: true, align: 'center', visible: true },
    { key: 'date', label: 'Date', sortable: true, visible: !compact },
    { key: 'actions', label: 'Actions', sortable: false, align: 'center', visible: true }
  ]);

  const [showColumnPanel, setShowColumnPanel] = useState(false);

  // Helper functions
  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400';
    if (position <= 3) return 'text-orange-400';
    if (position <= 10) return 'text-green-400';
    return 'text-gray-400';
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SPL (Sound Pressure Level)':
        return 'bg-red-500/20 text-red-400';
      case 'SQ (Sound Quality)':
        return 'bg-blue-500/20 text-blue-400';
      case 'Install Quality':
        return 'bg-purple-500/20 text-purple-400';
      case 'Bass Race':
        return 'bg-orange-500/20 text-orange-400';
      case 'Demo':
        return 'bg-pink-500/20 text-pink-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatVehicle = (result: CompetitionResult) => {
    const parts = [
      result.vehicle_year,
      result.vehicle_make,
      result.vehicle_model
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(' ') : 'N/A';
  };

  const formatEventDate = (result: CompetitionResult) => {
    const dateStr = result.event_date || result.events?.start_date;
    if (!dateStr) return 'N/A';
    
    try {
      const date = new Date(dateStr);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const getEventDisplayName = (result: CompetitionResult) => {
    return result.event_name || result.events?.title || 'Competition Event';
  };

  const getEventLocation = (result: CompetitionResult) => {
    if (result.event_location) return result.event_location;
    if (result.events) return `${result.events.city}, ${result.events.state}`;
    return null;
  };

  const handleSort = (field: string) => {
    if (!onSort) return;
    
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, newOrder);
  };

  const toggleColumn = (key: string) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const visibleColumns = columns.filter(col => col.visible);
  const hasSelection = selectedResults.size > 0;
  const allSelected = results.length > 0 && results.every(result => selectedResults.has(result.id));
  const someSelected = hasSelection && !allSelected;

  // Show actions if editing is allowed
  const canEdit = (result: CompetitionResult) => 
    (showUserControls && !result.is_cae_event) || showAdminControls;
  const canDelete = showUserControls || showAdminControls;
  const canToggleVerification = showAdminControls && onToggleVerified;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Table Header with Controls */}
      {showColumnToggle && (
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            {hasSelection && (
              <span className="text-electric-400 text-sm">
                • {selectedResults.size} selected
              </span>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowColumnPanel(!showColumnPanel)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors text-sm"
            >
              <Eye className="h-4 w-4" />
              Columns
            </button>
            
            {showColumnPanel && (
              <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 min-w-48">
                <div className="p-3">
                  <h4 className="text-white font-medium mb-3">Visible Columns</h4>
                  <div className="space-y-2">
                    {columns.map(column => (
                      <label key={column.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={column.visible}
                          onChange={() => toggleColumn(column.key)}
                          className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                        />
                        <span className="text-gray-300 text-sm">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/30">
            <tr>
              {/* Selection checkbox */}
              {onSelectAll && (
                <th className="w-12 py-4 px-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                  />
                </th>
              )}

              {/* Dynamic columns */}
              {visibleColumns.map(column => (
                <th
                  key={column.key}
                  className={`py-4 px-4 text-gray-300 font-medium ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${column.width || ''}`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      {column.label}
                      {sortBy === column.key && (
                        sortOrder === 'asc' ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700/30">
            {loading && results.length === 0 ? (
              // Loading state
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {onSelectAll && <td className="py-4 px-4"><div className="w-4 h-4 bg-gray-700 rounded animate-pulse" /></td>}
                  {visibleColumns.map(column => (
                    <td key={column.key} className="py-4 px-4">
                      <div className="h-4 bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : results.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={visibleColumns.length + (onSelectAll ? 1 : 0)} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Trophy className="h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400 text-lg font-medium">No results found</p>
                    <p className="text-gray-500 text-sm">Try adjusting your filters or search criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              results.map(result => {
                const isSelected = selectedResults.has(result.id);
                
                return (
                  <tr
                    key={result.id}
                    className={`hover:bg-gray-700/20 transition-colors ${
                      isSelected ? 'bg-electric-500/10' : ''
                    }`}
                  >
                    {/* Selection checkbox */}
                    {onSelectResult && (
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectResult(result.id, e.target.checked)}
                          className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                        />
                      </td>
                    )}

                    {/* User column */}
                    {visibleColumns.find(c => c.key === 'user')?.visible && (
                      <td className="py-4 px-4">
                        {result.users && (
                          <div>
                            <div className="text-white font-medium">{result.users.name}</div>
                            <div className="text-gray-400 text-sm">{result.users.email}</div>
                            <div className="text-gray-500 text-xs capitalize">
                              {result.users.membership_type}
                            </div>
                          </div>
                        )}
                      </td>
                    )}

                    {/* Event column */}
                    {visibleColumns.find(c => c.key === 'event')?.visible && (
                      <td className="py-4 px-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {!result.is_cae_event && (
                              <span className="bg-gray-600 text-gray-300 px-2 py-0.5 rounded text-xs">
                                Non-CAE
                              </span>
                            )}
                            <span className="text-white font-medium">
                              {getEventDisplayName(result)}
                            </span>
                          </div>
                          {getEventLocation(result) && (
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <MapPin className="h-3 w-3" />
                              {getEventLocation(result)}
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Category column */}
                    {visibleColumns.find(c => c.key === 'category')?.visible && (
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getCategoryColor(result.category)}`}>
                          {result.category}
                        </span>
                      </td>
                    )}

                    {/* Division/Class column */}
                    {visibleColumns.find(c => c.key === 'division')?.visible && (
                      <td className="py-4 px-4">
                        <div className="text-gray-300 text-sm">
                          {result.competition_divisions?.name && (
                            <div>{result.competition_divisions.name}</div>
                          )}
                          {result.competition_classes?.name && (
                            <div className="text-gray-400">
                              {result.competition_classes.name}
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Vehicle column */}
                    {visibleColumns.find(c => c.key === 'vehicle')?.visible && (
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                          <Car className="h-4 w-4 text-gray-400" />
                          {formatVehicle(result)}
                        </div>
                      </td>
                    )}

                    {/* Score column */}
                    {visibleColumns.find(c => c.key === 'score')?.visible && (
                      <td className="py-4 px-4 text-center">
                        <span className="text-white font-medium">
                          {result.score?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                    )}

                    {/* Placement column */}
                    {visibleColumns.find(c => c.key === 'position')?.visible && (
                      <td className="py-4 px-4 text-center">
                        <div>
                          <span className={`font-bold ${getPositionColor(result.position || 0)}`}>
                            {result.position ? getPositionIcon(result.position) : 'N/A'}
                          </span>
                          {result.total_participants && (
                            <div className="text-gray-500 text-xs">
                              of {result.total_participants}
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Points column */}
                    {visibleColumns.find(c => c.key === 'points')?.visible && (
                      <td className="py-4 px-4 text-center">
                        <span className="text-electric-400 font-medium">
                          {result.points_earned || 0}
                        </span>
                      </td>
                    )}

                    {/* Status column */}
                    {visibleColumns.find(c => c.key === 'verified')?.visible && (
                      <td className="py-4 px-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          result.verified 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {result.verified ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {result.verified ? 'Verified' : 'Pending'}
                        </div>
                      </td>
                    )}

                    {/* Date column */}
                    {visibleColumns.find(c => c.key === 'date')?.visible && (
                      <td className="py-4 px-4">
                        <div className="text-gray-300 text-sm">
                          {formatEventDate(result)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                        </div>
                      </td>
                    )}

                    {/* Actions column */}
                    {visibleColumns.find(c => c.key === 'actions')?.visible && (
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {canToggleVerification && (
                            <button
                              onClick={() => onToggleVerified?.(result)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                result.verified 
                                  ? 'text-green-400 hover:bg-green-500/20' 
                                  : 'text-yellow-400 hover:bg-yellow-500/20'
                              }`}
                              title={result.verified ? 'Remove verification' : 'Verify result'}
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}
                          
                          {canEdit(result) && onEdit && (
                            <button
                              onClick={() => onEdit(result)}
                              className="p-1.5 text-electric-400 hover:text-electric-300 hover:bg-electric-500/20 rounded-lg transition-colors"
                              title="Edit result"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          
                          {canDelete && onDelete && (
                            <button
                              onClick={() => onDelete(result)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Delete result"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {result.events && (
                            <Link
                              to={`/events/${result.events.id}`}
                              className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-500/20 rounded-lg transition-colors"
                              title="View event"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Click outside to close column panel */}
      {showColumnPanel && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowColumnPanel(false)}
        />
      )}
    </div>
  );
}