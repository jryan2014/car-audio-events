import React, { useState, useRef, useEffect } from 'react';
import { Undo, Trash2, Settings, Download, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { HexColorPicker } from 'react-colorful';

export type VehicleType = 'suv' | 'truck-single' | 'truck-extcab' | 'sedan' | 'van' | 'sedan-hatchback';

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
  vehicleType: VehicleType;
  vehicleColor: string;
  components: ComponentBox[];
  connections: LineConnection[];
}

interface AudioDiagramEditorProps {
  audioSystemId: string;
  initialData?: DiagramConfiguration;
  components: any[];
  onSave?: (config: DiagramConfiguration) => void;
}

export default function AudioDiagramEditor({ 
  audioSystemId, 
  initialData, 
  components: systemComponents,
  onSave 
}: AudioDiagramEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialData?.vehicleType || 'sedan');
  const [vehicleColor, setVehicleColor] = useState(initialData?.vehicleColor || '#3b82f6');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [components, setComponents] = useState<ComponentBox[]>([]);
  const [connections, setConnections] = useState<LineConnection[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ componentId: string; points: { x: number; y: number }[] } | null>(null);
  const [vehicleImage, setVehicleImage] = useState<HTMLImageElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showComponentColorPicker, setShowComponentColorPicker] = useState<string | null>(null);
  const [savedConfigurations, setSavedConfigurations] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const vehicleImages = {
    'suv': '/assets/suv-transparent.png',
    'truck-single': '/assets/truck-single-transparent.png',
    'truck-extcab': '/assets/truck-extcab-transparent.png',
    'sedan': '/assets/sedan-transparent.png',
    'van': '/assets/van-transparent.png',
    'sedan-hatchback': '/assets/sedan-hatchback-transparent.png'
  };

  const vehicleLabels = {
    'suv': 'SUV',
    'truck-single': 'Truck (Single Cab)',
    'truck-extcab': 'Truck (Extended Cab)',
    'sedan': 'Sedan',
    'van': 'Van',
    'sedan-hatchback': 'Sedan Hatchback'
  };

  // Initialize components from system components - ONLY RUN ONCE
  useEffect(() => {
    if (initialData?.components && initialData.components.length > 0) {
      setComponents(initialData.components);
      setConnections(initialData.connections || []);
    } else if (systemComponents.length > 0 && components.length === 0) {
      // Only create component boxes if we don't have any yet
      const componentBoxes: ComponentBox[] = systemComponents.map((comp, index) => ({
        id: comp.id || `comp-${Date.now()}-${index}`,
        name: comp.category,
        brand: comp.brand,
        model: comp.model,
        type: comp.category,
        x: 50 + (index % 3) * 200,
        y: 50 + Math.floor(index / 3) * 100,
        isVisible: true,
        lineColor: '#fbbf24' // Default yellow color
      }));
      setComponents(componentBoxes);
    }
    
    // Load saved configurations
    loadConfigurations();
  }, []); // Remove dependencies to prevent re-running

  // Load vehicle image
  useEffect(() => {
    const img = new Image();
    img.src = vehicleImages[vehicleType];
    img.onload = () => {
      setVehicleImage(img);
      redrawCanvas();
    };
  }, [vehicleType]);

  // Redraw canvas whenever state changes
  useEffect(() => {
    redrawCanvas();
  }, [connections, vehicleColor, vehicleImage, selectedComponent, showGrid]);

  // Separate effect for component changes to avoid infinite loops
  useEffect(() => {
    if (components.length > 0) {
      redrawCanvas();
    }
  }, [components]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw vehicle with proper color overlay
    if (vehicleImage) {
      const imgWidth = 500;
      const imgHeight = 300;
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
            
            // Check if this is a tire (very dark) or rim (medium gray)
            const isVeryDark = brightness < 0.15;
            const isRim = brightness > 0.3 && brightness < 0.6 && 
                         Math.abs(red - green) < 20 && Math.abs(green - blue) < 20;
            
            if (isVeryDark) {
              // Keep tires black
              data[i] = 20;     // Very dark gray/black
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
    connections.forEach(connection => {
      const component = components.find(c => c.id === connection.componentId);
      if (!component || !component.isVisible) return;

      // Use the component's line color or default
      ctx.strokeStyle = connection.color || component.lineColor || '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(component.x + 60, component.y + 20);
      
      connection.points.forEach((point, index) => {
        if (index === 0) {
          ctx.lineTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      
      ctx.stroke();

      // Draw arrow at end
      const lastPoint = connection.points[connection.points.length - 1];
      const secondLastPoint = connection.points.length > 1 
        ? connection.points[connection.points.length - 2]
        : { x: component.x + 60, y: component.y + 20 };
      
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
    });

    // Draw current line being drawn
    if (isDrawingLine && currentLine) {
      const component = components.find(c => c.id === currentLine.componentId);
      if (component) {
        // Use component's line color while drawing
        ctx.strokeStyle = component.lineColor || '#60a5fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(component.x + 60, component.y + 20);
        currentLine.points.forEach((point, index) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  const handleComponentDragStart = (e: React.MouseEvent, componentId: string) => {
    e.preventDefault();
    setSelectedComponent(componentId);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && selectedComponent) {
      setComponents(prev => prev.map(comp => 
        comp.id === selectedComponent 
          ? { ...comp, x: x - 60, y: y - 20 }
          : comp
      ));
    } else if (isDrawingLine && currentLine) {
      setCurrentLine({
        ...currentLine,
        points: [...currentLine.points.slice(0, -1), { x, y }]
      });
      redrawCanvas();
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDrawingLine && currentLine) {
      // Add point to current line
      setCurrentLine({
        ...currentLine,
        points: [...currentLine.points, { x, y }]
      });
    }
  };


  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (isDrawingLine && currentLine && currentLine.points.length > 1) {
      // Finish drawing line
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const component = components.find(c => c.id === currentLine.componentId);
      setConnections(prev => [...prev, {
        id: `line-${Date.now()}`,
        componentId: currentLine.componentId,
        points: [...currentLine.points.slice(0, -1), { x, y }],
        color: component?.lineColor || '#fbbf24'
      }]);

      setIsDrawingLine(false);
      setCurrentLine(null);
    }
  };

  const startDrawingLine = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    setIsDrawingLine(true);
    setCurrentLine({
      componentId,
      points: [{ x: component.x + 120, y: component.y + 20 }]
    });
  };


  const undoLastLineSegment = (componentId: string) => {
    // Find the most recent connection for this component
    const componentConnections = connections.filter(c => c.componentId === componentId);
    if (componentConnections.length > 0) {
      const lastConnection = componentConnections[componentConnections.length - 1];
      if (lastConnection.points.length > 1) {
        // Remove the last point from the connection
        setConnections(prev => prev.map(conn => 
          conn.id === lastConnection.id
            ? { ...conn, points: conn.points.slice(0, -1) }
            : conn
        ));
      } else {
        // If only one point left, remove the entire connection
        setConnections(prev => prev.filter(c => c.id !== lastConnection.id));
      }
    }
  };

  const clearComponentLines = (componentId: string) => {
    setConnections(prev => prev.filter(c => c.componentId !== componentId));
  };

  const toggleComponentVisibility = (componentId: string) => {
    setComponents(prev => prev.map(comp => 
      comp.id === componentId 
        ? { ...comp, isVisible: !comp.isVisible }
        : comp
    ));
  };

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_audio_systems')
        .select('diagram_configurations')
        .eq('id', audioSystemId)
        .single();

      if (error) throw error;

      if (data?.diagram_configurations) {
        setSavedConfigurations(data.diagram_configurations);
        
        // Load the first configuration if it exists
        const firstConfig = data.diagram_configurations.find((c: any) => c.slot === 1);
        if (firstConfig?.data) {
          setVehicleType(firstConfig.data.vehicleType || 'sedan');
          setVehicleColor(firstConfig.data.vehicleColor || '#3b82f6');
          setComponents(firstConfig.data.components || []);
          setConnections(firstConfig.data.connections || []);
        }
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  };

  const saveConfiguration = async (slot?: number) => {
    const targetSlot = slot || selectedSlot;
    setSaving(true);
    try {
      const config: DiagramConfiguration = {
        vehicleType,
        vehicleColor,
        components,
        connections
      };

      // Get existing configurations
      const { data: existingData, error: fetchError } = await supabase
        .from('user_audio_systems')
        .select('diagram_configurations')
        .eq('id', audioSystemId)
        .single();

      if (fetchError) throw fetchError;

      let updatedConfigs = existingData?.diagram_configurations || [];
      
      // Find or create configuration for this slot
      const existingIndex = updatedConfigs.findIndex((c: any) => c.slot === targetSlot);
      const newConfig = {
        slot: targetSlot,
        name: `Configuration ${targetSlot}`,
        data: config,
        saved_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        updatedConfigs[existingIndex] = newConfig;
      } else {
        updatedConfigs.push(newConfig);
      }

      // Save to database
      const { error } = await supabase
        .from('user_audio_systems')
        .update({ 
          diagram_configurations: updatedConfigs,
          updated_at: new Date().toISOString()
        })
        .eq('id', audioSystemId);

      if (error) throw error;

      setSavedConfigurations(updatedConfigs);
      toast.success(`Configuration saved to slot ${targetSlot}`);
      if (onSave) onSave(config);
    } catch (error) {
      console.error('Error saving diagram:', error);
      toast.error('Failed to save diagram configuration');
    } finally {
      setSaving(false);
    }
  };

  const loadConfiguration = (slot: number) => {
    setLoading(true);
    try {
      const config = savedConfigurations.find((c: any) => c.slot === slot);
      if (config?.data) {
        setVehicleType(config.data.vehicleType || 'sedan');
        setVehicleColor(config.data.vehicleColor || '#3b82f6');
        setComponents(config.data.components || []);
        setConnections(config.data.connections || []);
        setSelectedSlot(slot);
        toast.success(`Loaded configuration from slot ${slot}`);
      } else {
        toast.error(`No configuration found in slot ${slot}`);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const exportDiagram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary link element
    const link = document.createElement('a');
    link.download = 'audio-diagram.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const resetDiagram = () => {
    if (confirm('Are you sure you want to reset the diagram? This will clear all connections but keep your component positions.')) {
      setConnections([]);
      // DO NOT reset component positions - just clear the lines
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4">
          {/* Vehicle Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none"
            >
              {Object.entries(vehicleLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Color Picker */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-400 mb-1">Vehicle Color</label>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-600"
            >
              <div 
                className="w-6 h-6 rounded border border-gray-600"
                style={{ backgroundColor: vehicleColor }}
              />
              <span className="text-white">{vehicleColor}</span>
            </button>
            {showColorPicker && (
              <div className="absolute z-10 mt-2">
                <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} />
                <div className="relative bg-gray-800 p-4 rounded-lg shadow-xl">
                  <HexColorPicker color={vehicleColor} onChange={setVehicleColor} />
                </div>
              </div>
            )}
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showGrid 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={resetDiagram}
            className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Undo className="h-4 w-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={exportDiagram}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Configuration Slots */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Configuration Slots</h3>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((slot) => {
            const config = savedConfigurations.find((c: any) => c.slot === slot);
            const isCurrentSlot = selectedSlot === slot;
            return (
              <div key={slot} className="bg-gray-900 rounded-lg p-4 border-2 border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">Slot {slot}</h4>
                  {isCurrentSlot && (
                    <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">Current</span>
                  )}
                </div>
                {config ? (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">
                      Saved: {new Date(config.saved_at).toLocaleDateString()}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadConfiguration(slot)}
                        disabled={loading || isCurrentSlot}
                        className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => saveConfiguration(slot)}
                        disabled={saving}
                        className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-500 text-sm italic">Empty slot</p>
                    <button
                      onClick={() => saveConfiguration(slot)}
                      disabled={saving}
                      className="w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Here'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="grid grid-cols-12 gap-6">
        {/* Component List */}
        <div className="col-span-3 bg-gray-800 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-4">Components</h3>
          <div className="space-y-2">
            {components.map(component => (
              <div
                key={component.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  component.isVisible 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-900 border-gray-700 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleComponentVisibility(component.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {component.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    {/* Color Picker for Component */}
                    <div className="relative">
                      <button
                        onClick={() => setShowComponentColorPicker(
                          showComponentColorPicker === component.id ? null : component.id
                        )}
                        className="w-5 h-5 rounded border border-gray-600 hover:border-gray-500"
                        style={{ backgroundColor: component.lineColor || '#fbbf24' }}
                        title="Change line color"
                      />
                      {showComponentColorPicker === component.id && (
                        <div className="absolute z-20 mt-1 left-0">
                          <div className="fixed inset-0" onClick={() => setShowComponentColorPicker(null)} />
                          <div className="relative bg-gray-800 p-2 rounded-lg shadow-xl">
                            <HexColorPicker 
                              color={component.lineColor || '#fbbf24'} 
                              onChange={(color) => {
                                setComponents(prev => prev.map(comp => 
                                  comp.id === component.id 
                                    ? { ...comp, lineColor: color }
                                    : comp
                                ));
                                // Update existing connections with new color
                                setConnections(prev => prev.map(conn =>
                                  conn.componentId === component.id
                                    ? { ...conn, color: color }
                                    : conn
                                ));
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => clearComponentLines(component.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Clear all lines"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className="cursor-move"
                  onMouseDown={(e) => handleComponentDragStart(e, component.id)}
                >
                  <div className="text-white font-medium text-sm">{component.name}</div>
                  {component.brand && (
                    <div className="text-gray-400 text-xs">{component.brand} {component.model}</div>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => startDrawingLine(component.id)}
                    disabled={isDrawingLine}
                    className="w-full px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Draw Line
                  </button>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => undoLastLineSegment(component.id)}
                      className="flex-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                      title="Undo last line segment"
                    >
                      Undo Segment
                    </button>
                    <button
                      onClick={() => clearComponentLines(component.id)}
                      className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      title="Clear all lines for this component"
                    >
                      Clear Lines
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="col-span-9 bg-gray-800 rounded-lg relative overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ height: '600px' }}
        >
          <canvas
            ref={canvasRef}
            width={900}
            height={600}
            className="absolute inset-0 cursor-crosshair"
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
          />
          
          {/* Component Boxes Overlay */}
          {components.filter(c => c.isVisible).map(component => (
            <div
              key={component.id}
              className="absolute bg-gray-900 rounded-lg p-2 cursor-move select-none"
              style={{
                left: `${component.x}px`,
                top: `${component.y}px`,
                width: '120px',
                zIndex: selectedComponent === component.id ? 10 : 1,
                border: `2px solid ${selectedComponent === component.id 
                  ? '#6366f1' 
                  : (component.lineColor || '#4b5563')}`,
                boxShadow: selectedComponent === component.id ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none'
              }}
              onMouseDown={(e) => handleComponentDragStart(e, component.id)}
            >
              <div className="text-white font-medium text-xs">{component.name}</div>
              {component.brand && (
                <div className="text-gray-400 text-xs">{component.brand}</div>
              )}
            </div>
          ))}

          {/* Instructions */}
          {isDrawingLine && (
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <div>Click to add line points, double-click to finish</div>
              <div className="text-xs mt-1">Use the Undo Segment button to remove last point</div>
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-400">
        <p>• Drag components from the left panel onto the canvas</p>
        <p>• Click the color box next to the eye icon to change the line color for each component</p>
        <p>• Click "Draw Line" on a component, then click on the canvas to create connection points</p>
        <p>• Use "Undo Segment" button to remove the last line point, "Clear Lines" to remove all lines for a component</p>
        <p>• Double-click to finish drawing a line</p>
        <p>• Use the eye icon to show/hide components</p>
      </div>
    </div>
  );
}