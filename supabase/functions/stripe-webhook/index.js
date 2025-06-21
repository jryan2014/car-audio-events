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
    var stripeSecretKey, webhookSecret, stripe, supabaseUrl, supabaseServiceKey, supabase, body, signature, event_1, _a, paymentIntent, upsertError, registrationError, paymentIntent, updateError, paymentIntent, updateError, deleteError, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // Handle CORS preflight requests
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 15, , 16]);
                stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
                webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
                if (!stripeSecretKey || !webhookSecret) {
                    throw new Error('Missing Stripe configuration');
                }
                stripe = new stripe_14_21_0_1.default(stripeSecretKey, {
                    apiVersion: '2023-10-16',
                });
                supabaseUrl = Deno.env.get('SUPABASE_URL');
                supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                supabase = (0, supabase_js_2_1.createClient)(supabaseUrl, supabaseServiceKey);
                return [4 /*yield*/, req.text()];
            case 2:
                body = _b.sent();
                signature = req.headers.get('stripe-signature');
                if (!signature) {
                    throw new Error('No Stripe signature found');
                }
                try {
                    event_1 = stripe.webhooks.constructEvent(body, signature, webhookSecret);
                }
                catch (err) {
                    console.error('Webhook signature verification failed:', err);
                    return [2 /*return*/, new Response('Invalid signature', { status: 400 })];
                }
                console.log("Received webhook event: ".concat(event_1.type));
                _a = event_1.type;
                switch (_a) {
                    case 'payment_intent.succeeded': return [3 /*break*/, 3];
                    case 'payment_intent.payment_failed': return [3 /*break*/, 7];
                    case 'payment_intent.canceled': return [3 /*break*/, 9];
                }
                return [3 /*break*/, 13];
            case 3:
                paymentIntent = event_1.data.object;
                return [4 /*yield*/, supabase
                        .from('payments')
                        .upsert({
                        id: paymentIntent.id,
                        user_id: paymentIntent.metadata.user_id,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency,
                        status: paymentIntent.status,
                        metadata: paymentIntent.metadata,
                        stripe_payment_intent_id: paymentIntent.id,
                        created_at: new Date(paymentIntent.created * 1000).toISOString(),
                        updated_at: new Date().toISOString()
                    })];
            case 4:
                upsertError = (_b.sent()).error;
                if (upsertError) {
                    console.error('Error upserting payment record:', upsertError);
                }
                if (!(paymentIntent.metadata.event_id && paymentIntent.metadata.user_id)) return [3 /*break*/, 6];
                return [4 /*yield*/, supabase
                        .from('event_registrations')
                        .upsert({
                        user_id: paymentIntent.metadata.user_id,
                        event_id: paymentIntent.metadata.event_id,
                        payment_id: paymentIntent.id,
                        registration_date: new Date().toISOString(),
                        status: 'confirmed'
                    })];
            case 5:
                registrationError = (_b.sent()).error;
                if (registrationError) {
                    console.error('Error creating event registration:', registrationError);
                }
                else {
                    console.log("Event registration confirmed for user ".concat(paymentIntent.metadata.user_id));
                }
                _b.label = 6;
            case 6: return [3 /*break*/, 14];
            case 7:
                paymentIntent = event_1.data.object;
                return [4 /*yield*/, supabase
                        .from('payments')
                        .upsert({
                        id: paymentIntent.id,
                        user_id: paymentIntent.metadata.user_id,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency,
                        status: paymentIntent.status,
                        metadata: paymentIntent.metadata,
                        stripe_payment_intent_id: paymentIntent.id,
                        created_at: new Date(paymentIntent.created * 1000).toISOString(),
                        updated_at: new Date().toISOString()
                    })];
            case 8:
                updateError = (_b.sent()).error;
                if (updateError) {
                    console.error('Error updating failed payment record:', updateError);
                }
                return [3 /*break*/, 14];
            case 9:
                paymentIntent = event_1.data.object;
                return [4 /*yield*/, supabase
                        .from('payments')
                        .upsert({
                        id: paymentIntent.id,
                        user_id: paymentIntent.metadata.user_id,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency,
                        status: paymentIntent.status,
                        metadata: paymentIntent.metadata,
                        stripe_payment_intent_id: paymentIntent.id,
                        created_at: new Date(paymentIntent.created * 1000).toISOString(),
                        updated_at: new Date().toISOString()
                    })];
            case 10:
                updateError = (_b.sent()).error;
                if (updateError) {
                    console.error('Error updating canceled payment record:', updateError);
                }
                if (!(paymentIntent.metadata.event_id && paymentIntent.metadata.user_id)) return [3 /*break*/, 12];
                return [4 /*yield*/, supabase
                        .from('event_registrations')
                        .delete()
                        .eq('user_id', paymentIntent.metadata.user_id)
                        .eq('event_id', paymentIntent.metadata.event_id)
                        .eq('payment_id', paymentIntent.id)];
            case 11:
                deleteError = (_b.sent()).error;
                if (deleteError) {
                    console.error('Error removing event registration:', deleteError);
                }
                _b.label = 12;
            case 12: return [3 /*break*/, 14];
            case 13:
                console.log("Unhandled event type: ".concat(event_1.type));
                _b.label = 14;
            case 14: return [2 /*return*/, new Response(JSON.stringify({ received: true }), {
                    headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                    status: 200,
                })];
            case 15:
                error_1 = _b.sent();
                console.error('Webhook error:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({
                        error: error_1.message || 'Webhook processing failed'
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 400,
                    })];
            case 16: return [2 /*return*/];
        }
    });
}); });
function handleSubscriptionChange(supabase, subscription) {
    return __awaiter(this, void 0, void 0, function () {
        var customerId, subscriptionId, status, currentPeriodEnd, membershipType, priceId, priceAmount, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerId = subscription.customer;
                    subscriptionId = subscription.id;
                    status = subscription.status;
                    currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
                    membershipType = 'competitor' // default
                    ;
                    if (subscription.items.data.length > 0) {
                        priceId = subscription.items.data[0].price.id;
                        priceAmount = subscription.items.data[0].price.unit_amount || 0;
                        // Map price amounts to membership types (in cents)
                        if (priceAmount === 2900) { // $29.00
                            membershipType = 'competitor'; // Pro Competitor
                        }
                        else if (priceAmount === 9900) { // $99.00
                            membershipType = 'retailer';
                        }
                        else if (priceAmount === 19900) { // $199.00
                            membershipType = 'manufacturer';
                        }
                        else if (priceAmount === 29900) { // $299.00
                            membershipType = 'organization';
                        }
                    }
                    return [4 /*yield*/, supabase
                            .from('users')
                            .update({
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            subscription_status: status,
                            subscription_current_period_end: currentPeriodEnd,
                            membershipType: status === 'active' ? membershipType : 'competitor'
                        })
                            .eq('stripe_customer_id', customerId)];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error updating user subscription:', error);
                        throw error;
                    }
                    console.log("Updated subscription for customer ".concat(customerId, ": ").concat(status));
                    return [2 /*return*/];
            }
        });
    });
}
function handleSubscriptionCancelled(supabase, subscription) {
    return __awaiter(this, void 0, void 0, function () {
        var customerId, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerId = subscription.customer;
                    return [4 /*yield*/, supabase
                            .from('users')
                            .update({
                            membershipType: 'competitor',
                            subscription_status: 'canceled',
                            stripe_subscription_id: null
                        })
                            .eq('stripe_customer_id', customerId)];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error handling subscription cancellation:', error);
                        throw error;
                    }
                    console.log("Cancelled subscription for customer ".concat(customerId));
                    return [2 /*return*/];
            }
        });
    });
}
function handlePaymentSucceeded(supabase, invoice) {
    return __awaiter(this, void 0, void 0, function () {
        var customerId, subscriptionId, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerId = invoice.customer;
                    subscriptionId = invoice.subscription;
                    return [4 /*yield*/, supabase
                            .from('users')
                            .update({
                            subscription_status: 'active'
                        })
                            .eq('stripe_customer_id', customerId)];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error updating payment success:', error);
                        throw error;
                    }
                    // Log successful payment
                    return [4 /*yield*/, supabase.from('activity_logs').insert({
                            activity_type: 'payment_succeeded',
                            activity_description: "Payment succeeded for subscription ".concat(subscriptionId),
                            metadata: {
                                customer_id: customerId,
                                invoice_id: invoice.id,
                                amount: invoice.amount_paid
                            }
                        })];
                case 2:
                    // Log successful payment
                    _a.sent();
                    console.log("Payment succeeded for customer ".concat(customerId));
                    return [2 /*return*/];
            }
        });
    });
}
function handlePaymentFailed(supabase, invoice) {
    return __awaiter(this, void 0, void 0, function () {
        var customerId, subscriptionId, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerId = invoice.customer;
                    subscriptionId = invoice.subscription;
                    return [4 /*yield*/, supabase
                            .from('users')
                            .update({
                            subscription_status: 'past_due'
                        })
                            .eq('stripe_customer_id', customerId)];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error updating payment failure:', error);
                        throw error;
                    }
                    // Log failed payment
                    return [4 /*yield*/, supabase.from('activity_logs').insert({
                            activity_type: 'payment_failed',
                            activity_description: "Payment failed for subscription ".concat(subscriptionId),
                            metadata: {
                                customer_id: customerId,
                                invoice_id: invoice.id,
                                amount: invoice.amount_due
                            }
                        })];
                case 2:
                    // Log failed payment
                    _a.sent();
                    console.log("Payment failed for customer ".concat(customerId));
                    return [2 /*return*/];
            }
        });
    });
}
function handlePaymentIntentSucceeded(supabase, paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        var customerId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerId = paymentIntent.customer;
                    // Log one-time payment success
                    return [4 /*yield*/, supabase.from('activity_logs').insert({
                            activity_type: 'payment_intent_succeeded',
                            activity_description: "One-time payment succeeded",
                            metadata: {
                                customer_id: customerId,
                                payment_intent_id: paymentIntent.id,
                                amount: paymentIntent.amount
                            }
                        })];
                case 1:
                    // Log one-time payment success
                    _a.sent();
                    console.log("Payment intent succeeded for customer ".concat(customerId));
                    return [2 /*return*/];
            }
        });
    });
}
