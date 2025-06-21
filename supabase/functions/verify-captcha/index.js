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
// @ts-nocheck
var server_ts_1 = require("https://deno.land/std@0.177.0/http/server.ts");
var cors_ts_1 = require("../_shared/cors.ts");
var HCAPTCHA_SECRET_KEY = Deno.env.get('HCAPTCHA_SECRET_KEY');
(0, server_ts_1.serve)(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var token, params, verifyUrl, verificationRequest, verificationData, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: cors_ts_1.corsHeaders })];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, req.json()];
            case 2:
                token = (_a.sent()).token;
                if (!token) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Missing hCaptcha token' }), {
                            headers: __assign(__assign({}, cors_ts_1.corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 400,
                        })];
                }
                if (!HCAPTCHA_SECRET_KEY) {
                    console.error('hCaptcha secret key is not set in environment variables.');
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Server configuration error' }), {
                            headers: __assign(__assign({}, cors_ts_1.corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 500,
                        })];
                }
                params = new URLSearchParams();
                params.append('response', token);
                params.append('secret', HCAPTCHA_SECRET_KEY);
                verifyUrl = 'https://api.hcaptcha.com/siteverify';
                return [4 /*yield*/, fetch(verifyUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params,
                    })];
            case 3:
                verificationRequest = _a.sent();
                return [4 /*yield*/, verificationRequest.json()];
            case 4:
                verificationData = _a.sent();
                if (verificationData.success) {
                    return [2 /*return*/, new Response(JSON.stringify({ success: true, message: 'hCaptcha verification successful.' }), {
                            headers: __assign(__assign({}, cors_ts_1.corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 200,
                        })];
                }
                else {
                    console.log('hCaptcha verification failed:', verificationData['error-codes']);
                    return [2 /*return*/, new Response(JSON.stringify({ success: false, error: 'hCaptcha verification failed.', details: verificationData['error-codes'] }), {
                            headers: __assign(__assign({}, cors_ts_1.corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 400,
                        })];
                }
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error('Error during hCaptcha verification:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error_1.message }), {
                        headers: __assign(__assign({}, cors_ts_1.corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 500,
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
