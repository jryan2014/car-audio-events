import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, AlertTriangle, Info, Wind, Target, Settings } from 'lucide-react';
import type { BoxDimensions, PortDimensions, SubwooferSpecs } from '../../types/subwoofer';

interface PortCalculationResults {
  tuningFrequency: number;
  portVelocity: number;
  portArea: number;
  effectiveLength: number;
  portVolume: number;
  recommendations: string[];
  warnings: string[];
}

interface PortCalculatorProps {
  boxDimensions: BoxDimensions;
  airSpace: number;
  subwooferSpecs: SubwooferSpecs;
  onPortChange: (port: PortDimensions) => void;
  className?: string;
}

const PORT_TYPES = {
  round: {
    name: 'Round Port',
    description: 'Circular port tube',
    areaFormula: 'π × (diameter/2)²',
    minVelocity: 15,
    maxVelocity: 18
  },
  slot: {
    name: 'Slot Port',
    description: 'Rectangular slot port',
    areaFormula: 'width × height',
    minVelocity: 15,
    maxVelocity: 17
  },
  aeroport: {
    name: 'Aero Port',
    description: 'Flared port tube',
    areaFormula: 'π × (diameter/2)²',
    minVelocity: 15,
    maxVelocity: 20
  }
};

const TUNING_RECOMMENDATIONS = {
  sealed_equivalent: { min: 0.7, max: 0.85, description: 'Sealed box equivalent' },
  optimal_spl: { min: 0.85, max: 1.0, description: 'Optimal SPL response' },
  deep_bass: { min: 0.6, max: 0.75, description: 'Deep bass extension' },
  aggressive: { min: 1.0, max: 1.2, description: 'Aggressive/punchy sound' }
};

const PortCalculator: React.FC<PortCalculatorProps> = ({
  boxDimensions,
  airSpace,
  subwooferSpecs,
  onPortChange,
  className = ''
}) => {
  const [portType, setPortType] = useState<'round' | 'slot' | 'aeroport'>('slot');
  const [portCount, setPortCount] = useState(1);
  const [targetTuning, setTargetTuning] = useState(35);
  const [tuningMode, setTuningMode] = useState<'frequency' | 'ratio'>('frequency');
  const [tuningRatio, setTuningRatio] = useState(0.8);
  const [isFlared, setIsFlared] = useState(false);
  const [calculateMode, setCalculateMode] = useState<'length' | 'area'>('length');
  
  // Port dimensions state
  const [portDimensions, setPortDimensions] = useState<PortDimensions>({
    type: 'slot',
    quantity: 1,
    width: 3,
    height: 12,
    length: 6,
    area: 36,
    tuning_frequency: 35
  });
  const [roundPortDiameter, setRoundPortDiameter] = useState(4);

  // Calculate recommended tuning frequency based on Fs
  const recommendedTuning = useMemo(() => {
    const fs = subwooferSpecs.fs;
    return {
      sealed_equivalent: fs * 0.8,
      optimal_spl: fs * 0.9,
      deep_bass: fs * 0.7,
      aggressive: fs * 1.05
    };
  }, [subwooferSpecs.fs]);

  // Calculate effective tuning frequency
  const effectiveTuningFreq = useMemo(() => {
    return tuningMode === 'frequency' ? targetTuning : subwooferSpecs.fs * tuningRatio;
  }, [tuningMode, targetTuning, tuningRatio, subwooferSpecs.fs]);

  // Port area calculations
  const portArea = useMemo(() => {
    switch (portType) {
      case 'round':
        return Math.PI * Math.pow(roundPortDiameter / 2, 2);
      case 'slot':
      case 'aeroport':
        return portDimensions.width * portDimensions.height;
      default:
        return 0;
    }
  }, [portType, portDimensions, roundPortDiameter]);

  // Total port area for multiple ports
  const totalPortArea = useMemo(() => {
    return portArea * portCount;
  }, [portArea, portCount]);

  // Main port calculations
  const calculations = useMemo((): PortCalculationResults => {
    const fb = effectiveTuningFreq;
    const vb = airSpace; // Box volume in liters
    const area = totalPortArea; // Total port area in square inches
    
    // Convert units for calculations
    const volumeM3 = vb * 0.001; // Liters to cubic meters
    const areaCm2 = area * 6.4516; // Square inches to square centimeters
    const areaM2 = areaCm2 * 0.0001; // Square centimeters to square meters
    
    // Physics constants
    const c = 343; // Speed of sound (m/s)
    
    // End correction factor
    const endCorrection = isFlared ? 0.425 : 0.613;
    const deltaL = endCorrection * Math.sqrt(areaM2);
    
    let portLength: number;
    let tuningFreq: number;
    
    if (calculateMode === 'length') {
      // Calculate port length for target frequency
      const targetLengthM = (Math.pow(c / (2 * Math.PI * fb), 2) * areaM2 / volumeM3) - deltaL;
      portLength = Math.max(0.01, targetLengthM * 39.37); // Convert to inches, minimum 0.01m
      tuningFreq = fb;
    } else {
      // Calculate tuning frequency for given length
      const lengthM = portDimensions.length * 0.0254; // Convert inches to meters
      const effectiveLengthM = lengthM + deltaL;
      tuningFreq = (c / (2 * Math.PI)) * Math.sqrt(areaM2 / (volumeM3 * effectiveLengthM));
      portLength = portDimensions.length;
    }
    
    // Port velocity calculation
    const sd = subwooferSpecs.sd * 0.0001; // Convert cm² to m²
    const xmax = subwooferSpecs.xmax * 0.001; // Convert mm to meters
    const portVelocity = (sd * xmax * tuningFreq) / areaM2;
    
    // Port volume calculation
    const portVolume = (area * portLength) * 0.0163871; // Convert cubic inches to liters
    
    const recommendations: string[] = [];
    const warnings: string[] = [];
    
    // Velocity analysis
    const maxSafeVelocity = PORT_TYPES[portType].maxVelocity;
    const minRecommendedVelocity = PORT_TYPES[portType].minVelocity;
    
    if (portVelocity > maxSafeVelocity) {
      warnings.push(`Port velocity (${portVelocity.toFixed(1)} m/s) exceeds safe limit (${maxSafeVelocity} m/s) - port noise likely`);
      recommendations.push('Increase port area or reduce excursion');
    } else if (portVelocity < minRecommendedVelocity && portVelocity > 5) {
      recommendations.push(`Port velocity could be higher for better efficiency (current: ${portVelocity.toFixed(1)} m/s)`);
    }
    
    // Length analysis
    if (portLength < 1) {
      warnings.push('Port length is very short - may not tune accurately');
      recommendations.push('Consider larger port area or higher tuning frequency');
    }
    
    const maxInternalDimension = Math.max(
      boxDimensions.width - 1.5, // Account for material thickness
      boxDimensions.height - 1.5,
      boxDimensions.depth - 1.5
    );
    
    if (portLength > maxInternalDimension) {
      warnings.push('Port length may not fit inside enclosure');
      recommendations.push('Consider L-shaped port or smaller port area');
    }
    
    // Tuning frequency analysis relative to Fs
    const tuningRatio = tuningFreq / subwooferSpecs.fs;
    
    if (tuningRatio < 0.6) {
      warnings.push(`Tuning frequency (${tuningFreq.toFixed(1)} Hz) is very low relative to Fs - may cause instability`);
    } else if (tuningRatio > 1.3) {
      warnings.push(`Tuning frequency (${tuningFreq.toFixed(1)} Hz) is very high relative to Fs - limited low frequency output`);
    }
    
    // Port area recommendations
    const volumeCubicFeet = vb * 0.0353147;
    const recommendedAreaMin = volumeCubicFeet * 12; // 12 sq in per cubic foot
    const recommendedAreaMax = volumeCubicFeet * 20; // 20 sq in per cubic foot
    
    if (area < recommendedAreaMin) {
      recommendations.push(`Consider larger port area (current: ${area.toFixed(1)} sq in, recommended: ${recommendedAreaMin.toFixed(1)}-${recommendedAreaMax.toFixed(1)} sq in)`);
    } else if (area > recommendedAreaMax * 1.5) {
      recommendations.push('Port area is quite large - may reduce efficiency');
    }
    
    // Multiple port recommendations
    if (portCount > 1) {
      if (portCount > 2 && portType === 'round') {
        recommendations.push('Consider using fewer, larger round ports for easier construction');
      }
      if (portCount > 4) {
        warnings.push('Many ports can complicate construction and may cause interaction effects');
      }
    }
    
    return {
      tuningFrequency: tuningFreq,
      portVelocity,
      portArea: area,
      effectiveLength: portLength,
      portVolume,
      recommendations,
      warnings
    };
  }, [
    effectiveTuningFreq,
    airSpace,
    totalPortArea,
    portType,
    isFlared,
    calculateMode,
    portDimensions,
    subwooferSpecs,
    boxDimensions,
    portCount
  ]);

  // Update parent component when port dimensions change
  const updatePortDimensions = useCallback((newDimensions: Partial<PortDimensions>) => {
    const updated = { ...portDimensions, ...newDimensions };
    setPortDimensions(updated);
    onPortChange(updated);
  }, [portDimensions, onPortChange]);

  // Auto-calculate optimal port dimensions
  const calculateOptimalPort = useCallback(() => {
    const volumeCubicFeet = airSpace * 0.0353147;
    const targetArea = volumeCubicFeet * 16; // 16 sq in per cubic foot
    const targetLength = calculations.effectiveLength;
    
    if (portType === 'round') {
      const diameter = Math.sqrt(targetArea / Math.PI) * 2;
      setRoundPortDiameter(Math.round(diameter * 4) / 4); // Round to nearest 1/4"
    } else {
      // For slot port, maintain 4:1 aspect ratio
      const width = Math.sqrt(targetArea / 4);
      const height = width * 4;
      
      updatePortDimensions({
        width: Math.round(width * 4) / 4,
        height: Math.round(height * 4) / 4,
        length: Math.round(targetLength * 4) / 4
      });
    }
  }, [airSpace, calculations.effectiveLength, portType, updatePortDimensions]);

  const InputField = ({ 
    label, 
    value, 
    onChange, 
    unit = '', 
    min = 0, 
    step = 0.1, 
    tooltip = '',
    className = ''
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    unit?: string;
    min?: number;
    step?: number;
    tooltip?: string;
    className?: string;
  }) => (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        {tooltip && (
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
              {tooltip}
            </div>
          </div>
        )}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          step={step}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  const ResultDisplay = ({ 
    label, 
    value, 
    unit = '', 
    precision = 2, 
    highlight = false 
  }: {
    label: string;
    value: number;
    unit?: string;
    precision?: number;
    highlight?: boolean;
  }) => (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-electric-500/20 border border-electric-500/30' : 'bg-gray-700/50'}`}>
      <div className="text-sm text-gray-400">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-electric-400' : 'text-white'}`}>
        {value.toFixed(precision)} {unit}
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Wind className="h-8 w-8 text-electric-500" />
          <h2 className="text-2xl font-bold text-white">Port Calculator</h2>
        </div>
        <p className="text-gray-300">
          Advanced port calculations with velocity analysis and recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Port Type */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-electric-500" />
              Port Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Port Type</label>
                <select
                  value={portType}
                  onChange={(e) => setPortType(e.target.value as 'round' | 'slot' | 'aeroport')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {Object.entries(PORT_TYPES).map(([key, type]) => (
                    <option key={key} value={key}>{type.name}</option>
                  ))}
                </select>
                <div className="text-xs text-gray-400 mt-1">
                  {PORT_TYPES[portType].description}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Number of Ports</label>
                <select
                  value={portCount}
                  onChange={(e) => setPortCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {[1, 2, 3, 4].map(num => (
                    <option key={num} value={num}>{num} Port{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Calculation Mode</label>
                <select
                  value={calculateMode}
                  onChange={(e) => setCalculateMode(e.target.value as 'length' | 'area')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="length">Calculate Length</option>
                  <option value="area">Calculate Frequency</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isFlared}
                  onChange={(e) => setIsFlared(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <label className="text-sm text-gray-300">Flared Port</label>
              </div>
            </div>
          </div>

          {/* Tuning Target */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-electric-500" />
              Tuning Target
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Mode</label>
                <select
                  value={tuningMode}
                  onChange={(e) => setTuningMode(e.target.value as 'frequency' | 'ratio')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="frequency">Target Frequency</option>
                  <option value="ratio">Fs Ratio</option>
                </select>
              </div>

              {tuningMode === 'frequency' ? (
                <InputField
                  label="Target Frequency"
                  value={targetTuning}
                  onChange={setTargetTuning}
                  unit="Hz"
                  min={20}
                  tooltip="Desired port tuning frequency"
                />
              ) : (
                <InputField
                  label="Fs Ratio"
                  value={tuningRatio}
                  onChange={setTuningRatio}
                  step={0.01}
                  min={0.5}
                  tooltip="Ratio of tuning frequency to driver Fs"
                />
              )}

              {/* Quick tuning presets */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Quick Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(recommendedTuning).map(([key, freq]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setTuningMode('frequency');
                        setTargetTuning(Math.round(freq));
                      }}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                    >
                      {key.replace('_', ' ')}: {freq.toFixed(0)}Hz
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Port Dimensions Panel */}
        <div className="space-y-6">
          {/* Dimensions */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Port Dimensions</h3>
            
            <div className="space-y-4">
              {portType === 'round' ? (
                <InputField
                  label="Diameter"
                  value={roundPortDiameter}
                  onChange={setRoundPortDiameter}
                  unit="in"
                  min={1}
                  step={0.25}
                  tooltip="Port tube diameter"
                />
              ) : (
                <>
                  <InputField
                    label="Width"
                    value={portDimensions.width}
                    onChange={(value) => updatePortDimensions({ width: value })}
                    unit="in"
                    min={1}
                    step={0.25}
                    tooltip="Port slot width"
                  />
                  <InputField
                    label="Height"
                    value={portDimensions.height}
                    onChange={(value) => updatePortDimensions({ height: value })}
                    unit="in"
                    min={1}
                    step={0.25}
                    tooltip="Port slot height"
                  />
                </>
              )}
              
              <InputField
                label="Length"
                value={calculateMode === 'length' ? calculations.effectiveLength : portDimensions.length}
                onChange={(value) => updatePortDimensions({ length: value })}
                unit="in"
                min={0.5}
                step={0.25}
                tooltip="Port length/depth"
              />
            </div>

            <button
              onClick={calculateOptimalPort}
              className="w-full mt-4 px-4 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white font-semibold transition-colors"
            >
              Calculate Optimal
            </button>
          </div>

          {/* Port Area Analysis */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Area Analysis</h3>
            
            <div className="space-y-3">
              <ResultDisplay
                label="Individual Port Area"
                value={portArea}
                unit="in²"
                precision={1}
              />
              <ResultDisplay
                label="Total Port Area"
                value={totalPortArea}
                unit="in²"
                precision={1}
                highlight
              />
              <ResultDisplay
                label="Area Formula"
                value={0}
                unit={PORT_TYPES[portType].areaFormula}
                precision={0}
              />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Main Results */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-electric-500" />
              Calculation Results
            </h3>
            
            <div className="space-y-3">
              <ResultDisplay
                label="Tuning Frequency"
                value={calculations.tuningFrequency}
                unit="Hz"
                precision={1}
                highlight
              />
              <ResultDisplay
                label="Port Velocity"
                value={calculations.portVelocity}
                unit="m/s"
                precision={1}
                highlight={calculations.portVelocity > PORT_TYPES[portType].maxVelocity}
              />
              <ResultDisplay
                label="Port Length"
                value={calculations.effectiveLength}
                unit="in"
                precision={2}
              />
              <ResultDisplay
                label="Port Volume"
                value={calculations.portVolume}
                unit="L"
                precision={3}
              />
              <ResultDisplay
                label="Fs Ratio"
                value={calculations.tuningFrequency / subwooferSpecs.fs}
                precision={2}
              />
            </div>
          </div>

          {/* Velocity Guidelines */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Velocity Guidelines</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Safe Maximum:</span>
                <span className="text-white">{PORT_TYPES[portType].maxVelocity} m/s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Recommended Min:</span>
                <span className="text-white">{PORT_TYPES[portType].minVelocity} m/s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current:</span>
                <span className={`font-semibold ${
                  calculations.portVelocity > PORT_TYPES[portType].maxVelocity 
                    ? 'text-red-400' 
                    : calculations.portVelocity < PORT_TYPES[portType].minVelocity 
                    ? 'text-yellow-400' 
                    : 'text-green-400'
                }`}>
                  {calculations.portVelocity.toFixed(1)} m/s
                </span>
              </div>
            </div>

            <div className="mt-4 bg-gray-700/50 p-3 rounded-lg">
              <div className="text-xs text-gray-400">
                Velocities above {PORT_TYPES[portType].maxVelocity} m/s may cause audible port noise, turbulence, and compression.
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {(calculations.recommendations.length > 0 || calculations.warnings.length > 0) && (
            <div className="space-y-4">
              {calculations.warnings.length > 0 && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
                  <h4 className="text-orange-400 font-semibold mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Warnings
                  </h4>
                  <div className="space-y-1">
                    {calculations.warnings.map((warning, index) => (
                      <div key={index} className="text-orange-300 text-sm">
                        • {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calculations.recommendations.length > 0 && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                  <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    Recommendations
                  </h4>
                  <div className="space-y-1">
                    {calculations.recommendations.map((rec, index) => (
                      <div key={index} className="text-blue-300 text-sm">
                        • {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortCalculator;