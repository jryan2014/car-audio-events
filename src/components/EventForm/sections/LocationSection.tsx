import React from 'react';
import { MapPin } from 'lucide-react';
import { EventFormData } from '../../../types/event';
import { COUNTRIES, US_STATES } from '../../../types/event';

interface LocationSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const LocationSection: React.FC<LocationSectionProps> = ({
  formData,
  updateField,
  getFieldError,
  touchField
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <MapPin className="h-5 w-5 text-electric-500" />
        <span>Location</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Venue Name */}
        <div className="md:col-span-2">
          <label htmlFor="venue-name" className="block text-gray-400 text-sm mb-2">
            Venue Name *
          </label>
          <input
            id="venue-name"
            name="venue_name"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!getFieldError('venue_name')}
            aria-describedby={getFieldError('venue_name') ? 'venue-error' : undefined}
            value={formData.venue_name}
            onChange={(e) => updateField('venue_name', e.target.value)}
            onBlur={() => touchField('venue_name')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('venue_name') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Convention center, park, venue name, etc."
          />
          {getFieldError('venue_name') && (
            <p id="venue-error" className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('venue_name')}
            </p>
          )}
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country" className="block text-gray-400 text-sm mb-2">
            Country *
          </label>
          <select
            id="country"
            name="country"
            required
            value={formData.country}
            onChange={(e) => updateField('country', e.target.value)}
            onBlur={() => touchField('country')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('country') ? 'border-red-500' : 'border-gray-600'
            }`}
          >
            {COUNTRIES.map(country => (
              <option key={country.code} value={country.code}>{country.name}</option>
            ))}
          </select>
        </div>

        {/* State/Province */}
        <div>
          <label htmlFor="state" className="block text-gray-400 text-sm mb-2">
            State/Province *
          </label>
          {formData.country === 'US' ? (
            <select
              id="state"
              name="state"
              required
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              onBlur={() => touchField('state')}
              className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                getFieldError('state') ? 'border-red-500' : 'border-gray-600'
              }`}
            >
              <option value="">Select a state</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          ) : (
            <input
              id="state"
              name="state"
              type="text"
              required
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              onBlur={() => touchField('state')}
              className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                getFieldError('state') ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="State or Province"
            />
          )}
          {getFieldError('state') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('state')}
            </p>
          )}
        </div>

        {/* City */}
        <div>
          <label htmlFor="city" className="block text-gray-400 text-sm mb-2">
            City *
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!getFieldError('city')}
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            onBlur={() => touchField('city')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('city') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="City name"
          />
          {getFieldError('city') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('city')}
            </p>
          )}
        </div>

        {/* ZIP Code */}
        <div>
          <label htmlFor="zip" className="block text-gray-400 text-sm mb-2">
            ZIP/Postal Code
          </label>
          <input
            id="zip"
            name="zip_code"
            type="text"
            value={formData.zip_code}
            onChange={(e) => updateField('zip_code', e.target.value)}
            onBlur={() => touchField('zip_code')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('zip_code') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="ZIP or postal code"
          />
          {getFieldError('zip_code') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('zip_code')}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-gray-400 text-sm mb-2">
            Address *
          </label>
          <input
            id="address"
            name="address"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!getFieldError('address')}
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            onBlur={() => touchField('address')}
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('address') ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Street address"
          />
          {getFieldError('address') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('address')}
            </p>
          )}
          
          {/* Geocoding Status */}
          {formData.latitude && formData.longitude && (
            <p className="text-xs text-green-400 mt-1">
              📍 Location found: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Manual Coordinates Override */}
        <div className="md:col-span-2 border-t border-gray-600/50 pt-6 mt-2">
          <h3 className="text-lg font-semibold text-white mb-4">
            Location Coordinates (Advanced)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-gray-400 text-sm mb-2">
                Latitude
                <span className="text-gray-500 text-xs block">Decimal degrees (e.g. 40.715432)</span>
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={formData.latitude !== null && formData.latitude !== undefined ? formData.latitude : ''}
                onChange={(e) => updateField('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                onBlur={() => touchField('latitude')}
                className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                  getFieldError('latitude') ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Auto-generated from address"
              />
              {getFieldError('latitude') && (
                <p className="mt-1 text-sm text-red-400" role="alert">
                  {getFieldError('latitude')}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="longitude" className="block text-gray-400 text-sm mb-2">
                Longitude
                <span className="text-gray-500 text-xs block">Decimal degrees (e.g. -88.006928)</span>
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                value={formData.longitude !== null && formData.longitude !== undefined ? formData.longitude : ''}
                onChange={(e) => updateField('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                onBlur={() => touchField('longitude')}
                className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                  getFieldError('longitude') ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Auto-generated from address"
              />
              {getFieldError('longitude') && (
                <p className="mt-1 text-sm text-red-400" role="alert">
                  {getFieldError('longitude')}
                </p>
              )}
            </div>
          </div>
          
          {formData.latitude && formData.longitude && (
            <div className="mt-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${formData.latitude},${formData.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-electric-400 hover:text-electric-300 text-sm underline"
              >
                View on Google Maps ↗
              </a>
            </div>
          )}
          
          <p className="mt-3 text-xs text-gray-500">
            💡 Tip: Coordinates are auto-generated from the address. Only adjust manually if the location is incorrect.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationSection;