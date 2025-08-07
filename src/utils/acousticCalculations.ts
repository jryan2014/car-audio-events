// Acoustic Physics Calculations for Subwoofer Box Designer

export class AcousticCalculator {
  // Physical constants
  private static readonly SPEED_OF_SOUND = 343; // m/s at 20°C
  private static readonly AIR_DENSITY = 1.2; // kg/m³
  
  /**
   * Calculate Qtc for sealed box
   * @param qts - Total Q of the driver
   * @param vas - Equivalent volume in liters
   * @param vb - Box volume in liters
   */
  static calculateQtc(qts: number, vas: number, vb: number): number {
    const alpha = vas / vb;
    return qts * Math.sqrt(1 + alpha);
  }
  
  /**
   * Calculate F3 (3dB down point) for sealed box
   * @param fs - Resonant frequency in Hz
   * @param qtc - Total Q of the system
   */
  static calculateF3(fs: number, qtc: number): number {
    const fc = fs * qtc; // System resonant frequency
    return fc * Math.sqrt(Math.pow(1 / Math.pow(qtc, 2) - 2 + Math.sqrt(Math.pow(1 / Math.pow(qtc, 2) - 2, 2) + 4), 0.5));
  }
  
  /**
   * Calculate optimal sealed box volume
   * @param vas - Equivalent volume in liters
   * @param qts - Total Q of the driver
   * @param targetQtc - Target Qtc (typically 0.707 for flattest response)
   */
  static calculateOptimalSealedVolume(vas: number, qts: number, targetQtc: number = 0.707): number {
    const alpha = Math.pow(targetQtc / qts, 2) - 1;
    return vas / alpha;
  }
  
  /**
   * Calculate port length for ported box (Helmholtz resonator)
   * @param fb - Target tuning frequency in Hz
   * @param vb - Box volume in liters
   * @param portArea - Port area in cm²
   * @param portQuantity - Number of ports
   */
  static calculatePortLength(fb: number, vb: number, portArea: number, portQuantity: number = 1): number {
    const vbCubicM = vb / 1000; // Convert to cubic meters
    const totalPortArea = (portArea * portQuantity) / 10000; // Convert to m²
    
    // Port length formula with end correction
    const k = 0.732; // End correction factor for flanged port
    const portRadius = Math.sqrt(totalPortArea / Math.PI);
    
    const lengthM = (Math.pow(this.SPEED_OF_SOUND, 2) * totalPortArea) / 
                    (4 * Math.pow(Math.PI, 2) * Math.pow(fb, 2) * vbCubicM) - 
                    (k * portRadius);
    
    return lengthM * 39.37; // Convert to inches
  }
  
  /**
   * Calculate port velocity
   * @param fb - Tuning frequency in Hz
   * @param vd - Volume displacement (Sd * Xmax) in liters
   * @param portArea - Total port area in cm²
   */
  static calculatePortVelocity(fb: number, vd: number, portArea: number): number {
    // Port velocity in m/s
    const velocity = (fb * vd * 0.001) / (portArea * 0.0001);
    return velocity;
  }
  
  /**
   * Calculate recommended port area based on driver displacement
   * @param sd - Cone area in cm²
   * @param xmax - Maximum excursion in mm
   * @param portVelocityLimit - Maximum acceptable port velocity in m/s (typically 10-30)
   */
  static calculateRecommendedPortArea(sd: number, xmax: number, portVelocityLimit: number = 20): number {
    const vd = (sd * xmax) / 1000; // Volume displacement in liters
    // Assuming typical tuning frequency of 30-35 Hz
    const typicalFb = 32.5;
    const recommendedArea = (typicalFb * vd * 0.001) / (portVelocityLimit * 0.0001);
    return recommendedArea; // in cm²
  }
  
  /**
   * Calculate box dimensions for optimal proportions (golden ratio)
   * @param targetVolume - Target volume in liters
   * @param materialThickness - Material thickness in inches
   */
  static calculateOptimalDimensions(targetVolume: number, materialThickness: number = 0.75): {
    width: number;
    height: number;
    depth: number;
  } {
    // Convert volume to cubic inches
    const volumeCubicInches = targetVolume * 61.024;
    
    // Golden ratio proportions
    const phi = 1.618;
    const ratio1 = 1;
    const ratio2 = phi;
    const ratio3 = phi * phi;
    
    // Calculate base dimension
    const baseDimension = Math.cbrt(volumeCubicInches / (ratio1 * ratio2 * ratio3));
    
    // Add material thickness compensation
    const compensation = materialThickness * 2;
    
    return {
      width: (baseDimension * ratio3) + compensation,
      height: (baseDimension * ratio2) + compensation,
      depth: (baseDimension * ratio1) + compensation
    };
  }
  
  /**
   * Calculate efficiency (SPL) of the system
   * @param sensitivity - Driver sensitivity in dB (1W/1m)
   * @param power - Input power in watts
   * @param impedance - System impedance in ohms
   */
  static calculateSPL(sensitivity: number, power: number, impedance: number = 4): number {
    // SPL = Sensitivity + 10 * log10(Power)
    return sensitivity + 10 * Math.log10(power);
  }
  
  /**
   * Calculate impedance for multiple drivers
   * @param driverImpedance - Single driver impedance in ohms
   * @param quantity - Number of drivers
   * @param wiring - Wiring configuration
   */
  static calculateSystemImpedance(
    driverImpedance: number, 
    quantity: number, 
    wiring: 'series' | 'parallel' | 'series-parallel'
  ): number {
    switch (wiring) {
      case 'series':
        return driverImpedance * quantity;
      case 'parallel':
        return driverImpedance / quantity;
      case 'series-parallel':
        // Assumes even number of drivers in series-parallel
        if (quantity % 2 !== 0) {
          throw new Error('Series-parallel requires even number of drivers');
        }
        return driverImpedance; // Two series pairs in parallel maintains impedance
      default:
        return driverImpedance;
    }
  }
}

export class UnitConverter {
  // Volume conversions
  static litersToLitres = (liters: number) => liters;
  static litersToCubicFeet = (liters: number) => liters * 0.0353147;
  static cubicFeetToLiters = (cubicFeet: number) => cubicFeet * 28.3168;
  static cubicInchesToLiters = (cubicInches: number) => cubicInches * 0.0163871;
  static litersToCubicInches = (liters: number) => liters * 61.0237;
  
  // Length conversions
  static inchesToCm = (inches: number) => inches * 2.54;
  static cmToInches = (cm: number) => cm / 2.54;
  static inchesToMm = (inches: number) => inches * 25.4;
  static mmToInches = (mm: number) => mm / 25.4;
  
  // Area conversions
  static squareInchesToSquareCm = (sqInches: number) => sqInches * 6.4516;
  static squareCmToSquareInches = (sqCm: number) => sqCm / 6.4516;
  
  // Frequency conversions
  static hzToKhz = (hz: number) => hz / 1000;
  static khzToHz = (khz: number) => khz * 1000;
}