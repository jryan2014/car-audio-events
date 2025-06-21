"use strict";
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
exports.edgeEmailService = void 0;
// @ts-nocheck
var postmark_1 = require("https://cdn.skypack.dev/postmark");
var supabase_js_2_1 = require("https://esm.sh/@supabase/supabase-js@2");
// Helper function to replace placeholders like {{name}}
function replacePlaceholders(text, data) {
    if (!text)
        return '';
    return text.replace(/\{\{(\w+)\}\}/g, function (_, key) { return data[key] || ''; });
}
var EdgeEmailService = /** @class */ (function () {
    function EdgeEmailService() {
        this.postmarkClient = null;
        this.isConfigured = false;
        var postmarkApiKey = Deno.env.get("POSTMARK_API_KEY");
        this.fromEmail = Deno.env.get("POSTMARK_FROM_EMAIL") || 'no-reply@caraudioevents.com';
        this.defaultFromName = Deno.env.get("POSTMARK_FROM_NAME") || 'Car Audio Events';
        var supabaseUrl = Deno.env.get('SUPABASE_URL');
        var supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (postmarkApiKey && supabaseUrl && supabaseAnonKey) {
            this.postmarkClient = new postmark_1.Client(postmarkApiKey);
            this.supabaseClient = (0, supabase_js_2_1.createClient)(supabaseUrl, supabaseAnonKey);
            this.isConfigured = true;
        }
        else {
            console.warn('⚠️ Missing environment variables (POSTMARK_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY). Email service is disabled.');
        }
    }
    EdgeEmailService.prototype.getEmailTemplate = function (emailType, membershipLevel) {
        return __awaiter(this, void 0, void 0, function () {
            var query, templates, defaultTemplates;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = this.supabaseClient
                            .from('email_templates')
                            .select('*')
                            .eq('email_type', emailType)
                            .eq('membership_level', membershipLevel)
                            .eq('is_active', true)
                            .limit(1);
                        return [4 /*yield*/, query];
                    case 1:
                        templates = (_a.sent()).data;
                        if (!(!templates || templates.length === 0)) return [3 /*break*/, 3];
                        query = this.supabaseClient
                            .from('email_templates')
                            .select('*')
                            .eq('email_type', emailType)
                            .is('membership_level', null)
                            .eq('is_active', true)
                            .limit(1);
                        return [4 /*yield*/, query];
                    case 2:
                        defaultTemplates = (_a.sent()).data;
                        templates = defaultTemplates;
                        _a.label = 3;
                    case 3:
                        if (!templates || templates.length === 0) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, templates[0]];
                }
            });
        });
    };
    EdgeEmailService.prototype.sendTemplatedEmail = function (to, emailType, templateData) {
        return __awaiter(this, void 0, void 0, function () {
            var errorMsg, membershipLevel, template, errorMsg, subject, htmlBody, textBody, fromName, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isConfigured || !this.postmarkClient) {
                            errorMsg = 'Email service is not configured.';
                            console.error("\u274C ".concat(errorMsg));
                            return [2 /*return*/, { success: false, error: errorMsg }];
                        }
                        membershipLevel = templateData.membershipLevel || null;
                        return [4 /*yield*/, this.getEmailTemplate(emailType, membershipLevel)];
                    case 1:
                        template = _a.sent();
                        if (!template) {
                            errorMsg = "No active email template found for type \"".concat(emailType, "\" and membership level \"").concat(membershipLevel, "\".");
                            console.error("\u274C ".concat(errorMsg));
                            return [2 /*return*/, { success: false, error: errorMsg }];
                        }
                        subject = replacePlaceholders(template.subject, templateData);
                        htmlBody = replacePlaceholders(template.htmlBody, templateData);
                        textBody = replacePlaceholders(template.textBody, templateData);
                        fromName = template.from_name || this.defaultFromName;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.postmarkClient.sendEmail({
                                From: "".concat(fromName, " <").concat(this.fromEmail, ">"),
                                To: to,
                                Subject: subject,
                                HtmlBody: htmlBody,
                                TextBody: textBody,
                                MessageStream: "outbound",
                            })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                    case 4:
                        error_1 = _a.sent();
                        console.error('❌ Failed to send templated email:', error_1);
                        return [2 /*return*/, { success: false, error: error_1.message || 'Failed to send email' }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return EdgeEmailService;
}());
exports.edgeEmailService = new EdgeEmailService();
