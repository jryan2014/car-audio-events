import React, { useState } from 'react';
import { BoxCalculator, SubwooferSelector, PortCalculator, CutSheetGenerator, SavedDesigns } from '../components/subwoofer';
import WiringDiagram from '../components/subwoofer/WiringDiagram';
import Box3DVisualizationSimple from '../components/subwoofer/Box3DVisualizationSimple';
import Box3DVisualizationAdvanced from '../components/subwoofer/Box3DVisualizationAdvanced';
import SEO from '../components/SEO';
import { Calculator, Box as BoxIcon, Eye, Volume2, Wind, Scissors, Save, AlertCircle, Cable, ArrowRight, ArrowLeft, Settings2, Sparkles } from 'lucide-react';

type TabType = 'selector' | 'wiring' | 'calculator' | 'port' | 'cutsheet' | 'saved';

const SubwooferDesigner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('selector');
  const [activeView, setActiveView] = useState<'calculator' | '3d' | 'both'>('both');
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState<'simple' | 'advanced'>('simple');
  const [currentStep, setCurrentStep] = useState(1);
  
  // Design state (shared between all components)
  const [designData, setDesignData] = useState<any>(null);
  const [selectedSubwoofer, setSelectedSubwoofer] = useState<any>(null);
  const [subwooferQuantity, setSubwooferQuantity] = useState(1);
  const [wiringConfiguration, setWiringConfiguration] = useState<'series' | 'parallel' | 'series_parallel'>('parallel');
  
  // Amplifier configuration state
  const [amplifierConfig, setAmplifierConfig] = useState({
    amplifierPower: 1000,
    amplifierCount: 1,
    amplifiersLinkable: true
  });
  
  const handleSaveDesign = async (design: any) => {
    console.log('Saving design:', design);
    setDesignData(design);
    setShowVisualization(true);
    setCurrentStep(Math.max(currentStep, 3));
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-400 z-50 animate-fade-in';
    notification.textContent = 'Design updated! 3D visualization ready.';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
    
    // TODO: Integrate with supabase to save to subwoofer_designs table
    // This would use the database schema from SUBWOOFER_SECURITY_DEPLOYMENT.md
  };

  const handleSubwooferSelected = (subwoofer: any) => {
    setSelectedSubwoofer(subwoofer);
    if (subwoofer) {
      setCurrentStep(Math.max(currentStep, 1));
    }
  };

  const handleNextStepFromSelection = () => {
    setActiveTab('wiring');
    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const handleNextStepFromWiring = () => {
    setActiveTab('calculator');
    setCurrentStep(3);
    window.scrollTo(0, 0);
  };

  const handleBackToSelection = () => {
    setActiveTab('selector');
    window.scrollTo(0, 0);
    // Don't reduce currentStep - keep progress
  };

  const handleBackToWiring = () => {
    setActiveTab('wiring');
    window.scrollTo(0, 0);
    // Don't reduce currentStep - keep progress
  };


  return (
    <>
      <SEO 
        title="Complete Subwoofer Design Suite - Car Audio Events"
        description="Professional subwoofer enclosure design suite with subwoofer database, acoustic calculations, port design, cut sheets, 3D visualization, and design sharing."
        keywords="subwoofer calculator, box design, car audio, 3D visualization, acoustic calculations, enclosure design, ported box, sealed box, port calculator, cut sheet, thiele-small parameters"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calculator className="h-8 w-8 text-electric-500" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Subwoofer Box Designer</h1>
                  <p className="text-gray-300">Complete subwoofer enclosure design suite with 3D visualization</p>
                </div>
              </div>
              
              {/* View Toggle - Only show on calculator tab */}
              {activeTab === 'calculator' && (
                <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
                  <button
                    onClick={() => setActiveView('calculator')}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      activeView === 'calculator' 
                        ? 'bg-electric-500 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Calculator className="h-4 w-4 inline mr-2" />
                    Calculator
                  </button>
                  <button
                    onClick={() => setActiveView('3d')}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      activeView === '3d' 
                        ? 'bg-electric-500 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                    disabled={!designData}
                  >
                    <BoxIcon className="h-4 w-4 inline mr-2" />
                    3D View
                  </button>
                  <button
                    onClick={() => setActiveView('both')}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      activeView === 'both' 
                        ? 'bg-electric-500 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Eye className="h-4 w-4 inline mr-2" />
                    Both
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Workflow Steps Guide */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-4">
            <div className="flex items-center justify-between overflow-x-auto">
              <div className="flex items-center space-x-2 text-xs">
                <div className={`flex items-center px-3 py-1 rounded-lg ${currentStep >= 1 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                  <span className="font-semibold mr-2">1</span>
                  Select Subwoofer
                </div>
                <div className="text-gray-500">→</div>
                <div className={`flex items-center px-3 py-1 rounded-lg ${currentStep >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                  <span className="font-semibold mr-2">2</span>
                  Wiring & Amplifier
                </div>
                <div className="text-gray-500">→</div>
                <div className={`flex items-center px-3 py-1 rounded-lg ${currentStep >= 3 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                  <span className="font-semibold mr-2">3</span>
                  Calculate Box
                </div>
                <div className="text-gray-500">→</div>
                <div className={`flex items-center px-3 py-1 rounded-lg ${currentStep >= 4 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                  <span className="font-semibold mr-2">4</span>
                  Design Port
                </div>
                <div className="text-gray-500">→</div>
                <div className={`flex items-center px-3 py-1 rounded-lg ${currentStep >= 5 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                  <span className="font-semibold mr-2">5</span>
                  Cut Sheet
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="bg-gray-800/50 rounded-xl p-2 border border-gray-700/50">
            <div className="flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('selector')}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                  activeTab === 'selector' 
                    ? 'bg-electric-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Volume2 className="h-4 w-4" />
                <span>Subwoofer Selection</span>
              </button>
              <button
                onClick={() => setActiveTab('wiring')}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                  activeTab === 'wiring' 
                    ? 'bg-electric-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
                disabled={!selectedSubwoofer}
              >
                <Cable className="h-4 w-4" />
                <span>Wiring & Amplifier</span>
              </button>
              <button
                onClick={() => setActiveTab('calculator')}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                  activeTab === 'calculator' 
                    ? 'bg-electric-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Calculator className="h-4 w-4" />
                <span>Box Calculator</span>
              </button>
              <button
                onClick={() => setActiveTab('port')}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                  activeTab === 'port' 
                    ? 'bg-electric-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Wind className="h-4 w-4" />
                <span>Port Calculator</span>
              </button>
              <button
                onClick={() => setActiveTab('cutsheet')}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                  activeTab === 'cutsheet' 
                    ? 'bg-electric-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Scissors className="h-4 w-4" />
                <span>Cut Sheet</span>
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                  activeTab === 'saved' 
                    ? 'bg-electric-500 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Save className="h-4 w-4" />
                <span>Saved Designs</span>
              </button>
            </div>
          </div>
          
          {/* Workflow Progress Indicator */}
          {!selectedSubwoofer && activeTab !== 'selector' && (
            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-400">Start with Subwoofer Selection</h3>
                  <p className="text-xs text-gray-300 mt-1">
                    Select your subwoofers first for accurate calculations throughout the design process.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('selector');
                    setCurrentStep(1);
                  }}
                  className="ml-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-black text-sm font-medium transition-colors"
                >
                  Select Subwoofer
                </button>
              </div>
            </div>
          )}
          
          {/* Tab Content */}
          <div className="min-h-screen">
            {/* Subwoofer Selection Tab */}
            {activeTab === 'selector' && (
              <div className="space-y-6">
                <SubwooferSelector
                  selectedSubwoofer={selectedSubwoofer}
                  quantity={subwooferQuantity}
                  configuration={wiringConfiguration}
                  onSubwooferChange={handleSubwooferSelected}
                  onQuantityChange={setSubwooferQuantity}
                  onConfigurationChange={(config) => setWiringConfiguration(config)}
                  onSpecsChange={(specs) => {
                    // Update design data with new specs
                    if (designData) {
                      setDesignData({ ...designData, subSpecs: specs });
                    }
                  }}
                />
                
                {/* Step 1 Complete Box */}
                {selectedSubwoofer && (
                  <div className="bg-gradient-to-r from-green-500/20 to-electric-500/20 rounded-xl p-6 border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">✓</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-green-400">Step 1 Complete</h3>
                          <p className="text-gray-300 text-sm">
                            {selectedSubwoofer.brand} {selectedSubwoofer.model} selected with {subwooferQuantity} subwoofer{subwooferQuantity > 1 ? 's' : ''} in {wiringConfiguration} configuration
                          </p>
                          <div className="text-xs text-gray-400 mt-1">
                            Total system power: {(selectedSubwoofer.power_rating_rms || 500) * subwooferQuantity}W RMS • 
                            Final impedance: {wiringConfiguration === 'series' ? (selectedSubwoofer.impedance || 4) * subwooferQuantity : 
                            wiringConfiguration === 'parallel' ? (selectedSubwoofer.impedance || 4) / subwooferQuantity :
                            subwooferQuantity % 2 === 0 ? ((selectedSubwoofer.impedance || 4) * 2) / (subwooferQuantity / 2) : (selectedSubwoofer.impedance || 4)}Ω
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {currentStep > 1 && (
                          <button
                            onClick={() => {
                              // Clear selection to modify
                              if (window.confirm('Going back will allow you to change your subwoofer selection. Continue?')) {
                                setCurrentStep(1);
                              }
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                          >
                            <span>Modify Selection</span>
                          </button>
                        )}
                        <button
                          onClick={handleNextStepFromSelection}
                          className="px-6 py-3 bg-electric-500 hover:bg-electric-600 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                        >
                          <span>Next Step</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Wiring & Amplifier Tab */}
            {activeTab === 'wiring' && (
              <WiringDiagram
                selectedSubwoofer={selectedSubwoofer}
                quantity={subwooferQuantity}
                configuration={wiringConfiguration}
                amplifierPower={amplifierConfig.amplifierPower}
                amplifierCount={amplifierConfig.amplifierCount}
                amplifiersLinkable={amplifierConfig.amplifiersLinkable}
                onNext={handleNextStepFromWiring}
                onBack={handleBackToSelection}
                onAmplifierChange={(config) => {
                  setAmplifierConfig(config);
                  // Update design data if it exists
                  if (designData) {
                    setDesignData({
                      ...designData,
                      amplifierConfig: config
                    });
                  }
                }}
              />
            )}
            
            {/* Box Calculator Tab */}
            {activeTab === 'calculator' && (
              <div className={`grid gap-8 ${activeView === 'both' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Calculator Section */}
                {(activeView === 'calculator' || activeView === 'both') && (
                  <div className={`${activeView === 'both' ? 'lg:col-span-1' : 'col-span-1'} space-y-6`}>
                    <BoxCalculator 
                      onSave={(design) => {
                        // Include amplifier configuration in saved design
                        const designWithAmpConfig = {
                          ...design,
                          amplifierConfig,
                          wiringConfiguration
                        };
                        handleSaveDesign(designWithAmpConfig);
                      }}
                      selectedSubwoofer={selectedSubwoofer}
                      subwooferQuantity={subwooferQuantity}
                      wiringConfiguration={wiringConfiguration}
                    />
                    
                    {/* Back button for calculator */}
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={handleBackToWiring}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span>Back to Wiring</span>
                        </button>
                        <span className="text-gray-400 text-sm">Step 3: Box Calculator</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 3D Visualization Section */}
                {(activeView === '3d' || (activeView === 'both' && showVisualization)) && designData && (
                  <div className={activeView === 'both' ? 'lg:col-span-1' : 'col-span-1'}>
                    {/* Visualization Mode Toggle */}
                    <div className="mb-4 bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Visualization Mode:</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setVisualizationMode('simple')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center space-x-1.5 ${
                              visualizationMode === 'simple'
                                ? 'bg-electric-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Simple</span>
                          </button>
                          <button
                            onClick={() => setVisualizationMode('advanced')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center space-x-1.5 ${
                              visualizationMode === 'advanced'
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            <span>Advanced</span>
                            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Render appropriate visualization component */}
                    {visualizationMode === 'simple' ? (
                      <Box3DVisualizationSimple
                        boxType={designData.boxType}
                        subCount={designData.subCount}
                        materialThickness={designData.materialThickness}
                        boxDimensions={designData.boxDimensions}
                        portDimensions={designData.portDimensions}
                        subSpecs={designData.subSpecs}
                        calculations={designData.calculations}
                      />
                    ) : (
                      <Box3DVisualizationAdvanced
                        boxType={designData.boxType}
                        subCount={designData.subCount}
                        materialThickness={designData.materialThickness}
                        boxDimensions={designData.boxDimensions}
                        portDimensions={designData.portDimensions}
                        subSpecs={designData.subSpecs}
                        calculations={designData.calculations}
                      />
                    )}
                  </div>
                )}
                
                {/* Placeholder when no design data */}
                {(activeView === '3d' || (activeView === 'both' && !showVisualization)) && !designData && (
                  <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 h-96 flex items-center justify-center">
                    <div className="text-center">
                      <BoxIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">No Design Yet</h3>
                      <p className="text-gray-500">
                        Complete your box calculations and save the design to see the 3D visualization
                      </p>
                      <button
                        onClick={() => setActiveView('calculator')}
                        className="mt-4 px-6 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white transition-colors"
                      >
                        Start Calculating
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Port Calculator Tab */}
            {activeTab === 'port' && designData && (
              <div className="space-y-6">
                <PortCalculator
                  boxDimensions={designData.boxDimensions}
                  airSpace={designData.calculations?.airSpace || 30}
                  subwooferSpecs={designData.subSpecs}
                  onPortChange={(port) => {
                    setDesignData({ ...designData, portDimensions: port });
                    setCurrentStep(Math.max(currentStep, 4));
                  }}
                />
                
                {/* Navigation for Port Calculator */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('calculator')}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Calculator</span>
                    </button>
                    <span className="text-gray-400 text-sm">Step 4: Port Design</span>
                    <button
                      onClick={() => setActiveTab('cutsheet')}
                      className="px-6 py-3 bg-electric-500 hover:bg-electric-600 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                      disabled={!designData?.portDimensions}
                    >
                      <span>Next Step</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'port' && !designData && (
              <div className="bg-gray-800/50 rounded-xl p-12 border border-gray-700/50 text-center">
                <Wind className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Design Data</h3>
                <p className="text-gray-500 mb-4">
                  Complete your box calculations first to access the port calculator
                </p>
                <button
                  onClick={() => setActiveTab('calculator')}
                  className="px-6 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white transition-colors"
                >
                  Go to Calculator
                </button>
              </div>
            )}
            
            {/* Cut Sheet Tab */}
            {activeTab === 'cutsheet' && designData && (
              <div className="space-y-6">
                <CutSheetGenerator
                  boxDimensions={designData.boxDimensions}
                  portDimensions={designData.portDimensions}
                  materialThickness={designData.materialThickness}
                  subwooferCount={designData.subCount}
                  boxType={designData.boxType}
                  subwooferSize={selectedSubwoofer?.size || 12}
                  designName={`Custom ${designData.boxType} Box`}
                />
                
                {/* Final Step Navigation */}
                <div className="bg-gradient-to-r from-green-500/20 to-electric-500/20 rounded-xl p-6 border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setActiveTab('port')}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Port Design</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">✓</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-400">Design Complete!</h3>
                        <p className="text-gray-300 text-sm">Your custom subwoofer enclosure design is ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'cutsheet' && !designData && (
              <div className="bg-gray-800/50 rounded-xl p-12 border border-gray-700/50 text-center">
                <Scissors className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Design Data</h3>
                <p className="text-gray-500 mb-4">
                  Complete your box calculations first to generate a cut sheet
                </p>
                <button
                  onClick={() => setActiveTab('calculator')}
                  className="px-6 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white transition-colors"
                >
                  Go to Calculator
                </button>
              </div>
            )}
            
            {/* Saved Designs Tab */}
            {activeTab === 'saved' && (
              <SavedDesigns
                onDesignSelect={(design) => {
                  setDesignData({
                    boxType: design.box_type,
                    subCount: design.subwoofer_count,
                    materialThickness: design.box_dimensions.material_thickness,
                    boxDimensions: design.box_dimensions,
                    portDimensions: design.port_dimensions,
                    subSpecs: design.subwoofer_specs,
                    calculations: design.calculations
                  });
                  setActiveTab('calculator');
                  setShowVisualization(true);
                }}
                onDesignDelete={(designId) => {
                  console.log('Delete design:', designId);
                  // TODO: Implement delete functionality
                }}
              />
            )}
          </div>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-8">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <Volume2 className="h-8 w-8 text-electric-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Subwoofer Database</h3>
              <p className="text-gray-400 text-sm">
                Choose from popular subwoofers with verified Thiele-Small parameters or enter custom specifications.
              </p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <Calculator className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Precise Calculations</h3>
              <p className="text-gray-400 text-sm">
                Professional acoustic calculations with real-time 3D visualization and performance analysis.
              </p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <Wind className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Advanced Ports</h3>
              <p className="text-gray-400 text-sm">
                Multiple port types with velocity analysis, tuning recommendations, and optimization tools.
              </p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <Scissors className="h-8 w-8 text-orange-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Build Instructions</h3>
              <p className="text-gray-400 text-sm">
                Complete cut sheets with material lists, assembly instructions, and cost estimates.
              </p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <Save className="h-8 w-8 text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Design Library</h3>
              <p className="text-gray-400 text-sm">
                Save, share, and browse community designs with tags, search, and collaboration features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubwooferDesigner;