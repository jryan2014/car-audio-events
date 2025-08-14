import React, { useEffect, useRef, useState } from 'react';
import { Car, Maximize2 } from 'lucide-react';

interface ComponentBox {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  type: string;
  x: number;
  y: number;
  isVisible: boolean;
  lineColor?: string; // Color for both line and box outline
}

interface LineConnection {
  id: string;
  componentId: string;
  points: { x: number; y: number }[];
  color?: string; // Store the color with the connection
}

interface DiagramConfiguration {
  vehicleType: string;
  vehicleColor: string;
  components: ComponentBox[];
  connections: LineConnection[];
}

interface AudioDiagramDisplayProps {
  configuration: DiagramConfiguration;
  fullComponentData?: any[];
  className?: string;
}

export default function AudioDiagramDisplay({ configuration, fullComponentData, className = '' }: AudioDiagramDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [vehicleImage, setVehicleImage] = useState<HTMLImageElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentBox | null>(null);

  const vehicleImages: Record<string, string> = {
    'suv': '/assets/suv-transparent.png',
    'truck-single': '/assets/truck-single-transparent.png',
    'truck-extcab': '/assets/truck-extcab-transparent.png',
    'sedan': '/assets/sedan-transparent.png',
    'van': '/assets/van-transparent.png',
    'sedan-hatchback': '/assets/sedan-hatchback-transparent.png'
  };

  const vehicleLabels: Record<string, string> = {
    'suv': 'SUV',
    'truck-single': 'Truck (Single Cab)',
    'truck-extcab': 'Truck (Extended Cab)',
    'sedan': 'Sedan',
    'van': 'Van',
    'sedan-hatchback': 'Sedan Hatchback'
  };

  // Load vehicle image
  useEffect(() => {
    if (!configuration?.vehicleType) return;
    
    const img = new Image();
    img.src = vehicleImages[configuration.vehicleType] || vehicleImages['sedan'];
    img.onload = () => {
      setVehicleImage(img);
    };
  }, [configuration?.vehicleType]);

  // Redraw canvas whenever state changes
  useEffect(() => {
    if (!vehicleImage || !configuration) return;
    redrawCanvas();
  }, [vehicleImage, configuration, isFullscreen]);

  const redrawCanvas = () => {
    const canvas = isFullscreen ? fullscreenCanvasRef.current : canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !configuration) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw vehicle with proper color overlay - MATCH EDITOR EXACTLY
    if (vehicleImage) {
      const imgWidth = 500;  // Exact same as editor
      const imgHeight = 300; // Exact same as editor
      const imgX = (canvas.width - imgWidth) / 2;
      const imgY = (canvas.height - imgHeight) / 2;

      // Create off-screen canvas for vehicle coloring
      const offCanvas = document.createElement('canvas');
      offCanvas.width = imgWidth;
      offCanvas.height = imgHeight;
      const offCtx = offCanvas.getContext('2d');
      
      if (offCtx) {
        // Draw the vehicle image
        offCtx.drawImage(vehicleImage, 0, 0, imgWidth, imgHeight);
        
        // Get image data to process pixels
        const imageData = offCtx.getImageData(0, 0, imgWidth, imgHeight);
        const data = imageData.data;
        
        // Parse the vehicle color
        const vehicleColor = configuration.vehicleColor || '#3b82f6';
        const hexColor = vehicleColor.replace('#', '');
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const alpha = data[i + 3];
          
          if (alpha > 0) {
            // Calculate brightness/luminance
            const brightness = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
            
            // Check if this is a tire (very dark areas) - make them fully black
            const isVeryDark = brightness < 0.15;  // Match editor threshold
            const isRim = brightness > 0.3 && brightness < 0.6 && 
                         Math.abs(red - green) < 20 && Math.abs(green - blue) < 20;
            
            if (isVeryDark) {
              // Make tires completely black - same as editor
              data[i] = 20;      // Very dark gray/black like editor
              data[i + 1] = 20;
              data[i + 2] = 20;
            } else if (isRim) {
              // Make rims silver/gray
              data[i] = 160;    // Silver gray
              data[i + 1] = 160;
              data[i + 2] = 170;
            } else if (brightness > 0.3) {
              // Color the body - only color the lighter parts (the vehicle body)
              // Apply color with some of the original shading preserved
              const colorStrength = 0.7; // How strong the color overlay is
              const shade = brightness * 0.5 + 0.5; // Preserve some shading
              
              data[i] = Math.min(255, r * shade * colorStrength + red * (1 - colorStrength));
              data[i + 1] = Math.min(255, g * shade * colorStrength + green * (1 - colorStrength));
              data[i + 2] = Math.min(255, b * shade * colorStrength + blue * (1 - colorStrength));
            }
            // Dark areas that aren't tires (shadows, details) remain mostly unchanged
          }
        }
        
        // Put the modified image data back
        offCtx.putImageData(imageData, 0, 0);
        
        // Draw the colored vehicle on the main canvas
        ctx.drawImage(offCanvas, imgX, imgY);
      }
    }

    // Draw connections
    if (configuration.connections) {
      configuration.connections.forEach(connection => {
        const component = configuration.components.find(c => c.id === connection.componentId);
        if (!component || !component.isVisible) return;

        // Use the component's line color or connection color or default
        ctx.strokeStyle = connection.color || component.lineColor || '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        if (connection.points && connection.points.length > 0) {
          ctx.moveTo(component.x + 60, component.y + 20);  // Match editor center point
          
          connection.points.forEach((point) => {
            ctx.lineTo(point.x, point.y);
          });
          
          ctx.stroke();

          // Draw arrow at end
          if (connection.points.length > 0) {
            const lastPoint = connection.points[connection.points.length - 1];
            const secondLastPoint = connection.points.length > 1 
              ? connection.points[connection.points.length - 2]
              : { x: component.x + 60, y: component.y + 20 };  // Match editor center point
            
            const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
            ctx.save();
            ctx.translate(lastPoint.x, lastPoint.y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-10, -5);
            ctx.lineTo(-10, 5);
            ctx.closePath();
            ctx.fillStyle = connection.color || component.lineColor || '#fbbf24';
            ctx.fill();
            ctx.restore();
          }
        }
      });
    }

    // Draw component boxes (matching editor exactly)
    if (configuration.components) {
      configuration.components.filter(c => c.isVisible).forEach(component => {
        const boxWidth = 120;  // Match editor exactly
        const boxHeight = 40;  // Match editor exactly
        
        // Check if this component is selected
        const isSelected = selectedComponent?.id === component.id;
        
        // Draw box background
        ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(17, 24, 39, 0.95)';
        ctx.fillRect(component.x, component.y, boxWidth, boxHeight);
        
        // Draw box border with component's line color
        ctx.strokeStyle = isSelected ? '#3b82f6' : (component.lineColor || '#4b5563');
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(component.x, component.y, boxWidth, boxHeight);
        
        // Draw text (matching editor exactly)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';  // Match editor
        ctx.textAlign = 'center';
        ctx.fillText(component.name, component.x + boxWidth/2, component.y + 18);
        
        if (component.brand) {
          ctx.fillStyle = '#9ca3af';
          ctx.font = '10px sans-serif';  // Match editor
          ctx.fillText(component.brand, component.x + boxWidth/2, component.y + 30);
        }
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if click is on any component box
    const clickedComponent = configuration.components?.find(comp => {
      if (!comp.isVisible) return false;
      const boxWidth = 120;  // Match editor
      const boxHeight = 40;  // Match editor
      return x >= comp.x && x <= comp.x + boxWidth &&
             y >= comp.y && y <= comp.y + boxHeight;
    });

    if (clickedComponent) {
      // If we have full component data, find and use that instead
      let componentToSelect = clickedComponent;
      if (fullComponentData && fullComponentData.length > 0) {
        const fullData = fullComponentData.find(fc => 
          fc.id === clickedComponent.id || 
          (fc.category === clickedComponent.name && fc.brand === clickedComponent.brand)
        );
        if (fullData) {
          // Merge the full data with the diagram component data
          componentToSelect = {
            ...clickedComponent,
            ...fullData,
            name: clickedComponent.name, // Keep the diagram's name
            x: clickedComponent.x, // Keep position data
            y: clickedComponent.y,
            isVisible: clickedComponent.isVisible,
            lineColor: clickedComponent.lineColor
          };
        }
      }
      // Toggle selection if clicking the same component
      setSelectedComponent(prev => prev?.id === componentToSelect.id ? null : componentToSelect);
    } else {
      // Clear selection if clicking elsewhere
      setSelectedComponent(null);
    }
  };

  if (!configuration) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 text-center ${className}`}>
        <Car className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No diagram configuration available</p>
        <p className="text-gray-500 text-sm mt-2">
          The owner can create a diagram in their audio system settings
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Car className="h-6 w-6 text-primary-400" />
            <h3 className="text-xl font-bold text-white">
              Audio System Installation Diagram
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              {vehicleLabels[configuration.vehicleType] || 'Vehicle'}
            </span>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle fullscreen"
            >
              <Maximize2 className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={containerRef}
          className="relative bg-gray-900 rounded-lg overflow-hidden flex justify-center items-center"
          style={{ width: '100%', height: '600px' }}>
          <canvas
            ref={canvasRef}
            width={900}
            height={600}
            className="cursor-pointer"
            style={{ maxWidth: '100%', height: 'auto' }}
            onClick={handleCanvasClick}
          />
        </div>

        {/* Component Details */}
        {configuration.components && (
          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-2">
              Showing {configuration.components.filter(c => c.isVisible).length} components
              {selectedComponent && ' • Click component box or click elsewhere to deselect'}
            </div>
            
            {/* Selected Component Details - Full Information Display */}
            {selectedComponent && (
              <div className="mt-4 p-6 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {selectedComponent.type.replace('_', ' ').charAt(0).toUpperCase() + selectedComponent.type.replace('_', ' ').slice(1)}
                    </h3>
                    {selectedComponent.brand && (
                      <p className="text-lg text-primary-400">
                        {selectedComponent.brand} {selectedComponent.model || ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedComponent(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    title="Clear selection"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Display all available component information in a grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Basic Information */}
                  {selectedComponent.brand && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Brand</p>
                      <p className="text-sm text-white font-medium">{selectedComponent.brand}</p>
                    </div>
                  )}
                  {selectedComponent.model && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Model</p>
                      <p className="text-sm text-white font-medium">{selectedComponent.model}</p>
                    </div>
                  )}
                  {(selectedComponent as any).power_watts && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Power</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).power_watts} Watts</p>
                    </div>
                  )}
                  {(selectedComponent as any).quantity && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Quantity</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).quantity}</p>
                    </div>
                  )}
                  {(selectedComponent as any).cost && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Cost</p>
                      <p className="text-sm text-white font-medium">${(selectedComponent as any).cost}</p>
                    </div>
                  )}
                  {(selectedComponent as any).serial_number && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Serial Number</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).serial_number}</p>
                    </div>
                  )}
                  
                  {/* Amplifier Specific */}
                  {(selectedComponent as any).amplifier_type && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Amp Type</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).amplifier_type}</p>
                    </div>
                  )}
                  {(selectedComponent as any).class_type && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Class</p>
                      <p className="text-sm text-white font-medium">Class {(selectedComponent as any).class_type}</p>
                    </div>
                  )}
                  {(selectedComponent as any).channels && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Channels</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).channels}</p>
                    </div>
                  )}
                  {(selectedComponent as any).ohm_load && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Ohm Load</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).ohm_load}Ω</p>
                    </div>
                  )}
                  
                  {/* Speaker/Subwoofer Specific */}
                  {(selectedComponent as any).size && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Size</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).size}</p>
                    </div>
                  )}
                  {(selectedComponent as any).voice_coil && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Voice Coil</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).voice_coil}</p>
                    </div>
                  )}
                  {(selectedComponent as any).impedance && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Impedance</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).impedance}</p>
                    </div>
                  )}
                  {(selectedComponent as any).driver_type && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Driver Type</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).driver_type}</p>
                    </div>
                  )}
                  {(selectedComponent as any).cone_material && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Cone Material</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).cone_material}</p>
                    </div>
                  )}
                  {(selectedComponent as any).magnet_type && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Magnet Type</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).magnet_type}</p>
                    </div>
                  )}
                  {(selectedComponent as any).surround_material && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Surround</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).surround_material}</p>
                    </div>
                  )}
                  {(selectedComponent as any).sensitivity_db && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Sensitivity</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).sensitivity_db} dB</p>
                    </div>
                  )}
                  {(selectedComponent as any).frequency_response && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Frequency Response</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).frequency_response}</p>
                    </div>
                  )}
                  {(selectedComponent as any).mounting_depth && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Mounting Depth</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).mounting_depth}</p>
                    </div>
                  )}
                  {(selectedComponent as any).cutout_diameter && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Cutout Diameter</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).cutout_diameter}</p>
                    </div>
                  )}
                  {(selectedComponent as any).crossover_included && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Crossover</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).crossover_included}</p>
                    </div>
                  )}
                  {(selectedComponent as any).crossover_points && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Crossover Points</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).crossover_points}</p>
                    </div>
                  )}
                  
                  {/* Head Unit Specific */}
                  {(selectedComponent as any).screen_size && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Screen Size</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).screen_size}</p>
                    </div>
                  )}
                  {(selectedComponent as any).display_type && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Display Type</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).display_type}</p>
                    </div>
                  )}
                  {(selectedComponent as any).preamp_outputs && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Preamp Outputs</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).preamp_outputs}</p>
                    </div>
                  )}
                  {(selectedComponent as any).bluetooth && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Bluetooth</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).bluetooth}</p>
                    </div>
                  )}
                  {(selectedComponent as any).apple_carplay && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Apple CarPlay</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).apple_carplay}</p>
                    </div>
                  )}
                  {(selectedComponent as any).android_auto && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Android Auto</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).android_auto}</p>
                    </div>
                  )}
                  
                  {/* Battery/Electrical Specific */}
                  {(selectedComponent as any).capacity && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Capacity</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).capacity}</p>
                    </div>
                  )}
                  {(selectedComponent as any).voltage && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Voltage</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).voltage}</p>
                    </div>
                  )}
                  {(selectedComponent as any).amperage && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Amperage</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).amperage}</p>
                    </div>
                  )}
                  
                  {/* Wiring Specific */}
                  {(selectedComponent as any).gauge && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Wire Gauge</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).gauge}</p>
                    </div>
                  )}
                  {(selectedComponent as any).length && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Length</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).length}</p>
                    </div>
                  )}
                  
                  {/* DSP Specific */}
                  {(selectedComponent as any).inputs && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Inputs</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).inputs}</p>
                    </div>
                  )}
                  {(selectedComponent as any).outputs && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Outputs</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).outputs}</p>
                    </div>
                  )}
                  {(selectedComponent as any).processing && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold uppercase">Processing</p>
                      <p className="text-sm text-white font-medium">{(selectedComponent as any).processing}</p>
                    </div>
                  )}
                  
                  {/* Description - Full Width */}
                  {(selectedComponent as any).description && (
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 col-span-full">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Description</p>
                      <p className="text-sm text-white">{(selectedComponent as any).description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={toggleFullscreen}
        >
          <div 
            className="bg-gray-900 rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-auto border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">
                Audio System Installation Diagram
              </h3>
              <button
                onClick={toggleFullscreen}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center">
              <canvas
                ref={fullscreenCanvasRef}
                width={900}
                height={600}
                className="max-w-full"
                style={{ 
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  aspectRatio: '900 / 600'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}