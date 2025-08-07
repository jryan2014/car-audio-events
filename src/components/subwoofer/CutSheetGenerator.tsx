import React, { useState, useMemo, useRef } from 'react';
import { FileText, Download, Printer, Scissors, Package, AlertCircle, Ruler, Calculator } from 'lucide-react';
import type { BoxDimensions, PortDimensions, CutSheet } from '../../types/subwoofer';

interface CutPiece {
  name: string;
  quantity: number;
  width: number;
  height: number;
  thickness: number;
  material: string;
  notes?: string;
  cutAngle?: number;
  area?: number;
}

interface HardwareItem {
  name: string;
  quantity: number;
  size?: string;
  notes?: string;
  category: 'screws' | 'adhesive' | 'terminal' | 'damping' | 'other';
}

interface CutSheetGeneratorProps {
  boxDimensions: BoxDimensions;
  portDimensions?: PortDimensions;
  materialThickness: number;
  subwooferCount: number;
  boxType: 'sealed' | 'ported' | 'bandpass';
  subwooferSize: number;
  designName?: string;
  className?: string;
}

const STANDARD_SHEET_SIZES = {
  '4x8_mdf': { width: 48, height: 96, name: '4\' x 8\' MDF' },
  '4x8_plywood': { width: 48, height: 96, name: '4\' x 8\' Plywood' },
  '2x4_mdf': { width: 24, height: 48, name: '2\' x 4\' MDF' }
};

const MATERIAL_TYPES = {
  mdf: { name: 'MDF', density: 750, cost_per_bf: 3.50 },
  plywood: { name: 'Plywood', density: 600, cost_per_bf: 5.00 },
  particle_board: { name: 'Particle Board', density: 650, cost_per_bf: 2.50 }
};

const HARDWARE_CATALOG: HardwareItem[] = [
  // Screws
  { name: 'Wood Screws', quantity: 0, size: '#8 x 1.25"', category: 'screws', notes: 'Panel assembly' },
  { name: 'Wood Screws', quantity: 0, size: '#8 x 2"', category: 'screws', notes: 'Corner bracing' },
  { name: 'Drywall Screws', quantity: 0, size: '#6 x 1"', category: 'screws', notes: 'Terminal cup mounting' },
  
  // Adhesive
  { name: 'Wood Glue', quantity: 1, size: '16 oz', category: 'adhesive', notes: 'Titebond II recommended' },
  { name: 'Construction Adhesive', quantity: 1, size: '10 oz tube', category: 'adhesive', notes: 'Panel joints' },
  { name: 'Caulk', quantity: 1, size: 'Tube', category: 'adhesive', notes: 'Sealing joints' },
  
  // Terminal hardware
  { name: 'Terminal Cup', quantity: 1, category: 'terminal', notes: 'Speaker wire connection' },
  { name: 'Speaker Wire', quantity: 6, size: '12 AWG', category: 'terminal', notes: 'Internal wiring (feet)' },
  
  // Damping
  { name: 'Polyfill', quantity: 1, size: '1 lb bag', category: 'damping', notes: 'Optional acoustic stuffing' },
  { name: 'Foam Padding', quantity: 1, size: '12" x 12" sheet', category: 'damping', notes: 'Internal damping' }
];

const CutSheetGenerator: React.FC<CutSheetGeneratorProps> = ({
  boxDimensions,
  portDimensions,
  materialThickness,
  subwooferCount,
  boxType,
  subwooferSize,
  designName = 'Custom Subwoofer Box',
  className = ''
}) => {
  const [materialType, setMaterialType] = useState<'mdf' | 'plywood' | 'particle_board'>('mdf');
  const [wastePercentage, setWastePercentage] = useState(15);
  const [sheetSize, setSheetSize] = useState<keyof typeof STANDARD_SHEET_SIZES>('4x8_mdf');
  const [includeAssemblyInstructions, setIncludeAssemblyInstructions] = useState(true);
  const [showOptimization, setShowOptimization] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Calculate all cut pieces
  const cutPieces = useMemo((): CutPiece[] => {
    const { width, height, depth } = boxDimensions;
    const t = materialThickness;
    
    const pieces: CutPiece[] = [
      // Main panels
      {
        name: 'Front Panel',
        quantity: 1,
        width: width,
        height: height,
        thickness: t,
        material: materialType,
        notes: `Subwoofer cutout: ${subwooferSize}" dia ${subwooferCount}x`
      },
      {
        name: 'Back Panel',
        quantity: 1,
        width: width,
        height: height,
        thickness: t,
        material: materialType,
        notes: boxType === 'ported' && portDimensions ? 'Port cutout required' : 'Terminal cup cutout'
      },
      {
        name: 'Top Panel',
        quantity: 1,
        width: width,
        height: depth,
        thickness: t,
        material: materialType
      },
      {
        name: 'Bottom Panel',
        quantity: 1,
        width: width,
        height: depth,
        thickness: t,
        material: materialType
      },
      {
        name: 'Left Side Panel',
        quantity: 1,
        width: depth,
        height: height - (2 * t), // Account for top/bottom thickness
        thickness: t,
        material: materialType
      },
      {
        name: 'Right Side Panel',
        quantity: 1,
        width: depth,
        height: height - (2 * t), // Account for top/bottom thickness
        thickness: t,
        material: materialType
      }
    ];

    // Add port pieces if ported box
    if (boxType === 'ported' && portDimensions) {
      const { width: pw, height: ph, length: pl } = portDimensions;
      
      pieces.push(
        {
          name: 'Port Front',
          quantity: 1,
          width: pw + (2 * t),
          height: ph + (2 * t),
          thickness: t,
          material: materialType,
          notes: `Port opening: ${pw}" x ${ph}"`
        },
        {
          name: 'Port Back',
          quantity: 1,
          width: pw + (2 * t),
          height: ph + (2 * t),
          thickness: t,
          material: materialType,
          notes: `Port opening: ${pw}" x ${ph}"`
        },
        {
          name: 'Port Top',
          quantity: 1,
          width: pw + (2 * t),
          height: pl,
          thickness: t,
          material: materialType
        },
        {
          name: 'Port Bottom',
          quantity: 1,
          width: pw + (2 * t),
          height: pl,
          thickness: t,
          material: materialType
        },
        {
          name: 'Port Left Side',
          quantity: 1,
          width: pl,
          height: ph,
          thickness: t,
          material: materialType
        },
        {
          name: 'Port Right Side',
          quantity: 1,
          width: pl,
          height: ph,
          thickness: t,
          material: materialType
        }
      );
    }

    // Add internal bracing if large box
    const boxVolume = width * height * depth * 0.0163871; // Convert to liters
    if (boxVolume > 50) { // Add bracing for boxes > 50L
      pieces.push({
        name: 'Internal Brace',
        quantity: 2,
        width: width - (2 * t),
        height: 4,
        thickness: t,
        material: materialType,
        notes: 'Internal bracing for rigidity'
      });
    }

    // Calculate areas for all pieces
    return pieces.map(piece => ({
      ...piece,
      area: piece.width * piece.height * piece.quantity
    }));
  }, [boxDimensions, portDimensions, materialThickness, materialType, boxType, subwooferSize, subwooferCount]);

  // Calculate hardware requirements
  const hardwareList = useMemo((): HardwareItem[] => {
    const hardware = [...HARDWARE_CATALOG];
    
    // Calculate screw quantities based on panel perimeter
    const totalPerimeter = cutPieces.reduce((sum, piece) => {
      const perimeter = 2 * (piece.width + piece.height);
      return sum + (perimeter * piece.quantity);
    }, 0);
    
    // 1 screw every 6 inches of perimeter
    const screwCount = Math.ceil(totalPerimeter / 6);
    
    hardware[0].quantity = Math.ceil(screwCount * 0.7); // 70% assembly screws
    hardware[1].quantity = Math.ceil(screwCount * 0.3); // 30% bracing screws
    hardware[2].quantity = 4; // Terminal cup screws
    
    // Adjust terminal hardware for multiple subs
    const terminalIndex = hardware.findIndex(h => h.name === 'Terminal Cup');
    if (terminalIndex >= 0) {
      hardware[terminalIndex].quantity = Math.max(1, Math.ceil(subwooferCount / 2));
    }
    
    return hardware.filter(h => h.quantity > 0);
  }, [cutPieces, subwooferCount]);

  // Calculate material requirements
  const materialStats = useMemo(() => {
    const totalArea = cutPieces.reduce((sum, piece) => sum + (piece.area || 0), 0);
    const boardFeet = (totalArea * materialThickness) / 144;
    const boardFeetWithWaste = boardFeet * (1 + wastePercentage / 100);
    
    // Sheet optimization
    const sheetInfo = STANDARD_SHEET_SIZES[sheetSize];
    const sheetArea = sheetInfo.width * sheetInfo.height;
    const sheetsNeeded = Math.ceil(totalArea / sheetArea);
    
    const materialInfo = MATERIAL_TYPES[materialType];
    const estimatedCost = boardFeetWithWaste * materialInfo.cost_per_bf;
    const estimatedWeight = (boardFeetWithWaste / 12) * materialInfo.density * 0.00220462; // Convert to pounds
    
    return {
      totalArea,
      boardFeet,
      boardFeetWithWaste,
      sheetsNeeded,
      sheetInfo,
      estimatedCost,
      estimatedWeight
    };
  }, [cutPieces, materialThickness, wastePercentage, sheetSize, materialType]);

  // Assembly instructions
  const assemblySteps = useMemo(() => [
    '1. Cut all pieces according to the cut list above',
    '2. Sand all pieces with 120-grit sandpaper, then 220-grit for smooth finish',
    '3. Cut subwoofer holes in front panel using a router with circle jig',
    '4. Cut terminal cup hole in back panel (typically 1.5" diameter)',
    boxType === 'ported' && portDimensions ? '5. Cut port opening in back panel' : '',
    '6. Apply construction adhesive to panel edges',
    '7. Assemble box using wood screws, starting with sides to front/back',
    '8. Install top and bottom panels',
    boxType === 'ported' ? '9. Assemble and install port tube' : '',
    '10. Apply caulk to all internal joints for air sealing',
    '11. Install internal bracing if included',
    '12. Install terminal cup and wire internally',
    '13. Test fit subwoofers before final installation',
    '14. Apply finish as desired (paint, carpet, vinyl wrap)'
  ].filter(Boolean), [boxType, portDimensions]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // This would integrate with a PDF generation library like jsPDF or Puppeteer
    alert('PDF download feature would be implemented with a PDF generation library');
  };

  const exportCutSheet = (): CutSheet => {
    return {
      design_id: 'current',
      pieces: cutPieces.map(piece => ({
        name: piece.name,
        quantity: piece.quantity,
        width: piece.width,
        height: piece.height,
        thickness: piece.thickness,
        material: piece.material,
        notes: piece.notes || ''
      })),
      hardware: hardwareList.map(item => ({
        name: item.name,
        quantity: item.quantity,
        size: item.size,
        notes: item.notes
      }))
    };
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Scissors className="h-8 w-8 text-electric-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Cut Sheet Generator</h2>
              <p className="text-gray-300">Complete build instructions and material list</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white font-semibold transition-colors flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-semibold transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Material Type</label>
          <select
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value as 'mdf' | 'plywood' | 'particle_board')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            {Object.entries(MATERIAL_TYPES).map(([key, material]) => (
              <option key={key} value={key}>{material.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Sheet Size</label>
          <select
            value={sheetSize}
            onChange={(e) => setSheetSize(e.target.value as keyof typeof STANDARD_SHEET_SIZES)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            {Object.entries(STANDARD_SHEET_SIZES).map(([key, sheet]) => (
              <option key={key} value={key}>{sheet.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Waste Factor (%)</label>
          <input
            type="number"
            value={wastePercentage}
            onChange={(e) => setWastePercentage(parseInt(e.target.value) || 15)}
            min={5}
            max={50}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 flex items-center">
          <input
            type="checkbox"
            checked={showOptimization}
            onChange={(e) => setShowOptimization(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 mr-2"
          />
          <label className="text-sm text-gray-300">Show Sheet Layout</label>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print:bg-white print:text-black">
        
        {/* Project Header */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6 print:bg-transparent print:border print:border-gray-400">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 print:text-black">{designName}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Box Type:</span>
                  <span className="text-white print:text-black font-semibold">{boxType.charAt(0).toUpperCase() + boxType.slice(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Dimensions:</span>
                  <span className="text-white print:text-black">{boxDimensions.width}" × {boxDimensions.height}" × {boxDimensions.depth}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Material:</span>
                  <span className="text-white print:text-black">{materialThickness}" {MATERIAL_TYPES[materialType].name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Subwoofers:</span>
                  <span className="text-white print:text-black">{subwooferCount}× {subwooferSize}"</span>
                </div>
              </div>
            </div>

            {/* Material Summary */}
            <div className="bg-gray-700/50 p-4 rounded-lg print:bg-gray-100">
              <h4 className="font-semibold text-white mb-3 print:text-black">Material Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Board Feet:</span>
                  <span className="text-white print:text-black">{materialStats.boardFeetWithWaste.toFixed(1)} bf</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Sheets Needed:</span>
                  <span className="text-white print:text-black">{materialStats.sheetsNeeded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Est. Cost:</span>
                  <span className="text-white print:text-black">${materialStats.estimatedCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-700">Est. Weight:</span>
                  <span className="text-white print:text-black">{materialStats.estimatedWeight.toFixed(1)} lbs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cut List */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6 print:bg-transparent print:border print:border-gray-400">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center print:text-black">
            <Ruler className="h-5 w-5 mr-2 text-electric-500 print:text-gray-700" />
            Cut List
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600 print:border-gray-400">
                  <th className="text-left py-2 text-gray-300 print:text-gray-700">Piece Name</th>
                  <th className="text-center py-2 text-gray-300 print:text-gray-700">Qty</th>
                  <th className="text-center py-2 text-gray-300 print:text-gray-700">Width</th>
                  <th className="text-center py-2 text-gray-300 print:text-gray-700">Height</th>
                  <th className="text-center py-2 text-gray-300 print:text-gray-700">Thickness</th>
                  <th className="text-left py-2 text-gray-300 print:text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {cutPieces.map((piece, index) => (
                  <tr key={index} className="border-b border-gray-700/50 print:border-gray-300">
                    <td className="py-2 text-white print:text-black font-medium">{piece.name}</td>
                    <td className="py-2 text-center text-white print:text-black">{piece.quantity}</td>
                    <td className="py-2 text-center text-white print:text-black">{piece.width}"</td>
                    <td className="py-2 text-center text-white print:text-black">{piece.height}"</td>
                    <td className="py-2 text-center text-white print:text-black">{piece.thickness}"</td>
                    <td className="py-2 text-gray-400 print:text-gray-700 text-xs">{piece.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hardware List */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6 print:bg-transparent print:border print:border-gray-400">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center print:text-black">
            <Package className="h-5 w-5 mr-2 text-electric-500 print:text-gray-700" />
            Hardware & Supplies
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(
              hardwareList.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, HardwareItem[]>)
            ).map(([category, items]) => (
              <div key={category}>
                <h4 className="font-semibold text-electric-400 print:text-gray-700 mb-2 capitalize">
                  {category.replace('_', ' ')}
                </h4>
                <div className="space-y-1">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-300 print:text-gray-700">
                        {item.name} {item.size && `(${item.size})`}
                      </span>
                      <span className="text-white print:text-black font-medium">
                        {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assembly Instructions */}
        {includeAssemblyInstructions && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6 print:bg-transparent print:border print:border-gray-400">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center print:text-black">
              <FileText className="h-5 w-5 mr-2 text-electric-500 print:text-gray-700" />
              Assembly Instructions
            </h3>
            
            <div className="space-y-2">
              {assemblySteps.map((step, index) => (
                <div key={index} className="text-gray-300 print:text-gray-700 text-sm">
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg print:bg-yellow-50 print:border-yellow-400">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-400 print:text-yellow-700 mt-0.5" />
                <div>
                  <h4 className="text-yellow-400 print:text-yellow-700 font-semibold mb-1">Safety Notes</h4>
                  <ul className="text-yellow-300 print:text-yellow-700 text-sm space-y-1">
                    <li>• Always wear safety glasses and hearing protection when cutting</li>
                    <li>• Use dust collection when cutting MDF - particles are harmful</li>
                    <li>• Pre-drill holes to prevent splitting</li>
                    <li>• Allow adhesives to fully cure before stress testing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Controls */}
      <div className="flex items-center space-x-4 pt-6 border-t border-gray-700 print:hidden">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={includeAssemblyInstructions}
            onChange={(e) => setIncludeAssemblyInstructions(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700"
          />
          <label className="text-sm text-gray-300">Include Assembly Instructions</label>
        </div>

        <button
          onClick={() => console.log('Export data:', exportCutSheet())}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
        >
          Export Data
        </button>
      </div>
    </div>
  );
};

export default CutSheetGenerator;