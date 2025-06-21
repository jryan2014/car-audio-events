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
    var supabaseAdmin, authHeader, token, _a, user, authError, _b, adminData, adminError, _c, email, password, name_1, membership_type, location_1, phone, company_name, status_1, verification_status, subscription_plan, _d, authData, authCreateError, newUserId, upsertError, prefError, prefError_1, auditError_1, error_1;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response(null, { headers: corsHeaders })];
                }
                _g.label = 1;
            case 1:
                _g.trys.push([1, 14, , 15]);
                // Only allow POST requests
                if (req.method !== 'POST') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Method not allowed' }), {
                            status: 405,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                supabaseAdmin = (0, supabase_js_2_1.createClient)((_e = Deno.env.get('SUPABASE_URL')) !== null && _e !== void 0 ? _e : '', (_f = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _f !== void 0 ? _f : '', {
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
                return [4 /*yield*/, supabaseAdmin.auth.getUser(token)];
            case 2:
                _a = _g.sent(), user = _a.data.user, authError = _a.error;
                if (authError || !user) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .select('membership_type')
                        .eq('id', user.id)
                        .single()];
            case 3:
                _b = _g.sent(), adminData = _b.data, adminError = _b.error;
                if (adminError || !adminData || adminData.membership_type !== 'admin') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Only administrators can create users' }), {
                            status: 403,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [4 /*yield*/, req.json()];
            case 4:
                _c = _g.sent(), email = _c.email, password = _c.password, name_1 = _c.name, membership_type = _c.membership_type, location_1 = _c.location, phone = _c.phone, company_name = _c.company_name, status_1 = _c.status, verification_status = _c.verification_status, subscription_plan = _c.subscription_plan;
                if (!email || !password || !name_1 || !membership_type) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Email, password, name, and membership_type are required' }), {
                            status: 400,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                console.log('🚀 Starting user creation process...');
                // Step 1: Create user in Supabase Auth
                console.log('🔐 Creating auth user...');
                return [4 /*yield*/, supabaseAdmin.auth.admin.createUser({
                        email: email,
                        password: password,
                        email_confirm: true, // Auto-confirm email
                        user_metadata: {
                            name: name_1,
                            membership_type: membership_type
                        }
                    })];
            case 5:
                _d = _g.sent(), authData = _d.data, authCreateError = _d.error;
                if (authCreateError) {
                    console.error('❌ Failed to create auth user:', authCreateError);
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to create auth user', details: authCreateError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                if (!authData.user) {
                    console.error('❌ No user returned from auth creation');
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'No user returned from auth creation' }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                newUserId = authData.user.id;
                console.log('✅ Auth user created:', newUserId);
                // Step 2: Create the user profile
                console.log('👤 Creating user profile...');
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .upsert({
                        id: newUserId,
                        email: email,
                        name: name_1,
                        membership_type: membership_type,
                        status: status_1 || 'pending',
                        verification_status: verification_status || 'pending',
                        subscription_plan: subscription_plan || 'free',
                        location: location_1,
                        phone: phone,
                        company_name: company_name
                    }, {
                        onConflict: 'id'
                    })];
            case 6:
                upsertError = (_g.sent()).error;
                if (upsertError) {
                    console.error('❌ Failed to create user profile:', upsertError);
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to create user profile', details: upsertError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                console.log('✅ User profile created successfully');
                _g.label = 7;
            case 7:
                _g.trys.push([7, 9, , 10]);
                return [4 /*yield*/, supabaseAdmin
                        .from('user_preferences')
                        .insert({
                        user_id: newUserId
                    })];
            case 8:
                prefError = (_g.sent()).error;
                if (prefError) {
                    console.warn('⚠️ Failed to create user preferences, but user was created:', prefError);
                }
                return [3 /*break*/, 10];
            case 9:
                prefError_1 = _g.sent();
                console.warn('⚠️ Error creating user preferences, but user was created:', prefError_1);
                return [3 /*break*/, 10];
            case 10:
                _g.trys.push([10, 12, , 13]);
                return [4 /*yield*/, supabaseAdmin
                        .from('admin_audit_log')
                        .insert({
                        admin_id: user.id,
                        action: 'user_created',
                        details: {
                            created_user_id: newUserId,
                            created_user_email: email,
                            created_user_name: name_1,
                            created_by: user.email,
                            membership_type: membership_type,
                            status: status_1 || 'pending'
                        }
                    })];
            case 11:
                _g.sent();
                return [3 /*break*/, 13];
            case 12:
                auditError_1 = _g.sent();
                console.warn('⚠️ Failed to log user creation in audit log:', auditError_1);
                return [3 /*break*/, 13];
            case 13:
                console.log('🎉 User creation completed successfully!');
                return [2 /*return*/, new Response(JSON.stringify({
                        success: true,
                        message: 'User created successfully',
                        user: {
                            id: newUserId,
                            email: email,
                            name: name_1,
                            membership_type: membership_type,
                            status: status_1 || 'pending',
                            verification_status: verification_status || 'pending',
                            subscription_plan: subscription_plan || 'free'
                        }
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 14:
                error_1 = _g.sent();
                console.error('💥 Unexpected error in user creation:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({
                        error: 'Internal server error',
                        details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                    }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 15: return [2 /*return*/];
        }
    });
}); });
