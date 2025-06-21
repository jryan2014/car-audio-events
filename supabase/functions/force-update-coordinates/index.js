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
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabaseClient, authHeader, token, _a, user, authError, eventId, _b, event_1, eventError, coordinates, updateError_1, locationError, googleError_1, _c, result, updateError, directUpdateError, updatedEvent, error_2;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response(null, { headers: corsHeaders })];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 17, , 18]);
                // Only allow POST requests
                if (req.method !== 'POST') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Method not allowed' }), {
                            status: 405,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                supabaseClient = (0, supabase_js_2_1.createClient)((_d = Deno.env.get('SUPABASE_URL')) !== null && _d !== void 0 ? _d : '', (_e = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _e !== void 0 ? _e : '', {
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
                _a = _f.sent(), user = _a.data.user, authError = _a.error;
                if (authError || !user) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [4 /*yield*/, req.json()];
            case 3:
                eventId = (_f.sent()).eventId;
                if (!eventId) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Missing event ID' }), {
                            status: 400,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [4 /*yield*/, supabaseClient
                        .from('events')
                        .select('id, address, city, state, country')
                        .eq('id', eventId)
                        .single()];
            case 4:
                _b = _f.sent(), event_1 = _b.data, eventError = _b.error;
                if (eventError) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Event not found', details: eventError.message }), {
                            status: 404,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                coordinates = null;
                _f.label = 5;
            case 5:
                _f.trys.push([5, 11, , 12]);
                return [4 /*yield*/, geocodeAddress(event_1.address, event_1.city, event_1.state, event_1.country || 'US')];
            case 6:
                coordinates = _f.sent();
                if (!coordinates) return [3 /*break*/, 10];
                console.log('Google Maps geocoding successful:', coordinates);
                return [4 /*yield*/, supabaseClient
                        .from('events')
                        .update({
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', eventId)];
            case 7:
                updateError_1 = (_f.sent()).error;
                if (updateError_1) {
                    throw updateError_1;
                }
                // Force a direct update to ensure the coordinates are properly set
                // This is a workaround for potential type conversion issues
                return [4 /*yield*/, supabaseClient.rpc('force_update_event_coordinates', {
                        event_uuid: eventId
                    })];
            case 8:
                // Force a direct update to ensure the coordinates are properly set
                // This is a workaround for potential type conversion issues
                _f.sent();
                return [4 /*yield*/, supabaseClient
                        .from('event_locations')
                        .upsert({
                        event_id: eventId,
                        raw_address: "".concat(event_1.address, ", ").concat(event_1.city, ", ").concat(event_1.state, ", ").concat(event_1.country || 'US'),
                        city: event_1.city,
                        state: event_1.state,
                        country: event_1.country || 'US',
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                        geocoding_status: 'success',
                        geocoding_provider: 'google_maps_api',
                        geocoding_accuracy: 'rooftop',
                        formatted_address: coordinates.formatted_address,
                        place_id: coordinates.place_id,
                        geocoded_at: new Date().toISOString()
                    }, { onConflict: 'event_id' })];
            case 9:
                locationError = (_f.sent()).error;
                if (locationError) {
                    console.error('Failed to update event location:', locationError);
                }
                return [2 /*return*/, new Response(JSON.stringify({
                        success: true,
                        message: 'Coordinates updated successfully with Google Maps API',
                        coordinates: coordinates,
                        source: 'google_maps_api'
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 10: return [3 /*break*/, 12];
            case 11:
                googleError_1 = _f.sent();
                console.error('Google Maps geocoding error:', googleError_1);
                return [3 /*break*/, 12];
            case 12: return [4 /*yield*/, supabaseClient
                    .rpc('force_update_event_coordinates', { event_uuid: eventId })];
            case 13:
                _c = _f.sent(), result = _c.data, updateError = _c.error;
                if (updateError) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to update coordinates', details: updateError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                if (!(result && result.latitude && result.longitude)) return [3 /*break*/, 16];
                console.log('Directly updating event coordinates to ensure they are set correctly:', result.latitude, result.longitude);
                return [4 /*yield*/, supabaseClient
                        .from('events')
                        .update({
                        latitude: result.latitude,
                        longitude: result.longitude,
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', eventId)];
            case 14:
                directUpdateError = (_f.sent()).error;
                if (directUpdateError) {
                    console.error('Failed to directly update event coordinates:', directUpdateError);
                }
                return [4 /*yield*/, supabaseClient
                        .from('events')
                        .select('latitude, longitude')
                        .eq('id', eventId)
                        .single()];
            case 15:
                updatedEvent = (_f.sent()).data;
                console.log('Coordinates after direct update:', updatedEvent);
                _f.label = 16;
            case 16: return [2 /*return*/, new Response(JSON.stringify({
                    success: true,
                    message: 'Coordinates updated successfully using database function',
                    result: result
                }), {
                    headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                })];
            case 17:
                error_2 = _f.sent();
                console.error('Unexpected error:', error_2);
                return [2 /*return*/, new Response(JSON.stringify({ error: 'Internal server error', details: error_2 instanceof Error ? error_2.message : 'Unknown error' }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 18: return [2 /*return*/];
        }
    });
}); });
