import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Move3D,
  Settings,
  Box as BoxIcon,
  MousePointer,
  Maximize2,
  Crosshair,
  Layers,
  Lock,
  Unlock,
  Grid3x3,
  Target
} from 'lucide-react';

// TypeScript interfaces
interface BoxDimensions {
  width: number;
  height: number;
  depth: number;
}

interface PortDimensions {
  width: number;
  height: number;
  length: number;
}

interface SubwooferSpecs {
  fs: number;
  qts: number;
  vas: number;
  sd: number;
  xmax: number;
  displacement: number;
}

interface CalculationResults {
  grossVolume: number;
  netVolume: number;
  materialVolume: number;
  airSpace: number;
  qtc?: number;
  f3?: number;
  fb?: number;
  portLength?: number;
  portArea?: number;
  portVelocity?: number;
  boardFeet: number;
  surfaceArea: number;
  warnings: string[];
}

// Individual subwoofer position
interface SubwooferPosition {
  id: number;
  x: number; // Position on face (0-1)
  y: number; // Position on face (0-1)
  face: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';
  depth: 'flush' | 'recessed' | 'internal'; // Mounting depth
  diameter: number;
  locked: boolean;
}

interface Box3DVisualizationAdvancedProps {
  boxType: 'sealed' | 'ported' | 'bandpass';
  subCount: 1 | 2 | 3 | 4;
  materialThickness: 0.5 | 0.75 | 1;
  boxDimensions: BoxDimensions;
  portDimensions?: PortDimensions;
  subSpecs: SubwooferSpecs;
  calculations: CalculationResults;
  className?: string;
}

const Box3DVisualizationAdvanced: React.FC<Box3DVisualizationAdvancedProps> = ({
  boxType,
  subCount,
  materialThickness,
  boxDimensions,
  portDimensions,
  subSpecs,
  calculations,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [view3D, setView3D] = useState('isometric');
  const [showDimensions, setShowDimensions] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [rotationX, setRotationX] = useState(-30);
  const [rotationY, setRotationY] = useState(45);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedSubwoofer, setSelectedSubwoofer] = useState<number | null>(null);
  const [isDraggingSubwoofer, setIsDraggingSubwoofer] = useState(false);
  const [placementMode, setPlacementMode] = useState<'manual' | 'auto'>('auto');
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Initialize subwoofer positions
  const [subwooferPositions, setSubwooferPositions] = useState<SubwooferPosition[]>(() => {
    const positions: SubwooferPosition[] = [];
    const { width, height } = boxDimensions;
    
    // Calculate optimal subwoofer size
    const maxDimension = Math.min(width, height);
    const subDiameter = Math.min(maxDimension * 0.4, 12);
    
    // Auto-arrange subwoofers
    for (let i = 0; i < subCount; i++) {
      let x = 0.5;
      let y = 0.5;
      
      if (subCount === 2) {
        x = 0.25 + (i * 0.5);
      } else if (subCount === 3) {
        x = 0.25 + (i * 0.25);
      } else if (subCount === 4) {
        x = 0.25 + ((i % 2) * 0.5);
        y = 0.25 + (Math.floor(i / 2) * 0.5);
      }
      
      positions.push({
        id: i,
        x,
        y,
        face: 'front',
        depth: 'flush',
        diameter: subDiameter,
        locked: false
      });
    }
    
    return positions;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      setScale(prev => Math.max(0.5, Math.min(2, prev - e.deltaY * 0.001)));
    };

    viewport.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', wheelHandler);
    };
  }, []);

  // Update rotation when view preset changes
  useEffect(() => {
    switch (view3D) {
      case 'isometric':
        setRotationX(-30);
        setRotationY(45);
        break;
      case 'front':
        setRotationX(0);
        setRotationY(0);
        break;
      case 'back':
        setRotationX(0);
        setRotationY(180);
        break;
      case 'side':
        setRotationX(0);
        setRotationY(90);
        break;
      case 'top':
        setRotationX(-90);
        setRotationY(0);
        break;
      case 'bottom':
        setRotationX(90);
        setRotationY(0);
        break;
    }
  }, [view3D]);

  // Handle box rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggingSubwoofer && e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setView3D('custom');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !isDraggingSubwoofer) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setRotationY(prev => prev + deltaX * 0.5);
      setRotationX(prev => Math.max(-90, Math.min(90, prev - deltaY * 0.5)));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingSubwoofer && selectedSubwoofer !== null) {
      // Handle subwoofer dragging
      handleSubwooferDrag(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingSubwoofer(false);
  };


  // Handle subwoofer selection and dragging
  const handleSubwooferClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSubwoofer(id);
    if (placementMode === 'manual' && !subwooferPositions[id].locked) {
      setIsDraggingSubwoofer(true);
    }
  };

  const handleSubwooferDrag = (e: React.MouseEvent) => {
    if (!containerRef.current || selectedSubwoofer === null) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Update subwoofer position
    setSubwooferPositions(prev => {
      const newPositions = [...prev];
      const sub = newPositions[selectedSubwoofer];
      
      if (!sub.locked) {
        // Map screen coordinates to face coordinates based on current view
        // This is simplified - in production you'd need proper 3D to 2D mapping
        sub.x = Math.max(0.1, Math.min(0.9, x));
        sub.y = Math.max(0.1, Math.min(0.9, y));
      }
      
      return newPositions;
    });
  };

  // Change subwoofer face
  const changeSubwooferFace = (id: number, face: SubwooferPosition['face']) => {
    setSubwooferPositions(prev => {
      const newPositions = [...prev];
      newPositions[id].face = face;
      return newPositions;
    });
  };

  // Change subwoofer depth
  const changeSubwooferDepth = (id: number, depth: SubwooferPosition['depth']) => {
    setSubwooferPositions(prev => {
      const newPositions = [...prev];
      newPositions[id].depth = depth;
      return newPositions;
    });
  };

  // Toggle lock on subwoofer
  const toggleSubwooferLock = (id: number) => {
    setSubwooferPositions(prev => {
      const newPositions = [...prev];
      newPositions[id].locked = !newPositions[id].locked;
      return newPositions;
    });
  };

  // Auto-arrange subwoofers
  const autoArrangeSubwoofers = () => {
    const { width, height } = boxDimensions;
    const maxDimension = Math.min(width, height);
    const subDiameter = Math.min(maxDimension * 0.4, 12);
    
    setSubwooferPositions(prev => {
      const newPositions = [...prev];
      
      for (let i = 0; i < subCount; i++) {
        if (!newPositions[i].locked) {
          let x = 0.5;
          let y = 0.5;
          
          if (subCount === 2) {
            x = 0.25 + (i * 0.5);
          } else if (subCount === 3) {
            x = 0.25 + (i * 0.25);
          } else if (subCount === 4) {
            x = 0.25 + ((i % 2) * 0.5);
            y = 0.25 + (Math.floor(i / 2) * 0.5);
          }
          
          newPositions[i] = {
            ...newPositions[i],
            x,
            y,
            face: 'front',
            diameter: subDiameter
          };
        }
      }
      
      return newPositions;
    });
  };

  // Render subwoofer on a face
  const renderSubwooferOnFace = (sub: SubwooferPosition, faceWidth: number, faceHeight: number, scale: number) => {
    const depthOffset = sub.depth === 'recessed' ? -2 : sub.depth === 'internal' ? -5 : 0;
    const opacity = sub.depth === 'internal' ? 0.7 : 1;
    const isSelected = selectedSubwoofer === sub.id;
    
    return (
      <div
        key={sub.id}
        className={`absolute rounded-full border-2 ${
          isSelected ? 'border-electric-400 ring-2 ring-electric-400/50' : 'border-gray-600'
        } bg-gradient-to-br from-gray-700 to-gray-900 shadow-inner transition-all ${
          placementMode === 'manual' && !sub.locked ? 'cursor-move' : 'cursor-pointer'
        }`}
        style={{
          width: `${sub.diameter * scale}px`,
          height: `${sub.diameter * scale}px`,
          left: `${sub.x * faceWidth * scale}px`,
          top: `${sub.y * faceHeight * scale}px`,
          transform: `translate(-50%, -50%) translateZ(${depthOffset}px)`,
          opacity,
          zIndex: isSelected ? 10 : 1
        }}
        onMouseDown={(e) => handleSubwooferClick(sub.id, e)}
      >
        {/* Inner cone */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-800 to-black" />
        {/* Center dust cap */}
        <div className="absolute inset-1/3 rounded-full bg-gradient-to-br from-gray-600 to-gray-800" />
        
        {/* Lock indicator */}
        {sub.locked && (
          <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1">
            <Lock className="h-3 w-3 text-black" />
          </div>
        )}
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -bottom-2 -right-2 bg-electric-500 rounded-full p-1">
            <Target className="h-3 w-3 text-white" />
          </div>
        )}
        
        {/* Subwoofer number */}
        <div className="absolute top-1 left-1 bg-black/50 rounded-full w-5 h-5 flex items-center justify-center text-xs text-white font-bold">
          {sub.id + 1}
        </div>
      </div>
    );
  };

  // Render the 3D box
  const renderBox = () => {
    const { width, height, depth } = boxDimensions;
    const maxDimension = Math.max(width, height, depth);
    const baseScale = Math.min(250 / maxDimension, 8);
    const finalScale = baseScale * scale;
    
    return (
      <div 
        ref={viewportRef}
        className="relative" 
        style={{ 
          width: '100%', 
          height: '100%',
          perspective: '1000px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDraggingSubwoofer ? 'crosshair' : isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
            transition: isDragging || isDraggingSubwoofer ? 'none' : 'transform 0.5s ease',
            width: `${width * finalScale}px`,
            height: `${height * finalScale}px`,
          }}
        >
          {/* Front face */}
          <div
            className="absolute border-2 border-electric-500 bg-gray-800/90"
            style={{
              width: `${width * finalScale}px`,
              height: `${height * finalScale}px`,
              transform: `translateZ(${(depth * finalScale) / 2}px)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-electric-400 font-semibold">
              Front
              {showDimensions && (
                <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  {width}" × {height}"
                </div>
              )}
            </div>
            
            {/* Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  <defs>
                    <pattern id="grid-front" width="10%" height="10%" patternUnits="userSpaceOnUse">
                      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-front)" />
                </svg>
              </div>
            )}
            
            {/* Subwoofers on front face */}
            {subwooferPositions.filter(s => s.face === 'front').map(sub => 
              renderSubwooferOnFace(sub, width, height, finalScale)
            )}
          </div>

          {/* Back face */}
          <div
            className="absolute border-2 border-gray-600 bg-gray-800/90"
            style={{
              width: `${width * finalScale}px`,
              height: `${height * finalScale}px`,
              transform: `translateZ(-${(depth * finalScale) / 2}px) rotateY(180deg)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Back
            </div>
            
            {/* Subwoofers on back face */}
            {subwooferPositions.filter(s => s.face === 'back').map(sub => 
              renderSubwooferOnFace(sub, width, height, finalScale)
            )}
          </div>

          {/* Top face */}
          <div
            className="absolute border-2 border-gray-600 bg-gray-800/90"
            style={{
              width: `${width * finalScale}px`,
              height: `${depth * finalScale}px`,
              transform: `rotateX(90deg) translateZ(${(height * finalScale) / 2}px)`,
              transformOrigin: 'bottom',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Top
              {showDimensions && (
                <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  {width}" × {depth}"
                </div>
              )}
            </div>
            
            {/* Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  <rect width="100%" height="100%" fill="url(#grid-front)" />
                </svg>
              </div>
            )}
            
            {/* Subwoofers on top face */}
            {subwooferPositions.filter(s => s.face === 'top').map(sub => 
              renderSubwooferOnFace(sub, width, depth, finalScale)
            )}
          </div>

          {/* Bottom face */}
          <div
            className="absolute border-2 border-gray-600 bg-gray-800/90"
            style={{
              width: `${width * finalScale}px`,
              height: `${depth * finalScale}px`,
              transform: `rotateX(-90deg) translateZ(${(height * finalScale) / 2}px)`,
              transformOrigin: 'top',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Bottom
            </div>
            
            {/* Subwoofers on bottom face */}
            {subwooferPositions.filter(s => s.face === 'bottom').map(sub => 
              renderSubwooferOnFace(sub, width, depth, finalScale)
            )}
          </div>

          {/* Left face */}
          <div
            className="absolute border-2 border-gray-600 bg-gray-800/90"
            style={{
              width: `${depth * finalScale}px`,
              height: `${height * finalScale}px`,
              transform: `rotateY(-90deg) translateZ(${(width * finalScale) / 2}px)`,
              transformOrigin: 'right',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Left
              {showDimensions && (
                <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  {depth}" × {height}"
                </div>
              )}
            </div>
            
            {/* Subwoofers on left face */}
            {subwooferPositions.filter(s => s.face === 'left').map(sub => 
              renderSubwooferOnFace(sub, depth, height, finalScale)
            )}
          </div>

          {/* Right face */}
          <div
            className="absolute border-2 border-gray-600 bg-gray-800/90"
            style={{
              width: `${depth * finalScale}px`,
              height: `${height * finalScale}px`,
              transform: `rotateY(90deg) translateZ(${(width * finalScale) / 2}px)`,
              transformOrigin: 'left',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Right
            </div>
            
            {/* Subwoofers on right face */}
            {subwooferPositions.filter(s => s.face === 'right').map(sub => 
              renderSubwooferOnFace(sub, depth, height, finalScale)
            )}
          </div>

          {/* Port (for ported boxes) */}
          {boxType === 'ported' && portDimensions && (
            <div
              className="absolute rounded-full border-2 border-purple-500 bg-purple-900/50"
              style={{
                width: `${Math.min(portDimensions.width, 6) * finalScale}px`,
                height: `${Math.min(portDimensions.height, 6) * finalScale}px`,
                transform: `translateZ(${(depth * finalScale) / 2 + 1}px)`,
                bottom: '20%',
                right: '20%',
              }}
            >
              <div className="flex items-center justify-center h-full text-purple-400 text-xs font-semibold">
                Port
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-4 mb-6 border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Camera className="h-6 w-6 text-electric-500" />
            <h3 className="text-xl font-bold text-white">Advanced 3D Visualization</h3>
            <span className="text-sm text-gray-400">
              {boxType.charAt(0).toUpperCase() + boxType.slice(1)} Box | {subCount} Sub{subCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {/* Placement mode toggle */}
            <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setPlacementMode('auto')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  placementMode === 'auto' ? 'bg-electric-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setPlacementMode('manual')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  placementMode === 'manual' ? 'bg-electric-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Manual
              </button>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <MousePointer className="h-4 w-4" />
              <span>Drag to rotate • Scroll to zoom</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* View Presets */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Move3D className="h-4 w-4 mr-2 text-electric-500" />
              View Presets
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              {['isometric', 'front', 'back', 'top', 'bottom', 'side'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setView3D(preset)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors capitalize ${
                    view3D === preset
                      ? 'bg-electric-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Subwoofer Controls */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Target className="h-4 w-4 mr-2 text-electric-500" />
              Subwoofer Controls
            </h4>
            
            {/* Subwoofer selector */}
            <div className="space-y-2 mb-4">
              <label className="text-sm text-gray-400">Select Subwoofer</label>
              <div className="grid grid-cols-2 gap-2">
                {subwooferPositions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubwoofer(sub.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      selectedSubwoofer === sub.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span>Sub {sub.id + 1}</span>
                    {sub.locked && <Lock className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Selected subwoofer controls */}
            {selectedSubwoofer !== null && (
              <div className="space-y-3">
                {/* Face selection */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Face</label>
                  <select
                    value={subwooferPositions[selectedSubwoofer].face}
                    onChange={(e) => changeSubwooferFace(selectedSubwoofer, e.target.value as SubwooferPosition['face'])}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                    disabled={subwooferPositions[selectedSubwoofer].locked}
                  >
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                
                {/* Depth selection */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Mounting Depth</label>
                  <select
                    value={subwooferPositions[selectedSubwoofer].depth}
                    onChange={(e) => changeSubwooferDepth(selectedSubwoofer, e.target.value as SubwooferPosition['depth'])}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                    disabled={subwooferPositions[selectedSubwoofer].locked}
                  >
                    <option value="flush">Flush Mount</option>
                    <option value="recessed">Recessed</option>
                    <option value="internal">Internal (Brace)</option>
                  </select>
                </div>
                
                {/* Position */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Position</label>
                  <div className="text-xs text-gray-300 bg-gray-700 rounded px-2 py-1">
                    X: {(subwooferPositions[selectedSubwoofer].x * 100).toFixed(0)}% 
                    Y: {(subwooferPositions[selectedSubwoofer].y * 100).toFixed(0)}%
                  </div>
                </div>
                
                {/* Lock toggle */}
                <button
                  onClick={() => toggleSubwooferLock(selectedSubwoofer)}
                  className={`w-full px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center ${
                    subwooferPositions[selectedSubwoofer].locked
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {subwooferPositions[selectedSubwoofer].locked ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlocked
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* Auto-arrange button */}
            <button
              onClick={autoArrangeSubwoofers}
              className="w-full mt-4 px-3 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-sm text-white transition-colors"
            >
              Auto-Arrange All
            </button>
          </div>

          {/* Display Controls */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Settings className="h-4 w-4 mr-2 text-electric-500" />
              Display Controls
            </h4>
            
            <div className="space-y-3">
              {/* Show dimensions toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-300 text-sm">Show Dimensions</span>
                <input
                  type="checkbox"
                  checked={showDimensions}
                  onChange={(e) => setShowDimensions(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${showDimensions ? 'bg-electric-500' : 'bg-gray-600'} relative`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${showDimensions ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
              
              {/* Show grid toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-300 text-sm">Show Grid</span>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${showGrid ? 'bg-electric-500' : 'bg-gray-600'} relative`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${showGrid ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
              
              {/* Zoom controls */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Zoom</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                    className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-white text-sm min-w-[3rem] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
                    className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Reset view */}
              <button
                onClick={() => {
                  setView3D('isometric');
                  setScale(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors flex items-center justify-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset View
              </button>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="lg:col-span-3">
          <div 
            ref={containerRef}
            className="relative bg-gray-900 rounded-xl border border-gray-700/50 overflow-hidden select-none" 
            style={{ height: '600px' }}
          >
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading 3D model...</p>
                </div>
              </div>
            )}

            {/* 3D Box */}
            {!isLoading && renderBox()}

            {/* Controls overlay */}
            <div className="absolute top-4 right-4 bg-gray-800/80 backdrop-blur rounded-lg p-3 text-xs text-gray-300 space-y-1">
              <div className="flex items-center">
                <MousePointer className="h-3 w-3 mr-2 text-electric-400" />
                <span>{placementMode === 'manual' ? 'Click sub to drag' : 'Drag to rotate'}</span>
              </div>
              <div className="flex items-center">
                <Maximize2 className="h-3 w-3 mr-2 text-electric-400" />
                <span>Scroll to zoom</span>
              </div>
              <div className="flex items-center">
                <Crosshair className="h-3 w-3 mr-2 text-purple-400" />
                <span>Mode: {placementMode}</span>
              </div>
              <div className="text-gray-500 mt-2">
                View: {view3D === 'custom' ? 'Custom' : view3D.charAt(0).toUpperCase() + view3D.slice(1)}
              </div>
            </div>
            
            {/* Placement instructions */}
            {placementMode === 'manual' && (
              <div className="absolute bottom-4 left-4 bg-purple-500/20 border border-purple-500/50 rounded-lg p-3 max-w-xs">
                <h5 className="text-sm font-semibold text-purple-400 mb-1">Manual Placement Mode</h5>
                <p className="text-xs text-gray-300">
                  1. Select a subwoofer from the controls<br />
                  2. Choose face and depth options<br />
                  3. Click and drag on the box to position<br />
                  4. Lock position when satisfied
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Box3DVisualizationAdvanced;