import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  EyeOff, 
  Layers, 
  Download,
  Move3D,
  Settings,
  Box as BoxIcon,
  MousePointer,
  Maximize2
} from 'lucide-react';

// TypeScript interfaces matching the BoxCalculator component
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

interface Box3DVisualizationSimpleProps {
  boxType: 'sealed' | 'ported' | 'bandpass';
  subCount: 1 | 2 | 3 | 4;
  materialThickness: 0.5 | 0.75 | 1;
  boxDimensions: BoxDimensions;
  portDimensions?: PortDimensions;
  subSpecs: SubwooferSpecs;
  calculations: CalculationResults;
  className?: string;
}

const Box3DVisualizationSimple: React.FC<Box3DVisualizationSimpleProps> = ({
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
  const [subPlacement, setSubPlacement] = useState<'front' | 'top' | 'side'>('front');
  const [rotationX, setRotationX] = useState(-30);
  const [rotationY, setRotationY] = useState(45);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
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
      case 'side':
        setRotationX(0);
        setRotationY(90);
        break;
      case 'top':
        setRotationX(-90);
        setRotationY(0);
        break;
    }
  }, [view3D]);

  // Mouse event handlers for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setView3D('custom'); // Switch to custom view when dragging
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setRotationY(prev => prev + deltaX * 0.5);
    setRotationX(prev => Math.max(-90, Math.min(90, prev - deltaY * 0.5)));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel events with non-passive listener to allow preventDefault
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale(prev => Math.max(0.5, Math.min(2, prev - e.deltaY * 0.001)));
    };

    const container = containerRef.current;
    if (container) {
      // Add non-passive wheel event listener
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  // Calculate subwoofer positions based on count and placement
  const getSubwooferPositions = () => {
    const positions = [];
    const { width, height, depth } = boxDimensions;
    
    // Calculate optimal subwoofer size based on box dimensions and count
    let subDiameter;
    let arrangement = { rows: 1, cols: subCount };
    
    if (subPlacement === 'front' || subPlacement === 'side') {
      const faceWidth = subPlacement === 'front' ? width : depth;
      const faceHeight = height;
      
      // Determine arrangement based on subwoofer count
      if (subCount === 2) {
        arrangement = { rows: 1, cols: 2 };
      } else if (subCount === 3) {
        arrangement = { rows: 1, cols: 3 };
      } else if (subCount === 4) {
        // For 4 subs, use 2x2 grid if it fits better
        if (faceWidth / faceHeight > 1.5) {
          arrangement = { rows: 2, cols: 2 };
        } else {
          arrangement = { rows: 1, cols: 4 };
        }
      }
      
      // Calculate subwoofer diameter based on arrangement
      const maxWidthPerSub = (faceWidth * 0.8) / arrangement.cols;
      const maxHeightPerSub = (faceHeight * 0.8) / arrangement.rows;
      subDiameter = Math.min(maxWidthPerSub, maxHeightPerSub, 12); // Max 12" visual size
      
      // Generate positions
      for (let row = 0; row < arrangement.rows; row++) {
        for (let col = 0; col < arrangement.cols; col++) {
          const index = row * arrangement.cols + col;
          if (index >= subCount) break;
          
          const x = ((col + 0.5) / arrangement.cols) * faceWidth;
          const y = ((row + 0.5) / arrangement.rows) * faceHeight;
          
          positions.push({ x, y, diameter: subDiameter });
        }
      }
    } else { // top placement
      const faceWidth = width;
      const faceDepth = depth;
      
      // Similar logic for top placement
      if (subCount === 4) {
        arrangement = { rows: 2, cols: 2 };
      } else if (subCount === 3) {
        arrangement = { rows: 1, cols: 3 };
      } else {
        arrangement = { rows: 1, cols: subCount };
      }
      
      const maxWidthPerSub = (faceWidth * 0.8) / arrangement.cols;
      const maxDepthPerSub = (faceDepth * 0.8) / arrangement.rows;
      subDiameter = Math.min(maxWidthPerSub, maxDepthPerSub, 12);
      
      for (let row = 0; row < arrangement.rows; row++) {
        for (let col = 0; col < arrangement.cols; col++) {
          const index = row * arrangement.cols + col;
          if (index >= subCount) break;
          
          const x = ((col + 0.5) / arrangement.cols) * faceWidth;
          const z = ((row + 0.5) / arrangement.rows) * faceDepth;
          
          positions.push({ x, y: z, diameter: subDiameter });
        }
      }
    }
    
    return positions;
  };

  // Create a 3D box with proper scaling and subwoofer placement
  const renderSimpleBox = () => {
    const { width, height, depth } = boxDimensions;
    
    // Calculate scale to fit the viewport while showing actual size differences
    const maxDimension = Math.max(width, height, depth);
    const baseScale = Math.min(250 / maxDimension, 8);
    const finalScale = baseScale * scale;
    
    const subPositions = getSubwooferPositions();
    
    return (
      <div 
        ref={containerRef}
        className="relative" 
        style={{ 
          width: '100%', 
          height: '100%',
          perspective: '1000px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab'
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
            transition: isDragging ? 'none' : 'transform 0.5s ease',
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
            <div className="flex items-center justify-center h-full text-electric-400 font-semibold">
              Front
              {showDimensions && (
                <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  {width}" × {height}"
                </div>
              )}
            </div>
            {/* Subwoofers on front face */}
            {subPlacement === 'front' && subPositions.map((pos, i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-gray-600 bg-gradient-to-br from-gray-700 to-gray-900 shadow-inner"
                style={{
                  width: `${pos.diameter * finalScale}px`,
                  height: `${pos.diameter * finalScale}px`,
                  left: `${pos.x * finalScale}px`,
                  top: `${pos.y * finalScale}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Inner cone */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-800 to-black" />
                {/* Center dust cap */}
                <div className="absolute inset-1/3 rounded-full bg-gradient-to-br from-gray-600 to-gray-800" />
              </div>
            ))}
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
            <div className="flex items-center justify-center h-full text-gray-500">
              Back
            </div>
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
            <div className="flex items-center justify-center h-full text-gray-500">
              Top
              {showDimensions && (
                <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  {width}" × {depth}"
                </div>
              )}
            </div>
            {/* Subwoofers on top face */}
            {subPlacement === 'top' && subPositions.map((pos, i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-gray-600 bg-gradient-to-br from-gray-700 to-gray-900 shadow-inner"
                style={{
                  width: `${pos.diameter * finalScale}px`,
                  height: `${pos.diameter * finalScale}px`,
                  left: `${pos.x * finalScale}px`,
                  top: `${pos.y * finalScale}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-800 to-black" />
                <div className="absolute inset-1/3 rounded-full bg-gradient-to-br from-gray-600 to-gray-800" />
              </div>
            ))}
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
            <div className="flex items-center justify-center h-full text-gray-500">
              Bottom
            </div>
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
            <div className="flex items-center justify-center h-full text-gray-500">
              Left
              {showDimensions && (
                <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
                  {depth}" × {height}"
                </div>
              )}
            </div>
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
            <div className="flex items-center justify-center h-full text-gray-500">
              Right
            </div>
            {/* Subwoofers on side face */}
            {subPlacement === 'side' && subPositions.map((pos, i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-gray-600 bg-gradient-to-br from-gray-700 to-gray-900 shadow-inner"
                style={{
                  width: `${pos.diameter * finalScale}px`,
                  height: `${pos.diameter * finalScale}px`,
                  left: `${pos.x * finalScale}px`,
                  top: `${pos.y * finalScale}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-800 to-black" />
                <div className="absolute inset-1/3 rounded-full bg-gradient-to-br from-gray-600 to-gray-800" />
              </div>
            ))}
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
            <h3 className="text-xl font-bold text-white">3D Visualization</h3>
            <span className="text-sm text-gray-400">
              {boxType.charAt(0).toUpperCase() + boxType.slice(1)} Box | {subCount} Sub{subCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <MousePointer className="h-4 w-4" />
            <span>Drag to rotate • Scroll to zoom</span>
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
              {['isometric', 'front', 'side', 'top'].map((preset) => (
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

          {/* Subwoofer Placement */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
              <BoxIcon className="h-4 w-4 mr-2 text-electric-500" />
              Subwoofer Placement
            </h4>
            
            <div className="space-y-2">
              {(['front', 'top', 'side'] as const).map((placement) => (
                <button
                  key={placement}
                  onClick={() => setSubPlacement(placement)}
                  className={`w-full px-3 py-2 rounded-lg text-sm transition-colors capitalize ${
                    subPlacement === placement
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {placement} Facing
                </button>
              ))}
            </div>
          </div>

          {/* Display Controls */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Settings className="h-4 w-4 mr-2 text-electric-500" />
              Display Controls
            </h4>
            
            <div className="space-y-3">
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

          {/* Quick Stats */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-lg font-semibold text-white mb-3">Box Details</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Dimensions:</span>
                <span className="text-white">{boxDimensions.width}" × {boxDimensions.height}" × {boxDimensions.depth}"</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Air Space:</span>
                <span className="text-white">{calculations.airSpace.toFixed(1)}L</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Material:</span>
                <span className="text-white">{calculations.boardFeet.toFixed(1)} bf</span>
              </div>
              
              {boxType === 'sealed' && calculations.qtc && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Qtc:</span>
                  <span className="text-white">{calculations.qtc.toFixed(2)}</span>
                </div>
              )}
              
              {boxType === 'ported' && calculations.fb && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Tuning:</span>
                  <span className="text-white">{calculations.fb.toFixed(1)} Hz</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-400">Subwoofers:</span>
                <span className="text-white">{subCount} × {subPlacement} facing</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="lg:col-span-3">
          <div 
            ref={containerRef}
            className="relative bg-gray-900 rounded-xl border border-gray-700/50 overflow-hidden" 
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
            {!isLoading && renderSimpleBox()}

            {/* Controls overlay */}
            <div className="absolute top-4 right-4 bg-gray-800/80 backdrop-blur rounded-lg p-3 text-xs text-gray-300 space-y-1">
              <div className="flex items-center">
                <MousePointer className="h-3 w-3 mr-2 text-electric-400" />
                <span>Drag to rotate</span>
              </div>
              <div className="flex items-center">
                <Maximize2 className="h-3 w-3 mr-2 text-electric-400" />
                <span>Scroll to zoom</span>
              </div>
              <div className="text-gray-500 mt-2">
                View: {view3D === 'custom' ? 'Custom' : view3D.charAt(0).toUpperCase() + view3D.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Box3DVisualizationSimple;