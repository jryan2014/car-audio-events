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
var stripe_14_21_0_1 = require("https://esm.sh/stripe@14.21.0");
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
(0, server_ts_1.serve)(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var stripeSecretKey, stripe, supabaseUrl, supabaseServiceKey, supabase, payment_intent_id, authHeader, token, _a, user, userError, paymentIntent, _b, paymentRecord, insertError, registrationError, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 10, , 11]);
                stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
                if (!stripeSecretKey) {
                    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
                }
                stripe = new stripe_14_21_0_1.default(stripeSecretKey, {
                    apiVersion: '2023-10-16',
                });
                supabaseUrl = Deno.env.get('SUPABASE_URL');
                supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                supabase = (0, supabase_js_2_1.createClient)(supabaseUrl, supabaseServiceKey);
                return [4 /*yield*/, req.json()];
            case 2:
                payment_intent_id = (_c.sent()).payment_intent_id;
                if (!payment_intent_id) {
                    throw new Error('Payment intent ID is required');
                }
                authHeader = req.headers.get('Authorization');
                if (!authHeader) {
                    throw new Error('No authorization header');
                }
                token = authHeader.replace('Bearer ', '');
                return [4 /*yield*/, supabase.auth.getUser(token)];
            case 3:
                _a = _c.sent(), user = _a.data.user, userError = _a.error;
                if (userError || !user) {
                    throw new Error('Invalid user token');
                }
                return [4 /*yield*/, stripe.paymentIntents.retrieve(payment_intent_id)
                    // Verify the payment intent belongs to this user
                ];
            case 4:
                paymentIntent = _c.sent();
                // Verify the payment intent belongs to this user
                if (paymentIntent.metadata.user_id !== user.id) {
                    throw new Error('Payment intent does not belong to this user');
                }
                if (!(paymentIntent.status === 'succeeded')) return [3 /*break*/, 8];
                return [4 /*yield*/, supabase
                        .from('payments')
                        .insert({
                        id: paymentIntent.id,
                        user_id: user.id,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency,
                        status: paymentIntent.status,
                        metadata: paymentIntent.metadata,
                        stripe_payment_intent_id: paymentIntent.id,
                        created_at: new Date().toISOString()
                    })
                        .select()
                        .single()];
            case 5:
                _b = _c.sent(), paymentRecord = _b.data, insertError = _b.error;
                if (insertError) {
                    console.error('Error inserting payment record:', insertError);
                    // Don't throw error here - payment succeeded but record creation failed
                    // This should be handled by webhook as backup
                }
                if (!paymentIntent.metadata.event_id) return [3 /*break*/, 7];
                return [4 /*yield*/, supabase
                        .from('event_registrations')
                        .insert({
                        user_id: user.id,
                        event_id: paymentIntent.metadata.event_id,
                        payment_id: paymentIntent.id,
                        registration_date: new Date().toISOString(),
                        status: 'confirmed'
                    })];
            case 6:
                registrationError = (_c.sent()).error;
                if (registrationError) {
                    console.error('Error creating event registration:', registrationError);
                }
                _c.label = 7;
            case 7:
                console.log("Payment confirmed: ".concat(paymentIntent.id, " for user: ").concat(user.email));
                return [2 /*return*/, new Response(JSON.stringify({
                        success: true,
                        payment_intent: {
                            id: paymentIntent.id,
                            status: paymentIntent.status,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency
                        }
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 200,
                    })];
            case 8: return [2 /*return*/, new Response(JSON.stringify({
                    success: false,
                    status: paymentIntent.status,
                    message: 'Payment not completed'
                }), {
                    headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                    status: 400,
                })];
            case 9: return [3 /*break*/, 11];
            case 10:
                error_1 = _c.sent();
                console.error('Error confirming payment:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({
                        error: error_1.message || 'Failed to confirm payment'
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 400,
                    })];
            case 11: return [2 /*return*/];
        }
    });
}); });
