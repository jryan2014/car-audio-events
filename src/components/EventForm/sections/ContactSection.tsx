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

  // Handle the "use organizer contact" checkbox change
  useEffect(() => {
    if (formData.use_organizer_contact && user) {
      // Split the user's name into first and last
      const nameParts = user.name ? user.name.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Update the form fields with user data
      updateField('event_director_first_name', firstName);
      updateField('event_director_last_name', lastName);
      updateField('event_director_email', user.email || '');
      updateField('event_director_phone', user.phone || '');
    } else if (!formData.use_organizer_contact) {
      // Clear the fields when unchecked
      updateField('event_director_first_name', '');
      updateField('event_director_last_name', '');
      updateField('event_director_email', '');
      updateField('event_director_phone', '');
    }
  }, [formData.use_organizer_contact, user]);

  return (
    <>
      {/* Event Director Contact */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <User className="h-5 w-5 text-electric-500" />
          <span>Event Director Contact</span>
        </h2>

        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.use_organizer_contact}
              onChange={(e) => updateField('use_organizer_contact', e.target.checked)}
              className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
            />
            <span className="text-gray-400">Use my contact information</span>
          </label>
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