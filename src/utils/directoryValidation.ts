import { supabase } from '../lib/supabase';

interface DirectoryListing {
  id: string;
  business_name?: string;
  business_type?: string;
  listing_type?: string;
  description?: string;
  services?: string[];
  products?: any[];
  hours?: any;
  views?: number;
  created_at?: string;
  [key: string]: any;
}

/**
 * Validates and sanitizes directory listing data
 */
export const validateDirectoryListing = (data: any): DirectoryListing | null => {
  if (!data || typeof data !== 'object') {
    console.warn('Invalid directory listing data:', data);
    return null;
  }

  try {
    const validated: DirectoryListing = {
      id: data.id || 'unknown',
      business_name: typeof data.business_name === 'string' ? data.business_name : 'Unknown Business',
      business_type: typeof data.business_type === 'string' ? data.business_type : 'other',
      listing_type: typeof data.listing_type === 'string' ? data.listing_type : 'other',
      description: typeof data.description === 'string' ? data.description : '',
      services: Array.isArray(data.services) ? data.services.filter(s => typeof s === 'string') : [],
      products: Array.isArray(data.products) ? data.products.map(validateProduct).filter(Boolean) : [],
      hours: validateBusinessHours(data.hours),
      views: typeof data.views === 'number' ? data.views : 0,
      created_at: data.created_at || new Date().toISOString()
    };

    // Copy other safe properties
    const safeProperties = [
      'email', 'phone', 'website', 'address', 'city', 'state', 'zip', 'country',
      'latitude', 'longitude', 'featured', 'verified', 'status', 'contact_name',
      'item_title', 'item_description', 'item_price', 'item_condition',
      'brand', 'model', 'condition', 'price', 'equipment_category'
    ];

    safeProperties.forEach(prop => {
      if (data.hasOwnProperty(prop) && data[prop] !== undefined && data[prop] !== null) {
        validated[prop] = data[prop];
      }
    });

    return validated;
  } catch (error) {
    console.error('Error validating directory listing:', error);
    return null;
  }
};

/**
 * Validates a product object
 */
const validateProduct = (product: any): any | null => {
  if (!product || typeof product !== 'object') return null;

  try {
    return {
      id: product.id,
      name: typeof product.name === 'string' ? product.name : 'Unnamed Product',
      description: typeof product.description === 'string' ? product.description : '',
      price: typeof product.price === 'number' ? product.price : 0,
      category: typeof product.category === 'string' ? product.category : 'other',
      images: Array.isArray(product.images) ? product.images.filter(img => 
        typeof img === 'string' && img.trim() !== ''
      ) : []
    };
  } catch (error) {
    console.error('Error validating product:', error);
    return null;
  }
};

/**
 * Validates business hours object
 */
const validateBusinessHours = (hours: any): any | null => {
  if (!hours || typeof hours !== 'object') return null;

  try {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const validated: any = {};

    validDays.forEach(day => {
      if (hours[day] && typeof hours[day] === 'object') {
        validated[day] = {
          open: typeof hours[day].open === 'string' ? hours[day].open : '',
          close: typeof hours[day].close === 'string' ? hours[day].close : '',
          closed: Boolean(hours[day].closed)
        };
      }
    });

    return Object.keys(validated).length > 0 ? validated : null;
  } catch (error) {
    console.error('Error validating business hours:', error);
    return null;
  }
};

/**
 * Safe string replacement that handles null/undefined values
 */
export const safeReplace = (str: any, search: string, replacement: string): string => {
  if (!str || typeof str !== 'string') return 'Unknown';
  return str.replace(search, replacement);
};

/**
 * Safe capitalize function
 */
export const safeCapitalize = (str: any): string => {
  if (!str || typeof str !== 'string') return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Safe array access
 */
export const safeArray = (arr: any): any[] => {
  return Array.isArray(arr) ? arr : [];
};

/**
 * Validates directory database schema and policies
 */
export const validateDirectorySchema = async (): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if directory_listings table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'directory_listings')
      .eq('table_schema', 'public');

    if (tablesError || !tables || tables.length === 0) {
      errors.push('directory_listings table not found');
      return { isValid: false, errors, warnings };
    }

    // Check required columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'directory_listings')
      .eq('table_schema', 'public');

    if (columnsError || !columns) {
      errors.push('Unable to fetch directory_listings columns');
      return { isValid: false, errors, warnings };
    }

    const requiredColumns = ['id', 'business_name', 'business_type', 'listing_type', 'user_id'];
    const existingColumns = columns.map(col => col.column_name);

    requiredColumns.forEach(col => {
      if (!existingColumns.includes(col)) {
        errors.push(`Required column '${col}' not found in directory_listings table`);
      }
    });

    // Check for recommended columns
    const recommendedColumns = ['description', 'services', 'products', 'hours', 'views'];
    recommendedColumns.forEach(col => {
      if (!existingColumns.includes(col)) {
        warnings.push(`Recommended column '${col}' not found in directory_listings table`);
      }
    });

    // Test basic operations
    try {
      const { error: selectError } = await supabase
        .from('directory_listings')
        .select('id, business_name, business_type')
        .limit(1);

      if (selectError) {
        errors.push(`Cannot perform SELECT operation: ${selectError.message}`);
      }
    } catch (error: any) {
      errors.push(`Database access error: ${error.message}`);
    }

  } catch (error: any) {
    errors.push(`Schema validation error: ${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Tests directory functionality with error recovery
 */
export const testDirectoryFunctionality = async (): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> => {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    results.push('Starting directory functionality tests...');

    // Test 1: Basic listing fetch
    try {
      const { data, error } = await supabase
        .from('directory_listings')
        .select('*')
        .limit(5);

      if (error) {
        errors.push(`Listing fetch test failed: ${error.message}`);
      } else {
        results.push(`✅ Successfully fetched ${data?.length || 0} test listings`);
        
        // Validate fetched data
        if (data && data.length > 0) {
          const validatedData = data.map(validateDirectoryListing).filter(Boolean);
          results.push(`✅ Successfully validated ${validatedData.length}/${data.length} listings`);
        }
      }
    } catch (error: any) {
      errors.push(`Listing fetch error: ${error.message}`);
    }

    // Test 2: View increment function
    try {
      const { error } = await supabase.rpc('increment_directory_view', { 
        listing_id: 'test-id' 
      });
      
      if (error && !error.message.includes('not found')) {
        errors.push(`View increment test failed: ${error.message}`);
      } else {
        results.push('✅ View increment function is accessible');
      }
    } catch (error: any) {
      errors.push(`View increment error: ${error.message}`);
    }

    // Test 3: Search functionality
    try {
      const { data, error } = await supabase
        .from('directory_listings')
        .select('*')
        .ilike('business_name', '%test%')
        .limit(1);

      if (error) {
        errors.push(`Search test failed: ${error.message}`);
      } else {
        results.push('✅ Search functionality is working');
      }
    } catch (error: any) {
      errors.push(`Search error: ${error.message}`);
    }

    results.push(`Test completed with ${errors.length} errors`);

  } catch (error: any) {
    errors.push(`Test execution error: ${error.message}`);
  }

  return {
    success: errors.length === 0,
    results,
    errors
  };
};