import React, { useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { EventFormData, EventScheduleItem } from '../../../types/event';
import { formatTime12Hour } from '../../../utils/dateHelpers';

interface ScheduleSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  formData,
  updateField,
  getFieldError,
  touchField
}) => {
  // Automatically update display_end_date when end_date changes
  useEffect(() => {
    if (formData.end_date) {
      const endDate = new Date(formData.end_date);
      // Add one day to the end date
      endDate.setDate(endDate.getDate() + 1);
      // Format as YYYY-MM-DD for the date input
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const newDisplayEndDate = `${year}-${month}-${day}`;
      
      // Only update if the current display_end_date is different
      if (formData.display_end_date !== newDisplayEndDate) {
        updateField('display_end_date', newDisplayEndDate);
      }
    }
  }, [formData.end_date]);
  const handleScheduleChange = (index: number, field: 'time' | 'activity', value: string) => {
    const newSchedule = [...formData.schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    updateField('schedule', newSchedule);
  };

  const addScheduleItem = () => {
    // Set a default time of 12:00 PM (noon) for new items
    updateField('schedule', [...formData.schedule, { time: '12:00', activity: '' }]);
  };

  const removeScheduleItem = (index: number) => {
    updateField('schedule', formData.schedule.filter((_, i) => i !== index));
  };

  // Calculate event duration
  const getEventDuration = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      
      if (diffDays > 1) {
        return `${diffDays} days (Multi-day event)`;
      } else if (diffHours > 24) {
        return `${diffHours} hours (Single day event)`;
      } else {
        return `${diffHours} hours (Same day event)`;
      }
    }
    return null;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <Clock className="h-5 w-5 text-electric-500" />
        <span>Schedule</span>
      </h2>

      <div className="space-y-6">
        {/* Event Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start-date" className="block text-gray-400 text-sm mb-2">
              Start Date & Time *
            </label>
            <input
              id="start-date"
              name="start_date"
              type="datetime-local"
              required
              aria-required="true"
              aria-invalid={!!getFieldError('start_date')}
              aria-describedby={getFieldError('start_date') ? 'start-date-error' : undefined}
              value={formData.start_date}
              onChange={(e) => updateField('start_date', e.target.value)}
              onBlur={() => touchField('start_date')}
              className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                getFieldError('start_date') ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {getFieldError('start_date') && (
              <p id="start-date-error" className="mt-1 text-sm text-red-400" role="alert">
                {getFieldError('start_date')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="end-date" className="block text-gray-400 text-sm mb-2">
              End Date & Time *
            </label>
            <input
              id="end-date"
              name="end_date"
              type="datetime-local"
              required
              aria-required="true"
              aria-invalid={!!getFieldError('end_date')}
              aria-describedby={getFieldError('end_date') ? 'end-date-error' : undefined}
              value={formData.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
              onBlur={() => touchField('end_date')}
              className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
                getFieldError('end_date') ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {getFieldError('end_date') && (
              <p id="end-date-error" className="mt-1 text-sm text-red-400" role="alert">
                {getFieldError('end_date')}
              </p>
            )}
          </div>
        </div>

        {/* Event Duration Display */}
        {getEventDuration() && (
          <div className="p-3 bg-electric-500/10 border border-electric-500/20 rounded-lg">
            <p className="text-electric-400 text-sm">
              📅 Event Duration: {getEventDuration()}
            </p>
          </div>
        )}

        {/* Registration Deadline */}
        <div>
          <label htmlFor="registration-deadline" className="block text-gray-400 text-sm mb-2">
            Registration Deadline
          </label>
          <input
            id="registration-deadline"
            name="registration_deadline"
            type="datetime-local"
            value={formData.registration_deadline}
            onChange={(e) => updateField('registration_deadline', e.target.value)}
            onBlur={() => touchField('registration_deadline')}
            className={`w-full md:w-1/2 p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('registration_deadline') ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {getFieldError('registration_deadline') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('registration_deadline')}
            </p>
          )}
        </div>

        {/* Display Date Controls */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">🤖 Automated Display Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="display-start" className="block text-gray-400 text-sm mb-2">
                Show on Frontend From
              </label>
              <input
                id="display-start"
                name="display_start_date"
                type="date"
                value={formData.display_start_date}
                onChange={(e) => updateField('display_start_date', e.target.value)}
                className="w-full p-2 bg-gray-600/50 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                title="Auto-calculated: Today's date when event is created"
              />
              <p className="text-xs text-gray-500 mt-1">Auto: Today's date (when created)</p>
            </div>
            <div>
              <label htmlFor="display-end" className="block text-gray-400 text-sm mb-2">
                Hide from Frontend After
              </label>
              <input
                id="display-end"
                name="display_end_date"
                type="date"
                value={formData.display_end_date}
                onChange={(e) => updateField('display_end_date', e.target.value)}
                className="w-full p-2 bg-gray-600/50 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                title="Auto-calculated: 1 day after event ends"
              />
              <p className="text-xs text-gray-500 mt-1">Auto: 1 day after event ends</p>
            </div>
          </div>
          <p className="text-xs text-yellow-400 mt-2">
            ℹ️ Events automatically move to "Past Events" after the display end date
          </p>
        </div>

        {/* Event Schedule */}
        <div className="border-t border-gray-600/30 pt-6">
          <h3 className="text-lg font-semibold text-white mb-3">Event Schedule</h3>
          <div className="space-y-3">
            {formData.schedule.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex flex-col">
                  <input
                    type="time"
                    value={item.time}
                    onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
                    className="w-32 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    aria-label={`Time for schedule item ${index + 1}`}
                  />
                  {item.time && (
                    <span className="text-xs text-electric-400 mt-1">{formatTime12Hour(item.time)}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={item.activity}
                  onChange={(e) => handleScheduleChange(index, 'activity', e.target.value)}
                  className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Activity description"
                  aria-label={`Activity for schedule item ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeScheduleItem(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  aria-label={`Remove schedule item ${index + 1}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addScheduleItem}
              className="text-electric-400 hover:text-electric-300 text-sm transition-colors"
            >
              + Add Schedule Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSection;