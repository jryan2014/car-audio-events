import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, MapPin, User, Phone, Mail, Globe, Check, X, Eye, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription 
} from '../ui/Modal';

interface EventSuggestion {
  id: string;
  suggested_by_email: string;
  suggested_by_name?: string | null;
  suggestion_date: string;
  event_name: string;
  venue_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code?: string | null;
  country: string;
  start_date: string;
  end_date: string;
  sanctioning_bodies?: string[] | null;
  event_director_name?: string | null;
  event_director_email?: string | null;
  event_director_phone?: string | null;
  event_website?: string | null;
  event_description?: string | null;
  registration_link?: string | null;
  entry_fee?: number | null;
  spectator_fee?: number | null;
  event_formats?: string[] | null;
  schedule_info?: string | null;
  notes?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  admin_notes?: string | null;
  published_event_id?: number | null;
  published_at?: string | null;
}

export default function EventSuggestionsManager() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<EventSuggestion | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, [statusFilter]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('event_suggestions')
        .select('*')
        .order('suggestion_date', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching suggestions:', error);
        throw error;
      }
      
      // Ensure data is properly typed and handle nulls
      const suggestions = (data || []).map((item: any) => ({
        ...item,
        sanctioning_bodies: item.sanctioning_bodies || [],
        event_formats: item.event_formats || []
      }));
      
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Don't crash the component, just show empty state
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const checkCompleteness = async (suggestionId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('check_suggestion_completeness', { suggestion_id: suggestionId });
      
      if (error) throw error;
      
      // Handle the response properly - it might be an array
      const result = Array.isArray(data) ? data[0] : data;
      return result || { is_complete: false, missing_fields: [] };
    } catch (error) {
      console.error('Error checking completeness:', error);
      return { is_complete: false, missing_fields: [] };
    }
  };

  const handleStatusUpdate = async (suggestionId: string, newStatus: string) => {
    setIsProcessing(true);
    try {
      const updateData: any = {
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null
      };
      
      if (newStatus === 'rejected') {
        updateData.rejection_reason = rejectionReason;
      }
      
      const { error } = await supabase
        .from('event_suggestions')
        .update(updateData)
        .eq('id', suggestionId);
      
      if (error) throw error;
      
      await fetchSuggestions();
      setSelectedSuggestion(null);
      setShowDetailModal(false);
      setRejectionReason('');
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async (suggestion: EventSuggestion) => {
    if (!user?.id) return;
    
    // Check completeness first
    const completeness = await checkCompleteness(suggestion.id);
    if (!completeness || !completeness.is_complete) {
      const missingFields = completeness?.missing_fields || [];
      const fieldsText = missingFields.length > 0 ? missingFields.join(', ') : 'unknown fields';
      alert(`Cannot publish. Missing fields: ${fieldsText}`);
      return;
    }
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .rpc('approve_and_publish_suggestion', {
          suggestion_id: suggestion.id,
          admin_id: user.id
        });
      
      if (error) throw error;
      
      alert(`Event published successfully! Event ID: ${data}`);
      await fetchSuggestions();
      setSelectedSuggestion(null);
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error publishing event:', error);
      alert('Failed to publish event');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
      reviewing: 'bg-blue-900/50 text-blue-400 border-blue-700',
      approved: 'bg-green-900/50 text-green-400 border-green-700',
      rejected: 'bg-red-900/50 text-red-400 border-red-700',
      published: 'bg-purple-900/50 text-purple-400 border-purple-700'
    };
    
    return badges[status as keyof typeof badges] || 'bg-gray-900/50 text-gray-400 border-gray-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const openDetailModal = (suggestion: EventSuggestion) => {
    setSelectedSuggestion(suggestion);
    setAdminNotes(suggestion.admin_notes || '');
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Event Suggestions Review</h1>
              <p className="text-gray-400">Review and manage all event suggestions</p>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="flex space-x-2">
          {['all', 'pending', 'reviewing', 'approved', 'rejected', 'published'].map(status => (
            <Button
              key={status}
              onClick={() => setStatusFilter(status)}
              variant={statusFilter === status ? 'default' : 'outline'}
              className={statusFilter === status 
                ? 'bg-electric-500 hover:bg-electric-600 text-white' 
                : 'border-gray-700 text-gray-300 hover:bg-gray-800'
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
          </div>
        </div>
      
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading suggestions...</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {statusFilter !== 'all' ? statusFilter : ''} suggestions found
        </div>
      ) : (
        <div className="grid gap-4">
          {suggestions.map(suggestion => (
            <Card key={suggestion.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{suggestion.event_name}</h3>
                    <p className="text-sm text-gray-400">
                      Suggested by: {suggestion.suggested_by_name || suggestion.suggested_by_email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(suggestion.suggestion_date)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(suggestion.status)}`}>
                    {suggestion.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="flex items-start text-gray-300">
                    <Calendar className="w-4 h-4 mr-2 mt-0.5 text-electric-500" />
                    <div>
                      <strong>Dates:</strong> {formatDate(suggestion.start_date)} - {formatDate(suggestion.end_date)}
                    </div>
                  </div>
                  
                  <div className="flex items-start text-gray-300">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-electric-500" />
                    <div>
                      <strong>Location:</strong> {suggestion.city}, {suggestion.state}
                    </div>
                  </div>
                  
                  {suggestion.sanctioning_bodies && suggestion.sanctioning_bodies.length > 0 && (
                    <div className="flex items-start text-gray-300">
                      <strong className="mr-2">Sanctioning:</strong>
                      {suggestion.sanctioning_bodies.join(', ')}
                    </div>
                  )}
                  
                  {suggestion.event_formats && suggestion.event_formats.length > 0 && (
                    <div className="flex items-start text-gray-300">
                      <strong className="mr-2">Formats:</strong>
                      {suggestion.event_formats.join(', ')}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => openDetailModal(suggestion)}
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye className="w-4 h-4" />}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    View Details
                  </Button>
                  
                  {suggestion.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate(suggestion.id, 'reviewing')}
                        variant="warning"
                        size="sm"
                        leftIcon={<Clock className="w-4 h-4" />}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Mark Reviewing
                      </Button>
                      
                      <Button
                        onClick={() => handlePublish(suggestion)}
                        variant="success"
                        size="sm"
                        leftIcon={<Check className="w-4 h-4" />}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Publish
                      </Button>
                    </>
                  )}
                  
                  {suggestion.status === 'reviewing' && (
                    <Button
                      onClick={() => handlePublish(suggestion)}
                      variant="success"
                      size="sm"
                      leftIcon={<Check className="w-4 h-4" />}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Detail Modal */}
      <Modal open={showDetailModal} onOpenChange={setShowDetailModal}>
        <ModalContent size="xl">
          <ModalHeader>
            <ModalTitle>Event Suggestion Details</ModalTitle>
          </ModalHeader>
        {selectedSuggestion && (
          <div className="space-y-6">
            {/* Status and Meta Information */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Status</label>
                  <p className="text-white capitalize">{selectedSuggestion.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Suggested By</label>
                  <p className="text-white">{selectedSuggestion.suggested_by_name || 'Not provided'}</p>
                  <p className="text-sm text-gray-400">{selectedSuggestion.suggested_by_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Submission Date</label>
                  <p className="text-white">{formatDate(selectedSuggestion.suggestion_date)}</p>
                </div>
                {selectedSuggestion.reviewed_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Reviewed Date</label>
                    <p className="text-white">{formatDate(selectedSuggestion.reviewed_at)}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Event Information */}
            <div>
              <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-electric-500" />
                Event Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Event Name</label>
                  <p className="text-white">{selectedSuggestion.event_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Dates</label>
                  <p className="text-white">{formatDate(selectedSuggestion.start_date)} - {formatDate(selectedSuggestion.end_date)}</p>
                </div>
                {selectedSuggestion.event_description && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-400">Description</label>
                    <p className="text-white whitespace-pre-wrap">{selectedSuggestion.event_description}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Venue Information */}
            <div>
              <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-electric-500" />
                Venue Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Venue Name</label>
                  <p className="text-white">{selectedSuggestion.venue_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Address</label>
                  <p className="text-white">{selectedSuggestion.street_address}</p>
                  <p className="text-white">{selectedSuggestion.city}, {selectedSuggestion.state} {selectedSuggestion.zip_code}</p>
                </div>
              </div>
            </div>
            
            {/* Event Director Information */}
            {(selectedSuggestion.event_director_name || selectedSuggestion.event_director_email || selectedSuggestion.event_director_phone) && (
              <div>
                <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-electric-500" />
                  Event Director
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedSuggestion.event_director_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Name</label>
                      <p className="text-white">{selectedSuggestion.event_director_name}</p>
                    </div>
                  )}
                  {selectedSuggestion.event_director_email && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Email</label>
                      <p className="text-white">{selectedSuggestion.event_director_email}</p>
                    </div>
                  )}
                  {selectedSuggestion.event_director_phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Phone</label>
                      <p className="text-white">{selectedSuggestion.event_director_phone}</p>
                    </div>
                  )}
                  {selectedSuggestion.event_website && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Website</label>
                      <a href={selectedSuggestion.event_website} target="_blank" rel="noopener noreferrer" className="text-electric-500 hover:text-electric-400">
                        {selectedSuggestion.event_website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Event Details */}
            <div>
              <h4 className="font-semibold mb-3 text-white">Event Details</h4>
              <div className="grid grid-cols-2 gap-4">
                {selectedSuggestion.sanctioning_bodies && selectedSuggestion.sanctioning_bodies.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Sanctioning Bodies</label>
                    <p className="text-white">{selectedSuggestion.sanctioning_bodies.join(', ')}</p>
                  </div>
                )}
                {selectedSuggestion.event_formats && selectedSuggestion.event_formats.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Event Formats</label>
                    <p className="text-white">{selectedSuggestion.event_formats.join(', ')}</p>
                  </div>
                )}
                {selectedSuggestion.entry_fee !== null && selectedSuggestion.entry_fee !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Entry Fee</label>
                    <p className="text-white">${selectedSuggestion.entry_fee}</p>
                  </div>
                )}
                {selectedSuggestion.spectator_fee !== null && selectedSuggestion.spectator_fee !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Spectator Fee</label>
                    <p className="text-white">${selectedSuggestion.spectator_fee}</p>
                  </div>
                )}
                {selectedSuggestion.registration_link && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-400">Registration Link</label>
                    <a href={selectedSuggestion.registration_link} target="_blank" rel="noopener noreferrer" className="text-electric-500 hover:text-electric-400">
                      {selectedSuggestion.registration_link}
                    </a>
                  </div>
                )}
              </div>
              
              {selectedSuggestion.schedule_info && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-400">Schedule Information</label>
                  <p className="text-white whitespace-pre-wrap">{selectedSuggestion.schedule_info}</p>
                </div>
              )}
              
              {selectedSuggestion.notes && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-400">Additional Notes from Submitter</label>
                  <p className="text-white whitespace-pre-wrap">{selectedSuggestion.notes}</p>
                </div>
              )}
            </div>
            
            {/* Admin Section */}
            {selectedSuggestion.status === 'pending' || selectedSuggestion.status === 'reviewing' ? (
              <div className="border-t border-gray-700 pt-6">
                <h4 className="font-semibold mb-3 text-white">Admin Actions</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Admin Notes (Internal)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                      placeholder="Internal notes about this suggestion..."
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    {selectedSuggestion.status === 'pending' && (
                      <Button
                        onClick={() => handleStatusUpdate(selectedSuggestion.id, 'reviewing')}
                        disabled={isProcessing}
                        variant="warning"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Mark as Reviewing
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handlePublish(selectedSuggestion)}
                      disabled={isProcessing}
                      variant="success"
                      leftIcon={<Check className="w-4 h-4" />}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve & Publish
                    </Button>
                    
                    <Button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          setRejectionReason(reason);
                          handleStatusUpdate(selectedSuggestion.id, 'rejected');
                        }
                      }}
                      disabled={isProcessing}
                      variant="destructive"
                      leftIcon={<X className="w-4 h-4" />}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-700 pt-6">
                {selectedSuggestion.rejection_reason && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Rejection Reason
                    </label>
                    <p className="text-red-400">{selectedSuggestion.rejection_reason}</p>
                  </div>
                )}
                
                {selectedSuggestion.admin_notes && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Admin Notes
                    </label>
                    <p className="text-white">{selectedSuggestion.admin_notes}</p>
                  </div>
                )}
                
                {selectedSuggestion.published_event_id && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Published Event ID
                    </label>
                    <p className="text-white">#{selectedSuggestion.published_event_id}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </ModalContent>
      </Modal>
      </div>
    </div>
  );
}