import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Zap, Speaker, Car, Settings, Battery, Radio } from 'lucide-react';

// Vehicle type definitions
export type VehicleType = 'sedan' | 'truck' | 'suv' | 'van';

// Component location options
export type ComponentLocation = 
  | 'hood-left' | 'hood-center' | 'hood-right'
  | 'dash' | 'dash-center'
  | 'door-front-left' | 'door-front-right' | 'door-rear-left' | 'door-rear-right'
  | 'trunk' | 'trunk-left' | 'trunk-right'
  | 'backseat' | 'under-seat'
  | 'truck-bed' | 'rear-hatch'
  | 'floor' | 'ceiling';

// Audio component definitions
export interface AudioComponent {
  id: string;
  type: 'head_unit' | 'amplifier' | 'subwoofer' | 'component_speaker' | 'tweeter' | 
        'battery' | 'alternator' | 'capacitor' | 'dsp' | 'wiring' | 'enclosure' | 'sound_dampening';
  name: string;
  location?: ComponentLocation;
  power?: number;
  brand?: string;
  model?: string;
  quantity?: number;
}

export interface AudioSystemData {
  vehicleType: VehicleType;
  vehicleColor?: string;
  components: AudioComponent[];
  totalPower?: number;
  description?: string;
}

interface ProfessionalVehicleDiagramProps {
  audioSystem: AudioSystemData;
  className?: string;
  interactive?: boolean;
  showComponentDetails?: boolean;
}

// Component type styling and icons
const componentStyles = {
  head_unit: { 
    color: '#00d4ff', 
    icon: Radio,
    defaultLocation: 'dash' as ComponentLocation,
    label: 'Head Unit'
  },
  amplifier: { 
    color: '#9333ea', 
    icon: Zap,
    defaultLocation: 'trunk' as ComponentLocation,
    label: 'Amplifier'
  },
  subwoofer: { 
    color: '#f97316', 
    icon: Speaker,
    defaultLocation: 'trunk' as ComponentLocation,
    label: 'Subwoofer'
  },
  component_speaker: { 
    color: '#3b82f6', 
    icon: Volume2,
    defaultLocation: 'door-front-left' as ComponentLocation,
    label: 'Speaker'
  },
  tweeter: { 
    color: '#10b981', 
    icon: Volume2,
    defaultLocation: 'dash' as ComponentLocation,
    label: 'Tweeter'
  },
  battery: { 
    color: '#eab308', 
    icon: Battery,
    defaultLocation: 'hood-right' as ComponentLocation,
    label: 'Battery'
  },
  alternator: { 
    color: '#ef4444', 
    icon: Zap,
    defaultLocation: 'hood-center' as ComponentLocation,
    label: 'Alternator'
  },
  capacitor: { 
    color: '#ec4899', 
    icon: Zap,
    defaultLocation: 'trunk' as ComponentLocation,
    label: 'Capacitor'
  },
  dsp: { 
    color: '#06b6d4', 
    icon: Settings,
    defaultLocation: 'dash-center' as ComponentLocation,
    label: 'DSP'
  },
  wiring: { 
    color: '#6366f1', 
    icon: Settings,
    defaultLocation: 'floor' as ComponentLocation,
    label: 'Wiring'
  },
  enclosure: { 
    color: '#8b5cf6', 
    icon: Speaker,
    defaultLocation: 'trunk' as ComponentLocation,
    label: 'Enclosure'
  },
  sound_dampening: { 
    color: '#64748b', 
    icon: Settings,
    defaultLocation: 'floor' as ComponentLocation,
    label: 'Dampening'
  }
};

// Get 3D coordinates for component locations based on vehicle type
const getLocationCoordinates = (location: ComponentLocation, vehicleType: VehicleType): { x: number, y: number, z: number } => {
  const coords: Record<ComponentLocation, { x: number, y: number, z: number }> = {
    // Hood locations
    'hood-left': { x: 25, y: 35, z: 1 },
    'hood-center': { x: 35, y: 35, z: 1 },
    'hood-right': { x: 45, y: 35, z: 1 },
    
    // Dashboard locations
    'dash': { x: 35, y: 45, z: 0.5 },
    'dash-center': { x: 35, y: 43, z: 0.5 },
    
    // Door locations
    'door-front-left': { x: 25, y: 50, z: 0 },
    'door-front-right': { x: 45, y: 50, z: 0 },
    'door-rear-left': { x: 25, y: 60, z: 0 },
    'door-rear-right': { x: 45, y: 60, z: 0 },
    
    // Trunk/rear locations
    'trunk': { x: 35, y: 75, z: 0.5 },
    'trunk-left': { x: 28, y: 75, z: 0.5 },
    'trunk-right': { x: 42, y: 75, z: 0.5 },
    
    // Interior locations
    'backseat': { x: 35, y: 65, z: 0.3 },
    'under-seat': { x: 35, y: 55, z: -0.2 },
    
    // Special locations
    'truck-bed': { x: 35, y: 80, z: 0.7 },
    'rear-hatch': { x: 35, y: 78, z: 0.6 },
    'floor': { x: 35, y: 58, z: -0.3 },
    'ceiling': { x: 35, y: 48, z: 1.2 }
  };
  
  // Adjust coordinates based on vehicle type
  if (vehicleType === 'truck' && location === 'trunk') {
    return coords['truck-bed'];
  }
  if (vehicleType === 'suv' && location === 'trunk') {
    return coords['rear-hatch'];
  }
  
  return coords[location] || { x: 50, y: 50, z: 0.5 };
};

// Professional 3D vehicle renders
const ProfessionalVehicles = {
  sedan: (color: string = '#4a5568') => (
    <g transform="translate(100, 50) scale(1.2)">
      {/* Shadow */}
      <ellipse cx="200" cy="280" rx="140" ry="25" fill="rgba(0,0,0,0.2)" />
      
      {/* Car body - main */}
      <path d="
        M 80 200
        L 85 190
        Q 90 180 100 175
        L 140 160
        Q 150 155 165 155
        L 235 155
        Q 250 155 260 160
        L 300 175
        Q 310 180 315 190
        L 320 200
        L 325 210
        Q 330 220 330 230
        L 330 250
        Q 330 260 325 265
        L 320 270
        L 80 270
        L 75 265
        Q 70 260 70 250
        L 70 230
        Q 70 220 75 210
        L 80 200
        Z
      " fill={color} stroke="#2d3748" strokeWidth="2"/>
      
      {/* Roof and windows */}
      <path d="
        M 140 160
        L 150 140
        Q 160 130 175 130
        L 225 130
        Q 240 130 250 140
        L 260 160
        L 300 175
        L 290 180
        L 260 165
        Q 250 160 235 160
        L 165 160
        Q 150 160 140 165
        L 110 180
        L 100 175
        L 140 160
        Z
      " fill={color} stroke="#2d3748" strokeWidth="2"/>
      
      {/* Front windshield */}
      <path d="
        M 145 160
        L 155 142
        Q 162 135 170 135
        L 180 135
        L 170 160
        L 145 160
        Z
      " fill="#5a8fb9" opacity="0.7" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Rear windshield */}
      <path d="
        M 255 160
        L 245 142
        Q 238 135 230 135
        L 220 135
        L 230 160
        L 255 160
        Z
      " fill="#5a8fb9" opacity="0.7" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Side windows */}
      <rect x="180" y="140" width="40" height="20" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      
      {/* Wheels with detailed rims */}
      <g id="front-wheel">
        <circle cx="120" cy="270" r="28" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="120" cy="270" r="20" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="120" cy="270" r="12" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* Rim spokes */}
        {[0, 72, 144, 216, 288].map(angle => (
          <line 
            key={angle}
            x1="120" y1="270" 
            x2={120 + 12 * Math.cos((angle * Math.PI) / 180)} 
            y2={270 + 12 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      <g id="rear-wheel">
        <circle cx="280" cy="270" r="28" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="280" cy="270" r="20" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="280" cy="270" r="12" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* Rim spokes */}
        {[0, 72, 144, 216, 288].map(angle => (
          <line 
            key={angle}
            x1="280" y1="270" 
            x2={280 + 12 * Math.cos((angle * Math.PI) / 180)} 
            y2={270 + 12 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      {/* Details */}
      <rect x="85" y="210" width="25" height="8" fill="#2d3748" opacity="0.5" rx="2"/> {/* Front grille */}
      <rect x="315" y="220" width="8" height="15" fill="#ef4444" opacity="0.7" rx="1"/> {/* Taillight */}
      <rect x="75" y="220" width="10" height="15" fill="#fbbf24" opacity="0.7" rx="1"/> {/* Headlight */}
      <line x1="70" y1="245" x2="330" y2="245" stroke="#2d3748" strokeWidth="1" opacity="0.3"/> {/* Body line */}
      
      {/* Door handles */}
      <rect x="155" y="195" width="15" height="3" fill="#2d3748" rx="1"/>
      <rect x="230" y="195" width="15" height="3" fill="#2d3748" rx="1"/>
    </g>
  ),
  
  truck: (color: string = '#4a5568') => (
    <g transform="translate(100, 40) scale(1.2)">
      {/* Shadow */}
      <ellipse cx="200" cy="280" rx="145" ry="25" fill="rgba(0,0,0,0.2)" />
      
      {/* Truck bed */}
      <rect x="200" y="200" width="130" height="70" fill={color} stroke="#2d3748" strokeWidth="2" rx="3"/>
      <rect x="210" y="210" width="110" height="50" fill="#2d3748" opacity="0.3" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Cab body */}
      <path d="
        M 70 200
        L 75 190
        Q 80 180 90 175
        L 120 165
        Q 130 160 145 160
        L 185 160
        Q 200 160 205 165
        L 205 200
        L 205 250
        Q 205 260 200 265
        L 195 270
        L 80 270
        L 75 265
        Q 70 260 70 250
        L 70 230
        Q 70 220 75 210
        L 70 200
        Z
      " fill={color} stroke="#2d3748" strokeWidth="2"/>
      
      {/* Cab roof and window */}
      <path d="
        M 120 165
        L 125 145
        Q 130 135 140 135
        L 175 135
        Q 185 135 190 145
        L 195 165
        L 205 165
        L 200 170
        L 195 168
        Q 185 163 175 163
        L 140 163
        Q 130 163 120 168
        L 115 170
        L 110 165
        L 120 165
        Z
      " fill={color} stroke="#2d3748" strokeWidth="2"/>
      
      {/* Windshield */}
      <path d="
        M 125 163
        L 130 147
        Q 135 140 142 140
        L 165 140
        Q 172 140 177 147
        L 182 163
        L 125 163
        Z
      " fill="#5a8fb9" opacity="0.7" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Side window */}
      <rect x="145" y="145" width="30" height="15" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      
      {/* Wheels - larger and more detailed */}
      <g id="front-wheel">
        <circle cx="110" cy="270" r="30" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="110" cy="270" r="22" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="110" cy="270" r="14" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* Rim pattern */}
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <line 
            key={angle}
            x1="110" y1="270" 
            x2={110 + 14 * Math.cos((angle * Math.PI) / 180)} 
            y2={270 + 14 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      <g id="rear-wheel">
        <circle cx="270" cy="270" r="30" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="270" cy="270" r="22" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="270" cy="270" r="14" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* Rim pattern */}
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <line 
            key={angle}
            x1="270" y1="270" 
            x2={270 + 14 * Math.cos((angle * Math.PI) / 180)} 
            y2={270 + 14 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      {/* Details */}
      <rect x="75" y="210" width="20" height="8" fill="#2d3748" opacity="0.5" rx="2"/> {/* Front grille */}
      <rect x="325" y="220" width="8" height="15" fill="#ef4444" opacity="0.7" rx="1"/> {/* Taillight */}
      <rect x="65" y="220" width="10" height="15" fill="#fbbf24" opacity="0.7" rx="1"/> {/* Headlight */}
      <line x1="70" y1="240" x2="330" y2="240" stroke="#2d3748" strokeWidth="1" opacity="0.3"/> {/* Body line */}
      
      {/* Door handle */}
      <rect x="160" y="195" width="15" height="3" fill="#2d3748" rx="1"/>
      
      {/* Truck bed rails */}
      <rect x="200" y="195" width="130" height="3" fill="#2d3748" opacity="0.5"/>
      <rect x="200" y="272" width="130" height="3" fill="#2d3748" opacity="0.5"/>
    </g>
  ),
  
  suv: (color: string = '#4a5568') => (
    <g transform="translate(100, 45) scale(1.2)">
      {/* Shadow */}
      <ellipse cx="200" cy="280" rx="140" ry="25" fill="rgba(0,0,0,0.2)" />
      
      {/* SUV body - taller and more robust */}
      <path d="
        M 80 195
        L 85 185
        Q 90 175 100 170
        L 130 160
        Q 140 155 155 155
        L 245 155
        Q 260 155 270 160
        L 300 170
        Q 310 175 315 185
        L 320 195
        L 325 205
        Q 330 215 330 225
        L 330 255
        Q 330 265 325 270
        L 320 275
        L 80 275
        L 75 270
        Q 70 265 70 255
        L 70 225
        Q 70 215 75 205
        L 80 195
        Z
      " fill={color} stroke="#2d3748" strokeWidth="2"/>
      
      {/* Roof and windows - higher profile */}
      <path d="
        M 130 160
        L 135 135
        Q 140 125 150 125
        L 250 125
        Q 260 125 265 135
        L 270 160
        L 300 170
        L 295 175
        L 270 165
        Q 260 160 245 160
        L 155 160
        Q 140 160 130 165
        L 105 175
        L 100 170
        L 130 160
        Z
      " fill={color} stroke="#2d3748" strokeWidth="2"/>
      
      {/* Front windshield */}
      <path d="
        M 135 160
        L 140 138
        Q 145 130 152 130
        L 165 130
        L 160 160
        L 135 160
        Z
      " fill="#5a8fb9" opacity="0.7" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Rear windshield */}
      <path d="
        M 265 160
        L 260 138
        Q 255 130 248 130
        L 235 130
        L 240 160
        L 265 160
        Z
      " fill="#5a8fb9" opacity="0.7" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Side windows - larger */}
      <rect x="170" y="135" width="25" height="25" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      <rect x="205" y="135" width="25" height="25" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      
      {/* Wheels - SUV style */}
      <g id="front-wheel">
        <circle cx="120" cy="275" r="32" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="120" cy="275" r="24" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="120" cy="275" r="15" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* SUV rim pattern */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <line 
            key={angle}
            x1="120" y1="275" 
            x2={120 + 15 * Math.cos((angle * Math.PI) / 180)} 
            y2={275 + 15 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      <g id="rear-wheel">
        <circle cx="280" cy="275" r="32" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="280" cy="275" r="24" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="280" cy="275" r="15" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* SUV rim pattern */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <line 
            key={angle}
            x1="280" y1="275" 
            x2={280 + 15 * Math.cos((angle * Math.PI) / 180)} 
            y2={275 + 15 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      {/* Details */}
      <rect x="85" y="205" width="25" height="10" fill="#2d3748" opacity="0.5" rx="2"/> {/* Front grille */}
      <rect x="315" y="215" width="8" height="20" fill="#ef4444" opacity="0.7" rx="1"/> {/* Taillight */}
      <rect x="75" y="215" width="10" height="20" fill="#fbbf24" opacity="0.7" rx="1"/> {/* Headlight */}
      <line x1="70" y1="245" x2="330" y2="245" stroke="#2d3748" strokeWidth="1" opacity="0.3"/> {/* Body line */}
      
      {/* Door handles */}
      <rect x="150" y="195" width="15" height="3" fill="#2d3748" rx="1"/>
      <rect x="235" y="195" width="15" height="3" fill="#2d3748" rx="1"/>
      
      {/* Roof rails */}
      <rect x="120" y="122" width="160" height="2" fill="#2d3748" opacity="0.5"/>
    </g>
  ),
  
  van: (color: string = '#4a5568') => (
    <g transform="translate(100, 40) scale(1.2)">
      {/* Shadow */}
      <ellipse cx="200" cy="285" rx="145" ry="25" fill="rgba(0,0,0,0.2)" />
      
      {/* Van body - tall and boxy */}
      <rect x="70" y="150" width="260" height="130" fill={color} stroke="#2d3748" strokeWidth="2" rx="5"/>
      
      {/* Front section */}
      <path d="
        M 70 200
        L 70 180
        Q 70 170 75 165
        L 80 160
        Q 85 155 95 155
        L 100 155
        L 100 200
        L 70 200
        Z
      " fill={color} stroke="#2d3748" strokeWidth="2"/>
      
      {/* Windshield */}
      <path d="
        M 75 180
        L 75 165
        Q 75 160 80 158
        L 90 158
        Q 95 158 97 162
        L 97 180
        L 75 180
        Z
      " fill="#5a8fb9" opacity="0.7" stroke="#2d3748" strokeWidth="1"/>
      
      {/* Side windows */}
      <rect x="110" y="160" width="40" height="30" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      <rect x="160" y="160" width="40" height="30" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      <rect x="210" y="160" width="40" height="30" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      
      {/* Rear windows */}
      <rect x="280" y="160" width="40" height="30" fill="#5a8fb9" opacity="0.6" stroke="#2d3748" strokeWidth="1" rx="2"/>
      
      {/* Wheels - van style */}
      <g id="front-wheel">
        <circle cx="110" cy="280" r="28" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="110" cy="280" r="20" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="110" cy="280" r="12" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* Simple rim pattern */}
        {[0, 90, 180, 270].map(angle => (
          <line 
            key={angle}
            x1="110" y1="280" 
            x2={110 + 12 * Math.cos((angle * Math.PI) / 180)} 
            y2={280 + 12 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      <g id="rear-wheel">
        <circle cx="290" cy="280" r="28" fill="#1a202c" stroke="#2d3748" strokeWidth="2"/>
        <circle cx="290" cy="280" r="20" fill="#4a5568" stroke="#2d3748" strokeWidth="1"/>
        <circle cx="290" cy="280" r="12" fill="#718096" stroke="#2d3748" strokeWidth="1"/>
        {/* Simple rim pattern */}
        {[0, 90, 180, 270].map(angle => (
          <line 
            key={angle}
            x1="290" y1="280" 
            x2={290 + 12 * Math.cos((angle * Math.PI) / 180)} 
            y2={280 + 12 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2d3748" strokeWidth="2"
          />
        ))}
      </g>
      
      {/* Details */}
      <rect x="75" y="205" width="20" height="8" fill="#2d3748" opacity="0.5" rx="2"/> {/* Front grille */}
      <rect x="325" y="220" width="8" height="20" fill="#ef4444" opacity="0.7" rx="1"/> {/* Taillight */}
      <rect x="65" y="220" width="10" height="20" fill="#fbbf24" opacity="0.7" rx="1"/> {/* Headlight */}
      <line x1="70" y1="240" x2="330" y2="240" stroke="#2d3748" strokeWidth="1" opacity="0.3"/> {/* Body line */}
      
      {/* Side door */}
      <rect x="230" y="200" width="3" height="80" fill="#2d3748" opacity="0.3"/>
      
      {/* Door handles */}
      <rect x="120" y="210" width="15" height="3" fill="#2d3748" rx="1"/>
      <rect x="250" y="210" width="15" height="3" fill="#2d3748" rx="1"/>
    </g>
  )
};

// Convert hex color to RGB for better manipulation
const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 74, g: 85, b: 104 }; // Default gray
};

// Map vehicle colors to hex values
const getVehicleColor = (color?: string): string => {
  const colorMap: Record<string, string> = {
    'black': '#1a1a1a',
    'white': '#f5f5f5',
    'silver': '#c0c0c0',
    'gray': '#808080',
    'grey': '#808080',
    'red': '#dc2626',
    'blue': '#2563eb',
    'green': '#16a34a',
    'yellow': '#facc15',
    'orange': '#fb923c',
    'purple': '#9333ea',
    'brown': '#92400e',
    'gold': '#fbbf24',
    'bronze': '#cd7f32',
    'navy': '#1e3a8a',
    'maroon': '#7f1d1d',
    'teal': '#0d9488',
    'pink': '#ec4899',
    'beige': '#d2b48c',
    'tan': '#d4a574',
    'burgundy': '#881337',
    'charcoal': '#374151'
  };
  
  if (!color) return '#4a5568'; // Default gray
  return colorMap[color.toLowerCase()] || '#4a5568';
};

export default function ProfessionalVehicleDiagram({
  audioSystem,
  className = '',
  interactive = true,
  showComponentDetails = true
}: ProfessionalVehicleDiagramProps) {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const vehicleColor = getVehicleColor(audioSystem.vehicleColor);

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

  // Create professional 45-degree angle connector lines
  const createConnectorPath = (component: AudioComponent): string => {
    const location = component.location || componentStyles[component.type].defaultLocation;
    const coords = getLocationCoordinates(location, audioSystem.vehicleType);
    
    // Component box position (outside the vehicle)
    const componentBoxes: Record<number, { x: number, y: number }> = {};
    let boxIndex = 0;
    
    audioSystem.components.forEach((comp, index) => {
      // Arrange components in organized grid around vehicle
      const row = Math.floor(index / 4);
      const col = index % 4;
      componentBoxes[index] = {
        x: 50 + col * 150,
        y: 50 + row * 80
      };
    });
    
    const compIndex = audioSystem.components.findIndex(c => c.id === component.id);
    const startPoint = componentBoxes[compIndex] || { x: 100, y: 100 };
    
    // Target point on vehicle (adjusted for 3D perspective)
    const targetX = 200 + coords.x * 3;
    const targetY = 150 + coords.y * 2;
    
    // Create smooth 45-degree angle path with control points
    const midX = (startPoint.x + targetX) / 2;
    const midY = startPoint.y;
    
    return `M ${startPoint.x} ${startPoint.y} 
            Q ${midX} ${midY}, ${midX} ${targetY}
            T ${targetX} ${targetY}`;
  };

  return (
    <div className={`relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Audio System Layout
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {audioSystem.vehicleType.charAt(0).toUpperCase() + audioSystem.vehicleType.slice(1)} Configuration
            </p>
          </div>
        </div>
        {audioSystem.totalPower && (
          <div className="text-right">
            <p className="text-sm text-gray-400">Total System Power</p>
            <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              {audioSystem.totalPower.toLocaleString()}W
            </p>
          </div>
        )}
      </div>

      {/* Main diagram area */}
      <div className="relative w-full" style={{ height: '600px' }}>
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.5"/>
            </pattern>
            
            {/* Gradient for connector lines */}
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
              <stop offset="100%" stopColor="rgba(147, 51, 234, 0.8)" />
            </linearGradient>
            
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <rect width="800" height="600" fill="url(#grid)" />
          
          {/* Vehicle render */}
          <g transform="translate(0, 50)">
            {ProfessionalVehicles[audioSystem.vehicleType](vehicleColor)}
          </g>
          
          {/* Connector lines */}
          <g opacity="0.8">
            {audioSystem.components.map((component) => {
              const isHighlighted = hoveredComponent === component.id || selectedComponent === component.id;
              return (
                <path
                  key={`line-${component.id}`}
                  d={createConnectorPath(component)}
                  fill="none"
                  stroke={isHighlighted ? componentStyles[component.type].color : "url(#lineGradient)"}
                  strokeWidth={isHighlighted ? "3" : "2"}
                  strokeDasharray={isHighlighted ? "0" : "5,5"}
                  opacity={isHighlighted ? 1 : 0.6}
                  className="transition-all duration-300"
                  filter={isHighlighted ? "url(#glow)" : ""}
                />
              );
            })}
          </g>
          
          {/* Component boxes */}
          <g>
            {audioSystem.components.map((component, index) => {
              const row = Math.floor(index / 4);
              const col = index % 4;
              const x = 50 + col * 150;
              const y = 50 + row * 80;
              const style = componentStyles[component.type];
              const IconComponent = style.icon;
              const isHighlighted = hoveredComponent === component.id || selectedComponent === component.id;
              
              return (
                <g
                  key={component.id}
                  transform={`translate(${x}, ${y})`}
                  onMouseEnter={() => handleComponentHover(component.id)}
                  onMouseLeave={() => handleComponentHover(null)}
                  onClick={() => handleComponentClick(component.id)}
                  className={interactive ? 'cursor-pointer' : ''}
                  opacity={isHighlighted ? 1 : 0.9}
                >
                  {/* Component box background */}
                  <rect
                    x="-60"
                    y="-25"
                    width="120"
                    height="50"
                    rx="8"
                    fill={`${style.color}20`}
                    stroke={style.color}
                    strokeWidth={isHighlighted ? "2" : "1"}
                    filter={isHighlighted ? "url(#glow)" : ""}
                    className="transition-all duration-300"
                  />
                  
                  {/* Icon circle */}
                  <circle
                    cx="-35"
                    cy="0"
                    r="15"
                    fill={`${style.color}40`}
                    stroke={style.color}
                    strokeWidth="2"
                  />
                  
                  {/* Component name */}
                  <text
                    x="5"
                    y="-5"
                    fill="white"
                    fontSize="11"
                    fontWeight="600"
                    className="select-none"
                  >
                    {component.brand || 'Component'}
                  </text>
                  
                  <text
                    x="5"
                    y="8"
                    fill={style.color}
                    fontSize="10"
                    className="select-none"
                  >
                    {component.model || style.label}
                  </text>
                  
                  {/* Power rating if available */}
                  {component.power && (
                    <text
                      x="5"
                      y="20"
                      fill="rgba(255,255,255,0.6)"
                      fontSize="9"
                      className="select-none"
                    >
                      {component.power}W
                    </text>
                  )}
                  
                  {/* Quantity badge */}
                  {component.quantity && component.quantity > 1 && (
                    <g transform="translate(45, -15)">
                      <circle r="10" fill={style.color} />
                      <text
                        x="0"
                        y="4"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="select-none"
                      >
                        {component.quantity}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Component details panel */}
      {showComponentDetails && (hoveredComponent || selectedComponent) && (
        <div className="mt-6 p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600 backdrop-blur-sm">
          {(() => {
            const component = audioSystem.components.find(
              c => c.id === (selectedComponent || hoveredComponent)
            );
            if (!component) return null;
            
            const style = componentStyles[component.type];
            const IconComponent = style.icon;
            
            return (
              <div className="flex items-start space-x-6">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${style.color}20`, border: `2px solid ${style.color}` }}
                >
                  <IconComponent className="h-8 w-8" style={{ color: style.color }} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white mb-2">
                    {component.name}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Type</p>
                      <p className="text-gray-300 font-medium">{style.label}</p>
                    </div>
                    {component.brand && (
                      <div>
                        <p className="text-gray-500">Brand</p>
                        <p className="text-gray-300 font-medium">{component.brand}</p>
                      </div>
                    )}
                    {component.model && (
                      <div>
                        <p className="text-gray-500">Model</p>
                        <p className="text-gray-300 font-medium">{component.model}</p>
                      </div>
                    )}
                    {component.power && (
                      <div>
                        <p className="text-gray-500">Power</p>
                        <p className="text-gray-300 font-medium">{component.power}W</p>
                      </div>
                    )}
                    {component.quantity && component.quantity > 1 && (
                      <div>
                        <p className="text-gray-500">Quantity</p>
                        <p className="text-gray-300 font-medium">{component.quantity} units</p>
                      </div>
                    )}
                    {component.location && (
                      <div>
                        <p className="text-gray-500">Location</p>
                        <p className="text-gray-300 font-medium capitalize">
                          {component.location.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Description */}
      {audioSystem.description && (
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
          <p className="text-gray-300">{audioSystem.description}</p>
        </div>
      )}
    </div>
  );
}