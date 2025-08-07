// Comprehensive Subwoofer Database with Thiele-Small Parameters
// Data sourced from manufacturer specifications

import type { SubwooferDatabase } from '../types/subwoofer';

export const SUBWOOFER_DATABASE: Partial<SubwooferDatabase>[] = [
  // ========== JL AUDIO ==========
  {
    brand: 'JL Audio',
    model: 'W7AE-13.5',
    size: 13.5,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 3,
    specs: {
      fs: 24.1,
      qts: 0.468,
      vas: 119.8,
      sd: 650,
      xmax: 32.0,
      displacement: 0.22,
      re: 2.3,
      le: 0.95,
      bl: 14.1,
      mms: 310,
      cms: 0.141,
      rms: 4.1,
      qes: 0.516,
      qms: 5.24
    }
  },
  {
    brand: 'JL Audio',
    model: 'W7AE-12',
    size: 12,
    power_rating_rms: 750,
    power_rating_peak: 1500,
    impedance: 3,
    specs: {
      fs: 25.8,
      qts: 0.46,
      vas: 85.6,
      sd: 506,
      xmax: 32.0,
      displacement: 0.18,
      re: 2.3,
      le: 0.9,
      bl: 13.2,
      mms: 250,
      cms: 0.154,
      rms: 3.8,
      qes: 0.51,
      qms: 4.8
    }
  },
  {
    brand: 'JL Audio',
    model: 'W7AE-10',
    size: 10,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 3,
    specs: {
      fs: 29.2,
      qts: 0.462,
      vas: 45.3,
      sd: 330,
      xmax: 29.0,
      displacement: 0.12,
      re: 2.35,
      le: 0.85,
      bl: 11.9,
      mms: 175,
      cms: 0.168,
      rms: 3.2,
      qes: 0.508,
      qms: 5.15
    }
  },
  {
    brand: 'JL Audio',
    model: 'W7AE-8',
    size: 8,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 3,
    specs: {
      fs: 33.5,
      qts: 0.478,
      vas: 17.8,
      sd: 213,
      xmax: 25.0,
      displacement: 0.065,
      re: 2.4,
      le: 0.75,
      bl: 10.2,
      mms: 115,
      cms: 0.197,
      rms: 2.8,
      qes: 0.528,
      qms: 5.35
    }
  },
  {
    brand: 'JL Audio',
    model: 'W6v3-12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    specs: {
      fs: 27.3,
      qts: 0.46,
      vas: 71.2,
      sd: 506,
      xmax: 24.5,
      displacement: 0.13,
      re: 3.2,
      le: 1.2,
      bl: 12.4,
      mms: 195,
      cms: 0.165,
      rms: 3.4
    }
  },
  {
    brand: 'JL Audio',
    model: 'W6v3-10',
    size: 10,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    specs: {
      fs: 28.7,
      qts: 0.46,
      vas: 44.1,
      sd: 324,
      xmax: 24.5,
      displacement: 0.095,
      re: 3.2,
      le: 1.1,
      bl: 11.8,
      mms: 165,
      cms: 0.175,
      rms: 3.2
    }
  },
  {
    brand: 'JL Audio',
    model: 'TW3-12',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    specs: {
      fs: 31.5,
      qts: 0.52,
      vas: 52.3,
      sd: 506,
      xmax: 15.0,
      displacement: 0.09,
      re: 3.3,
      le: 1.0,
      bl: 11.2,
      mms: 145,
      cms: 0.175,
      rms: 2.9
    }
  },
  
  // ========== ROCKFORD FOSGATE ==========
  {
    brand: 'Rockford Fosgate',
    model: 'T3S1-19',
    size: 19,
    power_rating_rms: 3500,
    power_rating_peak: 7000,
    impedance: 1,
    specs: {
      fs: 22.8,
      qts: 0.48,
      vas: 325.2,
      sd: 1227,
      xmax: 28.0,
      displacement: 0.48,
      re: 0.9,
      le: 1.8,
      bl: 15.8,
      mms: 580,
      cms: 0.084,
      rms: 6.2
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'T2S2-16',
    size: 16,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 2,
    specs: {
      fs: 24.5,
      qts: 0.50,
      vas: 198.4,
      sd: 830,
      xmax: 25.0,
      displacement: 0.35,
      re: 1.8,
      le: 1.6,
      bl: 14.2,
      mms: 425,
      cms: 0.099,
      rms: 5.4
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'T2S2-13',
    size: 13,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    specs: {
      fs: 26.2,
      qts: 0.51,
      vas: 112.3,
      sd: 530,
      xmax: 22.5,
      displacement: 0.22,
      re: 1.9,
      le: 1.4,
      bl: 13.5,
      mms: 285,
      cms: 0.129,
      rms: 4.5
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'T2S1-12',
    size: 12,
    power_rating_rms: 1200,
    power_rating_peak: 2400,
    impedance: 1,
    specs: {
      fs: 28.3,
      qts: 0.52,
      vas: 78.5,
      sd: 506,
      xmax: 20.0,
      displacement: 0.18,
      re: 0.95,
      le: 1.3,
      bl: 12.8,
      mms: 235,
      cms: 0.135,
      rms: 4.1
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'T2S1-10',
    size: 10,
    power_rating_rms: 1000,
    power_rating_peak: 2000,
    impedance: 1,
    specs: {
      fs: 30.5,
      qts: 0.48,
      vas: 38.2,
      sd: 324,
      xmax: 18.5,
      displacement: 0.11,
      re: 0.95,
      le: 1.1,
      bl: 11.2,
      mms: 165,
      cms: 0.165,
      rms: 3.4
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'P3D4-15',
    size: 15,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    specs: {
      fs: 28.5,
      qts: 0.56,
      vas: 142.8,
      sd: 810,
      xmax: 17.5,
      displacement: 0.20,
      re: 1.9,
      le: 1.5,
      bl: 14.2,
      mms: 315,
      cms: 0.099,
      rms: 4.8
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'P3D4-12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    specs: {
      fs: 32.0,
      qts: 0.54,
      vas: 68.3,
      sd: 506,
      xmax: 17.5,
      displacement: 0.15,
      re: 1.8,
      le: 1.2,
      bl: 13.5,
      mms: 215,
      cms: 0.115,
      rms: 4.1
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'P3D2-10',
    size: 10,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 2,
    specs: {
      fs: 34.8,
      qts: 0.52,
      vas: 31.5,
      sd: 324,
      xmax: 16.5,
      displacement: 0.09,
      re: 0.9,
      le: 1.0,
      bl: 10.8,
      mms: 145,
      cms: 0.144,
      rms: 3.2
    }
  },
  {
    brand: 'Rockford Fosgate',
    model: 'P3D2-8',
    size: 8,
    power_rating_rms: 250,
    power_rating_peak: 500,
    impedance: 2,
    specs: {
      fs: 39.5,
      qts: 0.54,
      vas: 12.8,
      sd: 213,
      xmax: 14.0,
      displacement: 0.05,
      re: 0.95,
      le: 0.85,
      bl: 9.2,
      mms: 98,
      cms: 0.165,
      rms: 2.8
    }
  },
  
  // ========== KICKER ==========
  {
    brand: 'Kicker',
    model: 'Solo X-18',
    size: 18,
    power_rating_rms: 5000,
    power_rating_peak: 10000,
    impedance: 2,
    specs: {
      fs: 23.2,
      qts: 0.58,
      vas: 285.4,
      sd: 1018,
      xmax: 33.0,
      displacement: 0.52,
      re: 1.8,
      le: 2.2,
      bl: 16.8,
      mms: 685,
      cms: 0.069,
      rms: 7.2
    }
  },
  {
    brand: 'Kicker',
    model: 'Solo-Baric L7X-15',
    size: 15,
    power_rating_rms: 1200,
    power_rating_peak: 2400,
    impedance: 2,
    specs: {
      fs: 24.8,
      qts: 0.56,
      vas: 165.2,
      sd: 970, // Square cone
      xmax: 24.0,
      displacement: 0.28,
      re: 1.0,
      le: 1.6,
      bl: 14.5,
      mms: 385,
      cms: 0.107,
      rms: 5.2
    }
  },
  {
    brand: 'Kicker',
    model: 'Solo-Baric L7S-12',
    size: 12,
    power_rating_rms: 750,
    power_rating_peak: 1500,
    impedance: 4,
    specs: {
      fs: 25.3,
      qts: 0.55,
      vas: 87.4,
      sd: 645, // Square cone
      xmax: 22.0,
      displacement: 0.165,
      re: 1.95,
      le: 1.4,
      bl: 12.8,
      mms: 285,
      cms: 0.14,
      rms: 4.2
    }
  },
  {
    brand: 'Kicker',
    model: 'Solo-Baric L7S-10',
    size: 10,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 2,
    specs: {
      fs: 28.5,
      qts: 0.53,
      vas: 42.3,
      sd: 430, // Square cone
      xmax: 19.0,
      displacement: 0.11,
      re: 1.0,
      le: 1.2,
      bl: 11.2,
      mms: 195,
      cms: 0.159,
      rms: 3.5
    }
  },
  {
    brand: 'Kicker',
    model: 'Solo-Baric L7S-8',
    size: 8,
    power_rating_rms: 450,
    power_rating_peak: 900,
    impedance: 4,
    specs: {
      fs: 32.8,
      qts: 0.52,
      vas: 18.2,
      sd: 285, // Square cone
      xmax: 16.5,
      displacement: 0.07,
      re: 1.95,
      le: 1.0,
      bl: 10.2,
      mms: 125,
      cms: 0.188,
      rms: 2.9
    }
  },
  {
    brand: 'Kicker',
    model: 'CompRT-12',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 2,
    specs: {
      fs: 30.2,
      qts: 0.54,
      vas: 58.2,
      sd: 506,
      xmax: 15.0,
      displacement: 0.12,
      re: 0.95,
      le: 1.2,
      bl: 11.8,
      mms: 185,
      cms: 0.150,
      rms: 3.8
    }
  },
  {
    brand: 'Kicker',
    model: 'CompRT-10',
    size: 10,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    specs: {
      fs: 33.5,
      qts: 0.52,
      vas: 28.5,
      sd: 324,
      xmax: 13.5,
      displacement: 0.08,
      re: 1.9,
      le: 1.0,
      bl: 10.2,
      mms: 125,
      cms: 0.180,
      rms: 3.1
    }
  },
  {
    brand: 'Kicker',
    model: 'CompRT-8',
    size: 8,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    specs: {
      fs: 38.2,
      qts: 0.51,
      vas: 11.5,
      sd: 213,
      xmax: 11.5,
      displacement: 0.045,
      re: 1.95,
      le: 0.9,
      bl: 9.5,
      mms: 95,
      cms: 0.182,
      rms: 2.7
    }
  },
  
  // ========== ALPINE ==========
  {
    brand: 'Alpine',
    model: 'Type-X SWX-1543D',
    size: 15,
    power_rating_rms: 1000,
    power_rating_peak: 3000,
    impedance: 4,
    specs: {
      fs: 25.2,
      qts: 0.48,
      vas: 158.3,
      sd: 810,
      xmax: 22.5,
      displacement: 0.24,
      re: 1.9,
      le: 1.5,
      bl: 13.8,
      mms: 345,
      cms: 0.116,
      rms: 4.8
    }
  },
  {
    brand: 'Alpine',
    model: 'Type-R SWR-12D4',
    size: 12,
    power_rating_rms: 750,
    power_rating_peak: 2250,
    impedance: 4,
    specs: {
      fs: 26.4,
      qts: 0.49,
      vas: 78.2,
      sd: 506,
      xmax: 20.5,
      displacement: 0.14,
      re: 1.85,
      le: 1.1,
      bl: 12.1,
      mms: 195,
      cms: 0.145,
      rms: 3.5
    }
  },
  {
    brand: 'Alpine',
    model: 'Type-R SWR-10D4',
    size: 10,
    power_rating_rms: 600,
    power_rating_peak: 1800,
    impedance: 4,
    specs: {
      fs: 29.8,
      qts: 0.47,
      vas: 35.2,
      sd: 324,
      xmax: 18.5,
      displacement: 0.09,
      re: 1.85,
      le: 1.0,
      bl: 11.2,
      mms: 145,
      cms: 0.196,
      rms: 3.1
    }
  },
  {
    brand: 'Alpine',
    model: 'Type-R SWR-8D4',
    size: 8,
    power_rating_rms: 350,
    power_rating_peak: 1050,
    impedance: 4,
    specs: {
      fs: 35.2,
      qts: 0.46,
      vas: 14.8,
      sd: 213,
      xmax: 15.0,
      displacement: 0.055,
      re: 1.9,
      le: 0.9,
      bl: 9.8,
      mms: 105,
      cms: 0.194,
      rms: 2.8
    }
  },
  {
    brand: 'Alpine',
    model: 'Type-S SWS-12D4',
    size: 12,
    power_rating_rms: 500,
    power_rating_peak: 1500,
    impedance: 4,
    specs: {
      fs: 30.5,
      qts: 0.52,
      vas: 62.3,
      sd: 506,
      xmax: 16.5,
      displacement: 0.11,
      re: 1.95,
      le: 1.2,
      bl: 11.8,
      mms: 175,
      cms: 0.155,
      rms: 3.4
    }
  },
  {
    brand: 'Alpine',
    model: 'Type-S SWS-10D4',
    size: 10,
    power_rating_rms: 300,
    power_rating_peak: 900,
    impedance: 4,
    specs: {
      fs: 34.2,
      qts: 0.50,
      vas: 28.5,
      sd: 324,
      xmax: 14.5,
      displacement: 0.075,
      re: 1.95,
      le: 1.0,
      bl: 10.5,
      mms: 125,
      cms: 0.173,
      rms: 3.0
    }
  },
  
  // ========== PIONEER ==========
  {
    brand: 'Pioneer',
    model: 'TS-W5102SPL',
    size: 15,
    power_rating_rms: 4000,
    power_rating_peak: 8000,
    impedance: 2,
    specs: {
      fs: 24.5,
      qts: 0.58,
      vas: 185.2,
      sd: 810,
      xmax: 28.0,
      displacement: 0.32,
      re: 1.0,
      le: 1.8,
      bl: 15.2,
      mms: 485,
      cms: 0.087,
      rms: 6.2
    }
  },
  {
    brand: 'Pioneer',
    model: 'TS-W3003D4',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 2000,
    impedance: 4,
    specs: {
      fs: 28.5,
      qts: 0.54,
      vas: 72.3,
      sd: 506,
      xmax: 18.0,
      displacement: 0.13,
      re: 1.95,
      le: 1.3,
      bl: 12.5,
      mms: 195,
      cms: 0.160,
      rms: 3.8
    }
  },
  {
    brand: 'Pioneer',
    model: 'TS-W311D4',
    size: 12,
    power_rating_rms: 400,
    power_rating_peak: 1400,
    impedance: 4,
    specs: {
      fs: 35.0,
      qts: 0.58,
      vas: 45.8,
      sd: 506,
      xmax: 15.0,
      displacement: 0.12,
      re: 1.95,
      le: 1.3,
      bl: 11.5,
      mms: 180,
      cms: 0.115,
      rms: 3.8
    }
  },
  {
    brand: 'Pioneer',
    model: 'TS-W261D4',
    size: 10,
    power_rating_rms: 300,
    power_rating_peak: 1200,
    impedance: 4,
    specs: {
      fs: 37.2,
      qts: 0.56,
      vas: 24.5,
      sd: 324,
      xmax: 13.0,
      displacement: 0.07,
      re: 1.95,
      le: 1.1,
      bl: 10.2,
      mms: 115,
      cms: 0.159,
      rms: 3.1
    }
  },
  
  // ========== SUNDOWN AUDIO ==========
  {
    brand: 'Sundown Audio',
    model: 'ZV6-18',
    size: 18,
    power_rating_rms: 4000,
    power_rating_peak: 8000,
    impedance: 1,
    specs: {
      fs: 25.8,
      qts: 0.52,
      vas: 245.3,
      sd: 1018,
      xmax: 30.0,
      displacement: 0.45,
      re: 0.5,
      le: 2.0,
      bl: 16.2,
      mms: 585,
      cms: 0.065,
      rms: 6.8
    }
  },
  {
    brand: 'Sundown Audio',
    model: 'ZV6-15',
    size: 15,
    power_rating_rms: 3000,
    power_rating_peak: 6000,
    impedance: 2,
    specs: {
      fs: 27.2,
      qts: 0.50,
      vas: 142.5,
      sd: 810,
      xmax: 28.0,
      displacement: 0.28,
      re: 1.0,
      le: 1.7,
      bl: 14.8,
      mms: 425,
      cms: 0.080,
      rms: 5.5
    }
  },
  {
    brand: 'Sundown Audio',
    model: 'X-12 V3',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    specs: {
      fs: 29.5,
      qts: 0.48,
      vas: 68.2,
      sd: 506,
      xmax: 25.0,
      displacement: 0.18,
      re: 1.0,
      le: 1.4,
      bl: 13.2,
      mms: 245,
      cms: 0.119,
      rms: 4.2
    }
  },
  {
    brand: 'Sundown Audio',
    model: 'SA-12 Classic',
    size: 12,
    power_rating_rms: 750,
    power_rating_peak: 1500,
    impedance: 4,
    specs: {
      fs: 32.8,
      qts: 0.52,
      vas: 52.3,
      sd: 506,
      xmax: 18.0,
      displacement: 0.13,
      re: 1.9,
      le: 1.2,
      bl: 12.1,
      mms: 185,
      cms: 0.127,
      rms: 3.7
    }
  },
  
  // ========== SKAR AUDIO ==========
  {
    brand: 'Skar Audio',
    model: 'ZVX-18v2',
    size: 18,
    power_rating_rms: 2500,
    power_rating_peak: 5000,
    impedance: 1,
    specs: {
      fs: 26.5,
      qts: 0.54,
      vas: 225.3,
      sd: 1018,
      xmax: 26.0,
      displacement: 0.38,
      re: 0.5,
      le: 1.9,
      bl: 15.5,
      mms: 525,
      cms: 0.069,
      rms: 6.2
    }
  },
  {
    brand: 'Skar Audio',
    model: 'ZVX-15v2',
    size: 15,
    power_rating_rms: 2000,
    power_rating_peak: 4000,
    impedance: 2,
    specs: {
      fs: 28.8,
      qts: 0.52,
      vas: 128.5,
      sd: 810,
      xmax: 24.0,
      displacement: 0.25,
      re: 1.0,
      le: 1.6,
      bl: 14.2,
      mms: 385,
      cms: 0.079,
      rms: 5.1
    }
  },
  {
    brand: 'Skar Audio',
    model: 'EVL-12',
    size: 12,
    power_rating_rms: 1250,
    power_rating_peak: 2500,
    impedance: 2,
    specs: {
      fs: 31.2,
      qts: 0.50,
      vas: 58.2,
      sd: 506,
      xmax: 22.0,
      displacement: 0.15,
      re: 1.0,
      le: 1.3,
      bl: 12.8,
      mms: 215,
      cms: 0.121,
      rms: 3.9
    }
  },
  {
    brand: 'Skar Audio',
    model: 'SDR-12',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 4,
    specs: {
      fs: 34.5,
      qts: 0.54,
      vas: 48.2,
      sd: 506,
      xmax: 16.5,
      displacement: 0.11,
      re: 1.95,
      le: 1.2,
      bl: 11.5,
      mms: 175,
      cms: 0.122,
      rms: 3.5
    }
  },
  
  // ========== AUDIOFROG ==========
  {
    brand: 'Audiofrog',
    model: 'GB12D2',
    size: 12,
    power_rating_rms: 600,
    power_rating_peak: 1200,
    impedance: 2,
    specs: {
      fs: 27.5,
      qts: 0.45,
      vas: 74.2,
      sd: 506,
      xmax: 19.0,
      displacement: 0.13,
      re: 1.0,
      le: 1.1,
      bl: 11.8,
      mms: 185,
      cms: 0.181,
      rms: 3.2
    }
  },
  {
    brand: 'Audiofrog',
    model: 'GB10D4',
    size: 10,
    power_rating_rms: 400,
    power_rating_peak: 800,
    impedance: 4,
    specs: {
      fs: 31.2,
      qts: 0.44,
      vas: 32.5,
      sd: 324,
      xmax: 17.0,
      displacement: 0.08,
      re: 1.95,
      le: 1.0,
      bl: 10.8,
      mms: 135,
      cms: 0.193,
      rms: 2.9
    }
  },
  
  // ========== FOCAL ==========
  {
    brand: 'Focal',
    model: 'Utopia M 13WX',
    size: 13,
    power_rating_rms: 800,
    power_rating_peak: 1600,
    impedance: 4,
    specs: {
      fs: 26.8,
      qts: 0.44,
      vas: 98.5,
      sd: 530,
      xmax: 21.0,
      displacement: 0.18,
      re: 3.2,
      le: 1.3,
      bl: 12.5,
      mms: 225,
      cms: 0.157,
      rms: 3.8
    }
  },
  {
    brand: 'Focal',
    model: 'Polyglass 33V2',
    size: 13,
    power_rating_rms: 500,
    power_rating_peak: 1000,
    impedance: 4,
    specs: {
      fs: 29.5,
      qts: 0.48,
      vas: 82.3,
      sd: 530,
      xmax: 17.0,
      displacement: 0.14,
      re: 3.3,
      le: 1.2,
      bl: 11.8,
      mms: 195,
      cms: 0.149,
      rms: 3.5
    }
  },
  {
    brand: 'Focal',
    model: 'Access 30A4',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 600,
    impedance: 4,
    specs: {
      fs: 32.8,
      qts: 0.52,
      vas: 54.2,
      sd: 506,
      xmax: 14.5,
      displacement: 0.10,
      re: 3.4,
      le: 1.1,
      bl: 11.2,
      mms: 165,
      cms: 0.143,
      rms: 3.3
    }
  },
  
  // ========== MOREL ==========
  {
    brand: 'Morel',
    model: 'ULTIMO Titanium 12',
    size: 12,
    power_rating_rms: 1000,
    power_rating_peak: 3000,
    impedance: 2,
    specs: {
      fs: 25.2,
      qts: 0.42,
      vas: 85.3,
      sd: 506,
      xmax: 24.0,
      displacement: 0.16,
      re: 1.4,
      le: 1.2,
      bl: 12.8,
      mms: 210,
      cms: 0.190,
      rms: 3.4
    }
  },
  {
    brand: 'Morel',
    model: 'PRIMO 124',
    size: 12,
    power_rating_rms: 700,
    power_rating_peak: 1400,
    impedance: 4,
    specs: {
      fs: 27.8,
      qts: 0.45,
      vas: 68.2,
      sd: 506,
      xmax: 20.0,
      displacement: 0.13,
      re: 3.2,
      le: 1.1,
      bl: 12.2,
      mms: 185,
      cms: 0.177,
      rms: 3.3
    }
  },
  
  // ========== DIGITAL DESIGNS ==========
  {
    brand: 'Digital Designs',
    model: 'Z18',
    size: 18,
    power_rating_rms: 5000,
    power_rating_peak: 10000,
    impedance: 1,
    specs: {
      fs: 24.8,
      qts: 0.55,
      vas: 265.3,
      sd: 1018,
      xmax: 35.0,
      displacement: 0.55,
      re: 0.5,
      le: 2.1,
      bl: 17.2,
      mms: 625,
      cms: 0.066,
      rms: 7.1
    }
  },
  {
    brand: 'Digital Designs',
    model: '9915',
    size: 15,
    power_rating_rms: 3500,
    power_rating_peak: 7000,
    impedance: 2,
    specs: {
      fs: 26.5,
      qts: 0.53,
      vas: 152.3,
      sd: 810,
      xmax: 30.0,
      displacement: 0.32,
      re: 1.0,
      le: 1.8,
      bl: 15.2,
      mms: 455,
      cms: 0.079,
      rms: 5.8
    }
  },
  {
    brand: 'Digital Designs',
    model: '3512',
    size: 12,
    power_rating_rms: 1500,
    power_rating_peak: 3000,
    impedance: 2,
    specs: {
      fs: 30.2,
      qts: 0.49,
      vas: 62.5,
      sd: 506,
      xmax: 24.0,
      displacement: 0.16,
      re: 1.0,
      le: 1.3,
      bl: 13.1,
      mms: 225,
      cms: 0.124,
      rms: 4.1
    }
  },
  
  // ========== INFINITY ==========
  {
    brand: 'Infinity',
    model: 'Kappa 120.9W',
    size: 12,
    power_rating_rms: 350,
    power_rating_peak: 1400,
    impedance: 4,
    specs: {
      fs: 28.5,
      qts: 0.48,
      vas: 71.2,
      sd: 506,
      xmax: 16.5,
      displacement: 0.12,
      re: 3.4,
      le: 1.2,
      bl: 11.9,
      mms: 175,
      cms: 0.178,
      rms: 3.3
    }
  },
  {
    brand: 'Infinity',
    model: 'Reference 1260W',
    size: 12,
    power_rating_rms: 300,
    power_rating_peak: 1200,
    impedance: 4,
    specs: {
      fs: 31.2,
      qts: 0.52,
      vas: 58.3,
      sd: 506,
      xmax: 14.0,
      displacement: 0.10,
      re: 3.5,
      le: 1.1,
      bl: 11.2,
      mms: 165,
      cms: 0.158,
      rms: 3.2
    }
  }
];

// Material types for box construction
export const MATERIALS = {
  mdf: {
    name: 'MDF (Medium Density Fiberboard)',
    density: 750, // kg/m³
    cost: 1.0, // relative cost factor
    acoustic_properties: 'Good damping, consistent density',
    thickness_options: [0.5, 0.625, 0.75, 1.0],
    weight_factor: 1.0
  },
  birch_plywood: {
    name: 'Baltic Birch Plywood',
    density: 680, // kg/m³
    cost: 2.5,
    acoustic_properties: 'Excellent strength, lighter weight',
    thickness_options: [0.5, 0.75, 1.0],
    weight_factor: 0.9
  },
  marine_plywood: {
    name: 'Marine Grade Plywood',
    density: 650, // kg/m³
    cost: 3.5,
    acoustic_properties: 'Waterproof, excellent durability',
    thickness_options: [0.5, 0.75, 1.0],
    weight_factor: 0.87
  },
  hardwood_plywood: {
    name: 'Hardwood Plywood',
    density: 700, // kg/m³
    cost: 2.0,
    acoustic_properties: 'Good strength, attractive finish',
    thickness_options: [0.5, 0.75],
    weight_factor: 0.93
  },
  composite: {
    name: 'Composite (HDF/MDF blend)',
    density: 800, // kg/m³
    cost: 1.5,
    acoustic_properties: 'High density, excellent damping',
    thickness_options: [0.75, 1.0],
    weight_factor: 1.07
  },
  fiberglass: {
    name: 'Fiberglass (Custom)',
    density: 500, // kg/m³ (with resin)
    cost: 4.0,
    acoustic_properties: 'Custom shapes, lightweight',
    thickness_options: [0.25, 0.375, 0.5],
    weight_factor: 0.67
  }
};

// Construction methods and adhesives
export const CONSTRUCTION_METHODS = {
  wood_glue: {
    name: 'Wood Glue (PVA)',
    cure_time: 24, // hours
    strength: 'High',
    gap_filling: 'Poor',
    waterproof: false,
    cost: 1.0,
    application: 'Standard wood joints'
  },
  polyurethane_glue: {
    name: 'Polyurethane Glue',
    cure_time: 24,
    strength: 'Very High',
    gap_filling: 'Excellent',
    waterproof: true,
    cost: 2.5,
    application: 'All materials, expands to fill gaps'
  },
  construction_adhesive: {
    name: 'Construction Adhesive',
    cure_time: 48,
    strength: 'High',
    gap_filling: 'Good',
    waterproof: true,
    cost: 1.5,
    application: 'Heavy duty bonding'
  },
  epoxy: {
    name: 'Epoxy Resin',
    cure_time: 12,
    strength: 'Very High',
    gap_filling: 'Good',
    waterproof: true,
    cost: 3.0,
    application: 'High strength bonds, fiberglass'
  },
  silicone_caulk: {
    name: 'Silicone Caulk',
    cure_time: 24,
    strength: 'Medium',
    gap_filling: 'Excellent',
    waterproof: true,
    cost: 1.2,
    application: 'Sealing, vibration damping'
  },
  butyl_rope: {
    name: 'Butyl Rope Caulk',
    cure_time: 0,
    strength: 'Low',
    gap_filling: 'Excellent',
    waterproof: true,
    cost: 2.0,
    application: 'Removable sealing, damping'
  }
};

// Bracing types for box strength
export const BRACING_TYPES = {
  none: {
    name: 'No Bracing',
    strength_factor: 1.0,
    volume_loss: 0,
    complexity: 'Simple'
  },
  single_brace: {
    name: 'Single Center Brace',
    strength_factor: 1.3,
    volume_loss: 0.02, // 2% volume loss
    complexity: 'Easy'
  },
  window_brace: {
    name: 'Window Brace',
    strength_factor: 1.5,
    volume_loss: 0.03,
    complexity: 'Moderate'
  },
  figure_8: {
    name: 'Figure-8 Brace',
    strength_factor: 1.7,
    volume_loss: 0.04,
    complexity: 'Moderate'
  },
  matrix_brace: {
    name: 'Matrix Bracing',
    strength_factor: 2.0,
    volume_loss: 0.06,
    complexity: 'Complex'
  }
};

// Port types and configurations
export const PORT_TYPES = {
  round: {
    name: 'Round PVC Port',
    efficiency: 0.95,
    cost: 1.0,
    flare_available: true
  },
  slot: {
    name: 'Slot Port',
    efficiency: 0.90,
    cost: 0.5,
    flare_available: false
  },
  aeroport: {
    name: 'Precision Port (Aeroport)',
    efficiency: 0.98,
    cost: 3.0,
    flare_available: true
  },
  kerf: {
    name: 'Kerf Port',
    efficiency: 0.88,
    cost: 0.3,
    flare_available: false
  },
  external: {
    name: 'External Port',
    efficiency: 0.96,
    cost: 2.0,
    flare_available: true
  }
};