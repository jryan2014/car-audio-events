import React, { useState, useEffect } from 'react';
import { Car } from 'lucide-react';

export type VehicleType = 'sedan' | 'truck' | 'suv' | 'van';

export interface DiagramComponent {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  type: string;
  isVisible?: boolean; // Whether to show on diagram
}

export interface VehicleDiagramData {
  vehicleType: VehicleType;
  vehicleColor?: string;
  components: DiagramComponent[];
  totalPower?: number;
}

interface CleanVehicleDiagramProps {
  data: VehicleDiagramData;
  className?: string;
}

// Component anchor points on vehicles (percentage based)
const componentAnchors: Record<string, Record<VehicleType, { x: number; y: number }>> = {
  'Head Unit': {
    sedan: { x: 40, y: 35 },
    truck: { x: 30, y: 35 },
    suv: { x: 38, y: 35 },
    van: { x: 25, y: 35 }
  },
  'Amplifier': {
    sedan: { x: 75, y: 50 },
    truck: { x: 60, y: 50 },
    suv: { x: 70, y: 50 },
    van: { x: 70, y: 50 }
  },
  'Subwoofer': {
    sedan: { x: 80, y: 45 },
    truck: { x: 65, y: 45 },
    suv: { x: 75, y: 45 },
    van: { x: 75, y: 45 }
  },
  'Battery': {
    sedan: { x: 20, y: 40 },
    truck: { x: 15, y: 40 },
    suv: { x: 18, y: 40 },
    van: { x: 12, y: 40 }
  },
  'Alternator': {
    sedan: { x: 25, y: 40 },
    truck: { x: 20, y: 40 },
    suv: { x: 23, y: 40 },
    van: { x: 17, y: 40 }
  },
  'Speaker': {
    sedan: { x: 45, y: 45 },
    truck: { x: 35, y: 45 },
    suv: { x: 43, y: 45 },
    van: { x: 40, y: 45 }
  },
  'DSP': {
    sedan: { x: 42, y: 38 },
    truck: { x: 32, y: 38 },
    suv: { x: 40, y: 38 },
    van: { x: 27, y: 38 }
  },
  'Capacitor': {
    sedan: { x: 70, y: 48 },
    truck: { x: 55, y: 48 },
    suv: { x: 65, y: 48 },
    van: { x: 65, y: 48 }
  }
};

// Clean vehicle silhouettes (side view)
const VehicleSilhouettes = {
  sedan: (color: string = '#333') => (
    <g>
      <path d="
        M 90 140
        L 100 130
        Q 110 120 125 115
        L 160 110
        Q 180 108 200 108
        L 280 108
        Q 300 108 315 112
        L 350 120
        Q 365 125 375 135
        L 385 145
        L 390 155
        L 390 165
        L 385 170
        L 90 170
        L 85 165
        L 85 155
        L 90 140
        Z
        M 160 110
        L 170 95
        Q 180 85 195 85
        L 265 85
        Q 280 85 290 95
        L 300 110
      " 
      fill="none" 
      stroke={color} 
      strokeWidth="2"
      strokeLinejoin="round"
      />
      
      {/* Windows */}
      <line x1="165" y1="110" x2="175" y2="95" stroke={color} strokeWidth="2"/>
      <line x1="175" y1="95" x2="215" y2="95" stroke={color} strokeWidth="2"/>
      <line x1="215" y1="95" x2="215" y2="110" stroke={color} strokeWidth="2"/>
      
      <line x1="225" y1="110" x2="225" y2="95" stroke={color} strokeWidth="2"/>
      <line x1="225" y1="95" x2="265" y2="95" stroke={color} strokeWidth="2"/>
      <line x1="265" y1="95" x2="295" y2="110" stroke={color} strokeWidth="2"/>
      
      {/* Wheels */}
      <circle cx="140" cy="170" r="15" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="140" cy="170" r="10" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="140" cy="170" r="5" fill="none" stroke={color} strokeWidth="1"/>
      
      <circle cx="330" cy="170" r="15" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="330" cy="170" r="10" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="330" cy="170" r="5" fill="none" stroke={color} strokeWidth="1"/>
      
      {/* Door handles */}
      <rect x="195" y="130" width="12" height="2" fill={color}/>
      <rect x="265" y="130" width="12" height="2" fill={color}/>
    </g>
  ),
  
  truck: (color: string = '#000') => (
    <g>
      {/* Main truck body outline */}
      <path d="
        M 60 155
        L 60 145
        Q 60 140 65 135
        L 70 130
        L 75 125
        L 85 120
        Q 95 118 105 118
        L 195 118
        L 200 120
        L 205 125
        L 210 130
        L 210 145
        L 210 155
        L 210 165
        L 210 175
        L 200 175
        L 195 180
        L 185 185
        Q 175 187 165 187
        L 165 180
        L 145 180
        L 145 187
        Q 135 187 125 185
        L 115 180
        L 105 175
        L 95 175
        L 95 165
        L 60 165
        L 60 155
        Z
      "
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      />
      
      {/* Truck bed */}
      <path d="
        M 210 145
        L 380 145
        L 385 150
        L 385 165
        L 385 175
        L 375 175
        L 370 180
        L 360 185
        Q 350 187 340 187
        L 340 180
        L 320 180
        L 320 187
        Q 310 187 300 185
        L 290 180
        L 280 175
        L 210 175
      "
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      />
      
      {/* Bed rail */}
      <line x1="215" y1="150" x2="380" y2="150" stroke={color} strokeWidth="1"/>
      
      {/* Cab window */}
      <path d="
        M 90 130
        L 95 115
        Q 100 110 110 108
        L 180 108
        Q 190 108 195 115
        L 200 125
        L 200 140
        L 90 140
        L 90 130
        Z
      "
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      />
      
      {/* Windshield */}
      <line x1="95" y1="115" x2="195" y2="115" stroke={color} strokeWidth="1"/>
      
      {/* Side window */}
      <rect x="105" y="118" width="35" height="20" fill="none" stroke={color} strokeWidth="1"/>
      <rect x="145" y="118" width="35" height="20" fill="none" stroke={color} strokeWidth="1"/>
      
      {/* Door line */}
      <line x1="142" y1="118" x2="142" y2="165" stroke={color} strokeWidth="1"/>
      
      {/* Door handle */}
      <rect x="125" y="145" width="10" height="2" fill="none" stroke={color} strokeWidth="1"/>
      <rect x="165" y="145" width="10" height="2" fill="none" stroke={color} strokeWidth="1"/>
      
      {/* Front grille and bumper */}
      <rect x="55" y="145" width="5" height="15" fill="none" stroke={color} strokeWidth="1"/>
      <rect x="55" y="148" width="5" height="3" fill={color}/>
      <rect x="55" y="152" width="5" height="3" fill={color}/>
      <rect x="55" y="156" width="5" height="3" fill={color}/>
      
      {/* Headlights */}
      <ellipse cx="65" cy="145" rx="4" ry="3" fill="none" stroke={color} strokeWidth="1"/>
      <ellipse cx="65" cy="155" rx="4" ry="3" fill="none" stroke={color} strokeWidth="1"/>
      
      {/* Front wheel well */}
      <path d="
        M 95 165
        Q 95 175 105 175
        L 115 180
        Q 125 185 135 187
        Q 145 187 145 180
        L 145 165
      "
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      />
      
      {/* Rear cab wheel well */}
      <path d="
        M 165 165
        L 165 180
        Q 165 187 175 187
        Q 185 185 195 180
        L 200 175
        L 210 175
        L 210 165
      "
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      />
      
      {/* Rear wheel well */}
      <path d="
        M 280 175
        L 290 180
        Q 300 185 310 187
        Q 320 187 320 180
        L 340 180
        Q 340 187 350 187
        Q 360 185 370 180
        L 375 175
        L 385 175
        L 385 165
        L 280 165
      "
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      />
      
      {/* Front wheel */}
      <circle cx="120" cy="180" r="18" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="120" cy="180" r="14" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="120" cy="180" r="8" fill="none" stroke={color} strokeWidth="1"/>
      {/* Wheel spokes */}
      <line x1="120" y1="172" x2="120" y2="188" stroke={color} strokeWidth="1"/>
      <line x1="112" y1="180" x2="128" y2="180" stroke={color} strokeWidth="1"/>
      <line x1="115" y1="175" x2="125" y2="185" stroke={color} strokeWidth="1"/>
      <line x1="125" y1="175" x2="115" y2="185" stroke={color} strokeWidth="1"/>
      
      {/* Rear wheel 1 */}
      <circle cx="185" cy="180" r="18" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="185" cy="180" r="14" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="185" cy="180" r="8" fill="none" stroke={color} strokeWidth="1"/>
      {/* Wheel spokes */}
      <line x1="185" y1="172" x2="185" y2="188" stroke={color} strokeWidth="1"/>
      <line x1="177" y1="180" x2="193" y2="180" stroke={color} strokeWidth="1"/>
      <line x1="180" y1="175" x2="190" y2="185" stroke={color} strokeWidth="1"/>
      <line x1="190" y1="175" x2="180" y2="185" stroke={color} strokeWidth="1"/>
      
      {/* Rear wheel 2 */}
      <circle cx="330" cy="180" r="18" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="330" cy="180" r="14" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="330" cy="180" r="8" fill="none" stroke={color} strokeWidth="1"/>
      {/* Wheel spokes */}
      <line x1="330" y1="172" x2="330" y2="188" stroke={color} strokeWidth="1"/>
      <line x1="322" y1="180" x2="338" y2="180" stroke={color} strokeWidth="1"/>
      <line x1="325" y1="175" x2="335" y2="185" stroke={color} strokeWidth="1"/>
      <line x1="335" y1="175" x2="325" y2="185" stroke={color} strokeWidth="1"/>
      
      {/* Side mirror */}
      <ellipse cx="85" cy="130" rx="3" ry="2" fill="none" stroke={color} strokeWidth="1"/>
      <line x1="88" y1="130" x2="90" y2="130" stroke={color} strokeWidth="1"/>
    </g>
  ),
  
  suv: (color: string = '#333') => (
    <g>
      <path d="
        M 85 135
        L 95 125
        Q 105 115 120 110
        L 155 105
        Q 175 103 195 103
        L 285 103
        Q 305 103 320 107
        L 355 115
        Q 370 120 380 130
        L 390 140
        L 395 150
        L 395 165
        L 390 170
        L 85 170
        L 80 165
        L 80 150
        L 85 135
        Z
        M 155 105
        L 160 85
        Q 165 75 180 75
        L 270 75
        Q 285 75 295 85
        L 305 105
      "
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
      />
      
      {/* Windows */}
      <line x1="160" y1="105" x2="165" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="165" y1="85" x2="200" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="200" y1="85" x2="200" y2="105" stroke={color} strokeWidth="2"/>
      
      <line x1="210" y1="105" x2="210" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="210" y1="85" x2="245" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="245" y1="85" x2="245" y2="105" stroke={color} strokeWidth="2"/>
      
      <line x1="255" y1="105" x2="255" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="255" y1="85" x2="290" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="290" y1="85" x2="300" y2="105" stroke={color} strokeWidth="2"/>
      
      {/* Wheels */}
      <circle cx="135" cy="170" r="17" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="135" cy="170" r="11" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="135" cy="170" r="6" fill="none" stroke={color} strokeWidth="1"/>
      
      <circle cx="340" cy="170" r="17" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="340" cy="170" r="11" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="340" cy="170" r="6" fill="none" stroke={color} strokeWidth="1"/>
      
      {/* Door handles */}
      <rect x="185" y="125" width="12" height="2" fill={color}/>
      <rect x="235" y="125" width="12" height="2" fill={color}/>
      <rect x="285" y="125" width="12" height="2" fill={color}/>
    </g>
  ),
  
  van: (color: string = '#333') => (
    <g>
      <path d="
        M 75 135
        L 75 100
        Q 75 90 85 85
        L 95 85
        Q 105 85 115 85
        L 380 85
        Q 390 85 395 90
        L 395 100
        L 395 165
        L 390 170
        L 80 170
        L 75 165
        L 75 135
        Z
      "
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
      />
      
      {/* Front windshield */}
      <line x1="75" y1="100" x2="85" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="85" y1="85" x2="115" y2="85" stroke={color} strokeWidth="2"/>
      <line x1="115" y1="85" x2="115" y2="100" stroke={color} strokeWidth="2"/>
      
      {/* Side windows */}
      <rect x="125" y="95" width="40" height="25" fill="none" stroke={color} strokeWidth="2"/>
      <rect x="175" y="95" width="40" height="25" fill="none" stroke={color} strokeWidth="2"/>
      <rect x="225" y="95" width="40" height="25" fill="none" stroke={color} strokeWidth="2"/>
      
      {/* Sliding door */}
      <rect x="275" y="100" width="60" height="70" fill="none" stroke={color} strokeWidth="2"/>
      <line x1="305" y1="100" x2="305" y2="170" stroke={color} strokeWidth="1"/>
      
      {/* Wheels */}
      <circle cx="115" cy="170" r="15" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="115" cy="170" r="10" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="115" cy="170" r="5" fill="none" stroke={color} strokeWidth="1"/>
      
      <circle cx="355" cy="170" r="15" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="355" cy="170" r="10" fill="none" stroke={color} strokeWidth="1"/>
      <circle cx="355" cy="170" r="5" fill="none" stroke={color} strokeWidth="1"/>
      
      {/* Door handles */}
      <rect x="145" y="130" width="12" height="2" fill={color}/>
      <rect x="300" y="135" width="12" height="2" fill={color}/>
    </g>
  )
};

export default function CleanVehicleDiagram({ data, className = '' }: CleanVehicleDiagramProps) {
  const [visibleComponents, setVisibleComponents] = useState<DiagramComponent[]>([]);
  
  useEffect(() => {
    // Only show components that are marked as visible
    setVisibleComponents(data.components.filter(c => c.isVisible));
  }, [data.components]);

  // Get vehicle color
  const vehicleColor = '#333'; // Default dark gray
  
  // Calculate component box positions (above and below vehicle)
  const getComponentBoxPosition = (index: number, total: number) => {
    const isTop = index % 2 === 0;
    const columnIndex = Math.floor(index / 2);
    const spacing = 500 / (Math.ceil(total / 2) + 1);
    
    return {
      x: 50 + (columnIndex + 1) * spacing,
      y: isTop ? 30 : 230
    };
  };

  // Get anchor point for component type
  const getAnchorPoint = (componentType: string) => {
    const anchors = componentAnchors[componentType];
    if (!anchors) {
      // Default position if component type not found
      return { x: 50, y: 45 };
    }
    
    const vehicleAnchors = anchors[data.vehicleType];
    if (!vehicleAnchors) {
      // Use sedan as default if vehicle type not found
      return anchors.sedan;
    }
    
    return vehicleAnchors;
  };

  return (
    <div className={`bg-white rounded-lg border-2 border-gray-300 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Car className="h-6 w-6 text-gray-700" />
          <h3 className="text-xl font-bold text-gray-800">
            Audio System Installation Diagram
          </h3>
        </div>
        {data.totalPower && (
          <div className="text-sm text-gray-600">
            Total Power: <span className="font-bold">{data.totalPower.toLocaleString()}W</span>
          </div>
        )}
      </div>

      {/* Vehicle type indicator */}
      <div className="text-sm text-gray-500 mb-4">
        Vehicle Type: <span className="font-medium capitalize">{data.vehicleType}</span>
      </div>

      {/* Main diagram */}
      <svg viewBox="0 0 500 260" className="w-full" style={{ maxHeight: '400px' }}>
        {/* Vehicle silhouette */}
        <g transform="translate(25, 20)">
          {VehicleSilhouettes[data.vehicleType](vehicleColor)}
        </g>
        
        {/* Component boxes and lines */}
        {visibleComponents.map((component, index) => {
          const boxPos = getComponentBoxPosition(index, visibleComponents.length);
          const anchorPos = getAnchorPoint(component.type);
          
          // Calculate actual anchor position on vehicle
          const vehicleX = 25 + (anchorPos.x * 450) / 100;
          const vehicleY = 20 + (anchorPos.y * 180) / 100;
          
          return (
            <g key={component.id}>
              {/* Connecting line */}
              <line
                x1={boxPos.x}
                y1={boxPos.y < 100 ? boxPos.y + 20 : boxPos.y - 20}
                x2={vehicleX}
                y2={vehicleY}
                stroke="#666"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
              
              {/* Component box */}
              <g transform={`translate(${boxPos.x}, ${boxPos.y})`}>
                <rect
                  x="-60"
                  y="-20"
                  width="120"
                  height="40"
                  fill="white"
                  stroke="#333"
                  strokeWidth="2"
                  rx="4"
                />
                <text
                  y="-3"
                  textAnchor="middle"
                  className="text-sm font-bold fill-gray-800"
                >
                  {component.type.toUpperCase()}
                </text>
                {component.brand && (
                  <text
                    y="12"
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {component.brand} {component.model || ''}
                  </text>
                )}
              </g>
            </g>
          );
        })}
        
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill="#666"
            />
          </marker>
        </defs>
      </svg>

      {/* Component count */}
      {visibleComponents.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No components selected for display. 
          <br />
          Please select components in your audio system settings.
        </div>
      )}
      
      {visibleComponents.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {visibleComponents.length} of {data.components.length} components
        </div>
      )}
    </div>
  );
}