import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AudioComponent {
  id: string;
  category: string;
  brand: string;
  model: string;
  power_watts?: string;
  quantity?: number;
  show_on_diagram?: boolean;
}

interface AudioDiagramSettingsProps {
  audioSystemId: string;
  components: AudioComponent[];
  onUpdate?: () => void;
}

export default function AudioDiagramSettings({ 
  audioSystemId, 
  components: initialComponents, 
  onUpdate 
}: AudioDiagramSettingsProps) {
  const [components, setComponents] = useState<AudioComponent[]>(initialComponents);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setComponents(initialComponents);
  }, [initialComponents]);

  const toggleComponent = (componentId: string) => {
    setComponents(prev => 
      prev.map(comp => 
        comp.id === componentId 
          ? { ...comp, show_on_diagram: !comp.show_on_diagram }
          : comp
      )
    );
  };

  const selectAll = () => {
    setComponents(prev => 
      prev.map(comp => ({ ...comp, show_on_diagram: true }))
    );
  };

  const deselectAll = () => {
    setComponents(prev => 
      prev.map(comp => ({ ...comp, show_on_diagram: false }))
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Create diagram display settings object
      const diagramSettings = components.reduce((acc, comp) => {
        acc[comp.id] = comp.show_on_diagram || false;
        return acc;
      }, {} as Record<string, boolean>);

      // Update the audio system with diagram settings
      const { error } = await supabase
        .from('user_audio_systems')
        .update({ 
          diagram_display_settings: diagramSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', audioSystemId);

      if (error) throw error;

      toast.success('Diagram settings saved successfully');
      if (onUpdate) onUpdate();
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving diagram settings:', error);
      toast.error('Failed to save diagram settings');
    } finally {
      setSaving(false);
    }
  };

  // Group components by category
  const groupedComponents = components.reduce((acc, comp) => {
    const category = comp.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(comp);
    return acc;
  }, {} as Record<string, AudioComponent[]>);

  return (
    <>
      {/* Settings button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span>Diagram Settings</span>
      </button>

      {/* Settings modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                Select Components for Diagram Display
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              {/* Select all/none buttons */}
              <div className="flex space-x-3 mb-6">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                >
                  Deselect All
                </button>
              </div>

              {/* Components list */}
              <div className="space-y-6">
                {Object.entries(groupedComponents).map(([category, categoryComponents]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryComponents.map(component => (
                        <div
                          key={component.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            component.show_on_diagram
                              ? 'bg-blue-900/30 border-blue-500'
                              : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
                          }`}
                          onClick={() => toggleComponent(component.id)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {component.show_on_diagram ? (
                                <Eye className="h-5 w-5 text-blue-400" />
                              ) : (
                                <EyeOff className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">
                                {component.brand} {component.model}
                              </div>
                              <div className="text-sm text-gray-400">
                                {component.power_watts && `${component.power_watts}W`}
                                {component.quantity && component.quantity > 1 && ` • Qty: ${component.quantity}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={component.show_on_diagram || false}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleComponent(component.id);
                              }}
                              className="h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {components.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No components found in your audio system.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                {components.filter(c => c.show_on_diagram).length} of {components.length} components selected
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}