"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_2_1 = require("npm:@supabase/supabase-js@2");
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
// Simple geocoding function to get coordinates from address
function geocodeAddress(address_1, city_1, state_1) {
    return __awaiter(this, arguments, void 0, function (address, city, state, country) {
        var query, apiKey, response, data, location_1, error_1;
        if (country === void 0) { country = 'US'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    query = encodeURIComponent("".concat(address, ", ").concat(city, ", ").concat(state, ", ").concat(country));
                    apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
                    if (!apiKey) {
                        console.error('No Google Maps API key found in environment');
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, fetch("https://maps.googleapis.com/maps/api/geocode/json?address=".concat(query, "&key=").concat(apiKey))];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    if (data.status === 'OK' && data.results && data.results.length > 0) {
                        location_1 = data.results[0].geometry.location;
                        return [2 /*return*/, {
                                latitude: location_1.lat,
                                longitude: location_1.lng,
                                formatted_address: data.results[0].formatted_address,
                                place_id: data.results[0].place_id
                            }];
                    }
                    console.warn('Geocoding API returned no results:', data);
                    return [2 /*return*/, null];
                case 3:
                    error_1 = _a.sent();
                    console.error('Geocoding error:', error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Fallback geocoding based on city and state
function getFallbackCoordinates(city, state) {
    // City-level coordinates for major cities
    var cityCoordinates = {
        'FL': {
            'orlando': [28.5383, -81.3792],
            'miami': [25.7617, -80.1918],
            'tampa': [27.9506, -82.4572],
            'jacksonville': [30.3322, -81.6557],
            'tallahassee': [30.4383, -84.2807],
            'fort lauderdale': [26.1224, -80.1373],
            'st. petersburg': [27.7676, -82.6403],
            'clearwater': [27.9659, -82.8001],
            'gainesville': [29.6516, -82.3248],
            'pensacola': [30.4213, -87.2169],
            'daytona beach': [29.2108, -81.0228],
            'fort myers': [26.6406, -81.8723],
            'sarasota': [27.3364, -82.5307],
            'key west': [24.5551, -81.7800],
            'panama city': [30.1588, -85.6602]
        },
        'CA': {
            'los angeles': [34.0522, -118.2437],
            'san francisco': [37.7749, -122.4194],
            'san diego': [32.7157, -117.1611],
            'sacramento': [38.5816, -121.4944],
            'san jose': [37.3382, -121.8863],
            'fresno': [36.7378, -119.7871],
            'long beach': [33.7701, -118.1937],
            'oakland': [37.8044, -122.2711],
            'bakersfield': [35.3733, -119.0187],
            'anaheim': [33.8366, -117.9143]
        },
        'TX': {
            'houston': [29.7604, -95.3698],
            'dallas': [32.7767, -96.7970],
            'austin': [30.2672, -97.7431],
            'san antonio': [29.4241, -98.4936],
            'fort worth': [32.7555, -97.3308],
            'el paso': [31.7619, -106.4850],
            'arlington': [32.7357, -97.1081],
            'corpus christi': [27.8006, -97.3964],
            'plano': [33.0198, -96.6989],
            'lubbock': [33.5779, -101.8552]
        },
        'NY': {
            'new york': [40.7128, -74.0060],
            'buffalo': [42.8864, -78.8784],
            'rochester': [43.1566, -77.6088],
            'yonkers': [40.9312, -73.8987],
            'syracuse': [43.0481, -76.1474],
            'albany': [42.6526, -73.7562]
        },
        'IL': {
            'chicago': [41.8781, -87.6298],
            'springfield': [39.7817, -89.6501],
            'aurora': [41.7606, -88.3201],
            'naperville': [41.7508, -88.1535],
            'peoria': [40.6936, -89.5890],
            'rockford': [42.2711, -89.0937]
        },
        'AZ': {
            'phoenix': [33.4484, -112.0740],
            'tucson': [32.2226, -110.9747],
            'mesa': [33.4152, -111.8315],
            'chandler': [33.3062, -111.8413],
            'scottsdale': [33.4942, -111.9261],
            'glendale': [33.5387, -112.1860]
        },
        'GA': {
            'atlanta': [33.7490, -84.3880],
            'savannah': [32.0809, -81.0912],
            'athens': [33.9519, -83.3576],
            'augusta': [33.4735, -82.0105],
            'columbus': [32.4610, -84.9877],
            'macon': [32.8407, -83.6324]
        },
        'NV': {
            'las vegas': [36.1699, -115.1398],
            'reno': [39.5296, -119.8138],
            'henderson': [36.0395, -115.0430]
        },
        'CO': {
            'denver': [39.7392, -104.9903],
            'colorado springs': [38.8339, -104.8214],
            'aurora': [39.7294, -104.8319]
        },
        'WA': {
            'seattle': [47.6062, -122.3321],
            'spokane': [47.6588, -117.4260],
            'tacoma': [47.2529, -122.4443]
        },
        'OR': {
            'portland': [45.5051, -122.6750],
            'eugene': [44.0521, -123.0868],
            'salem': [44.9429, -123.0351]
        },
        'MA': {
            'boston': [42.3601, -71.0589],
            'worcester': [42.2626, -71.8023],
            'springfield': [42.1015, -72.5898]
        },
        'PA': {
            'philadelphia': [39.9526, -75.1652],
            'pittsburgh': [40.4406, -79.9959],
            'allentown': [40.6084, -75.4902]
        },
        'DC': {
            'washington': [38.9072, -77.0369]
        },
        'TN': {
            'nashville': [36.1627, -86.7816],
            'memphis': [35.1495, -90.0490],
            'knoxville': [35.9606, -83.9207]
        },
        'LA': {
            'new orleans': [29.9511, -90.0715],
            'baton rouge': [30.4515, -91.1871],
            'shreveport': [32.5252, -93.7502]
        },
        'MI': {
            'detroit': [42.3314, -83.0458],
            'grand rapids': [42.9634, -85.6681],
            'ann arbor': [42.2808, -83.7430]
        },
        'MN': {
            'minneapolis': [44.9778, -93.2650],
            'st. paul': [44.9537, -93.0900],
            'rochester': [44.0121, -92.4802]
        }
    };
    // State-level coordinates
    var stateCoordinates = {
        'AL': [32.7794, -86.8287],
        'AK': [64.0685, -152.2782],
        'AZ': [34.2744, -111.6602],
        'AR': [34.8938, -92.4426],
        'CA': [37.1841, -119.4696],
        'CO': [38.9972, -105.5478],
        'CT': [41.6219, -72.7273],
        'DE': [38.9896, -75.5050],
        'FL': [28.6305, -82.4497],
        'GA': [32.6415, -83.4426],
        'HI': [20.2927, -156.3737],
        'ID': [44.3509, -114.6130],
        'IL': [40.0417, -89.1965],
        'IN': [39.8942, -86.2816],
        'IA': [42.0751, -93.4960],
        'KS': [38.4937, -98.3804],
        'KY': [37.5347, -85.3021],
        'LA': [31.0689, -91.9968],
        'ME': [45.3695, -69.2428],
        'MD': [39.0550, -76.7909],
        'MA': [42.2596, -71.8083],
        'MI': [44.3467, -85.4102],
        'MN': [46.2807, -94.3053],
        'MS': [32.7364, -89.6678],
        'MO': [38.3566, -92.4580],
        'MT': [47.0527, -109.6333],
        'NE': [41.5378, -99.7951],
        'NV': [39.3289, -116.6312],
        'NH': [43.6805, -71.5811],
        'NJ': [40.1907, -74.6728],
        'NM': [34.4071, -106.1126],
        'NY': [42.9538, -75.5268],
        'NC': [35.5557, -79.3877],
        'ND': [47.4501, -100.4659],
        'OH': [40.2862, -82.7937],
        'OK': [35.5889, -97.4943],
        'OR': [43.9336, -120.5583],
        'PA': [40.8781, -77.7996],
        'RI': [41.6762, -71.5562],
        'SC': [33.9169, -80.8964],
        'SD': [44.4443, -100.2263],
        'TN': [35.8580, -86.3505],
        'TX': [31.4757, -99.3312],
        'UT': [39.3055, -111.6703],
        'VT': [44.0687, -72.6658],
        'VA': [37.5215, -78.8537],
        'WA': [47.3826, -120.4472],
        'WV': [38.6409, -80.6227],
        'WI': [44.6243, -89.9941],
        'WY': [42.9957, -107.5512],
        'DC': [38.9072, -77.0369]
    };
    var stateCode = state.toUpperCase();
    var cityName = city.toLowerCase();
    // First try city-level coordinates
    if (cityCoordinates[stateCode] && cityCoordinates[stateCode][cityName]) {
        var _a = cityCoordinates[stateCode][cityName], lat = _a[0], lng = _a[1];
        console.log("Using city-level coordinates for ".concat(city, ", ").concat(state, ": ").concat(lat, ", ").concat(lng));
        return { latitude: lat, longitude: lng };
    }
    // Fall back to state-level coordinates
    if (stateCoordinates[stateCode]) {
        var _b = stateCoordinates[stateCode], lat = _b[0], lng = _b[1];
        console.log("Using state-level coordinates for ".concat(state, ": ").concat(lat, ", ").concat(lng));
        return { latitude: lat, longitude: lng };
    }
    // Default to center of US if state not recognized
    console.log("No coordinates found for ".concat(city, ", ").concat(state, ", using US center"));
    return { latitude: 39.8283, longitude: -98.5795 };
}
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabaseClient, authHeader, token, _a, user, authError, eventData, requiredFields, _i, requiredFields_1, field, geocodeResult, fallbackCoords, stateCode, stateCoordinates, _b, lat, lng, _c, userData, userError, isAdmin, _d, event_1, insertError, locationData, locationError, _e, forceUpdateResult, forceUpdateError, forceUpdateError_1, error_2;
    var _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response(null, { headers: corsHeaders })];
                }
                _h.label = 1;
            case 1:
                _h.trys.push([1, 12, , 13]);
                // Only allow POST requests
                if (req.method !== 'POST') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Method not allowed' }), {
                            status: 405,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                supabaseClient = (0, supabase_js_2_1.createClient)((_f = Deno.env.get('SUPABASE_URL')) !== null && _f !== void 0 ? _f : '', (_g = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _g !== void 0 ? _g : '', {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });
                authHeader = req.headers.get('Authorization');
                if (!authHeader) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                token = authHeader.replace('Bearer ', '');
                return [4 /*yield*/, supabaseClient.auth.getUser(token)];
            case 2:
                _a = _h.sent(), user = _a.data.user, authError = _a.error;
                if (authError || !user) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [4 /*yield*/, req.json()];
            case 3:
                eventData = _h.sent();
                requiredFields = ['title', 'start_date', 'end_date', 'venue_name', 'address', 'city', 'state'];
                for (_i = 0, requiredFields_1 = requiredFields; _i < requiredFields_1.length; _i++) {
                    field = requiredFields_1[_i];
                    if (!eventData[field]) {
                        return [2 /*return*/, new Response(JSON.stringify({ error: "Missing required field: ".concat(field) }), {
                                status: 400,
                                headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                            })];
                    }
                }
                // Geocode the address to get latitude and longitude
                console.log("Geocoding address: ".concat(eventData.address, ", ").concat(eventData.city, ", ").concat(eventData.state));
                return [4 /*yield*/, geocodeAddress(eventData.address, eventData.city, eventData.state, eventData.country || 'US')];
            case 4:
                geocodeResult = _h.sent();
                if (geocodeResult) {
                    eventData.latitude = geocodeResult.latitude;
                    eventData.longitude = geocodeResult.longitude;
                    console.log('Google geocoded coordinates:', geocodeResult.latitude, geocodeResult.longitude);
                }
                else {
                    console.warn('Google geocoding failed, using fallback method');
                    fallbackCoords = getFallbackCoordinates(eventData.city, eventData.state);
                    if (fallbackCoords) {
                        eventData.latitude = fallbackCoords.latitude;
                        eventData.longitude = fallbackCoords.longitude;
                        console.log('Using fallback coordinates:', fallbackCoords.latitude, fallbackCoords.longitude);
                    }
                    else {
                        stateCode = eventData.state.toUpperCase();
                        stateCoordinates = {
                            'AL': [32.7794, -86.8287],
                            'AK': [64.0685, -152.2782],
                            'AZ': [34.2744, -111.6602],
                            'AR': [34.8938, -92.4426],
                            'CA': [37.1841, -119.4696],
                            'CO': [38.9972, -105.5478],
                            'CT': [41.6219, -72.7273],
                            'DE': [38.9896, -75.5050],
                            'FL': [28.6305, -82.4497],
                            'GA': [32.6415, -83.4426],
                            'HI': [20.2927, -156.3737],
                            'ID': [44.3509, -114.6130],
                            'IL': [40.0417, -89.1965],
                            'IN': [39.8942, -86.2816],
                            'IA': [42.0751, -93.4960],
                            'KS': [38.4937, -98.3804],
                            'KY': [37.5347, -85.3021],
                            'LA': [31.0689, -91.9968],
                            'ME': [45.3695, -69.2428],
                            'MD': [39.0550, -76.7909],
                            'MA': [42.2596, -71.8083],
                            'MI': [44.3467, -85.4102],
                            'MN': [46.2807, -94.3053],
                            'MS': [32.7364, -89.6678],
                            'MO': [38.3566, -92.4580],
                            'MT': [47.0527, -109.6333],
                            'NE': [41.5378, -99.7951],
                            'NV': [39.3289, -116.6312],
                            'NH': [43.6805, -71.5811],
                            'NJ': [40.1907, -74.6728],
                            'NM': [34.4071, -106.1126],
                            'NY': [42.9538, -75.5268],
                            'NC': [35.5557, -79.3877],
                            'ND': [47.4501, -100.4659],
                            'OH': [40.2862, -82.7937],
                            'OK': [35.5889, -97.4943],
                            'OR': [43.9336, -120.5583],
                            'PA': [40.8781, -77.7996],
                            'RI': [41.6762, -71.5562],
                            'SC': [33.9169, -80.8964],
                            'SD': [44.4443, -100.2263],
                            'TN': [35.8580, -86.3505],
                            'TX': [31.4757, -99.3312],
                            'UT': [39.3055, -111.6703],
                            'VT': [44.0687, -72.6658],
                            'VA': [37.5215, -78.8537],
                            'WA': [47.3826, -120.4472],
                            'WV': [38.6409, -80.6227],
                            'WI': [44.6243, -89.9941],
                            'WY': [42.9957, -107.5512]
                        };
                        if (stateCoordinates[stateCode]) {
                            _b = stateCoordinates[stateCode], lat = _b[0], lng = _b[1];
                            eventData.latitude = lat;
                            eventData.longitude = lng;
                            console.log('Using fallback coordinates for state:', stateCode, lat, lng);
                        }
                        else {
                            // Default to center of US
                            eventData.latitude = 39.8283;
                            eventData.longitude = -98.5795;
                            console.log('Using default US center coordinates');
                        }
                    }
                }
                return [4 /*yield*/, supabaseClient
                        .from('users')
                        .select('membership_type')
                        .eq('id', user.id)
                        .single()];
            case 5:
                _c = _h.sent(), userData = _c.data, userError = _c.error;
                if (userError) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to get user data' }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                isAdmin = userData.membership_type === 'admin';
                // Set approval status and event status
                eventData.approval_status = isAdmin ? 'approved' : 'pending';
                // Always set status to pending_approval initially, even for admin
                eventData.status = 'pending_approval';
                eventData.organizer_id = user.id;
                if (isAdmin) {
                    eventData.approved_by = user.id;
                    eventData.approved_at = new Date().toISOString();
                }
                return [4 /*yield*/, supabaseClient
                        .from('events')
                        .insert(eventData)
                        .select()
                        .single()];
            case 6:
                _d = _h.sent(), event_1 = _d.data, insertError = _d.error;
                if (insertError) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to create event', details: insertError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                if (!event_1) return [3 /*break*/, 11];
                locationData = {
                    event_id: event_1.id,
                    raw_address: "".concat(eventData.address, ", ").concat(eventData.city, ", ").concat(eventData.state, ", ").concat(eventData.country || 'US'),
                    city: eventData.city,
                    state: eventData.state,
                    zip_code: eventData.zip_code,
                    country: eventData.country || 'US',
                    latitude: eventData.latitude,
                    longitude: eventData.longitude,
                    geocoding_status: geocodeResult ? 'success' : 'manual',
                    geocoding_provider: geocodeResult ? 'google' : 'fallback',
                    geocoding_accuracy: geocodeResult ? 'rooftop' : 'city_or_state',
                    formatted_address: geocodeResult ? geocodeResult.formatted_address : "".concat(eventData.city, ", ").concat(eventData.state, ", ").concat(eventData.country || 'US'),
                    place_id: geocodeResult ? geocodeResult.place_id : null,
                    geocoded_at: new Date().toISOString()
                };
                return [4 /*yield*/, supabaseClient
                        .from('event_locations')
                        .insert(locationData)];
            case 7:
                locationError = (_h.sent()).error;
                if (locationError) {
                    console.error('Failed to create event location:', locationError);
                    // Don't fail the whole request if just the location insert fails
                }
                _h.label = 8;
            case 8:
                _h.trys.push([8, 10, , 11]);
                return [4 /*yield*/, supabaseClient
                        .rpc('force_update_event_coordinates', { event_uuid: event_1.id })];
            case 9:
                _e = _h.sent(), forceUpdateResult = _e.data, forceUpdateError = _e.error;
                if (!forceUpdateError && forceUpdateResult) {
                    console.log('Force updated coordinates:', forceUpdateResult);
                }
                return [3 /*break*/, 11];
            case 10:
                forceUpdateError_1 = _h.sent();
                console.warn('Failed to force update coordinates:', forceUpdateError_1);
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/, new Response(JSON.stringify({
                    success: true,
                    event: event_1,
                    message: isAdmin ? 'Event created and published' : 'Event created and pending approval',
                    status: eventData.status,
                    approval_status: eventData.approval_status,
                    geocoded: !!geocodeResult,
                    coordinates: {
                        latitude: eventData.latitude,
                        longitude: eventData.longitude,
                        source: geocodeResult ? 'google' : 'fallback'
                    }
                }), {
                    headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                })];
            case 12:
                error_2 = _h.sent();
                console.error('Unexpected error:', error_2);
                return [2 /*return*/, new Response(JSON.stringify({ error: 'Internal server error', details: error_2 instanceof Error ? error_2.message : 'Unknown error' }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 13: return [2 /*return*/];
        }
    });
}); });
