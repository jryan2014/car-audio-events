import React from 'react';
import { Trophy } from 'lucide-react';
import { EventFormData, Organization } from '../../../types/event';

interface CompetitionClassesSectionProps {
  formData: EventFormData;
  selectedOrganization: Organization | null | undefined;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
}

const CompetitionClassesSection: React.FC<CompetitionClassesSectionProps> = ({
  formData,
  selectedOrganization,
  updateField
}) => {
  const availableClasses = selectedOrganization?.competition_classes || [];
  const selectedClasses = formData.competition_classes || [];

  const handleClassToggle = (className: string) => {
    const newClasses = selectedClasses.includes(className)
      ? selectedClasses.filter(c => c !== className)
      : [...selectedClasses, className];
    
    updateField('competition_classes', newClasses);
  };

  const handleSelectAll = () => {
    updateField('competition_classes', [...availableClasses]);
  };

  const handleClearAll = () => {
    updateField('competition_classes', []);
  };

  // Helper function to get class color based on type
  const getClassColor = (className: string) => {
    const classLower = className.toLowerCase();
    
    // SPL classes - red variants
    if (classLower.includes('spl') || classLower.includes('sound pressure')) {
      return 'bg-red-500 border-red-400';
    }
    
    // Sound Quality classes - green variants  
    if (classLower.includes('sq') || classLower.includes('sound quality')) {
      return 'bg-green-500 border-green-400';
    }
    
    // Installation classes - green variants
    if (classLower.includes('install') || classLower.includes('installation')) {
      return 'bg-green-700 border-green-600';
    }
    
    // RTA classes - green variants
    if (classLower.includes('rta') || classLower.includes('real time')) {
      return 'bg-green-800 border-green-700';
    }
    
    // Show classes - gray variants
    if (classLower.includes('show') || classLower.includes('shine') || classLower.includes('light')) {
      return 'bg-gray-600 border-gray-500';
    }
    
    // Bass Race - purple
    if (classLower.includes('bass') || classLower.includes('race')) {
      return 'bg-purple-500 border-purple-400';
    }
    
    // Default - blue
    return 'bg-blue-500 border-blue-400';
  };

  if (!selectedOrganization) {
    return null;
  }
  
  if (availableClasses.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-electric-500" />
          <span>Competition Classes</span>
        </h2>
        <p className="text-gray-400">
          The selected organization does not have any competition classes configured.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <Trophy className="h-5 w-5 text-electric-500" />
        <span>Competition Classes</span>
      </h2>

      <p className="text-gray-400 text-sm mb-4">
        Select which competition classes will be offered at this event. Only selected classes will be shown to participants.
      </p>

      <div className="mb-4 flex items-center space-x-3">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-sm text-electric-400 hover:text-electric-300 transition-colors"
        >
          Select All
        </button>
        <span className="text-gray-600">|</span>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-sm text-electric-400 hover:text-electric-300 transition-colors"
        >
          Clear All
        </button>
        <span className="text-gray-600">|</span>
        <span className="text-sm text-gray-400">
          {selectedClasses.length} of {availableClasses.length} selected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {availableClasses.map((className) => {
          const isSelected = selectedClasses.includes(className);
          const colorClass = getClassColor(className);
          
          return (
            <label
              key={className}
              className={`
                flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all
                ${isSelected 
                  ? `${colorClass} bg-opacity-20 border-opacity-60` 
                  : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleClassToggle(className)}
                className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
              />
              <span className={`flex-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                {className}
              </span>
            </label>
          );
        })}
      </div>

      {selectedClasses.length === 0 && (
        <p className="mt-4 text-yellow-400 text-sm">
          ⚠️ No classes selected. The event will not display any competition classes to participants.
        </p>
      )}
    </div>
  );
};

export default CompetitionClassesSection;