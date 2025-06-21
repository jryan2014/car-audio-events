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
    var supabaseAdmin, adminEmail_1, adminPassword, _a, existingAuthUsers, listError, existingAuthUser, adminUserId, _b, authData, authError, upsertError, existingProfile, updateError, insertError, _c, verifyProfile, verifyError, error_1;
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
                _f.trys.push([1, 14, , 15]);
                supabaseAdmin = (0, supabase_js_2_1.createClient)((_d = Deno.env.get('SUPABASE_URL')) !== null && _d !== void 0 ? _d : '', (_e = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _e !== void 0 ? _e : '', {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });
                adminEmail_1 = 'admin@caraudioevents.com';
                adminPassword = 'TempAdmin123!';
                console.log('🚀 Starting admin user creation process...');
                return [4 /*yield*/, supabaseAdmin.auth.admin.listUsers()];
            case 2:
                _a = _f.sent(), existingAuthUsers = _a.data, listError = _a.error;
                if (listError) {
                    console.error('❌ Error checking existing users:', listError);
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to check existing users', details: listError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                existingAuthUser = existingAuthUsers.users.find(function (user) { return user.email === adminEmail_1; });
                adminUserId = void 0;
                if (!existingAuthUser) return [3 /*break*/, 3];
                console.log('✅ Admin auth user already exists:', existingAuthUser.id);
                adminUserId = existingAuthUser.id;
                return [3 /*break*/, 5];
            case 3:
                // Step 2: Create admin user in Supabase Auth
                console.log('🔐 Creating admin auth user...');
                return [4 /*yield*/, supabaseAdmin.auth.admin.createUser({
                        email: adminEmail_1,
                        password: adminPassword,
                        email_confirm: true, // Auto-confirm email
                        user_metadata: {
                            name: 'System Administrator'
                        }
                    })];
            case 4:
                _b = _f.sent(), authData = _b.data, authError = _b.error;
                if (authError) {
                    console.error('❌ Failed to create auth user:', authError);
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to create admin auth user', details: authError.message }), {
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
                adminUserId = authData.user.id;
                console.log('✅ Admin auth user created:', adminUserId);
                _f.label = 5;
            case 5:
                // Step 3: Always upsert the admin profile to ensure correct permissions
                console.log('👤 Creating/updating admin profile...');
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .upsert({
                        id: adminUserId,
                        email: adminEmail_1,
                        name: 'System Administrator',
                        membership_type: 'admin',
                        status: 'active',
                        verification_status: 'verified',
                        subscription_plan: 'enterprise'
                    }, {
                        onConflict: 'id'
                    })];
            case 6:
                upsertError = (_f.sent()).error;
                if (!upsertError) return [3 /*break*/, 12];
                console.error('❌ Failed to upsert admin profile:', upsertError);
                // Try an alternative approach if the upsert fails
                console.log('🔄 Trying alternative approach to create admin profile...');
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .select('id')
                        .eq('id', adminUserId)
                        .single()];
            case 7:
                existingProfile = (_f.sent()).data;
                if (!existingProfile) return [3 /*break*/, 9];
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .update({
                        email: adminEmail_1,
                        name: 'System Administrator',
                        membership_type: 'admin',
                        status: 'active',
                        verification_status: 'verified',
                        subscription_plan: 'enterprise',
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', adminUserId)];
            case 8:
                updateError = (_f.sent()).error;
                if (updateError) {
                    console.error('❌ Alternative update also failed:', updateError);
                }
                else {
                    console.log('✅ Admin profile updated via alternative method');
                    // Continue with the function
                    upsertError.message = 'Handled via alternative method';
                }
                return [3 /*break*/, 11];
            case 9: return [4 /*yield*/, supabaseAdmin
                    .from('users')
                    .insert({
                    id: adminUserId,
                    email: adminEmail_1,
                    name: 'System Administrator',
                    membership_type: 'admin',
                    status: 'active',
                    verification_status: 'verified',
                    subscription_plan: 'enterprise'
                })];
            case 10:
                insertError = (_f.sent()).error;
                if (insertError) {
                    console.error('❌ Alternative insert also failed:', insertError);
                }
                else {
                    console.log('✅ Admin profile created via alternative method');
                    // Continue with the function
                    upsertError.message = 'Handled via alternative method';
                }
                _f.label = 11;
            case 11:
                // If we still have an error and haven't handled it, return the error
                if (upsertError.message !== 'Handled via alternative method') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to create/update admin profile', details: upsertError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                _f.label = 12;
            case 12:
                console.log('✅ Admin profile created/updated successfully');
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .select('id, email, name, membership_type, status, verification_status')
                        .eq('id', adminUserId)
                        .single()];
            case 13:
                _c = _f.sent(), verifyProfile = _c.data, verifyError = _c.error;
                if (verifyError) {
                    console.error('❌ Failed to verify admin profile:', verifyError);
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to verify admin profile', details: verifyError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                console.log('✅ Admin profile verified:', verifyProfile);
                // Ensure the profile has correct admin permissions
                if (verifyProfile.membership_type !== 'admin' || verifyProfile.status !== 'active') {
                    console.error('❌ Admin profile does not have correct permissions:', verifyProfile);
                    return [2 /*return*/, new Response(JSON.stringify({
                            error: 'Admin profile created but permissions are incorrect',
                            profile: verifyProfile
                        }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                console.log('🎉 Admin user creation/update completed successfully!');
                return [2 /*return*/, new Response(JSON.stringify({
                        success: true,
                        message: 'Admin user created successfully',
                        profile: verifyProfile,
                        credentials: {
                            email: adminEmail_1,
                            password: adminPassword
                        }
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 14:
                error_1 = _f.sent();
                console.error('💥 Unexpected error in admin user creation:', error_1);
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
