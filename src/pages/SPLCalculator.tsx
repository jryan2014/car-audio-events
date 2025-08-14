import React, { useState, useEffect } from 'react';
import { Calculator, Zap, Volume2, Info, TrendingUp, Settings2, Trophy, Gauge, X } from 'lucide-react';
import SEO from '../components/SEO';
import VehicleAudioDiagram, { AudioSystemData } from '../components/VehicleAudioDiagram';

interface SubwooferConfig {
  count: number;
  size: number;
  shape: 'round' | 'square';
  customDiameter?: number;
  voiceCoilConfig?: 'single' | 'dual' | 'quad';
}

interface BassWarsOptions {
  hasPort?: boolean;
  portDiameter?: number;
  portShape?: 'round' | 'square' | 'slot';
  portWidth?: number;
  portHeight?: number;
  competitionFormat?: 'spl' | 'demo_spl' | 'port_wars' | 'hot_seat' | 'death_match';
  demoSplClass?: 'hurricane' | 'typhoon' | 'cyclone' | 'twister';
  classCategory?: 'pro' | 'open' | 'demo' | 'no_wall' | 'trunk' | 'fun';
}

interface MecaOptions {
  isModified?: boolean;
  hasWall?: boolean;
  speakerDistance?: number; // inches from headliner
  competesInDB?: boolean;
}

interface ClassInfo {
  className: string;
  maxPressure: number;
  minPressure: number;
  color: string;
  description: string;
}

const SPLCalculator: React.FC = () => {
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [subwooferConfig, setSubwooferConfig] = useState<SubwooferConfig>({
    count: 1,
    size: 12,
    shape: 'round',
    voiceCoilConfig: 'single'
  });
  
  const [wattage, setWattage] = useState<number>(1000);
  const [voltage, setVoltage] = useState<number>(14.4);
  const [current, setCurrent] = useState<number>(0);
  const [measuredWattage, setMeasuredWattage] = useState<number>(0);
  const [useClampMeter, setUseClampMeter] = useState<boolean>(false);
  const [fuseRating, setFuseRating] = useState<number>(50); // For MECA formula
  const [mecaOptions, setMecaOptions] = useState<MecaOptions>({
    isModified: false,
    hasWall: false,
    speakerDistance: 0,
    competesInDB: false
  });
  const [bassWarsOptions, setBassWarsOptions] = useState<BassWarsOptions>({
    hasPort: false,
    portDiameter: 4,
    portShape: 'round',
    portWidth: 4,
    portHeight: 4,
    competitionFormat: 'spl',
    demoSplClass: 'hurricane',
    classCategory: 'pro'
  });
  
  const [totalConeArea, setTotalConeArea] = useState<number>(0);
  const [totalPortArea, setTotalPortArea] = useState<number>(0);
  const [pressureClass, setPressureClass] = useState<number>(0);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Standard subwoofer sizes
  const standardSizes = [6.5, 8, 10, 12, 15, 18, 21];

  // Helper function to handle numeric input changes
  const handleNumericInput = (value: string, fallback: number = 0): number => {
    if (value === '') return fallback;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  };

  // Bass Wars class categories with cone area and wattage requirements
  const bassWarsCategories: Record<string, { name: string; classes: ClassInfo[] }> = {
    pro: {
      name: 'Pro Classes',
      classes: [
        { className: 'Monster', minPressure: 0, maxPressure: 600, color: 'from-green-500 to-green-600', description: '0-600 in² cone area, max 10,000W' },
        { className: 'Chaos', minPressure: 601, maxPressure: 950, color: 'from-blue-500 to-blue-600', description: '601-950 in² cone area, max 20,000W' },
        { className: 'Beast', minPressure: 951, maxPressure: 1450, color: 'from-purple-500 to-purple-600', description: '951-1450 in² cone area, max 40,000W' },
        { className: 'Legendary', minPressure: 1451, maxPressure: Infinity, color: 'from-red-500 to-red-600', description: '1451+ in² cone area, unlimited wattage' }
      ]
    },
    open: {
      name: 'Open Classes',
      classes: [
        { className: 'Open Monster', minPressure: 0, maxPressure: 600, color: 'from-green-500 to-green-600', description: '0-600 in² cone area' },
        { className: 'Open Chaos', minPressure: 601, maxPressure: 950, color: 'from-blue-500 to-blue-600', description: '601-950 in² cone area' },
        { className: 'Open Beast', minPressure: 951, maxPressure: 1450, color: 'from-purple-500 to-purple-600', description: '951-1450 in² cone area' },
        { className: 'Open Legendary', minPressure: 1451, maxPressure: Infinity, color: 'from-red-500 to-red-600', description: '1451+ in² cone area' }
      ]
    },
    demo: {
      name: 'Demo Classes',
      classes: [
        { className: 'Demo Entry', minPressure: 0, maxPressure: 400, color: 'from-green-500 to-green-600', description: 'Entry level demo' },
        { className: 'Demo Advanced', minPressure: 401, maxPressure: 800, color: 'from-blue-500 to-blue-600', description: 'Advanced demo' },
        { className: 'Demo Pro', minPressure: 801, maxPressure: 1200, color: 'from-purple-500 to-purple-600', description: 'Professional demo' },
        { className: 'Demo Extreme', minPressure: 1201, maxPressure: Infinity, color: 'from-red-500 to-red-600', description: 'Extreme demo' }
      ]
    },
    no_wall: {
      name: 'No Wall Classes',
      classes: [
        { className: 'No Wall 1', minPressure: 0, maxPressure: 500, color: 'from-green-500 to-green-600', description: 'No wall entry level' },
        { className: 'No Wall 2', minPressure: 501, maxPressure: 1000, color: 'from-blue-500 to-blue-600', description: 'No wall intermediate' },
        { className: 'No Wall 3', minPressure: 1001, maxPressure: 1500, color: 'from-purple-500 to-purple-600', description: 'No wall advanced' },
        { className: 'No Wall Unlimited', minPressure: 1501, maxPressure: Infinity, color: 'from-red-500 to-red-600', description: 'No wall unlimited' }
      ]
    },
    trunk: {
      name: 'Trunk Classes',
      classes: [
        { className: 'Trunk 1', minPressure: 0, maxPressure: 300, color: 'from-green-500 to-green-600', description: 'Basic trunk setup' },
        { className: 'Trunk 2', minPressure: 301, maxPressure: 600, color: 'from-blue-500 to-blue-600', description: 'Modified trunk' },
        { className: 'Trunk 3', minPressure: 601, maxPressure: 900, color: 'from-purple-500 to-purple-600', description: 'Heavy trunk mods' },
        { className: 'Trunk Extreme', minPressure: 901, maxPressure: Infinity, color: 'from-red-500 to-red-600', description: 'Extreme trunk' }
      ]
    },
    fun: {
      name: 'Fun Classes',
      classes: [
        { className: 'Fun Novice', minPressure: 0, maxPressure: 400, color: 'from-green-500 to-green-600', description: 'Just for fun - beginner' },
        { className: 'Fun Enthusiast', minPressure: 401, maxPressure: 800, color: 'from-blue-500 to-blue-600', description: 'Just for fun - enthusiast' },
        { className: 'Fun Expert', minPressure: 801, maxPressure: 1200, color: 'from-purple-500 to-purple-600', description: 'Just for fun - expert' },
        { className: 'Fun Unlimited', minPressure: 1201, maxPressure: Infinity, color: 'from-red-500 to-red-600', description: 'Just for fun - no limits' }
      ]
    }
  };

  // Organizations and their class structures
  const organizations: Record<string, { name: string; classes: ClassInfo[]; note?: string }> = {
    meca: {
      name: 'MECA (Mobile Electronics Competition Association)',
      note: 'MECA uses Pressure Class Formula: (Fuse Rating × 10) + Total Cone Area',
      classes: [
        // Trunk Classes
        { className: 'T1', minPressure: 0, maxPressure: 550, color: 'from-green-500 to-green-600', description: 'Trunk 1 - Up to 550 formula points' },
        { className: 'T2', minPressure: 551, maxPressure: 1000, color: 'from-green-600 to-green-700', description: 'Trunk 2 - 551-1000 formula points' },
        { className: 'T3', minPressure: 1001, maxPressure: 1500, color: 'from-green-700 to-green-800', description: 'Trunk 3 - 1001-1500 formula points' },
        
        // Street Classes  
        { className: 'S1', minPressure: 1501, maxPressure: 2000, color: 'from-blue-500 to-blue-600', description: 'Street 1 - 1501-2000 formula points' },
        { className: 'S2', minPressure: 2001, maxPressure: 3000, color: 'from-blue-600 to-blue-700', description: 'Street 2 - 2001-3000 formula points' },
        { className: 'S3', minPressure: 3001, maxPressure: 4500, color: 'from-blue-700 to-blue-800', description: 'Street 3 - 3001-4500 formula points' },
        { className: 'S4', minPressure: 4501, maxPressure: 6000, color: 'from-blue-800 to-blue-900', description: 'Street 4 - 4501-6000 formula points' },
        
        // Modified Street Classes
        { className: 'MS1', minPressure: 6001, maxPressure: 7500, color: 'from-purple-500 to-purple-600', description: 'Modified Street 1 - 6001-7500 formula points' },
        { className: 'MS2', minPressure: 7501, maxPressure: 9000, color: 'from-purple-600 to-purple-700', description: 'Modified Street 2 - 7501-9000 formula points' },
        { className: 'MS3', minPressure: 9001, maxPressure: 10500, color: 'from-purple-700 to-purple-800', description: 'Modified Street 3 - 9001-10500 formula points' },
        
        // Modified Classes
        { className: 'M1', minPressure: 10501, maxPressure: 12000, color: 'from-orange-500 to-orange-600', description: 'Modified 1 - 10501-12000 formula points' },
        { className: 'M2', minPressure: 12001, maxPressure: 14000, color: 'from-orange-600 to-orange-700', description: 'Modified 2 - 12001-14000 formula points' },
        { className: 'M3', minPressure: 14001, maxPressure: 16000, color: 'from-orange-700 to-orange-800', description: 'Modified 3 - 14001-16000 formula points' },
        { className: 'M4', minPressure: 16001, maxPressure: 20000, color: 'from-orange-800 to-orange-900', description: 'Modified 4 - 16001-20000 formula points' },
        
        // Radical X
        { className: 'Radical X', minPressure: 20001, maxPressure: Infinity, color: 'from-red-500 to-red-700', description: 'Radical X - 20000+ formula points' }
      ]
    },
    iasca: {
      name: 'IASCA (International Auto Sound Challenge)',
      note: 'Classes based on experience and system capability',
      classes: [
        { className: 'Rookie', minPressure: 0, maxPressure: 600, color: 'from-green-500 to-green-600', description: 'Entry level competitors' },
        { className: 'Amateur', minPressure: 601, maxPressure: 1500, color: 'from-blue-500 to-blue-600', description: 'Developing competitors' },
        { className: 'Pro/Am', minPressure: 1501, maxPressure: 3000, color: 'from-purple-500 to-purple-600', description: 'Semi-professional level' },
        { className: 'Pro', minPressure: 3001, maxPressure: 6000, color: 'from-orange-500 to-orange-600', description: 'Professional competitors' },
        { className: 'Expert', minPressure: 6001, maxPressure: 10000, color: 'from-red-500 to-red-600', description: 'Expert level systems' },
        { className: 'Master', minPressure: 10001, maxPressure: Infinity, color: 'from-yellow-500 to-yellow-600', description: 'Master class - Elite level' }
      ]
    },
    dbdrag: {
      name: 'dB Drag Racing',
      note: 'Classes based on woofer count and modifications',
      classes: [
        { className: 'Street 1-2', minPressure: 0, maxPressure: 1000, color: 'from-green-500 to-green-600', description: '1-2 woofers, limited mods' },
        { className: 'Street 3-4', minPressure: 1001, maxPressure: 2000, color: 'from-blue-500 to-blue-600', description: '3-4 woofers, limited mods' },
        { className: 'Super Street 1-2', minPressure: 2001, maxPressure: 3500, color: 'from-purple-500 to-purple-600', description: '1-2 woofers, more mods allowed' },
        { className: 'Super Street 3-4', minPressure: 3501, maxPressure: 5000, color: 'from-orange-500 to-orange-600', description: '3-4 woofers, more mods allowed' },
        { className: 'Super Street 5+', minPressure: 5001, maxPressure: 8000, color: 'from-red-500 to-red-600', description: '5+ woofers' },
        { className: 'Extreme 1-4', minPressure: 8001, maxPressure: 15000, color: 'from-pink-500 to-pink-600', description: '1-4 woofers, unlimited' },
        { className: 'Extreme 5+', minPressure: 15001, maxPressure: Infinity, color: 'from-yellow-500 to-yellow-600', description: '5+ woofers, unlimited' }
      ]
    },
    basswars: {
      name: 'Bass Wars',
      note: 'Classes based on cone area and wattage limits. Multiple competition formats available.',
      classes: [] // Will be populated based on class category selection
    },
    ispll: {
      name: 'ISPLL (International SPL League)',
      note: 'Four divisions: Pro Audio, Real SPL, All Around SPL, Subsonic',
      classes: [
        { className: 'Pro Audio Entry', minPressure: 0, maxPressure: 1000, color: 'from-green-500 to-green-600', description: 'Professional audio entry' },
        { className: 'Pro Audio Advanced', minPressure: 1001, maxPressure: 2500, color: 'from-blue-500 to-blue-600', description: 'Advanced pro audio' },
        { className: 'Real SPL Street', minPressure: 2501, maxPressure: 4000, color: 'from-purple-500 to-purple-600', description: 'Peak score street' },
        { className: 'Real SPL Pro', minPressure: 4001, maxPressure: 7000, color: 'from-orange-500 to-orange-600', description: 'Peak score professional' },
        { className: 'All Around SPL', minPressure: 7001, maxPressure: 12000, color: 'from-red-500 to-red-600', description: 'Musical average' },
        { className: 'Subsonic Suicide', minPressure: 12001, maxPressure: Infinity, color: 'from-pink-500 to-pink-600', description: 'Low frequency extreme' }
      ]
    },
    emma: {
      name: 'EMMA (European Mobile Media Association)',
      note: 'ESPL - European Sound Pressure League',
      classes: [
        { className: 'ESPL Novice', minPressure: 0, maxPressure: 1200, color: 'from-green-500 to-green-600', description: 'Beginning ESPL' },
        { className: 'ESPL Experienced', minPressure: 1201, maxPressure: 2500, color: 'from-blue-500 to-blue-600', description: 'Experienced competitors' },
        { className: 'ESPL Advanced', minPressure: 2501, maxPressure: 4500, color: 'from-purple-500 to-purple-600', description: 'Advanced systems' },
        { className: 'ESPL Master', minPressure: 4501, maxPressure: 8000, color: 'from-orange-500 to-orange-600', description: 'Master level' },
        { className: 'ESPL Extreme', minPressure: 8001, maxPressure: Infinity, color: 'from-red-500 to-red-600', description: 'Extreme unlimited' }
      ]
    }
  };

  // Get current organization's classes
  const splClasses = selectedOrganization === 'basswars' 
    ? (bassWarsCategories[bassWarsOptions.classCategory || 'pro']?.classes || [])
    : (organizations[selectedOrganization]?.classes || []);
  const orgNote = selectedOrganization ? organizations[selectedOrganization]?.note : null;

  // Calculate cone area based on configuration
  const calculateConeArea = () => {
    let diameter = subwooferConfig.customDiameter || subwooferConfig.size;
    let area = 0;

    if (subwooferConfig.shape === 'round') {
      const radius = diameter / 2;
      area = Math.PI * Math.pow(radius, 2);
    } else {
      // For square subwoofers, use the diagonal as diameter
      const side = diameter / Math.sqrt(2);
      area = Math.pow(side, 2);
    }

    const total = area * subwooferConfig.count;
    setTotalConeArea(Math.round(total * 100) / 100);
  };

  // Calculate port area for Bass Wars
  const calculatePortArea = () => {
    if (!bassWarsOptions.hasPort) {
      setTotalPortArea(0);
      return;
    }

    let area = 0;
    if (bassWarsOptions.portShape === 'round') {
      const radius = (bassWarsOptions.portDiameter || 0) / 2;
      area = Math.PI * Math.pow(radius, 2);
    } else if (bassWarsOptions.portShape === 'square') {
      area = Math.pow(bassWarsOptions.portDiameter || 0, 2);
    } else { // slot port
      area = (bassWarsOptions.portWidth || 0) * (bassWarsOptions.portHeight || 0);
    }

    setTotalPortArea(Math.round(area * 100) / 100);
  };

  // Calculate pressure class
  const calculatePressureClass = () => {
    if (!selectedOrganization) {
      setPressureClass(0);
      setClassInfo(null);
      return;
    }
    
    let pressure: number;
    
    if (selectedOrganization === 'meca') {
      // MECA Formula: (Fuse Rating × 10) + Total Cone Area
      pressure = (fuseRating * 10) + totalConeArea;
    } else if (selectedOrganization === 'basswars') {
      // Bass Wars uses cone area only for classification (port area is for tiebreakers)
      pressure = totalConeArea;
    } else {
      // Other organizations - use their specific formulas
      pressure = totalConeArea;
    }
    
    setPressureClass(Math.round(pressure));

    // Find matching class
    let matchedClass = splClasses.find(c => pressure >= c.minPressure && pressure <= c.maxPressure);
    
    // For Bass Wars Pro classes, check wattage limits
    if (selectedOrganization === 'basswars' && bassWarsOptions.classCategory === 'pro' && matchedClass) {
      const actualWattage = useClampMeter ? measuredWattage : wattage;
      
      // Check if wattage exceeds class limit
      if (matchedClass.className === 'Monster' && actualWattage > 10000) {
        // If over 10kW but under 600 sq in, can't compete in Monster
        matchedClass = null;
      } else if (matchedClass.className === 'Chaos' && actualWattage > 20000) {
        // If over 20kW but in Chaos cone area range, can't compete
        matchedClass = null;
      } else if (matchedClass.className === 'Beast' && actualWattage > 40000) {
        // If over 40kW but in Beast cone area range, can't compete
        matchedClass = null;
      }
      // Legendary has no wattage limit
    }
    
    setClassInfo(matchedClass || null);
  };

  // Get possible MECA classes based on vehicle modifications
  const getPossibleMecaClasses = () => {
    if (selectedOrganization !== 'meca' || !classInfo) return [];
    
    const currentClass = classInfo.className;
    const possibleClasses = [];
    
    // Determine base class level (1, 2, 3, 4, etc.)
    const classLevel = currentClass.match(/\d+/)?.[0] || '';
    
    if (classLevel) {
      // Always include Trunk class
      possibleClasses.push(`T${classLevel}`);
      
      // If modified, include appropriate classes
      if (mecaOptions.isModified) {
        possibleClasses.push(`S${classLevel}`); // Street
        possibleClasses.push(`MS${classLevel}`); // Modified Street
        possibleClasses.push(`M${classLevel}`); // Modified
      }
      
      // Add DB class if competing in Park & Pound
      if (mecaOptions.competesInDB) {
        const dbClass = calculateDBClass();
        if (dbClass) possibleClasses.push(dbClass);
      }
    }
    
    // Handle Radical X class
    if (currentClass === 'Radical X') {
      possibleClasses.push('Radical X');
      if (mecaOptions.competesInDB) {
        possibleClasses.push('DB4');
      }
    }
    
    return possibleClasses;
  };

  // Calculate DB Park & Pound class separately for MECA
  const calculateDBClass = () => {
    if (selectedOrganization !== 'meca' || !mecaOptions.competesInDB) return null;
    
    // DB classes use different criteria based on power/modification level
    // This is simplified - actual rules may be more complex
    const actualWattage = useClampMeter ? measuredWattage : wattage;
    
    if (actualWattage <= 2500) return 'DB1';
    if (actualWattage <= 5000) return 'DB2';
    if (actualWattage <= 7500) return 'DB3';
    return 'DB4';
  };

  // Calculate measured wattage from voltage and current
  useEffect(() => {
    if (useClampMeter && voltage > 0 && current > 0) {
      const calculated = voltage * current;
      setMeasuredWattage(Math.round(calculated));
    }
  }, [voltage, current, useClampMeter]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateConeArea();
  }, [subwooferConfig]);

  useEffect(() => {
    calculatePortArea();
  }, [bassWarsOptions]);

  useEffect(() => {
    if (totalConeArea > 0 || (selectedOrganization === 'basswars' && totalPortArea > 0)) {
      calculatePressureClass();
    }
  }, [totalConeArea, totalPortArea, wattage, measuredWattage, useClampMeter, fuseRating, selectedOrganization]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black py-8">
      <SEO 
        title="SPL Calculator - Competition Class Calculator"
        description="Calculate your competition class for IASCA, MECA, and Bass Wars. Advanced SPL calculator with cone area, port calculations, and power estimations for car audio competitions."
        keywords="SPL calculator, car audio calculator, competition class calculator, IASCA classes, MECA classes, Bass Wars classes, cone area calculator, port area calculator, dB estimator"
        url="https://caraudioevents.com/spl-calculator"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Calculator className="h-8 w-8 text-electric-400" />
                Advanced SPL Class Calculator
              </h1>
              <p className="text-gray-400 mt-2">
                Calculate your recommended competition class based on total cone area and amplifier wattage
              </p>
            </div>
          </div>
        </div>

        {/* Main Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Input Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Volume2 className="h-6 w-6 mr-2 text-electric-400" />
              System Configuration
            </h2>

            {/* Organization Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Competition Organization
              </label>
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                required
              >
                <option value="">Select Organization</option>
                {Object.entries(organizations).map(([key, org]) => (
                  <option key={key} value={key}>{org.name}</option>
                ))}
              </select>
              {orgNote && (
                <p className="mt-2 text-sm text-gray-400 italic">
                  <Info className="inline h-3 w-3 mr-1" />
                  {orgNote}
                </p>
              )}
            </div>

            {/* Subwoofer Configuration */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Subwoofers
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={subwooferConfig.count}
                  onChange={(e) => setSubwooferConfig({...subwooferConfig, count: handleNumericInput(e.target.value, 1)})}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subwoofer Size (inches)
                </label>
                <select
                  value={subwooferConfig.size}
                  onChange={(e) => setSubwooferConfig({...subwooferConfig, size: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                >
                  {standardSizes.map(size => (
                    <option key={size} value={size}>{size}"</option>
                  ))}
                  <option value="0">Custom Size</option>
                </select>
              </div>

              {subwooferConfig.size === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Diameter (inches)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    value={subwooferConfig.customDiameter || ''}
                    onChange={(e) => setSubwooferConfig({...subwooferConfig, customDiameter: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter custom size"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subwoofer Shape
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSubwooferConfig({...subwooferConfig, shape: 'round'})}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      subwooferConfig.shape === 'round'
                        ? 'border-electric-500 bg-electric-500/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-600 rounded-full mb-2"></div>
                      <span className="text-sm font-medium text-white">Round</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSubwooferConfig({...subwooferConfig, shape: 'square'})}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      subwooferConfig.shape === 'square'
                        ? 'border-electric-500 bg-electric-500/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-600 mb-2"></div>
                      <span className="text-sm font-medium text-white">Square</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* MECA-specific Options */}
            {selectedOrganization === 'meca' && (
              <div className="border-t border-gray-700 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Settings2 className="h-5 w-5 mr-2 text-electric-400" />
                  MECA Competition Options
                </h3>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={mecaOptions.isModified}
                      onChange={(e) => setMecaOptions({...mecaOptions, isModified: e.target.checked})}
                      className="h-4 w-4 text-electric-500 focus:ring-electric-500 border-gray-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-300">
                      Is the vehicle modified?
                    </span>
                    <button
                      type="button"
                      onClick={() => alert('Modified vehicle means: Vehicle modifications beyond stock including but not limited to: wall installations, reinforced doors, custom enclosures integrated into vehicle structure, etc. Consult MECA rulebook for complete definition.')}
                      className="text-electric-400 hover:text-electric-300"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </label>
                </div>

                {mecaOptions.isModified && (
                  <>
                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={mecaOptions.hasWall}
                          onChange={(e) => setMecaOptions({...mecaOptions, hasWall: e.target.checked})}
                          className="h-4 w-4 text-electric-500 focus:ring-electric-500 border-gray-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-300">
                          Does the vehicle have a wall?
                        </span>
                      </label>
                    </div>

                    {!mecaOptions.hasWall && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Distance from top of speaker box to headliner (inches)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={mecaOptions.speakerDistance || ''}
                          onChange={(e) => setMecaOptions({...mecaOptions, speakerDistance: handleNumericInput(e.target.value, 0)})}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                          placeholder="Distance in inches"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Per MECA rules: No-wall vehicles must have specified clearance
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={mecaOptions.competesInDB}
                      onChange={(e) => setMecaOptions({...mecaOptions, competesInDB: e.target.checked})}
                      className="h-4 w-4 text-electric-500 focus:ring-electric-500 border-gray-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-300">
                      Also competing in DB Park & Pound?
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-400">
                    DB Park & Pound is a separate competition category
                  </p>
                </div>
              </div>
            )}

            {/* Bass Wars-specific Options */}
            {selectedOrganization === 'basswars' && (
              <div className="border-t border-gray-700 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Volume2 className="h-5 w-5 mr-2 text-electric-400" />
                  Bass Wars Competition Options
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Class Category
                  </label>
                  <select
                    value={bassWarsOptions.classCategory}
                    onChange={(e) => setBassWarsOptions({...bassWarsOptions, classCategory: e.target.value as any})}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  >
                    <option value="pro">Pro Classes (Monster, Chaos, Beast, Legendary)</option>
                    <option value="open">Open Classes</option>
                    <option value="demo">Demo Classes</option>
                    <option value="no_wall">No Wall Classes</option>
                    <option value="trunk">Trunk Classes</option>
                    <option value="fun">Fun Classes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Competition Format
                  </label>
                  <select
                    value={bassWarsOptions.competitionFormat}
                    onChange={(e) => setBassWarsOptions({...bassWarsOptions, competitionFormat: e.target.value as any})}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  >
                    <option value="spl">SPL (Sound Pressure Level)</option>
                    <option value="demo_spl">Demo SPL</option>
                    <option value="port_wars">Port Wars</option>
                    <option value="hot_seat">Hot Seat (30 sec average)</option>
                    <option value="death_match">Death Match (60 sec head-to-head)</option>
                  </select>
                </div>

                {bassWarsOptions.competitionFormat === 'demo_spl' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Demo SPL Class
                    </label>
                    <select
                      value={bassWarsOptions.demoSplClass}
                      onChange={(e) => setBassWarsOptions({...bassWarsOptions, demoSplClass: e.target.value as any})}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    >
                      <option value="hurricane">Hurricane (30 Hz and below)</option>
                      <option value="typhoon">Typhoon (40 Hz and below)</option>
                      <option value="cyclone">Cyclone (50 Hz and below)</option>
                      <option value="twister">Twister (60 Hz and below)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={bassWarsOptions.hasPort}
                      onChange={(e) => setBassWarsOptions({...bassWarsOptions, hasPort: e.target.checked})}
                      className="h-4 w-4 text-electric-500 focus:ring-electric-500 border-gray-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-300">
                      Does your enclosure have a port?
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-400">
                    Bass Value includes the surface area of your outermost port opening
                  </p>
                </div>

                {bassWarsOptions.hasPort && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Port Shape
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['round', 'square', 'slot'].map(shape => (
                          <button
                            key={shape}
                            onClick={() => setBassWarsOptions({...bassWarsOptions, portShape: shape as any})}
                            className={`p-3 rounded-lg border-2 transition-all capitalize ${
                              bassWarsOptions.portShape === shape
                                ? 'border-electric-500 bg-electric-500/20'
                                : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                            }`}
                          >
                            {shape}
                          </button>
                        ))}
                      </div>
                    </div>

                    {bassWarsOptions.portShape === 'round' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Port Diameter (inches)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          step="0.5"
                          value={bassWarsOptions.portDiameter || ''}
                          onChange={(e) => setBassWarsOptions({...bassWarsOptions, portDiameter: handleNumericInput(e.target.value, 4)})}
                          onFocus={(e) => e.target.select()}
                          placeholder="Port diameter"
                          className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {bassWarsOptions.portShape === 'square' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Port Size (inches)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          step="0.5"
                          value={bassWarsOptions.portDiameter || ''}
                          onChange={(e) => setBassWarsOptions({...bassWarsOptions, portDiameter: handleNumericInput(e.target.value, 4)})}
                          onFocus={(e) => e.target.select()}
                          placeholder="Port diameter"
                          className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {bassWarsOptions.portShape === 'slot' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Port Width (inches)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="48"
                            step="0.5"
                            value={bassWarsOptions.portWidth === 0 ? '' : bassWarsOptions.portWidth}
                            onChange={(e) => setBassWarsOptions({...bassWarsOptions, portWidth: handleNumericInput(e.target.value, 4)})}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Port Height (inches)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="48"
                            step="0.5"
                            value={bassWarsOptions.portHeight === 0 ? '' : bassWarsOptions.portHeight}
                            onChange={(e) => setBassWarsOptions({...bassWarsOptions, portHeight: handleNumericInput(e.target.value, 4)})}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Power Configuration */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                Amplifier Power
              </h3>

              {/* Hide wattage input for Bass Wars */}
              {selectedOrganization !== 'basswars' && (
                <>
              {/* Fuse Rating for MECA */}
              {selectedOrganization === 'meca' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fuse Rating (Amps) *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    step="5"
                    value={fuseRating === 0 ? '' : fuseRating}
                    onChange={(e) => setFuseRating(handleNumericInput(e.target.value, 50))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    placeholder="Within 18 inches of amplifier"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Use the fuse rating within 18 inches of your amplifier
                  </p>
                  {selectedOrganization === 'meca' && (
                    <p className="mt-1 text-xs text-yellow-400">
                      💡 MECA uses fuse rating (not actual wattage) for classification
                    </p>
                  )}
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">
                    Power Measurement Method
                  </label>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-electric-400 hover:text-electric-300 flex items-center"
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    Advanced
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setUseClampMeter(false)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      !useClampMeter
                        ? 'border-electric-500 bg-electric-500/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    }`}
                  >
                    <span className="text-sm font-medium text-white">RMS Rating</span>
                  </button>
                  <button
                    onClick={() => setUseClampMeter(true)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      useClampMeter
                        ? 'border-electric-500 bg-electric-500/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    }`}
                  >
                    <span className="text-sm font-medium text-white">Clamp Meter</span>
                  </button>
                </div>
              </div>

              {!useClampMeter ? (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Approximate Wattage (RMS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="100"
                    value={wattage === 0 ? '' : wattage}
                    onChange={(e) => setWattage(Math.min(handleNumericInput(e.target.value), 100000))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  />
                  {selectedOrganization === 'basswars' && bassWarsOptions.classCategory === 'pro' && (
                    <p className="mt-1 text-xs text-yellow-400">
                      Pro Class Limits: Monster (10kW), Chaos (20kW), Beast (40kW), Legendary (Unlimited)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Voltage (V)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={voltage === 0 ? '' : voltage}
                      onChange={(e) => setVoltage(handleNumericInput(e.target.value, 14.4))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current (A)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      value={current === 0 ? '' : current}
                      onChange={(e) => setCurrent(handleNumericInput(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                    />
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400">Calculated Power:</p>
                    <p className="text-lg font-bold text-white">{measuredWattage.toLocaleString()} Watts</p>
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Advanced Options</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Voice Coil Configuration
                  </label>
                  <select
                    value={subwooferConfig.voiceCoilConfig}
                    onChange={(e) => setSubwooferConfig({...subwooferConfig, voiceCoilConfig: e.target.value as any})}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent text-sm"
                  >
                    <option value="single">Single Voice Coil</option>
                    <option value="dual">Dual Voice Coil</option>
                    <option value="quad">Quad Voice Coil</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Current Class Display */}
            {classInfo && selectedOrganization === 'meca' ? (
              // MECA: Show possible classes based on modifications
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-2">Possible Competition Classes</h3>
                {getPossibleMecaClasses().map((className, index) => {
                  const isDB = className.startsWith('DB');
                  const color = isDB ? 'from-pink-500 to-pink-600' : classInfo.color;
                  return (
                    <div key={index} className={`bg-gradient-to-r ${color} rounded-xl p-6 text-white border border-white/20`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold">
                          {isDB ? 'DB Park & Pound' : 'Competition Class'}
                        </h3>
                        {isDB ? <Volume2 className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
                      </div>
                      <div className="text-4xl font-bold mb-2">{className}</div>
                      <p className="text-lg opacity-90">
                        {className.startsWith('T') ? 'Trunk - Basic modifications' :
                         className.startsWith('S') && !className.startsWith('MS') ? 'Street - Street legal' :
                         className.startsWith('MS') ? 'Modified Street - Heavy street mods' :
                         className.startsWith('M') && !className.startsWith('MS') ? 'Modified - Full competition build' :
                         className === 'Radical X' ? 'Extreme unlimited build' :
                         isDB ? `Based on power level: ${(useClampMeter ? measuredWattage : wattage).toLocaleString()}W` :
                         classInfo.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Other organizations: Show single class
              classInfo ? (
                <div className={`bg-gradient-to-r ${classInfo.color} rounded-xl p-6 text-white border border-white/20`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Recommended Competition Class</h3>
                    <Trophy className="h-8 w-8" />
                  </div>
                  <div className="text-5xl font-bold mb-2">{classInfo.className}</div>
                  <p className="text-lg opacity-90">{classInfo.description}</p>
                  {selectedOrganization === 'basswars' && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-sm opacity-80">
                        Competition Format: {
                          bassWarsOptions.competitionFormat === 'spl' ? 'SPL (Sound Pressure Level)' :
                          bassWarsOptions.competitionFormat === 'demo_spl' ? `Demo SPL - ${bassWarsOptions.demoSplClass?.charAt(0).toUpperCase() + bassWarsOptions.demoSplClass?.slice(1)}` :
                          bassWarsOptions.competitionFormat === 'port_wars' ? 'Port Wars' :
                          bassWarsOptions.competitionFormat === 'hot_seat' ? 'Hot Seat (30 sec average)' :
                          'Death Match (60 sec head-to-head)'
                        }
                      </p>
                      {bassWarsOptions.classCategory === 'pro' && (
                        <div className="mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm opacity-80">Your Wattage:</span>
                            <span className={`text-sm font-semibold ${
                              (classInfo.className === 'Monster' && (useClampMeter ? measuredWattage : wattage) <= 10000) ||
                              (classInfo.className === 'Chaos' && (useClampMeter ? measuredWattage : wattage) <= 20000) ||
                              (classInfo.className === 'Beast' && (useClampMeter ? measuredWattage : wattage) <= 40000) ||
                              classInfo.className === 'Legendary'
                                ? 'text-green-300' : 'text-red-300'
                            }`}>
                              {(useClampMeter ? measuredWattage : wattage).toLocaleString()}W
                              {classInfo.className === 'Monster' && ' / 10,000W'}
                              {classInfo.className === 'Chaos' && ' / 20,000W'}
                              {classInfo.className === 'Beast' && ' / 40,000W'}
                              {classInfo.className === 'Legendary' && ' (Unlimited)'}
                            </span>
                          </div>
                          {((classInfo.className === 'Monster' && (useClampMeter ? measuredWattage : wattage) > 10000) ||
                            (classInfo.className === 'Chaos' && (useClampMeter ? measuredWattage : wattage) > 20000) ||
                            (classInfo.className === 'Beast' && (useClampMeter ? measuredWattage : wattage) > 40000)) && (
                            <p className="text-xs text-red-300 mt-1">
                              ⚠️ Exceeds class wattage limit
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // No qualifying class
                selectedOrganization === 'basswars' && bassWarsOptions.classCategory === 'pro' && (
                  <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-red-400">No Qualifying Class</h3>
                      <X className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-lg text-red-300">
                      Your system exceeds the wattage limit for your cone area class.
                    </p>
                    <div className="mt-4 text-sm text-gray-300">
                      <p>Cone Area: {totalConeArea.toFixed(2)} in²</p>
                      <p>Wattage: {(useClampMeter ? measuredWattage : wattage).toLocaleString()}W</p>
                      <p className="mt-2 text-yellow-400">
                        Consider competing in a different class category or reducing your wattage.
                      </p>
                    </div>
                  </div>
                )
              )
            )}


            {/* Calculation Details */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Gauge className="h-6 w-6 mr-2 text-green-500" />
                Calculation Breakdown
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                  <span className="text-gray-400">Total Cone Area</span>
                  <span className="text-lg font-semibold text-white">{totalConeArea.toFixed(2)} in²</span>
                </div>
                
                {selectedOrganization === 'basswars' && bassWarsOptions.hasPort && (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Port Opening Area</span>
                    <span className="text-lg font-semibold text-white">{totalPortArea.toFixed(2)} in²</span>
                  </div>
                )}
                
                {selectedOrganization === 'meca' ? (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Fuse Rating × 10</span>
                    <span className="text-lg font-semibold text-white">
                      {fuseRating} × 10 = {fuseRating * 10}
                    </span>
                  </div>
                ) : selectedOrganization !== 'basswars' ? (
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-gray-400">Power Output</span>
                    <span className="text-lg font-semibold text-white">
                      {Math.min(useClampMeter ? measuredWattage : wattage, 10000).toLocaleString()} W
                      {(useClampMeter ? measuredWattage : wattage) > 10000 && (
                        <span className="text-sm text-yellow-400 ml-2">(capped at 10,000W)</span>
                      )}
                    </span>
                  </div>
                ) : null}
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-300 font-semibold">
                    {selectedOrganization === 'basswars' ? 'Bass Value' : 'Pressure Class Number'}
                  </span>
                  <span className="text-2xl font-bold text-electric-400">{pressureClass.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">How it's calculated:</p>
                    <p>
                      {!selectedOrganization 
                        ? 'Please select an organization to see class calculations'
                        : selectedOrganization === 'meca' 
                        ? 'Pressure Class = (Fuse Rating × 10) + Total Cone Area (in²)'
                        : selectedOrganization === 'basswars'
                        ? bassWarsOptions.classCategory === 'pro' 
                          ? 'Classification by Cone Area (in²), with wattage limits per class'
                          : 'Classification by Cone Area (in²) only'
                        : 'Classification varies by organization'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Class Range Indicator - Only show for non-MECA organizations */}
            {!selectedOrganization ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
                <div className="py-8">
                  <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    Select a Competition Organization
                  </h3>
                  <p className="text-gray-500">
                    Choose your competition organization above to calculate your competition class
                  </p>
                </div>
              </div>
            ) : selectedOrganization !== 'meca' && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-purple-400" />
                  All Competition Classes
                </h3>
                
                <div className="space-y-2">
                  {splClasses.map((cls, index) => {
                    const isCurrentClass = classInfo?.className === cls.className;
                    const percentage = pressureClass > 0 
                      ? Math.min(100, Math.max(0, ((pressureClass - cls.minPressure) / (cls.maxPressure - cls.minPressure)) * 100))
                      : 0;

                    return (
                      <div key={index} className={`relative ${isCurrentClass ? 'scale-105' : ''} transition-transform`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isCurrentClass ? 'text-white' : 'text-gray-400'}`}>
                            {cls.className}
                          </span>
                          <span className={`text-xs ${isCurrentClass ? 'text-gray-300' : 'text-gray-500'}`}>
                            {cls.minPressure.toLocaleString()} - {cls.maxPressure === Infinity ? '∞' : cls.maxPressure.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          {isCurrentClass && (
                            <div
                              className={`bg-gradient-to-r ${cls.color} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">Competition Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-300 mb-1">SPL Meter Standard</p>
                <p>Term-Lab is the official meter for most organizations</p>
              </div>
            </div>
            <div className="flex items-start">
              <Info className="h-5 w-5 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-300 mb-1">Power Measurement</p>
                <p>Clamp meter readings use Watt's Law: P = V × I</p>
              </div>
            </div>
            <div className="flex items-start">
              <Info className="h-5 w-5 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-300 mb-1">Classification Note</p>
                <p>Each organization has unique class structures</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Audio System Diagram */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 mt-8">
          <div className="flex items-center mb-4">
            <Settings2 className="h-6 w-6 text-electric-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Audio System Layout Visualizer</h2>
          </div>
          <p className="text-gray-400 mb-6">
            Plan your competition audio system with our interactive vehicle diagram. See where to position amplifiers, 
            subwoofers, and other components for optimal performance and competition compliance.
          </p>
          
          <VehicleAudioDiagram
            audioSystem={{
              vehicleType: 'sedan',
              totalPower: wattage,
              description: `Competition setup with ${subwooferConfig.count}x ${subwooferConfig.size}" subwoofer(s) and ${wattage}W total power`,
              components: [
                {
                  id: 'head-unit-1',
                  type: 'head_unit',
                  name: 'Competition Head Unit',
                  location: { x: 25, y: 70 },
                  brand: 'Pioneer',
                  model: 'DEH-80PRS'
                },
                {
                  id: 'amp-main',
                  type: 'amplifier',
                  name: 'Main Amplifier',
                  location: { x: 80, y: 35 },
                  power: Math.round(wattage * 0.8),
                  brand: 'Rockford Fosgate',
                  model: 'T2500-1bdCP'
                },
                {
                  id: 'sub-1',
                  type: 'subwoofer',
                  name: `${subwooferConfig.size}" Competition Sub`,
                  location: { x: 75, y: 60 },
                  power: Math.round(wattage * 0.6),
                  brand: 'JL Audio',
                  model: `W7 ${subwooferConfig.size}"`
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
                  id: 'battery-main',
                  type: 'battery',
                  name: 'Main Battery',
                  location: { x: 15, y: 25 },
                  brand: 'Optima',
                  model: 'RedTop'
                },
                {
                  id: 'battery-aux',
                  type: 'battery',
                  name: 'Auxiliary Battery',
                  location: { x: 85, y: 45 },
                  brand: 'Optima',
                  model: 'D35 AGM'
                },
                {
                  id: 'alternator-1',
                  type: 'alternator',
                  name: 'High Output Alt.',
                  location: { x: 20, y: 15 },
                  power: Math.round(wattage * 1.5),
                  brand: 'Mechman',
                  model: '370A'
                },
                ...(wattage > 2000 ? [{
                  id: 'capacitor-1',
                  type: 'capacitor' as const,
                  name: 'Power Capacitor',
                  location: { x: 70, y: 25 },
                  brand: 'Rockford Fosgate',
                  model: 'RFC35'
                }] : [])
              ]
            }}
            interactive={true}
            showComponentDetails={true}
          />
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-electric-400 mb-2">Competition Tips</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Place amplifiers away from direct heat</li>
                <li>• Use shortest power cable runs possible</li>
                <li>• Consider weight distribution</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-400 mb-2">Safety Guidelines</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Fuse all power connections</li>
                <li>• Secure all equipment properly</li>
                <li>• Ensure proper ventilation</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-orange-400 mb-2">Performance</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Optimize subwoofer placement</li>
                <li>• Minimize electrical interference</li>
                <li>• Plan for competition rules</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 mt-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-amber-200">
              <p className="font-semibold mb-1">Disclaimer</p>
              <p>
                This calculator is not affiliated with MECA®, IASCA®, USACi®, dB Drag®, ISPLL®, EMMA®, or any competition sanctioning organizations. 
                This tool is based on publicly available information and provides approximate class recommendations. 
                Actual competition classes may vary based on specific rules, vehicle modifications, and other factors not calculated here.
                Always verify class requirements with your specific organization's official rulebook before competing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SPLCalculator;