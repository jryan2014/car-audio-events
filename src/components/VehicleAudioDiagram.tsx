import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Zap, Speaker, Car, Truck, Settings } from 'lucide-react';

// Vehicle type definitions
export type VehicleType = 'sedan' | 'truck' | 'suv' | 'van';

// Audio component definitions
export interface AudioComponent {
  id: string;
  type: 'head_unit' | 'amplifier' | 'subwoofer' | 'component_speaker' | 'tweeter' | 'battery' | 'alternator' | 'capacitor' | 'dsp';
  name: string;
  location: {
    x: number; // Percentage from left
    y: number; // Percentage from top
  };
  power?: number; // Watts
  brand?: string;
  model?: string;
}

export interface AudioSystemData {
  vehicleType: VehicleType;
  components: AudioComponent[];
  totalPower?: number;
  description?: string;
}

interface VehicleAudioDiagramProps {
  audioSystem: AudioSystemData;
  className?: string;
  interactive?: boolean;
  showComponentDetails?: boolean;
}

// Component type styling and icons
const componentStyles = {
  head_unit: { color: 'text-electric-400', bg: 'bg-electric-500/20', border: 'border-electric-500', icon: Settings },
  amplifier: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500', icon: Zap },
  subwoofer: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500', icon: Speaker },
  component_speaker: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500', icon: Volume2 },
  tweeter: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500', icon: Volume2 },
  battery: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500', icon: Zap },
  alternator: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500', icon: Zap },
  capacitor: { color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500', icon: Zap },
  dsp: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500', icon: Settings },
};

// SVG Vehicle shapes
const VehicleShapes = {
  sedan: (
    <svg viewBox="0 0 400 200" className="w-full h-full">
      {/* Sedan silhouette */}
      <path
        d="M50 120 L80 100 L120 90 L280 90 L320 100 L350 120 L350 140 L340 140 L340 150 L320 150 L320 140 L80 140 L80 150 L60 150 L60 140 L50 140 Z"
        fill="rgba(75, 85, 99, 0.3)"
        stroke="rgba(156, 163, 175, 0.6)"
        strokeWidth="2"
      />
      {/* Windows */}
      <path
        d="M90 100 L110 95 L290 95 L310 100 L310 115 L90 115 Z"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="rgba(59, 130, 246, 0.4)"
        strokeWidth="1"
      />
      {/* Wheels */}
      <circle cx="100" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      <circle cx="300" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      {/* Dashboard area */}
      <rect x="85" y="110" width="25" height="8" fill="rgba(107, 114, 128, 0.6)" rx="2" />
      {/* Trunk area highlight */}
      <rect x="320" y="115" width="25" height="20" fill="rgba(139, 92, 246, 0.1)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1" rx="2" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 400 200" className="w-full h-full">
      {/* Truck silhouette */}
      <path
        d="M50 120 L80 100 L140 90 L140 110 L240 110 L280 90 L320 100 L350 120 L350 140 L340 140 L340 150 L320 150 L320 140 L80 140 L80 150 L60 150 L60 140 L50 140 Z"
        fill="rgba(75, 85, 99, 0.3)"
        stroke="rgba(156, 163, 175, 0.6)"
        strokeWidth="2"
      />
      {/* Cab windows */}
      <path
        d="M90 100 L130 95 L130 110 L90 115 Z"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="rgba(59, 130, 246, 0.4)"
        strokeWidth="1"
      />
      {/* Bed area */}
      <rect x="150" y="110" width="90" height="25" fill="rgba(75, 85, 99, 0.2)" stroke="rgba(156, 163, 175, 0.4)" strokeWidth="1" />
      {/* Wheels */}
      <circle cx="100" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      <circle cx="300" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      {/* Under seat area */}
      <rect x="140" y="125" width="30" height="10" fill="rgba(139, 92, 246, 0.1)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1" rx="2" />
    </svg>
  ),
  suv: (
    <svg viewBox="0 0 400 200" className="w-full h-full">
      {/* SUV silhouette */}
      <path
        d="M50 120 L80 95 L120 85 L280 85 L320 95 L350 120 L350 140 L340 140 L340 150 L320 150 L320 140 L80 140 L80 150 L60 150 L60 140 L50 140 Z"
        fill="rgba(75, 85, 99, 0.3)"
        stroke="rgba(156, 163, 175, 0.6)"
        strokeWidth="2"
      />
      {/* Windows */}
      <path
        d="M90 95 L110 90 L290 90 L310 95 L310 115 L90 115 Z"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="rgba(59, 130, 246, 0.4)"
        strokeWidth="1"
      />
      {/* Cargo area */}
      <rect x="260" y="110" width="50" height="25" fill="rgba(75, 85, 99, 0.2)" stroke="rgba(156, 163, 175, 0.4)" strokeWidth="1" />
      {/* Wheels */}
      <circle cx="100" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      <circle cx="300" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      {/* Dashboard area */}
      <rect x="85" y="105" width="25" height="8" fill="rgba(107, 114, 128, 0.6)" rx="2" />
    </svg>
  ),
  van: (
    <svg viewBox="0 0 400 200" className="w-full h-full">
      {/* Van silhouette */}
      <path
        d="M50 120 L80 85 L120 80 L280 80 L320 85 L350 120 L350 140 L340 140 L340 150 L320 150 L320 140 L80 140 L80 150 L60 150 L60 140 L50 140 Z"
        fill="rgba(75, 85, 99, 0.3)"
        stroke="rgba(156, 163, 175, 0.6)"
        strokeWidth="2"
      />
      {/* Windows */}
      <path
        d="M90 85 L110 82 L290 82 L310 85 L310 115 L90 115 Z"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="rgba(59, 130, 246, 0.4)"
        strokeWidth="1"
      />
      {/* Cargo area */}
      <rect x="180" y="110" width="130" height="25" fill="rgba(75, 85, 99, 0.2)" stroke="rgba(156, 163, 175, 0.4)" strokeWidth="1" />
      {/* Wheels */}
      <circle cx="100" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      <circle cx="300" cy="140" r="15" fill="rgba(75, 85, 99, 0.8)" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="2" />
      {/* Dashboard area */}
      <rect x="85" y="95" width="25" height="8" fill="rgba(107, 114, 128, 0.6)" rx="2" />
    </svg>
  ),
};

export default function VehicleAudioDiagram({
  audioSystem,
  className = '',
  interactive = true,
  showComponentDetails = true
}: VehicleAudioDiagramProps) {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  const handleComponentHover = (componentId: string | null) => {
    if (interactive) {
      setHoveredComponent(componentId);
    }
  };

  const handleComponentClick = (componentId: string) => {
    if (interactive) {
      setSelectedComponent(selectedComponent === componentId ? null : componentId);
    }
  };

  const getComponentStyle = (component: AudioComponent) => {
    const baseStyle = componentStyles[component.type];
    const isHovered = hoveredComponent === component.id;
    const isSelected = selectedComponent === component.id;
    
    return {
      ...baseStyle,
      opacity: isHovered || isSelected ? 1 : 0.8,
      scale: isHovered ? 1.1 : isSelected ? 1.05 : 1,
    };
  };

  // Create connecting lines from components to vehicle
  const createConnectingLine = (component: AudioComponent, vehicleRect: DOMRect, componentRect: DOMRect) => {
    if (!diagramRef.current) return null;

    const diagramRect = diagramRef.current.getBoundingClientRect();
    
    // Calculate relative positions
    const startX = component.location.x;
    const startY = component.location.y;
    
    // Find the closest point on the vehicle to connect to
    const vehicleCenterX = 50; // Approximate center of vehicle in percentage
    const vehicleCenterY = 60; // Approximate center of vehicle in percentage
    
    return (
      <line
        x1={`${startX}%`}
        y1={`${startY}%`}
        x2={`${vehicleCenterX}%`}
        y2={`${vehicleCenterY}%`}
        stroke="rgba(156, 163, 175, 0.4)"
        strokeWidth="2"
        strokeDasharray="5,5"
        className={`transition-all duration-200 ${
          hoveredComponent === component.id || selectedComponent === component.id
            ? 'stroke-electric-400 stroke-[3]'
            : ''
        }`}
      />
    );
  };

  return (
    <div className={`relative bg-gray-900/50 rounded-xl border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Car className="h-6 w-6 text-electric-400" />
          <h3 className="text-xl font-bold text-white">
            Audio System Layout - {audioSystem.vehicleType.toUpperCase()}
          </h3>
        </div>
        {audioSystem.totalPower && (
          <div className="text-sm text-gray-400">
            Total Power: <span className="text-electric-400 font-semibold">{audioSystem.totalPower}W</span>
          </div>
        )}
      </div>

      {/* Main diagram area */}
      <div ref={diagramRef} className="relative w-full h-96 bg-gray-800/30 rounded-lg border border-gray-600 overflow-hidden">
        {/* Vehicle SVG */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="w-full max-w-lg h-48">
            {VehicleShapes[audioSystem.vehicleType]}
          </div>
        </div>

        {/* Connecting lines SVG overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {audioSystem.components.map((component) => {
            if (!diagramRef.current) return null;
            
            return (
              <line
                key={`line-${component.id}`}
                x1={`${component.location.x}%`}
                y1={`${component.location.y}%`}
                x2="50%"
                y2="50%"
                stroke={
                  hoveredComponent === component.id || selectedComponent === component.id
                    ? componentStyles[component.type].border.replace('border-', 'rgb(var(--color-') + ')' 
                    : 'rgba(156, 163, 175, 0.3)'
                }
                strokeWidth={hoveredComponent === component.id || selectedComponent === component.id ? "3" : "2"}
                strokeDasharray="5,5"
                className="transition-all duration-200"
              />
            );
          })}
        </svg>

        {/* Audio components */}
        {audioSystem.components.map((component) => {
          const style = getComponentStyle(component);
          const IconComponent = style.icon;
          
          return (
            <div
              key={component.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                interactive ? 'cursor-pointer' : ''
              }`}
              style={{
                left: `${component.location.x}%`,
                top: `${component.location.y}%`,
                transform: `translate(-50%, -50%) scale(${style.scale})`,
              }}
              onMouseEnter={() => handleComponentHover(component.id)}
              onMouseLeave={() => handleComponentHover(null)}
              onClick={() => handleComponentClick(component.id)}
            >
              {/* Component circle */}
              <div
                className={`w-12 h-12 rounded-full ${style.bg} ${style.border} border-2 flex items-center justify-center transition-all duration-200`}
                style={{ opacity: style.opacity }}
              >
                <IconComponent className={`h-6 w-6 ${style.color}`} />
              </div>
              
              {/* Component label */}
              <div className="absolute top-14 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.color} border ${style.border}`}>
                  {component.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Component details panel */}
      {showComponentDetails && (hoveredComponent || selectedComponent) && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          {(() => {
            const component = audioSystem.components.find(
              c => c.id === (selectedComponent || hoveredComponent)
            );
            if (!component) return null;
            
            const style = componentStyles[component.type];
            const IconComponent = style.icon;
            
            return (
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full ${style.bg} ${style.border} border-2 flex items-center justify-center`}>
                  <IconComponent className={`h-6 w-6 ${style.color}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-1">{component.name}</h4>
                  <p className="text-sm text-gray-400 mb-2 capitalize">
                    {component.type.replace('_', ' ')}
                  </p>
                  {component.brand && (
                    <p className="text-sm text-gray-300">Brand: {component.brand}</p>
                  )}
                  {component.model && (
                    <p className="text-sm text-gray-300">Model: {component.model}</p>
                  )}
                  {component.power && (
                    <p className="text-sm text-gray-300">Power: {component.power}W</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 grid grid-cols-3 md:grid-cols-5 gap-3">
        {Object.entries(componentStyles).map(([type, style]) => {
          const IconComponent = style.icon;
          const hasComponent = audioSystem.components.some(c => c.type === type as any);
          
          return (
            <div
              key={type}
              className={`flex items-center space-x-2 p-2 rounded ${
                hasComponent ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full ${style.bg} ${style.border} border flex items-center justify-center`}>
                <IconComponent className={`h-3 w-3 ${style.color}`} />
              </div>
              <span className="text-xs text-gray-300 capitalize">
                {type.replace('_', ' ')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Description */}
      {audioSystem.description && (
        <div className="mt-4 p-3 bg-gray-800/30 rounded text-sm text-gray-300">
          {audioSystem.description}
        </div>
      )}
    </div>
  );
}

// Example usage component for demonstration
export function VehicleAudioDiagramDemo() {
  const exampleAudioSystem: AudioSystemData = {
    vehicleType: 'sedan',
    totalPower: 2400,
    description: 'Competition-grade audio system with dual amplifiers and custom subwoofer enclosure',
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
        name: 'Rockford Fosgate T2500-1bdCP',
        location: { x: 80, y: 30 },
        power: 2500,
        brand: 'Rockford Fosgate',
        model: 'T2500-1bdCP'
      },
      {
        id: 'sub-1',
        type: 'subwoofer',
        name: '15" W7 Subwoofer',
        location: { x: 75, y: 60 },
        power: 1000,
        brand: 'JL Audio',
        model: 'W7 15"'
      },
      {
        id: 'speaker-fl',
        type: 'component_speaker',
        name: 'Front Left Door',
        location: { x: 15, y: 50 },
        power: 100,
        brand: 'Focal',
        model: 'Utopia M'
      },
      {
        id: 'speaker-fr',
        type: 'component_speaker',
        name: 'Front Right Door',
        location: { x: 35, y: 50 },
        power: 100,
        brand: 'Focal',
        model: 'Utopia M'
      },
      {
        id: 'tweet-1',
        type: 'tweeter',
        name: 'A-Pillar Tweeter',
        location: { x: 20, y: 35 },
        power: 50,
        brand: 'Focal',
        model: 'TN52'
      },
      {
        id: 'battery-1',
        type: 'battery',
        name: 'AGM Deep Cycle',
        location: { x: 90, y: 45 },
        brand: 'Optima',
        model: 'D35'
      }
    ]
  };

  return (
    <div className="p-6">
      <VehicleAudioDiagram
        audioSystem={exampleAudioSystem}
        interactive={true}
        showComponentDetails={true}
      />
    </div>
  );
}