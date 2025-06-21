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
    var supabaseClient, authHeader, token, _a, user, authError, _b, userData, userError, createError, mockUsers, _c, users, usersError, error_1;
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
                _f.trys.push([1, 8, , 9]);
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
                return [4 /*yield*/, supabaseClient
                        .from('users')
                        .select('membership_type, status')
                        .eq('id', user.id)
                        .single()];
            case 3:
                _b = _f.sent(), userData = _b.data, userError = _b.error;
                if (!(userError || !userData)) return [3 /*break*/, 6];
                console.error('User not found in database:', userError);
                if (!(user.email === 'admin@caraudioevents.com')) return [3 /*break*/, 5];
                console.log('Admin email detected but profile not found, allowing access');
                return [4 /*yield*/, supabaseClient
                        .from('users')
                        .upsert({
                        id: user.id,
                        email: user.email || '',
                        name: 'System Administrator',
                        membership_type: 'admin',
                        status: 'active',
                        verification_status: 'verified',
                        subscription_plan: 'enterprise',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })];
            case 4:
                createError = (_f.sent()).error;
                if (createError) {
                    console.error('Failed to create admin profile:', createError);
                }
                else {
                    console.log('Created admin profile successfully');
                }
                mockUsers = [
                    {
                        id: user.id,
                        email: user.email,
                        name: 'System Administrator',
                        membership_type: 'admin',
                        status: 'active',
                        verification_status: 'verified',
                        subscription_plan: 'enterprise',
                        created_at: new Date().toISOString(),
                        login_count: 1,
                        failed_login_attempts: 0
                    }
                ];
                return [2 /*return*/, new Response(JSON.stringify({ users: mockUsers }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 5: return [2 /*return*/, new Response(JSON.stringify({ error: 'User profile not found in database' }), {
                    status: 404,
                    headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                })];
            case 6:
                if (userData.membership_type !== 'admin' || userData.status !== 'active') {
                    console.error('Insufficient permissions:', { membership_type: userData.membership_type, status: userData.status });
                    return [2 /*return*/, new Response(JSON.stringify({
                            error: 'Insufficient permissions',
                            details: "User has membership_type: ".concat(userData.membership_type, ", status: ").concat(userData.status, ". Required: membership_type: admin, status: active")
                        }), {
                            status: 403,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [4 /*yield*/, supabaseClient
                        .from('users')
                        .select("\n        id,\n        email,\n        name,\n        membership_type,\n        status,\n        location,\n        phone,\n        company_name,\n        verification_status,\n        subscription_plan,\n        last_login_at,\n        created_at,\n        login_count,\n        failed_login_attempts\n      ")
                        .order('created_at', { ascending: false })];
            case 7:
                _c = _f.sent(), users = _c.data, usersError = _c.error;
                if (usersError) {
                    console.error('Error fetching users:', usersError);
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [2 /*return*/, new Response(JSON.stringify({ users: users || [] }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 8:
                error_1 = _f.sent();
                console.error('Unexpected error:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: 'Internal server error' }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 9: return [2 /*return*/];
        }
    });
}); });
