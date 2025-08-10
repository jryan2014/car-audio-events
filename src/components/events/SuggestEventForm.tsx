import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, MapPin, User, Phone, Mail, Globe, DollarSign, Trophy, FileText, Send, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Alert } from '../ui/Alert';

interface SuggestEventFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface EventSuggestion {
  suggested_by_email: string;
  suggested_by_name?: string;
  event_name: string;
  venue_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code?: string;
  country: string;
  start_date: string;
  end_date: string;
  sanctioning_bodies?: string[];
  event_director_name?: string;
  event_director_email?: string;
  event_director_phone?: string;
  event_website?: string;
  event_description?: string;
  registration_link?: string;
  entry_fee?: number;
  spectator_fee?: number;
  event_formats?: string[];
  schedule_info?: string;
  notes?: string;
}

const SANCTIONING_BODIES = [
  'IASCA',
  'MECA',
  'DB Drag',
  'USACI',
  'Bass Wars',
  'Outlaw SPL',
  'NSPL',
  'SBN',
  'Independent/None'
];

const EVENT_FORMATS = [
  'SPL Competition',
  'SQ Competition',
  'Show & Shine',
  'Demo/Exhibition',
  'Install Bay',
  'Retailer Event',
  'Manufacturer Event',
  'Car Show',
  'Music Festival'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function SuggestEventForm({ onSuccess, onCancel }: SuggestEventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventSuggestion>({
    suggested_by_email: '',
    suggested_by_name: '',
    event_name: '',
    venue_name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    start_date: '',
    end_date: '',
    sanctioning_bodies: [],
    event_director_name: '',
    event_director_email: '',
    event_director_phone: '',
    event_website: '',
    event_description: '',
    registration_link: '',
    entry_fee: undefined,
    spectator_fee: undefined,
    event_formats: [],
    schedule_info: '',
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'entry_fee' || name === 'spectator_fee') {
      setFormData(prev => ({
        ...prev,
        [name]: value ? parseFloat(value) : undefined
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCheckboxChange = (field: 'sanctioning_bodies' | 'event_formats', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [field]: newValues
      };
    });
  };

  const validateForm = (): string | null => {
    // Check required fields
    if (!formData.suggested_by_email) return 'Your email is required';
    if (!formData.event_name) return 'Event name is required';
    if (!formData.venue_name) return 'Venue name is required';
    if (!formData.street_address) return 'Street address is required';
    if (!formData.city) return 'City is required';
    if (!formData.state) return 'State is required';
    if (!formData.start_date) return 'Start date is required';
    if (!formData.end_date) return 'End date is required';
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.suggested_by_email)) {
      return 'Please enter a valid email address';
    }
    
    // Validate dates
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      return 'End date cannot be before start date';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create event directly in the events table with pending_approval status
      // Only include fields that actually exist in the events table
      const eventData: any = {
        // Required fields
        title: formData.event_name,
        category: 'Competition',
        start_date: new Date(formData.start_date).toISOString(),
        
        // Optional fields
        description: formData.event_description || null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        venue_name: formData.venue_name || null,
        address: formData.street_address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        country: formData.country || null,
        status: 'pending_approval',
        approval_status: 'pending',
        ticket_price: formData.entry_fee || 0,
        gate_fee: formData.spectator_fee || null,
        external_registration_url: formData.registration_link || null,
        website_url: formData.event_website || null,
        contact_email: formData.suggested_by_email || null,
        contact_phone: formData.event_director_phone || null,
        event_director_first_name: formData.event_director_name ? formData.event_director_name.split(' ')[0] : null,
        event_director_last_name: formData.event_director_name ? formData.event_director_name.split(' ').slice(1).join(' ') || null : null,
        event_director_email: formData.event_director_email || null,
        event_director_phone: formData.event_director_phone || null,
        rules: formData.schedule_info || null,
        seo_description: formData.notes || null,
        is_public: false,
        is_active: false,
        allows_online_registration: !!formData.registration_link,
        seo_title: `Suggested by: ${formData.suggested_by_name || formData.suggested_by_email}`,
      };

      // Handle arrays properly - they might need to be JSON strings or PostgreSQL arrays
      if (formData.sanctioning_bodies && formData.sanctioning_bodies.length > 0) {
        eventData.competition_categories = formData.sanctioning_bodies;
      }
      if (formData.event_formats && formData.event_formats.length > 0) {
        eventData.competition_classes = formData.event_formats;
      }
      
      // For seo_keywords, it's JSONB so needs to be an array
      eventData.seo_keywords = ['user_suggested', 'pending_review'];
      
      console.log('Submitting event data:', eventData);
      
      const { error: submitError } = await supabase
        .from('events')
        .insert([eventData]);
      
      if (submitError) {
        console.error('Supabase error details:', submitError);
        throw submitError;
      }
      
      // Success!
      if (onSuccess) {
        onSuccess();
      } else {
        // Show success message
        alert('Thank you for suggesting an event! We will review it and add it to our calendar if approved.');
        // Reset form
        setFormData({
          suggested_by_email: '',
          suggested_by_name: '',
          event_name: '',
          venue_name: '',
          street_address: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'USA',
          start_date: '',
          end_date: '',
          sanctioning_bodies: [],
          event_director_name: '',
          event_director_email: '',
          event_director_phone: '',
          event_website: '',
          event_description: '',
          registration_link: '',
          entry_fee: undefined,
          spectator_fee: undefined,
          event_formats: [],
          schedule_info: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Error submitting event suggestion:', err);
      setError('Failed to submit event suggestion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Suggest an Event</CardTitle>
          <CardDescription className="text-gray-400">
            Know about an upcoming car audio event? Help the community by suggesting it here.
            Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Your Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-electric-500" />
                Your Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Email *
                  </label>
                  <Input
                    type="email"
                    name="suggested_by_email"
                    value={formData.suggested_by_email}
                    onChange={handleInputChange}
                    icon={<Mail className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name
                  </label>
                  <Input
                    type="text"
                    name="suggested_by_name"
                    value={formData.suggested_by_name}
                    onChange={handleInputChange}
                    icon={<User className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
            
            {/* Event Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-electric-500" />
                Event Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Name *
                  </label>
                  <Input
                    type="text"
                    name="event_name"
                    value={formData.event_name}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <Input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      icon={<Calendar className="h-4 w-4" />}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Date *
                    </label>
                    <Input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      min={formData.start_date}
                      icon={<Calendar className="h-4 w-4" />}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Description
                  </label>
                  <textarea
                    name="event_description"
                    value={formData.event_description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                    placeholder="Provide details about the event..."
                  />
                </div>
              </div>
            </div>
            
            {/* Venue Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-electric-500" />
                Venue Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Venue Name *
                  </label>
                  <Input
                    type="text"
                    name="venue_name"
                    value={formData.venue_name}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address *
                  </label>
                  <Input
                    type="text"
                    name="street_address"
                    value={formData.street_address}
                    onChange={handleInputChange}
                    icon={<MapPin className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City *
                    </label>
                    <Input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                      required
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ZIP Code
                    </label>
                    <Input
                      type="text"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Event Director Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Event Director Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Director Name
                  </label>
                  <Input
                    type="text"
                    name="event_director_name"
                    value={formData.event_director_name}
                    onChange={handleInputChange}
                    icon={<User className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Director Email
                  </label>
                  <Input
                    type="email"
                    name="event_director_email"
                    value={formData.event_director_email}
                    onChange={handleInputChange}
                    icon={<Mail className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Director Phone
                  </label>
                  <Input
                    type="tel"
                    name="event_director_phone"
                    value={formData.event_director_phone}
                    onChange={handleInputChange}
                    icon={<Phone className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Website
                  </label>
                  <Input
                    type="url"
                    name="event_website"
                    value={formData.event_website}
                    onChange={handleInputChange}
                    icon={<Globe className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>
            
            {/* Event Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Event Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Registration Link
                  </label>
                  <Input
                    type="url"
                    name="registration_link"
                    value={formData.registration_link}
                    onChange={handleInputChange}
                    icon={<Globe className="h-4 w-4" />}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="https://"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Entry Fee
                    </label>
                    <Input
                      type="number"
                      name="entry_fee"
                      value={formData.entry_fee || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      icon={<DollarSign className="h-4 w-4" />}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Spectator Fee
                    </label>
                    <Input
                      type="number"
                      name="spectator_fee"
                      value={formData.spectator_fee || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      icon={<DollarSign className="h-4 w-4" />}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Trophy className="inline h-4 w-4 mr-1 text-electric-500" />
                  Sanctioning Bodies
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SANCTIONING_BODIES.map(body => (
                    <label key={body} className="flex items-center space-x-2 text-gray-300 hover:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sanctioning_bodies?.includes(body) || false}
                        onChange={() => handleCheckboxChange('sanctioning_bodies', body)}
                        className="rounded border-gray-600 bg-gray-800 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-sm">{body}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Formats
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EVENT_FORMATS.map(format => (
                    <label key={format} className="flex items-center space-x-2 text-gray-300 hover:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.event_formats?.includes(format) || false}
                        onChange={() => handleCheckboxChange('event_formats', format)}
                        className="rounded border-gray-600 bg-gray-800 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-sm">{format}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Schedule Information
                </label>
                <textarea
                  name="schedule_info"
                  value={formData.schedule_info}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                  placeholder="Registration at 9am, competition starts at 10am..."
                />
              </div>
            </div>
            
            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                placeholder="Any other information that might be helpful..."
              />
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            leftIcon={<Send className="h-4 w-4" />}
            className="bg-electric-500 hover:bg-electric-600 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Event Suggestion'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}