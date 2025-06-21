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
    var supabaseAdmin, authHeader, token, _a, user, authError, _b, adminData, adminError, _c, userId, userData, updateData, updateError, currentUser, metadataError, auditError_1, _d, updatedUser, fetchError, error_1;
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
                _g.trys.push([1, 13, , 14]);
                // Only allow PUT requests
                if (req.method !== 'PUT') {
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
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Only administrators can update users' }), {
                            status: 403,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                return [4 /*yield*/, req.json()];
            case 4:
                _c = _g.sent(), userId = _c.userId, userData = _c.userData;
                if (!userId || !userData) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'User ID and update data are required' }), {
                            status: 400,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                console.log('🚀 Starting user update process...');
                updateData = __assign(__assign({}, userData), { updated_at: new Date().toISOString() });
                // Update user profile
                console.log('👤 Updating user profile...');
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .update(updateData)
                        .eq('id', userId)];
            case 5:
                updateError = (_g.sent()).error;
                if (updateError) {
                    console.error('❌ Failed to update user profile:', updateError);
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to update user profile', details: updateError.message }), {
                            status: 500,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                console.log('✅ User profile updated successfully');
                if (!(userData.name || userData.membership_type)) return [3 /*break*/, 8];
                console.log('🔄 Updating auth user metadata...');
                return [4 /*yield*/, supabaseAdmin
                        .from('users')
                        .select('name, membership_type')
                        .eq('id', userId)
                        .single()];
            case 6:
                currentUser = (_g.sent()).data;
                if (!currentUser) return [3 /*break*/, 8];
                return [4 /*yield*/, supabaseAdmin.auth.admin.updateUserById(userId, {
                        user_metadata: {
                            name: userData.name || currentUser.name,
                            membership_type: userData.membership_type || currentUser.membership_type
                        }
                    })];
            case 7:
                metadataError = (_g.sent()).error;
                if (metadataError) {
                    console.warn('⚠️ Failed to update auth metadata, but profile was updated:', metadataError);
                }
                else {
                    console.log('✅ Auth metadata updated successfully');
                }
                _g.label = 8;
            case 8:
                _g.trys.push([8, 10, , 11]);
                return [4 /*yield*/, supabaseAdmin
                        .from('admin_audit_log')
                        .insert({
                        admin_id: user.id,
                        action: 'user_updated',
                        details: {
                            updated_user_id: userId,
                            updated_by: user.email,
                            changes: userData
                        }
                    })];
            case 9:
                _g.sent();
                return [3 /*break*/, 11];
            case 10:
                auditError_1 = _g.sent();
                console.warn('⚠️ Failed to log user update in audit log:', auditError_1);
                return [3 /*break*/, 11];
            case 11: return [4 /*yield*/, supabaseAdmin
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single()];
            case 12:
                _d = _g.sent(), updatedUser = _d.data, fetchError = _d.error;
                if (fetchError) {
                    console.warn('⚠️ Failed to fetch updated user data:', fetchError);
                }
                console.log('🎉 User update completed successfully!');
                return [2 /*return*/, new Response(JSON.stringify({
                        success: true,
                        message: 'User updated successfully',
                        user: updatedUser || null
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 13:
                error_1 = _g.sent();
                console.error('💥 Unexpected error in user update:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({
                        error: 'Internal server error',
                        details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                    }), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                    })];
            case 14: return [2 /*return*/];
        }
    });
}); });
