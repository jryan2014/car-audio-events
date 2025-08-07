import React from 'react';
import { Calculator, Box, Eye, Wrench, BarChart3 } from 'lucide-react';
import SubwooferDesignerSimple from '../../pages/SubwooferDesignerSimple';

/**
 * Demo component showcasing the Subwoofer 3D Visualization
 * This demonstrates the integration of:
 * - BoxCalculator: Professional acoustic calculations
 * - Box3DVisualization: Interactive 3D rendering with Three.js
 * - SubwooferDesigner: Integrated interface combining both
 */
const SubwooferDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gradient-to-r from-electric-500/10 to-purple-500/10 border-b border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-4">
              Subwoofer Box Designer Demo
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Professional acoustic calculations with real-time 3D visualization
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-lg">
                <Calculator className="h-8 w-8 text-electric-500 mb-2" />
                <span className="text-sm text-gray-300">Thiele-Small</span>
                <span className="text-xs text-gray-400">Calculations</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-lg">
                <Box className="h-8 w-8 text-purple-500 mb-2" />
                <span className="text-sm text-gray-300">3D Rendering</span>
                <span className="text-xs text-gray-400">Three.js</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-lg">
                <Eye className="h-8 w-8 text-green-500 mb-2" />
                <span className="text-sm text-gray-300">Interactive</span>
                <span className="text-xs text-gray-400">Controls</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-orange-500 mb-2" />
                <span className="text-sm text-gray-300">Real-time</span>
                <span className="text-xs text-gray-400">Updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <SubwooferDesignerSimple />
      
      <div className="bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Technical Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-electric-500 rounded-full mr-3"></div>
                  Sealed and ported box calculations
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Real-time 3D visualization with Three.js
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Interactive camera controls (orbit, pan, zoom)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                  Transparency and exploded views
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Dimension labels and annotations
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  Export functionality
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Performance Optimizations</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <Wrench className="h-4 w-4 text-electric-500 mr-3" />
                  Lazy loading of 3D components
                </li>
                <li className="flex items-center">
                  <Wrench className="h-4 w-4 text-purple-500 mr-3" />
                  Instanced geometry for identical parts
                </li>
                <li className="flex items-center">
                  <Wrench className="h-4 w-4 text-green-500 mr-3" />
                  Proper material disposal
                </li>
                <li className="flex items-center">
                  <Wrench className="h-4 w-4 text-orange-500 mr-3" />
                  Responsive canvas sizing
                </li>
                <li className="flex items-center">
                  <Wrench className="h-4 w-4 text-blue-500 mr-3" />
                  Efficient re-rendering
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubwooferDemo;