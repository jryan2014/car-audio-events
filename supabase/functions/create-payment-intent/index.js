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
    var stripeSecretKey, stripe, supabaseUrl, supabaseServiceKey, supabase, _a, amount, _b, currency, _c, metadata, authHeader, token, _d, user, userError, paymentIntent, error_1;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 5, , 6]);
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
                return [4 /*yield*/, req.json()
                    // Validate amount
                ];
            case 2:
                _a = _e.sent(), amount = _a.amount, _b = _a.currency, currency = _b === void 0 ? 'usd' : _b, _c = _a.metadata, metadata = _c === void 0 ? {} : _c;
                // Validate amount
                if (!amount || amount < 50) { // Minimum $0.50 USD
                    throw new Error('Amount must be at least $0.50 USD');
                }
                authHeader = req.headers.get('Authorization');
                if (!authHeader) {
                    throw new Error('No authorization header');
                }
                token = authHeader.replace('Bearer ', '');
                return [4 /*yield*/, supabase.auth.getUser(token)];
            case 3:
                _d = _e.sent(), user = _d.data.user, userError = _d.error;
                if (userError || !user) {
                    throw new Error('Invalid user token');
                }
                return [4 /*yield*/, stripe.paymentIntents.create({
                        amount: Math.round(amount), // Amount in cents
                        currency: currency.toLowerCase(),
                        metadata: __assign({ user_id: user.id, user_email: user.email }, metadata),
                        automatic_payment_methods: {
                            enabled: true,
                        },
                    })
                    // Log payment intent creation
                ];
            case 4:
                paymentIntent = _e.sent();
                // Log payment intent creation
                console.log("Payment intent created: ".concat(paymentIntent.id, " for user: ").concat(user.email));
                return [2 /*return*/, new Response(JSON.stringify({
                        client_secret: paymentIntent.client_secret,
                        payment_intent_id: paymentIntent.id
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 200,
                    })];
            case 5:
                error_1 = _e.sent();
                console.error('Error creating payment intent:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({
                        error: error_1.message || 'Failed to create payment intent'
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 400,
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
