import React from 'react';
import { useNavigate } from 'react-router-dom';
import SuggestEventForm from '../components/events/SuggestEventForm';
import { ChevronLeft } from 'lucide-react';

export default function SuggestEvent() {
  const navigate = useNavigate();
  
  const handleSuccess = () => {
    // Show success message and redirect to events page
    navigate('/events?suggested=true');
  };
  
  const handleCancel = () => {
    navigate('/events');
  };
  
  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        <button
          onClick={() => navigate('/events')}
          className="mb-6 flex items-center text-electric-500 hover:text-electric-400 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Events
        </button>
        
        <SuggestEventForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}