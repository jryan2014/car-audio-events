// Voice Coil Configuration Database
// Mapping of subwoofer models to their voice coil types

export type VoiceCoilType = 'SVC' | 'DVC' | 'QVC';

export interface VoiceCoilConfig {
  type: VoiceCoilType;
  coilImpedance?: number; // Individual coil impedance for DVC/QVC
  description: string;
}

// Comprehensive voice coil configuration mapping
export const VOICE_COIL_CONFIGURATIONS: Record<string, VoiceCoilConfig> = {
  // JL AUDIO - All W7AE and W6v3 are SVC, TW3 is DVC
  'W7AE-13.5': { type: 'SVC', description: 'Single 3Ω voice coil' },
  'W7AE-12': { type: 'SVC', description: 'Single 3Ω voice coil' },
  'W7AE-10': { type: 'SVC', description: 'Single 3Ω voice coil' },
  'W7AE-8': { type: 'SVC', description: 'Single 3Ω voice coil' },
  'W6v3-12': { type: 'SVC', description: 'Single 4Ω voice coil' },
  'W6v3-10': { type: 'SVC', description: 'Single 4Ω voice coil' },
  'TW3-12': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω total)' },
  
  // ROCKFORD FOSGATE
  'T3S1-19': { type: 'SVC', description: 'Single 1Ω voice coil' },
  'T2S2-16': { type: 'SVC', description: 'Single 2Ω voice coil' },
  'T2S2-13': { type: 'SVC', description: 'Single 2Ω voice coil' },
  'T2S1-12': { type: 'SVC', description: 'Single 1Ω voice coil' },
  'T2S1-10': { type: 'SVC', description: 'Single 1Ω voice coil' },
  'P3D4-15': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'P3D4-12': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'P3D2-10': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils' },
  'P3D2-8': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils' },
  
  // KICKER
  'Solo X-18': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'Solo-Baric L7X-15': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'Solo-Baric L7S-12': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω shown)' },
  'Solo-Baric L7S-10': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'Solo-Baric L7S-8': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω shown)' },
  'CompRT-12': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'CompRT-10': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω shown)' },
  'CompRT-8': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω shown)' },
  
  // ALPINE
  'Type-X SWX-1543D': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω shown)' },
  'Type-R SWR-12D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'Type-R SWR-10D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'Type-R SWR-8D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'Type-S SWS-12D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'Type-S SWS-10D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  
  // PIONEER
  'TS-W5102SPL': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'TS-W3003D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'TS-W311D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  'TS-W261D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  
  // SUNDOWN AUDIO
  'ZV6-18': { type: 'DVC', coilImpedance: 0.5, description: 'Dual 0.5Ω voice coils (1Ω shown)' },
  'ZV6-15': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'X-12 V3': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'SA-12 Classic': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω shown)' },
  
  // SKAR AUDIO
  'ZVX-18v2': { type: 'DVC', coilImpedance: 0.5, description: 'Dual 0.5Ω voice coils (1Ω shown)' },
  'ZVX-15v2': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'EVL-12': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'SDR-12': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils (4Ω shown)' },
  
  // AUDIOFROG
  'GB12D2': { type: 'DVC', coilImpedance: 2, description: 'Dual 2Ω voice coils' },
  'GB10D4': { type: 'DVC', coilImpedance: 4, description: 'Dual 4Ω voice coils' },
  
  // FOCAL
  'Utopia M 13WX': { type: 'SVC', description: 'Single 4Ω voice coil' },
  'Polyglass 33V2': { type: 'SVC', description: 'Single 4Ω voice coil' },
  'Access 30A4': { type: 'SVC', description: 'Single 4Ω voice coil' },
  
  // MOREL
  'ULTIMO Titanium 12': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  'PRIMO 124': { type: 'SVC', description: 'Single 4Ω voice coil' },
  
  // DIGITAL DESIGNS
  'Z18': { type: 'DVC', coilImpedance: 0.5, description: 'Dual 0.5Ω voice coils (1Ω shown)' },
  '9915': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  '3512': { type: 'DVC', coilImpedance: 1, description: 'Dual 1Ω voice coils (2Ω shown)' },
  
  // INFINITY
  'Kappa 120.9W': { type: 'SVC', description: 'Single 4Ω voice coil' },
  'Reference 1260W': { type: 'SVC', description: 'Single 4Ω voice coil' }
};

// Helper function to get voice coil configuration
export function getVoiceCoilConfig(model: string): VoiceCoilConfig {
  return VOICE_COIL_CONFIGURATIONS[model] || { 
    type: 'SVC', 
    description: 'Single voice coil (default)' 
  };
}

// Calculate possible impedance configurations for wiring
export function calculateWiringOptions(
  voiceCoilType: VoiceCoilType,
  coilImpedance: number,
  quantity: number
): { configuration: string; finalImpedance: number }[] {
  const options: { configuration: string; finalImpedance: number }[] = [];
  
  if (voiceCoilType === 'SVC') {
    // Single voice coil wiring options
    if (quantity === 1) {
      options.push({ configuration: 'Single', finalImpedance: coilImpedance });
    } else if (quantity === 2) {
      options.push({ configuration: 'Series', finalImpedance: coilImpedance * 2 });
      options.push({ configuration: 'Parallel', finalImpedance: coilImpedance / 2 });
    } else if (quantity === 4) {
      options.push({ configuration: 'All Series', finalImpedance: coilImpedance * 4 });
      options.push({ configuration: 'All Parallel', finalImpedance: coilImpedance / 4 });
      options.push({ configuration: 'Series-Parallel', finalImpedance: coilImpedance });
    }
  } else if (voiceCoilType === 'DVC') {
    // Dual voice coil wiring options
    if (quantity === 1) {
      options.push({ configuration: 'Coils in Series', finalImpedance: coilImpedance * 2 });
      options.push({ configuration: 'Coils in Parallel', finalImpedance: coilImpedance / 2 });
    } else if (quantity === 2) {
      // Each sub's coils in series, then subs in parallel
      options.push({ 
        configuration: 'Coils Series / Subs Parallel', 
        finalImpedance: coilImpedance 
      });
      // Each sub's coils in parallel, then subs in series
      options.push({ 
        configuration: 'Coils Parallel / Subs Series', 
        finalImpedance: coilImpedance 
      });
      // All coils in series
      options.push({ 
        configuration: 'All Coils Series', 
        finalImpedance: coilImpedance * 4 
      });
      // All coils in parallel
      options.push({ 
        configuration: 'All Coils Parallel', 
        finalImpedance: coilImpedance / 4 
      });
    }
  } else if (voiceCoilType === 'QVC') {
    // Quad voice coil wiring options (rare, but included for completeness)
    if (quantity === 1) {
      options.push({ configuration: 'All Coils Series', finalImpedance: coilImpedance * 4 });
      options.push({ configuration: 'All Coils Parallel', finalImpedance: coilImpedance / 4 });
      options.push({ configuration: 'Series-Parallel', finalImpedance: coilImpedance });
    }
  }
  
  return options;
}