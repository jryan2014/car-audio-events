# Subwoofer Box Designer with 3D Visualization

This module provides a comprehensive subwoofer box design solution with real-time 3D visualization using Three.js and React Three Fiber.

## Components

### BoxCalculator
Professional acoustic calculations for sealed and ported subwoofer enclosures based on Thiele-Small parameters.

**Features:**
- Sealed box calculations (Qtc, F3 frequency)
- Ported box calculations (tuning frequency, port velocity)
- Material requirements calculation
- Multiple subwoofer configurations (1-4 subs)
- Optimal dimension calculation using golden ratios
- Real-time validation and warnings

### Box3DVisualization
Interactive 3D rendering of subwoofer box designs with comprehensive visualization features.

**Features:**
- Real-time 3D model updates
- Interactive camera controls (orbit, pan, zoom)
- Multiple view presets (front, back, top, isometric, side)
- Transparency toggle for internal structure viewing
- Exploded view to see individual panels
- Dimension labels and annotations
- Internal bracing visualization
- Subwoofer driver placement
- Port tube rendering (for ported designs)
- Export to image functionality
- Grid floor for scale reference
- Professional lighting and shadows

**Technical Implementation:**
- Built with Three.js and React Three Fiber
- Lazy loading for performance optimization
- Proper geometry and material disposal
- Instanced geometry for identical components
- Responsive canvas sizing
- Efficient re-rendering patterns

### SubwooferDesigner
Integrated interface combining the calculator and 3D visualization with view switching and real-time updates.

**Features:**
- Side-by-side calculator and 3D view
- View switching (Calculator only, 3D only, Both)
- Real-time design updates
- Comprehensive feature highlights
- Loading states and error handling

## Installation

Required dependencies:
```bash
npm install @react-three/fiber @react-three/drei three
npm install --save-dev @types/three
```

## Usage

### Basic Usage

```tsx
import { SubwooferDesigner } from '../components/subwoofer';

function App() {
  return <SubwooferDesigner />;
}
```

### Using Individual Components

```tsx
import { BoxCalculator, Box3DVisualization } from '../components/subwoofer';

function CustomDesigner() {
  const [design, setDesign] = useState(null);

  return (
    <div className="grid grid-cols-2 gap-8">
      <BoxCalculator onSave={setDesign} />
      {design && (
        <Box3DVisualization
          boxType={design.boxType}
          subCount={design.subCount}
          materialThickness={design.materialThickness}
          boxDimensions={design.boxDimensions}
          portDimensions={design.portDimensions}
          subSpecs={design.subSpecs}
          calculations={design.calculations}
        />
      )}
    </div>
  );
}
```

## Props

### Box3DVisualization Props

```typescript
interface Box3DVisualizationProps {
  boxType: 'sealed' | 'ported' | 'bandpass';
  subCount: 1 | 2 | 3 | 4;
  materialThickness: 0.5 | 0.75 | 1;
  boxDimensions: BoxDimensions;
  portDimensions?: PortDimensions;
  subSpecs: SubwooferSpecs;
  calculations: CalculationResults;
  className?: string;
}

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
  fs: number;      // Resonant frequency (Hz)
  qts: number;     // Total Q factor
  vas: number;     // Equivalent air compliance (L)
  sd: number;      // Effective piston area (cm²)
  xmax: number;    // Maximum linear excursion (mm)
  displacement: number; // Driver displacement (L)
}
```

## Performance Considerations

### Optimization Features
- **Lazy Loading**: 3D components are lazy loaded to improve initial page load
- **Efficient Rendering**: React Three Fiber's efficient reconciliation
- **Instanced Geometry**: Identical components use instanced rendering
- **Proper Cleanup**: Materials and geometries are properly disposed
- **LOD Support**: Level of Detail for complex models (ready for extension)
- **Responsive Design**: Canvas resizes efficiently with container

### Memory Management
- Materials are created once and reused
- Geometries are disposed when components unmount
- Textures are loaded efficiently
- Event listeners are cleaned up properly

## 3D Visualization Controls

### Camera Controls
- **Left Click + Drag**: Rotate around the model
- **Right Click + Drag**: Pan the camera
- **Scroll Wheel**: Zoom in/out
- **View Presets**: Quick camera positioning

### Display Options
- **Transparency**: See through box walls to internal structure
- **Exploded View**: Separate panels for construction understanding
- **Dimension Labels**: Show measurements on hover
- **Internal Bracing**: Display structural reinforcement

### Export Features
- **Image Export**: Save current 3D view as PNG
- **High Resolution**: Export at canvas resolution
- **Filename Convention**: Includes box type and timestamp

## Acoustic Calculations

### Sealed Box
- Qtc (Total Q factor) calculation
- F3 (-3dB frequency) determination
- Volume optimization based on Thiele-Small parameters
- Standing wave optimization using golden ratios

### Ported Box
- Helmholtz resonance frequency calculation
- Port velocity analysis
- End correction factors
- Tuning frequency optimization

### Material Calculations
- Surface area calculation
- Board feet requirements
- Waste factor recommendations
- Internal volume accounting

## Browser Compatibility

### WebGL Support
- Modern browsers with WebGL support
- Hardware acceleration recommended
- Fallback handling for unsupported devices

### Performance Requirements
- Minimum 2GB RAM recommended
- Dedicated graphics preferred for complex scenes
- Mobile devices supported with reduced complexity

## Troubleshooting

### Common Issues
1. **Black Screen**: Check WebGL support in browser
2. **Poor Performance**: Reduce transparency and exploded view usage
3. **Memory Issues**: Ensure components are properly unmounted
4. **Loading Delays**: Normal for initial Three.js initialization

### Debug Mode
Enable React DevTools and Three.js DevTools for debugging:
```typescript
// Add to development environment
if (process.env.NODE_ENV === 'development') {
  // Three.js debugging tools
  window.THREE = THREE;
}
```

## Future Enhancements

### Planned Features
- VR/AR support for immersive design review
- Advanced material textures (wood grain, carpet, etc.)
- Cut sheet generation with exact measurements
- Assembly animation sequences
- Performance optimization analytics
- Mobile-specific optimizations

### Extension Points
- Custom material libraries
- Plugin system for additional box types
- Integration with CAD software
- Real-time collaboration features

## Contributing

When contributing to this module:
1. Maintain TypeScript strict mode compatibility
2. Follow the existing component patterns
3. Add comprehensive prop documentation
4. Include performance benchmarks for 3D features
5. Test on multiple devices and browsers
6. Update this documentation for new features

## Architecture Notes

### Component Hierarchy
```
SubwooferDesigner
├── BoxCalculator (acoustic calculations)
└── Box3DVisualization (3D rendering)
    ├── Box3DScene (main scene)
    ├── BoxStructure (geometry)
    ├── SubwooferDriver (components)
    ├── PortTube (ported designs)
    ├── InternalBracing (structural)
    └── DimensionLabel (annotations)
```

### State Management
- Local component state for UI controls
- Props for design data flow
- Lazy loading for performance
- Memoization for expensive calculations

### File Structure
```
src/components/subwoofer/
├── BoxCalculator.tsx          # Acoustic calculations
├── Box3DVisualization.tsx     # 3D rendering
├── SubwooferDesigner.tsx      # Integrated interface
├── index.ts                   # Exports
└── README.md                  # Documentation
```