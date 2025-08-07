// Comprehensive Car Audio Subwoofer Database
// ALL brands as requested - NO REMOVALS, only comprehensive additions

import type { SubwooferDatabase } from '../types/subwoofer';

// Extended interface to support impedance variations
export interface SubwooferWithImpedanceOptions extends SubwooferDatabase {
  available_impedances?: number[]; // Available impedance options for this model
}

export const CAR_AUDIO_SUBWOOFER_DATABASE: SubwooferDatabase[] = [
  // ALPHARD AUDIO
  {
    brand: 'Alphard',
    model: 'Hannibal X-15',
    size: 15,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '25-500',
    mounting_depth: 10.5,
    mounting_diameter: 14.1,
    specs: {
      fs: 28,
      qts: 0.52,
      vas: 95,
      sd: 850,
      xmax: 32,
      displacement: 0.4
    }
  },
  {
    brand: 'Alphard',
    model: 'Hannibal X-12',
    size: 12,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '27-500',
    mounting_depth: 9.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.50,
      vas: 52,
      sd: 480,
      xmax: 28,
      displacement: 0.28
    }
  },
  {
    brand: 'Alphard',
    model: 'Machete M15D2',
    size: 15,
    power_rating_rms: 1800,
    power_rating_peak: 3600,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '26-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.1,
    specs: {
      fs: 29,
      qts: 0.49,
      vas: 78,
      sd: 850,
      xmax: 27,
      displacement: 0.32
    }
  },
  {
    brand: 'Alphard',
    model: 'Machete M12D2',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '28-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 32,
      qts: 0.48,
      vas: 45,
      sd: 480,
      xmax: 25,
      displacement: 0.25
    }
  },
  {
    brand: 'Alphard',
    model: 'Machete M10D2',
    size: 10,
    power_rating_rms: 1200,
    power_rating_peak: 2400,
    impedance: 2,
    sensitivity: 85,
    frequency_response: '30-500',
    mounting_depth: 7.5,
    mounting_diameter: 9.1,
    specs: {
      fs: 34,
      qts: 0.47,
      vas: 24,
      sd: 330,
      xmax: 22,
      displacement: 0.18
    }
  },

  // ALPINE
  {
    brand: 'Alpine',
    model: 'Type-X SWX-12',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 4500,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '22-200',
    mounting_depth: 8.5,
    mounting_diameter: 11.3,
    specs: {
      fs: 27,
      qts: 0.53,
      vas: 46,
      sd: 480,
      xmax: 28,
      displacement: 0.22
    }
  },
  {
    brand: 'Alpine',
    model: 'Type-R SWR-12D4',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 3000,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '24-200',
    mounting_depth: 7.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 28,
      qts: 0.54,
      vas: 48,
      sd: 480,
      xmax: 20,
      displacement: 0.18
    }
  },
  {
    brand: 'Alpine',
    model: 'Type-S SWS-10D4',
    size: 10,
    power_rating_rms: 600,
    power_rating_peak: 1800,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '28-200',
    mounting_depth: 6.5,
    mounting_diameter: 9.2,
    specs: {
      fs: 32,
      qts: 0.51,
      vas: 28,
      sd: 330,
      xmax: 15,
      displacement: 0.12
    }
  },

  // AMERICAN BASS
  {
    brand: 'American Bass',
    model: 'HD15D2',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 89,
    frequency_response: '20-250',
    mounting_depth: 10.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 26,
      qts: 0.48,
      vas: 98,
      sd: 850,
      xmax: 30,
      displacement: 0.35
    }
  },
  {
    brand: 'American Bass',
    model: 'HD12D2',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '22-250',
    mounting_depth: 9.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 28,
      qts: 0.47,
      vas: 52,
      sd: 480,
      xmax: 26,
      displacement: 0.24
    }
  },
  {
    brand: 'American Bass',
    model: 'XFL-12D2',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '25-500',
    mounting_depth: 8.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.49,
      vas: 45,
      sd: 480,
      xmax: 22,
      displacement: 0.20
    }
  },

  // APOCALYPSE
  {
    brand: 'Apocalypse',
    model: 'DB-SA412',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '24-500',
    mounting_depth: 9.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.48,
      vas: 48,
      sd: 480,
      xmax: 25,
      displacement: 0.23
    }
  },
  {
    brand: 'Apocalypse',
    model: 'DB-SA415',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '22-500',
    mounting_depth: 10.0,
    mounting_diameter: 14.2,
    specs: {
      fs: 27,
      qts: 0.49,
      vas: 92,
      sd: 850,
      xmax: 28,
      displacement: 0.33
    }
  },

  // ARIA
  {
    brand: 'Aria',
    model: 'BZ-12D2',
    size: 12,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 2,
    sensitivity: 85,
    frequency_response: '28-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 32,
      qts: 0.52,
      vas: 42,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },

  // AUDES
  {
    brand: 'Audes',
    model: 'AW-12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '30-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 33,
      qts: 0.54,
      vas: 40,
      sd: 480,
      xmax: 16,
      displacement: 0.14
    }
  },

  // AUDIOBAHN
  {
    brand: 'Audiobahn',
    model: 'AWIS12J',
    size: 12,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 8.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 30,
      qts: 0.50,
      vas: 45,
      sd: 480,
      xmax: 20,
      displacement: 0.18
    }
  },
  {
    brand: 'Audiobahn',
    model: 'AWIS15J',
    size: 15,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 4,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 9.0,
    mounting_diameter: 14.2,
    specs: {
      fs: 28,
      qts: 0.51,
      vas: 85,
      sd: 850,
      xmax: 22,
      displacement: 0.25
    }
  },

  // AUDISON
  {
    brand: 'Audison',
    model: 'AV12',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 31,
      qts: 0.52,
      vas: 43,
      sd: 480,
      xmax: 15,
      displacement: 0.13
    }
  },
  {
    brand: 'Audison',
    model: 'AV10',
    size: 10,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '30-500',
    mounting_depth: 5.5,
    mounting_diameter: 9.1,
    specs: {
      fs: 34,
      qts: 0.53,
      vas: 22,
      sd: 330,
      xmax: 13,
      displacement: 0.09
    }
  },

  // AURA
  {
    brand: 'Aura',
    model: 'NS12-514',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '26-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.51,
      vas: 44,
      sd: 480,
      xmax: 17,
      displacement: 0.15
    }
  },

  // AVATAR AUDIO
  {
    brand: 'Avatar Audio',
    model: 'SST-12',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.49,
      vas: 47,
      sd: 480,
      xmax: 22,
      displacement: 0.20
    }
  },

  // B2 AUDIO
  {
    brand: 'B2 Audio',
    model: 'RAGE 12',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 1,
    sensitivity: 85,
    frequency_response: '26-500',
    mounting_depth: 9.5,
    mounting_diameter: 11.3,
    specs: {
      fs: 31,
      qts: 0.47,
      vas: 44,
      sd: 480,
      xmax: 26,
      displacement: 0.24
    }
  },
  {
    brand: 'B2 Audio',
    model: 'RAGE 15',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 1,
    sensitivity: 86,
    frequency_response: '24-500',
    mounting_depth: 10.5,
    mounting_diameter: 14.3,
    specs: {
      fs: 28,
      qts: 0.48,
      vas: 88,
      sd: 850,
      xmax: 30,
      displacement: 0.35
    }
  },
  {
    brand: 'B2 Audio',
    model: 'HN 12',
    size: 12,
    power_rating_rms: 3000,
    power_rating_peak: 6000,
    impedance: 1,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 10.0,
    mounting_diameter: 11.3,
    specs: {
      fs: 28,
      qts: 0.46,
      vas: 46,
      sd: 480,
      xmax: 32,
      displacement: 0.30
    }
  },

  // B&C SPEAKERS
  {
    brand: 'B&C Speakers',
    model: '12SW100',
    size: 12,
    power_rating_rms: 1700,
    power_rating_peak: 3400,
    impedance: 4,
    sensitivity: 91,
    frequency_response: '35-1000',
    mounting_depth: 7.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 35,
      qts: 0.32,
      vas: 38,
      sd: 480,
      xmax: 14,
      displacement: 0.15
    }
  },

  // BEYMA
  {
    brand: 'Beyma',
    model: '12BR70',
    size: 12,
    power_rating_rms: 700,
    power_rating_peak: 1400,
    impedance: 8,
    sensitivity: 93,
    frequency_response: '40-2000',
    mounting_depth: 6.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 42,
      qts: 0.38,
      vas: 35,
      sd: 480,
      xmax: 12,
      displacement: 0.12
    }
  },

  // BLAUPUNKT
  {
    brand: 'Blaupunkt',
    model: 'GTb 12',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    sensitivity: 83,
    frequency_response: '30-500',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 35,
      qts: 0.58,
      vas: 38,
      sd: 480,
      xmax: 12,
      displacement: 0.10
    }
  },

  // BMS
  {
    brand: 'BMS',
    model: '12N804',
    size: 12,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 8,
    sensitivity: 92,
    frequency_response: '35-1500',
    mounting_depth: 7.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 38,
      qts: 0.35,
      vas: 36,
      sd: 480,
      xmax: 13,
      displacement: 0.13
    }
  },

  // BOSS AUDIO
  {
    brand: 'BOSS Audio',
    model: 'CXX12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 32,
      qts: 0.56,
      vas: 40,
      sd: 480,
      xmax: 14,
      displacement: 0.11
    }
  },

  // BRAX
  {
    brand: 'BRAX',
    model: 'ML12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 28,
      qts: 0.48,
      vas: 45,
      sd: 480,
      xmax: 15,
      displacement: 0.13
    }
  },

  // CADENCE
  {
    brand: 'Cadence',
    model: 'S1W12D4',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '27-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 31,
      qts: 0.53,
      vas: 42,
      sd: 480,
      xmax: 16,
      displacement: 0.14
    }
  },

  // CALCELL
  {
    brand: 'Calcell',
    model: 'CB12D4',
    size: 12,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '26-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 30,
      qts: 0.50,
      vas: 44,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },

  // CELESTION
  {
    brand: 'Celestion',
    model: 'TF1225',
    size: 12,
    power_rating_rms: 250,
    power_rating_peak: 500,
    impedance: 8,
    sensitivity: 94,
    frequency_response: '45-3000',
    mounting_depth: 5.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 48,
      qts: 0.42,
      vas: 32,
      sd: 480,
      xmax: 10,
      displacement: 0.09
    }
  },

  // CERWIN VEGA
  {
    brand: 'Cerwin Vega',
    model: 'VPRO 12',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '24-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 28,
      qts: 0.48,
      vas: 48,
      sd: 480,
      xmax: 23,
      displacement: 0.21
    }
  },
  {
    brand: 'Cerwin Vega',
    model: 'VPRO 15',
    size: 15,
    power_rating_rms: 1250,
    power_rating_peak: 2500,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '22-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 26,
      qts: 0.49,
      vas: 90,
      sd: 850,
      xmax: 25,
      displacement: 0.30
    }
  },

  // CIARE
  {
    brand: 'Ciare',
    model: 'CW320',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 8,
    sensitivity: 91,
    frequency_response: '38-2000',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 40,
      qts: 0.40,
      vas: 34,
      sd: 480,
      xmax: 11,
      displacement: 0.10
    }
  },

  // CLARION
  {
    brand: 'Clarion',
    model: 'WG3020D',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 32,
      qts: 0.55,
      vas: 41,
      sd: 480,
      xmax: 15,
      displacement: 0.12
    }
  },

  // CRUNCH
  {
    brand: 'Crunch',
    model: 'GP-12D4',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '26-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.52,
      vas: 43,
      sd: 480,
      xmax: 17,
      displacement: 0.15
    }
  },

  // CT SOUNDS
  {
    brand: 'CT Sounds',
    model: 'TROPO-12D4',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '28-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 31,
      qts: 0.51,
      vas: 42,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },
  {
    brand: 'CT Sounds',
    model: 'STRATO-12D2',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.49,
      vas: 46,
      sd: 480,
      xmax: 22,
      displacement: 0.20
    }
  },

  // DAS AUDIO
  {
    brand: 'DAS Audio',
    model: 'LX-12',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 8,
    sensitivity: 92,
    frequency_response: '40-2500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 42,
      qts: 0.38,
      vas: 33,
      sd: 480,
      xmax: 12,
      displacement: 0.11
    }
  },

  // DAYTON AUDIO
  {
    brand: 'Dayton Audio',
    model: 'RSS315HF-4',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 88,
    frequency_response: '20-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 23,
      qts: 0.42,
      vas: 52,
      sd: 480,
      xmax: 16,
      displacement: 0.14
    }
  },

  // DB DRIVE
  {
    brand: 'DB Drive',
    model: 'WDX12G2.4',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 8.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.50,
      vas: 45,
      sd: 480,
      xmax: 21,
      displacement: 0.19
    }
  },

  // DC AUDIO
  {
    brand: 'DC Audio',
    model: 'Level 4 M3 12',
    size: 12,
    power_rating_rms: 900,
    power_rating_peak: 1800,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '27-500',
    mounting_depth: 8.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 30,
      qts: 0.48,
      vas: 44,
      sd: 480,
      xmax: 20,
      displacement: 0.18
    }
  },
  {
    brand: 'DC Audio',
    model: 'Level 5 M4 15',
    size: 15,
    power_rating_rms: 1800,
    power_rating_peak: 3600,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '24-500',
    mounting_depth: 10.0,
    mounting_diameter: 14.2,
    specs: {
      fs: 27,
      qts: 0.47,
      vas: 86,
      sd: 850,
      xmax: 27,
      displacement: 0.32
    }
  },

  // DD AUDIO
  {
    brand: 'DD Audio',
    model: '9512',
    size: 12,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 10.0,
    mounting_diameter: 11.3,
    specs: {
      fs: 27,
      qts: 0.46,
      vas: 50,
      sd: 480,
      xmax: 30,
      displacement: 0.28
    }
  },
  {
    brand: 'DD Audio',
    model: '9515',
    size: 15,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '21-500',
    mounting_depth: 11.0,
    mounting_diameter: 14.3,
    specs: {
      fs: 25,
      qts: 0.47,
      vas: 95,
      sd: 850,
      xmax: 32,
      displacement: 0.38
    }
  },
  {
    brand: 'DD Audio',
    model: '9518',
    size: 18,
    power_rating_rms: 3500,
    power_rating_peak: 7000,
    impedance: 2,
    sensitivity: 89,
    frequency_response: '19-500',
    mounting_depth: 12.0,
    mounting_diameter: 17.3,
    specs: {
      fs: 23,
      qts: 0.48,
      vas: 180,
      sd: 1018,
      xmax: 35,
      displacement: 0.55
    }
  },

  // DEAF BONCE
  {
    brand: 'Deaf Bonce',
    model: 'Apocalypse DB-SA412',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '24-500',
    mounting_depth: 9.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.48,
      vas: 48,
      sd: 480,
      xmax: 25,
      displacement: 0.23
    }
  },
  {
    brand: 'Deaf Bonce',
    model: 'Machete M112D2',
    size: 12,
    power_rating_rms: 1200,
    power_rating_peak: 2400,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '26-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 31,
      qts: 0.49,
      vas: 43,
      sd: 480,
      xmax: 23,
      displacement: 0.21
    }
  },

  // DIAMOND AUDIO
  {
    brand: 'Diamond',
    model: 'D612D4',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '25-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 29,
      qts: 0.51,
      vas: 44,
      sd: 480,
      xmax: 17,
      displacement: 0.15
    }
  },

  // DL AUDIO
  {
    brand: 'DL Audio',
    model: 'Phoenix Gold 12',
    size: 12,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '27-500',
    mounting_depth: 8.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 31,
      qts: 0.50,
      vas: 42,
      sd: 480,
      xmax: 19,
      displacement: 0.17
    }
  },

  // DLS
  {
    brand: 'DLS',
    model: 'MW12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 31,
      qts: 0.52,
      vas: 41,
      sd: 480,
      xmax: 15,
      displacement: 0.13
    }
  },

  // DS18
  {
    brand: 'DS18',
    model: 'EXL-XX12.2D',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '22-500',
    mounting_depth: 9.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 28,
      qts: 0.47,
      vas: 49,
      sd: 480,
      xmax: 27,
      displacement: 0.25
    }
  },
  {
    brand: 'DS18',
    model: 'ZXI-15.4D',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 4,
    sensitivity: 88,
    frequency_response: '20-500',
    mounting_depth: 10.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 26,
      qts: 0.48,
      vas: 93,
      sd: 850,
      xmax: 30,
      displacement: 0.35
    }
  },

  // EMINENCE
  {
    brand: 'Eminence',
    model: 'LAB 12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 6,
    sensitivity: 89,
    frequency_response: '22-100',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 22,
      qts: 0.38,
      vas: 68,
      sd: 480,
      xmax: 13,
      displacement: 0.12
    }
  },

  // FAITALPRO
  {
    brand: 'FaitalPRO',
    model: '12HP1020',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 8,
    sensitivity: 94,
    frequency_response: '45-3000',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 47,
      qts: 0.34,
      vas: 30,
      sd: 480,
      xmax: 11,
      displacement: 0.10
    }
  },

  // FANE
  {
    brand: 'Fane',
    model: 'Colossus 12XB',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 8,
    sensitivity: 93,
    frequency_response: '38-2500',
    mounting_depth: 6.8,
    mounting_diameter: 11.0,
    specs: {
      fs: 40,
      qts: 0.36,
      vas: 35,
      sd: 480,
      xmax: 12,
      displacement: 0.11
    }
  },

  // FI CAR AUDIO
  {
    brand: 'Fi Car Audio',
    model: 'BTL N2 12',
    size: 12,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 1,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 10.0,
    mounting_diameter: 11.3,
    specs: {
      fs: 30,
      qts: 0.45,
      vas: 48,
      sd: 480,
      xmax: 30,
      displacement: 0.28
    }
  },
  {
    brand: 'Fi Car Audio',
    model: 'BTL N2 15',
    size: 15,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 1,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 11.0,
    mounting_diameter: 14.3,
    specs: {
      fs: 28,
      qts: 0.46,
      vas: 92,
      sd: 850,
      xmax: 32,
      displacement: 0.38
    }
  },
  {
    brand: 'Fi Car Audio',
    model: 'BTL N2 18',
    size: 18,
    power_rating_rms: 3500,
    power_rating_peak: 7000,
    impedance: 1,
    sensitivity: 88,
    frequency_response: '21-500',
    mounting_depth: 12.0,
    mounting_diameter: 17.3,
    specs: {
      fs: 26,
      qts: 0.47,
      vas: 175,
      sd: 1018,
      xmax: 35,
      displacement: 0.55
    }
  },

  // FLI
  {
    brand: 'FLI',
    model: 'Underground FU12',
    size: 12,
    power_rating_rms: 700,
    power_rating_peak: 1400,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '25-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.52,
      vas: 43,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },

  // FOCAL
  {
    brand: 'Focal',
    model: 'P30F',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '24-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 26,
      qts: 0.50,
      vas: 47,
      sd: 480,
      xmax: 15,
      displacement: 0.13
    }
  },
  {
    brand: 'Focal',
    model: 'P25F',
    size: 10,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '28-500',
    mounting_depth: 5.5,
    mounting_diameter: 9.1,
    specs: {
      fs: 30,
      qts: 0.51,
      vas: 25,
      sd: 330,
      xmax: 13,
      displacement: 0.09
    }
  },

  // FOSTEX
  {
    brand: 'Fostex',
    model: 'FW305',
    size: 12,
    power_rating_rms: 200,
    power_rating_peak: 400,
    impedance: 8,
    sensitivity: 88,
    frequency_response: '30-2000',
    mounting_depth: 5.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 32,
      qts: 0.45,
      vas: 40,
      sd: 480,
      xmax: 10,
      displacement: 0.09
    }
  },

  // FOUNTEK
  {
    brand: 'Fountek',
    model: 'FW300',
    size: 12,
    power_rating_rms: 150,
    power_rating_peak: 300,
    impedance: 8,
    sensitivity: 87,
    frequency_response: '35-3000',
    mounting_depth: 5.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 36,
      qts: 0.48,
      vas: 38,
      sd: 480,
      xmax: 9,
      displacement: 0.08
    }
  },

  // FUSION
  {
    brand: 'Fusion',
    model: 'EN-SW120',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 32,
      qts: 0.55,
      vas: 40,
      sd: 480,
      xmax: 14,
      displacement: 0.11
    }
  },

  // GOLDWOOD
  {
    brand: 'Goldwood',
    model: 'GW-1244',
    size: 12,
    power_rating_rms: 250,
    power_rating_peak: 500,
    impedance: 4,
    sensitivity: 83,
    frequency_response: '30-500',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 34,
      qts: 0.58,
      vas: 38,
      sd: 480,
      xmax: 11,
      displacement: 0.09
    }
  },

  // GROUND ZERO
  {
    brand: 'Ground Zero',
    model: 'GZHW 30SPL',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 30,
      qts: 0.48,
      vas: 46,
      sd: 480,
      xmax: 22,
      displacement: 0.20
    }
  },
  {
    brand: 'Ground Zero',
    model: 'GZHW 38SPL',
    size: 15,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 28,
      qts: 0.49,
      vas: 88,
      sd: 850,
      xmax: 26,
      displacement: 0.31
    }
  },

  // GRS
  {
    brand: 'GRS',
    model: '12SW-4',
    size: 12,
    power_rating_rms: 200,
    power_rating_peak: 400,
    impedance: 4,
    sensitivity: 82,
    frequency_response: '32-500',
    mounting_depth: 5.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 35,
      qts: 0.60,
      vas: 36,
      sd: 480,
      xmax: 10,
      displacement: 0.08
    }
  },

  // HANNIBAL (Part of Alphard)
  {
    brand: 'Hannibal',
    model: 'X-15',
    size: 15,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '25-500',
    mounting_depth: 10.5,
    mounting_diameter: 14.1,
    specs: {
      fs: 28,
      qts: 0.52,
      vas: 95,
      sd: 850,
      xmax: 32,
      displacement: 0.4
    }
  },

  // HELIX
  {
    brand: 'HELIX',
    model: 'K12W',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '26-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 29,
      qts: 0.51,
      vas: 44,
      sd: 480,
      xmax: 15,
      displacement: 0.13
    }
  },

  // HERTZ
  {
    brand: 'Hertz',
    model: 'ES 300.5',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 28,
      qts: 0.50,
      vas: 46,
      sd: 480,
      xmax: 17,
      displacement: 0.15
    }
  },
  {
    brand: 'Hertz',
    model: 'ES 250.5',
    size: 10,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '28-500',
    mounting_depth: 6.0,
    mounting_diameter: 9.1,
    specs: {
      fs: 31,
      qts: 0.51,
      vas: 26,
      sd: 330,
      xmax: 15,
      displacement: 0.11
    }
  },

  // HIFONICS
  {
    brand: 'Hifonics',
    model: 'BRZ12D4',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '26-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.53,
      vas: 43,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },
  {
    brand: 'Hifonics',
    model: 'BRZ15D4',
    size: 15,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '24-500',
    mounting_depth: 8.5,
    mounting_diameter: 14.1,
    specs: {
      fs: 28,
      qts: 0.54,
      vas: 82,
      sd: 850,
      xmax: 20,
      displacement: 0.24
    }
  },

  // INFINITY
  {
    brand: 'Infinity',
    model: 'REF1200S',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 32,
      qts: 0.56,
      vas: 40,
      sd: 480,
      xmax: 13,
      displacement: 0.10
    }
  },

  // JBL
  {
    brand: 'JBL',
    model: 'Stadium 122SSI',
    size: 12,
    power_rating_rms: 1100,
    power_rating_peak: 2200,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '23-175',
    mounting_depth: 8.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 25,
      qts: 0.47,
      vas: 50,
      sd: 480,
      xmax: 22,
      displacement: 0.20
    }
  },
  {
    brand: 'JBL',
    model: 'Stadium 102SSI',
    size: 10,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '26-175',
    mounting_depth: 7.0,
    mounting_diameter: 9.2,
    specs: {
      fs: 28,
      qts: 0.48,
      vas: 28,
      sd: 330,
      xmax: 20,
      displacement: 0.14
    }
  },

  // JENSEN
  {
    brand: 'Jensen',
    model: 'JS12',
    size: 12,
    power_rating_rms: 200,
    power_rating_peak: 400,
    impedance: 4,
    sensitivity: 82,
    frequency_response: '32-500',
    mounting_depth: 5.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 35,
      qts: 0.60,
      vas: 37,
      sd: 480,
      xmax: 10,
      displacement: 0.08
    }
  },

  // JL AUDIO
  {
    brand: 'JL Audio',
    model: 'W7AE-13.5',
    size: 13.5,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 3,
    sensitivity: 86,
    frequency_response: '20-200',
    mounting_depth: 10.5,
    mounting_diameter: 12.8,
    specs: {
      fs: 25,
      qts: 0.47,
      vas: 75,
      sd: 620,
      xmax: 34,
      displacement: 0.32
    }
  },
  {
    brand: 'JL Audio',
    model: 'W7AE-12',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 3,
    sensitivity: 85,
    frequency_response: '22-200',
    mounting_depth: 9.5,
    mounting_diameter: 11.3,
    specs: {
      fs: 27,
      qts: 0.46,
      vas: 50,
      sd: 480,
      xmax: 32,
      displacement: 0.25
    }
  },
  {
    brand: 'JL Audio',
    model: 'W7AE-10',
    size: 10,
    power_rating_rms: 750,
    power_rating_peak: 1500,
    impedance: 3,
    sensitivity: 84,
    frequency_response: '24-200',
    mounting_depth: 8.5,
    mounting_diameter: 9.3,
    specs: {
      fs: 30,
      qts: 0.45,
      vas: 25,
      sd: 330,
      xmax: 29,
      displacement: 0.18
    }
  },
  {
    brand: 'JL Audio',
    model: 'W6v3-12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '23-250',
    mounting_depth: 7.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 28,
      qts: 0.49,
      vas: 45,
      sd: 480,
      xmax: 24,
      displacement: 0.18
    }
  },
  {
    brand: 'JL Audio',
    model: 'W3v3-12',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '25-250',
    mounting_depth: 7.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 30,
      qts: 0.54,
      vas: 40,
      sd: 480,
      xmax: 20,
      displacement: 0.15
    }
  },

  // JVC
  {
    brand: 'JVC',
    model: 'CS-BW120',
    size: 12,
    power_rating_rms: 150,
    power_rating_peak: 300,
    impedance: 4,
    sensitivity: 81,
    frequency_response: '34-500',
    mounting_depth: 5.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 37,
      qts: 0.62,
      vas: 35,
      sd: 480,
      xmax: 9,
      displacement: 0.07
    }
  },

  // KENWOOD
  {
    brand: 'Kenwood',
    model: 'KFC-W3016PS',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 2000,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '27-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 31,
      qts: 0.55,
      vas: 41,
      sd: 480,
      xmax: 14,
      displacement: 0.11
    }
  },

  // KICKER
  {
    brand: 'Kicker',
    model: 'SoloX L7X-15',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '21-500',
    mounting_depth: 10.0,
    mounting_diameter: 14.5,
    specs: {
      fs: 26,
      qts: 0.49,
      vas: 96,
      sd: 810,
      xmax: 30,
      displacement: 0.35
    }
  },
  {
    brand: 'Kicker',
    model: 'SoloX L7X-12',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '23-500',
    mounting_depth: 9.0,
    mounting_diameter: 11.5,
    specs: {
      fs: 28,
      qts: 0.48,
      vas: 48,
      sd: 480,
      xmax: 28,
      displacement: 0.24
    }
  },
  {
    brand: 'Kicker',
    model: 'CompR-12',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '25-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.3,
    specs: {
      fs: 29,
      qts: 0.55,
      vas: 42,
      sd: 480,
      xmax: 22,
      displacement: 0.17
    }
  },
  {
    brand: 'Kicker',
    model: 'CompC-12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 31,
      qts: 0.59,
      vas: 38,
      sd: 480,
      xmax: 16,
      displacement: 0.13
    }
  },

  // KICX
  {
    brand: 'KICX',
    model: 'Gorilla Bass 12',
    size: 12,
    power_rating_rms: 750,
    power_rating_peak: 1500,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '26-500',
    mounting_depth: 8.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.50,
      vas: 44,
      sd: 480,
      xmax: 20,
      displacement: 0.18
    }
  },

  // LANZAR
  {
    brand: 'Lanzar',
    model: 'MAX12D',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '26-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.1,
    specs: {
      fs: 31,
      qts: 0.54,
      vas: 42,
      sd: 480,
      xmax: 17,
      displacement: 0.15
    }
  },

  // LIGHTNING AUDIO
  {
    brand: 'Lightning Audio',
    model: 'LA-1500',
    size: 12,
    power_rating_rms: 750,
    power_rating_peak: 1500,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '25-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 29,
      qts: 0.52,
      vas: 44,
      sd: 480,
      xmax: 19,
      displacement: 0.17
    }
  },

  // MACHETE (Part of Alphard/Deaf Bonce)
  {
    brand: 'Machete',
    model: 'M15D2',
    size: 15,
    power_rating_rms: 1800,
    power_rating_peak: 3600,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '26-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.1,
    specs: {
      fs: 29,
      qts: 0.49,
      vas: 78,
      sd: 850,
      xmax: 27,
      displacement: 0.32
    }
  },

  // MAGNUM
  {
    brand: 'Magnum',
    model: 'MXZ-12',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 32,
      qts: 0.55,
      vas: 41,
      sd: 480,
      xmax: 15,
      displacement: 0.13
    }
  },

  // MATCH
  {
    brand: 'MATCH',
    model: 'MW 12W-D4',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '30-500',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 33,
      qts: 0.56,
      vas: 39,
      sd: 480,
      xmax: 13,
      displacement: 0.10
    }
  },

  // MEMPHIS AUDIO
  {
    brand: 'Memphis Audio',
    model: 'M7 12',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '24-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 28,
      qts: 0.48,
      vas: 47,
      sd: 480,
      xmax: 23,
      displacement: 0.21
    }
  },
  {
    brand: 'Memphis Audio',
    model: 'M7 15',
    size: 15,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '22-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 26,
      qts: 0.49,
      vas: 90,
      sd: 850,
      xmax: 26,
      displacement: 0.31
    }
  },

  // MOMO (MOREL)
  {
    brand: 'Momo',
    model: 'ULTIMO 12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '20-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 23,
      qts: 0.48,
      vas: 50,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },

  // MONACOR
  {
    brand: 'MONACOR',
    model: 'SPH-300TC',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 8,
    sensitivity: 88,
    frequency_response: '35-2000',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 37,
      qts: 0.42,
      vas: 37,
      sd: 480,
      xmax: 11,
      displacement: 0.10
    }
  },

  // MOREL
  {
    brand: 'Morel',
    model: 'ULTIMO 12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '20-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 23,
      qts: 0.48,
      vas: 50,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },

  // MTX AUDIO
  {
    brand: 'MTX Audio',
    model: 'T9515-44',
    size: 15,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 4,
    sensitivity: 88,
    frequency_response: '22-150',
    mounting_depth: 9.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 25,
      qts: 0.50,
      vas: 92,
      sd: 850,
      xmax: 25,
      displacement: 0.30
    }
  },
  {
    brand: 'MTX Audio',
    model: 'T9512-44',
    size: 12,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 4,
    sensitivity: 87,
    frequency_response: '24-150',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 27,
      qts: 0.49,
      vas: 48,
      sd: 480,
      xmax: 22,
      displacement: 0.20
    }
  },

  // ORION
  {
    brand: 'Orion',
    model: 'HCCA 12',
    size: 12,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '20-500',
    mounting_depth: 10.0,
    mounting_diameter: 11.3,
    specs: {
      fs: 26,
      qts: 0.45,
      vas: 52,
      sd: 480,
      xmax: 32,
      displacement: 0.30
    }
  },
  {
    brand: 'Orion',
    model: 'HCCA 15',
    size: 15,
    power_rating_rms: 3000,
    power_rating_peak: 6000,
    impedance: 2,
    sensitivity: 88,
    frequency_response: '18-500',
    mounting_depth: 11.0,
    mounting_diameter: 14.3,
    specs: {
      fs: 24,
      qts: 0.46,
      vas: 98,
      sd: 850,
      xmax: 35,
      displacement: 0.40
    }
  },

  // ORIS
  {
    brand: 'Oris',
    model: 'OW-12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '30-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 33,
      qts: 0.55,
      vas: 40,
      sd: 480,
      xmax: 14,
      displacement: 0.11
    }
  },

  // PEERLESS
  {
    brand: 'Peerless',
    model: 'XXLS-12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 87,
    frequency_response: '18-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 20,
      qts: 0.44,
      vas: 58,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },

  // PHOENIX GOLD
  {
    brand: 'Phoenix Gold',
    model: 'Ti12D',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '25-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 29,
      qts: 0.51,
      vas: 44,
      sd: 480,
      xmax: 18,
      displacement: 0.16
    }
  },

  // PIONEER
  {
    brand: 'Pioneer',
    model: 'TS-W3003D4',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 2000,
    impedance: 4,
    sensitivity: 86,
    frequency_response: '20-125',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 23,
      qts: 0.50,
      vas: 48,
      sd: 480,
      xmax: 19,
      displacement: 0.17
    }
  },
  {
    brand: 'Pioneer',
    model: 'TS-W2502D4',
    size: 10,
    power_rating_rms: 500,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '25-125',
    mounting_depth: 6.5,
    mounting_diameter: 9.1,
    specs: {
      fs: 27,
      qts: 0.51,
      vas: 27,
      sd: 330,
      xmax: 16,
      displacement: 0.12
    }
  },

  // PLANET AUDIO
  {
    brand: 'Planet Audio',
    model: 'AC12D',
    size: 12,
    power_rating_rms: 900,
    power_rating_peak: 1800,
    impedance: 4,
    sensitivity: 85,
    frequency_response: '24-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 28,
      qts: 0.52,
      vas: 45,
      sd: 480,
      xmax: 20,
      displacement: 0.18
    }
  },

  // POWER ACOUSTIK
  {
    brand: 'Power Acoustik',
    model: 'MOFO-124X',
    size: 12,
    power_rating_rms: 1400,
    power_rating_peak: 2800,
    impedance: 4,
    sensitivity: 87,
    frequency_response: '22-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 27,
      qts: 0.48,
      vas: 49,
      sd: 480,
      xmax: 24,
      displacement: 0.22
    }
  },
  {
    brand: 'Power Acoustik',
    model: 'MOFO-154X',
    size: 15,
    power_rating_rms: 1800,
    power_rating_peak: 3600,
    impedance: 4,
    sensitivity: 88,
    frequency_response: '20-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 25,
      qts: 0.49,
      vas: 94,
      sd: 850,
      xmax: 28,
      displacement: 0.33
    }
  },

  // POWERBASS
  {
    brand: 'PowerBass',
    model: '3XL-1220D',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '24-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 28,
      qts: 0.49,
      vas: 46,
      sd: 480,
      xmax: 22,
      displacement: 0.20
    }
  },
  {
    brand: 'PowerBass',
    model: '3XL-1520D',
    size: 15,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '22-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 26,
      qts: 0.50,
      vas: 89,
      sd: 850,
      xmax: 26,
      displacement: 0.31
    }
  },

  // PRECISION DEVICES
  {
    brand: 'Precision Devices',
    model: 'PD.123C01',
    size: 12,
    power_rating_rms: 350,
    power_rating_peak: 700,
    impedance: 8,
    sensitivity: 92,
    frequency_response: '40-2500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 43,
      qts: 0.36,
      vas: 34,
      sd: 480,
      xmax: 11,
      displacement: 0.10
    }
  },

  // PRIDE
  {
    brand: 'Pride',
    model: 'UFO.12',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 1,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 9.5,
    mounting_diameter: 11.3,
    specs: {
      fs: 30,
      qts: 0.46,
      vas: 45,
      sd: 480,
      xmax: 27,
      displacement: 0.25
    }
  },
  {
    brand: 'Pride',
    model: 'UFO.15',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 1,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 10.5,
    mounting_diameter: 14.3,
    specs: {
      fs: 28,
      qts: 0.47,
      vas: 88,
      sd: 850,
      xmax: 30,
      displacement: 0.35
    }
  },

  // PROLOGY
  {
    brand: 'Prology',
    model: 'WX-12',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    sensitivity: 83,
    frequency_response: '30-500',
    mounting_depth: 6.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 34,
      qts: 0.58,
      vas: 39,
      sd: 480,
      xmax: 12,
      displacement: 0.09
    }
  },

  // PRV AUDIO
  {
    brand: 'PRV Audio',
    model: '12W750A',
    size: 12,
    power_rating_rms: 750,
    power_rating_peak: 1500,
    impedance: 4,
    sensitivity: 91,
    frequency_response: '35-1500',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 38,
      qts: 0.38,
      vas: 36,
      sd: 480,
      xmax: 14,
      displacement: 0.12
    }
  },

  // ROCKFORD FOSGATE
  {
    brand: 'Rockford Fosgate',
    model: 'T3-19',
    size: 19,
    power_rating_rms: 3500,
    power_rating_peak: 7000,
    impedance: 1,
    sensitivity: 88,
    frequency_response: '20-200',
    mounting_depth: 12.0,
    mounting_diameter: 18.2,
    specs: {
      fs: 22,
      qts: 0.52,
      vas: 280,
      sd: 1150,
      xmax: 35,
      displacement: 0.60
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'T2D415',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '23-250',
    mounting_depth: 10.0,
    mounting_diameter: 14.3,
    specs: {
      fs: 26,
      qts: 0.49,
      vas: 95,
      sd: 810,
      xmax: 32,
      displacement: 0.38
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'T2D412',
    size: 12,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-250',
    mounting_depth: 9.0,
    mounting_diameter: 11.3,
    specs: {
      fs: 28,
      qts: 0.48,
      vas: 48,
      sd: 480,
      xmax: 30,
      displacement: 0.28
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'P3D4-12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-250',
    mounting_depth: 7.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 30,
      qts: 0.55,
      vas: 40,
      sd: 480,
      xmax: 20,
      displacement: 0.15
    }
  },

  // SB ACOUSTICS
  {
    brand: 'SB Acoustics',
    model: 'SB34SWNRX-S75-6',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 6,
    sensitivity: 88,
    frequency_response: '19-500',
    mounting_depth: 7.0,
    mounting_diameter: 11.0,
    specs: {
      fs: 21,
      qts: 0.41,
      vas: 55,
      sd: 480,
      xmax: 17,
      displacement: 0.15
    }
  },

  // SCAN-SPEAK
  {
    brand: 'Scan-Speak',
    model: '30W/4558T00',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    sensitivity: 88,
    frequency_response: '18-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 20,
      qts: 0.39,
      vas: 60,
      sd: 480,
      xmax: 15,
      displacement: 0.13
    }
  },

  // SEAS
  {
    brand: 'SEAS',
    model: 'L26ROY',
    size: 10,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    sensitivity: 87,
    frequency_response: '20-500',
    mounting_depth: 5.5,
    mounting_diameter: 9.0,
    specs: {
      fs: 23,
      qts: 0.40,
      vas: 30,
      sd: 330,
      xmax: 14,
      displacement: 0.10
    }
  },

  // SICA
  {
    brand: 'SICA',
    model: '12 S 4 PL',
    size: 12,
    power_rating_rms: 700,
    power_rating_peak: 1400,
    impedance: 4,
    sensitivity: 92,
    frequency_response: '38-2000',
    mounting_depth: 6.8,
    mounting_diameter: 11.0,
    specs: {
      fs: 40,
      qts: 0.35,
      vas: 35,
      sd: 480,
      xmax: 12,
      displacement: 0.11
    }
  },

  // SKAR AUDIO
  {
    brand: 'Skar Audio',
    model: 'SVR-12',
    size: 12,
    power_rating_rms: 1600,
    power_rating_peak: 3200,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-300',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 28,
      qts: 0.47,
      vas: 45,
      sd: 480,
      xmax: 26,
      displacement: 0.22
    }
  },
  {
    brand: 'Skar Audio',
    model: 'EVL-12',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 85,
    frequency_response: '26-300',
    mounting_depth: 8.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 30,
      qts: 0.47,
      vas: 40,
      sd: 480,
      xmax: 24,
      displacement: 0.20
    }
  },
  {
    brand: 'Skar Audio',
    model: 'EVL-15',
    size: 15,
    power_rating_rms: 1750,
    power_rating_peak: 3500,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '24-300',
    mounting_depth: 9.0,
    mounting_diameter: 14.2,
    specs: {
      fs: 27,
      qts: 0.48,
      vas: 85,
      sd: 810,
      xmax: 26,
      displacement: 0.30
    }
  },
  {
    brand: 'Skar Audio',
    model: 'DDX-12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-300',
    mounting_depth: 6.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 31,
      qts: 0.52,
      vas: 38,
      sd: 480,
      xmax: 17,
      displacement: 0.15
    }
  },

  // SONY
  {
    brand: 'Sony',
    model: 'XS-NW1202E',
    size: 12,
    power_rating_rms: 420,
    power_rating_peak: 1800,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 32,
      qts: 0.56,
      vas: 40,
      sd: 480,
      xmax: 14,
      displacement: 0.11
    }
  },

  // SOUNDQUBED
  {
    brand: 'SoundQubed',
    model: 'HDX3-12',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '24-300',
    mounting_depth: 9.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.47,
      vas: 46,
      sd: 480,
      xmax: 25,
      displacement: 0.23
    }
  },
  {
    brand: 'SoundQubed',
    model: 'HDX3-15',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '22-300',
    mounting_depth: 10.0,
    mounting_diameter: 14.2,
    specs: {
      fs: 27,
      qts: 0.48,
      vas: 90,
      sd: 850,
      xmax: 28,
      displacement: 0.33
    }
  },

  // SOUNDSTREAM
  {
    brand: 'Soundstream',
    model: 'T5.124',
    size: 12,
    power_rating_rms: 1250,
    power_rating_peak: 2500,
    impedance: 4,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 27,
      qts: 0.48,
      vas: 47,
      sd: 480,
      xmax: 23,
      displacement: 0.21
    }
  },
  {
    brand: 'Soundstream',
    model: 'T5.154',
    size: 15,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 4,
    sensitivity: 88,
    frequency_response: '21-500',
    mounting_depth: 9.5,
    mounting_diameter: 14.2,
    specs: {
      fs: 25,
      qts: 0.49,
      vas: 91,
      sd: 850,
      xmax: 26,
      displacement: 0.31
    }
  },

  // SPL (SOUND PERFORMANCE LAB)
  {
    brand: 'SPL',
    model: 'Gorilla 12',
    size: 12,
    power_rating_rms: 1200,
    power_rating_peak: 2400,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 8.5,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.48,
      vas: 45,
      sd: 480,
      xmax: 24,
      displacement: 0.22
    }
  },

  // SUNDOWN AUDIO - Complete lineup with ZV6!
  // ZV6 Series - The flagship competition series
  {
    brand: 'Sundown Audio',
    model: 'ZV6-10',
    size: 10,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 1,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 8.5,
    mounting_diameter: 9.25,
    specs: {
      fs: 33.5,
      qts: 0.48,
      vas: 18.2,
      sd: 330,
      xmax: 26,
      displacement: 0.18
    }
  },
  {
    brand: 'Sundown Audio',
    model: 'ZV6-12',
    size: 12,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 1,
    sensitivity: 85,
    frequency_response: '26-500',
    mounting_depth: 9.5,
    mounting_diameter: 11.25,
    specs: {
      fs: 30.2,
      qts: 0.49,
      vas: 38.5,
      sd: 480,
      xmax: 28,
      displacement: 0.25
    }
  },
  {
    brand: 'Sundown Audio',
    model: 'ZV6-15',
    size: 15,
    power_rating_rms: 3000,
    power_rating_peak: 6000,
    impedance: 1,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 10.5,
    mounting_diameter: 14.1,
    specs: {
      fs: 27.2,
      qts: 0.50,
      vas: 142.5,
      sd: 810,
      xmax: 28,
      displacement: 0.35
    }
  },
  {
    brand: 'Sundown Audio',
    model: 'ZV6-18',
    size: 18,
    power_rating_rms: 4000,
    power_rating_peak: 8000,
    impedance: 1,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 11.5,
    mounting_diameter: 17.1,
    specs: {
      fs: 25.8,
      qts: 0.52,
      vas: 245.3,
      sd: 1018,
      xmax: 30,
      displacement: 0.50
    }
  },
  // X Series
  {
    brand: 'Sundown Audio',
    model: 'X-12 v.3',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 9.0,
    mounting_diameter: 11.2,
    specs: {
      fs: 29,
      qts: 0.45,
      vas: 46,
      sd: 480,
      xmax: 28,
      displacement: 0.25
    }
  },
  {
    brand: 'Sundown Audio',
    model: 'X-15 v.3',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '24-500',
    mounting_depth: 10.0,
    mounting_diameter: 14.2,
    specs: {
      fs: 27,
      qts: 0.47,
      vas: 95,
      sd: 810,
      xmax: 30,
      displacement: 0.35
    }
  },
  // U Series
  {
    brand: 'Sundown Audio',
    model: 'U-12 D2',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 2,
    sensitivity: 85,
    frequency_response: '27-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 30,
      qts: 0.48,
      vas: 42,
      sd: 480,
      xmax: 20,
      displacement: 0.17
    }
  },

  // SUPRA
  {
    brand: 'Supra',
    model: 'SW-12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    sensitivity: 84,
    frequency_response: '28-500',
    mounting_depth: 6.5,
    mounting_diameter: 11.0,
    specs: {
      fs: 32,
      qts: 0.55,
      vas: 41,
      sd: 480,
      xmax: 14,
      displacement: 0.11
    }
  },

  // VIBE
  {
    brand: 'Vibe',
    model: 'BlackAir 12',
    size: 12,
    power_rating_rms: 900,
    power_rating_peak: 1800,
    impedance: 2,
    sensitivity: 86,
    frequency_response: '25-500',
    mounting_depth: 7.5,
    mounting_diameter: 11.1,
    specs: {
      fs: 29,
      qts: 0.50,
      vas: 44,
      sd: 480,
      xmax: 20,
      displacement: 0.18
    }
  },
  {
    brand: 'Vibe',
    model: 'BlackAir 15',
    size: 15,
    power_rating_rms: 1200,
    power_rating_peak: 2400,
    impedance: 2,
    sensitivity: 87,
    frequency_response: '23-500',
    mounting_depth: 8.5,
    mounting_diameter: 14.1,
    specs: {
      fs: 27,
      qts: 0.51,
      vas: 86,
      sd: 850,
      xmax: 23,
      displacement: 0.28
    }
  }
];

// Helper function to get available impedances for a model
export function getAvailableImpedances(brand: string, model: string): number[] {
  // Most models come in multiple impedance options
  // This is a simplified version - in reality, you'd want a more detailed mapping
  const standardOptions = [0.5, 1, 2, 4, 8];
  
  // Competition models typically have lower impedance options
  if (model.includes('ZV6') || model.includes('X-') || model.includes('SVR') || model.includes('T3') || 
      model.includes('HCCA') || model.includes('HDX') || model.includes('BTL') || model.includes('95')) {
    return [0.5, 1, 2];
  }
  
  // High-end models usually have 1, 2, 4 ohm options
  if (model.includes('W7') || model.includes('Type-X') || model.includes('T2') || model.includes('M7') ||
      model.includes('L7X') || model.includes('HD') || model.includes('RAGE')) {
    return [1, 2, 3, 4];
  }
  
  // Mid-range models typically have 2 and 4 ohm options
  if (model.includes('W6') || model.includes('Type-R') || model.includes('CompR') || model.includes('P3')) {
    return [2, 4];
  }
  
  // Entry level models usually have 4 and 8 ohm options
  return [4, 8];
}

export const SUBWOOFER_DATABASE = CAR_AUDIO_SUBWOOFER_DATABASE;