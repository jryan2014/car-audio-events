// Subwoofer Designer Types

export interface SubwooferSpecs {
  fs: number;  // Resonant frequency (Hz)
  qts: number; // Total Q factor
  vas: number; // Equivalent air compliance (L)
  sd: number;  // Effective piston area (cm²)
  xmax: number; // Maximum linear excursion (mm)
  displacement: number; // Driver displacement (L)
  re?: number; // DC resistance (ohms)
  le?: number; // Voice coil inductance (mH)
  bl?: number; // BL product (Tm)
  mms?: number; // Moving mass (g)
  cms?: number; // Mechanical compliance (mm/N)
  rms?: number; // Mechanical resistance (kg/s)
  qes?: number; // Electrical Q
  qms?: number; // Mechanical Q
}

export interface BoxDimensions {
  width: number; // inches
  height: number; // inches
  depth: number; // inches
  material_thickness: number; // inches
  net_volume: number; // cubic feet
  gross_volume?: number; // cubic feet
}

export interface PortDimensions {
  type: 'round' | 'slot' | 'aeroport' | 'none';
  quantity: number;
  diameter?: number; // inches (for round ports)
  width?: number; // inches (for slot ports)
  height?: number; // inches (for slot ports)
  length: number; // inches
  area: number; // square inches
  tuning_frequency: number; // Hz
  velocity?: number; // m/s
  flared?: boolean;
}

export interface CalculationResults {
  box_type: 'sealed' | 'ported' | 'bandpass_4th' | 'bandpass_6th';
  net_volume: number; // cubic feet
  gross_volume: number; // cubic feet
  external_dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  // Sealed box results
  qtc?: number;
  f3?: number; // Hz
  // Ported box results
  fb?: number; // Hz (tuning frequency)
  port_velocity?: number; // m/s
  port_length?: number; // inches
  // Performance predictions
  efficiency?: number; // dB
  peak_spl?: number; // dB
  // Validation warnings
  warnings?: string[];
}

export interface SubwooferDesign {
  id?: string;
  user_id?: string;
  name: string;
  description?: string;
  is_public?: boolean;
  box_type: 'sealed' | 'ported' | 'bandpass_4th' | 'bandpass_6th' | 'quarter_wave';
  box_dimensions: BoxDimensions;
  subwoofer_specs: SubwooferSpecs;
  subwoofer_quantity: number;
  subwoofer_count?: number; // alias for quantity
  port_dimensions?: PortDimensions;
  calculation_results?: CalculationResults;
  calculations?: CalculationResults; // alias for calculation_results
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SubwooferDatabase {
  id?: string;
  brand: string;
  model: string;
  size: number; // inches
  power_rating_rms: number; // watts
  power_rating_peak: number; // watts
  impedance: number; // ohms (shown impedance, actual may vary for DVC/QVC)
  voice_coil_type?: 'SVC' | 'DVC' | 'QVC';
  coil_impedance?: number; // Individual coil impedance for DVC/QVC
  sensitivity?: number; // dB SPL @ 1W/1m
  frequency_response?: string; // Hz range
  mounting_depth?: number; // inches
  mounting_diameter?: number; // inches
  specs: SubwooferSpecs;
  sealed_volume_min_cubic_ft?: number;
  sealed_volume_max_cubic_ft?: number;
  ported_volume_min_cubic_ft?: number;
  ported_volume_max_cubic_ft?: number;
  recommended_tuning_hz?: number;
}

export interface DesignShare {
  id: string;
  design_id: string;
  shared_with_user_id?: string;
  share_token?: string;
  can_edit: boolean;
  shared_at: string;
  expires_at?: string;
}

export interface CutSheet {
  design_id?: string; // optional design reference
  pieces?: {
    name: string;
    quantity: number;
    width: number;
    height: number;
    thickness?: number;
    material?: string;
    notes?: string;
  }[];
  hardware?: {
    name: string;
    quantity: number;
    size?: string;
    notes?: string;
  }[];
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface OptimizationOptions {
  target_qtc?: number;
  target_fb?: number;
  max_dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  prefer_golden_ratio?: boolean;
}