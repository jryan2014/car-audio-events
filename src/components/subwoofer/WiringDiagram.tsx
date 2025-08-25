import React, { useState, useMemo } from 'react';
import { Zap, Cable, Info, ArrowRight, ArrowLeft, Plus, Minus } from 'lucide-react';
import { getVoiceCoilConfig, calculateWiringOptions } from '../../data/voiceCoilConfigurations';

const AMPLIFIER_OPTIONS = [
  { power: 500, label: '500W RMS' },
  { power: 750, label: '750W RMS' },
  { power: 1000, label: '1000W RMS' },
  { power: 1500, label: '1500W RMS' },
  { power: 2000, label: '2000W RMS' },
  { power: 2500, label: '2500W RMS' },
  { power: 5000, label: '5000W RMS' },
  { power: 7500, label: '7500W RMS' },
  { power: 8000, label: '8000W RMS' },
  { power: 8500, label: '8500W RMS' },
  { power: 10000, label: '10000W RMS' },
  { power: 15000, label: '15000W RMS' }
];

const WIRING_CONFIGURATIONS = {
  series: {
    name: 'Series',
    description: 'Increases total impedance',
    formula: 'Z_total = Z1 + Z2 + Z3 + ...',
    calculate: (impedance: number, quantity: number) => impedance * quantity
  },
  parallel: {
    name: 'Parallel', 
    description: 'Decreases total impedance',
    formula: '1/Z_total = 1/Z1 + 1/Z2 + ...',
    calculate: (impedance: number, quantity: number) => impedance / quantity
  },
  series_parallel: {
    name: 'Series-Parallel',
    description: 'Mixed configuration for specific impedance',
    formula: 'Combination of series and parallel',
    calculate: (impedance: number, quantity: number) => {
      if (quantity % 2 === 0) {
        const seriesPairs = quantity / 2;
        return (impedance * 2) / seriesPairs;
      }
      return impedance;
    }
  }
};

interface WiringDiagramProps {
  selectedSubwoofer: any;
  quantity: number;
  configuration: keyof typeof WIRING_CONFIGURATIONS;
  onNext: () => void;
  onBack: () => void;
  className?: string;
  // Amplifier configuration from parent
  amplifierPower?: number;
  amplifierCount?: number;
  amplifiersLinkable?: boolean;
  // Optional callbacks for state updates
  onAmplifierChange?: (config: { amplifierPower: number; amplifierCount: number; amplifiersLinkable: boolean }) => void;
}

const WiringDiagram: React.FC<WiringDiagramProps> = ({
  selectedSubwoofer,
  quantity,
  configuration,
  onNext,
  onBack,
  className = '',
  amplifierPower: propAmplifierPower,
  amplifierCount: propAmplifierCount,
  amplifiersLinkable: propAmplifiersLinkable,
  onAmplifierChange
}) => {
  // Use props if provided, otherwise use default values
  const [selectedAmplifier, setSelectedAmplifier] = useState<number>(propAmplifierPower || 1000);
  const [amplifierCount, setAmplifierCount] = useState<number>(propAmplifierCount || 1);
  const [amplifiersLinkable, setAmplifiersLinkable] = useState<boolean>(propAmplifiersLinkable !== undefined ? propAmplifiersLinkable : true);

  // Update state when props change
  React.useEffect(() => {
    if (propAmplifierPower !== undefined) {
      setSelectedAmplifier(propAmplifierPower);
    }
  }, [propAmplifierPower]);

  React.useEffect(() => {
    if (propAmplifierCount !== undefined) {
      setAmplifierCount(propAmplifierCount);
    }
  }, [propAmplifierCount]);

  React.useEffect(() => {
    if (propAmplifiersLinkable !== undefined) {
      setAmplifiersLinkable(propAmplifiersLinkable);
    }
  }, [propAmplifiersLinkable]);

  // Get voice coil configuration for the selected subwoofer (moved before conditional return)
  const voiceCoilConfig = selectedSubwoofer ? getVoiceCoilConfig(selectedSubwoofer.model) : { type: 'SVC', coilImpedance: 4 };
  const isDVC = voiceCoilConfig.type === 'DVC';
  const coilImpedance = voiceCoilConfig.coilImpedance || (selectedSubwoofer?.impedance) || 4;
  
  // Calculate impedance based on voice coil type
  const finalImpedance = useMemo(() => {
    if (!selectedSubwoofer) return 4; // Default impedance when no subwoofer selected
    
    if (isDVC && quantity === 1) {
      // DVC single sub can be wired in series or parallel
      if (configuration === 'series') {
        return coilImpedance * 2; // Both coils in series
      } else if (configuration === 'parallel') {
        return coilImpedance / 2; // Both coils in parallel
      }
    }
    // For SVC or multiple subs, use standard calculation
    return WIRING_CONFIGURATIONS[configuration].calculate(
      selectedSubwoofer.impedance || 4, 
      quantity
    );
  }, [configuration, selectedSubwoofer, quantity, isDVC, coilImpedance]);

  if (!selectedSubwoofer) {
    return (
      <div className={`bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 text-center ${className}`}>
        <Cable className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Subwoofer Selected</h3>
        <p className="text-gray-500">
          Please select a subwoofer first to view wiring configurations
        </p>
      </div>
    );
  }

  const totalRMSPower = (selectedSubwoofer.power_rating_rms || 500) * quantity;
  
  // Calculate total system power - sum of all amplifiers regardless of configuration
  // Linkable just means they work together, but all amps still provide power
  const totalSystemPower = selectedAmplifier * amplifierCount;

  // Find optimal amplifier match
  const getAmplifierRecommendation = () => {
    const targetPower = totalRMSPower;
    const availableAmps = AMPLIFIER_OPTIONS.filter(amp => amp.power >= targetPower * 0.75 && amp.power <= targetPower * 1.25);
    return availableAmps.length > 0 ? availableAmps[0] : AMPLIFIER_OPTIONS.find(amp => amp.power >= targetPower) || AMPLIFIER_OPTIONS[AMPLIFIER_OPTIONS.length - 1];
  };

  const recommendedAmp = getAmplifierRecommendation();

  // Generate detailed SVG diagram based on configuration
  // Force re-render on amplifierCount change by using direct function instead of useMemo
  const generateWiringDiagram = () => {
    const subSize = 40;
    const ampWidth = amplifierCount > 8 ? 60 : amplifierCount > 6 ? 70 : 80;
    const ampHeight = 50;
    const ampSpacing = amplifierCount > 8 ? 70 : amplifierCount > 6 ? 80 : 100;
    
    // Handle single subwoofer with multiple amplifiers
    if (quantity === 1) {
      // Adjust width based on amplifier count to ensure all amplifiers are visible
      const totalWidth = Math.max(700, 200 + amplifierCount * ampSpacing);
      const totalHeight = 400;
      
      return (
        <svg key={`single-${amplifierCount}-${amplifiersLinkable}`} width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="mx-auto">
          {/* For separate amps with single sub and DVC, show dual voice coil configuration */}
          {amplifierCount > 1 && !amplifiersLinkable && isDVC ? (
            <g>
              {/* Dual Voice Coil Subwoofer - centered */}
              <circle cx={totalWidth/2} cy="200" r={subSize * 1.2} fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
              <text x={totalWidth/2} y="195" textAnchor="middle" fill="white" fontSize="9">DVC SUB</text>
              
              {/* Voice Coil 1 terminals */}
              <g>
                <text x={totalWidth/2} y="210" textAnchor="middle" fill="white" fontSize="7">Coil 1</text>
                <circle cx={totalWidth/2 - 30} cy="220" r="3" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={totalWidth/2 - 15} cy="220" r="3" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={totalWidth/2 - 32} y="235" fill="#ef4444" fontSize="6">+</text>
                <text x={totalWidth/2 - 17} y="235" fill="#ffffff" fontSize="6">-</text>
              </g>
              
              {/* Voice Coil 2 terminals */}
              <g>
                <text x={totalWidth/2} y="175" textAnchor="middle" fill="white" fontSize="7">Coil 2</text>
                <circle cx={totalWidth/2 + 15} cy="180" r="3" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={totalWidth/2 + 30} cy="180" r="3" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={totalWidth/2 + 13} y="170" fill="#ef4444" fontSize="6">+</text>
                <text x={totalWidth/2 + 28} y="170" fill="#ffffff" fontSize="6">-</text>
              </g>
            </g>
          ) : (
            <g>
              {/* Single Voice Coil or Bridged Configuration - centered */}
              <circle cx={totalWidth/2} cy="200" r={subSize} fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
              <text x={totalWidth/2} y="205" textAnchor="middle" fill="white" fontSize="10">SUB 1</text>
              {/* Subwoofer terminals */}
              <circle cx={totalWidth/2 - 30} cy="200" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
              <text x={totalWidth/2 - 35} y="185" fill="#ef4444" fontSize="8">+</text>
              <circle cx={totalWidth/2 + 30} cy="200" r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
              <text x={totalWidth/2 + 35} y="185" fill="#ffffff" fontSize="8">-</text>
            </g>
          )}
          
          {/* Multiple Amplifiers */}
          {Array.from({length: amplifierCount}, (_, ampIndex) => {
            // Center the amplifiers based on count
            const startX = (totalWidth - (amplifierCount * 100 - 20)) / 2;
            const ampX = startX + ampIndex * 100;
            const ampY = 60;
            
            return (
              <g key={`single-amp-${ampIndex}-of-${amplifierCount}`}>
                <rect x={ampX} y={ampY} width={ampWidth} height={ampHeight} 
                      fill={amplifiersLinkable && amplifierCount > 1 ? "#10b981" : "#8b5cf6"} 
                      stroke={amplifiersLinkable && amplifierCount > 1 ? "#34d399" : "#a78bfa"} 
                      strokeWidth="2" rx="4"/>
                <text x={ampX + ampWidth/2} y={ampY + 20} textAnchor="middle" fill="white" fontSize="9">
                  AMP {ampIndex + 1}
                </text>
                <text x={ampX + ampWidth/2} y={ampY + 30} textAnchor="middle" fill="white" fontSize="7">
                  {selectedAmplifier}W
                </text>
                <text x={ampX + ampWidth/2} y={ampY + 40} textAnchor="middle" fill="white" fontSize="6">
                  {amplifiersLinkable && amplifierCount > 1 ? 'BRIDGED' : amplifierCount > 1 ? `COIL ${ampIndex + 1}` : ''}
                </text>
                
                {/* Amp terminals */}
                <circle cx={ampX + 20} cy={ampY + ampHeight + 5} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={ampX + 60} cy={ampY + ampHeight + 5} r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={ampX + 12} y={ampY + ampHeight + 20} fill="#ef4444" fontSize="7">+</text>
                <text x={ampX + 52} y={ampY + ampHeight + 20} fill="#ffffff" fontSize="7">-</text>
                
                {/* Different wiring based on linkable vs separate */}
                {amplifiersLinkable || amplifierCount === 1 ? (
                  // Bridged/Linked: All amps connect to same terminals
                  <>
                    <path d={`M ${ampX + 20} ${ampY + ampHeight + 5} Q ${(ampX + 20 + totalWidth/2)/2} ${(ampY + 200)/2} ${totalWidth/2 - 30} 200`} 
                          stroke="#ef4444" strokeWidth="3" fill="none"/>
                    <path d={`M ${ampX + 60} ${ampY + ampHeight + 5} Q ${(ampX + 60 + totalWidth/2)/2} ${(ampY + 200)/2} ${totalWidth/2 + 30} 200`} 
                          stroke="#000000" strokeWidth="3" fill="none"/>
                  </>
                ) : (
                  // Separate: Each amp to its own voice coil
                  ampIndex === 0 ? (
                    // First amp to first voice coil
                    <>
                      <path d={`M ${ampX + 20} ${ampY + ampHeight + 5} Q ${(ampX + 20 + totalWidth/2 - 30)/2} ${(ampY + 220)/2} ${totalWidth/2 - 30} 220`} 
                            stroke="#ef4444" strokeWidth="3" fill="none"/>
                      <path d={`M ${ampX + 60} ${ampY + ampHeight + 5} Q ${(ampX + 60 + totalWidth/2 - 15)/2} ${(ampY + 220)/2} ${totalWidth/2 - 15} 220`} 
                            stroke="#000000" strokeWidth="3" fill="none"/>
                    </>
                  ) : (
                    // Second amp to second voice coil
                    <>
                      <path d={`M ${ampX + 20} ${ampY + ampHeight + 5} Q ${(ampX + 20 + totalWidth/2 + 15)/2} ${(ampY + 180)/2} ${totalWidth/2 + 15} 180`} 
                            stroke="#ef4444" strokeWidth="3" fill="none"/>
                      <path d={`M ${ampX + 60} ${ampY + ampHeight + 5} Q ${(ampX + 60 + totalWidth/2 + 30)/2} ${(ampY + 180)/2} ${totalWidth/2 + 30} 180`} 
                            stroke="#000000" strokeWidth="3" fill="none"/>
                    </>
                  )
                )}
              </g>
            );
          })}
          
          {/* Bridged connection for multiple amps */}
          {amplifierCount > 1 && amplifiersLinkable && (
            <g key={`single-bridge-${amplifierCount}`}>
              {/* Show bridging connections between amps */}
              {Array.from({length: amplifierCount - 1}, (_, i) => {
                const startX = (totalWidth - (amplifierCount * 100 - 20)) / 2;
                const x1 = startX + i * 100 + ampWidth;
                const x2 = startX + (i + 1) * 100;
                const y = 60 + ampHeight / 2;
                return (
                  <g key={`bridge-${i}-of-${amplifierCount}`}>
                    {/* Bridge connection line */}
                    <path d={`M ${x1} ${y} L ${x2} ${y}`} 
                          stroke="#10b981" strokeWidth="3" strokeDasharray="5,3"/>
                    {/* Bridge label */}
                    {i === Math.floor((amplifierCount - 2) / 2) && (
                      <text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fill="#10b981" fontSize="7">BRIDGED</text>
                    )}
                  </g>
                );
              })}
              {/* Master/Slave indicators */}
              <text x={50 + ampWidth/2} y={55} textAnchor="middle" fill="#10b981" fontSize="6">MASTER</text>
              {amplifierCount > 1 && (
                <text x={50 + 100 + ampWidth/2} y={55} textAnchor="middle" fill="#10b981" fontSize="6">SLAVE</text>
              )}
            </g>
          )}
          
          {/* Power and impedance info */}
          <g>
            <rect x={totalWidth - 180} y={50} width="170" height="110" fill="#1f2937" stroke="#374151" strokeWidth="1" rx="4"/>
            <text x={totalWidth - 95} y="70" textAnchor="middle" fill="#ffffff" fontSize="10">System Info</text>
            <text x={totalWidth - 170} y="85" fill="#60a5fa" fontSize="8">Load: {finalImpedance.toFixed(1)}Ω</text>
            <text x={totalWidth - 170} y="95" fill="#a78bfa" fontSize="8">Total Power: {totalSystemPower}W</text>
            <text x={totalWidth - 170} y="105" fill="#10b981" fontSize="8">Sub RMS: {selectedSubwoofer.power_rating_rms}W</text>
            <text x={totalWidth - 170} y="115" fill="#f59e0b" fontSize="8">Sub Peak: {selectedSubwoofer.power_rating_peak || selectedSubwoofer.power_rating_rms * 2}W</text>
            <text x={totalWidth - 170} y="125" fill="#ef4444" fontSize="8">{amplifierCount} Amp{amplifierCount > 1 ? 's' : ''} @ {selectedAmplifier}W each</text>
            <text x={totalWidth - 170} y="135" fill="#a855f7" fontSize="8">
              {amplifiersLinkable && amplifierCount > 1 ? 'Bridged Mode' : 
               amplifierCount > 1 ? 'Separate (DVC)' : 'Single Amp'}
            </text>
            <text x={totalWidth - 170} y="145" fill="#10b981" fontSize="8">
              {amplifierCount > 1 && !amplifiersLinkable ? 'DVC Sub Required' : `1 Sub @ ${selectedSubwoofer.impedance}Ω`}
            </text>
          </g>
        </svg>
      );
    }

    if (configuration === 'series') {
      const subsPerRow = Math.min(quantity, 4);
      const rows = Math.ceil(quantity / 4);
      const totalWidth = 800;
      const totalHeight = 350 + (rows * 80);
      
      return (
        <svg width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="mx-auto">
          {/* Battery/Power Source */}
          <g>
            <rect x="30" y="20" width="60" height="35" fill="#ff6b6b" stroke="#ff4444" strokeWidth="2" rx="3"/>
            <text x="60" y="40" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">BATTERY</text>
            <circle cx="45" cy="60" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
            <circle cx="75" cy="60" r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
            <text x="38" y="75" fill="#ef4444" fontSize="8">+12V</text>
            <text x="68" y="75" fill="#ffffff" fontSize="8">GND</text>
          </g>

          {/* Series chain of subwoofers with proper terminal markings */}
          {Array.from({length: quantity}, (_, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const x = 150 + col * 120;
            const y = 220 + row * 80;
            const isFirst = i === 0;
            const isLast = i === quantity - 1;
            
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={subSize * 0.8} fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
                <text x={x} y={y - 5} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">SUB {i+1}</text>
                <text x={x} y={y + 8} textAnchor="middle" fill="white" fontSize="7">{selectedSubwoofer.impedance}Ω</text>
                
                {/* Subwoofer terminals with labels */}
                <circle cx={x - 25} cy={y} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <text x={x - 25} y={y - 10} fill="#ef4444" fontSize="7">+</text>
                
                <circle cx={x + 25} cy={y} r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={x + 25} y={y - 10} fill="#ffffff" fontSize="7">-</text>
                
                {/* Series jumper connections between subs - orange wires */}
                {i < quantity - 1 && (
                  <g>
                    {col < 3 ? (
                      // Horizontal jumper on same row - negative to positive
                      <g>
                        <path d={`M ${x + 25} ${y} L ${x + 55} ${y - 15} L ${x + 95} ${y - 15} L ${x + 125} ${y}`} 
                              stroke="#f59e0b" strokeWidth="3" fill="none" strokeDasharray="none"/>
                        <text x={x + 75} y={y - 20} fill="#f59e0b" fontSize="6">JUMPER</text>
                      </g>
                    ) : (
                      // Vertical jumper to next row
                      row < rows - 1 && (
                        <g>
                          <path d={`M ${x + 25} ${y} L ${x + 35} ${y + 20} L ${x - 80} ${y + 60} L ${150 - 25} ${y + 80}`} 
                                stroke="#f59e0b" strokeWidth="3" fill="none"/>
                          <text x={x - 20} y={y + 40} fill="#f59e0b" fontSize="6">JUMPER</text>
                        </g>
                      )
                    )}
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Amplifier(s) with clean positioning */}
          {Array.from({length: amplifierCount}, (_, ampIndex) => {
            const ampCols = Math.min(amplifierCount, 6);
            const ampX = (totalWidth / 2) - (ampCols * ampSpacing / 2) + ampIndex * ampSpacing;
            const ampY = 100;
            
            return (
              <g key={`series-amp-${ampIndex}`}>
                {/* Power from battery to amp */}
                <path d={`M 45 60 L 45 ${ampY - 5} L ${ampX + 20} ${ampY - 5}`} 
                      stroke="#ef4444" strokeWidth="2" fill="none" opacity="0.5"/>
                <path d={`M 75 60 L 75 ${ampY + 10} L ${ampX + 60} ${ampY + 10} L ${ampX + 60} ${ampY - 5}`} 
                      stroke="#000000" strokeWidth="2" fill="none" opacity="0.5"/>
                
                <rect x={ampX} y={ampY} width={ampWidth} height={ampHeight} 
                      fill={amplifiersLinkable && amplifierCount > 1 ? "#10b981" : "#8b5cf6"} 
                      stroke={amplifiersLinkable && amplifierCount > 1 ? "#34d399" : "#a78bfa"} 
                      strokeWidth="2" rx="4"/>
                <text x={ampX + ampWidth/2} y={ampY + 20} textAnchor="middle" fill="white" fontSize="9">
                  AMP {ampIndex + 1}
                </text>
                <text x={ampX + ampWidth/2} y={ampY + 35} textAnchor="middle" fill="white" fontSize="7">
                  {selectedAmplifier}W
                </text>
                
                {/* Amp output terminals */}
                <circle cx={ampX + 20} cy={ampY + ampHeight + 5} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={ampX + 60} cy={ampY + ampHeight + 5} r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={ampX + 8} y={ampY + ampHeight + 20} fill="#ef4444" fontSize="6">OUT+</text>
                <text x={ampX + 48} y={ampY + ampHeight + 20} fill="#ffffff" fontSize="6">OUT-</text>
              </g>
            );
          })}
          
          {/* Clean wiring from amplifiers to first and last subwoofer */}
          <g>
            {/* Calculate first and last subwoofer positions */}
            {(() => {
              const firstSubX = 150 - 25; // First sub positive terminal
              const firstSubY = 220;
              const lastSubIndex = quantity - 1;
              const lastSubCol = lastSubIndex % 4;
              const lastSubRow = Math.floor(lastSubIndex / 4);
              const lastSubX = 150 + lastSubCol * 120 + 25; // Last sub negative terminal
              const lastSubY = 220 + lastSubRow * 80;
              
              // Get amplifier positions
              const ampCols = Math.min(amplifierCount, 6);
              const firstAmpX = (totalWidth / 2) - (ampCols * ampSpacing / 2) + 20;
              const lastAmpX = (totalWidth / 2) - (ampCols * ampSpacing / 2) + (amplifierCount - 1) * ampSpacing + 60;
              const ampY = 100 + ampHeight + 5;
              
              return (
                <>
                  {/* Positive from first amp to first sub with clean 45-degree angles */}
                  <path d={`M ${firstAmpX} ${ampY} L ${firstAmpX} ${ampY + 30} L ${firstSubX - 20} ${ampY + 30} L ${firstSubX - 20} ${firstSubY - 20} L ${firstSubX} ${firstSubY}`} 
                        stroke="#ef4444" strokeWidth="3" fill="none"/>
                  <text x={firstAmpX + 10} y={ampY + 25} fill="#ef4444" fontSize="7">TO SUB 1 (+)</text>
                  
                  {/* Negative from last amp to last sub with clean 45-degree angles */}
                  <path d={`M ${lastAmpX} ${ampY} L ${lastAmpX} ${ampY + 40} L ${lastSubX + 20} ${ampY + 40} L ${lastSubX + 20} ${lastSubY - 20} L ${lastSubX} ${lastSubY}`} 
                        stroke="#000000" strokeWidth="3" fill="none"/>
                  <text x={lastAmpX - 40} y={ampY + 35} fill="#ffffff" fontSize="7">FROM SUB {quantity} (-)</text>
                </>
              );
            })()}
          </g>
          
          {/* Bridged connection for multiple amps */}
          {amplifierCount > 1 && amplifiersLinkable && (
            <g>
              {Array.from({length: amplifierCount - 1}, (_, i) => {
                const startX = (totalWidth / 2) - (Math.min(amplifierCount, 4) * 100 / 2) + i * 100 + ampWidth;
                const endX = startX + 20;
                return (
                  <g key={`series-link-${i}-of-${amplifierCount}`}>
                    <path d={`M ${startX} ${50 + ampHeight/2} L ${endX} ${50 + ampHeight/2}`} 
                          stroke="#10b981" strokeWidth="3" strokeDasharray="5,5"/>
                  </g>
                );
              })}
              <text x={totalWidth / 2} y={50 + ampHeight/2 - 5} textAnchor="middle" fill="#10b981" fontSize="8">LINKED</text>
            </g>
          )}
          
          {/* System information box */}
          <g>
            <rect x={totalWidth - 150} y={50} width="140" height="100" fill="#1f2937" stroke="#374151" strokeWidth="1" rx="4"/>
            <text x={totalWidth - 80} y="70" textAnchor="middle" fill="#ffffff" fontSize="10">Series Wiring</text>
            <text x={totalWidth - 140} y="85" fill="#60a5fa" fontSize="8">Total Load: {finalImpedance.toFixed(1)}Ω</text>
            <text x={totalWidth - 140} y="95" fill="#a78bfa" fontSize="8">Total Power: {totalSystemPower}W</text>
            <text x={totalWidth - 140} y="105" fill="#10b981" fontSize="8">Sub Power: {totalRMSPower}W RMS</text>
            <text x={totalWidth - 140} y="115" fill="#f59e0b" fontSize="8">Impedance: {selectedSubwoofer.impedance}Ω each</text>
            <text x={totalWidth - 140} y="125" fill="#ef4444" fontSize="8">Connection: {amplifierCount > 1 ? (amplifiersLinkable ? 'Bridged' : 'Separate') : 'Single'}</text>
          </g>
        </svg>
      );
    }

    if (configuration === 'parallel') {
      const totalWidth = 800;
      const subsPerRow = Math.min(quantity, 4);
      const rows = Math.ceil(quantity / 4);
      const totalHeight = 350 + (rows * 80);
      
      return (
        <svg width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="mx-auto">
          {/* Battery/Power Source */}
          <g>
            <rect x="30" y="20" width="60" height="35" fill="#ff6b6b" stroke="#ff4444" strokeWidth="2" rx="3"/>
            <text x="60" y="40" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">BATTERY</text>
            <circle cx="45" cy="60" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
            <circle cx="75" cy="60" r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
            <text x="38" y="75" fill="#ef4444" fontSize="8">+12V</text>
            <text x="68" y="75" fill="#ffffff" fontSize="8">GND</text>
          </g>

          {/* Parallel arrangement of subwoofers with individual wiring */}
          {Array.from({length: quantity}, (_, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const x = 200 + col * 120;
            const y = 240 + row * 80;
            
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={subSize * 0.8} fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
                <text x={x} y={y - 5} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">SUB {i+1}</text>
                <text x={x} y={y + 8} textAnchor="middle" fill="white" fontSize="7">{selectedSubwoofer.impedance}Ω</text>
                
                {/* Subwoofer terminals with labels */}
                <circle cx={x - 25} cy={y} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <text x={x - 25} y={y - 10} fill="#ef4444" fontSize="7">+</text>
                
                <circle cx={x + 25} cy={y} r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={x + 25} y={y - 10} fill="#ffffff" fontSize="7">-</text>
                
                {/* Individual connections to bus bars with clean 45-degree angles */}
                {/* Positive connection */}
                <path d={`M ${x - 25} ${y} L ${x - 25} ${y - 20} L ${150} ${y - 20} L ${150} ${180}`} 
                      stroke="#ef4444" strokeWidth="2" fill="none"/>
                {/* Negative connection */}
                <path d={`M ${x + 25} ${y} L ${x + 25} ${y - 15} L ${650} ${y - 15} L ${650} ${180}`} 
                      stroke="#000000" strokeWidth="2" fill="none"/>
              </g>
            );
          })}
          
          {/* Main positive and negative bus bars */}
          <rect x="140" y="170" width="20" height={100 + (rows - 1) * 80} fill="#ef4444" stroke="#ff6666" strokeWidth="1"/>
          <rect x="640" y="170" width="20" height={100 + (rows - 1) * 80} fill="#333333" stroke="#666666" strokeWidth="1"/>
          <text x="120" y="165" fill="#ef4444" fontSize="9" fontWeight="bold">+ BUS</text>
          <text x="620" y="165" fill="#ffffff" fontSize="9" fontWeight="bold">- BUS</text>
          
          {/* Multiple Amplifiers with proper spacing */}
          {Array.from({length: amplifierCount}, (_, ampIndex) => {
            const ampCols = Math.min(amplifierCount, 6);
            const ampX = (totalWidth / 2) - (ampCols * ampSpacing / 2) + ampIndex * ampSpacing;
            const ampY = 90;
            
            return (
              <g key={`par-amp-${ampIndex}`}>
                {/* Power from battery to amp */}
                <path d={`M 45 60 L 45 ${ampY - 5} L ${ampX + 20} ${ampY - 5}`} 
                      stroke="#ef4444" strokeWidth="2" fill="none" opacity="0.5"/>
                <path d={`M 75 60 L 75 ${ampY + 10} L ${ampX + 60} ${ampY + 10} L ${ampX + 60} ${ampY - 5}`} 
                      stroke="#000000" strokeWidth="2" fill="none" opacity="0.5"/>
                
                <rect x={ampX} y={ampY} width={ampWidth} height={ampHeight} 
                      fill={amplifiersLinkable && amplifierCount > 1 ? "#10b981" : "#8b5cf6"} 
                      stroke={amplifiersLinkable && amplifierCount > 1 ? "#34d399" : "#a78bfa"} 
                      strokeWidth="2" rx="4"/>
                <text x={ampX + ampWidth/2} y={ampY + 20} textAnchor="middle" fill="white" fontSize="9">
                  AMP {ampIndex + 1}
                </text>
                <text x={ampX + ampWidth/2} y={ampY + 30} textAnchor="middle" fill="white" fontSize="7">
                  {selectedAmplifier}W
                </text>
                
                {/* Amp output terminals */}
                <circle cx={ampX + 20} cy={ampY + ampHeight + 5} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={ampX + 60} cy={ampY + ampHeight + 5} r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={ampX + 8} y={ampY + ampHeight + 20} fill="#ef4444" fontSize="6">OUT+</text>
                <text x={ampX + 48} y={ampY + ampHeight + 20} fill="#ffffff" fontSize="6">OUT-</text>
                
                {/* Clean connections from amplifiers to bus bars with 45-degree angles */}
                <path d={`M ${ampX + 20} ${ampY + ampHeight + 5} L ${ampX + 20} ${ampY + ampHeight + 25} L ${150} ${ampY + ampHeight + 25} L ${150} ${170}`} 
                      stroke="#ef4444" strokeWidth="3" fill="none"/>
                <path d={`M ${ampX + 60} ${ampY + ampHeight + 5} L ${ampX + 60} ${ampY + ampHeight + 35} L ${650} ${ampY + ampHeight + 35} L ${650} ${170}`} 
                      stroke="#000000" strokeWidth="3" fill="none"/>
              </g>
            );
          })}
          
          {/* Bridged connection for multiple amps */}
          {amplifierCount > 1 && amplifiersLinkable && (
            <g key={`par-bridge-${amplifierCount}`}>
              {Array.from({length: amplifierCount - 1}, (_, i) => {
                const startX = (totalWidth / 2) - (Math.min(amplifierCount, 4) * 100 / 2) + i * 100 + ampWidth;
                const endX = startX + 20;
                return (
                  <g key={`par-link-${i}-of-${amplifierCount}`}>
                    <path d={`M ${startX} ${50 + ampHeight/2} L ${endX} ${50 + ampHeight/2}`} 
                          stroke="#10b981" strokeWidth="4" strokeDasharray="8,4"/>
                  </g>
                );
              })}
              <text x={totalWidth / 2} y={50 + ampHeight/2 - 8} textAnchor="middle" fill="#10b981" fontSize="8">LINKED</text>
            </g>
          )}
          
          {/* System information box */}
          <g>
            <rect x={totalWidth - 150} y={50} width="140" height="120" fill="#1f2937" stroke="#374151" strokeWidth="1" rx="4"/>
            <text x={totalWidth - 80} y="70" textAnchor="middle" fill="#ffffff" fontSize="10">Parallel Wiring</text>
            <text x={totalWidth - 140} y="85" fill="#60a5fa" fontSize="8">Total Load: {finalImpedance.toFixed(1)}Ω</text>
            <text x={totalWidth - 140} y="95" fill="#a78bfa" fontSize="8">Amp Power: {totalSystemPower}W</text>
            <text x={totalWidth - 140} y="105" fill="#10b981" fontSize="8">Sub Power: {totalRMSPower}W RMS</text>
            <text x={totalWidth - 140} y="115" fill="#f59e0b" fontSize="8">Impedance: {selectedSubwoofer.impedance}Ω each</text>
            <text x={totalWidth - 140} y="125" fill="#ef4444" fontSize="8">{amplifierCount} Amp{amplifierCount > 1 ? 's' : ''} ({amplifiersLinkable && amplifierCount > 1 ? 'Linked' : 'Separate'})</text>
            <text x={totalWidth - 140} y="135" fill="#10b981" fontSize="8">Total Power: {totalSystemPower}W</text>
            <text x={totalWidth - 140} y="145" fill="#a855f7" fontSize="8">{quantity} Subs in Parallel</text>
          </g>
        </svg>
      );
    }

    // Series-parallel configuration
    const totalWidth = 700;
    const totalHeight = 300;
    const pairsCount = Math.ceil(quantity / 2);
    
    return (
      <svg width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="mx-auto">
        {/* Series-parallel arrangement - pairs in series, pairs in parallel */}
        {Array.from({length: quantity}, (_, i) => {
          const pairIndex = Math.floor(i / 2);
          const isFirstInPair = i % 2 === 0;
          const x = 200 + pairIndex * 120 + (isFirstInPair ? 0 : 60);
          const y = 180;
          
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={subSize/2} fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
              <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="8">SUB{i+1}</text>
              
              {/* Subwoofer terminals */}
              <circle cx={x - 15} cy={y} r="3" fill="#ef4444" stroke="#fff"/>
              <circle cx={x + 15} cy={y} r="3" fill="#000000" stroke="#fff"/>
              
              {/* Series connections within pairs */}
              {isFirstInPair && i + 1 < quantity && (
                <line x1={x + 15} y1={y} x2={x + 45} y2={y} stroke="#f59e0b" strokeWidth="3"/>
              )}
            </g>
          );
        })}
        
        {/* Parallel bus bars */}
        <line x1="150" y1="160" x2="150" y2="200" stroke="#ef4444" strokeWidth="6"/>
        <line x1={550} y1="160" x2={550} y2="200" stroke="#000000" strokeWidth="6"/>
        <text x="120" y="155" fill="#ef4444" fontSize="9">+ Bus</text>
        <text x="520" y="155" fill="#ffffff" fontSize="9">- Bus</text>
        
        {/* Connect each series pair to the bus */}
        {Array.from({length: pairsCount}, (_, pairIndex) => {
          const firstX = 200 + pairIndex * 120 - 15;
          const lastX = Math.min(200 + pairIndex * 120 + 60 + 15, 200 + pairIndex * 120 + ((quantity - pairIndex * 2 - 1) * 60) + 15);
          
          return (
            <g key={`pair-${pairIndex}`}>
              {/* Positive from first sub in pair to positive bus */}
              <path d={`M 150 180 L ${firstX} 180`} stroke="#ef4444" strokeWidth="2"/>
              {/* Negative from last sub in pair to negative bus */}
              <path d={`M 550 180 L ${lastX} 180`} stroke="#000000" strokeWidth="2"/>
            </g>
          );
        })}
        
        {/* Multiple Amplifiers */}
        {Array.from({length: amplifierCount}, (_, ampIndex) => {
          const ampCols = Math.min(amplifierCount, 4);
          const ampX = (totalWidth / 2) - (ampCols * 100 / 2) + ampIndex * 100;
          const ampY = 50;
          
          return (
            <g key={`sp-amp-${ampIndex}`}>
              <rect x={ampX} y={ampY} width={ampWidth} height={ampHeight} 
                    fill={amplifiersLinkable && amplifierCount > 1 ? "#10b981" : "#8b5cf6"} 
                    stroke={amplifiersLinkable && amplifierCount > 1 ? "#34d399" : "#a78bfa"} 
                    strokeWidth="2" rx="4"/>
              <text x={ampX + ampWidth/2} y={ampY + 20} textAnchor="middle" fill="white" fontSize="9">
                AMP {ampIndex + 1}
              </text>
              <text x={ampX + ampWidth/2} y={ampY + 35} textAnchor="middle" fill="white" fontSize="7">
                {selectedAmplifier}W
              </text>
              
              {/* Amp terminals */}
              <circle cx={ampX + 20} cy={ampY + ampHeight + 5} r="4" fill="#ef4444"/>
              <circle cx={ampX + 60} cy={ampY + ampHeight + 5} r="4" fill="#000000"/>
              
              {/* Connections from amplifiers to bus bars */}
              <path d={`M ${ampX + 20} ${ampY + ampHeight + 5} L 150 160`} stroke="#ef4444" strokeWidth="3"/>
              <path d={`M ${ampX + 60} ${ampY + ampHeight + 5} L 550 160`} stroke="#000000" strokeWidth="3"/>
            </g>
          );
        })}
        
        {/* System information box */}
        <g>
          <rect x={totalWidth - 150} y={50} width="140" height="110" fill="#1f2937" stroke="#374151" strokeWidth="1" rx="4"/>
          <text x={totalWidth - 80} y="70" textAnchor="middle" fill="#ffffff" fontSize="10">Series-Parallel</text>
          <text x={totalWidth - 140} y="85" fill="#60a5fa" fontSize="8">Total Load: {finalImpedance.toFixed(1)}Ω</text>
          <text x={totalWidth - 140} y="95" fill="#a78bfa" fontSize="8">Amp Power: {totalSystemPower}W</text>
          <text x={totalWidth - 140} y="105" fill="#10b981" fontSize="8">Sub Power: {totalRMSPower}W RMS</text>
          <text x={totalWidth - 140} y="115" fill="#f59e0b" fontSize="8">{pairsCount} pairs wired</text>
          <text x={totalWidth - 140} y="125" fill="#ef4444" fontSize="8">{amplifierCount} Amp{amplifierCount > 1 ? 's' : ''}</text>
          <text x={totalWidth - 140} y="135" fill="#a855f7" fontSize="8">{quantity} Subs Total</text>
        </g>
      </svg>
    );
  };
  
  // Directly generate the diagram without function wrapper to avoid closure issues
  const wiringDiagram = (() => {
    const subSize = 40;
    const ampWidth = amplifierCount > 8 ? 60 : amplifierCount > 6 ? 70 : 80;
    const ampHeight = 50;
    const ampSpacing = amplifierCount > 8 ? 70 : amplifierCount > 6 ? 80 : 100;
    
    // Handle single subwoofer with multiple amplifiers
    if (quantity === 1) {
      // Adjust width based on amplifier count to ensure all amplifiers are visible
      const totalWidth = Math.max(700, 200 + amplifierCount * ampSpacing);
      const totalHeight = 400;
      
      return (
        <svg key={`single-${amplifierCount}-${amplifiersLinkable}-v4`} width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="mx-auto">
          {/* Battery/Power Source */}
          <g>
            <rect x="40" y="30" width="60" height="35" fill="#ff6b6b" stroke="#ff4444" strokeWidth="2" rx="3"/>
            <text x="70" y="50" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">BATTERY</text>
            <circle cx="55" cy="70" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
            <circle cx="85" cy="70" r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
            <text x="48" y="85" fill="#ef4444" fontSize="8">+12V</text>
            <text x="78" y="85" fill="#ffffff" fontSize="8">GND</text>
          </g>

          {/* Power Distribution Bus Bars */}
          <g>
            {/* Positive bus bar */}
            <rect x="120" y="65" width={totalWidth - 240} height="8" fill="#ef4444" stroke="#ff6666" strokeWidth="1"/>
            <text x="125" y="60" fill="#ef4444" fontSize="8">+ Power Distribution</text>
            
            {/* Negative/Ground bus bar */}
            <rect x="120" y="80" width={totalWidth - 240} height="8" fill="#333333" stroke="#666666" strokeWidth="1"/>
            <text x="125" y="100" fill="#ffffff" fontSize="8">- Ground Distribution</text>
            
            {/* Battery to bus connections */}
            <path d="M 55 70 L 120 69" stroke="#ef4444" strokeWidth="3" fill="none"/>
            <path d="M 85 70 L 120 84" stroke="#000000" strokeWidth="3" fill="none"/>
          </g>

          {/* Subwoofer - positioned lower */}
          {amplifierCount > 1 && !amplifiersLinkable && isDVC ? (
            <g>
              {/* Dual Voice Coil Subwoofer */}
              <circle cx={totalWidth/2} cy="280" r={subSize * 1.2} fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
              <text x={totalWidth/2} y="275" textAnchor="middle" fill="white" fontSize="9">DVC SUB</text>
              
              {/* Voice Coil 1 terminals */}
              <g>
                <text x={totalWidth/2 - 25} y="290" textAnchor="middle" fill="white" fontSize="7">Coil 1</text>
                <circle cx={totalWidth/2 - 40} cy="280" r="3" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={totalWidth/2 - 25} cy="280" r="3" fill="#000000" stroke="#fff" strokeWidth="1"/>
              </g>
              
              {/* Voice Coil 2 terminals */}
              <g>
                <text x={totalWidth/2 + 25} y="290" textAnchor="middle" fill="white" fontSize="7">Coil 2</text>
                <circle cx={totalWidth/2 + 25} cy="280" r="3" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={totalWidth/2 + 40} cy="280" r="3" fill="#000000" stroke="#fff" strokeWidth="1"/>
              </g>
            </g>
          ) : (
            <g>
              {/* Single Voice Coil or Bridged Configuration */}
              <circle cx={totalWidth/2} cy="280" r={subSize} fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/>
              <text x={totalWidth/2} y="285" textAnchor="middle" fill="white" fontSize="10">SUB 1</text>
              {/* Subwoofer terminals */}
              <circle cx={totalWidth/2 - 30} cy="280" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
              <text x={totalWidth/2 - 35} y="265" fill="#ef4444" fontSize="8">+</text>
              <circle cx={totalWidth/2 + 30} cy="280" r="4" fill="#000000" stroke="#fff" strokeWidth="1"/>
              <text x={totalWidth/2 + 35} y="265" fill="#ffffff" fontSize="8">-</text>
            </g>
          )}
          
          {/* Multiple Amplifiers with clean professional wiring */}
          {[...Array(amplifierCount)].map((_, ampIndex) => {
            // Calculate amplifier positions with proper spacing
            const startX = (totalWidth - (amplifierCount * ampSpacing - 20)) / 2;
            const ampX = startX + ampIndex * ampSpacing;
            const ampY = 140;
            
            return (
              <g key={`amp-${ampIndex}`}>
                {/* Power connections from bus to amplifier with clean 45-degree angles */}
                {/* Positive power from bus to amp */}
                <path d={`M ${ampX + 20} ${ampY - 5} L ${ampX + 20} ${ampY - 20} L ${ampX + 20} ${73}`} 
                      stroke="#ef4444" strokeWidth="2" fill="none"/>
                {/* Negative power from bus to amp */}
                <path d={`M ${ampX + 60} ${ampY - 5} L ${ampX + 60} ${ampY - 15} L ${ampX + 60} ${88}`} 
                      stroke="#000000" strokeWidth="2" fill="none"/>
                
                {/* Amplifier box */}
                <rect x={ampX} y={ampY} width={ampWidth} height={ampHeight} 
                      fill={amplifiersLinkable && amplifierCount > 1 ? "#10b981" : "#8b5cf6"} 
                      stroke={amplifiersLinkable && amplifierCount > 1 ? "#34d399" : "#a78bfa"} 
                      strokeWidth="2" rx="4"/>
                <text x={ampX + ampWidth/2} y={ampY + 20} textAnchor="middle" fill="white" fontSize="9">
                  AMP {ampIndex + 1}
                </text>
                <text x={ampX + ampWidth/2} y={ampY + 32} textAnchor="middle" fill="white" fontSize="7">
                  {selectedAmplifier}W
                </text>
                {amplifiersLinkable && amplifierCount > 1 && (
                  <text x={ampX + ampWidth/2} y={ampY + 42} textAnchor="middle" fill="white" fontSize="6">BRIDGED</text>
                )}
                {!amplifiersLinkable && amplifierCount > 1 && (
                  <text x={ampX + ampWidth/2} y={ampY + 42} textAnchor="middle" fill="white" fontSize="6">CH {ampIndex + 1}</text>
                )}
                
                {/* Amp input terminals (from power) */}
                <circle cx={ampX + 20} cy={ampY - 5} r="3" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={ampX + 60} cy={ampY - 5} r="3" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={ampX + 10} y={ampY - 10} fill="#ef4444" fontSize="6">PWR+</text>
                <text x={ampX + 50} y={ampY - 10} fill="#ffffff" fontSize="6">GND</text>
                
                {/* Amp output terminals (to subwoofer) */}
                <circle cx={ampX + 20} cy={ampY + ampHeight + 5} r="3" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                <circle cx={ampX + 60} cy={ampY + ampHeight + 5} r="3" fill="#000000" stroke="#fff" strokeWidth="1"/>
                <text x={ampX + 8} y={ampY + ampHeight + 20} fill="#ef4444" fontSize="6">OUT+</text>
                <text x={ampX + 48} y={ampY + ampHeight + 20} fill="#ffffff" fontSize="6">OUT-</text>
              </g>
            );
          })}

          {/* Clean wiring from amplifiers to subwoofer with 45-degree angles */}
          {amplifiersLinkable || amplifierCount === 1 ? (
            // Bridged/Linked configuration - all amps work together
            <g>
              {[...Array(amplifierCount)].map((_, ampIndex) => {
                const startX = (totalWidth - (amplifierCount * ampSpacing - 20)) / 2;
                const ampX = startX + ampIndex * ampSpacing;
                const ampY = 140;
                
                // Calculate clean path with 45-degree angles
                const posY = ampY + ampHeight + 5;
                const posPath = `M ${ampX + 20} ${posY} L ${ampX + 20} ${posY + 20} L ${totalWidth/2 - 30} ${posY + 20} L ${totalWidth/2 - 30} 280`;
                const negPath = `M ${ampX + 60} ${posY} L ${ampX + 60} ${posY + 30} L ${totalWidth/2 + 30} ${posY + 30} L ${totalWidth/2 + 30} 280`;
                
                return (
                  <g key={`wiring-${ampIndex}`}>
                    <path d={posPath} stroke="#ef4444" strokeWidth="2" fill="none" opacity={amplifierCount > 1 ? "0.6" : "1"}/>
                    <path d={negPath} stroke="#000000" strokeWidth="2" fill="none" opacity={amplifierCount > 1 ? "0.6" : "1"}/>
                  </g>
                );
              })}
              
              {/* Show bridging indication */}
              {amplifierCount > 1 && (
                <g>
                  <text x={totalWidth/2} y="240" textAnchor="middle" fill="#10b981" fontSize="8">
                    BRIDGED/STRAPPED CONNECTION
                  </text>
                  <text x={totalWidth/2} y="250" textAnchor="middle" fill="#999" fontSize="7">
                    All amplifiers work together for maximum power
                  </text>
                </g>
              )}
            </g>
          ) : (
            // Separate configuration for DVC - each amp to its own voice coil
            <g>
              {[...Array(Math.min(amplifierCount, 2))].map((_, ampIndex) => {
                const startX = (totalWidth - (amplifierCount * ampSpacing - 20)) / 2;
                const ampX = startX + ampIndex * ampSpacing;
                const ampY = 140;
                const posY = ampY + ampHeight + 5;
                
                // Each amp connects to its own voice coil
                const coilOffset = ampIndex === 0 ? -32.5 : 32.5;
                const posPath = `M ${ampX + 20} ${posY} L ${ampX + 20} ${posY + 20} L ${totalWidth/2 + coilOffset - 7.5} ${posY + 20} L ${totalWidth/2 + coilOffset - 7.5} 280`;
                const negPath = `M ${ampX + 60} ${posY} L ${ampX + 60} ${posY + 30} L ${totalWidth/2 + coilOffset + 7.5} ${posY + 30} L ${totalWidth/2 + coilOffset + 7.5} 280`;
                
                return (
                  <g key={`sep-wiring-${ampIndex}`}>
                    <path d={posPath} stroke="#ef4444" strokeWidth="2" fill="none"/>
                    <path d={negPath} stroke="#000000" strokeWidth="2" fill="none"/>
                    <text x={ampX + ampWidth/2} y={posY + 45} textAnchor="middle" fill="#666" fontSize="6">
                      To Coil {ampIndex + 1}
                    </text>
                  </g>
                );
              })}
              
              <text x={totalWidth/2} y="240" textAnchor="middle" fill="#a855f7" fontSize="8">
                SEPARATE CHANNEL CONNECTION
              </text>
              <text x={totalWidth/2} y="250" textAnchor="middle" fill="#999" fontSize="7">
                Each amplifier powers its own voice coil independently
              </text>
            </g>
          )}
          
          {/* Bridged connection indication between amplifiers */}
          {amplifierCount > 1 && amplifiersLinkable && (
            <g>
              {[...Array(amplifierCount - 1)].map((_, i) => {
                const startX = (totalWidth - (amplifierCount * ampSpacing - 20)) / 2;
                const x1 = startX + i * ampSpacing + ampWidth;
                const x2 = startX + (i + 1) * ampSpacing;
                const y = 140 + ampHeight / 2;
                return (
                  <g key={`bridge-${i}`}>
                    <path d={`M ${x1} ${y} L ${x2} ${y}`} 
                          stroke="#10b981" strokeWidth="3" strokeDasharray="5,3"/>
                    {i === Math.floor((amplifierCount - 2) / 2) && (
                      <text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fill="#10b981" fontSize="6">STRAPPED</text>
                    )}
                  </g>
                );
              })}
            </g>
          )}
          
          {/* System information box */}
          <g>
            <rect x={totalWidth - 190} y="320" width="180" height="70" fill="#1f2937" stroke="#374151" strokeWidth="1" rx="4"/>
            <text x={totalWidth - 100} y="335" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">System Configuration</text>
            <text x={totalWidth - 180} y="350" fill="#60a5fa" fontSize="7">Final Load: {finalImpedance.toFixed(1)}Ω</text>
            <text x={totalWidth - 180} y="360" fill="#a78bfa" fontSize="7">Total Amp Power: {totalSystemPower}W RMS</text>
            <text x={totalWidth - 180} y="370" fill="#10b981" fontSize="7">Sub RMS: {selectedSubwoofer.power_rating_rms}W</text>
            <text x={totalWidth - 180} y="380" fill="#ef4444" fontSize="7">Config: {amplifierCount} × {selectedAmplifier}W {amplifiersLinkable && amplifierCount > 1 ? '(Bridged)' : amplifierCount > 1 ? '(Separate)' : ''}</text>
          </g>
        </svg>
      );
    }
    
    // Handle multiple subwoofers - use the generateWiringDiagram function for these
    return generateWiringDiagram();
  })();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Cable className="h-8 w-8 text-electric-500" />
          <h2 className="text-2xl font-bold text-white">Wiring & Amplifier Selection</h2>
        </div>
        <p className="text-gray-300">
          Configure your wiring setup and select the optimal amplifier for your {selectedSubwoofer.brand} {selectedSubwoofer.model} system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wiring Diagram */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Cable className="h-5 w-5 mr-2 text-electric-500" />
            Wiring Diagram
            <span className="ml-auto text-sm text-yellow-400">
              (Showing {amplifierCount} amplifier{amplifierCount !== 1 ? 's' : ''})
            </span>
          </h3>
          
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4" key={`diagram-${amplifierCount}-${amplifiersLinkable}`}>
            {wiringDiagram}
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Voice Coil Type:</span>
              <span className="text-yellow-400 font-medium">
                {voiceCoilConfig.type} {isDVC && coilImpedance ? `(${coilImpedance}Ω per coil)` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Configuration:</span>
              <span className="text-electric-400 font-medium">
                {WIRING_CONFIGURATIONS[configuration].name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Individual Impedance:</span>
              <span className="text-white font-medium">{selectedSubwoofer.impedance}Ω</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Final System Impedance:</span>
              <span className="text-electric-400 font-bold text-lg">{finalImpedance.toFixed(2)}Ω</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total RMS Power:</span>
              <span className="text-purple-400 font-bold">{totalRMSPower}W</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xs text-gray-400">
              <Info className="h-4 w-4 inline mr-1" />
              {configuration === 'series' && 
                `Series wiring: ${quantity} × ${selectedSubwoofer.impedance}Ω = ${finalImpedance.toFixed(2)}Ω`
              }
              {configuration === 'parallel' && 
                `Parallel wiring: ${selectedSubwoofer.impedance}Ω ÷ ${quantity} = ${finalImpedance.toFixed(2)}Ω`
              }
              {configuration === 'series_parallel' && quantity % 2 === 0 &&
                `Series-parallel: ${quantity/2} pairs of ${selectedSubwoofer.impedance * 2}Ω in parallel = ${finalImpedance.toFixed(2)}Ω`
              }
            </div>
          </div>
        </div>

        {/* Amplifier Selection */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-electric-500" />
            Amplifier Configuration
          </h3>
          
          <div className="space-y-4">
            {/* Number of Amplifiers */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Number of Amplifiers</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const newCount = Math.max(1, amplifierCount - 1);
                    setAmplifierCount(newCount);
                    onAmplifierChange?.({
                      amplifierPower: selectedAmplifier,
                      amplifierCount: newCount,
                      amplifiersLinkable
                    });
                  }}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                  disabled={amplifierCount <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-white font-medium px-4 py-2 bg-gray-700 rounded-lg min-w-[3rem] text-center">
                  {amplifierCount}
                </span>
                <button
                  onClick={() => {
                    const newCount = Math.min(12, amplifierCount + 1);
                    setAmplifierCount(newCount);
                    onAmplifierChange?.({
                      amplifierPower: selectedAmplifier,
                      amplifierCount: newCount,
                      amplifiersLinkable
                    });
                  }}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                  disabled={amplifierCount >= 12}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Amplifier Linking Option */}
            {amplifierCount > 1 && (
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Amplifier Configuration</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="amplifierConfig"
                      checked={amplifiersLinkable}
                      onChange={() => {
                        setAmplifiersLinkable(true);
                        onAmplifierChange?.({
                          amplifierPower: selectedAmplifier,
                          amplifierCount,
                          amplifiersLinkable: true
                        });
                      }}
                      className="text-electric-500"
                    />
                    <span className="text-white">Linkable (Bridge/Parallel) - Combined Power</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="amplifierConfig"
                      checked={!amplifiersLinkable}
                      onChange={() => {
                        setAmplifiersLinkable(false);
                        onAmplifierChange?.({
                          amplifierPower: selectedAmplifier,
                          amplifierCount,
                          amplifiersLinkable: false
                        });
                      }}
                      className="text-electric-500"
                    />
                    <span className="text-white">Separate - Individual Power</span>
                  </label>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  <div>Total system power: {selectedAmplifier * amplifierCount}W RMS</div>
                  <div>Per amplifier: {selectedAmplifier}W RMS each</div>
                  {amplifiersLinkable && amplifierCount > 1 && 
                    <div className="text-green-400 mt-1">✓ Amplifiers bridged together for maximum power to single voice coil</div>
                  }
                  {!amplifiersLinkable && amplifierCount > 1 && (
                    <>
                      <div className="text-yellow-400 mt-1">⚠️ Requires Dual Voice Coil (DVC) subwoofer</div>
                      <div className="text-yellow-400">Each amp powers its own voice coil independently</div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Individual Amplifier Power</label>
              <select
                value={selectedAmplifier}
                onChange={(e) => {
                  const newPower = Number(e.target.value);
                  setSelectedAmplifier(newPower);
                  onAmplifierChange?.({
                    amplifierPower: newPower,
                    amplifierCount,
                    amplifiersLinkable
                  });
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {AMPLIFIER_OPTIONS.map(amp => (
                  <option key={amp.power} value={amp.power}>
                    {amp.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recommended Amplifier */}
            {recommendedAmp && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Zap className="h-4 w-4 text-green-400 mr-2" />
                  <span className="text-green-400 font-medium">Recommended</span>
                </div>
                <div className="text-white font-bold">{recommendedAmp.label}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Optimal match for {totalRMSPower}W RMS system
                </div>
              </div>
            )}

            {/* Amplifier Compatibility */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Amplifier Power:</span>
                <span className="text-white font-medium">{selectedAmplifier}W RMS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">System Impedance:</span>
                <span className="text-electric-400 font-medium">{finalImpedance.toFixed(2)}Ω</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Power Match:</span>
                <span className={`font-medium ${
                  selectedAmplifier >= totalRMSPower * 0.75 && selectedAmplifier <= totalRMSPower * 1.25
                    ? 'text-green-400'
                    : selectedAmplifier < totalRMSPower * 0.75
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {selectedAmplifier >= totalRMSPower * 0.75 && selectedAmplifier <= totalRMSPower * 1.25
                    ? 'Optimal'
                    : selectedAmplifier < totalRMSPower * 0.75
                    ? 'Underpowered'
                    : 'Overpowered'
                  }
                </span>
              </div>
            </div>

            {/* Configuration Warnings */}
            {!amplifiersLinkable && amplifierCount > 1 && quantity === 1 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                <div className="text-yellow-400 text-sm font-medium">⚠️ Dual Voice Coil Required</div>
                <div className="text-xs text-gray-400 mt-1">
                  Separate amplifier configuration requires a Dual Voice Coil (DVC) subwoofer. 
                  Each amplifier will power its own voice coil independently.
                </div>
              </div>
            )}
            
            {/* Impedance Stability Warning */}
            {finalImpedance < 1 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="text-red-400 text-sm font-medium">⚠️ Low Impedance Warning</div>
                <div className="text-xs text-gray-400 mt-1">
                  {finalImpedance.toFixed(2)}Ω may not be stable with all amplifiers. Verify amplifier specifications.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step Complete & Navigation */}
      <div className="bg-gradient-to-r from-green-500/20 to-electric-500/20 rounded-xl p-6 border border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">✓</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400">Step 2 Complete</h3>
              <p className="text-gray-300 text-sm">
                {amplifierCount} amplifier{amplifierCount > 1 ? 's' : ''} ({amplifiersLinkable && amplifierCount > 1 ? 'linked' : 'separate'}) 
                configured for {selectedSubwoofer.brand} {selectedSubwoofer.model} system
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={onNext}
              className="px-6 py-3 bg-electric-500 hover:bg-electric-600 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
            >
              <span>Next Step</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WiringDiagram;