import React, { useState } from 'react';
import { Car, Truck, Volume2, Settings, Zap, Plus, Trash2, Save } from 'lucide-react';
import SEO from '../components/SEO';
import VehicleAudioDiagram, { AudioSystemData, VehicleType, AudioComponent } from '../components/VehicleAudioDiagram';

const AudioSystemDesigner: React.FC = () => {
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('sedan');
  const [audioSystem, setAudioSystem] = useState<AudioSystemData>({
    vehicleType: 'sedan',
    totalPower: 2400,
    description: 'Custom competition audio system',
    components: [
      {
        id: 'head-unit-1',
        type: 'head_unit',
        name: 'Pioneer DEH-80PRS',
        location: { x: 25, y: 70 },
        brand: 'Pioneer',
        model: 'DEH-80PRS'
      },
      {
        id: 'amp-1',
        type: 'amplifier',
        name: 'Main Amplifier',
        location: { x: 80, y: 30 },
        power: 2000,
        brand: 'Rockford Fosgate',
        model: 'T2500-1bdCP'
      },
      {
        id: 'sub-1',
        type: 'subwoofer',
        name: '15" Competition Sub',
        location: { x: 75, y: 60 },
        power: 1500,
        brand: 'JL Audio',
        model: 'W7 15"'
      }
    ]
  });

  // Predefined audio system templates
  const systemTemplates = {
    budget: {
      name: 'Budget System',
      totalPower: 600,
      description: 'Affordable audio upgrade with quality components',
      components: [
        {
          id: 'head-unit-budget',
          type: 'head_unit' as const,
          name: 'Kenwood KDC-BT378U',
          location: { x: 25, y: 70 },
          brand: 'Kenwood',
          model: 'KDC-BT378U'
        },
        {
          id: 'amp-budget',
          type: 'amplifier' as const,
          name: 'Budget Amplifier',
          location: { x: 80, y: 40 },
          power: 400,
          brand: 'Pioneer',
          model: 'GM-A3702'
        },
        {
          id: 'sub-budget',
          type: 'subwoofer' as const,
          name: '10" Subwoofer',
          location: { x: 75, y: 65 },
          power: 300,
          brand: 'Pioneer',
          model: 'TS-W261D4'
        }
      ]
    },
    competition: {
      name: 'Competition System',
      totalPower: 5000,
      description: 'High-end competition setup for maximum SPL',
      components: [
        {
          id: 'head-unit-comp',
          type: 'head_unit' as const,
          name: 'Alpine CDA-117Ri',
          location: { x: 25, y: 70 },
          brand: 'Alpine',
          model: 'CDA-117Ri'
        },
        {
          id: 'amp-main-comp',
          type: 'amplifier' as const,
          name: 'Main Competition Amp',
          location: { x: 80, y: 25 },
          power: 3000,
          brand: 'Sundown Audio',
          model: 'SCV-3000D'
        },
        {
          id: 'amp-sec-comp',
          type: 'amplifier' as const,
          name: 'Secondary Amp',
          location: { x: 85, y: 45 },
          power: 2000,
          brand: 'Rockford Fosgate',
          model: 'T2500-1bdCP'
        },
        {
          id: 'sub-comp-1',
          type: 'subwoofer' as const,
          name: '18" Competition Sub #1',
          location: { x: 70, y: 55 },
          power: 2000,
          brand: 'Fi Car Audio',
          model: 'BTL 18"'
        },
        {
          id: 'sub-comp-2',
          type: 'subwoofer' as const,
          name: '18" Competition Sub #2',
          location: { x: 80, y: 65 },
          power: 2000,
          brand: 'Fi Car Audio',
          model: 'BTL 18"'
        },
        {
          id: 'battery-main-comp',
          type: 'battery' as const,
          name: 'Main Battery',
          location: { x: 15, y: 25 },
          brand: 'Optima',
          model: 'RedTop'
        },
        {
          id: 'battery-aux1-comp',
          type: 'battery' as const,
          name: 'Aux Battery #1',
          location: { x: 85, y: 15 },
          brand: 'XS Power',
          model: 'D3400'
        },
        {
          id: 'battery-aux2-comp',
          type: 'battery' as const,
          name: 'Aux Battery #2',
          location: { x: 90, y: 35 },
          brand: 'XS Power',
          model: 'D3400'
        },
        {
          id: 'alternator-comp',
          type: 'alternator' as const,
          name: 'HO Alternator',
          location: { x: 20, y: 15 },
          power: 300,
          brand: 'Mechman',
          model: '370A'
        },
        {
          id: 'capacitor-comp',
          type: 'capacitor' as const,
          name: 'Power Capacitor',
          location: { x: 70, y: 25 },
          brand: 'Rockford Fosgate',
          model: 'RFC35'
        }
      ]
    },
    sq: {
      name: 'Sound Quality System',
      totalPower: 1200,
      description: 'Audiophile-grade system focused on sound quality',
      components: [
        {
          id: 'head-unit-sq',
          type: 'head_unit' as const,
          name: 'McIntosh MX406',
          location: { x: 25, y: 70 },
          brand: 'McIntosh',
          model: 'MX406'
        },
        {
          id: 'dsp-sq',
          type: 'dsp' as const,
          name: 'Audio Processor',
          location: { x: 35, y: 60 },
          brand: 'Helix',
          model: 'DSP.3'
        },
        {
          id: 'amp-sq-front',
          type: 'amplifier' as const,
          name: 'Front Stage Amp',
          location: { x: 70, y: 30 },
          power: 400,
          brand: 'Arc Audio',
          model: 'XDi 1000.4'
        },
        {
          id: 'amp-sq-sub',
          type: 'amplifier' as const,
          name: 'Subwoofer Amp',
          location: { x: 80, y: 45 },
          power: 800,
          brand: 'JL Audio',
          model: 'JX1000/1D'
        },
        {
          id: 'speaker-sq-fl',
          type: 'component_speaker' as const,
          name: 'Front Left',
          location: { x: 15, y: 50 },
          power: 100,
          brand: 'Focal',
          model: 'Utopia M 3WM'
        },
        {
          id: 'speaker-sq-fr',
          type: 'component_speaker' as const,
          name: 'Front Right',
          location: { x: 35, y: 50 },
          power: 100,
          brand: 'Focal',
          model: 'Utopia M 3WM'
        },
        {
          id: 'tweeter-sq-fl',
          type: 'tweeter' as const,
          name: 'Left A-Pillar',
          location: { x: 18, y: 35 },
          power: 50,
          brand: 'Focal',
          model: 'TN52'
        },
        {
          id: 'tweeter-sq-fr',
          type: 'tweeter' as const,
          name: 'Right A-Pillar',
          location: { x: 32, y: 35 },
          power: 50,
          brand: 'Focal',
          model: 'TN52'
        },
        {
          id: 'sub-sq',
          type: 'subwoofer' as const,
          name: '12" SQ Subwoofer',
          location: { x: 75, y: 60 },
          power: 600,
          brand: 'JL Audio',
          model: '12W6v3-D4'
        }
      ]
    }
  };

  const vehicleTypes: { type: VehicleType; name: string; icon: React.ComponentType<any> }[] = [
    { type: 'sedan', name: 'Sedan', icon: Car },
    { type: 'suv', name: 'SUV', icon: Car },
    { type: 'truck', name: 'Truck', icon: Truck },
    { type: 'van', name: 'Van', icon: Car }
  ];

  const handleVehicleTypeChange = (type: VehicleType) => {
    setSelectedVehicleType(type);
    setAudioSystem(prev => ({
      ...prev,
      vehicleType: type
    }));
  };

  const loadTemplate = (templateKey: keyof typeof systemTemplates) => {
    const template = systemTemplates[templateKey];
    setAudioSystem({
      vehicleType: selectedVehicleType,
      totalPower: template.totalPower,
      description: template.description,
      components: template.components
    });
  };

  const calculateTotalPower = () => {
    return audioSystem.components
      .filter(comp => comp.power)
      .reduce((total, comp) => total + (comp.power || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black py-8">
      <SEO 
        title="Audio System Designer - Car Audio Events"
        description="Design and visualize your car audio system layout. Interactive tool for planning component placement in sedans, trucks, SUVs, and vans."
        keywords="audio system designer, car audio layout, component placement, audio system planner, car audio design tool"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-electric-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Audio System Designer
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Plan and visualize your car audio system layout. Choose your vehicle type, select from templates, 
            or customize your own setup with interactive component placement.
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Vehicle Type Selection */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Car className="h-5 w-5 text-electric-400 mr-2" />
              Vehicle Type
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {vehicleTypes.map(({ type, name, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => handleVehicleTypeChange(type)}
                  className={`p-3 rounded-lg border transition-all duration-200 flex items-center justify-center space-x-2 ${
                    selectedVehicleType === type
                      ? 'bg-electric-500/20 border-electric-500 text-electric-400'
                      : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* System Templates */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Settings className="h-5 w-5 text-purple-400 mr-2" />
              System Templates
            </h3>
            <div className="space-y-2">
              {Object.entries(systemTemplates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => loadTemplate(key as keyof typeof systemTemplates)}
                  className="w-full p-3 rounded-lg bg-gray-800/50 border border-gray-600 text-left transition-all duration-200 hover:border-gray-500 hover:bg-gray-800/70"
                >
                  <div className="text-sm font-medium text-white">{template.name}</div>
                  <div className="text-xs text-gray-400">{template.totalPower}W • {template.components.length} components</div>
                </button>
              ))}
            </div>
          </div>

          {/* System Stats */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Zap className="h-5 w-5 text-orange-400 mr-2" />
              System Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Components:</span>
                <span className="text-white font-semibold">{audioSystem.components.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Power:</span>
                <span className="text-electric-400 font-semibold">{calculateTotalPower()}W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vehicle:</span>
                <span className="text-white font-semibold capitalize">{audioSystem.vehicleType}</span>
              </div>
              <div className="pt-2 border-t border-gray-600">
                <div className="text-xs text-gray-400">
                  Estimated Current Draw: {Math.round(calculateTotalPower() / 12)}A
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Diagram */}
        <VehicleAudioDiagram
          audioSystem={audioSystem}
          interactive={true}
          showComponentDetails={true}
          className="mb-8"
        />

        {/* Component Library */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Volume2 className="h-5 w-5 text-green-400 mr-2" />
            Component Library
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries({
              'Head Unit': 'Complete control center for your audio system',
              'Amplifiers': 'Power your speakers and subwoofers',
              'Subwoofers': 'Deep bass reproduction for impact',
              'Speakers': 'Full range sound reproduction',
              'Tweeters': 'High frequency detail and clarity',
              'DSP': 'Digital signal processing for tuning',
              'Batteries': 'Power storage for high demand systems',
              'Capacitors': 'Power delivery assistance'
            }).map(([component, description]) => (
              <div key={component} className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-1">{component}</h4>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Installation Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-xl border border-blue-700/50 p-6">
            <h4 className="font-semibold text-blue-400 mb-3">Planning Tips</h4>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Plan power requirements before purchasing</li>
              <li>• Consider weight distribution and balance</li>
              <li>• Measure available space accurately</li>
              <li>• Research competition class requirements</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 rounded-xl border border-purple-700/50 p-6">
            <h4 className="font-semibold text-purple-400 mb-3">Installation</h4>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Use proper gauge wire for power runs</li>
              <li>• Fuse all power connections appropriately</li>
              <li>• Keep signal cables away from power cables</li>
              <li>• Secure all components against vibration</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 rounded-xl border border-orange-700/50 p-6">
            <h4 className="font-semibold text-orange-400 mb-3">Competition</h4>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Check organization rules for modifications</li>
              <li>• Plan for easy meter access</li>
              <li>• Consider safety requirements</li>
              <li>• Optimize for your competition class</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioSystemDesigner;