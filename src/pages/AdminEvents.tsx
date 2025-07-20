import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Eye, Check, X, Edit, Trash2, MapPin, Users, Clock, DollarSign, Plus, AlertCircle, Globe, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AddCoordinatesModal from '../components/AddCoordinatesModal';
import WebScraperModal from '../components/WebScraperModal';
import { scrollToRef, useAutoScrollToForm, useAutoFocusFirstInput } from '../utils/focusUtils';
import { ActivityLogger } from '../utils/activityLogger';
import { parseLocalDate } from '../utils/dateHelpers';

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  city: string;
  state: string;
  country: string;
  registration_fee: number;
  max_participants?: number;
  current_participants: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'cancelled' | 'completed';
  approval_status: 'pending' | 'approved' | 'rejected';
  organizer_name: string;
  organizer_email: string;
  category_name: string;
  organization_name?: string;
  organization_id?: string;
  created_at: string;
  rejection_reason?: string;
}

export default function AdminEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedApproval, setSelectedApproval] = useState('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCoordinatesModal, setShowCoordinatesModal] = useState(false);
  const [showWebScraperModal, setShowWebScraperModal] = useState(false);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/\" replace />;
  }

  useEffect(() => {
    loadEvents();
    // Log access to Event Management
    ActivityLogger.eventManagementAccess();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, selectedStatus, selectedApproval, selectedTimeFilter, selectedOrganization, selectedLocation]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_categories(name),
          users:organizer_id(name, email),
          organizations:organization_id(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
        throw error;
      }
      
      console.log('Loaded events:', data?.length || 0, 'events');

      const formattedEvents = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start_date: event.start_date,
        end_date: event.end_date,
        venue_name: event.venue_name,
        city: event.city,
        state: event.state,
        country: event.country,
        registration_fee: event.ticket_price || event.registration_fee || 0,
        max_participants: event.max_participants,
        current_participants: event.current_participants || 0,
        status: event.status,
        approval_status: event.approval_status || 'pending',
        organizer_name: event.users?.name || 'Unknown',
        organizer_email: event.users?.email || '',
        category_name: event.event_categories?.name || 'Uncategorized',
        organization_name: event.organizations?.name || null,
        organization_id: event.organization_id || null,
        created_at: event.created_at,
        rejection_reason: event.rejection_reason
      }));

      setEvents(formattedEvents);
      
      // Extract unique organizations that are actually used in events
      const uniqueOrgs = new Map();
      formattedEvents.forEach(event => {
        if (event.organization_id && event.organization_name) {
          uniqueOrgs.set(event.organization_id, event.organization_name);
        }
      });
      setOrganizations(Array.from(uniqueOrgs, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
      
      // Extract unique locations (city, state combinations)
      const uniqueLocations = new Set<string>();
      formattedEvents.forEach(event => {
        if (event.city && event.state) {
          uniqueLocations.add(`${event.city}, ${event.state}`);
        }
      });
      setLocations(Array.from(uniqueLocations).sort());
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.organizer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || event.status === selectedStatus;
      const matchesApproval = selectedApproval === 'all' || 
                             (selectedApproval === 'approved' && (event.approval_status === 'approved' || event.status === 'published')) ||
                             (selectedApproval !== 'approved' && event.approval_status === selectedApproval);
      
      // Time filter
      const now = new Date();
      let matchesTime = true;
      if (selectedTimeFilter === 'past') {
        matchesTime = parseLocalDate(event.end_date) < now;
      } else if (selectedTimeFilter === 'future') {
        matchesTime = parseLocalDate(event.start_date) > now;
      } else if (selectedTimeFilter === 'ongoing') {
        matchesTime = parseLocalDate(event.start_date) <= now && parseLocalDate(event.end_date) >= now;
      }
      
      // Organization filter
      const matchesOrganization = selectedOrganization === 'all' || 
                                 event.organization_id === Number(selectedOrganization);
      
      // Location filter
      const matchesLocation = selectedLocation === 'all' || 
                             `${event.city}, ${event.state}` === selectedLocation;
      
      return matchesSearch && matchesStatus && matchesApproval && matchesTime && matchesOrganization && matchesLocation;
    });

    setFilteredEvents(filtered);
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      console.log('🚀 Attempting to approve event:', eventId);
      
      // Get event details for logging
      const event = events.find(e => e.id === eventId);
      const eventTitle = event?.title || 'Unknown Event';
      const organizerEmail = event?.organizer_email || 'unknown@example.com';
      
      const { data, error } = await supabase
        .from('events')
        .update({ 
          approval_status: 'approved',
          status: 'published'
        })
        .eq('id', eventId)
        .select();

      if (error) {
        console.error('❌ Error approving event:', error);
        alert(`Error approving event: ${error.message}`);
        return;
      }

      console.log('✅ Event approved successfully:', data);
      
      // Log the event approval
      try {
        await ActivityLogger.eventApproved(eventTitle, organizerEmail);
      } catch (logError) {
        console.warn('Failed to log event approval:', logError);
      }
      
      alert('Event approved and published successfully!');
      await loadEvents();
    } catch (error) {
      console.error('💥 Exception approving event:', error);
      alert(`Failed to approve event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRejectEvent = async () => {
    if (!selectedEvent || !rejectionReason.trim()) return;

    try {
      console.log('🚀 Attempting to reject event:', selectedEvent.id);
      
      const { data, error } = await supabase
        .from('events')
        .update({ 
          approval_status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', selectedEvent.id)
        .select();

      if (error) {
        console.error('❌ Error rejecting event:', error);
        alert(`Error rejecting event: ${error.message}`);
        return;
      }

      console.log('✅ Event rejected successfully:', data);
      
      // Log the event rejection
      try {
        await ActivityLogger.eventRejected(selectedEvent.title, selectedEvent.organizer_email, rejectionReason);
      } catch (logError) {
        console.warn('Failed to log event rejection:', logError);
      }
      
      alert('Event rejected successfully!');
      await loadEvents();
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedEvent(null);
    } catch (error) {
      console.error('💥 Exception rejecting event:', error);
      alert(`Failed to reject event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      // Get event details for logging
      const event = events.find(e => e.id === eventId);
      const eventTitle = event?.title || 'Unknown Event';
      const organizerEmail = event?.organizer_email || 'unknown@example.com';
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Log the event deletion
      try {
        await ActivityLogger.eventDeleted(eventTitle, organizerEmail);
      } catch (logError) {
        console.warn('Failed to log event deletion:', logError);
      }

      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      pending_approval: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      published: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getApprovalBadge = (approval: string) => {
    // Handle null/undefined approval status
    const safeApproval = approval || 'pending';
    
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      approved: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400'
    };

    const icons = {
      pending: Clock,
      approved: Check,
      rejected: X
    };

    const Icon = icons[safeApproval as keyof typeof icons] || Clock;

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${styles[safeApproval as keyof typeof styles] || styles.pending}`}>
        <Icon className="h-3 w-3" />
        <span>{safeApproval.toUpperCase()}</span>
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Event Management</h1>
              <p className="text-gray-400">Review and manage all events on the platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/create-event"
              className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Create Event</span>
            </Link>
            <button
              onClick={() => setShowCoordinatesModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-all duration-200 flex items-center space-x-2"
            >
              <MapPin className="h-4 w-4" />
              <span>Bulk Coordinates</span>
            </button>
            <button
              onClick={() => setShowWebScraperModal(true)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Globe className="h-4 w-4" />
              <span>Web Scraper</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Approval Filter */}
            <div className="relative">
              <select
                value={selectedApproval}
                onChange={(e) => setSelectedApproval(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Approval Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Time Filter */}
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedTimeFilter}
                onChange={(e) => setSelectedTimeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Events</option>
                <option value="past">Past Events</option>
                <option value="ongoing">Ongoing Events</option>
                <option value="future">Future Events</option>
              </select>
            </div>

            {/* Organization Filter */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Organizations</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Events</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{events.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-electric-500" />
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Approval</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{events.filter(e => e.approval_status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Published/Approved</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">{events.filter(e => e.status === 'published' || e.approval_status === 'approved').length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Rejected</p>
                <p className="text-xl sm:text-2xl font-bold text-red-400">{events.filter(e => e.approval_status === 'rejected').length}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Organizer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Approval</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-electric-500"></div>
                        <span>Loading events...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      No events found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{event.title}</div>
                          <div className="text-gray-400 text-sm">{event.category_name}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <DollarSign className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-500 text-xs">${event.registration_fee}</span>
                            <Users className="h-3 w-3 text-gray-500 ml-2" />
                            <span className="text-gray-500 text-xs">
                              {event.current_participants}{event.max_participants ? `/${event.max_participants}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{event.organizer_name}</div>
                          <div className="text-gray-400 text-sm">{event.organizer_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white text-sm">
                          {formatDate(event.start_date)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          to {formatDate(event.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1 text-gray-300 text-sm">
                          <MapPin className="h-4 w-4 text-electric-500" />
                          <span>{event.city}, {event.state}</span>
                        </div>
                        <div className="text-gray-400 text-xs">{event.venue_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(event.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getApprovalBadge(event.approval_status)}
                        {event.rejection_reason && (
                          <div className="text-red-400 text-xs mt-1\" title={event.rejection_reason}>
                            Reason: {event.rejection_reason.substring(0, 30)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowEventModal(true);
                            }}
                            className="text-electric-400 hover:text-electric-300 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {event.approval_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveEvent(event.id)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                title="Approve Event"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setShowRejectModal(true);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Reject Event"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          
                          <Link
                            to={`/events/${event.id}/edit`}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Edit Event"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-sm sm:max-w-2xl lg:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Event Details</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-semibold mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-400">Title:</span> <span className="text-white">{selectedEvent.title}</span></div>
                    <div><span className="text-gray-400">Category:</span> <span className="text-white">{selectedEvent.category_name}</span></div>
                    <div><span className="text-gray-400">Organizer:</span> <span className="text-white">{selectedEvent.organizer_name}</span></div>
                    <div><span className="text-gray-400">Email:</span> <span className="text-white">{selectedEvent.organizer_email}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Event Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-400">Start:</span> <span className="text-white">{formatDate(selectedEvent.start_date)}</span></div>
                    <div><span className="text-gray-400">End:</span> <span className="text-white">{formatDate(selectedEvent.end_date)}</span></div>
                    <div><span className="text-gray-400">Fee:</span> <span className="text-white">${selectedEvent.registration_fee}</span></div>
                    <div><span className="text-gray-400">Participants:</span> <span className="text-white">{selectedEvent.current_participants}{selectedEvent.max_participants ? `/${selectedEvent.max_participants}` : ''}</span></div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-white font-semibold mb-2">Description</h4>
                <p className="text-gray-300 text-sm">{selectedEvent.description}</p>
              </div>
              <div className="mt-6">
                <h4 className="text-white font-semibold mb-2">Location</h4>
                <p className="text-gray-300 text-sm">{selectedEvent.venue_name}, {selectedEvent.city}, {selectedEvent.state}, {selectedEvent.country}</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <Link
                to={`/events/${selectedEvent.id}/edit`}
                className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
              >
                Edit Event
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Reject Event</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                Please provide a reason for rejecting "{selectedEvent.title}":
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                rows={4}
                placeholder="Enter rejection reason..."
              />
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectEvent}
                disabled={!rejectionReason.trim()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Coordinates Modal */}
      <AddCoordinatesModal
        isOpen={showCoordinatesModal}
        onClose={() => setShowCoordinatesModal(false)}
        onSuccess={loadEvents}
        eventId=""
        eventTitle="Bulk Coordinates Update"
        eventCity=""
        eventState=""
      />

      {/* Web Scraper Modal */}
      <WebScraperModal
        isOpen={showWebScraperModal}
        onClose={() => setShowWebScraperModal(false)}
        onEventsImported={loadEvents}
      />
    </div>
  );
}