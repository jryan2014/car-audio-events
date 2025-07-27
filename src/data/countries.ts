export interface Country {
  code: string;
  name: string;
  states?: { code: string; name: string }[];
  postalCodeFormat?: string;
  postalCodeLabel?: string;
  stateLabel?: string;
}

export const COUNTRIES: Country[] = [
  {
    code: 'US',
    name: 'United States',
    postalCodeFormat: '#####',
    postalCodeLabel: 'ZIP Code',
    stateLabel: 'State',
    states: [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' }
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    postalCodeFormat: 'A#A #A#',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Province',
    states: [
      { code: 'AB', name: 'Alberta' },
      { code: 'BC', name: 'British Columbia' },
      { code: 'MB', name: 'Manitoba' },
      { code: 'NB', name: 'New Brunswick' },
      { code: 'NL', name: 'Newfoundland and Labrador' },
      { code: 'NT', name: 'Northwest Territories' },
      { code: 'NS', name: 'Nova Scotia' },
      { code: 'NU', name: 'Nunavut' },
      { code: 'ON', name: 'Ontario' },
      { code: 'PE', name: 'Prince Edward Island' },
      { code: 'QC', name: 'Quebec' },
      { code: 'SK', name: 'Saskatchewan' },
      { code: 'YT', name: 'Yukon' }
    ]
  },
  {
    code: 'MX',
    name: 'Mexico',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'State',
    states: [
      { code: 'AGU', name: 'Aguascalientes' },
      { code: 'BCN', name: 'Baja California' },
      { code: 'BCS', name: 'Baja California Sur' },
      { code: 'CAM', name: 'Campeche' },
      { code: 'CHP', name: 'Chiapas' },
      { code: 'CHH', name: 'Chihuahua' },
      { code: 'CMX', name: 'Ciudad de México' },
      { code: 'COA', name: 'Coahuila' },
      { code: 'COL', name: 'Colima' },
      { code: 'DUR', name: 'Durango' },
      { code: 'GUA', name: 'Guanajuato' },
      { code: 'GRO', name: 'Guerrero' },
      { code: 'HID', name: 'Hidalgo' },
      { code: 'JAL', name: 'Jalisco' },
      { code: 'MEX', name: 'México' },
      { code: 'MIC', name: 'Michoacán' },
      { code: 'MOR', name: 'Morelos' },
      { code: 'NAY', name: 'Nayarit' },
      { code: 'NLE', name: 'Nuevo León' },
      { code: 'OAX', name: 'Oaxaca' },
      { code: 'PUE', name: 'Puebla' },
      { code: 'QUE', name: 'Querétaro' },
      { code: 'ROO', name: 'Quintana Roo' },
      { code: 'SLP', name: 'San Luis Potosí' },
      { code: 'SIN', name: 'Sinaloa' },
      { code: 'SON', name: 'Sonora' },
      { code: 'TAB', name: 'Tabasco' },
      { code: 'TAM', name: 'Tamaulipas' },
      { code: 'TLA', name: 'Tlaxcala' },
      { code: 'VER', name: 'Veracruz' },
      { code: 'YUC', name: 'Yucatán' },
      { code: 'ZAC', name: 'Zacatecas' }
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    postalCodeFormat: 'A# #AA',
    postalCodeLabel: 'Postcode',
    stateLabel: 'County'
  },
  {
    code: 'AU',
    name: 'Australia',
    postalCodeFormat: '####',
    postalCodeLabel: 'Postcode',
    stateLabel: 'State/Territory',
    states: [
      { code: 'NSW', name: 'New South Wales' },
      { code: 'VIC', name: 'Victoria' },
      { code: 'QLD', name: 'Queensland' },
      { code: 'WA', name: 'Western Australia' },
      { code: 'SA', name: 'South Australia' },
      { code: 'TAS', name: 'Tasmania' },
      { code: 'ACT', name: 'Australian Capital Territory' },
      { code: 'NT', name: 'Northern Territory' }
    ]
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    postalCodeFormat: '####',
    postalCodeLabel: 'Postcode',
    stateLabel: 'Region'
  },
  {
    code: 'DE',
    name: 'Germany',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Postleitzahl',
    stateLabel: 'State'
  },
  {
    code: 'FR',
    name: 'France',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Code Postal',
    stateLabel: 'Region'
  },
  {
    code: 'IT',
    name: 'Italy',
    postalCodeFormat: '#####',
    postalCodeLabel: 'CAP',
    stateLabel: 'Province'
  },
  {
    code: 'ES',
    name: 'Spain',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Province'
  },
  {
    code: 'PT',
    name: 'Portugal',
    postalCodeFormat: '####-###',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'District'
  },
  {
    code: 'NL',
    name: 'Netherlands',
    postalCodeFormat: '#### AA',
    postalCodeLabel: 'Postcode',
    stateLabel: 'Province'
  },
  {
    code: 'BE',
    name: 'Belgium',
    postalCodeFormat: '####',
    postalCodeLabel: 'Postcode',
    stateLabel: 'Province'
  },
  {
    code: 'CH',
    name: 'Switzerland',
    postalCodeFormat: '####',
    postalCodeLabel: 'PLZ',
    stateLabel: 'Canton'
  },
  {
    code: 'AT',
    name: 'Austria',
    postalCodeFormat: '####',
    postalCodeLabel: 'PLZ',
    stateLabel: 'State'
  },
  {
    code: 'SE',
    name: 'Sweden',
    postalCodeFormat: '### ##',
    postalCodeLabel: 'Postnummer',
    stateLabel: 'County'
  },
  {
    code: 'NO',
    name: 'Norway',
    postalCodeFormat: '####',
    postalCodeLabel: 'Postnummer',
    stateLabel: 'County'
  },
  {
    code: 'DK',
    name: 'Denmark',
    postalCodeFormat: '####',
    postalCodeLabel: 'Postnummer',
    stateLabel: 'Region'
  },
  {
    code: 'FI',
    name: 'Finland',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Postinumero',
    stateLabel: 'Region'
  },
  {
    code: 'PL',
    name: 'Poland',
    postalCodeFormat: '##-###',
    postalCodeLabel: 'Kod pocztowy',
    stateLabel: 'Voivodeship'
  },
  {
    code: 'CZ',
    name: 'Czech Republic',
    postalCodeFormat: '### ##',
    postalCodeLabel: 'PSČ',
    stateLabel: 'Region'
  },
  {
    code: 'SK',
    name: 'Slovakia',
    postalCodeFormat: '### ##',
    postalCodeLabel: 'PSČ',
    stateLabel: 'Region'
  },
  {
    code: 'HU',
    name: 'Hungary',
    postalCodeFormat: '####',
    postalCodeLabel: 'Irányítószám',
    stateLabel: 'County'
  },
  {
    code: 'RO',
    name: 'Romania',
    postalCodeFormat: '######',
    postalCodeLabel: 'Cod poștal',
    stateLabel: 'County'
  },
  {
    code: 'BG',
    name: 'Bulgaria',
    postalCodeFormat: '####',
    postalCodeLabel: 'Пощенски код',
    stateLabel: 'Province'
  },
  {
    code: 'GR',
    name: 'Greece',
    postalCodeFormat: '### ##',
    postalCodeLabel: 'Ταχυδρομικός Κώδικας',
    stateLabel: 'Region'
  },
  {
    code: 'TR',
    name: 'Turkey',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Posta Kodu',
    stateLabel: 'Province'
  },
  {
    code: 'RU',
    name: 'Russia',
    postalCodeFormat: '######',
    postalCodeLabel: 'Почтовый индекс',
    stateLabel: 'Region'
  },
  {
    code: 'UA',
    name: 'Ukraine',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Поштовий індекс',
    stateLabel: 'Oblast'
  },
  {
    code: 'JP',
    name: 'Japan',
    postalCodeFormat: '###-####',
    postalCodeLabel: '郵便番号',
    stateLabel: 'Prefecture'
  },
  {
    code: 'CN',
    name: 'China',
    postalCodeFormat: '######',
    postalCodeLabel: '邮政编码',
    stateLabel: 'Province'
  },
  {
    code: 'KR',
    name: 'South Korea',
    postalCodeFormat: '#####',
    postalCodeLabel: '우편번호',
    stateLabel: 'Province'
  },
  {
    code: 'TW',
    name: 'Taiwan',
    postalCodeFormat: '#####',
    postalCodeLabel: '郵遞區號',
    stateLabel: 'County'
  },
  {
    code: 'TH',
    name: 'Thailand',
    postalCodeFormat: '#####',
    postalCodeLabel: 'รหัสไปรษณีย์',
    stateLabel: 'Province'
  },
  {
    code: 'VN',
    name: 'Vietnam',
    postalCodeFormat: '######',
    postalCodeLabel: 'Mã bưu điện',
    stateLabel: 'Province'
  },
  {
    code: 'PH',
    name: 'Philippines',
    postalCodeFormat: '####',
    postalCodeLabel: 'ZIP Code',
    stateLabel: 'Province'
  },
  {
    code: 'MY',
    name: 'Malaysia',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Poskod',
    stateLabel: 'State'
  },
  {
    code: 'SG',
    name: 'Singapore',
    postalCodeFormat: '######',
    postalCodeLabel: 'Postal Code'
  },
  {
    code: 'ID',
    name: 'Indonesia',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Kode Pos',
    stateLabel: 'Province'
  },
  {
    code: 'IN',
    name: 'India',
    postalCodeFormat: '######',
    postalCodeLabel: 'PIN Code',
    stateLabel: 'State'
  },
  {
    code: 'PK',
    name: 'Pakistan',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Province'
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    postalCodeFormat: '####',
    postalCodeLabel: 'Post Code',
    stateLabel: 'Division'
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    postalCodeLabel: 'P.O. Box',
    stateLabel: 'Emirate'
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Province'
  },
  {
    code: 'IL',
    name: 'Israel',
    postalCodeFormat: '#######',
    postalCodeLabel: 'מיקוד',
    stateLabel: 'District'
  },
  {
    code: 'ZA',
    name: 'South Africa',
    postalCodeFormat: '####',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Province'
  },
  {
    code: 'NG',
    name: 'Nigeria',
    postalCodeFormat: '######',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'State'
  },
  {
    code: 'KE',
    name: 'Kenya',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'County'
  },
  {
    code: 'EG',
    name: 'Egypt',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Governorate'
  },
  {
    code: 'BR',
    name: 'Brazil',
    postalCodeFormat: '#####-###',
    postalCodeLabel: 'CEP',
    stateLabel: 'State',
    states: [
      { code: 'AC', name: 'Acre' },
      { code: 'AL', name: 'Alagoas' },
      { code: 'AP', name: 'Amapá' },
      { code: 'AM', name: 'Amazonas' },
      { code: 'BA', name: 'Bahia' },
      { code: 'CE', name: 'Ceará' },
      { code: 'DF', name: 'Distrito Federal' },
      { code: 'ES', name: 'Espírito Santo' },
      { code: 'GO', name: 'Goiás' },
      { code: 'MA', name: 'Maranhão' },
      { code: 'MT', name: 'Mato Grosso' },
      { code: 'MS', name: 'Mato Grosso do Sul' },
      { code: 'MG', name: 'Minas Gerais' },
      { code: 'PA', name: 'Pará' },
      { code: 'PB', name: 'Paraíba' },
      { code: 'PR', name: 'Paraná' },
      { code: 'PE', name: 'Pernambuco' },
      { code: 'PI', name: 'Piauí' },
      { code: 'RJ', name: 'Rio de Janeiro' },
      { code: 'RN', name: 'Rio Grande do Norte' },
      { code: 'RS', name: 'Rio Grande do Sul' },
      { code: 'RO', name: 'Rondônia' },
      { code: 'RR', name: 'Roraima' },
      { code: 'SC', name: 'Santa Catarina' },
      { code: 'SP', name: 'São Paulo' },
      { code: 'SE', name: 'Sergipe' },
      { code: 'TO', name: 'Tocantins' }
    ]
  },
  {
    code: 'AR',
    name: 'Argentina',
    postalCodeFormat: 'A####AAA',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Province'
  },
  {
    code: 'CL',
    name: 'Chile',
    postalCodeFormat: '#######',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Region'
  },
  {
    code: 'CO',
    name: 'Colombia',
    postalCodeFormat: '######',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Department'
  },
  {
    code: 'PE',
    name: 'Peru',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Region'
  },
  {
    code: 'VE',
    name: 'Venezuela',
    postalCodeFormat: '####',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'State'
  },
  {
    code: 'EC',
    name: 'Ecuador',
    postalCodeFormat: '######',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Province'
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Province'
  },
  {
    code: 'PA',
    name: 'Panama',
    postalCodeFormat: '####',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Province'
  },
  {
    code: 'DO',
    name: 'Dominican Republic',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Province'
  },
  {
    code: 'JM',
    name: 'Jamaica',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Parish'
  },
  {
    code: 'TT',
    name: 'Trinidad and Tobago',
    postalCodeFormat: '######',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Region'
  },
  {
    code: 'VI',
    name: 'U.S. Virgin Islands',
    postalCodeFormat: '#####',
    postalCodeLabel: 'ZIP Code'
  },
  {
    code: 'VG',
    name: 'British Virgin Islands',
    postalCodeLabel: 'Postal Code'
  },
  {
    code: 'PR',
    name: 'Puerto Rico',
    postalCodeFormat: '#####',
    postalCodeLabel: 'ZIP Code'
  },
  {
    code: 'BB',
    name: 'Barbados',
    postalCodeFormat: 'BB#####',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Parish'
  },
  {
    code: 'BS',
    name: 'Bahamas',
    postalCodeLabel: 'P.O. Box'
  },
  {
    code: 'KY',
    name: 'Cayman Islands',
    postalCodeFormat: 'KY#-####',
    postalCodeLabel: 'Postal Code'
  },
  {
    code: 'BM',
    name: 'Bermuda',
    postalCodeFormat: 'AA ##',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Parish'
  },
  {
    code: 'CU',
    name: 'Cuba',
    postalCodeFormat: '#####',
    postalCodeLabel: 'Código Postal',
    stateLabel: 'Province'
  },
  {
    code: 'HT',
    name: 'Haiti',
    postalCodeFormat: '####',
    postalCodeLabel: 'Code Postal',
    stateLabel: 'Department'
  },
  {
    code: 'GU',
    name: 'Guam',
    postalCodeFormat: '#####',
    postalCodeLabel: 'ZIP Code'
  },
  {
    code: 'FJ',
    name: 'Fiji',
    postalCodeLabel: 'Postal Code'
  },
  {
    code: 'PG',
    name: 'Papua New Guinea',
    postalCodeFormat: '###',
    postalCodeLabel: 'Postal Code',
    stateLabel: 'Province'
  },
  {
    code: 'NF',
    name: 'Norfolk Island',
    postalCodeFormat: '####',
    postalCodeLabel: 'Postcode'
  }
];

// Helper function to get a country by code
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(country => country.code === code);
}

// Helper function to get states/provinces for a country
export function getStatesForCountry(countryCode: string): { code: string; name: string }[] | undefined {
  const country = getCountryByCode(countryCode);
  return country?.states;
}

// Helper function to get postal code label for a country
export function getPostalCodeLabel(countryCode: string): string {
  const country = getCountryByCode(countryCode);
  return country?.postalCodeLabel || 'Postal Code';
}

// Helper function to get state/province label for a country
export function getStateLabel(countryCode: string): string {
  const country = getCountryByCode(countryCode);
  return country?.stateLabel || 'State/Province';
}

// Helper function to validate postal code format
export function validatePostalCode(postalCode: string, countryCode: string): boolean {
  const country = getCountryByCode(countryCode);
  if (!country?.postalCodeFormat) return true; // If no format specified, accept any
  
  // Convert format to regex pattern
  const pattern = country.postalCodeFormat
    .replace(/#/g, '\\d')
    .replace(/A/g, '[A-Z]')
    .replace(/ /g, '\\s?'); // Make spaces optional
  
  const regex = new RegExp(`^${pattern}$`, 'i');
  return regex.test(postalCode.trim());
}