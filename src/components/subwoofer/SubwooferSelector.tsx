import React, { useState, useMemo } from 'react';
import { Volume2, Zap, Info, Settings, Search, Cable, Calculator } from 'lucide-react';
import type { SubwooferDatabase, SubwooferSpecs } from '../../types/subwoofer';
import { SUBWOOFER_DATABASE, getAvailableImpedances } from '../../data/carAudioSubwooferDatabase';

const WIRING_CONFIGURATIONS = {
  series: {
    name: 'Series',
    description: 'Increases total impedance',
    formula: 'Z_total = Z1 + Z2 + Z3 + ...',
    icon: '⚊⚊⚊',
    calculate: (impedance: number, quantity: number) => impedance * quantity
  },
  parallel: {
    name: 'Parallel',
    description: 'Decreases total impedance',
    formula: '1/Z_total = 1/Z1 + 1/Z2 + ...',
    icon: '⚏⚏⚏',
    calculate: (impedance: number, quantity: number) => impedance / quantity
  },
  series_parallel: {
    name: 'Series-Parallel',
    description: 'Mixed configuration for specific impedance',
    formula: 'Combination of series and parallel',
    icon: '⚊⚏⚊',
    calculate: (impedance: number, quantity: number) => {
      // For even numbers, assume pairs in series, then parallel
      if (quantity % 2 === 0) {
        const seriesPairs = quantity / 2;
        return (impedance * 2) / seriesPairs;
      }
      // For odd numbers, return single impedance (can't do series-parallel)
      return impedance;
    }
  }
};

interface SubwooferSelectorProps {
  selectedSubwoofer: Partial<SubwooferDatabase> | null;
  quantity: number;
  configuration: keyof typeof WIRING_CONFIGURATIONS;
  onSubwooferChange: (sub: Partial<SubwooferDatabase> | null) => void;
  onQuantityChange: (qty: number) => void;
  onConfigurationChange: (config: keyof typeof WIRING_CONFIGURATIONS) => void;
  onSpecsChange: (specs: SubwooferSpecs) => void;
  className?: string;
}

const SubwooferSelector: React.FC<SubwooferSelectorProps> = ({
  selectedSubwoofer,
  quantity,
  configuration,
  onSubwooferChange,
  onQuantityChange,
  onConfigurationChange,
  onSpecsChange,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<number | 'all'>('all');
  const [filterPower, setFilterPower] = useState<string>('all');
  const [filterImpedance, setFilterImpedance] = useState<number | 'all'>('all');
  const [selectedImpedance, setSelectedImpedance] = useState<number | null>(null);
  const [customSpecs, setCustomSpecs] = useState<SubwooferSpecs>({
    fs: 30,
    qts: 0.45,
    vas: 50,
    sd: 500,
    xmax: 15,
    displacement: 0.1
  });
  const [useCustom, setUseCustom] = useState(false);

  // Get unique brands from database
  const brands = useMemo(() => {
    const uniqueBrands = [...new Set(SUBWOOFER_DATABASE.map(sub => sub.brand))];
    return ['all', ...uniqueBrands.sort()];
  }, []);

  // Get unique sizes from database
  const sizes = useMemo(() => {
    const uniqueSizes = [...new Set(SUBWOOFER_DATABASE.map(sub => sub.size))];
    return ['all' as const, ...uniqueSizes.sort((a, b) => (a || 0) - (b || 0))];
  }, []);

  // Get available impedance options
  const impedanceOptions = useMemo(() => {
    const options = new Set<number>();
    options.add(0.5);
    options.add(1);
    options.add(2);
    options.add(4);
    options.add(8);
    return ['all' as const, ...Array.from(options).sort((a, b) => a - b)];
  }, []);

  // Filter subwoofers based on search and filters
  const filteredSubwoofers = useMemo(() => {
    return SUBWOOFER_DATABASE.filter(sub => {
      const matchesSearch = searchTerm === '' || 
        `${sub.brand} ${sub.model}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBrand = filterBrand === 'all' || sub.brand === filterBrand;
      
      const matchesSize = filterSize === 'all' || sub.size === filterSize;
      
      const matchesPower = filterPower === 'all' || 
        (filterPower === 'low' && (sub.power_rating_rms || 0) <= 500) ||
        (filterPower === 'medium' && (sub.power_rating_rms || 0) > 500 && (sub.power_rating_rms || 0) <= 1000) ||
        (filterPower === 'high' && (sub.power_rating_rms || 0) > 1000);
      
      const matchesImpedance = filterImpedance === 'all' || sub.impedance === filterImpedance;
      
      return matchesSearch && matchesBrand && matchesSize && matchesPower && matchesImpedance;
    });
  }, [searchTerm, filterBrand, filterSize, filterPower, filterImpedance]);

  // Calculate final impedance based on wiring configuration
  const finalImpedance = useMemo(() => {
    if (!selectedSubwoofer?.impedance) return null;
    const config = WIRING_CONFIGURATIONS[configuration];
    return config.calculate(selectedSubwoofer.impedance, quantity);
  }, [selectedSubwoofer, quantity, configuration]);

  // Calculate total power handling
  const totalPowerHandling = useMemo(() => {
    if (!selectedSubwoofer?.power_rating_rms) return null;
    return {
      rms: selectedSubwoofer.power_rating_rms * quantity,
      peak: (selectedSubwoofer.power_rating_peak || selectedSubwoofer.power_rating_rms * 2) * quantity
    };
  }, [selectedSubwoofer, quantity]);

  const handleSubwooferSelect = (sub: Partial<SubwooferDatabase>) => {
    // Get available impedances for this model
    const availableImpedances = getAvailableImpedances(sub.brand || '', sub.model || '');
    
    // Set the impedance to the one in the database or let user select
    setSelectedImpedance(sub.impedance || null);
    
    onSubwooferChange(sub);
    if (sub.specs) {
      onSpecsChange(sub.specs);
    }
    setUseCustom(false);
  };

  const handleCustomSpecsToggle = () => {
    setUseCustom(!useCustom);
    if (!useCustom) {
      onSubwooferChange(null);
      onSpecsChange(customSpecs);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Volume2 className="h-8 w-8 text-electric-500" />
          <h2 className="text-2xl font-bold text-white">Subwoofer Selection</h2>
        </div>
        <p className="text-gray-300">
          Choose from our extensive database of {SUBWOOFER_DATABASE.length}+ subwoofers or enter custom specifications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters and Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search and Filters */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Search className="h-5 w-5 mr-2 text-electric-500" />
              Search & Filter
            </h3>
            
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by brand or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Brand</label>
                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {brands.map(brand => (
                      <option key={brand} value={brand}>
                        {brand === 'all' ? 'All Brands' : brand}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Size</label>
                  <select
                    value={filterSize}
                    onChange={(e) => setFilterSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {sizes.map(size => (
                      <option key={size} value={size}>
                        {size === 'all' ? 'All Sizes' : `${size}"`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Power Range</label>
                  <select
                    value={filterPower}
                    onChange={(e) => setFilterPower(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="all">All Power</option>
                    <option value="low">≤ 500W RMS</option>
                    <option value="medium">500-1000W RMS</option>
                    <option value="high">&gt; 1000W RMS</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Impedance (Ω)</label>
                  <select
                    value={filterImpedance}
                    onChange={(e) => setFilterImpedance(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {impedanceOptions.map(imp => (
                      <option key={imp} value={imp}>
                        {imp === 'all' ? 'All Impedances' : `${imp}Ω`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-400">
              Found {filteredSubwoofers.length} subwoofers
            </div>
          </div>

          {/* Subwoofer List */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              Available Subwoofers
            </h3>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredSubwoofers.map((sub, index) => (
                <button
                  key={index}
                  onClick={() => handleSubwooferSelect(sub)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedSubwoofer?.model === sub.model && selectedSubwoofer?.brand === sub.brand
                      ? 'bg-electric-500/20 border-electric-500/50'
                      : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">
                        {sub.brand} {sub.model}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {sub.size}" • {sub.power_rating_rms}W RMS • {sub.impedance}Ω
                      </div>
                      {sub.specs && (
                        <div className="text-xs text-gray-500 mt-1">
                          Fs: {sub.specs.fs}Hz • Qts: {sub.specs.qts} • Vas: {sub.specs.vas}L
                        </div>
                      )}
                    </div>
                    <Zap className="h-5 w-5 text-electric-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Specifications */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Settings className="h-5 w-5 mr-2 text-electric-500" />
                Custom Specifications
              </h3>
              <button
                onClick={handleCustomSpecsToggle}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  useCustom
                    ? 'bg-electric-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {useCustom ? 'Using Custom' : 'Use Custom'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fs (Hz)</label>
                <input
                  type="number"
                  value={customSpecs.fs}
                  onChange={(e) => setCustomSpecs({...customSpecs, fs: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={!useCustom}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Qts</label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpecs.qts}
                  onChange={(e) => setCustomSpecs({...customSpecs, qts: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={!useCustom}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Vas (L)</label>
                <input
                  type="number"
                  value={customSpecs.vas}
                  onChange={(e) => setCustomSpecs({...customSpecs, vas: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={!useCustom}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Sd (cm²)</label>
                <input
                  type="number"
                  value={customSpecs.sd}
                  onChange={(e) => setCustomSpecs({...customSpecs, sd: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={!useCustom}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Xmax (mm)</label>
                <input
                  type="number"
                  value={customSpecs.xmax}
                  onChange={(e) => setCustomSpecs({...customSpecs, xmax: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={!useCustom}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Displacement (L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpecs.displacement}
                  onChange={(e) => setCustomSpecs({...customSpecs, displacement: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={!useCustom}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Quantity and Wiring */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Cable className="h-5 w-5 mr-2 text-electric-500" />
              Subwoofer Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Subwoofer Quantity</label>
                <select
                  value={quantity}
                  onChange={(e) => onQuantityChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {[...Array(20)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} Subwoofer{i + 1 > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {quantity > 1 && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Wiring Configuration</label>
                  <div className="space-y-2">
                    {Object.entries(WIRING_CONFIGURATIONS).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => onConfigurationChange(key as keyof typeof WIRING_CONFIGURATIONS)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          configuration === key
                            ? 'bg-electric-500/20 border-electric-500/50'
                            : 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50'
                        }`}
                        disabled={key === 'series_parallel' && quantity % 2 !== 0}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white flex items-center">
                              <span className="mr-2">{config.icon}</span>
                              {config.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {config.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Impedance Calculator */}
          {selectedSubwoofer && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-electric-500" />
                System Calculations
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Individual Impedance:</span>
                  <span className="text-white font-medium">{selectedSubwoofer.impedance}Ω</span>
                </div>
                
                {quantity > 1 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Configuration:</span>
                      <span className="text-white font-medium">
                        {WIRING_CONFIGURATIONS[configuration].name}
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Final Impedance:</span>
                        <span className="text-electric-400 font-bold text-lg">
                          {finalImpedance?.toFixed(2)}Ω
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                {totalPowerHandling && (
                  <div className="border-t border-gray-700 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total RMS Power:</span>
                      <span className="text-purple-400 font-bold">
                        {totalPowerHandling.rms}W
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Peak Power:</span>
                      <span className="text-purple-400 font-bold">
                        {totalPowerHandling.peak}W
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                  <div className="text-xs text-gray-400">
                    <Info className="h-4 w-4 inline mr-1" />
                    {configuration === 'series' && 
                      `Series wiring adds impedances: ${quantity} × ${selectedSubwoofer.impedance}Ω = ${finalImpedance?.toFixed(2)}Ω`
                    }
                    {configuration === 'parallel' && 
                      `Parallel wiring divides impedance: ${selectedSubwoofer.impedance}Ω ÷ ${quantity} = ${finalImpedance?.toFixed(2)}Ω`
                    }
                    {configuration === 'series_parallel' && quantity % 2 === 0 &&
                      `Series-parallel: ${quantity/2} pairs of ${selectedSubwoofer.impedance * 2}Ω in parallel = ${finalImpedance?.toFixed(2)}Ω`
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected Subwoofer Details */}
          {selectedSubwoofer && (
            <div className="bg-gradient-to-r from-electric-500/10 to-purple-500/10 rounded-xl p-6 border border-electric-500/30">
              <h3 className="text-lg font-semibold text-white mb-3">
                Selected Subwoofer
              </h3>
              <div className="space-y-3">
                <div className="text-electric-400 font-bold text-xl">
                  {selectedSubwoofer.brand} {selectedSubwoofer.model}
                </div>
                <div className="text-sm text-gray-300">
                  {selectedSubwoofer.size}" • {selectedSubwoofer.power_rating_rms}W RMS
                </div>
                
                {/* Impedance Selector */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Select Impedance</label>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableImpedances(selectedSubwoofer.brand || '', selectedSubwoofer.model || '').map(imp => (
                      <button
                        key={imp}
                        onClick={() => {
                          const updatedSub = { ...selectedSubwoofer, impedance: imp };
                          onSubwooferChange(updatedSub);
                          setSelectedImpedance(imp);
                        }}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          (selectedImpedance || selectedSubwoofer.impedance) === imp
                            ? 'bg-electric-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {imp < 1 ? `${imp}Ω` : `${imp}Ω`}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {selectedImpedance || selectedSubwoofer.impedance}Ω
                  </div>
                </div>
                {selectedSubwoofer.specs && (
                  <div className="text-xs text-gray-400 space-y-1 mt-2">
                    <div>Fs: {selectedSubwoofer.specs.fs} Hz</div>
                    <div>Qts: {selectedSubwoofer.specs.qts}</div>
                    <div>Vas: {selectedSubwoofer.specs.vas} L</div>
                    <div>Xmax: {selectedSubwoofer.specs.xmax} mm</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubwooferSelector;