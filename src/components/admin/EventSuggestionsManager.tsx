import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, MapPin, User, Phone, Mail, Globe, Check, X, Eye, Clock, AlertCircle, ChevronRight, DollarSign, Trophy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription,
  ModalFooter
} from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { parseLocalDate } from '../../utils/dateHelpers';

interface PendingEvent {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  venue_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  external_registration_url?: string | null;
  member_price?: number | null;
  non_member_price?: number | null;
  gate_fee?: number | null;
  event_director_first_name?: string | null;
  event_director_last_name?: string | null;
  event_director_email?: string | null;
  event_director_phone?: string | null;
  competition_categories?: string[] | null;
  competition_classes?: string[] | null;
  rules?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status: string;
  approval_status: string;
  created_at: string;
  updated_at?: string | null;
}

export default function EventSuggestionsManager() {
  const { user } = useAuth();
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    try {
      const date = parseLocalDate(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, [statusFilter]);

  const fetchPendingEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by approval status and event status
      if (statusFilter === 'pending') {
        // Get events that are pending approval (user suggestions)
        query = query
          .eq('status', 'pending_approval')
          .eq('approval_status', 'pending');
      } else if (statusFilter === 'approved') {
        query = query.eq('approval_status', 'approved');
      } else if (statusFilter === 'rejected') {
        query = query.eq('approval_status', 'rejected');
      }
      // For 'all', no filter is applied
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching pending events:', error);
        throw error;
      }
      
      setPendingEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching pending events:', error);
      setError('Failed to load pending events. Please try again.');
      setPendingEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    setIsProcessing(true);
    try {
      // Get the suggested event data
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      
      // Store the suggestion data in localStorage
      localStorage.setItem('pendingSuggestionData', JSON.stringify(eventData));
      
      // Navigate to create new event form with the suggestion data
      window.location.href = '/create-event?from_suggestion=true';
    } catch (error: any) {
      console.error('Error processing event approval:', error);
      setError('Failed to process event approval. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (eventId: string) => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Update event to rejected status
      const { error } = await supabase
        .from('events')
        .update({
          approval_status: 'rejected',
          status: 'rejected',
          is_public: false,
          is_active: false,
          seo_description: rejectionReason, // Store rejection reason in seo_description temporarily
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      // Refresh the list
      await fetchPendingEvents();
      setSelectedEvent(null);
      setShowDetailModal(false);
      setRejectionReason('');
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error rejecting event:', error);
      setError('Failed to reject event. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailModal = (event: PendingEvent) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
    setRejectionReason('');
    setAdminNotes('');
    setError(null);
  };

  const formatLocation = (event: PendingEvent) => {
    const parts = [];
    if (event.city) parts.push(event.city);
    if (event.state) parts.push(event.state);
    if (event.country) parts.push(event.country);
    if (event.zip_code) parts.push(event.zip_code);
    return parts.join(', ') || 'Location not specified';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Event Suggestions Management</CardTitle>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}
          
          {/* Status Filter */}
          <div className="mb-6 flex gap-2">
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              className={statusFilter === 'pending' 
                ? 'bg-electric-500 hover:bg-electric-600 text-white' 
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('approved')}
              className={statusFilter === 'approved' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
            >
              Approved
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('rejected')}
              className={statusFilter === 'rejected' 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
            >
              Rejected
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' 
                ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
            >
              All
            </Button>
          </div>
          
          {/* Events List */}
          {loading ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-electric-500" />
              <p className="text-gray-400">Loading pending events...</p>
            </div>
          ) : pendingEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No {statusFilter === 'all' ? '' : statusFilter} event suggestions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEvents.map((event) => (
                <Card key={event.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(event.start_date)}
                              {event.end_date && event.end_date !== event.start_date && 
                                ` - ${formatDate(event.end_date)}`
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{formatLocation(event)}</span>
                          </div>
                          
                          {event.venue_name && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <span>{event.venue_name}</span>
                            </div>
                          )}
                          
                          {event.contact_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{event.contact_email}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Submitted: {formatDate(event.created_at)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              event.approval_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              event.approval_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {event.approval_status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {event.description && (
                          <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailModal(event)}
                          leftIcon={<Eye className="h-4 w-4" />}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          View Details
                        </Button>
                        
                        {event.approval_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleApprove(event.id)}
                              disabled={isProcessing}
                              leftIcon={<Check className="h-4 w-4" />}
                            >
                              Approve & Create
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowDetailModal(true);
                              }}
                              disabled={isProcessing}
                              leftIcon={<X className="h-4 w-4" />}
                              className="text-red-400 border-red-400 hover:bg-red-400/10"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Detail Modal */}
      <Modal open={showDetailModal} onOpenChange={setShowDetailModal}>
        <ModalContent className="max-w-3xl bg-gray-900 text-white">
          <ModalHeader>
            <ModalTitle>Event Suggestion Details</ModalTitle>
            <ModalDescription className="text-gray-400">
              Review the complete event details before making a decision
            </ModalDescription>
          </ModalHeader>
          
          {selectedEvent && (
            <div className="space-y-6 p-6">
              {/* Event Information */}
              <div>
                <h3 className="text-lg font-semibold text-electric-500 mb-3">Event Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400">Event Name:</span>
                    <span className="ml-2 text-white">{selectedEvent.title}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Dates:</span>
                    <span className="ml-2 text-white">
                      {formatDate(selectedEvent.start_date)}
                      {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && 
                        ` - ${formatDate(selectedEvent.end_date)}`
                      }
                    </span>
                  </div>
                  {selectedEvent.description && (
                    <div>
                      <span className="text-gray-400">Description:</span>
                      <p className="mt-1 text-white">{selectedEvent.description}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Location Information */}
              <div>
                <h3 className="text-lg font-semibold text-electric-500 mb-3">Location</h3>
                <div className="space-y-2">
                  {selectedEvent.venue_name && (
                    <div>
                      <span className="text-gray-400">Venue:</span>
                      <span className="ml-2 text-white">{selectedEvent.venue_name}</span>
                    </div>
                  )}
                  {selectedEvent.address && (
                    <div>
                      <span className="text-gray-400">Address:</span>
                      <span className="ml-2 text-white">{selectedEvent.address}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <span className="ml-2 text-white">{formatLocation(selectedEvent)}</span>
                  </div>
                </div>
              </div>
              
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-electric-500 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  {(selectedEvent.event_director_first_name || selectedEvent.event_director_last_name) && (
                    <div>
                      <span className="text-gray-400">Event Director:</span>
                      <span className="ml-2 text-white">
                        {selectedEvent.event_director_first_name} {selectedEvent.event_director_last_name}
                      </span>
                    </div>
                  )}
                  {selectedEvent.event_director_email && (
                    <div>
                      <span className="text-gray-400">Director Email:</span>
                      <span className="ml-2 text-white">{selectedEvent.event_director_email}</span>
                    </div>
                  )}
                  {selectedEvent.event_director_phone && (
                    <div>
                      <span className="text-gray-400">Director Phone:</span>
                      <span className="ml-2 text-white">{selectedEvent.event_director_phone}</span>
                    </div>
                  )}
                  {selectedEvent.contact_email && (
                    <div>
                      <span className="text-gray-400">Contact Email:</span>
                      <span className="ml-2 text-white">{selectedEvent.contact_email}</span>
                    </div>
                  )}
                  {selectedEvent.website_url && (
                    <div>
                      <span className="text-gray-400">Website:</span>
                      <a href={selectedEvent.website_url} target="_blank" rel="noopener noreferrer" 
                         className="ml-2 text-electric-500 hover:underline">
                        {selectedEvent.website_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Pricing Information */}
              {(selectedEvent.member_price !== null || selectedEvent.non_member_price !== null || selectedEvent.gate_fee !== null) && (
                <div>
                  <h3 className="text-lg font-semibold text-electric-500 mb-3">Pricing</h3>
                  <div className="space-y-2">
                    {selectedEvent.member_price !== null && (
                      <div>
                        <span className="text-gray-400">Member Price:</span>
                        <span className="ml-2 text-white">${selectedEvent.member_price}</span>
                      </div>
                    )}
                    {selectedEvent.non_member_price !== null && (
                      <div>
                        <span className="text-gray-400">Non-Member Price:</span>
                        <span className="ml-2 text-white">${selectedEvent.non_member_price}</span>
                      </div>
                    )}
                    {selectedEvent.gate_fee !== null && (
                      <div>
                        <span className="text-gray-400">Gate/Spectator Fee:</span>
                        <span className="ml-2 text-white">${selectedEvent.gate_fee}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Competition Information */}
              {(selectedEvent.competition_categories?.length || selectedEvent.competition_classes?.length) && (
                <div>
                  <h3 className="text-lg font-semibold text-electric-500 mb-3">Competition Details</h3>
                  <div className="space-y-2">
                    {selectedEvent.competition_categories?.length > 0 && (
                      <div>
                        <span className="text-gray-400">Sanctioning Bodies:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedEvent.competition_categories.map((cat, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-800 rounded text-sm">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedEvent.competition_classes?.length > 0 && (
                      <div>
                        <span className="text-gray-400">Event Formats:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedEvent.competition_classes.map((cls, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-800 rounded text-sm">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Admin Actions for Pending Events */}
              {selectedEvent.approval_status === 'pending' && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-electric-500 mb-3">Admin Actions</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Admin Notes (Optional)
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                        placeholder="Add any internal notes..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Rejection Reason (Required for rejection)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                        placeholder="Explain why this event is being rejected..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <ModalFooter className="bg-gray-800/50 px-6 py-4">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDetailModal(false)}
                disabled={isProcessing}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Close
              </Button>
              
              {selectedEvent?.approval_status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedEvent.id)}
                    disabled={isProcessing || !rejectionReason.trim()}
                    leftIcon={<X className="h-4 w-4" />}
                    className="text-red-400 border-red-400 hover:bg-red-400/10"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleApprove(selectedEvent.id)}
                    disabled={isProcessing}
                    loading={isProcessing}
                    leftIcon={<Check className="h-4 w-4" />}
                  >
                    Approve & Create Event
                  </Button>
                </>
              )}
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}