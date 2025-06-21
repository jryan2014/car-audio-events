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
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabaseClient, url, north, south, east, west, query, _a, events, error, transformedEvents, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response(null, { headers: corsHeaders })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                supabaseClient = (0, supabase_js_2_1.createClient)((_b = Deno.env.get('SUPABASE_URL')) !== null && _b !== void 0 ? _b : '', (_c = Deno.env.get('SUPABASE_ANON_KEY')) !== null && _c !== void 0 ? _c : '', {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });
                url = new URL(req.url);
                north = url.searchParams.get('north') ? parseFloat(url.searchParams.get('north')) : null;
                south = url.searchParams.get('south') ? parseFloat(url.searchParams.get('south')) : null;
                east = url.searchParams.get('east') ? parseFloat(url.searchParams.get('east')) : null;
                west = url.searchParams.get('west') ? parseFloat(url.searchParams.get('west')) : null;
                query = supabaseClient
                    .from('events')
                    .select("\n        id,\n        title,\n        start_date,\n        venue_name,\n        city,\n        state,\n        latitude,\n        longitude,\n        pin_color,\n        current_participants,\n        max_participants,\n        event_categories!inner(name, color, icon),\n        organizations(name, logo_url)\n      ")
                    .eq('status', 'published')
                    .eq('is_public', true)
                    .not('latitude', 'is', null)
                    .not('longitude', 'is', null);
                // Apply bounds filtering if provided
                if (north !== null && south !== null && east !== null && west !== null) {
                    query = query
                        .lte('latitude', north)
                        .gte('latitude', south)
                        .lte('longitude', east)
                        .gte('longitude', west);
                }
                return [4 /*yield*/, query];
            case 2:
                _a = _d.sent(), events = _a.data, error = _a.error;
                if (error) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to fetch events', details: error.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                transformedEvents = events.map(function (event) {
                    var _a, _b, _c, _d, _e;
                    return ({
                        id: event.id,
                        title: event.title,
                        category_name: ((_a = event.event_categories) === null || _a === void 0 ? void 0 : _a.name) || 'Event',
                        category_color: ((_b = event.event_categories) === null || _b === void 0 ? void 0 : _b.color) || '#0ea5e9',
                        category_icon: ((_c = event.event_categories) === null || _c === void 0 ? void 0 : _c.icon) || 'calendar',
                        start_date: event.start_date,
                        venue_name: event.venue_name,
                        city: event.city,
                        state: event.state,
                        latitude: event.latitude,
                        longitude: event.longitude,
                        pin_color: event.pin_color || '#0ea5e9',
                        organization_name: (_d = event.organizations) === null || _d === void 0 ? void 0 : _d.name,
                        organization_logo: (_e = event.organizations) === null || _e === void 0 ? void 0 : _e.logo_url,
                        participant_count: event.current_participants || 0,
                        max_participants: event.max_participants
                    });
                });
                return [2 /*return*/, new Response(JSON.stringify({ events: transformedEvents }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 3:
                error_1 = _d.sent();
                console.error('Unexpected error:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: 'Internal server error', details: error_1 instanceof Error ? error_1.message : 'Unknown error' }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
