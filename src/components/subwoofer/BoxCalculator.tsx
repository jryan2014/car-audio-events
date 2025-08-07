import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Calculator, Volume2, Ruler, Package, Wrench, BarChart3, AlertCircle, Info, Layers, Hammer } from 'lucide-react';
import { MATERIALS, CONSTRUCTION_METHODS, BRACING_TYPES } from '../../data/subwooferDatabase';

// TypeScript interfaces for the calculator
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
  fs: number;  // Resonant frequency (Hz)
  qts: number; // Total Q factor
  vas: number; // Equivalent air compliance (L)
  sd: number;  // Effective piston area (cm²)
  xmax: number; // Maximum linear excursion (mm)
  displacement: number; // Driver displacement (L)
}

interface CalculationResults {
  // Box volumes
  grossVolume: number;
  netVolume: number;
  materialVolume: number;
  airSpace: number;
  
  // Performance metrics
  qtc?: number; // Sealed box total Q
  f3?: number;  // -3dB frequency
  fb?: number;  // Port tuning frequency
  
  // Port calculations (for ported boxes)
  portLength?: number;
  portArea?: number;
  portVelocity?: number;
  
  // Construction data
  boardFeet: number;
  surfaceArea: number;
  
  // Validation warnings
  warnings: string[];
}

interface BoxCalculatorProps {
  onSave?: (design: any) => void;
  className?: string;
  selectedSubwoofer?: any;
  subwooferQuantity?: number;
  wiringConfiguration?: 'series' | 'parallel' | 'series_parallel';
}

const BoxCalculator: React.FC<BoxCalculatorProps> = ({ 
  onSave, 
  className = '',
  selectedSubwoofer,
  subwooferQuantity = 1,
  wiringConfiguration = 'parallel'
}) => {
  // State management
  const [boxType, setBoxType] = useState<'sealed' | 'ported' | 'bandpass-4th' | 'bandpass-6th' | 'bandpass-8th'>('sealed');
  const [subCount, setSubCount] = useState<number>(subwooferQuantity);
  const [materialThickness, setMaterialThickness] = useState<0.5 | 0.75 | 1>(0.75);
  const [materialType, setMaterialType] = useState<string>('mdf');
  const [constructionMethod, setConstructionMethod] = useState<string>('wood_glue');
  const [bracingType, setBracingType] = useState<string>('cross_bracing');
  const [calculationMode, setCalculationMode] = useState<'manual' | 'optimal'>('manual');
  
  // Box dimensions (stored in inches internally)
  const [boxDimensions, setBoxDimensions] = useState<BoxDimensions>({
    width: 0,
    height: 0,
    depth: 0
  });
  
  // Track if user has entered values
  const [dimensionsEntered, setDimensionsEntered] = useState({
    width: false,
    height: false,
    depth: false
  });
  
  // Port dimensions (for ported boxes)
  const [portDimensions, setPortDimensions] = useState<PortDimensions>({
    width: 0,
    height: 0,
    length: 0
  });
  
  // Track if user has entered port values
  const [portDimensionsEntered, setPortDimensionsEntered] = useState({
    width: false,
    height: false,
    length: false
  });
  
  // Bandpass chamber volumes (for bandpass boxes)
  const [bandpassChambers, setBandpassChambers] = useState<{
    sealedVolume: number;
    portedVolume: number;
    frontPortedVolume?: number; // For 8th order
  }>({
    sealedVolume: 0.8,
    portedVolume: 1.2,
    frontPortedVolume: 1.0
  });
  
  // Target specifications
  const [targetVolume, setTargetVolume] = useState<number>(0);
  const [targetTuning, setTargetTuning] = useState<number>(0);
  const [targetVolumeEntered, setTargetVolumeEntered] = useState(false);
  const [targetTuningEntered, setTargetTuningEntered] = useState(false);
  
  // Subwoofer specifications - use selected subwoofer specs if available
  const [subSpecs, setSubSpecs] = useState<SubwooferSpecs>(selectedSubwoofer?.specs || {
    fs: 35,      // Typical 12" sub resonant frequency
    qts: 0.4,    // Typical total Q
    vas: 35,     // Equivalent air compliance in liters
    sd: 500,     // Effective piston area in cm²
    xmax: 15,    // Maximum linear excursion in mm
    displacement: 0.1  // Driver displacement in liters
  });

  // Update specs when selected subwoofer changes
  useEffect(() => {
    if (selectedSubwoofer?.specs) {
      setSubSpecs(selectedSubwoofer.specs);
    }
  }, [selectedSubwoofer]);

  // Update subwoofer count when quantity changes
  useEffect(() => {
    setSubCount(subwooferQuantity);
  }, [subwooferQuantity]);

  // Calculate minimum box dimensions based on subwoofer size
  const calculateMinimumBoxSize = useCallback(() => {
    if (!selectedSubwoofer) return null;
    
    const subSize = selectedSubwoofer.size || 12; // inches
    const mountingDepth = selectedSubwoofer.mounting_depth || 8; // inches
    const mountingDiameter = selectedSubwoofer.mounting_diameter || subSize - 0.5; // inches
    
    // Minimum dimensions with some clearance
    const minWidth = Math.max(mountingDiameter + 2, 14); // At least 2" clearance
    const minHeight = Math.max(mountingDiameter + 2, 14);
    const minDepth = Math.max(mountingDepth + 3, 12); // At least 3" behind sub
    
    return { minWidth, minHeight, minDepth };
  }, [selectedSubwoofer]);

  // Physics calculation functions
  const calculateSealedBox = useCallback((volume: number, specs: SubwooferSpecs): Partial<CalculationResults> => {
    // Qtc calculation for sealed box
    const alpha = volume / specs.vas;
    const qtc = specs.qts * Math.sqrt(1 + alpha);
    
    // F3 calculation (-3dB frequency)
    const fc = specs.fs * Math.sqrt(1 + alpha);
    const f3 = fc * Math.sqrt(Math.pow(qtc, 2) - 0.5);
    
    const warnings: string[] = [];
    
    // Performance validation
    if (qtc > 0.9) {
      warnings.push(`Qtc (${qtc.toFixed(2)}) is high - box may sound boomy. Consider smaller volume.`);
    }
    if (qtc < 0.5) {
      warnings.push(`Qtc (${qtc.toFixed(2)}) is low - response may lack impact. Consider larger volume.`);
    }
    if (f3 > 60) {
      warnings.push(`F3 (${f3.toFixed(1)} Hz) is high - limited low frequency response.`);
    }

    return { qtc, f3, warnings };
  }, []);

  const calculatePortedBox = useCallback((
    volume: number, 
    portArea: number, 
    portLength: number, 
    specs: SubwooferSpecs
  ): Partial<CalculationResults> => {
    // Helmholtz resonator frequency calculation
    const c = 343; // Speed of sound at 20°C (m/s)
    const effectiveLength = portLength + (0.613 * Math.sqrt(portArea)); // End correction
    const fb = (c / (2 * Math.PI)) * Math.sqrt(portArea / (volume * effectiveLength * 1000)); // Convert L to m³
    
    // Port velocity calculation at fb
    const portVelocity = (specs.sd * specs.xmax * fb * 0.001) / (portArea * 0.0001); // Convert units
    
    const warnings: string[] = [];
    
    // Validation checks
    if (fb < specs.fs * 0.8) {
      warnings.push(`Port tuning (${fb.toFixed(1)} Hz) is too low relative to Fs (${specs.fs} Hz).`);
    }
    if (fb > specs.fs * 1.2) {
      warnings.push(`Port tuning (${fb.toFixed(1)} Hz) is too high relative to Fs (${specs.fs} Hz).`);
    }
    if (portVelocity > 17) {
      warnings.push(`Port velocity (${portVelocity.toFixed(1)} m/s) is too high - port noise likely.`);
    }
    if (portLength < 1) {
      warnings.push('Port length is too short - consider larger port area or different tuning.');
    }
    if (portLength > Math.min(boxDimensions.width, boxDimensions.height, boxDimensions.depth) * 0.8) {
      warnings.push('Port length may not fit in enclosure dimensions.');
    }

    return { fb, portVelocity, warnings };
  }, [boxDimensions]);

  const calculateBandpass4thOrder = useCallback((
    sealedVolume: number,
    portedVolume: number,
    portArea: number,
    portLength: number,
    specs: SubwooferSpecs
  ): Partial<CalculationResults> => {
    // 4th order bandpass: sealed rear chamber + ported front chamber
    // Calculate sealed chamber Q
    const alpha = sealedVolume / specs.vas;
    const qtc = specs.qts * Math.sqrt(1 + alpha);
    
    // Calculate ported chamber tuning
    const c = 343;
    const effectiveLength = portLength + (0.613 * Math.sqrt(portArea));
    const fb = (c / (2 * Math.PI)) * Math.sqrt(portArea / (portedVolume * effectiveLength * 1000));
    
    // Calculate F3 frequencies (simplified approximation)
    const fcSealed = specs.fs * Math.sqrt(1 + alpha);
    const f3Low = fb * 0.9; // Lower -3dB point
    const f3High = fcSealed * 1.2; // Upper -3dB point
    
    const warnings: string[] = [];
    
    if (qtc > 1.0) {
      warnings.push(`Sealed chamber Qtc (${qtc.toFixed(2)}) is high - may affect response.`);
    }
    if (fb < specs.fs * 0.7 || fb > specs.fs * 1.5) {
      warnings.push(`Port tuning (${fb.toFixed(1)} Hz) may not be optimal for this driver.`);
    }
    
    return { qtc, fb, f3: (f3Low + f3High) / 2, warnings };
  }, []);

  const calculateBandpass6thOrder = useCallback((
    sealedVolume: number,
    portedVolume: number,
    portArea: number,
    portLength: number,
    specs: SubwooferSpecs
  ): Partial<CalculationResults> => {
    // 6th order bandpass: ported rear chamber + ported front chamber
    // Both chambers are ported
    const c = 343;
    
    // Calculate rear chamber tuning (typically lower)
    const rearEffectiveLength = portLength * 1.2; // Rear port typically longer
    const fbRear = (c / (2 * Math.PI)) * Math.sqrt(portArea / (sealedVolume * rearEffectiveLength * 1000));
    
    // Calculate front chamber tuning (typically higher)
    const frontEffectiveLength = portLength + (0.613 * Math.sqrt(portArea));
    const fbFront = (c / (2 * Math.PI)) * Math.sqrt(portArea / (portedVolume * frontEffectiveLength * 1000));
    
    // System tuning is approximately geometric mean
    const fb = Math.sqrt(fbRear * fbFront);
    
    const warnings: string[] = [];
    
    if (fbRear > fbFront) {
      warnings.push('Rear chamber tuning should typically be lower than front chamber.');
    }
    if (Math.abs(fbRear - fbFront) < 10) {
      warnings.push('Chamber tunings are too close - may cause response issues.');
    }
    
    return { fb, f3: fb, warnings };
  }, []);

  const calculateBandpass8thOrder = useCallback((
    sealedVolume: number,
    portedVolume: number,
    frontPortedVolume: number,
    portArea: number,
    portLength: number,
    specs: SubwooferSpecs
  ): Partial<CalculationResults> => {
    // 8th order bandpass: ported rear + sealed middle + ported front
    // Most complex design with three chambers
    const c = 343;
    
    // Calculate rear ported chamber tuning
    const rearEffectiveLength = portLength * 1.3;
    const fbRear = (c / (2 * Math.PI)) * Math.sqrt(portArea / (sealedVolume * rearEffectiveLength * 1000));
    
    // Calculate sealed middle chamber Q
    const alpha = portedVolume / specs.vas;
    const qtc = specs.qts * Math.sqrt(1 + alpha);
    
    // Calculate front ported chamber tuning
    const frontEffectiveLength = portLength * 0.8;
    const fbFront = (c / (2 * Math.PI)) * Math.sqrt(portArea / (frontPortedVolume * frontEffectiveLength * 1000));
    
    // System characteristics
    const fb = Math.cbrt(fbRear * qtc * specs.fs * fbFront); // Approximate system center frequency
    
    const warnings: string[] = [];
    
    if (fbRear > specs.fs) {
      warnings.push('Rear chamber tuning is too high for optimal 8th order response.');
    }
    if (fbFront < specs.fs * 1.5) {
      warnings.push('Front chamber tuning may be too low for extended bandwidth.');
    }
    if (qtc > 0.8) {
      warnings.push(`Middle chamber Qtc (${qtc.toFixed(2)}) is high - may affect passband ripple.`);
    }
    
    return { fb, qtc, f3: fb, warnings };
  }, []);

  // Volume calculations
  const volumeCalculations = useMemo((): CalculationResults => {
    const { width, height, depth } = boxDimensions;
    const thickness = materialThickness;
    
    // Convert inches to internal dimensions
    const internalWidth = width - (2 * thickness);
    const internalHeight = height - (2 * thickness);
    const internalDepth = depth - (2 * thickness);
    
    // Volumes in liters (1 cubic inch = 0.0163871 liters)
    const grossVolume = (width * height * depth) * 0.0163871;
    const netVolume = (internalWidth * internalHeight * internalDepth) * 0.0163871;
    const materialVolume = grossVolume - netVolume;
    
    // Subtract driver displacement and port volume
    const driverDisplacement = subCount * subSpecs.displacement;
    let portVolume = 0;
    
    if (boxType === 'ported') {
      const { width: pw, height: ph, length: pl } = portDimensions;
      portVolume = (pw * ph * pl) * 0.0163871;
    }
    
    const airSpace = netVolume - driverDisplacement - portVolume;
    
    // Surface area for material calculation (square feet)
    const surfaceArea = (2 * (width * height + width * depth + height * depth)) / 144;
    const boardFeet = surfaceArea * thickness / 12;
    
    // Base calculation results
    let results: CalculationResults = {
      grossVolume,
      netVolume,
      materialVolume,
      airSpace,
      boardFeet,
      surfaceArea,
      warnings: []
    };
    
    // Add box-type specific calculations
    if (boxType === 'sealed') {
      const sealedResults = calculateSealedBox(airSpace, subSpecs);
      results = { ...results, ...sealedResults };
    } else if (boxType === 'ported') {
      const portArea = (portDimensions.width * portDimensions.height) * 6.452; // Convert to cm²
      const portedResults = calculatePortedBox(
        airSpace, 
        portArea, 
        portDimensions.length * 2.54, // Convert to cm
        subSpecs
      );
      results = { ...results, ...portedResults, portArea, portLength: portDimensions.length };
    } else if (boxType === 'bandpass-4th') {
      const portArea = (portDimensions.width * portDimensions.height) * 6.452;
      const bandpassResults = calculateBandpass4thOrder(
        bandpassChambers.sealedVolume,
        bandpassChambers.portedVolume,
        portArea,
        portDimensions.length * 2.54,
        subSpecs
      );
      results = { ...results, ...bandpassResults, portArea, portLength: portDimensions.length };
    } else if (boxType === 'bandpass-6th') {
      const portArea = (portDimensions.width * portDimensions.height) * 6.452;
      const bandpassResults = calculateBandpass6thOrder(
        bandpassChambers.sealedVolume,
        bandpassChambers.portedVolume,
        portArea,
        portDimensions.length * 2.54,
        subSpecs
      );
      results = { ...results, ...bandpassResults, portArea, portLength: portDimensions.length };
    } else if (boxType === 'bandpass-8th') {
      const portArea = (portDimensions.width * portDimensions.height) * 6.452;
      const bandpassResults = calculateBandpass8thOrder(
        bandpassChambers.sealedVolume,
        bandpassChambers.portedVolume,
        bandpassChambers.frontPortedVolume || 1.0,
        portArea,
        portDimensions.length * 2.54,
        subSpecs
      );
      results = { ...results, ...bandpassResults, portArea, portLength: portDimensions.length };
    }
    
    // Global warnings
    if (airSpace < 0.5) {
      results.warnings.push('Warning: Net air space is very small. Check dimensions and displacements.');
    }
    if (airSpace > 200) {
      results.warnings.push('Warning: Very large enclosure - may not be practical for car audio.');
    }
    
    return results;
  }, [boxDimensions, materialThickness, subCount, boxType, portDimensions, subSpecs, bandpassChambers, 
      calculateSealedBox, calculatePortedBox, calculateBandpass4thOrder, calculateBandpass6thOrder, calculateBandpass8thOrder]);

  // Calculate optimal dimensions based on target volume
  const calculateOptimalDimensions = useCallback(() => {
    if (calculationMode !== 'optimal') return;
    
    // Golden ratio proportions for optimal internal standing wave behavior
    const ratio1 = 1.0;
    const ratio2 = 1.272; // (1 + sqrt(5))/2 ≈ 1.618, but adjusted for practicality
    const ratio3 = 1.618;
    
    // Account for material thickness and driver displacement
    const targetNetVolume = targetVolume + (subCount * subSpecs.displacement);
    const volumeCubicInches = targetNetVolume / 0.0163871;
    
    // Calculate base dimension
    const baseDimension = Math.cbrt(volumeCubicInches / (ratio1 * ratio2 * ratio3));
    
    // Calculate optimal internal dimensions
    const internalWidth = baseDimension * ratio3;
    const internalHeight = baseDimension * ratio2;  
    const internalDepth = baseDimension * ratio1;
    
    // Add material thickness for external dimensions
    const thickness = materialThickness;
    const optimalDimensions: BoxDimensions = {
      width: Math.round((internalWidth + (2 * thickness)) * 10) / 10,
      height: Math.round((internalHeight + (2 * thickness)) * 10) / 10,
      depth: Math.round((internalDepth + (2 * thickness)) * 10) / 10
    };
    
    setBoxDimensions(optimalDimensions);
  }, [calculationMode, targetVolume, subCount, subSpecs.displacement, materialThickness]);

  // Calculate optimal port dimensions for ported boxes
  const calculateOptimalPort = useCallback(() => {
    if (boxType !== 'ported' && !boxType.startsWith('bandpass')) return;
    
    const targetFb = targetTuning;
    const boxVolume = volumeCalculations.airSpace;
    
    // Use recommended port area (15-20 square inches per cubic foot of net volume)
    const volumeCubicFeet = boxVolume * 0.0353147; // Convert L to ft³
    const recommendedPortArea = volumeCubicFeet * 17; // Square inches
    
    // Calculate port length needed for target tuning
    const c = 13503.9; // Speed of sound in inches per second
    const portArea = recommendedPortArea;
    const volumeCubicInches = boxVolume / 0.0163871;
    
    // Helmholtz equation solved for length
    const targetLength = (c / (2 * Math.PI * targetFb)) ** 2 * (portArea / volumeCubicInches) - (0.613 * Math.sqrt(portArea));
    
    // Optimize port dimensions for the target area
    const aspectRatio = 4; // Height to width ratio for good airflow
    const portWidth = Math.sqrt(portArea / aspectRatio);
    const portHeight = portWidth * aspectRatio;
    
    const optimalPort: PortDimensions = {
      width: Math.round(portWidth * 10) / 10,
      height: Math.round(portHeight * 10) / 10,
      length: Math.max(1, Math.round(targetLength * 10) / 10)
    };
    
    setPortDimensions(optimalPort);
  }, [boxType, targetTuning, volumeCalculations.airSpace]);

  // UI Components
  const InputField = ({ 
    label, 
    value, 
    onChange, 
    unit = '', 
    min = 0, 
    step = 0.1, 
    tooltip = '',
    className = '',
    disabled = false,
    placeholder = '',
    hasValue = true
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    unit?: string;
    min?: number;
    step?: number;
    tooltip?: string;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
    hasValue?: boolean;
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
          value={hasValue && value !== 0 ? value : ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              onChange(0);
            } else {
              onChange(parseFloat(val));
            }
          }}
          onFocus={(e) => e.target.select()}
          min={min}
          step={step}
          disabled={disabled}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-electric-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
  
  // New component for feet and inches input
  const DimensionInput = ({ 
    label, 
    value, // value in inches
    onChange,
    onEntered,
    tooltip = '',
    className = '',
    disabled = false,
    hasValue = false
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    onEntered?: () => void;
    tooltip?: string;
    className?: string;
    disabled?: boolean;
    hasValue?: boolean;
  }) => {
    const feet = Math.floor(value / 12);
    const inches = value % 12;
    
    return (
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
        <div className="flex space-x-2">
          <div className="flex-1">
            <div className="relative">
              <input
                type="number"
                value={hasValue && feet > 0 ? feet : ''}
                onChange={(e) => {
                  const newFeet = parseFloat(e.target.value) || 0;
                  const totalInches = newFeet * 12 + inches;
                  onChange(totalInches);
                  if (onEntered && totalInches > 0) onEntered();
                }}
                onFocus={(e) => e.target.select()}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white pr-8 focus:outline-none focus:ring-2 focus:ring-electric-500 ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                min={0}
                step={1}
                disabled={disabled}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                ft
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                type="number"
                value={hasValue ? inches.toFixed(1) : ''}
                onChange={(e) => {
                  const newInches = parseFloat(e.target.value) || 0;
                  const totalInches = feet * 12 + newInches;
                  onChange(totalInches);
                  if (onEntered && totalInches > 0) onEntered();
                }}
                onFocus={(e) => e.target.select()}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white pr-8 focus:outline-none focus:ring-2 focus:ring-electric-500 ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                min={0}
                max={11.9}
                step={0.1}
                disabled={disabled}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                in
              </span>
            </div>
          </div>
        </div>
        {hasValue && value > 0 && (
          <div className="text-xs text-gray-500">
            Total: {value.toFixed(1)} inches ({(value / 12).toFixed(2)} feet)
          </div>
        )}
      </div>
    );
  };

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
        {isNaN(value) || !isFinite(value) ? '—' : value.toFixed(precision)} {unit}
      </div>
    </div>
  );

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Calculator className="h-8 w-8 text-electric-500" />
          <h2 className="text-2xl font-bold text-white">Subwoofer Box Calculator</h2>
        </div>
        <p className="text-gray-300">
          Professional acoustic calculations for sealed and ported subwoofer enclosures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Box Type Selection */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2 text-electric-500" />
              Box Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Box Type</label>
                <select 
                  value={boxType}
                  onChange={(e) => setBoxType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="sealed">Sealed</option>
                  <option value="ported">Ported</option>
                  <option value="bandpass-4th">Bandpass 4th Order</option>
                  <option value="bandpass-6th">Bandpass 6th Order</option>
                  <option value="bandpass-8th">Bandpass 8th Order</option>
                </select>
              </div>

              {/* Show selected subwoofer info if available */}
              {selectedSubwoofer ? (
                <div className="bg-gradient-to-r from-electric-500/10 to-purple-500/10 rounded-lg p-3 border border-electric-500/30">
                  <div className="text-sm text-gray-400 mb-1">Selected Subwoofer:</div>
                  <div className="text-white font-semibold">
                    {selectedSubwoofer.brand} {selectedSubwoofer.model}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    {selectedSubwoofer.size}" • {selectedSubwoofer.power_rating_rms}W RMS
                  </div>
                  <div className="text-sm text-electric-400 mt-2">
                    Quantity: {subCount} subwoofer{subCount > 1 ? 's' : ''}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
                  <div className="text-sm text-yellow-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    No subwoofer selected
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Go to Subwoofer Selection tab first
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Material Type</label>
                <select 
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {Object.entries(MATERIALS).map(([key, material]) => (
                    <option key={key} value={key}>
                      {material.name} ({material.density} kg/m³)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Material Thickness</label>
                <select 
                  value={materialThickness}
                  onChange={(e) => setMaterialThickness(parseFloat(e.target.value) as 0.5 | 0.75 | 1)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value={0.5}>1/2" (0.5")</option>
                  <option value={0.75}>3/4" (0.75")</option>
                  <option value={1}>1" (1.0")</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Calculation Mode</label>
                <select 
                  value={calculationMode}
                  onChange={(e) => setCalculationMode(e.target.value as 'manual' | 'optimal')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="manual">Manual Dimensions</option>
                  <option value="optimal">Optimal Dimensions</option>
                </select>
              </div>
            </div>
          </div>

          {/* Construction Methods */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Hammer className="h-5 w-5 mr-2 text-electric-500" />
              Construction Methods
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Adhesive Type</label>
                <select 
                  value={constructionMethod}
                  onChange={(e) => setConstructionMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {Object.entries(CONSTRUCTION_METHODS).map(([key, method]) => (
                    <option key={key} value={key}>
                      {method.name} ({method.cure_time}h)
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-400 mt-1">
                  Strength: {CONSTRUCTION_METHODS[constructionMethod]?.strength} | 
                  Application: {CONSTRUCTION_METHODS[constructionMethod]?.application}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Internal Bracing</label>
                <select 
                  value={bracingType}
                  onChange={(e) => setBracingType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {Object.entries(BRACING_TYPES).map(([key, bracing]) => (
                    <option key={key} value={key}>
                      {bracing.name} ({bracing.complexity})
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-400 mt-1">
                  Effectiveness: {BRACING_TYPES[bracingType]?.effectiveness}
                </div>
              </div>
            </div>
          </div>

          {/* Subwoofer Specifications */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Volume2 className="h-5 w-5 mr-2 text-electric-500" />
              Subwoofer Specifications
              {selectedSubwoofer && (
                <span className="ml-auto text-xs text-electric-400">Using selected specs</span>
              )}
            </h3>
            
            {selectedSubwoofer && (
              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg text-xs text-gray-400">
                <Info className="h-4 w-4 inline mr-1" />
                Specifications are loaded from {selectedSubwoofer.brand} {selectedSubwoofer.model}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Fs"
                value={subSpecs.fs}
                onChange={(value) => setSubSpecs({...subSpecs, fs: value})}
                unit="Hz"
                tooltip="Resonant frequency of the driver"
                min={15}
              />
              <InputField
                label="Qts"
                value={subSpecs.qts}
                onChange={(value) => setSubSpecs({...subSpecs, qts: value})}
                tooltip="Total Q factor"
                step={0.01}
                min={0.1}
              />
              <InputField
                label="Vas"
                value={subSpecs.vas}
                onChange={(value) => setSubSpecs({...subSpecs, vas: value})}
                unit="L"
                tooltip="Equivalent air compliance in liters"
                min={1}
              />
              <InputField
                label="Sd"
                value={subSpecs.sd}
                onChange={(value) => setSubSpecs({...subSpecs, sd: value})}
                unit="cm²"
                tooltip="Effective piston area"
                min={50}
              />
              <InputField
                label="Xmax"
                value={subSpecs.xmax}
                onChange={(value) => setSubSpecs({...subSpecs, xmax: value})}
                unit="mm"
                tooltip="Maximum linear excursion"
                min={1}
              />
              <InputField
                label="Displacement"
                value={subSpecs.displacement}
                onChange={(value) => setSubSpecs({...subSpecs, displacement: value})}
                unit="L"
                tooltip="Driver displacement volume"
                step={0.01}
                min={0}
              />
            </div>
          </div>

          {/* Target Settings */}
          {calculationMode === 'optimal' && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Target Settings</h3>
              <div className="space-y-4">
                <InputField
                  label="Target Volume"
                  value={targetVolume}
                  onChange={(value) => {
                    setTargetVolume(value);
                    setTargetVolumeEntered(true);
                  }}
                  hasValue={targetVolumeEntered}
                  unit="L"
                  tooltip="Target net internal air volume"
                  min={0.5}
                  placeholder="Enter volume"
                />
                {(boxType === 'ported' || boxType.startsWith('bandpass')) && (
                  <InputField
                    label="Target Tuning"
                    value={targetTuning}
                    onChange={(value) => {
                      setTargetTuning(value);
                      setTargetTuningEntered(true);
                    }}
                    hasValue={targetTuningEntered}
                    unit="Hz"
                    tooltip="Desired port tuning frequency"
                    min={20}
                    placeholder="Enter frequency"
                  />
                )}
                <button
                  onClick={calculateOptimalDimensions}
                  className="w-full px-4 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white font-semibold transition-colors"
                >
                  Calculate Optimal
                </button>
                {(boxType === 'ported' || boxType.startsWith('bandpass')) && (
                  <button
                    onClick={calculateOptimalPort}
                    className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-semibold transition-colors"
                  >
                    Calculate Port
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dimensions Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Box Dimensions */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Ruler className="h-5 w-5 mr-2 text-electric-500" />
              Box Dimensions
            </h3>
            
            <div className="space-y-4">
              <DimensionInput
                label="Width"
                value={boxDimensions.width}
                onChange={(value) => {
                  setBoxDimensions({...boxDimensions, width: value});
                  setDimensionsEntered({...dimensionsEntered, width: true});
                }}
                hasValue={dimensionsEntered.width}
                disabled={calculationMode === 'optimal'}
                tooltip="Internal width of the enclosure"
              />
              <DimensionInput
                label="Height"
                value={boxDimensions.height}
                onChange={(value) => {
                  setBoxDimensions({...boxDimensions, height: value});
                  setDimensionsEntered({...dimensionsEntered, height: true});
                }}
                hasValue={dimensionsEntered.height}
                disabled={calculationMode === 'optimal'}
                tooltip="Internal height of the enclosure"
              />
              <DimensionInput
                label="Depth"
                value={boxDimensions.depth}
                onChange={(value) => {
                  setBoxDimensions({...boxDimensions, depth: value});
                  setDimensionsEntered({...dimensionsEntered, depth: true});
                }}
                hasValue={dimensionsEntered.depth}
                disabled={calculationMode === 'optimal'}
                tooltip="Internal depth of the enclosure"
              />
            </div>
          </div>

          {/* Port Dimensions */}
          {(boxType === 'ported' || boxType.startsWith('bandpass')) && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Port Dimensions</h3>
              
              <div className="space-y-4">
                <InputField
                  label="Port Width"
                  value={portDimensions.width}
                  onChange={(value) => {
                    setPortDimensions({...portDimensions, width: value});
                    setPortDimensionsEntered({...portDimensionsEntered, width: true});
                  }}
                  hasValue={portDimensionsEntered.width}
                  unit="in"
                  min={1}
                  placeholder="Enter width"
                />
                <InputField
                  label="Port Height"
                  value={portDimensions.height}
                  onChange={(value) => {
                    setPortDimensions({...portDimensions, height: value});
                    setPortDimensionsEntered({...portDimensionsEntered, height: true});
                  }}
                  hasValue={portDimensionsEntered.height}
                  unit="in"
                  min={1}
                  placeholder="Enter height"
                />
                <InputField
                  label="Port Length"
                  value={portDimensions.length}
                  onChange={(value) => {
                    setPortDimensions({...portDimensions, length: value});
                    setPortDimensionsEntered({...portDimensionsEntered, length: true});
                  }}
                  hasValue={portDimensionsEntered.length}
                  unit="in"
                  min={1}
                  placeholder="Enter length"
                />
              </div>
            </div>
          )}

          {/* Bandpass Chamber Volumes */}
          {boxType.startsWith('bandpass') && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-electric-500" />
                Bandpass Chamber Volumes
              </h3>
              
              <div className="space-y-4">
                <InputField
                  label={boxType === 'bandpass-4th' ? "Sealed Rear Chamber" : "Rear Chamber"}
                  value={bandpassChambers.sealedVolume}
                  onChange={(value) => setBandpassChambers({...bandpassChambers, sealedVolume: value})}
                  unit="L"
                  min={0.5}
                  tooltip={boxType === 'bandpass-4th' ? "Volume of the sealed rear chamber" : "Volume of the rear ported chamber"}
                />
                <InputField
                  label={boxType === 'bandpass-8th' ? "Middle Chamber" : "Front Ported Chamber"}
                  value={bandpassChambers.portedVolume}
                  onChange={(value) => setBandpassChambers({...bandpassChambers, portedVolume: value})}
                  unit="L"
                  min={0.5}
                  tooltip={boxType === 'bandpass-8th' ? "Volume of the sealed middle chamber" : "Volume of the front ported chamber"}
                />
                {boxType === 'bandpass-8th' && (
                  <InputField
                    label="Front Ported Chamber"
                    value={bandpassChambers.frontPortedVolume || 1.0}
                    onChange={(value) => setBandpassChambers({...bandpassChambers, frontPortedVolume: value})}
                    unit="L"
                    min={0.5}
                    tooltip="Volume of the front ported chamber (8th order only)"
                  />
                )}
                <div className="p-3 bg-gray-700/30 rounded-lg text-xs text-gray-400">
                  <Info className="h-4 w-4 inline mr-1" />
                  {boxType === 'bandpass-4th' && "4th order: Sealed rear + Ported front"}
                  {boxType === 'bandpass-6th' && "6th order: Ported rear + Ported front"}
                  {boxType === 'bandpass-8th' && "8th order: Ported rear + Sealed middle + Ported front"}
                </div>
              </div>
            </div>
          )}

          {/* Material Calculator */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-electric-500" />
              Material Requirements
            </h3>
            
            <div className="space-y-3">
              <ResultDisplay
                label="Surface Area"
                value={volumeCalculations.surfaceArea}
                unit="ft²"
              />
              <ResultDisplay
                label="Board Feet Required"
                value={volumeCalculations.boardFeet}
                unit="bf"
                highlight
              />
              <div className="text-sm text-gray-400 mt-3">
                * Add 10-15% waste factor when purchasing
              </div>
            </div>
          </div>

          {/* Material Properties */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Layers className="h-5 w-5 mr-2 text-electric-500" />
              Material Properties
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Type:</span>
                <span className="text-white font-medium">{MATERIALS[materialType]?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Density:</span>
                <span className="text-white">{MATERIALS[materialType]?.density} kg/m³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Acoustic Damping:</span>
                <span className="text-white">{MATERIALS[materialType]?.acousticDamping}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Stiffness:</span>
                <span className="text-white">{MATERIALS[materialType]?.stiffness}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Cost:</span>
                <span className="text-white">{MATERIALS[materialType]?.costLevel}</span>
              </div>
              <div className="p-3 bg-gray-700/30 rounded-lg text-xs text-gray-400 mt-3">
                <Info className="h-4 w-4 inline mr-1" />
                {MATERIALS[materialType]?.description}
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Volume Results */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-electric-500" />
              Volume Analysis
            </h3>
            
            <div className="space-y-3">
              <ResultDisplay
                label="Gross Volume"
                value={volumeCalculations.grossVolume}
                unit="L"
              />
              <ResultDisplay
                label="Net Internal Volume"
                value={volumeCalculations.netVolume}
                unit="L"
              />
              <ResultDisplay
                label="Net Air Space"
                value={volumeCalculations.airSpace}
                unit="L"
                highlight
              />
              <ResultDisplay
                label="Material Volume"
                value={volumeCalculations.materialVolume}
                unit="L"
              />
            </div>
          </div>

          {/* Performance Results */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
            
            <div className="space-y-3">
              {boxType === 'sealed' && (
                <>
                  {volumeCalculations.qtc !== undefined && (
                    <ResultDisplay
                      label="Qtc (Total Q)"
                      value={volumeCalculations.qtc}
                      precision={3}
                      highlight
                    />
                  )}
                  {volumeCalculations.f3 !== undefined && (
                    <ResultDisplay
                      label="F3 (-3dB point)"
                      value={volumeCalculations.f3}
                      unit="Hz"
                      precision={1}
                      highlight
                    />
                  )}
                </>
              )}
              
              {(boxType === 'ported' || boxType.startsWith('bandpass')) && (
                <>
                  {volumeCalculations.fb !== undefined && (
                    <ResultDisplay
                      label={boxType.startsWith('bandpass') ? "System Tuning" : "Fb (Tuning Frequency)"}
                      value={volumeCalculations.fb}
                      unit="Hz"
                      precision={1}
                      highlight
                    />
                  )}
                  {volumeCalculations.portArea !== undefined && (
                    <ResultDisplay
                      label="Port Area"
                      value={volumeCalculations.portArea / 6.452}
                      unit="in²"
                      precision={2}
                    />
                  )}
                  {volumeCalculations.portVelocity !== undefined && boxType === 'ported' && (
                    <ResultDisplay
                      label="Port Velocity @ Fb"
                      value={volumeCalculations.portVelocity}
                      unit="m/s"
                      precision={1}
                    />
                  )}
                  {boxType.startsWith('bandpass') && volumeCalculations.qtc !== undefined && (
                    <ResultDisplay
                      label={boxType === 'bandpass-8th' ? "Middle Chamber Qtc" : "Sealed Chamber Qtc"}
                      value={volumeCalculations.qtc}
                      precision={3}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Warnings */}
          {volumeCalculations.warnings.length > 0 && (
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Design Warnings
              </h3>
              <div className="space-y-2">
                {volumeCalculations.warnings.map((warning, index) => (
                  <div key={index} className="text-orange-300 text-sm">
                    • {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calculate & Generate Button */}
          {onSave && (
            <button
              onClick={() => onSave({
                boxType,
                subCount,
                materialType,
                materialThickness,
                constructionMethod,
                bracingType,
                boxDimensions,
                portDimensions: (boxType === 'ported' || boxType.startsWith('bandpass')) ? portDimensions : undefined,
                bandpassChambers: boxType.startsWith('bandpass') ? bandpassChambers : undefined,
                subSpecs,
                calculations: volumeCalculations
              })}
              className="w-full px-6 py-3 bg-gradient-to-r from-electric-500 to-purple-500 hover:from-electric-600 hover:to-purple-600 rounded-lg text-white font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Calculator className="h-5 w-5" />
              Calculate & Generate 3D Model
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoxCalculator;