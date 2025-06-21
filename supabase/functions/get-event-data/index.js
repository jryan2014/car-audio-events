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
    var supabaseClient, url, eventId, authHeader, userId, token, user, _a, event_1, eventError, isRegistered, registration, participantCount, formattedEvent, error_1;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return __generator(this, function (_l) {
        switch (_l.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response(null, { headers: corsHeaders })];
                }
                _l.label = 1;
            case 1:
                _l.trys.push([1, 8, , 9]);
                supabaseClient = (0, supabase_js_2_1.createClient)((_b = Deno.env.get('SUPABASE_URL')) !== null && _b !== void 0 ? _b : '', (_c = Deno.env.get('SUPABASE_ANON_KEY')) !== null && _c !== void 0 ? _c : '', {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });
                url = new URL(req.url);
                eventId = url.searchParams.get('id');
                if (!eventId) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Event ID is required' }), {
                            status: 400,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                authHeader = req.headers.get('Authorization');
                userId = null;
                if (!authHeader) return [3 /*break*/, 3];
                token = authHeader.replace('Bearer ', '');
                return [4 /*yield*/, supabaseClient.auth.getUser(token)];
            case 2:
                user = (_l.sent()).data.user;
                if (user) {
                    userId = user.id;
                }
                _l.label = 3;
            case 3: return [4 /*yield*/, supabaseClient
                    .from('events')
                    .select("\n        *,\n        event_categories(*),\n        organizations(*),\n        users!organizer_id(*),\n        event_images(*)\n      ")
                    .eq('id', eventId)
                    .single()];
            case 4:
                _a = _l.sent(), event_1 = _a.data, eventError = _a.error;
                if (eventError) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Event not found', details: eventError.message }), {
                            status: 404,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                isRegistered = false;
                if (!userId) return [3 /*break*/, 6];
                return [4 /*yield*/, supabaseClient
                        .from('event_registrations')
                        .select('id, payment_status')
                        .eq('event_id', eventId)
                        .eq('user_id', userId)
                        .maybeSingle()];
            case 5:
                registration = (_l.sent()).data;
                isRegistered = !!registration;
                _l.label = 6;
            case 6: return [4 /*yield*/, supabaseClient
                    .from('event_registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', eventId)];
            case 7:
                participantCount = (_l.sent()).count;
                formattedEvent = __assign(__assign({}, event_1), { participant_count: participantCount || event_1.current_participants || 0, is_registered: isRegistered, primary_image: ((_e = (_d = event_1.event_images) === null || _d === void 0 ? void 0 : _d.find(function (img) { return img.is_primary; })) === null || _e === void 0 ? void 0 : _e.image_url) || null, images: event_1.event_images || [], category: ((_f = event_1.event_categories) === null || _f === void 0 ? void 0 : _f.name) || 'Event', category_color: ((_g = event_1.event_categories) === null || _g === void 0 ? void 0 : _g.color) || '#0ea5e9', organizer: {
                        name: ((_h = event_1.users) === null || _h === void 0 ? void 0 : _h.name) || 'Unknown',
                        email: ((_j = event_1.users) === null || _j === void 0 ? void 0 : _j.email) || '',
                        phone: ((_k = event_1.users) === null || _k === void 0 ? void 0 : _k.phone) || event_1.contact_phone || '',
                    }, organization: event_1.organizations ? {
                        name: event_1.organizations.name,
                        logo: event_1.organizations.logo_url,
                        website: event_1.organizations.website,
                    } : null });
                return [2 /*return*/, new Response(JSON.stringify({ event: formattedEvent }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 8:
                error_1 = _l.sent();
                console.error('Unexpected error:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: 'Internal server error', details: error_1 instanceof Error ? error_1.message : 'Unknown error' }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 9: return [2 /*return*/];
        }
    });
}); });
