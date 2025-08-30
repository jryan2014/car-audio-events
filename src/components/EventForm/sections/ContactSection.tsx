import React, { useEffect } from 'react';
import { User, Mail, Phone, Globe } from 'lucide-react';
import { EventFormData } from '../../../types/event';
import { useAuth } from '../../../contexts/AuthContext';

interface ContactSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const ContactSection: React.FC<ContactSectionProps> = ({
  formData,
  updateField,
  getFieldError,
  touchField
}) => {
  const { user } = useAuth();
  const [eventContacts, setEventContacts] = React.useState<any[]>([]);
  const [generalContacts, setGeneralContacts] = React.useState<any[]>([]);

  // Load saved contacts for dropdowns
  React.useEffect(() => {
    const loadContacts = async () => {
      const { supabase } = await import('../../../lib/supabase');
      
      // Load event director contacts
      const { data: directorData, error: directorError } = await supabase
        .from('event_contacts')
        .select('*')
        .eq('contact_type', 'event_director')
        .order('first_name', { ascending: true });
      
      if (directorError) {
        console.error('Error loading event directors:', directorError);
      } else if (directorData) {
        console.log('Loaded event directors:', directorData.length);
        setEventContacts(directorData);
      }
      
      // Load general contacts
      const { data: generalData, error: generalError } = await supabase
        .from('event_contacts')
        .select('*')
        .eq('contact_type', 'general_contact')
        .order('email', { ascending: true });
      
      if (generalError) {
        console.error('Error loading general contacts:', generalError);
      } else if (generalData) {
        console.log('Loaded general contacts:', generalData.length);
        setGeneralContacts(generalData);
      }
    };
    
    loadContacts();
  }, []);

  // Handle the "use organizer contact" checkbox change - only when checkbox is clicked
  const handleUseOrganizerContactChange = (checked: boolean) => {
    updateField('use_organizer_contact', checked);
    
    if (checked && user) {
      // Split the user's name into first and last
      const nameParts = user.name ? user.name.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Update the form fields with user data
      updateField('event_director_first_name', firstName);
      updateField('event_director_last_name', lastName);
      updateField('event_director_email', user.email || '');
      updateField('event_director_phone', user.phone || '');
    }
    // Don't clear fields when unchecked - preserve existing data
  };

  // Handle selecting from event director dropdown
  const handleEventDirectorSelect = (contactId: string) => {
    const contact = eventContacts.find(c => c.id === contactId);
    if (contact) {
      updateField('event_director_first_name', contact.first_name || '');
      updateField('event_director_last_name', contact.last_name || '');
      updateField('event_director_email', contact.email || '');
      updateField('event_director_phone', contact.phone || '');
      updateField('use_organizer_contact', false);
    }
  };

  // Handle selecting from general contact dropdown
  const handleGeneralContactSelect = (contactId: string) => {
    const contact = generalContacts.find(c => c.id === contactId);
    if (contact) {
      updateField('contact_email', contact.email || '');
      updateField('contact_phone', contact.phone || '');
      // Note: 'website' field in form, but 'website' in contact table
      updateField('website', contact.website || '');
      console.log('Selected contact:', contact);
      console.log('Website value:', contact.website);
    }
  };

  return (
    <>
      {/* Event Director Contact */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <User className="h-5 w-5 text-electric-500" />
          <span>Event Director Contact</span>
        </h2>

        <div className="mb-4 space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.use_organizer_contact}
              onChange={(e) => handleUseOrganizerContactChange(e.target.checked)}
              className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
            />
            <span className="text-gray-400">Use my contact information</span>
          </label>
          
          {/* Dropdown for saved event directors - ALWAYS VISIBLE */}
          {!formData.use_organizer_contact && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Select from previously used event directors:
              </label>
              <select
                onChange={(e) => e.target.value && handleEventDirectorSelect(e.target.value)}
                className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="">-- Select to auto-fill or type new contact below --</option>
                {eventContacts.length > 0 ? (
                  eventContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} - {contact.email} {contact.phone && `(${contact.phone})`}
                    </option>
                  ))
                ) : (
                  <option disabled>Loading contacts...</option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {eventContacts.length} saved event directors available
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="director-fname" className="block text-gray-400 text-sm mb-2">
              First Name
            </label>
            <input
              id="director-fname"
              type="text"
              value={formData.event_director_first_name}
              onChange={(e) => updateField('event_director_first_name', e.target.value)}
              disabled={formData.use_organizer_contact}
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
              placeholder="First name"
            />
          </div>

          <div>
            <label htmlFor="director-lname" className="block text-gray-400 text-sm mb-2">
              Last Name
            </label>
            <input
              id="director-lname"
              type="text"
              value={formData.event_director_last_name}
              onChange={(e) => updateField('event_director_last_name', e.target.value)}
              disabled={formData.use_organizer_contact}
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
              placeholder="Last name"
            />
          </div>

          <div>
            <label htmlFor="director-email" className="block text-gray-400 text-sm mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="director-email"
                type="email"
                value={formData.event_director_email}
                onChange={(e) => updateField('event_director_email', e.target.value)}
                onBlur={() => touchField('event_director_email')}
                disabled={formData.use_organizer_contact}
                className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50 ${
                  getFieldError('event_director_email') ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="director@email.com"
              />
            </div>
            {getFieldError('event_director_email') && (
              <p className="mt-1 text-sm text-red-400" role="alert">
                {getFieldError('event_director_email')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="director-phone" className="block text-gray-400 text-sm mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="director-phone"
                type="tel"
                value={formData.event_director_phone}
                onChange={(e) => updateField('event_director_phone', e.target.value)}
                onBlur={() => touchField('event_director_phone')}
                disabled={formData.use_organizer_contact}
                className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50 ${
                  getFieldError('event_director_phone') ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="(555) 123-4567"
              />
            </div>
            {getFieldError('event_director_phone') && (
              <p className="mt-1 text-sm text-red-400" role="alert">
                {getFieldError('event_director_phone')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* General Contact & Website */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Globe className="h-5 w-5 text-electric-500" />
          <span>General Contact & Website</span>
        </h2>

        {/* Dropdown for saved general contacts - ALWAYS VISIBLE */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">
            Select from previously used general contacts:
          </label>
          <select
            onChange={(e) => e.target.value && handleGeneralContactSelect(e.target.value)}
            className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="">-- Select to auto-fill or type new contact below --</option>
            {generalContacts.length > 0 ? (
              generalContacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.email} {contact.phone && `| ${contact.phone}`} {contact.website && `| ${contact.website}`}
                </option>
              ))
            ) : (
              <option disabled>Loading contacts...</option>
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {generalContacts.length} saved general contacts available
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="contact-email" className="block text-gray-400 text-sm mb-2">
              Contact Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="contact-email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                onBlur={() => touchField('contact_email')}
                className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                  getFieldError('contact_email') ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="info@event.com"
              />
            </div>
            {getFieldError('contact_email') && (
              <p className="mt-1 text-sm text-red-400" role="alert">
                {getFieldError('contact_email')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-phone" className="block text-gray-400 text-sm mb-2">
              Contact Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="contact-phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                onBlur={() => touchField('contact_phone')}
                className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                  getFieldError('contact_phone') ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="(555) 123-4567"
              />
            </div>
            {getFieldError('contact_phone') && (
              <p className="mt-1 text-sm text-red-400" role="alert">
                {getFieldError('contact_phone')}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="website" className="block text-gray-400 text-sm mb-2">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                onFocus={(e) => {
                  // If field is empty, add https:// prefix
                  if (!e.target.value) {
                    updateField('website', 'https://');
                  }
                }}
                onBlur={() => touchField('website')}
                className={`w-full pl-10 pr-4 py-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                  getFieldError('website') ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="https://www.eventwebsite.com"
              />
            </div>
            {getFieldError('website') && (
              <p className="mt-1 text-sm text-red-400" role="alert">
                {getFieldError('website')}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactSection;