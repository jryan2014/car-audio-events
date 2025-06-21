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
var server_ts_1 = require("https://deno.land/std@0.168.0/http/server.ts");
var supabase_js_2_1 = require("https://esm.sh/@supabase/supabase-js@2");
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
(0, server_ts_1.serve)(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabaseClient, authHeader, jwt, _a, user, userError, _b, profile, profileError, keys, updates, _i, _c, _d, key, value, error, error_1;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _g.label = 1;
            case 1:
                _g.trys.push([1, 13, , 14]);
                supabaseClient = (0, supabase_js_2_1.createClient)((_e = Deno.env.get('SUPABASE_URL')) !== null && _e !== void 0 ? _e : '', (_f = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _f !== void 0 ? _f : '');
                authHeader = req.headers.get('Authorization');
                if (!authHeader) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                jwt = authHeader.replace('Bearer ', '');
                return [4 /*yield*/, supabaseClient.auth.getUser(jwt)];
            case 2:
                _a = _g.sent(), user = _a.data.user, userError = _a.error;
                if (userError || !user) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                if (!(user.email === 'admin@caraudioevents.com')) return [3 /*break*/, 3];
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, supabaseClient
                    .from('users')
                    .select('membership_type')
                    .eq('id', user.id)
                    .single()];
            case 4:
                _b = _g.sent(), profile = _b.data, profileError = _b.error;
                if (profileError || !profile || profile.membership_type !== 'admin') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Admin access required' }), {
                            status: 403,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                _g.label = 5;
            case 5: return [4 /*yield*/, req.json()];
            case 6:
                keys = (_g.sent()).keys;
                if (!keys || typeof keys !== 'object') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Invalid keys data' }), {
                            status: 400,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                updates = [];
                // First, try to create the table if it doesn't exist
                return [4 /*yield*/, supabaseClient.rpc('exec_sql', {
                        sql: "\n        CREATE TABLE IF NOT EXISTS admin_settings (\n          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n          key_name VARCHAR(255) UNIQUE NOT NULL,\n          key_value TEXT,\n          is_sensitive BOOLEAN DEFAULT false,\n          description TEXT,\n          updated_by UUID REFERENCES users(id),\n          updated_at TIMESTAMPTZ DEFAULT NOW(),\n          created_at TIMESTAMPTZ DEFAULT NOW()\n        );\n      "
                    })];
            case 7:
                // First, try to create the table if it doesn't exist
                _g.sent();
                _i = 0, _c = Object.entries(keys);
                _g.label = 8;
            case 8:
                if (!(_i < _c.length)) return [3 /*break*/, 11];
                _d = _c[_i], key = _d[0], value = _d[1];
                if (!(value !== undefined && value !== null && value !== '')) return [3 /*break*/, 10];
                return [4 /*yield*/, supabaseClient
                        .from('admin_settings')
                        .upsert({
                        key_name: key,
                        key_value: typeof value === 'boolean' ? value.toString() : value,
                        updated_at: new Date().toISOString(),
                        updated_by: user.id
                    }, { onConflict: 'key_name' })];
            case 9:
                error = (_g.sent()).error;
                if (error) {
                    console.error("Error updating key ".concat(key, ":"), error);
                    return [2 /*return*/, new Response(JSON.stringify({ error: "Failed to update ".concat(key, ": ").concat(error.message) }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                updates.push(key);
                _g.label = 10;
            case 10:
                _i++;
                return [3 /*break*/, 8];
            case 11: 
            // Log the admin activity
            return [4 /*yield*/, supabaseClient
                    .from('admin_activity_log')
                    .insert({
                    admin_id: user.id,
                    action: 'update_settings',
                    details: { updated_keys: updates },
                    created_at: new Date().toISOString()
                })];
            case 12:
                // Log the admin activity
                _g.sent();
                return [2 /*return*/, new Response(JSON.stringify({
                        success: true,
                        message: "Updated ".concat(updates.length, " settings"),
                        updated_keys: updates
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                    })];
            case 13:
                error_1 = _g.sent();
                console.error('Admin update keys error:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: 'Internal server error' }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 14: return [2 /*return*/];
        }
    });
}); });
