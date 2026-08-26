var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api/create-order.ts
var create_order_exports = {};
__export(create_order_exports, {
  default: () => handler
});
import Razorpay from "file:///E:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chatrodol/narajole_chatrodol/node_modules/razorpay/dist/razorpay.js";
import fs from "node:fs";
import path from "node:path";
function sendJson(res, statusCode, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}
async function parseBody(req) {
  if (req.body) {
    const b = req.body;
    return typeof b === "string" ? JSON.parse(b) : b;
  }
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
function getCredentials() {
  let keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
  let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        const key = k?.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (key === "RAZORPAY_KEY_ID") keyId = val;
        else if (key === "VITE_RAZORPAY_KEY_ID" && !keyId) keyId = val;
        else if (key === "RAZORPAY_KEY_SECRET") keySecret = val;
      }
    }
  } catch {
  }
  return { keyId, keySecret };
}
async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed. Use POST." });
  }
  const { keyId, keySecret } = getCredentials();
  if (!keyId || !keySecret) {
    return sendJson(res, 401, {
      error: "Razorpay API credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables."
    });
  }
  try {
    const body = await parseBody(req);
    const amount = Number(body.amount);
    const currency = body.currency || "INR";
    const receipt = body.receipt || `rcpt_${Date.now()}`;
    const notes = body.notes || {};
    if (!amount || isNaN(amount) || amount < 100) {
      return sendJson(res, 400, {
        error: "Invalid amount. Minimum amount is 100 paise (\u20B91.00)."
      });
    }
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    const options = {
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      receipt: String(receipt).slice(0, 40),
      notes
    };
    const order = await razorpay.orders.create(options);
    return sendJson(res, 200, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId
    });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    const errObj = err;
    const message = errObj?.error?.description || errObj?.message || "Failed to create order";
    const statusCode = errObj?.statusCode || 500;
    return sendJson(res, statusCode, { error: message });
  }
}
var init_create_order = __esm({
  "api/create-order.ts"() {
    "use strict";
  }
});

// api/_lib/payment-status.ts
function normalizePaymentStatus(gatewayStatus, eventType) {
  const status = String(gatewayStatus || "").toUpperCase().trim();
  const event = String(eventType || "").toUpperCase().trim();
  if (status === "SUCCESS" || status === "PAID" || event.includes("SUCCESS")) {
    return "paid";
  }
  if (status === "FAILED" || event.includes("FAILED")) {
    return "failed";
  }
  if (status === "CANCELLED" || status === "USER_DROPPED" || event.includes("CANCEL")) {
    return "cancelled";
  }
  if (status === "EXPIRED" || event.includes("EXPIRED")) {
    return "expired";
  }
  return "pending";
}
var init_payment_status = __esm({
  "api/_lib/payment-status.ts"() {
    "use strict";
  }
});

// api/_lib/finalize-payment.ts
import { createClient } from "file:///E:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chatrodol/narajole_chatrodol/node_modules/@supabase/supabase-js/dist/index.mjs";
import crypto from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
function getEnvValue(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path2.resolve(process.cwd(), ".env");
    if (fs2.existsSync(envPath)) {
      const content = fs2.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === key) {
          return v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  } catch {
  }
  return fallback;
}
function getSupabaseClient() {
  const url = getEnvValue("SUPABASE_URL") || getEnvValue("VITE_SUPABASE_URL", "https://wzquszbmbpkbhyythdrj.supabase.co");
  const key = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) {
    throw new Error("SUPABASE_URL is not configured");
  }
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for backend payment finalization");
  }
  return createClient(url, key);
}
function generateDonationReceipt() {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `CSWO-DON-${Date.now().toString().slice(-6)}-${rand}`;
}
function generateContributionReceipt() {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `CSWO-MBR-${Date.now().toString().slice(-6)}-${rand}`;
}
function parseDonationIdFromOrderId(orderId) {
  const match = /^d_([0-9a-f]{32})(?:_|$)/i.exec(orderId);
  if (!match) return null;
  const hex = match[1].toLowerCase();
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join("-");
}
async function finalizePayment(input) {
  const { gateway, orderId, paymentId, gatewayStatus, eventType, paymentMethod } = input;
  const status = normalizePaymentStatus(gatewayStatus, eventType);
  const supabase = getSupabaseClient();
  const orderColumn = gateway === "cashfree" ? "cashfree_order_id" : "razorpay_order_id";
  const paymentColumn = gateway === "cashfree" ? "cashfree_payment_id" : "razorpay_payment_id";
  let { data: donation, error: donFetchError } = await supabase.from("cswo_donations").select("*").eq(orderColumn, orderId).maybeSingle();
  if (donFetchError) {
    console.error("[finalizePayment] Error fetching donation:", donFetchError);
  }
  if (!donation) {
    const embeddedId = parseDonationIdFromOrderId(orderId);
    if (embeddedId) {
      const { data: byId } = await supabase.from("cswo_donations").select("*").eq("id", embeddedId).maybeSingle();
      if (byId) {
        console.warn(
          `[finalizePayment] Donation ${embeddedId} was not linked to order ${orderId}; recovered via embedded id and backfilling.`
        );
        const { data: relinked } = await supabase.from("cswo_donations").update({ [orderColumn]: orderId }).eq("id", embeddedId).select().single();
        donation = relinked || byId;
      }
    }
  }
  if (donation) {
    if (donation.status === "paid") {
      return {
        success: true,
        alreadyProcessed: true,
        type: "donation",
        status: "paid",
        record: donation,
        shouldSendReceipt: donation.receipt_email_status !== "sent" && !!donation.receipt_number,
        paymentMethod
      };
    }
    const updateData = {
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (paymentId) {
      updateData[paymentColumn] = paymentId;
    }
    if (status === "paid") {
      updateData.receipt_number = donation.receipt_number || generateDonationReceipt();
      updateData.receipt_email_status = donation.receipt_email_status === "sent" ? "sent" : "pending";
    }
    const { data: updated, error } = await supabase.from("cswo_donations").update(updateData).eq("id", donation.id).select().single();
    if (error) throw error;
    return {
      success: true,
      type: "donation",
      status,
      record: updated,
      shouldSendReceipt: status === "paid" && updated.receipt_email_status !== "sent",
      paymentMethod
    };
  }
  const { data: contributions, error: conFetchError } = await supabase.from("cswo_monthly_contributions").select("*, member:cswo_members(id, full_name, email, phone)").eq(orderColumn, orderId);
  if (conFetchError) {
    console.error("[finalizePayment] Error fetching contribution:", conFetchError);
  }
  if (contributions && contributions.length > 0) {
    const first = contributions[0];
    const memberObj = first.member;
    const memberName = memberObj?.full_name || "Member";
    const memberEmail = memberObj?.email || "";
    const monthsLabel = contributions.map((c) => `${MONTH_NAMES[c.month - 1] || c.month}/${c.year}`).join(", ");
    const totalAmount = contributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const unpaid = contributions.filter((c) => c.status !== "paid");
    if (unpaid.length === 0) {
      return {
        success: true,
        alreadyProcessed: true,
        type: "contribution",
        status: "paid",
        record: {
          ...first,
          member_name: memberName,
          member_email: memberEmail,
          amount: totalAmount,
          purpose: `Monthly Dues \u2014 ${monthsLabel}`
        },
        shouldSendReceipt: first.receipt_email_status !== "sent" && !!first.receipt_number,
        paymentMethod
      };
    }
    const sharedReceiptNumber = contributions.find((c) => c.receipt_number)?.receipt_number || generateContributionReceipt();
    const updateData = {
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (paymentId) {
      updateData[paymentColumn] = paymentId;
    }
    if (status === "paid") {
      updateData.paid_at = (/* @__PURE__ */ new Date()).toISOString();
      updateData.payment_method = paymentMethod || (gateway === "cashfree" ? "cashfree" : "razorpay");
      updateData.receipt_number = sharedReceiptNumber;
      updateData.receipt_email_status = "pending";
    }
    const { data: updatedRows, error } = await supabase.from("cswo_monthly_contributions").update(updateData).in("id", unpaid.map((c) => c.id)).select("*, member:cswo_members(id, full_name, email, phone)");
    if (error) throw error;
    const updatedFirst = updatedRows && updatedRows[0] || first;
    const updatedMember = updatedFirst.member;
    return {
      success: true,
      type: "contribution",
      status,
      record: {
        ...updatedFirst,
        member_name: updatedMember?.full_name || memberName,
        member_email: updatedMember?.email || memberEmail,
        amount: totalAmount,
        purpose: `Monthly Dues \u2014 ${monthsLabel}`,
        receipt_number: sharedReceiptNumber,
        receipt_email_status: status === "paid" ? "pending" : updatedFirst.receipt_email_status
      },
      linkedRecordIds: unpaid.slice(1).map((c) => c.id),
      shouldSendReceipt: status === "paid",
      paymentMethod
    };
  }
  return {
    success: false,
    error: "Payment record not found in donations or monthly contributions",
    orderId
  };
}
var MONTH_NAMES;
var init_finalize_payment = __esm({
  "api/_lib/finalize-payment.ts"() {
    "use strict";
    init_payment_status();
    MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
  }
});

// api/_lib/payment-receipt.ts
import { createClient as createClient2 } from "file:///E:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chatrodol/narajole_chatrodol/node_modules/@supabase/supabase-js/dist/index.mjs";
import fs3 from "node:fs";
import path3 from "node:path";
function getEnvValue2(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path3.resolve(process.cwd(), ".env");
    if (fs3.existsSync(envPath)) {
      const content = fs3.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === key) {
          return v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  } catch {
  }
  return fallback;
}
function getSupabaseClient2() {
  const url = getEnvValue2("SUPABASE_URL") || getEnvValue2("VITE_SUPABASE_URL", "https://wzquszbmbpkbhyythdrj.supabase.co");
  const key = getEnvValue2("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) {
    throw new Error("SUPABASE_URL is not configured");
  }
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for sending payment receipts");
  }
  return createClient2(url, key);
}
async function sendPaymentReceipt(input) {
  const { type, record, paymentMethod, forceResend = false, linkedRecordIds = [] } = input;
  if (!record || !record.id) {
    return { success: false, error: "Invalid record supplied to sendPaymentReceipt" };
  }
  const table = type === "donation" ? "cswo_donations" : "cswo_monthly_contributions";
  const supabase = getSupabaseClient2();
  const currentAttempts = record.receipt_email_attempts || 0;
  if (!forceResend) {
    if (record.receipt_email_status === "sent") {
      return {
        success: true,
        skipped: true,
        reason: "Receipt already sent"
      };
    }
    const { data: claimed, error: claimError } = await supabase.from(table).update({
      receipt_email_status: "sending",
      receipt_email_attempts: currentAttempts + 1
    }).eq("id", record.id).or("receipt_email_status.is.null,receipt_email_status.eq.pending,receipt_email_status.eq.failed").select().maybeSingle();
    if (claimError) {
      console.error("[sendPaymentReceipt] Claim error:", claimError);
    }
    if (!claimed) {
      return {
        success: true,
        skipped: true,
        reason: "Receipt is already being processed or has been sent by concurrent worker"
      };
    }
  } else {
    await supabase.from(table).update({
      receipt_email_status: "sending",
      receipt_email_attempts: currentAttempts + 1
    }).eq("id", record.id);
  }
  try {
    let recipientEmail = type === "donation" ? record.donor_email : record.member_email;
    let recipientName = type === "donation" ? record.donor_name : record.member_name;
    if (type === "contribution" && (!recipientEmail || !recipientName) && record.member_id) {
      const { data: member } = await supabase.from("cswo_members").select("full_name, email").eq("id", record.member_id).maybeSingle();
      if (member) {
        recipientEmail = recipientEmail || member.email;
        recipientName = recipientName || member.full_name;
      }
    }
    if (!recipientEmail || !recipientEmail.includes("@")) {
      throw new Error(`Valid customer email not found on ${type} record (ID: ${record.id})`);
    }
    const siteUrl = getEnvValue2(
      "SITE_URL",
      "https://www.chhatradol.org"
    );
    const purposeLabel = record.purpose || (record.month ? `Month ${record.month}/${record.year || ""}` : "") || (type === "donation" ? "Donation & Social Welfare" : "Monthly Contribution");
    const paymentId = record.cashfree_payment_id || record.razorpay_payment_id || null;
    const internalSecret = getEnvValue2("INTERNAL_API_SECRET");
    const headers = { "Content-Type": "application/json" };
    if (internalSecret) {
      headers["x-internal-secret"] = internalSecret;
    }
    const response = await fetch(
      `${siteUrl}/api/send-receipt-email`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          recipientEmail,
          recipientName: recipientName || "Valued Supporter",
          type,
          amount: record.amount,
          receiptNumber: record.receipt_number,
          purpose: purposeLabel,
          paymentMethod: paymentMethod || "Online Payment",
          paymentId,
          date: (/* @__PURE__ */ new Date()).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
          })
        }),
        signal: AbortSignal.timeout(15e3)
      }
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        result.error || result.warning || `Receipt email API returned HTTP ${response.status}`
      );
    }
    const sentUpdate = {
      receipt_email_status: "sent",
      receipt_email_sent_at: (/* @__PURE__ */ new Date()).toISOString(),
      receipt_email_message_id: result.messageId || null,
      receipt_email_error: null
    };
    await supabase.from(table).update(sentUpdate).eq("id", record.id);
    if (linkedRecordIds.length > 0) {
      await supabase.from(table).update(sentUpdate).in("id", linkedRecordIds);
    }
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    await supabase.from(table).update({
      receipt_email_status: "failed",
      receipt_email_error: message
    }).eq("id", record.id);
    console.error(`[Payment Receipt Error for ${table} ${record.id}]:`, message);
    return {
      success: false,
      error: message
    };
  }
}
var init_payment_receipt = __esm({
  "api/_lib/payment-receipt.ts"() {
    "use strict";
  }
});

// api/verify-payment.ts
var verify_payment_exports = {};
__export(verify_payment_exports, {
  default: () => handler2
});
import crypto2 from "node:crypto";
import fs4 from "node:fs";
import path4 from "node:path";
function sendJson2(res, statusCode, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}
async function parseBody2(req) {
  if (req.body) {
    const b = req.body;
    return typeof b === "string" ? JSON.parse(b) : b;
  }
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
function getCredentials2() {
  let keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
  let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  try {
    const envPath = path4.resolve(process.cwd(), ".env");
    if (fs4.existsSync(envPath)) {
      const content = fs4.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        const key = k?.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (key === "RAZORPAY_KEY_ID") keyId = val;
        else if (key === "VITE_RAZORPAY_KEY_ID" && !keyId) keyId = val;
        else if (key === "RAZORPAY_KEY_SECRET") keySecret = val;
      }
    }
  } catch {
  }
  return { keyId, keySecret };
}
function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto2.timingSafeEqual(bufA, bufB);
}
async function handler2(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    return sendJson2(res, 405, {
      success: false,
      error: "Method Not Allowed. Use POST."
    });
  }
  const { keySecret } = getCredentials2();
  if (!keySecret) {
    return sendJson2(res, 500, {
      success: false,
      error: "Razorpay secret key not configured. Please set RAZORPAY_KEY_SECRET in environment variables."
    });
  }
  try {
    const body = await parseBody2(req);
    const orderId = (body.order_id || body.razorpay_order_id || "").trim();
    const paymentId = (body.payment_id || body.razorpay_payment_id || "").trim();
    const signature = (body.razorpay_signature || "").trim();
    if (!orderId || !paymentId || !signature) {
      return sendJson2(res, 400, {
        success: false,
        error: "Missing required parameters (order_id, payment_id, razorpay_signature)."
      });
    }
    const expectedSignature = crypto2.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const isValid = timingSafeEqualStr(expectedSignature, signature);
    if (!isValid) {
      return sendJson2(res, 400, {
        success: false,
        error: "Invalid payment signature. Verification failed."
      });
    }
    const result = await finalizePayment({
      gateway: "razorpay",
      orderId,
      paymentId,
      gatewayStatus: "SUCCESS",
      paymentMethod: "Razorpay"
    });
    if (result.success && result.status === "paid" && result.shouldSendReceipt) {
      void sendPaymentReceipt({
        type: result.type,
        record: result.record,
        linkedRecordIds: result.linkedRecordIds,
        paymentMethod: "Razorpay"
      }).catch((receiptErr) => {
        console.error("[verify-payment] Receipt email error:", receiptErr);
      });
    }
    return sendJson2(res, 200, {
      success: true,
      status: result.status || "paid",
      type: result.type,
      receipt_number: result.record?.receipt_number ?? null,
      order_id: orderId,
      payment_id: paymentId
    });
  } catch (err) {
    console.error("[verify-payment] Error:", err);
    const message = err instanceof Error ? err.message : "Internal verification error";
    return sendJson2(res, 500, { success: false, error: message });
  }
}
var init_verify_payment = __esm({
  "api/verify-payment.ts"() {
    "use strict";
    init_finalize_payment();
    init_payment_receipt();
  }
});

// api/cashfree-order.ts
var cashfree_order_exports = {};
__export(cashfree_order_exports, {
  default: () => handler3
});
import fs5 from "node:fs";
import path5 from "node:path";
function sendJson3(res, statusCode, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}
function resolveSiteOrigin(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (host) {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || "https";
    return `${proto}://${host}`;
  }
  let explicitSiteUrl = process.env.SITE_URL || "";
  if (!explicitSiteUrl) {
    try {
      const envPath = path5.resolve(process.cwd(), ".env");
      if (fs5.existsSync(envPath)) {
        const content = fs5.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const [k, ...v] = trimmed.split("=");
          if (k?.trim() === "SITE_URL") {
            explicitSiteUrl = v.join("=").trim().replace(/^["']|["']$/g, "");
            break;
          }
        }
      }
    } catch {
    }
  }
  if (explicitSiteUrl) return explicitSiteUrl.replace(/\/$/, "");
  return "https://www.chhatradol.org";
}
async function parseBody3(req) {
  if (req.body) {
    const b = req.body;
    return typeof b === "string" ? JSON.parse(b) : b;
  }
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
function getCashfreeCredentials() {
  let appId = process.env.CASHFREE_APP_ID || "";
  let secretKey = process.env.CASHFREE_SECRET_KEY || "";
  let apiEnv = process.env.CASHFREE_API_ENV || "";
  try {
    const envPath = path5.resolve(process.cwd(), ".env");
    if (fs5.existsSync(envPath)) {
      const content = fs5.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        const key = k?.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (key === "CASHFREE_APP_ID") appId = val;
        else if (key === "CASHFREE_SECRET_KEY") secretKey = val;
        else if (key === "CASHFREE_API_ENV") apiEnv = val;
      }
    }
  } catch {
  }
  if (!apiEnv) {
    if (secretKey.includes("_prod_")) {
      apiEnv = "production";
    } else if (secretKey.includes("_test_")) {
      apiEnv = "sandbox";
    } else {
      apiEnv = "production";
    }
  } else if (apiEnv === "sandbox" && secretKey.includes("_prod_")) {
    apiEnv = "production";
  } else if (apiEnv === "production" && secretKey.includes("_test_")) {
    apiEnv = "sandbox";
  }
  return { appId, secretKey, apiEnv };
}
async function handler3(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    return sendJson3(res, 405, { error: "Method Not Allowed. Use POST." });
  }
  const { appId, secretKey, apiEnv } = getCashfreeCredentials();
  if (!appId || !secretKey) {
    return sendJson3(res, 401, {
      error: "Cashfree API credentials not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in environment variables."
    });
  }
  try {
    const body = await parseBody3(req);
    const amount = Number(body.amount);
    const currency = body.currency || "INR";
    const customerName = body.customer_name || "Anonymous";
    const customerEmail = body.customer_email || "noreply@cswo.in";
    const customerPhone = body.customer_phone || "9999999999";
    const orderNote = body.order_note || "Donation / Contribution";
    const receipt = body.receipt || `cswo_cf_${Date.now()}`;
    if (!amount || isNaN(amount) || amount < 1) {
      return sendJson3(res, 400, {
        error: "Invalid amount. Minimum amount is \u20B91.00."
      });
    }
    const baseUrl = apiEnv === "sandbox" ? "https://sandbox.cashfree.com/pg/orders" : "https://api.cashfree.com/pg/orders";
    const orderId = `${receipt}_${Date.now()}`.slice(0, 50).replace(/[^a-zA-Z0-9_-]/g, "_");
    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: currency.toUpperCase(),
      order_note: orderNote,
      customer_details: {
        customer_id: `cust_${Date.now()}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone.replace(/\D/g, "").slice(-10) || "9999999999"
      },
      order_meta: {
        return_url: `${resolveSiteOrigin(req)}/payment-return?order_id={order_id}`,
        notify_url: `${resolveSiteOrigin(req)}/api/cashfree-webhook`
      }
    };
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey
      },
      body: JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(1e4)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Cashfree order creation failed:", data);
      return sendJson3(res, response.status, {
        error: data.message || "Failed to create Cashfree order"
      });
    }
    return sendJson3(res, 200, {
      order_id: data.order_id || orderId,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
      order_amount: data.order_amount || amount,
      order_currency: data.order_currency || currency
    });
  } catch (err) {
    console.error("Error creating Cashfree order:", err);
    const errObj = err;
    return sendJson3(res, 500, { error: errObj?.message || "Internal server error" });
  }
}
var init_cashfree_order = __esm({
  "api/cashfree-order.ts"() {
    "use strict";
  }
});

// api/cashfree-verify.ts
var cashfree_verify_exports = {};
__export(cashfree_verify_exports, {
  default: () => handler4
});
import fs6 from "node:fs";
import path6 from "node:path";
function sendJson4(res, statusCode, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}
async function parseBody4(req) {
  if (req.body) {
    const b = req.body;
    return typeof b === "string" ? JSON.parse(b) : b;
  }
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
function getEnvValue3(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path6.resolve(process.cwd(), ".env");
    if (fs6.existsSync(envPath)) {
      const content = fs6.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === key) {
          return v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  } catch {
  }
  return fallback;
}
function getCashfreeCredentials2() {
  let appId = getEnvValue3("CASHFREE_APP_ID");
  let secretKey = getEnvValue3("CASHFREE_SECRET_KEY");
  let apiEnv = getEnvValue3("CASHFREE_API_ENV");
  if (!apiEnv) {
    if (secretKey.includes("_prod_")) {
      apiEnv = "production";
    } else if (secretKey.includes("_test_")) {
      apiEnv = "sandbox";
    } else {
      apiEnv = "production";
    }
  } else if (apiEnv === "sandbox" && secretKey.includes("_prod_")) {
    apiEnv = "production";
  } else if (apiEnv === "production" && secretKey.includes("_test_")) {
    apiEnv = "sandbox";
  }
  return { appId, secretKey, apiEnv };
}
async function handler4(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.statusCode = 200;
    res.end();
    return;
  }
  const { appId, secretKey, apiEnv } = getCashfreeCredentials2();
  if (!appId || !secretKey) {
    return sendJson4(res, 401, {
      success: false,
      status: "error",
      error: "Cashfree API credentials not configured."
    });
  }
  try {
    let orderId = "";
    if (req.method === "POST") {
      const body = await parseBody4(req);
      orderId = (body.order_id || "").trim();
    } else if (req.method === "GET") {
      const url = new URL(
        req.url || "",
        `http://${req.headers.host || "localhost"}`
      );
      orderId = url.searchParams.get("order_id") || "";
    }
    if (!orderId) {
      return sendJson4(res, 400, {
        success: false,
        status: "error",
        error: "Missing order_id parameter."
      });
    }
    const baseHeaders = {
      "Content-Type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": appId,
      "x-client-secret": secretKey
    };
    const baseUrl = apiEnv === "sandbox" ? `https://sandbox.cashfree.com/pg/orders/${orderId}` : `https://api.cashfree.com/pg/orders/${orderId}`;
    const orderRes = await fetch(baseUrl, {
      method: "GET",
      headers: baseHeaders,
      signal: AbortSignal.timeout(1e4)
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      return sendJson4(res, orderRes.status, {
        success: false,
        status: "error",
        error: orderData.message || "Failed to fetch order status from Cashfree."
      });
    }
    let isPaid = orderData.order_status === "PAID";
    let paymentId = orderData.cf_order_id || orderData.order_id;
    let paymentMethod = "Cashfree Payments";
    let rawStatus = orderData.order_status || "PENDING";
    if (!isPaid) {
      try {
        const paymentsUrl = apiEnv === "sandbox" ? `https://sandbox.cashfree.com/pg/orders/${orderId}/payments` : `https://api.cashfree.com/pg/orders/${orderId}/payments`;
        const pRes = await fetch(paymentsUrl, {
          method: "GET",
          headers: baseHeaders,
          signal: AbortSignal.timeout(1e4)
        });
        if (pRes.ok) {
          const pList = await pRes.json();
          if (Array.isArray(pList) && pList.length > 0) {
            const successPayment = pList.find(
              (p) => p.payment_status?.toUpperCase() === "SUCCESS"
            );
            if (successPayment) {
              isPaid = true;
              rawStatus = "SUCCESS";
              if (successPayment.cf_payment_id) {
                paymentId = String(successPayment.cf_payment_id);
              }
              if (successPayment.payment_group) {
                paymentMethod = `Cashfree (${successPayment.payment_group.toUpperCase()})`;
              }
            } else {
              const latest = pList[0];
              if (latest?.payment_status) {
                rawStatus = latest.payment_status.toUpperCase();
              }
            }
          }
        }
      } catch (pErr) {
        console.warn("[cashfree-verify] Error checking payments list:", pErr);
      }
    }
    const result = await finalizePayment({
      gateway: "cashfree",
      orderId,
      paymentId,
      gatewayStatus: rawStatus,
      paymentMethod
    });
    if (!result.success) {
      console.error(
        `[cashfree-verify] finalizePayment could not locate a record for order ${orderId} (Cashfree isPaid=${isPaid}):`,
        result.error
      );
    }
    if (result.success && result.status === "paid" && result.shouldSendReceipt) {
      void sendPaymentReceipt({
        type: result.type,
        record: result.record,
        linkedRecordIds: result.linkedRecordIds,
        paymentMethod: result.paymentMethod || paymentMethod
      }).catch((err) => {
        console.error("[cashfree-verify] Receipt email dispatch error:", err);
      });
    }
    const finalStatus = result.success ? result.status || "pending" : "pending";
    return sendJson4(res, 200, {
      success: finalStatus === "paid",
      status: finalStatus,
      order_id: orderData.order_id || orderId,
      payment_id: paymentId,
      payment_method: paymentMethod,
      order_amount: orderData.order_amount,
      order_currency: orderData.order_currency,
      // Include type and receipt_number so frontend can display them
      type: result.type,
      receipt_number: result.record?.receipt_number ?? null
    });
  } catch (err) {
    console.error("[cashfree-verify] Error:", err);
    const errObj = err;
    return sendJson4(res, 500, {
      success: false,
      status: "error",
      error: errObj?.message || "Verification error"
    });
  }
}
var init_cashfree_verify = __esm({
  "api/cashfree-verify.ts"() {
    "use strict";
    init_finalize_payment();
    init_payment_receipt();
  }
});

// api/cashfree-webhook.ts
var cashfree_webhook_exports = {};
__export(cashfree_webhook_exports, {
  default: () => handler5
});
import crypto3 from "node:crypto";
import fs7 from "node:fs";
import path7 from "node:path";
function sendJson5(res, statusCode, data) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-webhook-signature, x-webhook-timestamp"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}
function getEnvValue4(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path7.resolve(process.cwd(), ".env");
    if (fs7.existsSync(envPath)) {
      const content = fs7.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === key) {
          return v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  } catch {
  }
  return fallback;
}
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      resolve(raw);
    });
    req.on("error", reject);
  });
}
function verifyCashfreeSignature(rawBody, signatureHeader, timestampHeader, secretKey) {
  if (!signatureHeader || !timestampHeader || !secretKey) {
    return false;
  }
  try {
    const dataToSign = timestampHeader + rawBody;
    const hmac = crypto3.createHmac("sha256", secretKey);
    hmac.update(dataToSign);
    const expectedBase64 = hmac.digest("base64");
    const hmacHex = crypto3.createHmac("sha256", secretKey);
    hmacHex.update(dataToSign);
    const expectedHex = hmacHex.digest("hex");
    const sigBuf = Buffer.from(signatureHeader);
    const base64Buf = Buffer.from(expectedBase64);
    const hexBuf = Buffer.from(expectedHex);
    const matchesBase64 = sigBuf.length === base64Buf.length && crypto3.timingSafeEqual(sigBuf, base64Buf);
    const matchesHex = sigBuf.length === hexBuf.length && crypto3.timingSafeEqual(sigBuf, hexBuf);
    return matchesBase64 || matchesHex;
  } catch (err) {
    console.error("[Cashfree Webhook Signature Check Error]:", err);
    return false;
  }
}
async function handler5(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-webhook-signature, x-webhook-timestamp"
    );
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method === "GET") {
    return sendJson5(res, 200, {
      status: "ONLINE",
      service: "Cashfree Webhook Handler",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (req.method !== "POST") {
    return sendJson5(res, 405, { error: "Method Not Allowed. Use POST." });
  }
  const secretKey = getEnvValue4("CASHFREE_SECRET_KEY");
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-webhook-signature"] || "";
    const timestamp = req.headers["x-webhook-timestamp"] || "";
    if (!secretKey) {
      console.error("[Cashfree Webhook] \u274C CASHFREE_SECRET_KEY not configured \u2014 rejecting webhook.");
      return sendJson5(res, 500, {
        success: false,
        error: "Webhook signing key not configured"
      });
    }
    const isValid = verifyCashfreeSignature(
      rawBody,
      signature,
      timestamp,
      secretKey
    );
    if (!isValid) {
      console.error("[Cashfree Webhook] \u274C Invalid signature received.");
      return sendJson5(res, 401, {
        success: false,
        error: "Invalid webhook signature"
      });
    }
    let payload = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return sendJson5(res, 400, { error: "Invalid JSON payload" });
    }
    const eventType = payload.type || payload.event || "";
    const eventData = payload.data || payload;
    const order = eventData.order || {};
    const payment = eventData.payment || {};
    const orderId = order.order_id || eventData.order_id || "";
    const paymentId = String(
      payment.cf_payment_id || eventData.cf_payment_id || ""
    ) || void 0;
    const paymentStatus = payment.payment_status || eventData.payment_status || order.order_status || "";
    const paymentGroup = payment.payment_group;
    const paymentMethod = paymentGroup ? `Cashfree (${paymentGroup.toUpperCase()})` : "Cashfree Payments";
    if (!orderId) {
      console.warn("[Cashfree Webhook] Missing order_id in payload");
      return sendJson5(res, 200, {
        received: true,
        warning: "Order ID missing in payload"
      });
    }
    console.log(
      `[Cashfree Webhook] Event: ${eventType}, Order: ${orderId}, Status: ${paymentStatus}`
    );
    const result = await finalizePayment({
      gateway: "cashfree",
      orderId,
      paymentId: paymentId || void 0,
      gatewayStatus: paymentStatus,
      eventType,
      paymentMethod
    });
    if (result.success && result.status === "paid" && result.shouldSendReceipt) {
      try {
        await sendPaymentReceipt({
          type: result.type,
          record: result.record,
          linkedRecordIds: result.linkedRecordIds,
          paymentMethod: result.paymentMethod || "Cashfree Payments"
        });
      } catch (receiptErr) {
        console.error("[Cashfree Webhook] Receipt email error:", receiptErr);
      }
    }
    return sendJson5(res, 200, {
      received: true,
      order_id: orderId,
      status: result.status || "unknown"
    });
  } catch (err) {
    console.error("[Cashfree Webhook Error]:", err);
    return sendJson5(res, 500, {
      received: false,
      error: "Webhook processing error"
    });
  }
}
var init_cashfree_webhook = __esm({
  "api/cashfree-webhook.ts"() {
    "use strict";
    init_finalize_payment();
    init_payment_receipt();
  }
});

// api/send-receipt-email.ts
var send_receipt_email_exports = {};
__export(send_receipt_email_exports, {
  buildReceiptHtml: () => buildReceiptHtml,
  default: () => handler6
});
import { createClient as createClient3 } from "file:///E:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chatrodol/narajole_chatrodol/node_modules/@supabase/supabase-js/dist/index.mjs";
import fs8 from "node:fs";
import path8 from "node:path";
function getSupabaseClient3() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://wzquszbmbpkbhyythdrj.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient3(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
}
function sendJson6(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-internal-secret");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.end(JSON.stringify(data));
}
function parseBody5(req) {
  if (req.body) {
    const b = req.body;
    return Promise.resolve(typeof b === "string" ? JSON.parse(b) : b);
  }
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}
function getResendApiKey() {
  let key = process.env.RESEND_API_KEY || "";
  if (key) return key;
  try {
    const envPath = path8.resolve(process.cwd(), ".env");
    if (fs8.existsSync(envPath)) {
      const content = fs8.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === "RESEND_API_KEY") {
          key = v.join("=").trim().replace(/^["']|["']$/g, "");
          break;
        }
      }
    }
  } catch {
  }
  return key;
}
function getResendFromEmail() {
  let from = process.env.RESEND_FROM_EMAIL || "";
  if (from) return from;
  try {
    const envPath = path8.resolve(process.cwd(), ".env");
    if (fs8.existsSync(envPath)) {
      const content = fs8.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === "RESEND_FROM_EMAIL") {
          from = v.join("=").trim().replace(/^["']|["']$/g, "");
          break;
        }
      }
    }
  } catch {
  }
  return from || "Chhatradol Social Welfare Organization <donations@chhatradol.org>";
}
function getResendReplyTo() {
  let replyTo = process.env.RESEND_REPLY_TO || "";
  if (replyTo) return replyTo;
  try {
    const envPath = path8.resolve(process.cwd(), ".env");
    if (fs8.existsSync(envPath)) {
      const content = fs8.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === "RESEND_REPLY_TO") {
          replyTo = v.join("=").trim().replace(/^["']|["']$/g, "");
          break;
        }
      }
    }
  } catch {
  }
  return replyTo || "info@chhatradol.org";
}
function getInternalApiSecret() {
  let secret = process.env.INTERNAL_API_SECRET || "";
  if (secret) return secret;
  try {
    const envPath = path8.resolve(process.cwd(), ".env");
    if (fs8.existsSync(envPath)) {
      const content = fs8.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k?.trim() === "INTERNAL_API_SECRET") {
          secret = v.join("=").trim().replace(/^["']|["']$/g, "");
          break;
        }
      }
    }
  } catch {
  }
  return secret;
}
function buildReceiptHtml(data) {
  const typeTitle = data.type === "contribution" ? "Chhatradol Social Welfare Organization - Monthly Donation Successful" : "Chhatradol Social Welfare Organization - Donation Successful";
  const amountFormatted = `\u20B9${Number(data.amount).toLocaleString("en-IN")}`;
  const displayDate = data.date || (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${typeTitle}</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
    }

    .wrapper {
      width: 100%;
      padding: 24px 10px;
    }

    .card {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #d9dde3;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
    }

    /* ================= HEADER ================= */

    .header {
      background: #2F69F8;
      text-align: center;
      padding: 24px 20px 42px;
    }

    .logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      display: block;
      margin: 0 auto 12px;
    }

    .org-name {
      margin: 0;
      color: #ffffff;
      font-size: 20px;
      line-height: 1.3;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* ================= PAYMENT BADGE ================= */

    .success-badge {
      display: inline-block;
      margin-top: 14px;
      background: #ffffff;
      border-radius: 6px;
      padding: 7px 14px;
      color: #374151;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    }

    .success-icon {
      display: inline-block;
      width: 15px;
      height: 15px;
      line-height: 15px;
      margin-left: 5px;
      background: #16a34a;
      color: #ffffff;
      border-radius: 50%;
      font-size: 10px;
      text-align: center;
      vertical-align: middle;
    }

    /* ================= CONTENT ================= */

    .content {
      padding: 0 26px 26px;
    }

    /* ================= AMOUNT CARD ================= */

    .receipt-box {
      position: relative;
      margin-top: -24px;
      background: #ffffff;
      border: 1px solid #d7dce3;
      border-radius: 8px;
      padding: 18px 14px 14px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.10);
    }

    .amount-title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      text-transform: uppercase;
      margin-bottom: 16px;
      letter-spacing: 0.3px;
    }

    /* ================= DETAILS TABLE ================= */

    .details-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .details-table td {
      border: 1px solid #d6dbe2;
      padding: 9px 10px;
    }

    .label {
      width: 38%;
      background: #f3f4f6;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
    }

    .value {
      color: #374151;
      font-weight: 500;
      word-break: break-word;
    }

    /* ================= THANK YOU ================= */

    .thank-you {
      text-align: center;
      padding: 18px 12px 4px;
      font-size: 13px;
      color: #374151;
      line-height: 1.55;
    }

    /* ================= LARGE VERIFIED ICON ================= */

    .verified-section {
      text-align: center;
      padding: 18px 0 4px;
    }

    .verified-icon {
      width: 70px;
      height: 70px;
      display: inline-block;
    }

    /* ================= FOOTER ================= */

    .footer {
      background: #eef0f3;
      text-align: center;
      padding: 16px 20px 18px;
      border-top: 1px solid #d9dde3;
    }

    .footer-org {
      margin: 0;
      color: #374151;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .registration {
      margin-top: 6px;
      color: #6b7280;
      font-size: 11px;
    }

    /* ================= SOCIAL ICONS ================= */

    .social-links {
      margin-top: 14px;
      text-align: center;
    }

    .social-link {
      display: inline-block;
      width: 32px;
      height: 32px;
      line-height: 32px;
      margin: 0 4px;
      border-radius: 50%;
      background: #ffffff;
      border: 1px solid #d5d9df;
      text-decoration: none;
      text-align: center;
      vertical-align: middle;
    }

    .social-link img {
      width: 17px;
      height: 17px;
      vertical-align: middle;
      display: inline-block;
    }

    /* ================= MOBILE ================= */

    @media only screen and (max-width: 600px) {

      .wrapper {
        padding: 0;
      }

      .card {
        border-radius: 0;
        border-left: none;
        border-right: none;
      }

      .header {
        padding: 22px 15px 40px;
      }

      .content {
        padding-left: 14px;
        padding-right: 14px;
      }

      .org-name {
        font-size: 17px;
      }

      .amount-title {
        font-size: 16px;
      }

      .details-table td {
        padding: 8px 7px;
      }

      .label {
        width: 42%;
        font-size: 10px;
      }
    }

  </style>
</head>

<body>

  <div class="wrapper">

    <div class="card">

      <!-- ================= HEADER ================= -->

      <div class="header">

        <img
          src="https://www.chhatradol.org/logo.png"
          alt="Chhatradol Social Welfare Organization"
          class="logo"
        >

        <h1 class="org-name">
          Chhatradol Social Welfare Organization
        </h1>

        <div class="success-badge">
          Payment Successful
          <span class="success-icon">\u2713</span>
        </div>

      </div>


      <!-- ================= CONTENT ================= -->

      <div class="content">

        <div class="receipt-box">

          <div class="amount-title">
            Amount Received ${amountFormatted}
          </div>


          <!-- PAYMENT DETAILS -->

          <table class="details-table">

            <tr>
              <td class="label">
                Receipt Number
              </td>

              <td class="value">
                ${data.receiptNumber || "\u2014"}
              </td>
            </tr>


            <tr>
              <td class="label">
                Date & Time
              </td>

              <td class="value">
                ${displayDate}
              </td>
            </tr>


            <tr>
              <td class="label">
                ${data.type === "contribution" ? "Member" : "Donor"}
              </td>

              <td class="value">
                ${data.recipientName || "\u2014"}
              </td>
            </tr>


            ${data.purpose ? `
            <tr>
              <td class="label">
                Purpose
              </td>

              <td class="value">
                ${data.purpose}
              </td>
            </tr>
            ` : ""}


            ${data.month ? `
            <tr>
              <td class="label">
                Period
              </td>

              <td class="value">
                ${data.month}${data.year ? " " + data.year : ""}
              </td>
            </tr>
            ` : ""}


            ${data.paymentMethod ? `
            <tr>
              <td class="label">
                Payment Method
              </td>

              <td class="value">
                ${data.paymentMethod}
              </td>
            </tr>
            ` : ""}


            ${data.paymentId ? `
            <tr>
              <td class="label">
                Transaction ID
              </td>

              <td class="value">
                ${data.paymentId}
              </td>
            </tr>
            ` : ""}

          </table>


          <!-- THANK YOU MESSAGE -->

          <div class="thank-you">

            Thank you for your support. Your contribution enables us
            to continue our social welfare and community development
            initiatives.

          </div>


          <!-- LARGE VERIFIED SVG -->

          <div class="verified-section">

            <svg
              class="verified-icon"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >

              <path
                d="M50 5
                C57 5 61 10 68 10
                C75 10 79 7 85 13
                C91 19 88 24 91 31
                C94 38 100 41 100 50
                C100 59 94 62 91 69
                C88 76 91 81 85 87
                C79 93 75 90 68 90
                C61 90 57 95 50 95
                C43 95 39 90 32 90
                C25 90 21 93 15 87
                C9 81 12 76 9 69
                C6 62 0 59 0 50
                C0 41 6 38 9 31
                C12 24 9 19 15 13
                C21 7 25 10 32 10
                C39 10 43 5 50 5Z"
                fill="#16a34a"
              />

              <path
                d="M29 50
                L43 64
                L72 34"
                fill="none"
                stroke="#ffffff"
                stroke-width="10"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

            </svg>

          </div>

        </div>

      </div>


      <!-- ================= FOOTER ================= -->

      <div class="footer">

        <div class="footer-org">
          Chhatradol Social Welfare Organization
        </div>

        <div class="registration">
          Registration No: IV-100200047/2026
        </div>


        <!-- SOCIAL MEDIA ICONS ONLY -->

        <div class="social-links">

          <!-- Facebook -->

          <a
            href="https://facebook.com/chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/facebook/1877F2"
              alt="Facebook"
            >
          </a>


          <!-- Instagram -->

          <a
            href="https://instagram.com/chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/instagram/E4405F"
              alt="Instagram"
            >
          </a>


          <!-- X -->

          <a
            href="https://x.com/Chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/x/000000"
              alt="X"
            >
          </a>


          <!-- YouTube -->

          <a
            href="https://www.youtube.com/@Chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/youtube/FF0000"
              alt="YouTube"
            >
          </a>

        </div>

      </div>

    </div>

  </div>

</body>
</html>`;
}
async function sendViaResend(resendApiKey, toEmail, toName, subject, htmlContent) {
  try {
    const fromAddress = getResendFromEmail();
    const replyToAddress = getResendReplyTo();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [`${toName} <${toEmail}>`],
        subject,
        html: htmlContent,
        reply_to: replyToAddress,
        tags: [
          { name: "category", value: "payment-receipt" }
        ]
      })
    });
    const result = await response.json();
    if (!response.ok) {
      const errMsg = result.message || result.name || `Resend API error (${response.status})`;
      console.error("[Receipt Email] Resend dispatch failed:", errMsg);
      return { success: false, error: errMsg };
    }
    return { success: true, messageId: result.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error calling Resend API";
    console.error("[Receipt Email] Resend fetch error:", msg);
    return { success: false, error: msg };
  }
}
async function handler6(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    return sendJson6(res, 405, { error: "Method Not Allowed" });
  }
  const expectedSecret = getInternalApiSecret();
  if (expectedSecret) {
    const internalSecret = req.headers["x-internal-secret"] || req.headers["X-Internal-Secret"];
    if (internalSecret !== expectedSecret) {
      console.warn("[Receipt Email] Unauthorized attempt to invoke /api/send-receipt-email directly");
      return sendJson6(res, 401, { error: "Unauthorized: internal secret required" });
    }
  }
  try {
    const body = await parseBody5(req);
    if (!body.recipientEmail || !body.recipientEmail.includes("@")) {
      return sendJson6(res, 400, { error: "recipientEmail is required and must be valid" });
    }
    if (!body.receiptNumber || !body.amount) {
      return sendJson6(res, 400, { error: "receiptNumber and amount are required" });
    }
    const htmlContent = buildReceiptHtml(body);
    const typeLabel = body.type === "contribution" ? "Chhatradol Social Welfare Organization - Monthly Donation Successful" : "Chhatradol Social Welfare Organization - Donation Successful";
    const subject = `${typeLabel}`;
    try {
      const client = getSupabaseClient3();
      if (client) {
        const notifTitle = `Payment Receipt: ${body.receiptNumber}`;
        const { data: existingNotif } = await client.from("cswo_notifications").select("id").eq("title", notifTitle).maybeSingle();
        if (!existingNotif) {
          await client.from("cswo_notifications").insert({
            title: notifTitle,
            body: `Your payment of \u20B9${body.amount} for ${body.purpose || body.month || "CSWO"} was confirmed. Receipt: ${body.receiptNumber}`,
            kind: "payment",
            link: "/member/contributions"
          });
        }
      }
    } catch {
    }
    const resendApiKey = getResendApiKey();
    if (!resendApiKey) {
      console.warn("[Receipt Email] RESEND_API_KEY not configured \u2014 email not sent, but receipt HTML generated.");
      return sendJson6(res, 200, {
        success: false,
        warning: "RESEND_API_KEY not configured. Email was not sent.",
        receiptNumber: body.receiptNumber,
        previewHtml: htmlContent
      });
    }
    const emailResult = await sendViaResend(
      resendApiKey,
      body.recipientEmail,
      body.recipientName || "Valued Supporter",
      subject,
      htmlContent
    );
    if (!emailResult.success) {
      console.error(`[Receipt Email] Failed to send to ${body.recipientEmail}: ${emailResult.error}`);
      return sendJson6(res, 200, {
        success: false,
        warning: `Email dispatch failed: ${emailResult.error}`,
        receiptNumber: body.receiptNumber
      });
    }
    console.log(`[Receipt Email] \u2713 Sent to ${body.recipientEmail} (${body.receiptNumber}) \u2014 Resend ID: ${emailResult.messageId}`);
    return sendJson6(res, 200, {
      success: true,
      message: `Receipt email sent to ${body.recipientEmail}`,
      receiptNumber: body.receiptNumber,
      messageId: emailResult.messageId
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to process receipt email request";
    console.error("[Receipt Email] Handler error:", err);
    return sendJson6(res, 500, { error: msg });
  }
}
var init_send_receipt_email = __esm({
  "api/send-receipt-email.ts"() {
    "use strict";
  }
});

// vite.config.ts
import { defineConfig, loadEnv } from "file:///E:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chatrodol/narajole_chatrodol/node_modules/vite/dist/node/index.js";
import react from "file:///E:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chatrodol/narajole_chatrodol/node_modules/@vitejs/plugin-react/dist/index.js";
import { fileURLToPath, URL as URL2 } from "node:url";
var __vite_injected_original_import_meta_url = "file:///E:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chatrodol/narajole_chatrodol/vite.config.ts";
function apiDevServerPlugin() {
  return {
    name: "api-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split("?")[0] : "";
        if (url === "/api/create-order" || url === "/api/verify-payment" || url === "/api/cashfree-order" || url === "/api/cashfree-verify" || url === "/api/cashfree-webhook" || url === "/api/send-receipt-email") {
          const env = loadEnv("development", process.cwd(), "");
          if (env.RAZORPAY_KEY_ID)
            process.env.RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID;
          if (env.RAZORPAY_KEY_SECRET)
            process.env.RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET;
          if (env.VITE_RAZORPAY_KEY_ID)
            process.env.VITE_RAZORPAY_KEY_ID = env.VITE_RAZORPAY_KEY_ID;
          if (env.CASHFREE_APP_ID)
            process.env.CASHFREE_APP_ID = env.CASHFREE_APP_ID;
          if (env.CASHFREE_SECRET_KEY)
            process.env.CASHFREE_SECRET_KEY = env.CASHFREE_SECRET_KEY;
          if (env.CASHFREE_API_ENV)
            process.env.CASHFREE_API_ENV = env.CASHFREE_API_ENV;
          if (env.RESEND_API_KEY)
            process.env.RESEND_API_KEY = env.RESEND_API_KEY;
          if (env.RESEND_FROM_EMAIL)
            process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL;
          if (env.RESEND_REPLY_TO)
            process.env.RESEND_REPLY_TO = env.RESEND_REPLY_TO;
          if (env.INTERNAL_API_SECRET)
            process.env.INTERNAL_API_SECRET = env.INTERNAL_API_SECRET;
          if (env.SUPABASE_URL)
            process.env.SUPABASE_URL = env.SUPABASE_URL;
          if (env.VITE_SUPABASE_URL)
            process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
          if (env.SUPABASE_SERVICE_ROLE_KEY)
            process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
          if (env.SITE_URL)
            process.env.SITE_URL = env.SITE_URL;
          if (url === "/api/create-order") {
            try {
              const { default: handler7 } = await Promise.resolve().then(() => (init_create_order(), create_order_exports));
              await handler7(req, res);
            } catch (e) {
              console.error(
                "Error in /api/create-order dev middleware:",
                e
              );
              res.statusCode = 500;
              res.setHeader(
                "Content-Type",
                "application/json"
              );
              res.end(
                JSON.stringify({
                  error: e instanceof Error ? e.message : "Internal Server Error"
                })
              );
            }
            return;
          }
          if (url === "/api/verify-payment") {
            try {
              const { default: handler7 } = await Promise.resolve().then(() => (init_verify_payment(), verify_payment_exports));
              await handler7(req, res);
            } catch (e) {
              console.error(
                "Error in /api/verify-payment dev middleware:",
                e
              );
              res.statusCode = 500;
              res.setHeader(
                "Content-Type",
                "application/json"
              );
              res.end(
                JSON.stringify({
                  error: e instanceof Error ? e.message : "Internal Server Error"
                })
              );
            }
            return;
          }
          if (url === "/api/cashfree-order") {
            try {
              const { default: handler7 } = await Promise.resolve().then(() => (init_cashfree_order(), cashfree_order_exports));
              await handler7(req, res);
            } catch (e) {
              console.error(
                "Error in /api/cashfree-order dev middleware:",
                e
              );
              res.statusCode = 500;
              res.setHeader(
                "Content-Type",
                "application/json"
              );
              res.end(
                JSON.stringify({
                  error: e instanceof Error ? e.message : "Internal Server Error"
                })
              );
            }
            return;
          }
          if (url === "/api/cashfree-verify") {
            try {
              const { default: handler7 } = await Promise.resolve().then(() => (init_cashfree_verify(), cashfree_verify_exports));
              await handler7(req, res);
            } catch (e) {
              console.error(
                "Error in /api/cashfree-verify dev middleware:",
                e
              );
              res.statusCode = 500;
              res.setHeader(
                "Content-Type",
                "application/json"
              );
              res.end(
                JSON.stringify({
                  error: e instanceof Error ? e.message : "Internal Server Error"
                })
              );
            }
            return;
          }
          if (url === "/api/cashfree-webhook") {
            try {
              const { default: handler7 } = await Promise.resolve().then(() => (init_cashfree_webhook(), cashfree_webhook_exports));
              await handler7(req, res);
            } catch (e) {
              console.error(
                "Error in /api/cashfree-webhook dev middleware:",
                e
              );
              res.statusCode = 500;
              res.setHeader(
                "Content-Type",
                "application/json"
              );
              res.end(
                JSON.stringify({
                  error: e instanceof Error ? e.message : "Internal Server Error"
                })
              );
            }
            return;
          }
          if (url === "/api/send-receipt-email") {
            try {
              const { default: handler7 } = await Promise.resolve().then(() => (init_send_receipt_email(), send_receipt_email_exports));
              await handler7(req, res);
            } catch (e) {
              console.error(
                "Error in /api/send-receipt-email dev middleware:",
                e
              );
              res.statusCode = 500;
              res.setHeader(
                "Content-Type",
                "application/json"
              );
              res.end(
                JSON.stringify({
                  error: e instanceof Error ? e.message : "Internal Server Error"
                })
              );
            }
            return;
          }
        }
        next();
      });
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.RAZORPAY_KEY_ID)
    process.env.RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID;
  if (env.RAZORPAY_KEY_SECRET)
    process.env.RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET;
  if (env.VITE_RAZORPAY_KEY_ID)
    process.env.VITE_RAZORPAY_KEY_ID = env.VITE_RAZORPAY_KEY_ID;
  if (env.CASHFREE_APP_ID)
    process.env.CASHFREE_APP_ID = env.CASHFREE_APP_ID;
  if (env.CASHFREE_SECRET_KEY)
    process.env.CASHFREE_SECRET_KEY = env.CASHFREE_SECRET_KEY;
  if (env.CASHFREE_API_ENV)
    process.env.CASHFREE_API_ENV = env.CASHFREE_API_ENV;
  if (env.RESEND_API_KEY)
    process.env.RESEND_API_KEY = env.RESEND_API_KEY;
  if (env.RESEND_FROM_EMAIL)
    process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL;
  if (env.RESEND_REPLY_TO)
    process.env.RESEND_REPLY_TO = env.RESEND_REPLY_TO;
  if (env.INTERNAL_API_SECRET)
    process.env.INTERNAL_API_SECRET = env.INTERNAL_API_SECRET;
  return {
    plugins: [
      react(),
      apiDevServerPlugin()
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(
          new URL2("./src", __vite_injected_original_import_meta_url)
        )
      }
    },
    server: {
      port: 5173,
      // Allow external access through ngrok
      host: true,
      // IMPORTANT: Allow ngrok URL
      allowedHosts: [
        "criteria-makeover-june.ngrok-free.dev"
      ]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXBpL2NyZWF0ZS1vcmRlci50cyIsICJhcGkvX2xpYi9wYXltZW50LXN0YXR1cy50cyIsICJhcGkvX2xpYi9maW5hbGl6ZS1wYXltZW50LnRzIiwgImFwaS9fbGliL3BheW1lbnQtcmVjZWlwdC50cyIsICJhcGkvdmVyaWZ5LXBheW1lbnQudHMiLCAiYXBpL2Nhc2hmcmVlLW9yZGVyLnRzIiwgImFwaS9jYXNoZnJlZS12ZXJpZnkudHMiLCAiYXBpL2Nhc2hmcmVlLXdlYmhvb2sudHMiLCAiYXBpL3NlbmQtcmVjZWlwdC1lbWFpbC50cyIsICJ2aXRlLmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXEJBU0lDXFxcXFBlcnNvbmFsXFxcXE15IFN0dWR5XFxcXFNraWxsIFRBU0sgMjAyNVxcXFwwMDIuIFdlYiBEZXZlbG9wbWVudFxcXFwwNC4gT3RoZXJzXFxcXE5hcmFqb2xlIENoYXRyb2RvbFxcXFxuYXJham9sZV9jaGF0cm9kb2xcXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxCQVNJQ1xcXFxQZXJzb25hbFxcXFxNeSBTdHVkeVxcXFxTa2lsbCBUQVNLIDIwMjVcXFxcMDAyLiBXZWIgRGV2ZWxvcG1lbnRcXFxcMDQuIE90aGVyc1xcXFxOYXJham9sZSBDaGF0cm9kb2xcXFxcbmFyYWpvbGVfY2hhdHJvZG9sXFxcXGFwaVxcXFxjcmVhdGUtb3JkZXIudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L0JBU0lDL1BlcnNvbmFsL015JTIwU3R1ZHkvU2tpbGwlMjBUQVNLJTIwMjAyNS8wMDIuJTIwV2ViJTIwRGV2ZWxvcG1lbnQvMDQuJTIwT3RoZXJzL05hcmFqb2xlJTIwQ2hhdHJvZG9sL25hcmFqb2xlX2NoYXRyb2RvbC9hcGkvY3JlYXRlLW9yZGVyLnRzXCI7aW1wb3J0IHR5cGUgeyBJbmNvbWluZ01lc3NhZ2UsIFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnaHR0cCc7XHJcbmltcG9ydCBSYXpvcnBheSBmcm9tICdyYXpvcnBheSc7XHJcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuXHJcbmZ1bmN0aW9uIHNlbmRKc29uKHJlczogU2VydmVyUmVzcG9uc2UsIHN0YXR1c0NvZGU6IG51bWJlciwgZGF0YTogdW5rbm93bikge1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnUE9TVCwgT1BUSU9OUywgR0VUJyk7XHJcbiAgcmVzLnN0YXR1c0NvZGUgPSBzdGF0dXNDb2RlO1xyXG4gIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBwYXJzZUJvZHkocmVxOiBJbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PiB7XHJcbiAgaWYgKChyZXEgYXMgdW5rbm93biBhcyB7IGJvZHk/OiB1bmtub3duIH0pLmJvZHkpIHtcclxuICAgIGNvbnN0IGIgPSAocmVxIGFzIHVua25vd24gYXMgeyBib2R5OiB1bmtub3duIH0pLmJvZHk7XHJcbiAgICByZXR1cm4gdHlwZW9mIGIgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShiKSA6IChiIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KTtcclxuICB9XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGxldCBkYXRhID0gJyc7XHJcbiAgICByZXEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcclxuICAgICAgZGF0YSArPSBjaHVuaztcclxuICAgIH0pO1xyXG4gICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmVzb2x2ZShkYXRhID8gSlNPTi5wYXJzZShkYXRhKSA6IHt9KTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENyZWRlbnRpYWxzKCk6IHsga2V5SWQ6IHN0cmluZzsga2V5U2VjcmV0OiBzdHJpbmcgfSB7XHJcbiAgbGV0IGtleUlkID0gcHJvY2Vzcy5lbnYuUkFaT1JQQVlfS0VZX0lEIHx8IHByb2Nlc3MuZW52LlZJVEVfUkFaT1JQQVlfS0VZX0lEIHx8ICcnO1xyXG4gIGxldCBrZXlTZWNyZXQgPSBwcm9jZXNzLmVudi5SQVpPUlBBWV9LRVlfU0VDUkVUIHx8ICcnO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgZW52UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLmVudicpO1xyXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZW52UGF0aCkpIHtcclxuICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhlbnZQYXRoLCAndXRmLTgnKTtcclxuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoJ1xcbicpKSB7XHJcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xyXG4gICAgICAgIGlmICghdHJpbW1lZCB8fCB0cmltbWVkLnN0YXJ0c1dpdGgoJyMnKSkgY29udGludWU7XHJcbiAgICAgICAgY29uc3QgW2ssIC4uLnZdID0gdHJpbW1lZC5zcGxpdCgnPScpO1xyXG4gICAgICAgIGNvbnN0IGtleSA9IGs/LnRyaW0oKTtcclxuICAgICAgICBjb25zdCB2YWwgPSB2LmpvaW4oJz0nKS50cmltKCkucmVwbGFjZSgvXltcIiddfFtcIiddJC9nLCAnJyk7XHJcbiAgICAgICAgaWYgKGtleSA9PT0gJ1JBWk9SUEFZX0tFWV9JRCcpIGtleUlkID0gdmFsO1xyXG4gICAgICAgIGVsc2UgaWYgKGtleSA9PT0gJ1ZJVEVfUkFaT1JQQVlfS0VZX0lEJyAmJiAha2V5SWQpIGtleUlkID0gdmFsO1xyXG4gICAgICAgIGVsc2UgaWYgKGtleSA9PT0gJ1JBWk9SUEFZX0tFWV9TRUNSRVQnKSBrZXlTZWNyZXQgPSB2YWw7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9IGNhdGNoIHtcclxuICAgIC8vIGZhbGxiYWNrIHRvIHByb2Nlc3MuZW52XHJcbiAgfVxyXG5cclxuICByZXR1cm4geyBrZXlJZCwga2V5U2VjcmV0IH07XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxOiBJbmNvbWluZ01lc3NhZ2UsIHJlczogU2VydmVyUmVzcG9uc2UpIHtcclxuICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcclxuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnUE9TVCwgT1BUSU9OUywgR0VUJyk7XHJcbiAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcclxuICAgIHJlcy5lbmQoKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcclxuICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDQwNSwgeyBlcnJvcjogJ01ldGhvZCBOb3QgQWxsb3dlZC4gVXNlIFBPU1QuJyB9KTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHsga2V5SWQsIGtleVNlY3JldCB9ID0gZ2V0Q3JlZGVudGlhbHMoKTtcclxuXHJcbiAgaWYgKCFrZXlJZCB8fCAha2V5U2VjcmV0KSB7XHJcbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA0MDEsIHtcclxuICAgICAgZXJyb3I6ICdSYXpvcnBheSBBUEkgY3JlZGVudGlhbHMgbm90IGNvbmZpZ3VyZWQuIFBsZWFzZSBzZXQgUkFaT1JQQVlfS0VZX0lEIGFuZCBSQVpPUlBBWV9LRVlfU0VDUkVUIGluIGVudmlyb25tZW50IHZhcmlhYmxlcy4nLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHBhcnNlQm9keShyZXEpO1xyXG4gICAgY29uc3QgYW1vdW50ID0gTnVtYmVyKGJvZHkuYW1vdW50KTtcclxuICAgIGNvbnN0IGN1cnJlbmN5ID0gKGJvZHkuY3VycmVuY3kgYXMgc3RyaW5nKSB8fCAnSU5SJztcclxuICAgIGNvbnN0IHJlY2VpcHQgPSAoYm9keS5yZWNlaXB0IGFzIHN0cmluZykgfHwgYHJjcHRfJHtEYXRlLm5vdygpfWA7XHJcbiAgICBjb25zdCBub3RlcyA9IChib2R5Lm5vdGVzIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pIHx8IHt9O1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGFtb3VudDogbXVzdCBiZSBhdCBsZWFzdCAxMDAgcGFpc2UgKFx1MjBCOTEuMDApXHJcbiAgICBpZiAoIWFtb3VudCB8fCBpc05hTihhbW91bnQpIHx8IGFtb3VudCA8IDEwMCkge1xyXG4gICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA0MDAsIHtcclxuICAgICAgICBlcnJvcjogJ0ludmFsaWQgYW1vdW50LiBNaW5pbXVtIGFtb3VudCBpcyAxMDAgcGFpc2UgKFx1MjBCOTEuMDApLicsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJhem9ycGF5ID0gbmV3IFJhem9ycGF5KHtcclxuICAgICAga2V5X2lkOiBrZXlJZCxcclxuICAgICAga2V5X3NlY3JldDoga2V5U2VjcmV0LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICAgYW1vdW50OiBNYXRoLnJvdW5kKGFtb3VudCksXHJcbiAgICAgIGN1cnJlbmN5OiBjdXJyZW5jeS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICByZWNlaXB0OiBTdHJpbmcocmVjZWlwdCkuc2xpY2UoMCwgNDApLFxyXG4gICAgICBub3RlcyxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3Qgb3JkZXIgPSBhd2FpdCByYXpvcnBheS5vcmRlcnMuY3JlYXRlKG9wdGlvbnMpO1xyXG5cclxuICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDIwMCwge1xyXG4gICAgICBvcmRlcl9pZDogb3JkZXIuaWQsXHJcbiAgICAgIGFtb3VudDogb3JkZXIuYW1vdW50LFxyXG4gICAgICBjdXJyZW5jeTogb3JkZXIuY3VycmVuY3ksXHJcbiAgICAgIGtleV9pZDoga2V5SWQsXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnI6IHVua25vd24pIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIFJhem9ycGF5IG9yZGVyOicsIGVycik7XHJcbiAgICBjb25zdCBlcnJPYmogPSBlcnIgYXMgeyBzdGF0dXNDb2RlPzogbnVtYmVyOyBlcnJvcj86IHsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfTsgbWVzc2FnZT86IHN0cmluZyB9O1xyXG4gICAgY29uc3QgbWVzc2FnZSA9IGVyck9iaj8uZXJyb3I/LmRlc2NyaXB0aW9uIHx8IGVyck9iaj8ubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNyZWF0ZSBvcmRlcic7XHJcbiAgICBjb25zdCBzdGF0dXNDb2RlID0gZXJyT2JqPy5zdGF0dXNDb2RlIHx8IDUwMDtcclxuICAgIHJldHVybiBzZW5kSnNvbihyZXMsIHN0YXR1c0NvZGUsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XHJcbiAgfVxyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcXFxcX2xpYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcXFxcX2xpYlxcXFxwYXltZW50LXN0YXR1cy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovQkFTSUMvUGVyc29uYWwvTXklMjBTdHVkeS9Ta2lsbCUyMFRBU0slMjAyMDI1LzAwMi4lMjBXZWIlMjBEZXZlbG9wbWVudC8wNC4lMjBPdGhlcnMvTmFyYWpvbGUlMjBDaGF0cm9kb2wvbmFyYWpvbGVfY2hhdHJvZG9sL2FwaS9fbGliL3BheW1lbnQtc3RhdHVzLnRzXCI7LyoqXG4gKiBhcGkvX2xpYi9wYXltZW50LXN0YXR1cy50c1xuICpcbiAqIFNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGludGVybmFsIHBheW1lbnQgc3RhdHVzIHZhbHVlcy5cbiAqIEFsbCBnYXRld2F5cyAoQ2FzaGZyZWUsIFJhem9ycGF5KSBub3JtYWxpemUgdGhyb3VnaCBgbm9ybWFsaXplUGF5bWVudFN0YXR1c2AuXG4gKi9cblxuZXhwb3J0IHR5cGUgUGF5bWVudFN0YXR1cyA9XG4gIHwgJ3N0YXJ0aW5nJ1xuICB8ICdwZW5kaW5nJ1xuICB8ICdwYWlkJ1xuICB8ICdmYWlsZWQnXG4gIHwgJ2NhbmNlbGxlZCdcbiAgfCAnZXhwaXJlZCc7XG5cbi8qKlxuICogTWFwcyByYXcgZ2F0ZXdheSBzdGF0dXMgc3RyaW5ncyAob3JkZXJfc3RhdHVzLCBwYXltZW50X3N0YXR1cywgZXZlbnQgdHlwZSlcbiAqIGludG8gb3VyIGludGVybmFsIFBheW1lbnRTdGF0dXMgdHlwZS5cbiAqXG4gKiBSdWxlcyAoZXZhbHVhdGVkIGluIG9yZGVyKTpcbiAqICAgU1VDQ0VTUyAvIFBBSUQgLyBldmVudCBpbmNsdWRlcyBTVUNDRVNTIFx1MjE5MiBwYWlkXG4gKiAgIEZBSUxFRCAvIGV2ZW50IGluY2x1ZGVzIEZBSUxFRCAgICAgICAgICBcdTIxOTIgZmFpbGVkXG4gKiAgIENBTkNFTExFRCAvIFVTRVJfRFJPUFBFRCAvIGV2ZW50IENBTkNFTCBcdTIxOTIgY2FuY2VsbGVkXG4gKiAgIEVYUElSRUQgLyBldmVudCBpbmNsdWRlcyBFWFBJUkVEICAgICAgICBcdTIxOTIgZXhwaXJlZFxuICogICBhbnl0aGluZyBlbHNlICAgICAgICAgICAgICAgICAgICAgICAgICAgXHUyMTkyIHBlbmRpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVBheW1lbnRTdGF0dXMoXG4gIGdhdGV3YXlTdGF0dXM/OiBzdHJpbmcsXG4gIGV2ZW50VHlwZT86IHN0cmluZyxcbik6IFBheW1lbnRTdGF0dXMge1xuICBjb25zdCBzdGF0dXMgPSBTdHJpbmcoZ2F0ZXdheVN0YXR1cyB8fCAnJykudG9VcHBlckNhc2UoKS50cmltKCk7XG4gIGNvbnN0IGV2ZW50ID0gU3RyaW5nKGV2ZW50VHlwZSB8fCAnJykudG9VcHBlckNhc2UoKS50cmltKCk7XG5cbiAgaWYgKFxuICAgIHN0YXR1cyA9PT0gJ1NVQ0NFU1MnIHx8XG4gICAgc3RhdHVzID09PSAnUEFJRCcgfHxcbiAgICBldmVudC5pbmNsdWRlcygnU1VDQ0VTUycpXG4gICkge1xuICAgIHJldHVybiAncGFpZCc7XG4gIH1cblxuICBpZiAoXG4gICAgc3RhdHVzID09PSAnRkFJTEVEJyB8fFxuICAgIGV2ZW50LmluY2x1ZGVzKCdGQUlMRUQnKVxuICApIHtcbiAgICByZXR1cm4gJ2ZhaWxlZCc7XG4gIH1cblxuICBpZiAoXG4gICAgc3RhdHVzID09PSAnQ0FOQ0VMTEVEJyB8fFxuICAgIHN0YXR1cyA9PT0gJ1VTRVJfRFJPUFBFRCcgfHxcbiAgICBldmVudC5pbmNsdWRlcygnQ0FOQ0VMJylcbiAgKSB7XG4gICAgcmV0dXJuICdjYW5jZWxsZWQnO1xuICB9XG5cbiAgaWYgKFxuICAgIHN0YXR1cyA9PT0gJ0VYUElSRUQnIHx8XG4gICAgZXZlbnQuaW5jbHVkZXMoJ0VYUElSRUQnKVxuICApIHtcbiAgICByZXR1cm4gJ2V4cGlyZWQnO1xuICB9XG5cbiAgcmV0dXJuICdwZW5kaW5nJztcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcXFxcX2xpYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcXFxcX2xpYlxcXFxmaW5hbGl6ZS1wYXltZW50LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9CQVNJQy9QZXJzb25hbC9NeSUyMFN0dWR5L1NraWxsJTIwVEFTSyUyMDIwMjUvMDAyLiUyMFdlYiUyMERldmVsb3BtZW50LzA0LiUyME90aGVycy9OYXJham9sZSUyMENoYXRyb2RvbC9uYXJham9sZV9jaGF0cm9kb2wvYXBpL19saWIvZmluYWxpemUtcGF5bWVudC50c1wiOy8qKlxuICogYXBpL19saWIvZmluYWxpemUtcGF5bWVudC50c1xuICpcbiAqIENlbnRyYWwgcGF5bWVudCBmaW5hbGl6ZXIgXHUyMDE0IHRoZSBzaW5nbGUgcGxhY2UgdGhhdCB1cGRhdGVzIFN1cGFiYXNlXG4gKiB3aGVuIGEgcGF5bWVudCBjb21wbGV0ZXMsIGZhaWxzLCBpcyBjYW5jZWxsZWQsIG9yIGV4cGlyZXMuXG4gKlxuICogQ2FsbGVkIGJ5OlxuICogICAtIGNhc2hmcmVlLXdlYmhvb2sudHMgIChzZXJ2ZXItaW5pdGlhdGVkKVxuICogICAtIGNhc2hmcmVlLXZlcmlmeS50cyAgIChjdXN0b21lci1pbml0aWF0ZWQgcG9sbGluZylcbiAqICAgLSB2ZXJpZnktcGF5bWVudC50cyAgICAoUmF6b3JwYXkgc2lnbmF0dXJlIHZlcmlmaWVkKVxuICpcbiAqIEd1YXJhbnRlZXM6XG4gKiAgIC0gUmVxdWlyZXMgU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSBmb3Igc2VjdXJlIHNlcnZlci1zaWRlIGV4ZWN1dGlvbi5cbiAqICAgLSBOZXZlciBkb3duZ3JhZGVzIGEgJ3BhaWQnIHJlY29yZCB0byBmYWlsZWQvY2FuY2VsbGVkLlxuICogICAtIEdlbmVyYXRlcyBjb2xsaXNpb24tcmVzaXN0YW50IHJlY2VpcHRfbnVtYmVyIGV4YWN0bHkgb25jZSB1c2luZyBVVUlELlxuICogICAtIFNldHMgcmVjZWlwdF9lbWFpbF9zdGF0dXMgPSAncGVuZGluZycgb25seSB3aGVuIGVtYWlsIGhhc24ndCBiZWVuIHNlbnQgeWV0LlxuICogICAtIFJldHVybnMgc2hvdWxkU2VuZFJlY2VpcHQgZmxhZyBzbyBjYWxsZXJzIGNhbiBmaXJlIGVtYWlsLlxuICovXG5cbmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XG5pbXBvcnQgeyBub3JtYWxpemVQYXltZW50U3RhdHVzIH0gZnJvbSAnLi9wYXltZW50LXN0YXR1cyc7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5cbi8vIFx1MjUwMFx1MjUwMCBTdXBhYmFzZSAoc2VydmljZSByb2xlIFx1MjAxNCBieXBhc3NlcyBSTFMgZm9yIHNlcnZlci1zaWRlIHdyaXRlcykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGdldEVudlZhbHVlKGtleTogc3RyaW5nLCBmYWxsYmFjayA9ICcnKTogc3RyaW5nIHtcbiAgaWYgKHByb2Nlc3MuZW52W2tleV0pIHJldHVybiBwcm9jZXNzLmVudltrZXldIGFzIHN0cmluZztcbiAgdHJ5IHtcbiAgICBjb25zdCBlbnZQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52Jyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZW52UGF0aCkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZW52UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xuICAgICAgICBpZiAoIXRyaW1tZWQgfHwgdHJpbW1lZC5zdGFydHNXaXRoKCcjJykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBbaywgLi4udl0gPSB0cmltbWVkLnNwbGl0KCc9Jyk7XG4gICAgICAgIGlmIChrPy50cmltKCkgPT09IGtleSkge1xuICAgICAgICAgIHJldHVybiB2LmpvaW4oJz0nKS50cmltKCkucmVwbGFjZSgvXltcIiddfFtcIiddJC9nLCAnJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIGZhbGxiYWNrXG4gIH1cbiAgcmV0dXJuIGZhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBnZXRTdXBhYmFzZUNsaWVudCgpIHtcbiAgY29uc3QgdXJsID1cbiAgICBnZXRFbnZWYWx1ZSgnU1VQQUJBU0VfVVJMJykgfHxcbiAgICBnZXRFbnZWYWx1ZSgnVklURV9TVVBBQkFTRV9VUkwnLCAnaHR0cHM6Ly93enF1c3pibWJwa2JoeXl0aGRyai5zdXBhYmFzZS5jbycpO1xuXG4gIGNvbnN0IGtleSA9IGdldEVudlZhbHVlKCdTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZJyk7XG5cbiAgaWYgKCF1cmwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NVUEFCQVNFX1VSTCBpcyBub3QgY29uZmlndXJlZCcpO1xuICB9XG5cbiAgaWYgKCFrZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkgaXMgcmVxdWlyZWQgZm9yIGJhY2tlbmQgcGF5bWVudCBmaW5hbGl6YXRpb24nKTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVDbGllbnQodXJsLCBrZXkpO1xufVxuXG4vLyBcdTI1MDBcdTI1MDAgVHlwZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgR2F0ZXdheSA9ICdjYXNoZnJlZScgfCAncmF6b3JwYXknO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZpbmFsaXplUGF5bWVudElucHV0IHtcbiAgZ2F0ZXdheTogR2F0ZXdheTtcbiAgLyoqIFRoZSBnYXRld2F5IG9yZGVyIElEIChjYXNoZnJlZV9vcmRlcl9pZCBvciByYXpvcnBheV9vcmRlcl9pZCkgKi9cbiAgb3JkZXJJZDogc3RyaW5nO1xuICAvKiogVGhlIGdhdGV3YXkgcGF5bWVudC90cmFuc2FjdGlvbiBJRCAqL1xuICBwYXltZW50SWQ/OiBzdHJpbmc7XG4gIC8qKiBSYXcgc3RhdHVzIHN0cmluZyBmcm9tIHRoZSBnYXRld2F5ICovXG4gIGdhdGV3YXlTdGF0dXM/OiBzdHJpbmc7XG4gIC8qKiBSYXcgZXZlbnQgdHlwZSBzdHJpbmcgZnJvbSBhIHdlYmhvb2sgcGF5bG9hZCAqL1xuICBldmVudFR5cGU/OiBzdHJpbmc7XG4gIC8qKiBIdW1hbi1yZWFkYWJsZSBwYXltZW50IG1ldGhvZCBsYWJlbCAqL1xuICBwYXltZW50TWV0aG9kPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZpbmFsaXplUGF5bWVudFJlc3VsdCB7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIGFscmVhZHlQcm9jZXNzZWQ/OiBib29sZWFuO1xuICB0eXBlPzogJ2RvbmF0aW9uJyB8ICdjb250cmlidXRpb24nO1xuICBzdGF0dXM/OiBzdHJpbmc7XG4gIHJlY29yZD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAvKiogRm9yIGEgYnVsayBcIlBheSBBbGxcIiBjb250cmlidXRpb24gYmF0Y2g6IHNpYmxpbmcgcm93IGlkcyBzaGFyaW5nIHRoaXNcbiAgICogIHJlY2VpcHQsIGJleW9uZCByZWNvcmQuaWQsIHRoYXQgYWxzbyBuZWVkIG1hcmtpbmcgJ3NlbnQnLiAqL1xuICBsaW5rZWRSZWNvcmRJZHM/OiBzdHJpbmdbXTtcbiAgc2hvdWxkU2VuZFJlY2VpcHQ/OiBib29sZWFuO1xuICBwYXltZW50TWV0aG9kPzogc3RyaW5nO1xuICBlcnJvcj86IHN0cmluZztcbiAgb3JkZXJJZD86IHN0cmluZztcbn1cblxuLy8gXHUyNTAwXHUyNTAwIFJlY2VpcHQgbnVtYmVyIGdlbmVyYXRvcnMgKGNvbGxpc2lvbi1zYWZlKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gZ2VuZXJhdGVEb25hdGlvblJlY2VpcHQoKTogc3RyaW5nIHtcbiAgY29uc3QgcmFuZCA9IGNyeXB0by5yYW5kb21VVUlEKCkucmVwbGFjZSgvLS9nLCAnJykuc2xpY2UoMCwgOCkudG9VcHBlckNhc2UoKTtcbiAgcmV0dXJuIGBDU1dPLURPTi0ke0RhdGUubm93KCkudG9TdHJpbmcoKS5zbGljZSgtNil9LSR7cmFuZH1gO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNvbnRyaWJ1dGlvblJlY2VpcHQoKTogc3RyaW5nIHtcbiAgY29uc3QgcmFuZCA9IGNyeXB0by5yYW5kb21VVUlEKCkucmVwbGFjZSgvLS9nLCAnJykuc2xpY2UoMCwgOCkudG9VcHBlckNhc2UoKTtcbiAgcmV0dXJuIGBDU1dPLU1CUi0ke0RhdGUubm93KCkudG9TdHJpbmcoKS5zbGljZSgtNil9LSR7cmFuZH1gO1xufVxuXG5jb25zdCBNT05USF9OQU1FUyA9IFtcbiAgJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJyxcbiAgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJyxcbl07XG5cbi8qKlxuICogUmVjb3ZlcnMgdGhlIGRvbmF0aW9uIGlkIGVtYmVkZGVkIGluIGEgZ2F0ZXdheSBvcmRlciBpZC5cbiAqXG4gKiBPcmRlciBpZHMgYXJlIGJ1aWx0IGNsaWVudC1zaWRlIGFzIGBkXzx1dWlkLXdpdGhvdXQtZGFzaGVzPl88dGltZXN0YW1wPmBcbiAqIChzZWUgZG9uYXRpb25SZWNlaXB0VGFnKCkgaW4gc3JjL2xpYi9jb250cmlidXRpb25zLnRzKS4gQmVjYXVzZSB0aGUgZnVsbFxuICogVVVJRCBpcyBjYXJyaWVkIGluIHRoZSBvcmRlciBpZCBpdHNlbGYsIGEgcGF5bWVudCBjYW4gc3RpbGwgYmUgbWF0Y2hlZCB0b1xuICogaXRzIGRvbmF0aW9uIGV2ZW4gaWYgdGhlIGNsaWVudC1zaWRlIFwiYXR0YWNoIHRoZSBvcmRlciBpZFwiIHdyaXRlIG5ldmVyXG4gKiBsYW5kZWQgXHUyMDE0IHdoaWNoIGlzIGV4YWN0bHkgdGhlIGZhaWx1cmUgdGhhdCBsZWZ0IHJlYWwgcGFpZCBkb25hdGlvbnNcbiAqIHN0cmFuZGVkIGFzICdjcmVhdGVkJy4gUmV0dXJucyBudWxsIHdoZW4gdGhlIG9yZGVyIGlkIHByZWRhdGVzIHRoaXNcbiAqIHNjaGVtZSBvciBpc24ndCBhIGRvbmF0aW9uIG9yZGVyLlxuICovXG5mdW5jdGlvbiBwYXJzZURvbmF0aW9uSWRGcm9tT3JkZXJJZChvcmRlcklkOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSAvXmRfKFswLTlhLWZdezMyfSkoPzpffCQpL2kuZXhlYyhvcmRlcklkKTtcbiAgaWYgKCFtYXRjaCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGhleCA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBbXG4gICAgaGV4LnNsaWNlKDAsIDgpLFxuICAgIGhleC5zbGljZSg4LCAxMiksXG4gICAgaGV4LnNsaWNlKDEyLCAxNiksXG4gICAgaGV4LnNsaWNlKDE2LCAyMCksXG4gICAgaGV4LnNsaWNlKDIwLCAzMiksXG4gIF0uam9pbignLScpO1xufVxuXG4vLyBcdTI1MDBcdTI1MDAgTWFpbiBmaW5hbGl6ZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5hbGl6ZVBheW1lbnQoXG4gIGlucHV0OiBGaW5hbGl6ZVBheW1lbnRJbnB1dCxcbik6IFByb21pc2U8RmluYWxpemVQYXltZW50UmVzdWx0PiB7XG4gIGNvbnN0IHsgZ2F0ZXdheSwgb3JkZXJJZCwgcGF5bWVudElkLCBnYXRld2F5U3RhdHVzLCBldmVudFR5cGUsIHBheW1lbnRNZXRob2QgfSA9IGlucHV0O1xuXG4gIGNvbnN0IHN0YXR1cyA9IG5vcm1hbGl6ZVBheW1lbnRTdGF0dXMoZ2F0ZXdheVN0YXR1cywgZXZlbnRUeXBlKTtcblxuICBjb25zdCBzdXBhYmFzZSA9IGdldFN1cGFiYXNlQ2xpZW50KCk7XG5cbiAgLy8gQ29sdW1uIG5hbWVzIHZhcnkgYnkgZ2F0ZXdheVxuICBjb25zdCBvcmRlckNvbHVtbiA9XG4gICAgZ2F0ZXdheSA9PT0gJ2Nhc2hmcmVlJyA/ICdjYXNoZnJlZV9vcmRlcl9pZCcgOiAncmF6b3JwYXlfb3JkZXJfaWQnO1xuICBjb25zdCBwYXltZW50Q29sdW1uID1cbiAgICBnYXRld2F5ID09PSAnY2FzaGZyZWUnID8gJ2Nhc2hmcmVlX3BheW1lbnRfaWQnIDogJ3Jhem9ycGF5X3BheW1lbnRfaWQnO1xuXG4gIC8vIFx1MjUwMFx1MjUwMCAxLiBUcnkgZG9uYXRpb25zIGZpcnN0IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGxldCB7IGRhdGE6IGRvbmF0aW9uLCBlcnJvcjogZG9uRmV0Y2hFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAuZnJvbSgnY3N3b19kb25hdGlvbnMnKVxuICAgIC5zZWxlY3QoJyonKVxuICAgIC5lcShvcmRlckNvbHVtbiwgb3JkZXJJZClcbiAgICAubWF5YmVTaW5nbGUoKTtcblxuICBpZiAoZG9uRmV0Y2hFcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tmaW5hbGl6ZVBheW1lbnRdIEVycm9yIGZldGNoaW5nIGRvbmF0aW9uOicsIGRvbkZldGNoRXJyb3IpO1xuICB9XG5cbiAgLy8gRmFsbGJhY2s6IHRoZSBvcmRlciBpZCBpdHNlbGYgY2FycmllcyB0aGUgZG9uYXRpb24ncyBVVUlELCBzbyBhIHBheW1lbnRcbiAgLy8gY2FuIHN0aWxsIGJlIG1hdGNoZWQgZXZlbiBpZiB0aGUgY2xpZW50IG5ldmVyIG1hbmFnZWQgdG8gd3JpdGUgdGhlXG4gIC8vIG9yZGVyIGlkIG9udG8gdGhlIHJvdy4gQWxzbyBiYWNrZmlsbHMgdGhlIGxpbmsgc28gbGF0ZXIgbG9va3VwcyBoaXRcbiAgLy8gdGhlIGZhc3QgcGF0aC5cbiAgaWYgKCFkb25hdGlvbikge1xuICAgIGNvbnN0IGVtYmVkZGVkSWQgPSBwYXJzZURvbmF0aW9uSWRGcm9tT3JkZXJJZChvcmRlcklkKTtcbiAgICBpZiAoZW1iZWRkZWRJZCkge1xuICAgICAgY29uc3QgeyBkYXRhOiBieUlkIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgnY3N3b19kb25hdGlvbnMnKVxuICAgICAgICAuc2VsZWN0KCcqJylcbiAgICAgICAgLmVxKCdpZCcsIGVtYmVkZGVkSWQpXG4gICAgICAgIC5tYXliZVNpbmdsZSgpO1xuXG4gICAgICBpZiAoYnlJZCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYFtmaW5hbGl6ZVBheW1lbnRdIERvbmF0aW9uICR7ZW1iZWRkZWRJZH0gd2FzIG5vdCBsaW5rZWQgdG8gb3JkZXIgJHtvcmRlcklkfTsgcmVjb3ZlcmVkIHZpYSBlbWJlZGRlZCBpZCBhbmQgYmFja2ZpbGxpbmcuYCxcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgeyBkYXRhOiByZWxpbmtlZCB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgICAuZnJvbSgnY3N3b19kb25hdGlvbnMnKVxuICAgICAgICAgIC51cGRhdGUoeyBbb3JkZXJDb2x1bW5dOiBvcmRlcklkIH0pXG4gICAgICAgICAgLmVxKCdpZCcsIGVtYmVkZGVkSWQpXG4gICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgLnNpbmdsZSgpO1xuXG4gICAgICAgIGRvbmF0aW9uID0gcmVsaW5rZWQgfHwgYnlJZDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZG9uYXRpb24pIHtcbiAgICAvLyBOZXZlciBkb3duZ3JhZGUgYSBwYWlkIHJlY29yZFxuICAgIGlmIChkb25hdGlvbi5zdGF0dXMgPT09ICdwYWlkJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgYWxyZWFkeVByb2Nlc3NlZDogdHJ1ZSxcbiAgICAgICAgdHlwZTogJ2RvbmF0aW9uJyxcbiAgICAgICAgc3RhdHVzOiAncGFpZCcsXG4gICAgICAgIHJlY29yZDogZG9uYXRpb24sXG4gICAgICAgIHNob3VsZFNlbmRSZWNlaXB0OlxuICAgICAgICAgIGRvbmF0aW9uLnJlY2VpcHRfZW1haWxfc3RhdHVzICE9PSAnc2VudCcgJiYgISFkb25hdGlvbi5yZWNlaXB0X251bWJlcixcbiAgICAgICAgcGF5bWVudE1ldGhvZCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgdXBkYXRlRGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgICBzdGF0dXMsXG4gICAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfTtcblxuICAgIGlmIChwYXltZW50SWQpIHtcbiAgICAgIHVwZGF0ZURhdGFbcGF5bWVudENvbHVtbl0gPSBwYXltZW50SWQ7XG4gICAgfVxuXG4gICAgaWYgKHN0YXR1cyA9PT0gJ3BhaWQnKSB7XG4gICAgICB1cGRhdGVEYXRhLnJlY2VpcHRfbnVtYmVyID1cbiAgICAgICAgZG9uYXRpb24ucmVjZWlwdF9udW1iZXIgfHwgZ2VuZXJhdGVEb25hdGlvblJlY2VpcHQoKTtcblxuICAgICAgLy8gT25seSBzZXQgdG8gJ3BlbmRpbmcnIGlmIHRoZSBlbWFpbCBoYXMgbm90IGJlZW4gc2VudCB5ZXRcbiAgICAgIHVwZGF0ZURhdGEucmVjZWlwdF9lbWFpbF9zdGF0dXMgPVxuICAgICAgICBkb25hdGlvbi5yZWNlaXB0X2VtYWlsX3N0YXR1cyA9PT0gJ3NlbnQnID8gJ3NlbnQnIDogJ3BlbmRpbmcnO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZGF0YTogdXBkYXRlZCwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnY3N3b19kb25hdGlvbnMnKVxuICAgICAgLnVwZGF0ZSh1cGRhdGVEYXRhKVxuICAgICAgLmVxKCdpZCcsIGRvbmF0aW9uLmlkKVxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuc2luZ2xlKCk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICB0eXBlOiAnZG9uYXRpb24nLFxuICAgICAgc3RhdHVzLFxuICAgICAgcmVjb3JkOiB1cGRhdGVkLFxuICAgICAgc2hvdWxkU2VuZFJlY2VpcHQ6XG4gICAgICAgIHN0YXR1cyA9PT0gJ3BhaWQnICYmXG4gICAgICAgICh1cGRhdGVkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5yZWNlaXB0X2VtYWlsX3N0YXR1cyAhPT0gJ3NlbnQnLFxuICAgICAgcGF5bWVudE1ldGhvZCxcbiAgICB9O1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwIDIuIFRyeSBtb250aGx5IGNvbnRyaWJ1dGlvbnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIC8vIEEgc2luZ2xlIGdhdGV3YXkgb3JkZXIgY2FuIGNvdmVyIG11bHRpcGxlIG1vbnRocyBhdCBvbmNlIChcIlBheSBBbGxcIiksIHNvXG4gIC8vIHNldmVyYWwgcm93cyBtYXkgc2hhcmUgdGhlIHNhbWUgb3JkZXIgaWQgXHUyMDE0IGZldGNoIGFsbCBvZiB0aGVtLCBub3QganVzdCBvbmUuXG5cbiAgY29uc3QgeyBkYXRhOiBjb250cmlidXRpb25zLCBlcnJvcjogY29uRmV0Y2hFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAuZnJvbSgnY3N3b19tb250aGx5X2NvbnRyaWJ1dGlvbnMnKVxuICAgIC5zZWxlY3QoJyosIG1lbWJlcjpjc3dvX21lbWJlcnMoaWQsIGZ1bGxfbmFtZSwgZW1haWwsIHBob25lKScpXG4gICAgLmVxKG9yZGVyQ29sdW1uLCBvcmRlcklkKTtcblxuICBpZiAoY29uRmV0Y2hFcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tmaW5hbGl6ZVBheW1lbnRdIEVycm9yIGZldGNoaW5nIGNvbnRyaWJ1dGlvbjonLCBjb25GZXRjaEVycm9yKTtcbiAgfVxuXG4gIGlmIChjb250cmlidXRpb25zICYmIGNvbnRyaWJ1dGlvbnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZpcnN0ID0gY29udHJpYnV0aW9uc1swXTtcbiAgICBjb25zdCBtZW1iZXJPYmogPSBmaXJzdC5tZW1iZXIgYXMgeyBmdWxsX25hbWU/OiBzdHJpbmc7IGVtYWlsPzogc3RyaW5nOyBwaG9uZT86IHN0cmluZyB9IHwgbnVsbDtcbiAgICBjb25zdCBtZW1iZXJOYW1lID0gbWVtYmVyT2JqPy5mdWxsX25hbWUgfHwgJ01lbWJlcic7XG4gICAgY29uc3QgbWVtYmVyRW1haWwgPSBtZW1iZXJPYmo/LmVtYWlsIHx8ICcnO1xuXG4gICAgY29uc3QgbW9udGhzTGFiZWwgPSBjb250cmlidXRpb25zXG4gICAgICAubWFwKChjKSA9PiBgJHtNT05USF9OQU1FU1soYy5tb250aCBhcyBudW1iZXIpIC0gMV0gfHwgYy5tb250aH0vJHtjLnllYXJ9YClcbiAgICAgIC5qb2luKCcsICcpO1xuICAgIGNvbnN0IHRvdGFsQW1vdW50ID0gY29udHJpYnV0aW9ucy5yZWR1Y2UoKHN1bSwgYykgPT4gc3VtICsgTnVtYmVyKGMuYW1vdW50IHx8IDApLCAwKTtcblxuICAgIC8vIE5ldmVyIGRvd25ncmFkZSBhbHJlYWR5LXBhaWQgcm93czsgb25seSBhY3Qgb24gdGhlIG9uZXMgc3RpbGwgcGVuZGluZy5cbiAgICBjb25zdCB1bnBhaWQgPSBjb250cmlidXRpb25zLmZpbHRlcigoYykgPT4gYy5zdGF0dXMgIT09ICdwYWlkJyk7XG5cbiAgICBpZiAodW5wYWlkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgYWxyZWFkeVByb2Nlc3NlZDogdHJ1ZSxcbiAgICAgICAgdHlwZTogJ2NvbnRyaWJ1dGlvbicsXG4gICAgICAgIHN0YXR1czogJ3BhaWQnLFxuICAgICAgICByZWNvcmQ6IHtcbiAgICAgICAgICAuLi5maXJzdCxcbiAgICAgICAgICBtZW1iZXJfbmFtZTogbWVtYmVyTmFtZSxcbiAgICAgICAgICBtZW1iZXJfZW1haWw6IG1lbWJlckVtYWlsLFxuICAgICAgICAgIGFtb3VudDogdG90YWxBbW91bnQsXG4gICAgICAgICAgcHVycG9zZTogYE1vbnRobHkgRHVlcyBcdTIwMTQgJHttb250aHNMYWJlbH1gLFxuICAgICAgICB9LFxuICAgICAgICBzaG91bGRTZW5kUmVjZWlwdDpcbiAgICAgICAgICBmaXJzdC5yZWNlaXB0X2VtYWlsX3N0YXR1cyAhPT0gJ3NlbnQnICYmICEhZmlyc3QucmVjZWlwdF9udW1iZXIsXG4gICAgICAgIHBheW1lbnRNZXRob2QsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHNoYXJlZFJlY2VpcHROdW1iZXIgPVxuICAgICAgY29udHJpYnV0aW9ucy5maW5kKChjKSA9PiBjLnJlY2VpcHRfbnVtYmVyKT8ucmVjZWlwdF9udW1iZXIgfHxcbiAgICAgIGdlbmVyYXRlQ29udHJpYnV0aW9uUmVjZWlwdCgpO1xuXG4gICAgY29uc3QgdXBkYXRlRGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgICBzdGF0dXMsXG4gICAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfTtcblxuICAgIGlmIChwYXltZW50SWQpIHtcbiAgICAgIHVwZGF0ZURhdGFbcGF5bWVudENvbHVtbl0gPSBwYXltZW50SWQ7XG4gICAgfVxuXG4gICAgaWYgKHN0YXR1cyA9PT0gJ3BhaWQnKSB7XG4gICAgICB1cGRhdGVEYXRhLnBhaWRfYXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICB1cGRhdGVEYXRhLnBheW1lbnRfbWV0aG9kID0gcGF5bWVudE1ldGhvZCB8fCAoZ2F0ZXdheSA9PT0gJ2Nhc2hmcmVlJyA/ICdjYXNoZnJlZScgOiAncmF6b3JwYXknKTtcbiAgICAgIHVwZGF0ZURhdGEucmVjZWlwdF9udW1iZXIgPSBzaGFyZWRSZWNlaXB0TnVtYmVyO1xuICAgICAgdXBkYXRlRGF0YS5yZWNlaXB0X2VtYWlsX3N0YXR1cyA9ICdwZW5kaW5nJztcbiAgICB9XG5cbiAgICBjb25zdCB7IGRhdGE6IHVwZGF0ZWRSb3dzLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdjc3dvX21vbnRobHlfY29udHJpYnV0aW9ucycpXG4gICAgICAudXBkYXRlKHVwZGF0ZURhdGEpXG4gICAgICAuaW4oJ2lkJywgdW5wYWlkLm1hcCgoYykgPT4gYy5pZCkpXG4gICAgICAuc2VsZWN0KCcqLCBtZW1iZXI6Y3N3b19tZW1iZXJzKGlkLCBmdWxsX25hbWUsIGVtYWlsLCBwaG9uZSknKTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICBjb25zdCB1cGRhdGVkRmlyc3QgPSAodXBkYXRlZFJvd3MgJiYgdXBkYXRlZFJvd3NbMF0pIHx8IGZpcnN0O1xuICAgIGNvbnN0IHVwZGF0ZWRNZW1iZXIgPSB1cGRhdGVkRmlyc3QubWVtYmVyIGFzIHsgZnVsbF9uYW1lPzogc3RyaW5nOyBlbWFpbD86IHN0cmluZyB9IHwgbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgdHlwZTogJ2NvbnRyaWJ1dGlvbicsXG4gICAgICBzdGF0dXMsXG4gICAgICByZWNvcmQ6IHtcbiAgICAgICAgLi4udXBkYXRlZEZpcnN0LFxuICAgICAgICBtZW1iZXJfbmFtZTogdXBkYXRlZE1lbWJlcj8uZnVsbF9uYW1lIHx8IG1lbWJlck5hbWUsXG4gICAgICAgIG1lbWJlcl9lbWFpbDogdXBkYXRlZE1lbWJlcj8uZW1haWwgfHwgbWVtYmVyRW1haWwsXG4gICAgICAgIGFtb3VudDogdG90YWxBbW91bnQsXG4gICAgICAgIHB1cnBvc2U6IGBNb250aGx5IER1ZXMgXHUyMDE0ICR7bW9udGhzTGFiZWx9YCxcbiAgICAgICAgcmVjZWlwdF9udW1iZXI6IHNoYXJlZFJlY2VpcHROdW1iZXIsXG4gICAgICAgIHJlY2VpcHRfZW1haWxfc3RhdHVzOiBzdGF0dXMgPT09ICdwYWlkJyA/ICdwZW5kaW5nJyA6IHVwZGF0ZWRGaXJzdC5yZWNlaXB0X2VtYWlsX3N0YXR1cyxcbiAgICAgIH0sXG4gICAgICBsaW5rZWRSZWNvcmRJZHM6IHVucGFpZC5zbGljZSgxKS5tYXAoKGMpID0+IGMuaWQgYXMgc3RyaW5nKSxcbiAgICAgIHNob3VsZFNlbmRSZWNlaXB0OiBzdGF0dXMgPT09ICdwYWlkJyxcbiAgICAgIHBheW1lbnRNZXRob2QsXG4gICAgfTtcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMCBSZWNvcmQgbm90IGZvdW5kIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHJldHVybiB7XG4gICAgc3VjY2VzczogZmFsc2UsXG4gICAgZXJyb3I6ICdQYXltZW50IHJlY29yZCBub3QgZm91bmQgaW4gZG9uYXRpb25zIG9yIG1vbnRobHkgY29udHJpYnV0aW9ucycsXG4gICAgb3JkZXJJZCxcbiAgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcXFxcX2xpYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcXFxcX2xpYlxcXFxwYXltZW50LXJlY2VpcHQudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L0JBU0lDL1BlcnNvbmFsL015JTIwU3R1ZHkvU2tpbGwlMjBUQVNLJTIwMjAyNS8wMDIuJTIwV2ViJTIwRGV2ZWxvcG1lbnQvMDQuJTIwT3RoZXJzL05hcmFqb2xlJTIwQ2hhdHJvZG9sL25hcmFqb2xlX2NoYXRyb2RvbC9hcGkvX2xpYi9wYXltZW50LXJlY2VpcHQudHNcIjsvKipcbiAqIGFwaS9fbGliL3BheW1lbnQtcmVjZWlwdC50c1xuICpcbiAqIFNhZmUsIGF0b21pYywgaWRlbXBvdGVudCByZWNlaXB0IGVtYWlsIHNlbmRlci5cbiAqXG4gKiBHdWFyYW50ZWVzOlxuICogICAtIEF0b21pYyBjbGFpbWluZzogVXNlcyBjb25kaXRpb25hbCBkYXRhYmFzZSB1cGRhdGUgKC5pbigncmVjZWlwdF9lbWFpbF9zdGF0dXMnLCBbJ3BlbmRpbmcnLCAnZmFpbGVkJywgbnVsbF0pKVxuICogICAgIHRvIHByZXZlbnQgc2ltdWx0YW5lb3VzIHdlYmhvb2sgYW5kIHZlcmlmeSBBUEkgcmFjZSBjb25kaXRpb25zLlxuICogICAtIFN0cmljdGx5IHJlcXVpcmVzIFNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkuXG4gKiAgIC0gRGlzcGF0Y2hlcyByZWNlaXB0IGVtYWlsIHRvIC9hcGkvc2VuZC1yZWNlaXB0LWVtYWlsLlxuICogICAtIE9uIHN1Y2Nlc3M6IG1hcmtzICdzZW50JyArIHN0b3JlcyBtZXNzYWdlX2lkICsgY2xlYXJzIGVycm9yLlxuICogICAtIE9uIGZhaWx1cmU6IG1hcmtzICdmYWlsZWQnICsgc3RvcmVzIGVycm9yIG1lc3NhZ2UuXG4gKiAgIC0gSW5jcmVtZW50cyByZWNlaXB0X2VtYWlsX2F0dGVtcHRzIG9uIGV2ZXJ5IGF0dGVtcHQuXG4gKi9cblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJztcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5cbi8vIFx1MjUwMFx1MjUwMCBTdXBhYmFzZSBoZWxwZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGdldEVudlZhbHVlKGtleTogc3RyaW5nLCBmYWxsYmFjayA9ICcnKTogc3RyaW5nIHtcbiAgaWYgKHByb2Nlc3MuZW52W2tleV0pIHJldHVybiBwcm9jZXNzLmVudltrZXldIGFzIHN0cmluZztcbiAgdHJ5IHtcbiAgICBjb25zdCBlbnZQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52Jyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZW52UGF0aCkpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZW52UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xuICAgICAgICBpZiAoIXRyaW1tZWQgfHwgdHJpbW1lZC5zdGFydHNXaXRoKCcjJykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBbaywgLi4udl0gPSB0cmltbWVkLnNwbGl0KCc9Jyk7XG4gICAgICAgIGlmIChrPy50cmltKCkgPT09IGtleSkge1xuICAgICAgICAgIHJldHVybiB2LmpvaW4oJz0nKS50cmltKCkucmVwbGFjZSgvXltcIiddfFtcIiddJC9nLCAnJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIGZhbGxiYWNrXG4gIH1cbiAgcmV0dXJuIGZhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBnZXRTdXBhYmFzZUNsaWVudCgpIHtcbiAgY29uc3QgdXJsID1cbiAgICBnZXRFbnZWYWx1ZSgnU1VQQUJBU0VfVVJMJykgfHxcbiAgICBnZXRFbnZWYWx1ZSgnVklURV9TVVBBQkFTRV9VUkwnLCAnaHR0cHM6Ly93enF1c3pibWJwa2JoeXl0aGRyai5zdXBhYmFzZS5jbycpO1xuXG4gIGNvbnN0IGtleSA9IGdldEVudlZhbHVlKCdTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZJyk7XG5cbiAgaWYgKCF1cmwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NVUEFCQVNFX1VSTCBpcyBub3QgY29uZmlndXJlZCcpO1xuICB9XG5cbiAgaWYgKCFrZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkgaXMgcmVxdWlyZWQgZm9yIHNlbmRpbmcgcGF5bWVudCByZWNlaXB0cycpO1xuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZUNsaWVudCh1cmwsIGtleSk7XG59XG5cbi8vIFx1MjUwMFx1MjUwMCBUeXBlcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGludGVyZmFjZSBSZWNlaXB0SW5wdXQge1xuICB0eXBlOiAnZG9uYXRpb24nIHwgJ2NvbnRyaWJ1dGlvbic7XG4gIHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIHBheW1lbnRNZXRob2Q/OiBzdHJpbmc7XG4gIC8qKiBGb3JjZSBzZW5kIGV2ZW4gaWYgcmVjZWlwdF9lbWFpbF9zdGF0dXMgaXMgYWxyZWFkeSAnc2VudCcgb3IgJ3NlbmRpbmcnICovXG4gIGZvcmNlUmVzZW5kPzogYm9vbGVhbjtcbiAgLyoqIFNpYmxpbmcgcm93IGlkcyAoYnVsayBcIlBheSBBbGxcIiBjb250cmlidXRpb24gYmF0Y2gpIGNvdmVyZWQgYnkgdGhlIHNhbWVcbiAgICogIGVtYWlsIGFzIGByZWNvcmRgIFx1MjAxNCBtYXJrZWQgJ3NlbnQnIGFsb25nc2lkZSBpdCwgbmV2ZXIgZW1haWxlZCBzZXBhcmF0ZWx5LiAqL1xuICBsaW5rZWRSZWNvcmRJZHM/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWNlaXB0UmVzdWx0IHtcbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgc2tpcHBlZD86IGJvb2xlYW47XG4gIHJlYXNvbj86IHN0cmluZztcbiAgbWVzc2FnZUlkPzogc3RyaW5nO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuLy8gXHUyNTAwXHUyNTAwIE1haW4gc2VuZGVyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZFBheW1lbnRSZWNlaXB0KFxuICBpbnB1dDogUmVjZWlwdElucHV0LFxuKTogUHJvbWlzZTxSZWNlaXB0UmVzdWx0PiB7XG4gIGNvbnN0IHsgdHlwZSwgcmVjb3JkLCBwYXltZW50TWV0aG9kLCBmb3JjZVJlc2VuZCA9IGZhbHNlLCBsaW5rZWRSZWNvcmRJZHMgPSBbXSB9ID0gaW5wdXQ7XG5cbiAgaWYgKCFyZWNvcmQgfHwgIXJlY29yZC5pZCkge1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ludmFsaWQgcmVjb3JkIHN1cHBsaWVkIHRvIHNlbmRQYXltZW50UmVjZWlwdCcgfTtcbiAgfVxuXG4gIGNvbnN0IHRhYmxlID1cbiAgICB0eXBlID09PSAnZG9uYXRpb24nID8gJ2Nzd29fZG9uYXRpb25zJyA6ICdjc3dvX21vbnRobHlfY29udHJpYnV0aW9ucyc7XG5cbiAgY29uc3Qgc3VwYWJhc2UgPSBnZXRTdXBhYmFzZUNsaWVudCgpO1xuXG4gIGNvbnN0IGN1cnJlbnRBdHRlbXB0cyA9IChyZWNvcmQucmVjZWlwdF9lbWFpbF9hdHRlbXB0cyBhcyBudW1iZXIpIHx8IDA7XG5cbiAgLy8gXHUyNTAwXHUyNTAwIDEuIEF0b21pYyBjbGFpbSB0byBwcmV2ZW50IHJhY2UgY29uZGl0aW9uIGJldHdlZW4gd2ViaG9vayAmIHZlcmlmeSBBUEkgXHUyNTAwXHUyNTAwXG4gIGlmICghZm9yY2VSZXNlbmQpIHtcbiAgICAvLyBJZiBhbHJlYWR5IG1hcmtlZCBzZW50LCBza2lwIGltbWVkaWF0ZWx5XG4gICAgaWYgKHJlY29yZC5yZWNlaXB0X2VtYWlsX3N0YXR1cyA9PT0gJ3NlbnQnKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBza2lwcGVkOiB0cnVlLFxuICAgICAgICByZWFzb246ICdSZWNlaXB0IGFscmVhZHkgc2VudCcsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEF0dGVtcHQgYXRvbWljIHRyYW5zaXRpb246IG9ubHkgdXBkYXRlIGlmIHN0YXR1cyBpcyAncGVuZGluZycsICdmYWlsZWQnLCBvciBudWxsXG4gICAgY29uc3QgeyBkYXRhOiBjbGFpbWVkLCBlcnJvcjogY2xhaW1FcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKHRhYmxlKVxuICAgICAgLnVwZGF0ZSh7XG4gICAgICAgIHJlY2VpcHRfZW1haWxfc3RhdHVzOiAnc2VuZGluZycsXG4gICAgICAgIHJlY2VpcHRfZW1haWxfYXR0ZW1wdHM6IGN1cnJlbnRBdHRlbXB0cyArIDEsXG4gICAgICB9KVxuICAgICAgLmVxKCdpZCcsIHJlY29yZC5pZClcbiAgICAgIC5vcigncmVjZWlwdF9lbWFpbF9zdGF0dXMuaXMubnVsbCxyZWNlaXB0X2VtYWlsX3N0YXR1cy5lcS5wZW5kaW5nLHJlY2VpcHRfZW1haWxfc3RhdHVzLmVxLmZhaWxlZCcpXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5tYXliZVNpbmdsZSgpO1xuXG4gICAgaWYgKGNsYWltRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tzZW5kUGF5bWVudFJlY2VpcHRdIENsYWltIGVycm9yOicsIGNsYWltRXJyb3IpO1xuICAgIH1cblxuICAgIGlmICghY2xhaW1lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgc2tpcHBlZDogdHJ1ZSxcbiAgICAgICAgcmVhc29uOiAnUmVjZWlwdCBpcyBhbHJlYWR5IGJlaW5nIHByb2Nlc3NlZCBvciBoYXMgYmVlbiBzZW50IGJ5IGNvbmN1cnJlbnQgd29ya2VyJyxcbiAgICAgIH07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEFkbWluIGZvcmNlIHJlc2VuZDogdW5jb25kaXRpb25hbGx5IHNldCB0byBzZW5kaW5nXG4gICAgYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKHRhYmxlKVxuICAgICAgLnVwZGF0ZSh7XG4gICAgICAgIHJlY2VpcHRfZW1haWxfc3RhdHVzOiAnc2VuZGluZycsXG4gICAgICAgIHJlY2VpcHRfZW1haWxfYXR0ZW1wdHM6IGN1cnJlbnRBdHRlbXB0cyArIDEsXG4gICAgICB9KVxuICAgICAgLmVxKCdpZCcsIHJlY29yZC5pZCk7XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDAgMi4gRGV0ZXJtaW5lIHJlY2lwaWVudCBkZXRhaWxzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICB0cnkge1xuICAgIGxldCByZWNpcGllbnRFbWFpbCA9XG4gICAgICB0eXBlID09PSAnZG9uYXRpb24nXG4gICAgICAgID8gKHJlY29yZC5kb25vcl9lbWFpbCBhcyBzdHJpbmcpXG4gICAgICAgIDogKHJlY29yZC5tZW1iZXJfZW1haWwgYXMgc3RyaW5nKTtcblxuICAgIGxldCByZWNpcGllbnROYW1lID1cbiAgICAgIHR5cGUgPT09ICdkb25hdGlvbidcbiAgICAgICAgPyAocmVjb3JkLmRvbm9yX25hbWUgYXMgc3RyaW5nKVxuICAgICAgICA6IChyZWNvcmQubWVtYmVyX25hbWUgYXMgc3RyaW5nKTtcblxuICAgIC8vIElmIGNvbnRyaWJ1dGlvbiBhbmQgbWVtYmVyIGVtYWlsIG5vdCBpbiByZWNvcmQsIHF1ZXJ5IGNzd29fbWVtYmVyc1xuICAgIGlmICh0eXBlID09PSAnY29udHJpYnV0aW9uJyAmJiAoIXJlY2lwaWVudEVtYWlsIHx8ICFyZWNpcGllbnROYW1lKSAmJiByZWNvcmQubWVtYmVyX2lkKSB7XG4gICAgICBjb25zdCB7IGRhdGE6IG1lbWJlciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ2Nzd29fbWVtYmVycycpXG4gICAgICAgIC5zZWxlY3QoJ2Z1bGxfbmFtZSwgZW1haWwnKVxuICAgICAgICAuZXEoJ2lkJywgcmVjb3JkLm1lbWJlcl9pZClcbiAgICAgICAgLm1heWJlU2luZ2xlKCk7XG5cbiAgICAgIGlmIChtZW1iZXIpIHtcbiAgICAgICAgcmVjaXBpZW50RW1haWwgPSByZWNpcGllbnRFbWFpbCB8fCBtZW1iZXIuZW1haWw7XG4gICAgICAgIHJlY2lwaWVudE5hbWUgPSByZWNpcGllbnROYW1lIHx8IG1lbWJlci5mdWxsX25hbWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFyZWNpcGllbnRFbWFpbCB8fCAhcmVjaXBpZW50RW1haWwuaW5jbHVkZXMoJ0AnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWxpZCBjdXN0b21lciBlbWFpbCBub3QgZm91bmQgb24gJHt0eXBlfSByZWNvcmQgKElEOiAke3JlY29yZC5pZH0pYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2l0ZVVybCA9IGdldEVudlZhbHVlKFxuICAgICAgJ1NJVEVfVVJMJyxcbiAgICAgICdodHRwczovL3d3dy5jaGhhdHJhZG9sLm9yZycsXG4gICAgKTtcblxuICAgIGNvbnN0IHB1cnBvc2VMYWJlbCA9XG4gICAgICAocmVjb3JkLnB1cnBvc2UgYXMgc3RyaW5nKSB8fFxuICAgICAgKHJlY29yZC5tb250aCA/IGBNb250aCAke3JlY29yZC5tb250aH0vJHtyZWNvcmQueWVhciB8fCAnJ31gIDogJycpIHx8XG4gICAgICAodHlwZSA9PT0gJ2RvbmF0aW9uJyA/ICdEb25hdGlvbiAmIFNvY2lhbCBXZWxmYXJlJyA6ICdNb250aGx5IENvbnRyaWJ1dGlvbicpO1xuXG4gICAgY29uc3QgcGF5bWVudElkID1cbiAgICAgIChyZWNvcmQuY2FzaGZyZWVfcGF5bWVudF9pZCBhcyBzdHJpbmcpIHx8XG4gICAgICAocmVjb3JkLnJhem9ycGF5X3BheW1lbnRfaWQgYXMgc3RyaW5nKSB8fFxuICAgICAgbnVsbDtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCAzLiBEaXNwYXRjaCB0byBpbnRlcm5hbCBlbWFpbCBlbmRwb2ludCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zdCBpbnRlcm5hbFNlY3JldCA9IGdldEVudlZhbHVlKCdJTlRFUk5BTF9BUElfU0VDUkVUJyk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9O1xuICAgIGlmIChpbnRlcm5hbFNlY3JldCkge1xuICAgICAgaGVhZGVyc1sneC1pbnRlcm5hbC1zZWNyZXQnXSA9IGludGVybmFsU2VjcmV0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXG4gICAgICBgJHtzaXRlVXJsfS9hcGkvc2VuZC1yZWNlaXB0LWVtYWlsYCxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICByZWNpcGllbnRFbWFpbCxcbiAgICAgICAgICByZWNpcGllbnROYW1lOiByZWNpcGllbnROYW1lIHx8ICdWYWx1ZWQgU3VwcG9ydGVyJyxcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIGFtb3VudDogcmVjb3JkLmFtb3VudCxcbiAgICAgICAgICByZWNlaXB0TnVtYmVyOiByZWNvcmQucmVjZWlwdF9udW1iZXIsXG4gICAgICAgICAgcHVycG9zZTogcHVycG9zZUxhYmVsLFxuICAgICAgICAgIHBheW1lbnRNZXRob2Q6IHBheW1lbnRNZXRob2QgfHwgJ09ubGluZSBQYXltZW50JyxcbiAgICAgICAgICBwYXltZW50SWQsXG4gICAgICAgICAgZGF0ZTogbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygnZW4tSU4nLCB7XG4gICAgICAgICAgICBkYXRlU3R5bGU6ICdtZWRpdW0nLFxuICAgICAgICAgICAgdGltZVN0eWxlOiAnc2hvcnQnLFxuICAgICAgICAgIH0pLFxuICAgICAgICB9KSxcbiAgICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KDE1MDAwKSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIHtcbiAgICAgIHN1Y2Nlc3M/OiBib29sZWFuO1xuICAgICAgbWVzc2FnZUlkPzogc3RyaW5nO1xuICAgICAgZXJyb3I/OiBzdHJpbmc7XG4gICAgICB3YXJuaW5nPzogc3RyaW5nO1xuICAgIH07XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rIHx8ICFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICByZXN1bHQuZXJyb3IgfHwgcmVzdWx0Lndhcm5pbmcgfHwgYFJlY2VpcHQgZW1haWwgQVBJIHJldHVybmVkIEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIDQuIE1hcmsgc3VjY2Vzc2Z1bGx5IHNlbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3Qgc2VudFVwZGF0ZSA9IHtcbiAgICAgIHJlY2VpcHRfZW1haWxfc3RhdHVzOiAnc2VudCcsXG4gICAgICByZWNlaXB0X2VtYWlsX3NlbnRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIHJlY2VpcHRfZW1haWxfbWVzc2FnZV9pZDogcmVzdWx0Lm1lc3NhZ2VJZCB8fCBudWxsLFxuICAgICAgcmVjZWlwdF9lbWFpbF9lcnJvcjogbnVsbCxcbiAgICB9O1xuXG4gICAgYXdhaXQgc3VwYWJhc2UuZnJvbSh0YWJsZSkudXBkYXRlKHNlbnRVcGRhdGUpLmVxKCdpZCcsIHJlY29yZC5pZCk7XG5cbiAgICAvLyBBIGJ1bGsgXCJQYXkgQWxsXCIgYmF0Y2ggaXMgY292ZXJlZCBieSB0aGlzIHNhbWUgZW1haWwgXHUyMDE0IG1hcmsgc2libGluZ3NcbiAgICAvLyAnc2VudCcgdG9vIHNvIHRoZXkncmUgbmV2ZXIgcGlja2VkIHVwIGZvciBhIGR1cGxpY2F0ZSBzb2xvIHJlc2VuZC5cbiAgICBpZiAobGlua2VkUmVjb3JkSWRzLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IHN1cGFiYXNlLmZyb20odGFibGUpLnVwZGF0ZShzZW50VXBkYXRlKS5pbignaWQnLCBsaW5rZWRSZWNvcmRJZHMpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgbWVzc2FnZUlkOiByZXN1bHQubWVzc2FnZUlkLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gZW1haWwgZXJyb3InO1xuXG4gICAgYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKHRhYmxlKVxuICAgICAgLnVwZGF0ZSh7XG4gICAgICAgIHJlY2VpcHRfZW1haWxfc3RhdHVzOiAnZmFpbGVkJyxcbiAgICAgICAgcmVjZWlwdF9lbWFpbF9lcnJvcjogbWVzc2FnZSxcbiAgICAgIH0pXG4gICAgICAuZXEoJ2lkJywgcmVjb3JkLmlkKTtcblxuICAgIGNvbnNvbGUuZXJyb3IoYFtQYXltZW50IFJlY2VpcHQgRXJyb3IgZm9yICR7dGFibGV9ICR7cmVjb3JkLmlkfV06YCwgbWVzc2FnZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogbWVzc2FnZSxcbiAgICB9O1xuICB9XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXEJBU0lDXFxcXFBlcnNvbmFsXFxcXE15IFN0dWR5XFxcXFNraWxsIFRBU0sgMjAyNVxcXFwwMDIuIFdlYiBEZXZlbG9wbWVudFxcXFwwNC4gT3RoZXJzXFxcXE5hcmFqb2xlIENoYXRyb2RvbFxcXFxuYXJham9sZV9jaGF0cm9kb2xcXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxCQVNJQ1xcXFxQZXJzb25hbFxcXFxNeSBTdHVkeVxcXFxTa2lsbCBUQVNLIDIwMjVcXFxcMDAyLiBXZWIgRGV2ZWxvcG1lbnRcXFxcMDQuIE90aGVyc1xcXFxOYXJham9sZSBDaGF0cm9kb2xcXFxcbmFyYWpvbGVfY2hhdHJvZG9sXFxcXGFwaVxcXFx2ZXJpZnktcGF5bWVudC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovQkFTSUMvUGVyc29uYWwvTXklMjBTdHVkeS9Ta2lsbCUyMFRBU0slMjAyMDI1LzAwMi4lMjBXZWIlMjBEZXZlbG9wbWVudC8wNC4lMjBPdGhlcnMvTmFyYWpvbGUlMjBDaGF0cm9kb2wvbmFyYWpvbGVfY2hhdHJvZG9sL2FwaS92ZXJpZnktcGF5bWVudC50c1wiOy8qKlxuICogYXBpL3ZlcmlmeS1wYXltZW50LnRzXG4gKlxuICogVmVyaWZpZXMgYSBSYXpvcnBheSBwYXltZW50IHNpZ25hdHVyZSBhbmQgZmluYWxpemVzIHRoZSBwYXltZW50IHJlY29yZC5cbiAqIERlbGVnYXRlcyBBTEwgU3VwYWJhc2UgcmVjb3JkIHVwZGF0ZXMgdG8gdGhlIGNlbnRyYWwgZmluYWxpemVQYXltZW50KCkgZnVuY3Rpb24uXG4gKlxuICogUE9TVCAvYXBpL3ZlcmlmeS1wYXltZW50XG4gKiBCb2R5OiB7IG9yZGVyX2lkLCBwYXltZW50X2lkLCByYXpvcnBheV9zaWduYXR1cmUgfVxuICpcbiAqIFJlc3BvbnNlOiB7IHN1Y2Nlc3MsIHN0YXR1cywgdHlwZSwgcmVjZWlwdF9udW1iZXIsIG9yZGVyX2lkLCBwYXltZW50X2lkIH1cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEluY29taW5nTWVzc2FnZSwgU2VydmVyUmVzcG9uc2UgfSBmcm9tICdodHRwJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnbm9kZTpjcnlwdG8nO1xuaW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGZpbmFsaXplUGF5bWVudCB9IGZyb20gJy4vX2xpYi9maW5hbGl6ZS1wYXltZW50JztcbmltcG9ydCB7IHNlbmRQYXltZW50UmVjZWlwdCB9IGZyb20gJy4vX2xpYi9wYXltZW50LXJlY2VpcHQnO1xuXG5mdW5jdGlvbiBzZW5kSnNvbihyZXM6IFNlcnZlclJlc3BvbnNlLCBzdGF0dXNDb2RlOiBudW1iZXIsIGRhdGE6IHVua25vd24pIHtcbiAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdQT1NULCBPUFRJT05TLCBHRVQnKTtcbiAgcmVzLnN0YXR1c0NvZGUgPSBzdGF0dXNDb2RlO1xuICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VCb2R5KFxuICByZXE6IEluY29taW5nTWVzc2FnZSxcbik6IFByb21pc2U8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+IHtcbiAgaWYgKChyZXEgYXMgdW5rbm93biBhcyB7IGJvZHk/OiB1bmtub3duIH0pLmJvZHkpIHtcbiAgICBjb25zdCBiID0gKHJlcSBhcyB1bmtub3duIGFzIHsgYm9keTogdW5rbm93biB9KS5ib2R5O1xuICAgIHJldHVybiB0eXBlb2YgYiA9PT0gJ3N0cmluZydcbiAgICAgID8gSlNPTi5wYXJzZShiKVxuICAgICAgOiAoYiBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik7XG4gIH1cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZGF0YSA9ICcnO1xuICAgIHJlcS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgZGF0YSArPSBjaHVuaztcbiAgICB9KTtcbiAgICByZXEub24oJ2VuZCcsICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmUoZGF0YSA/IEpTT04ucGFyc2UoZGF0YSkgOiB7fSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRDcmVkZW50aWFscygpOiB7IGtleUlkOiBzdHJpbmc7IGtleVNlY3JldDogc3RyaW5nIH0ge1xuICBsZXQga2V5SWQgPVxuICAgIHByb2Nlc3MuZW52LlJBWk9SUEFZX0tFWV9JRCB8fFxuICAgIHByb2Nlc3MuZW52LlZJVEVfUkFaT1JQQVlfS0VZX0lEIHx8XG4gICAgJyc7XG4gIGxldCBrZXlTZWNyZXQgPSBwcm9jZXNzLmVudi5SQVpPUlBBWV9LRVlfU0VDUkVUIHx8ICcnO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZW52UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLmVudicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGVudlBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGVudlBhdGgsICd1dGYtOCcpO1xuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoJ1xcbicpKSB7XG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgW2ssIC4uLnZdID0gdHJpbW1lZC5zcGxpdCgnPScpO1xuICAgICAgICBjb25zdCBrZXkgPSBrPy50cmltKCk7XG4gICAgICAgIGNvbnN0IHZhbCA9IHYuam9pbignPScpLnRyaW0oKS5yZXBsYWNlKC9eW1wiJ118W1wiJ10kL2csICcnKTtcbiAgICAgICAgaWYgKGtleSA9PT0gJ1JBWk9SUEFZX0tFWV9JRCcpIGtleUlkID0gdmFsO1xuICAgICAgICBlbHNlIGlmIChrZXkgPT09ICdWSVRFX1JBWk9SUEFZX0tFWV9JRCcgJiYgIWtleUlkKSBrZXlJZCA9IHZhbDtcbiAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAnUkFaT1JQQVlfS0VZX1NFQ1JFVCcpIGtleVNlY3JldCA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIGZhbGxiYWNrIHRvIHByb2Nlc3MuZW52XG4gIH1cblxuICByZXR1cm4geyBrZXlJZCwga2V5U2VjcmV0IH07XG59XG5cbmZ1bmN0aW9uIHRpbWluZ1NhZmVFcXVhbFN0cihhOiBzdHJpbmcsIGI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAodHlwZW9mIGEgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBiICE9PSAnc3RyaW5nJykgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBidWZBID0gQnVmZmVyLmZyb20oYSwgJ3V0Zi04Jyk7XG4gIGNvbnN0IGJ1ZkIgPSBCdWZmZXIuZnJvbShiLCAndXRmLTgnKTtcbiAgaWYgKGJ1ZkEubGVuZ3RoICE9PSBidWZCLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gY3J5cHRvLnRpbWluZ1NhZmVFcXVhbChidWZBLCBidWZCKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihcbiAgcmVxOiBJbmNvbWluZ01lc3NhZ2UsXG4gIHJlczogU2VydmVyUmVzcG9uc2UsXG4pIHtcbiAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ1BPU1QsIE9QVElPTlMsIEdFVCcpO1xuICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xuICAgIHJlcy5lbmQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSB7XG4gICAgcmV0dXJuIHNlbmRKc29uKHJlcywgNDA1LCB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiAnTWV0aG9kIE5vdCBBbGxvd2VkLiBVc2UgUE9TVC4nLFxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgeyBrZXlTZWNyZXQgfSA9IGdldENyZWRlbnRpYWxzKCk7XG4gIGlmICgha2V5U2VjcmV0KSB7XG4gICAgcmV0dXJuIHNlbmRKc29uKHJlcywgNTAwLCB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOlxuICAgICAgICAnUmF6b3JwYXkgc2VjcmV0IGtleSBub3QgY29uZmlndXJlZC4gUGxlYXNlIHNldCBSQVpPUlBBWV9LRVlfU0VDUkVUIGluIGVudmlyb25tZW50IHZhcmlhYmxlcy4nLFxuICAgIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcGFyc2VCb2R5KHJlcSk7XG4gICAgY29uc3Qgb3JkZXJJZCA9IChcbiAgICAgIChib2R5Lm9yZGVyX2lkIGFzIHN0cmluZykgfHwgKGJvZHkucmF6b3JwYXlfb3JkZXJfaWQgYXMgc3RyaW5nKSB8fCAnJ1xuICAgICkudHJpbSgpO1xuICAgIGNvbnN0IHBheW1lbnRJZCA9IChcbiAgICAgIChib2R5LnBheW1lbnRfaWQgYXMgc3RyaW5nKSB8fCAoYm9keS5yYXpvcnBheV9wYXltZW50X2lkIGFzIHN0cmluZykgfHwgJydcbiAgICApLnRyaW0oKTtcbiAgICBjb25zdCBzaWduYXR1cmUgPSAoKGJvZHkucmF6b3JwYXlfc2lnbmF0dXJlIGFzIHN0cmluZykgfHwgJycpLnRyaW0oKTtcblxuICAgIGlmICghb3JkZXJJZCB8fCAhcGF5bWVudElkIHx8ICFzaWduYXR1cmUpIHtcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDQwMCwge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6XG4gICAgICAgICAgJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVycyAob3JkZXJfaWQsIHBheW1lbnRfaWQsIHJhem9ycGF5X3NpZ25hdHVyZSkuJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBDcnlwdG9ncmFwaGljIHNpZ25hdHVyZSB2ZXJpZmljYXRpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgZXhwZWN0ZWRTaWduYXR1cmUgPSBjcnlwdG9cbiAgICAgIC5jcmVhdGVIbWFjKCdzaGEyNTYnLCBrZXlTZWNyZXQpXG4gICAgICAudXBkYXRlKGAke29yZGVySWR9fCR7cGF5bWVudElkfWApXG4gICAgICAuZGlnZXN0KCdoZXgnKTtcblxuICAgIGNvbnN0IGlzVmFsaWQgPSB0aW1pbmdTYWZlRXF1YWxTdHIoZXhwZWN0ZWRTaWduYXR1cmUsIHNpZ25hdHVyZSk7XG5cbiAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDQwMCwge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6ICdJbnZhbGlkIHBheW1lbnQgc2lnbmF0dXJlLiBWZXJpZmljYXRpb24gZmFpbGVkLicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2lnbmF0dXJlIGlzIHZhbGlkIFx1MjE5MiBmaW5hbGl6ZSB0aGUgcGF5bWVudCBpbiBTdXBhYmFzZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmaW5hbGl6ZVBheW1lbnQoe1xuICAgICAgZ2F0ZXdheTogJ3Jhem9ycGF5JyxcbiAgICAgIG9yZGVySWQsXG4gICAgICBwYXltZW50SWQsXG4gICAgICBnYXRld2F5U3RhdHVzOiAnU1VDQ0VTUycsXG4gICAgICBwYXltZW50TWV0aG9kOiAnUmF6b3JwYXknLFxuICAgIH0pO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIERpc3BhdGNoIHJlY2VpcHQgZW1haWwgYXN5bmNocm9ub3VzbHkgKGZpcmUtYW5kLWZvcmdldCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5zdGF0dXMgPT09ICdwYWlkJyAmJiByZXN1bHQuc2hvdWxkU2VuZFJlY2VpcHQpIHtcbiAgICAgIHZvaWQgc2VuZFBheW1lbnRSZWNlaXB0KHtcbiAgICAgICAgdHlwZTogcmVzdWx0LnR5cGUhLFxuICAgICAgICByZWNvcmQ6IHJlc3VsdC5yZWNvcmQhLFxuICAgICAgICBsaW5rZWRSZWNvcmRJZHM6IHJlc3VsdC5saW5rZWRSZWNvcmRJZHMsXG4gICAgICAgIHBheW1lbnRNZXRob2Q6ICdSYXpvcnBheScsXG4gICAgICB9KS5jYXRjaCgocmVjZWlwdEVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbdmVyaWZ5LXBheW1lbnRdIFJlY2VpcHQgZW1haWwgZXJyb3I6JywgcmVjZWlwdEVycik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCAyMDAsIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBzdGF0dXM6IHJlc3VsdC5zdGF0dXMgfHwgJ3BhaWQnLFxuICAgICAgdHlwZTogcmVzdWx0LnR5cGUsXG4gICAgICByZWNlaXB0X251bWJlcjpcbiAgICAgICAgKHJlc3VsdC5yZWNvcmQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpXG4gICAgICAgICAgPy5yZWNlaXB0X251bWJlciA/PyBudWxsLFxuICAgICAgb3JkZXJfaWQ6IG9yZGVySWQsXG4gICAgICBwYXltZW50X2lkOiBwYXltZW50SWQsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycjogdW5rbm93bikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1t2ZXJpZnktcGF5bWVudF0gRXJyb3I6JywgZXJyKTtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdJbnRlcm5hbCB2ZXJpZmljYXRpb24gZXJyb3InO1xuICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDUwMCwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gIH1cbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXEJBU0lDXFxcXFBlcnNvbmFsXFxcXE15IFN0dWR5XFxcXFNraWxsIFRBU0sgMjAyNVxcXFwwMDIuIFdlYiBEZXZlbG9wbWVudFxcXFwwNC4gT3RoZXJzXFxcXE5hcmFqb2xlIENoYXRyb2RvbFxcXFxuYXJham9sZV9jaGF0cm9kb2xcXFxcYXBpXFxcXGNhc2hmcmVlLW9yZGVyLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9CQVNJQy9QZXJzb25hbC9NeSUyMFN0dWR5L1NraWxsJTIwVEFTSyUyMDIwMjUvMDAyLiUyMFdlYiUyMERldmVsb3BtZW50LzA0LiUyME90aGVycy9OYXJham9sZSUyMENoYXRyb2RvbC9uYXJham9sZV9jaGF0cm9kb2wvYXBpL2Nhc2hmcmVlLW9yZGVyLnRzXCI7LyoqXHJcbiAqIGFwaS9jYXNoZnJlZS1vcmRlci50c1xyXG4gKlxyXG4gKiBCYWNrZW5kIEFQSSBlbmRwb2ludCB0byBjcmVhdGUgYSBDYXNoZnJlZSBwYXltZW50IG9yZGVyLlxyXG4gKiBDYWxsZWQgYnkgc3JjL2xpYi9jYXNoZnJlZS50cyBcdTIxOTIgY3JlYXRlQ2FzaGZyZWVPcmRlcigpLlxyXG4gKlxyXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZXMgcmVxdWlyZWQ6XHJcbiAqICAgQ0FTSEZSRUVfQVBQX0lEICAgICBcdTIwMTQgWW91ciBDYXNoZnJlZSBBcHAgSUQgKGZyb20gQ2FzaGZyZWUgZGFzaGJvYXJkKVxyXG4gKiAgIENBU0hGUkVFX1NFQ1JFVF9LRVkgXHUyMDE0IFlvdXIgQ2FzaGZyZWUgU2VjcmV0IEtleSAoTkVWRVIgZXhwb3NlIG9uIGNsaWVudClcclxuICogICBDQVNIRlJFRV9BUElfRU5WICAgIFx1MjAxNCAnc2FuZGJveCcgb3IgJ3Byb2R1Y3Rpb24nIChkZWZhdWx0OiAncHJvZHVjdGlvbicpXHJcbiAqL1xyXG5cclxuaW1wb3J0IHR5cGUgeyBJbmNvbWluZ01lc3NhZ2UsIFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnaHR0cCc7XHJcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuXHJcbmZ1bmN0aW9uIHNlbmRKc29uKHJlczogU2VydmVyUmVzcG9uc2UsIHN0YXR1c0NvZGU6IG51bWJlciwgZGF0YTogdW5rbm93bikge1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnUE9TVCwgT1BUSU9OUycpO1xyXG4gIHJlcy5zdGF0dXNDb2RlID0gc3RhdHVzQ29kZTtcclxuICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlc29sdmVzIHRoZSBwdWJsaWMgb3JpZ2luIHRvIGJ1aWxkIHJldHVybl91cmwvbm90aWZ5X3VybCBmcm9tLlxyXG4gKlxyXG4gKiBQcmlvcml0eTpcclxuICogICAxLiBUaGUgaW5jb21pbmcgcmVxdWVzdCdzIG93biBIb3N0IGhlYWRlciBcdTIwMTQgdGhpcyBpcyBhbHdheXMgdGhlIGV4YWN0XHJcbiAqICAgICAgZG9tYWluIHRoZSBwYXlpbmcgdXNlcidzIGJyb3dzZXIgaXMgYWN0dWFsbHkgdGFsa2luZyB0bywgc28gaXQnc1xyXG4gKiAgICAgIGNvcnJlY3QgaW4gZXZlcnkgZW52aXJvbm1lbnQgKHByb2R1Y3Rpb24sIGEgVmVyY2VsIHByZXZpZXcgZGVwbG95LFxyXG4gKiAgICAgIGxvY2FsIGRldiwgYW4gbmdyb2sgdHVubmVsIGZvciBwcmUtbGF1bmNoIHRlc3RpbmcpIHdpdGggemVybyBjb25maWcuXHJcbiAqICAgMi4gQW4gZXhwbGljaXRseSBjb25maWd1cmVkIFNJVEVfVVJMIChlbnYgdmFyIG9yIC5lbnYpLCBvbmx5IHVzZWQgd2hlblxyXG4gKiAgICAgIG5vIHJlcXVlc3QgaG9zdCBpcyBhdmFpbGFibGUgYXQgYWxsIChlLmcuIHNvbWUgbm9uLUhUVFAgaW52b2NhdGlvbikuXHJcbiAqICAgMy4gSGFyZGNvZGVkIHByb2R1Y3Rpb24gVVJMLCBhcyBhIGxhc3QtcmVzb3J0IGZhbGxiYWNrLlxyXG4gKlxyXG4gKiBHZXR0aW5nIHRoaXMgd3Jvbmcgc2VuZHMgdGhlIGdhdGV3YXkncyByZWRpcmVjdC93ZWJob29rIHRvIHRoZSB3cm9uZ1xyXG4gKiBkb21haW4gXHUyMDE0IG9uIGEgZnVsbC1wYWdlICgnX3NlbGYnKSBtb2JpbGUgY2hlY2tvdXQgcmVkaXJlY3QsIHRoYXQgc3RyYW5kc1xyXG4gKiB0aGUgYnJvd3NlciBvbiBhIGRpZmZlcmVudCBzaXRlIGVudGlyZWx5IGFuZCBsb29rcyBsaWtlIHRoZSBwYXltZW50IGlzXHJcbiAqIHN0dWNrIFwicHJvY2Vzc2luZ1wiIGZvcmV2ZXIgb24gdGhlIHBhZ2UgdGhlIHVzZXIgaXMgYWN0dWFsbHkgd2F0Y2hpbmcuXHJcbiAqIChTSVRFX1VSTCBpcyBkZWxpYmVyYXRlbHkgTk9UIGdpdmVuIHByaW9yaXR5IGhlcmU6IGEgc3RhbGUvdW5yZWxhdGVkXHJcbiAqIHZhbHVlIGxlZnQgaW4gLmVudiBcdTIwMTQgZS5nLiB0aGUgcHJvZHVjdGlvbiBkb21haW4sIGR1cmluZyBuZ3JvayB0ZXN0aW5nIFx1MjAxNFxyXG4gKiB3b3VsZCBvdGhlcndpc2Ugc2lsZW50bHkgcmVkaXJlY3QgQ2FzaGZyZWUgYXdheSBmcm9tIHRoZSBob3N0IGFjdHVhbGx5XHJcbiAqIGJlaW5nIHRlc3RlZCwgd2hpY2ggaXMgZXhhY3RseSB0aGlzIGJ1Zy4pXHJcbiAqL1xyXG5mdW5jdGlvbiByZXNvbHZlU2l0ZU9yaWdpbihyZXE6IEluY29taW5nTWVzc2FnZSk6IHN0cmluZyB7XHJcbiAgY29uc3QgZm9yd2FyZGVkSG9zdCA9IHJlcS5oZWFkZXJzWyd4LWZvcndhcmRlZC1ob3N0J107XHJcbiAgY29uc3QgaG9zdCA9IChBcnJheS5pc0FycmF5KGZvcndhcmRlZEhvc3QpID8gZm9yd2FyZGVkSG9zdFswXSA6IGZvcndhcmRlZEhvc3QpIHx8IHJlcS5oZWFkZXJzLmhvc3Q7XHJcbiAgaWYgKGhvc3QpIHtcclxuICAgIGNvbnN0IGZvcndhcmRlZFByb3RvID0gcmVxLmhlYWRlcnNbJ3gtZm9yd2FyZGVkLXByb3RvJ107XHJcbiAgICBjb25zdCBwcm90byA9IChBcnJheS5pc0FycmF5KGZvcndhcmRlZFByb3RvKSA/IGZvcndhcmRlZFByb3RvWzBdIDogZm9yd2FyZGVkUHJvdG8pIHx8ICdodHRwcyc7XHJcbiAgICByZXR1cm4gYCR7cHJvdG99Oi8vJHtob3N0fWA7XHJcbiAgfVxyXG5cclxuICBsZXQgZXhwbGljaXRTaXRlVXJsID0gcHJvY2Vzcy5lbnYuU0lURV9VUkwgfHwgJyc7XHJcbiAgaWYgKCFleHBsaWNpdFNpdGVVcmwpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGVudlBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy5lbnYnKTtcclxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZW52UGF0aCkpIHtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGVudlBhdGgsICd1dGYtOCcpO1xyXG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBjb250ZW50LnNwbGl0KCdcXG4nKSkge1xyXG4gICAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xyXG4gICAgICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSBjb250aW51ZTtcclxuICAgICAgICAgIGNvbnN0IFtrLCAuLi52XSA9IHRyaW1tZWQuc3BsaXQoJz0nKTtcclxuICAgICAgICAgIGlmIChrPy50cmltKCkgPT09ICdTSVRFX1VSTCcpIHtcclxuICAgICAgICAgICAgZXhwbGljaXRTaXRlVXJsID0gdi5qb2luKCc9JykudHJpbSgpLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgJycpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAvLyBmYWxsYmFjayBiZWxvd1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoZXhwbGljaXRTaXRlVXJsKSByZXR1cm4gZXhwbGljaXRTaXRlVXJsLnJlcGxhY2UoL1xcLyQvLCAnJyk7XHJcblxyXG4gIHJldHVybiAnaHR0cHM6Ly93d3cuY2hoYXRyYWRvbC5vcmcnO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBwYXJzZUJvZHkocmVxOiBJbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PiB7XHJcbiAgaWYgKChyZXEgYXMgdW5rbm93biBhcyB7IGJvZHk/OiB1bmtub3duIH0pLmJvZHkpIHtcclxuICAgIGNvbnN0IGIgPSAocmVxIGFzIHVua25vd24gYXMgeyBib2R5OiB1bmtub3duIH0pLmJvZHk7XHJcbiAgICByZXR1cm4gdHlwZW9mIGIgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShiKSA6IChiIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KTtcclxuICB9XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGxldCBkYXRhID0gJyc7XHJcbiAgICByZXEub24oJ2RhdGEnLCAoY2h1bmspID0+IHsgZGF0YSArPSBjaHVuazsgfSk7XHJcbiAgICByZXEub24oJ2VuZCcsICgpID0+IHtcclxuICAgICAgdHJ5IHsgcmVzb2x2ZShkYXRhID8gSlNPTi5wYXJzZShkYXRhKSA6IHt9KTsgfVxyXG4gICAgICBjYXRjaCAoZXJyKSB7IHJlamVjdChlcnIpOyB9XHJcbiAgICB9KTtcclxuICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDYXNoZnJlZUNyZWRlbnRpYWxzKCk6IHtcclxuICBhcHBJZDogc3RyaW5nO1xyXG4gIHNlY3JldEtleTogc3RyaW5nO1xyXG4gIGFwaUVudjogc3RyaW5nO1xyXG59IHtcclxuICBsZXQgYXBwSWQgPSBwcm9jZXNzLmVudi5DQVNIRlJFRV9BUFBfSUQgfHwgJyc7XHJcbiAgbGV0IHNlY3JldEtleSA9IHByb2Nlc3MuZW52LkNBU0hGUkVFX1NFQ1JFVF9LRVkgfHwgJyc7XHJcbiAgbGV0IGFwaUVudiA9IHByb2Nlc3MuZW52LkNBU0hGUkVFX0FQSV9FTlYgfHwgJyc7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBlbnZQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52Jyk7XHJcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhlbnZQYXRoKSkge1xyXG4gICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGVudlBhdGgsICd1dGYtOCcpO1xyXG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgnXFxuJykpIHtcclxuICAgICAgICBjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XHJcbiAgICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSBjb250aW51ZTtcclxuICAgICAgICBjb25zdCBbaywgLi4udl0gPSB0cmltbWVkLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgY29uc3Qga2V5ID0gaz8udHJpbSgpO1xyXG4gICAgICAgIGNvbnN0IHZhbCA9IHYuam9pbignPScpLnRyaW0oKS5yZXBsYWNlKC9eW1wiJ118W1wiJ10kL2csICcnKTtcclxuICAgICAgICBpZiAoa2V5ID09PSAnQ0FTSEZSRUVfQVBQX0lEJykgYXBwSWQgPSB2YWw7XHJcbiAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAnQ0FTSEZSRUVfU0VDUkVUX0tFWScpIHNlY3JldEtleSA9IHZhbDtcclxuICAgICAgICBlbHNlIGlmIChrZXkgPT09ICdDQVNIRlJFRV9BUElfRU5WJykgYXBpRW52ID0gdmFsO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBmYWxsYmFjayB0byBwcm9jZXNzLmVudlxyXG4gIH1cclxuXHJcbiAgLy8gQXV0by1kZXRlY3QgZnJvbSBrZXkgcHJlZml4IGlmIHNlY3JldEtleSBoYXMgX3Byb2RfIG9yIF90ZXN0X1xyXG4gIGlmICghYXBpRW52KSB7XHJcbiAgICBpZiAoc2VjcmV0S2V5LmluY2x1ZGVzKCdfcHJvZF8nKSkge1xyXG4gICAgICBhcGlFbnYgPSAncHJvZHVjdGlvbic7XHJcbiAgICB9IGVsc2UgaWYgKHNlY3JldEtleS5pbmNsdWRlcygnX3Rlc3RfJykpIHtcclxuICAgICAgYXBpRW52ID0gJ3NhbmRib3gnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYXBpRW52ID0gJ3Byb2R1Y3Rpb24nO1xyXG4gICAgfVxyXG4gIH0gZWxzZSBpZiAoYXBpRW52ID09PSAnc2FuZGJveCcgJiYgc2VjcmV0S2V5LmluY2x1ZGVzKCdfcHJvZF8nKSkge1xyXG4gICAgLy8gQ29ycmVjdCBtaXNtYXRjaDogdXNlciBwcm92aWRlZCBwcm9kdWN0aW9uIGtleSBidXQgd3JvdGUgc2FuZGJveCBpbiBlbnZcclxuICAgIGFwaUVudiA9ICdwcm9kdWN0aW9uJztcclxuICB9IGVsc2UgaWYgKGFwaUVudiA9PT0gJ3Byb2R1Y3Rpb24nICYmIHNlY3JldEtleS5pbmNsdWRlcygnX3Rlc3RfJykpIHtcclxuICAgIGFwaUVudiA9ICdzYW5kYm94JztcclxuICB9XHJcblxyXG4gIHJldHVybiB7IGFwcElkLCBzZWNyZXRLZXksIGFwaUVudiB9O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihyZXE6IEluY29taW5nTWVzc2FnZSwgcmVzOiBTZXJ2ZXJSZXNwb25zZSkge1xyXG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdQT1NULCBPUFRJT05TJyk7XHJcbiAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcclxuICAgIHJlcy5lbmQoKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcclxuICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDQwNSwgeyBlcnJvcjogJ01ldGhvZCBOb3QgQWxsb3dlZC4gVXNlIFBPU1QuJyB9KTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHsgYXBwSWQsIHNlY3JldEtleSwgYXBpRW52IH0gPSBnZXRDYXNoZnJlZUNyZWRlbnRpYWxzKCk7XHJcblxyXG4gIGlmICghYXBwSWQgfHwgIXNlY3JldEtleSkge1xyXG4gICAgcmV0dXJuIHNlbmRKc29uKHJlcywgNDAxLCB7XHJcbiAgICAgIGVycm9yOlxyXG4gICAgICAgICdDYXNoZnJlZSBBUEkgY3JlZGVudGlhbHMgbm90IGNvbmZpZ3VyZWQuIFBsZWFzZSBzZXQgQ0FTSEZSRUVfQVBQX0lEIGFuZCBDQVNIRlJFRV9TRUNSRVRfS0VZIGluIGVudmlyb25tZW50IHZhcmlhYmxlcy4nLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHBhcnNlQm9keShyZXEpO1xyXG4gICAgY29uc3QgYW1vdW50ID0gTnVtYmVyKGJvZHkuYW1vdW50KTtcclxuICAgIGNvbnN0IGN1cnJlbmN5ID0gKGJvZHkuY3VycmVuY3kgYXMgc3RyaW5nKSB8fCAnSU5SJztcclxuICAgIGNvbnN0IGN1c3RvbWVyTmFtZSA9IChib2R5LmN1c3RvbWVyX25hbWUgYXMgc3RyaW5nKSB8fCAnQW5vbnltb3VzJztcclxuICAgIGNvbnN0IGN1c3RvbWVyRW1haWwgPSAoYm9keS5jdXN0b21lcl9lbWFpbCBhcyBzdHJpbmcpIHx8ICdub3JlcGx5QGNzd28uaW4nO1xyXG4gICAgY29uc3QgY3VzdG9tZXJQaG9uZSA9IChib2R5LmN1c3RvbWVyX3Bob25lIGFzIHN0cmluZykgfHwgJzk5OTk5OTk5OTknO1xyXG4gICAgY29uc3Qgb3JkZXJOb3RlID0gKGJvZHkub3JkZXJfbm90ZSBhcyBzdHJpbmcpIHx8ICdEb25hdGlvbiAvIENvbnRyaWJ1dGlvbic7XHJcbiAgICBjb25zdCByZWNlaXB0ID0gKGJvZHkucmVjZWlwdCBhcyBzdHJpbmcpIHx8IGBjc3dvX2NmXyR7RGF0ZS5ub3coKX1gO1xyXG5cclxuICAgIGlmICghYW1vdW50IHx8IGlzTmFOKGFtb3VudCkgfHwgYW1vdW50IDwgMSkge1xyXG4gICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA0MDAsIHtcclxuICAgICAgICBlcnJvcjogJ0ludmFsaWQgYW1vdW50LiBNaW5pbXVtIGFtb3VudCBpcyBcdTIwQjkxLjAwLicsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENhc2hmcmVlIEFQSSBiYXNlIFVSTFxyXG4gICAgY29uc3QgYmFzZVVybCA9XHJcbiAgICAgIGFwaUVudiA9PT0gJ3NhbmRib3gnXHJcbiAgICAgICAgPyAnaHR0cHM6Ly9zYW5kYm94LmNhc2hmcmVlLmNvbS9wZy9vcmRlcnMnXHJcbiAgICAgICAgOiAnaHR0cHM6Ly9hcGkuY2FzaGZyZWUuY29tL3BnL29yZGVycyc7XHJcblxyXG4gICAgY29uc3Qgb3JkZXJJZCA9IGAke3JlY2VpcHR9XyR7RGF0ZS5ub3coKX1gLnNsaWNlKDAsIDUwKS5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXS9nLCAnXycpO1xyXG5cclxuICAgIGNvbnN0IG9yZGVyUGF5bG9hZCA9IHtcclxuICAgICAgb3JkZXJfaWQ6IG9yZGVySWQsXHJcbiAgICAgIG9yZGVyX2Ftb3VudDogYW1vdW50LFxyXG4gICAgICBvcmRlcl9jdXJyZW5jeTogY3VycmVuY3kudG9VcHBlckNhc2UoKSxcclxuICAgICAgb3JkZXJfbm90ZTogb3JkZXJOb3RlLFxyXG4gICAgICBjdXN0b21lcl9kZXRhaWxzOiB7XHJcbiAgICAgICAgY3VzdG9tZXJfaWQ6IGBjdXN0XyR7RGF0ZS5ub3coKX1gLFxyXG4gICAgICAgIGN1c3RvbWVyX25hbWU6IGN1c3RvbWVyTmFtZSxcclxuICAgICAgICBjdXN0b21lcl9lbWFpbDogY3VzdG9tZXJFbWFpbCxcclxuICAgICAgICBjdXN0b21lcl9waG9uZTogY3VzdG9tZXJQaG9uZS5yZXBsYWNlKC9cXEQvZywgJycpLnNsaWNlKC0xMCkgfHwgJzk5OTk5OTk5OTknLFxyXG4gICAgICB9LFxyXG4gICAgICBvcmRlcl9tZXRhOiB7XHJcbiAgICAgICAgcmV0dXJuX3VybDogYCR7cmVzb2x2ZVNpdGVPcmlnaW4ocmVxKX0vcGF5bWVudC1yZXR1cm4/b3JkZXJfaWQ9e29yZGVyX2lkfWAsXHJcbiAgICAgICAgbm90aWZ5X3VybDogYCR7cmVzb2x2ZVNpdGVPcmlnaW4ocmVxKX0vYXBpL2Nhc2hmcmVlLXdlYmhvb2tgLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGJhc2VVcmwsIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICd4LWFwaS12ZXJzaW9uJzogJzIwMjMtMDgtMDEnLFxyXG4gICAgICAgICd4LWNsaWVudC1pZCc6IGFwcElkLFxyXG4gICAgICAgICd4LWNsaWVudC1zZWNyZXQnOiBzZWNyZXRLZXksXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KG9yZGVyUGF5bG9hZCksXHJcbiAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgxMDAwMCksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpIGFzIHtcclxuICAgICAgY2Zfb3JkZXJfaWQ/OiBzdHJpbmc7XHJcbiAgICAgIG9yZGVyX2lkPzogc3RyaW5nO1xyXG4gICAgICBwYXltZW50X3Nlc3Npb25faWQ/OiBzdHJpbmc7XHJcbiAgICAgIG9yZGVyX3N0YXR1cz86IHN0cmluZztcclxuICAgICAgb3JkZXJfYW1vdW50PzogbnVtYmVyO1xyXG4gICAgICBvcmRlcl9jdXJyZW5jeT86IHN0cmluZztcclxuICAgICAgbWVzc2FnZT86IHN0cmluZztcclxuICAgIH07XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdDYXNoZnJlZSBvcmRlciBjcmVhdGlvbiBmYWlsZWQ6JywgZGF0YSk7XHJcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIHJlc3BvbnNlLnN0YXR1cywge1xyXG4gICAgICAgIGVycm9yOiBkYXRhLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBjcmVhdGUgQ2FzaGZyZWUgb3JkZXInLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCAyMDAsIHtcclxuICAgICAgb3JkZXJfaWQ6IGRhdGEub3JkZXJfaWQgfHwgb3JkZXJJZCxcclxuICAgICAgcGF5bWVudF9zZXNzaW9uX2lkOiBkYXRhLnBheW1lbnRfc2Vzc2lvbl9pZCxcclxuICAgICAgb3JkZXJfc3RhdHVzOiBkYXRhLm9yZGVyX3N0YXR1cyxcclxuICAgICAgb3JkZXJfYW1vdW50OiBkYXRhLm9yZGVyX2Ftb3VudCB8fCBhbW91bnQsXHJcbiAgICAgIG9yZGVyX2N1cnJlbmN5OiBkYXRhLm9yZGVyX2N1cnJlbmN5IHx8IGN1cnJlbmN5LFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyOiB1bmtub3duKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyBDYXNoZnJlZSBvcmRlcjonLCBlcnIpO1xyXG4gICAgY29uc3QgZXJyT2JqID0gZXJyIGFzIHsgbWVzc2FnZT86IHN0cmluZyB9O1xyXG4gICAgcmV0dXJuIHNlbmRKc29uKHJlcywgNTAwLCB7IGVycm9yOiBlcnJPYmo/Lm1lc3NhZ2UgfHwgJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSk7XHJcbiAgfVxyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXEJBU0lDXFxcXFBlcnNvbmFsXFxcXE15IFN0dWR5XFxcXFNraWxsIFRBU0sgMjAyNVxcXFwwMDIuIFdlYiBEZXZlbG9wbWVudFxcXFwwNC4gT3RoZXJzXFxcXE5hcmFqb2xlIENoYXRyb2RvbFxcXFxuYXJham9sZV9jaGF0cm9kb2xcXFxcYXBpXFxcXGNhc2hmcmVlLXZlcmlmeS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovQkFTSUMvUGVyc29uYWwvTXklMjBTdHVkeS9Ta2lsbCUyMFRBU0slMjAyMDI1LzAwMi4lMjBXZWIlMjBEZXZlbG9wbWVudC8wNC4lMjBPdGhlcnMvTmFyYWpvbGUlMjBDaGF0cm9kb2wvbmFyYWpvbGVfY2hhdHJvZG9sL2FwaS9jYXNoZnJlZS12ZXJpZnkudHNcIjsvKipcbiAqIGFwaS9jYXNoZnJlZS12ZXJpZnkudHNcbiAqXG4gKiBWZXJpZmllcyBhIENhc2hmcmVlIG9yZGVyIHN0YXR1cyBzZXJ2ZXItdG8tc2VydmVyLlxuICogRGVsZWdhdGVzIEFMTCBTdXBhYmFzZSByZWNvcmQgdXBkYXRlcyB0byB0aGUgY2VudHJhbCBmaW5hbGl6ZVBheW1lbnQoKSBmdW5jdGlvbi5cbiAqIEZpcmVzIHJlY2VpcHQgZW1haWwgbm9uLWJsb2NraW5nIHNvIHRoZSBjdXN0b21lciBnZXRzIGFuIGluc3RhbnQgcmVzcG9uc2UuXG4gKlxuICogUmVzcG9uc2Ugc2hhcGU6XG4gKiAgIHsgc3VjY2VzczogYm9vbGVhbjsgc3RhdHVzOiBzdHJpbmc7IG9yZGVyX2lkOiBzdHJpbmc7IHBheW1lbnRfaWQ/OiBzdHJpbmcgfVxuICovXG5cbmltcG9ydCB0eXBlIHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IHsgZmluYWxpemVQYXltZW50IH0gZnJvbSAnLi9fbGliL2ZpbmFsaXplLXBheW1lbnQnO1xuaW1wb3J0IHsgc2VuZFBheW1lbnRSZWNlaXB0IH0gZnJvbSAnLi9fbGliL3BheW1lbnQtcmVjZWlwdCc7XG5pbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuXG5mdW5jdGlvbiBzZW5kSnNvbihyZXM6IFNlcnZlclJlc3BvbnNlLCBzdGF0dXNDb2RlOiBudW1iZXIsIGRhdGE6IHVua25vd24pIHtcbiAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcbiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdQT1NULCBHRVQsIE9QVElPTlMnKTtcbiAgcmVzLnN0YXR1c0NvZGUgPSBzdGF0dXNDb2RlO1xuICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VCb2R5KFxuICByZXE6IEluY29taW5nTWVzc2FnZSxcbik6IFByb21pc2U8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+IHtcbiAgaWYgKChyZXEgYXMgdW5rbm93biBhcyB7IGJvZHk/OiB1bmtub3duIH0pLmJvZHkpIHtcbiAgICBjb25zdCBiID0gKHJlcSBhcyB1bmtub3duIGFzIHsgYm9keTogdW5rbm93biB9KS5ib2R5O1xuICAgIHJldHVybiB0eXBlb2YgYiA9PT0gJ3N0cmluZydcbiAgICAgID8gSlNPTi5wYXJzZShiKVxuICAgICAgOiAoYiBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik7XG4gIH1cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZGF0YSA9ICcnO1xuICAgIHJlcS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgZGF0YSArPSBjaHVuaztcbiAgICB9KTtcbiAgICByZXEub24oJ2VuZCcsICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmUoZGF0YSA/IEpTT04ucGFyc2UoZGF0YSkgOiB7fSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRFbnZWYWx1ZShrZXk6IHN0cmluZywgZmFsbGJhY2sgPSAnJyk6IHN0cmluZyB7XG4gIGlmIChwcm9jZXNzLmVudltrZXldKSByZXR1cm4gcHJvY2Vzcy5lbnZba2V5XSBhcyBzdHJpbmc7XG4gIHRyeSB7XG4gICAgY29uc3QgZW52UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLmVudicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGVudlBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGVudlBhdGgsICd1dGYtOCcpO1xuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoJ1xcbicpKSB7XG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgW2ssIC4uLnZdID0gdHJpbW1lZC5zcGxpdCgnPScpO1xuICAgICAgICBpZiAoaz8udHJpbSgpID09PSBrZXkpIHtcbiAgICAgICAgICByZXR1cm4gdi5qb2luKCc9JykudHJpbSgpLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBmYWxsYmFja1xuICB9XG4gIHJldHVybiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gZ2V0Q2FzaGZyZWVDcmVkZW50aWFscygpOiB7XG4gIGFwcElkOiBzdHJpbmc7XG4gIHNlY3JldEtleTogc3RyaW5nO1xuICBhcGlFbnY6IHN0cmluZztcbn0ge1xuICBsZXQgYXBwSWQgPSBnZXRFbnZWYWx1ZSgnQ0FTSEZSRUVfQVBQX0lEJyk7XG4gIGxldCBzZWNyZXRLZXkgPSBnZXRFbnZWYWx1ZSgnQ0FTSEZSRUVfU0VDUkVUX0tFWScpO1xuICBsZXQgYXBpRW52ID0gZ2V0RW52VmFsdWUoJ0NBU0hGUkVFX0FQSV9FTlYnKTtcblxuICBpZiAoIWFwaUVudikge1xuICAgIGlmIChzZWNyZXRLZXkuaW5jbHVkZXMoJ19wcm9kXycpKSB7XG4gICAgICBhcGlFbnYgPSAncHJvZHVjdGlvbic7XG4gICAgfSBlbHNlIGlmIChzZWNyZXRLZXkuaW5jbHVkZXMoJ190ZXN0XycpKSB7XG4gICAgICBhcGlFbnYgPSAnc2FuZGJveCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwaUVudiA9ICdwcm9kdWN0aW9uJztcbiAgICB9XG4gIH0gZWxzZSBpZiAoYXBpRW52ID09PSAnc2FuZGJveCcgJiYgc2VjcmV0S2V5LmluY2x1ZGVzKCdfcHJvZF8nKSkge1xuICAgIGFwaUVudiA9ICdwcm9kdWN0aW9uJztcbiAgfSBlbHNlIGlmIChhcGlFbnYgPT09ICdwcm9kdWN0aW9uJyAmJiBzZWNyZXRLZXkuaW5jbHVkZXMoJ190ZXN0XycpKSB7XG4gICAgYXBpRW52ID0gJ3NhbmRib3gnO1xuICB9XG5cbiAgcmV0dXJuIHsgYXBwSWQsIHNlY3JldEtleSwgYXBpRW52IH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoXG4gIHJlcTogSW5jb21pbmdNZXNzYWdlLFxuICByZXM6IFNlcnZlclJlc3BvbnNlLFxuKSB7XG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyk7XG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdQT1NULCBHRVQsIE9QVElPTlMnKTtcbiAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcbiAgICByZXMuZW5kKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgeyBhcHBJZCwgc2VjcmV0S2V5LCBhcGlFbnYgfSA9IGdldENhc2hmcmVlQ3JlZGVudGlhbHMoKTtcblxuICBpZiAoIWFwcElkIHx8ICFzZWNyZXRLZXkpIHtcbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA0MDEsIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgZXJyb3I6ICdDYXNoZnJlZSBBUEkgY3JlZGVudGlhbHMgbm90IGNvbmZpZ3VyZWQuJyxcbiAgICB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgbGV0IG9yZGVySWQgPSAnJztcbiAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICBjb25zdCBib2R5ID0gYXdhaXQgcGFyc2VCb2R5KHJlcSk7XG4gICAgICBvcmRlcklkID0gKChib2R5Lm9yZGVyX2lkIGFzIHN0cmluZykgfHwgJycpLnRyaW0oKTtcbiAgICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKFxuICAgICAgICByZXEudXJsIHx8ICcnLFxuICAgICAgICBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdCB8fCAnbG9jYWxob3N0J31gLFxuICAgICAgKTtcbiAgICAgIG9yZGVySWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnb3JkZXJfaWQnKSB8fCAnJztcbiAgICB9XG5cbiAgICBpZiAoIW9yZGVySWQpIHtcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDQwMCwge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICBlcnJvcjogJ01pc3Npbmcgb3JkZXJfaWQgcGFyYW1ldGVyLicsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlSGVhZGVycyA9IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAneC1hcGktdmVyc2lvbic6ICcyMDIzLTA4LTAxJyxcbiAgICAgICd4LWNsaWVudC1pZCc6IGFwcElkLFxuICAgICAgJ3gtY2xpZW50LXNlY3JldCc6IHNlY3JldEtleSxcbiAgICB9O1xuXG4gICAgY29uc3QgYmFzZVVybCA9XG4gICAgICBhcGlFbnYgPT09ICdzYW5kYm94J1xuICAgICAgICA/IGBodHRwczovL3NhbmRib3guY2FzaGZyZWUuY29tL3BnL29yZGVycy8ke29yZGVySWR9YFxuICAgICAgICA6IGBodHRwczovL2FwaS5jYXNoZnJlZS5jb20vcGcvb3JkZXJzLyR7b3JkZXJJZH1gO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEZldGNoIG9yZGVyIGZyb20gQ2FzaGZyZWUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3Qgb3JkZXJSZXMgPSBhd2FpdCBmZXRjaChiYXNlVXJsLCB7XG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgaGVhZGVyczogYmFzZUhlYWRlcnMsXG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMTAwMDApLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgb3JkZXJEYXRhID0gKGF3YWl0IG9yZGVyUmVzLmpzb24oKSkgYXMge1xuICAgICAgb3JkZXJfaWQ/OiBzdHJpbmc7XG4gICAgICBvcmRlcl9zdGF0dXM/OiBzdHJpbmc7XG4gICAgICBvcmRlcl9hbW91bnQ/OiBudW1iZXI7XG4gICAgICBvcmRlcl9jdXJyZW5jeT86IHN0cmluZztcbiAgICAgIGNmX29yZGVyX2lkPzogc3RyaW5nO1xuICAgICAgbWVzc2FnZT86IHN0cmluZztcbiAgICB9O1xuXG4gICAgaWYgKCFvcmRlclJlcy5vaykge1xuICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgb3JkZXJSZXMuc3RhdHVzLCB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgIGVycm9yOlxuICAgICAgICAgIG9yZGVyRGF0YS5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gZmV0Y2ggb3JkZXIgc3RhdHVzIGZyb20gQ2FzaGZyZWUuJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBpc1BhaWQgPSBvcmRlckRhdGEub3JkZXJfc3RhdHVzID09PSAnUEFJRCc7XG4gICAgbGV0IHBheW1lbnRJZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gb3JkZXJEYXRhLmNmX29yZGVyX2lkIHx8IG9yZGVyRGF0YS5vcmRlcl9pZDtcbiAgICBsZXQgcGF5bWVudE1ldGhvZCA9ICdDYXNoZnJlZSBQYXltZW50cyc7XG4gICAgbGV0IHJhd1N0YXR1cyA9IG9yZGVyRGF0YS5vcmRlcl9zdGF0dXMgfHwgJ1BFTkRJTkcnO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIElmIG9yZGVyIGlzIEFDVElWRS9QRU5ESU5HLCBjaGVjayBwYXltZW50cyBsaXN0IGZvciBhIFNVQ0NFU1MgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKCFpc1BhaWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBheW1lbnRzVXJsID1cbiAgICAgICAgICBhcGlFbnYgPT09ICdzYW5kYm94J1xuICAgICAgICAgICAgPyBgaHR0cHM6Ly9zYW5kYm94LmNhc2hmcmVlLmNvbS9wZy9vcmRlcnMvJHtvcmRlcklkfS9wYXltZW50c2BcbiAgICAgICAgICAgIDogYGh0dHBzOi8vYXBpLmNhc2hmcmVlLmNvbS9wZy9vcmRlcnMvJHtvcmRlcklkfS9wYXltZW50c2A7XG5cbiAgICAgICAgY29uc3QgcFJlcyA9IGF3YWl0IGZldGNoKHBheW1lbnRzVXJsLCB7XG4gICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICBoZWFkZXJzOiBiYXNlSGVhZGVycyxcbiAgICAgICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMTAwMDApLFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAocFJlcy5vaykge1xuICAgICAgICAgIGNvbnN0IHBMaXN0ID0gKGF3YWl0IHBSZXMuanNvbigpKSBhcyBBcnJheTx7XG4gICAgICAgICAgICBwYXltZW50X3N0YXR1cz86IHN0cmluZztcbiAgICAgICAgICAgIGNmX3BheW1lbnRfaWQ/OiBzdHJpbmc7XG4gICAgICAgICAgICBwYXltZW50X2dyb3VwPzogc3RyaW5nO1xuICAgICAgICAgIH0+O1xuXG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocExpc3QpICYmIHBMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NQYXltZW50ID0gcExpc3QuZmluZChcbiAgICAgICAgICAgICAgKHApID0+IHAucGF5bWVudF9zdGF0dXM/LnRvVXBwZXJDYXNlKCkgPT09ICdTVUNDRVNTJyxcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmIChzdWNjZXNzUGF5bWVudCkge1xuICAgICAgICAgICAgICBpc1BhaWQgPSB0cnVlO1xuICAgICAgICAgICAgICByYXdTdGF0dXMgPSAnU1VDQ0VTUyc7XG4gICAgICAgICAgICAgIGlmIChzdWNjZXNzUGF5bWVudC5jZl9wYXltZW50X2lkKSB7XG4gICAgICAgICAgICAgICAgcGF5bWVudElkID0gU3RyaW5nKHN1Y2Nlc3NQYXltZW50LmNmX3BheW1lbnRfaWQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzdWNjZXNzUGF5bWVudC5wYXltZW50X2dyb3VwKSB7XG4gICAgICAgICAgICAgICAgcGF5bWVudE1ldGhvZCA9IGBDYXNoZnJlZSAoJHtzdWNjZXNzUGF5bWVudC5wYXltZW50X2dyb3VwLnRvVXBwZXJDYXNlKCl9KWA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFVzZSB0aGUgbW9zdCByZWNlbnQgcGF5bWVudCdzIHN0YXR1cyBmb3IgYWNjdXJhdGUgcmVwb3J0aW5nXG4gICAgICAgICAgICAgIGNvbnN0IGxhdGVzdCA9IHBMaXN0WzBdO1xuICAgICAgICAgICAgICBpZiAobGF0ZXN0Py5wYXltZW50X3N0YXR1cykge1xuICAgICAgICAgICAgICAgIHJhd1N0YXR1cyA9IGxhdGVzdC5wYXltZW50X3N0YXR1cy50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChwRXJyKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignW2Nhc2hmcmVlLXZlcmlmeV0gRXJyb3IgY2hlY2tpbmcgcGF5bWVudHMgbGlzdDonLCBwRXJyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQ2VudHJhbGx5IHVwZGF0ZSBTdXBhYmFzZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmaW5hbGl6ZVBheW1lbnQoe1xuICAgICAgZ2F0ZXdheTogJ2Nhc2hmcmVlJyxcbiAgICAgIG9yZGVySWQsXG4gICAgICBwYXltZW50SWQsXG4gICAgICBnYXRld2F5U3RhdHVzOiByYXdTdGF0dXMsXG4gICAgICBwYXltZW50TWV0aG9kLFxuICAgIH0pO1xuXG4gICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgLy8gQ2FzaGZyZWUgbWF5IHNheSBQQUlELCBidXQgaWYgd2UgaGF2ZSBubyBtYXRjaGluZyBTdXBhYmFzZSByZWNvcmQgd2VcbiAgICAgIC8vIG11c3QgTk9UIHRlbGwgdGhlIGJyb3dzZXIgXCJwYWlkXCIgXHUyMDE0IHRoYXQgd291bGQgc2hvdyBhIGZhbHNlIHN1Y2Nlc3NcbiAgICAgIC8vIHNjcmVlbiB3aXRoIG5vIHJlY2VpcHQgYmVoaW5kIGl0LiBSZXBvcnQgJ3BlbmRpbmcnIHNvIHRoZSBjbGllbnRcbiAgICAgIC8vIGtlZXBzIHBvbGxpbmcgLyBldmVudHVhbGx5IHN1cmZhY2VzIGEgY2xlYXIgdGltZW91dCBpbnN0ZWFkLlxuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgYFtjYXNoZnJlZS12ZXJpZnldIGZpbmFsaXplUGF5bWVudCBjb3VsZCBub3QgbG9jYXRlIGEgcmVjb3JkIGZvciBvcmRlciAke29yZGVySWR9IChDYXNoZnJlZSBpc1BhaWQ9JHtpc1BhaWR9KTpgLFxuICAgICAgICByZXN1bHQuZXJyb3IsXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBEaXNwYXRjaCByZWNlaXB0IGVtYWlsIGFzeW5jaHJvbm91c2x5IChmaXJlLWFuZC1mb3JnZXQpIHRvIGtlZXAgdmVyaWZpY2F0aW9uIHBvbGxpbmcgZmFzdCBcdTI1MDBcdTI1MDBcbiAgICBpZiAocmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0LnN0YXR1cyA9PT0gJ3BhaWQnICYmIHJlc3VsdC5zaG91bGRTZW5kUmVjZWlwdCkge1xuICAgICAgdm9pZCBzZW5kUGF5bWVudFJlY2VpcHQoe1xuICAgICAgICB0eXBlOiByZXN1bHQudHlwZSEsXG4gICAgICAgIHJlY29yZDogcmVzdWx0LnJlY29yZCEsXG4gICAgICAgIGxpbmtlZFJlY29yZElkczogcmVzdWx0LmxpbmtlZFJlY29yZElkcyxcbiAgICAgICAgcGF5bWVudE1ldGhvZDogcmVzdWx0LnBheW1lbnRNZXRob2QgfHwgcGF5bWVudE1ldGhvZCxcbiAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW2Nhc2hmcmVlLXZlcmlmeV0gUmVjZWlwdCBlbWFpbCBkaXNwYXRjaCBlcnJvcjonLCBlcnIpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZmluYWxTdGF0dXMgPSByZXN1bHQuc3VjY2VzcyA/IChyZXN1bHQuc3RhdHVzIHx8ICdwZW5kaW5nJykgOiAncGVuZGluZyc7XG5cbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCAyMDAsIHtcbiAgICAgIHN1Y2Nlc3M6IGZpbmFsU3RhdHVzID09PSAncGFpZCcsXG4gICAgICBzdGF0dXM6IGZpbmFsU3RhdHVzLFxuICAgICAgb3JkZXJfaWQ6IG9yZGVyRGF0YS5vcmRlcl9pZCB8fCBvcmRlcklkLFxuICAgICAgcGF5bWVudF9pZDogcGF5bWVudElkLFxuICAgICAgcGF5bWVudF9tZXRob2Q6IHBheW1lbnRNZXRob2QsXG4gICAgICBvcmRlcl9hbW91bnQ6IG9yZGVyRGF0YS5vcmRlcl9hbW91bnQsXG4gICAgICBvcmRlcl9jdXJyZW5jeTogb3JkZXJEYXRhLm9yZGVyX2N1cnJlbmN5LFxuICAgICAgLy8gSW5jbHVkZSB0eXBlIGFuZCByZWNlaXB0X251bWJlciBzbyBmcm9udGVuZCBjYW4gZGlzcGxheSB0aGVtXG4gICAgICB0eXBlOiByZXN1bHQudHlwZSxcbiAgICAgIHJlY2VpcHRfbnVtYmVyOlxuICAgICAgICAocmVzdWx0LnJlY29yZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZClcbiAgICAgICAgICA/LnJlY2VpcHRfbnVtYmVyID8/IG51bGwsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycjogdW5rbm93bikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tjYXNoZnJlZS12ZXJpZnldIEVycm9yOicsIGVycik7XG4gICAgY29uc3QgZXJyT2JqID0gZXJyIGFzIHsgbWVzc2FnZT86IHN0cmluZyB9O1xuICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDUwMCwge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICBlcnJvcjogZXJyT2JqPy5tZXNzYWdlIHx8ICdWZXJpZmljYXRpb24gZXJyb3InLFxuICAgIH0pO1xuICB9XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkU6XFxcXEJBU0lDXFxcXFBlcnNvbmFsXFxcXE15IFN0dWR5XFxcXFNraWxsIFRBU0sgMjAyNVxcXFwwMDIuIFdlYiBEZXZlbG9wbWVudFxcXFwwNC4gT3RoZXJzXFxcXE5hcmFqb2xlIENoYXRyb2RvbFxcXFxuYXJham9sZV9jaGF0cm9kb2xcXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxCQVNJQ1xcXFxQZXJzb25hbFxcXFxNeSBTdHVkeVxcXFxTa2lsbCBUQVNLIDIwMjVcXFxcMDAyLiBXZWIgRGV2ZWxvcG1lbnRcXFxcMDQuIE90aGVyc1xcXFxOYXJham9sZSBDaGF0cm9kb2xcXFxcbmFyYWpvbGVfY2hhdHJvZG9sXFxcXGFwaVxcXFxjYXNoZnJlZS13ZWJob29rLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9CQVNJQy9QZXJzb25hbC9NeSUyMFN0dWR5L1NraWxsJTIwVEFTSyUyMDIwMjUvMDAyLiUyMFdlYiUyMERldmVsb3BtZW50LzA0LiUyME90aGVycy9OYXJham9sZSUyMENoYXRyb2RvbC9uYXJham9sZV9jaGF0cm9kb2wvYXBpL2Nhc2hmcmVlLXdlYmhvb2sudHNcIjsvKipcbiAqIGFwaS9jYXNoZnJlZS13ZWJob29rLnRzXG4gKlxuICogU2VjdXJlIFdlYmhvb2sgaGFuZGxlciBmb3IgQ2FzaGZyZWUgUEcgZXZlbnRzLlxuICpcbiAqIFNlY3VyaXR5ICYgUmVsaWFiaWxpdHk6XG4gKiAgIDEuIFZlcmlmaWVzIENhc2hmcmVlIEhNQUMtU0hBMjU2IHNpZ25hdHVyZSB1c2luZyB4LXdlYmhvb2stc2lnbmF0dXJlIGFuZCB4LXdlYmhvb2stdGltZXN0YW1wLlxuICogICAyLiBEZWxlZ2F0ZXMgQUxMIHBheW1lbnQgc3RhdGUgbG9naWMgdG8gY2VudHJhbCBmaW5hbGl6ZVBheW1lbnQoKS5cbiAqICAgMy4gQXdhaXRzIHJlY2VpcHQgZW1haWwgZGlzcGF0Y2ggc28gc2VydmVybGVzcyBydW50aW1lIGRvZXNuJ3QgdGVybWluYXRlIHByZW1hdHVyZWx5LlxuICogICA0LiBIYW5kbGVzIGFsbCBzdGF0dXNlcyAoUEFJRCwgRkFJTEVELCBDQU5DRUxMRUQsIFVTRVJfRFJPUFBFRCwgRVhQSVJFRCwgUEVORElORykuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBJbmNvbWluZ01lc3NhZ2UsIFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaW5hbGl6ZVBheW1lbnQgfSBmcm9tICcuL19saWIvZmluYWxpemUtcGF5bWVudCc7XG5pbXBvcnQgeyBzZW5kUGF5bWVudFJlY2VpcHQgfSBmcm9tICcuL19saWIvcGF5bWVudC1yZWNlaXB0JztcblxuZnVuY3Rpb24gc2VuZEpzb24ocmVzOiBTZXJ2ZXJSZXNwb25zZSwgc3RhdHVzQ29kZTogbnVtYmVyLCBkYXRhOiB1bmtub3duKSB7XG4gIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gIHJlcy5zZXRIZWFkZXIoXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLFxuICAgICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24sIHgtd2ViaG9vay1zaWduYXR1cmUsIHgtd2ViaG9vay10aW1lc3RhbXAnLFxuICApO1xuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ1BPU1QsIEdFVCwgT1BUSU9OUycpO1xuICByZXMuc3RhdHVzQ29kZSA9IHN0YXR1c0NvZGU7XG4gIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xufVxuXG5mdW5jdGlvbiBnZXRFbnZWYWx1ZShrZXk6IHN0cmluZywgZmFsbGJhY2sgPSAnJyk6IHN0cmluZyB7XG4gIGlmIChwcm9jZXNzLmVudltrZXldKSByZXR1cm4gcHJvY2Vzcy5lbnZba2V5XSBhcyBzdHJpbmc7XG4gIHRyeSB7XG4gICAgY29uc3QgZW52UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLmVudicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGVudlBhdGgpKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGVudlBhdGgsICd1dGYtOCcpO1xuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoJ1xcbicpKSB7XG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgW2ssIC4uLnZdID0gdHJpbW1lZC5zcGxpdCgnPScpO1xuICAgICAgICBpZiAoaz8udHJpbSgpID09PSBrZXkpIHtcbiAgICAgICAgICByZXR1cm4gdi5qb2luKCc9JykudHJpbSgpLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBmYWxsYmFja1xuICB9XG4gIHJldHVybiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gcmVhZFJhd0JvZHkocmVxOiBJbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCByYXcgPSAnJztcbiAgICByZXEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIHJhdyArPSBjaHVuay50b1N0cmluZygpO1xuICAgIH0pO1xuICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgcmVzb2x2ZShyYXcpO1xuICAgIH0pO1xuICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gdmVyaWZ5Q2FzaGZyZWVTaWduYXR1cmUoXG4gIHJhd0JvZHk6IHN0cmluZyxcbiAgc2lnbmF0dXJlSGVhZGVyPzogc3RyaW5nLFxuICB0aW1lc3RhbXBIZWFkZXI/OiBzdHJpbmcsXG4gIHNlY3JldEtleT86IHN0cmluZyxcbik6IGJvb2xlYW4ge1xuICBpZiAoIXNpZ25hdHVyZUhlYWRlciB8fCAhdGltZXN0YW1wSGVhZGVyIHx8ICFzZWNyZXRLZXkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGRhdGFUb1NpZ24gPSB0aW1lc3RhbXBIZWFkZXIgKyByYXdCb2R5O1xuXG4gICAgLy8gQ2FzaGZyZWUgUEcgdjIvdjMgV2ViaG9va3MgdXNlIEhNQUMtU0hBMjU2IGVuY29kZWQgYXMgYmFzZTY0IG9yIGhleFxuICAgIGNvbnN0IGhtYWMgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMjU2Jywgc2VjcmV0S2V5KTtcbiAgICBobWFjLnVwZGF0ZShkYXRhVG9TaWduKTtcbiAgICBjb25zdCBleHBlY3RlZEJhc2U2NCA9IGhtYWMuZGlnZXN0KCdiYXNlNjQnKTtcblxuICAgIGNvbnN0IGhtYWNIZXggPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMjU2Jywgc2VjcmV0S2V5KTtcbiAgICBobWFjSGV4LnVwZGF0ZShkYXRhVG9TaWduKTtcbiAgICBjb25zdCBleHBlY3RlZEhleCA9IGhtYWNIZXguZGlnZXN0KCdoZXgnKTtcblxuICAgIGNvbnN0IHNpZ0J1ZiA9IEJ1ZmZlci5mcm9tKHNpZ25hdHVyZUhlYWRlcik7XG4gICAgY29uc3QgYmFzZTY0QnVmID0gQnVmZmVyLmZyb20oZXhwZWN0ZWRCYXNlNjQpO1xuICAgIGNvbnN0IGhleEJ1ZiA9IEJ1ZmZlci5mcm9tKGV4cGVjdGVkSGV4KTtcblxuICAgIGNvbnN0IG1hdGNoZXNCYXNlNjQgPVxuICAgICAgc2lnQnVmLmxlbmd0aCA9PT0gYmFzZTY0QnVmLmxlbmd0aCAmJlxuICAgICAgY3J5cHRvLnRpbWluZ1NhZmVFcXVhbChzaWdCdWYsIGJhc2U2NEJ1Zik7XG5cbiAgICBjb25zdCBtYXRjaGVzSGV4ID1cbiAgICAgIHNpZ0J1Zi5sZW5ndGggPT09IGhleEJ1Zi5sZW5ndGggJiZcbiAgICAgIGNyeXB0by50aW1pbmdTYWZlRXF1YWwoc2lnQnVmLCBoZXhCdWYpO1xuXG4gICAgcmV0dXJuIG1hdGNoZXNCYXNlNjQgfHwgbWF0Y2hlc0hleDtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcignW0Nhc2hmcmVlIFdlYmhvb2sgU2lnbmF0dXJlIENoZWNrIEVycm9yXTonLCBlcnIpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKFxuICByZXE6IEluY29taW5nTWVzc2FnZSxcbiAgcmVzOiBTZXJ2ZXJSZXNwb25zZSxcbikge1xuICAvLyBDT1JTIHByZWZsaWdodFxuICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICByZXMuc2V0SGVhZGVyKFxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLFxuICAgICAgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbiwgeC13ZWJob29rLXNpZ25hdHVyZSwgeC13ZWJob29rLXRpbWVzdGFtcCcsXG4gICAgKTtcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ1BPU1QsIEdFVCwgT1BUSU9OUycpO1xuICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwO1xuICAgIHJlcy5lbmQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBIZWFsdGggY2hlY2tcbiAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgcmV0dXJuIHNlbmRKc29uKHJlcywgMjAwLCB7XG4gICAgICBzdGF0dXM6ICdPTkxJTkUnLFxuICAgICAgc2VydmljZTogJ0Nhc2hmcmVlIFdlYmhvb2sgSGFuZGxlcicsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA0MDUsIHsgZXJyb3I6ICdNZXRob2QgTm90IEFsbG93ZWQuIFVzZSBQT1NULicgfSk7XG4gIH1cblxuICBjb25zdCBzZWNyZXRLZXkgPSBnZXRFbnZWYWx1ZSgnQ0FTSEZSRUVfU0VDUkVUX0tFWScpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmF3Qm9keSA9IGF3YWl0IHJlYWRSYXdCb2R5KHJlcSk7XG4gICAgY29uc3Qgc2lnbmF0dXJlID0gKHJlcS5oZWFkZXJzWyd4LXdlYmhvb2stc2lnbmF0dXJlJ10gYXMgc3RyaW5nKSB8fCAnJztcbiAgICBjb25zdCB0aW1lc3RhbXAgPSAocmVxLmhlYWRlcnNbJ3gtd2ViaG9vay10aW1lc3RhbXAnXSBhcyBzdHJpbmcpIHx8ICcnO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIDEuIENyeXB0b2dyYXBoaWMgU2lnbmF0dXJlIFZlcmlmaWNhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoIXNlY3JldEtleSkge1xuICAgICAgY29uc29sZS5lcnJvcignW0Nhc2hmcmVlIFdlYmhvb2tdIFx1Mjc0QyBDQVNIRlJFRV9TRUNSRVRfS0VZIG5vdCBjb25maWd1cmVkIFx1MjAxNCByZWplY3Rpbmcgd2ViaG9vay4nKTtcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDUwMCwge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6ICdXZWJob29rIHNpZ25pbmcga2V5IG5vdCBjb25maWd1cmVkJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGlzVmFsaWQgPSB2ZXJpZnlDYXNoZnJlZVNpZ25hdHVyZShcbiAgICAgIHJhd0JvZHksXG4gICAgICBzaWduYXR1cmUsXG4gICAgICB0aW1lc3RhbXAsXG4gICAgICBzZWNyZXRLZXksXG4gICAgKTtcblxuICAgIGlmICghaXNWYWxpZCkge1xuICAgICAgY29uc29sZS5lcnJvcignW0Nhc2hmcmVlIFdlYmhvb2tdIFx1Mjc0QyBJbnZhbGlkIHNpZ25hdHVyZSByZWNlaXZlZC4nKTtcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDQwMSwge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6ICdJbnZhbGlkIHdlYmhvb2sgc2lnbmF0dXJlJyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCAyLiBQYXJzZSBwYXlsb2FkIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGxldCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIHRyeSB7XG4gICAgICBwYXlsb2FkID0gcmF3Qm9keSA/IChKU09OLnBhcnNlKHJhd0JvZHkpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA6IHt9O1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgNDAwLCB7IGVycm9yOiAnSW52YWxpZCBKU09OIHBheWxvYWQnIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGV2ZW50VHlwZSA9XG4gICAgICAocGF5bG9hZC50eXBlIGFzIHN0cmluZykgfHwgKHBheWxvYWQuZXZlbnQgYXMgc3RyaW5nKSB8fCAnJztcblxuICAgIGNvbnN0IGV2ZW50RGF0YSA9XG4gICAgICAocGF5bG9hZC5kYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8fCBwYXlsb2FkO1xuXG4gICAgY29uc3Qgb3JkZXIgPSAoZXZlbnREYXRhLm9yZGVyIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8fCB7fTtcbiAgICBjb25zdCBwYXltZW50ID0gKGV2ZW50RGF0YS5wYXltZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8fCB7fTtcblxuICAgIGNvbnN0IG9yZGVySWQgPVxuICAgICAgKG9yZGVyLm9yZGVyX2lkIGFzIHN0cmluZykgfHxcbiAgICAgIChldmVudERhdGEub3JkZXJfaWQgYXMgc3RyaW5nKSB8fFxuICAgICAgJyc7XG5cbiAgICBjb25zdCBwYXltZW50SWQgPSBTdHJpbmcoXG4gICAgICBwYXltZW50LmNmX3BheW1lbnRfaWQgfHwgZXZlbnREYXRhLmNmX3BheW1lbnRfaWQgfHwgJycsXG4gICAgKSB8fCB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBwYXltZW50U3RhdHVzID1cbiAgICAgIChwYXltZW50LnBheW1lbnRfc3RhdHVzIGFzIHN0cmluZykgfHxcbiAgICAgIChldmVudERhdGEucGF5bWVudF9zdGF0dXMgYXMgc3RyaW5nKSB8fFxuICAgICAgKG9yZGVyLm9yZGVyX3N0YXR1cyBhcyBzdHJpbmcpIHx8XG4gICAgICAnJztcblxuICAgIGNvbnN0IHBheW1lbnRHcm91cCA9IHBheW1lbnQucGF5bWVudF9ncm91cCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgcGF5bWVudE1ldGhvZCA9IHBheW1lbnRHcm91cFxuICAgICAgPyBgQ2FzaGZyZWUgKCR7cGF5bWVudEdyb3VwLnRvVXBwZXJDYXNlKCl9KWBcbiAgICAgIDogJ0Nhc2hmcmVlIFBheW1lbnRzJztcblxuICAgIGlmICghb3JkZXJJZCkge1xuICAgICAgY29uc29sZS53YXJuKCdbQ2FzaGZyZWUgV2ViaG9va10gTWlzc2luZyBvcmRlcl9pZCBpbiBwYXlsb2FkJyk7XG4gICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCAyMDAsIHtcbiAgICAgICAgcmVjZWl2ZWQ6IHRydWUsXG4gICAgICAgIHdhcm5pbmc6ICdPcmRlciBJRCBtaXNzaW5nIGluIHBheWxvYWQnLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXG4gICAgICBgW0Nhc2hmcmVlIFdlYmhvb2tdIEV2ZW50OiAke2V2ZW50VHlwZX0sIE9yZGVyOiAke29yZGVySWR9LCBTdGF0dXM6ICR7cGF5bWVudFN0YXR1c31gLFxuICAgICk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgMy4gQ2VudHJhbCBwYXltZW50IHVwZGF0ZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmaW5hbGl6ZVBheW1lbnQoe1xuICAgICAgZ2F0ZXdheTogJ2Nhc2hmcmVlJyxcbiAgICAgIG9yZGVySWQsXG4gICAgICBwYXltZW50SWQ6IHBheW1lbnRJZCB8fCB1bmRlZmluZWQsXG4gICAgICBnYXRld2F5U3RhdHVzOiBwYXltZW50U3RhdHVzLFxuICAgICAgZXZlbnRUeXBlLFxuICAgICAgcGF5bWVudE1ldGhvZCxcbiAgICB9KTtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCA0LiBBd2FpdCByZWNlaXB0IGVtYWlsIGRpc3BhdGNoIGJlZm9yZSBzZXJ2ZXJsZXNzIGV4aXQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5zdGF0dXMgPT09ICdwYWlkJyAmJiByZXN1bHQuc2hvdWxkU2VuZFJlY2VpcHQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHNlbmRQYXltZW50UmVjZWlwdCh7XG4gICAgICAgICAgdHlwZTogcmVzdWx0LnR5cGUhLFxuICAgICAgICAgIHJlY29yZDogcmVzdWx0LnJlY29yZCEsXG4gICAgICAgICAgbGlua2VkUmVjb3JkSWRzOiByZXN1bHQubGlua2VkUmVjb3JkSWRzLFxuICAgICAgICAgIHBheW1lbnRNZXRob2Q6IHJlc3VsdC5wYXltZW50TWV0aG9kIHx8ICdDYXNoZnJlZSBQYXltZW50cycsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAocmVjZWlwdEVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbQ2FzaGZyZWUgV2ViaG9va10gUmVjZWlwdCBlbWFpbCBlcnJvcjonLCByZWNlaXB0RXJyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCAyMDAsIHtcbiAgICAgIHJlY2VpdmVkOiB0cnVlLFxuICAgICAgb3JkZXJfaWQ6IG9yZGVySWQsXG4gICAgICBzdGF0dXM6IHJlc3VsdC5zdGF0dXMgfHwgJ3Vua25vd24nLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnI6IHVua25vd24pIHtcbiAgICBjb25zb2xlLmVycm9yKCdbQ2FzaGZyZWUgV2ViaG9vayBFcnJvcl06JywgZXJyKTtcbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA1MDAsIHtcbiAgICAgIHJlY2VpdmVkOiBmYWxzZSxcbiAgICAgIGVycm9yOiAnV2ViaG9vayBwcm9jZXNzaW5nIGVycm9yJyxcbiAgICB9KTtcbiAgfVxufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxCQVNJQ1xcXFxQZXJzb25hbFxcXFxNeSBTdHVkeVxcXFxTa2lsbCBUQVNLIDIwMjVcXFxcMDAyLiBXZWIgRGV2ZWxvcG1lbnRcXFxcMDQuIE90aGVyc1xcXFxOYXJham9sZSBDaGF0cm9kb2xcXFxcbmFyYWpvbGVfY2hhdHJvZG9sXFxcXGFwaVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcQkFTSUNcXFxcUGVyc29uYWxcXFxcTXkgU3R1ZHlcXFxcU2tpbGwgVEFTSyAyMDI1XFxcXDAwMi4gV2ViIERldmVsb3BtZW50XFxcXDA0LiBPdGhlcnNcXFxcTmFyYWpvbGUgQ2hhdHJvZG9sXFxcXG5hcmFqb2xlX2NoYXRyb2RvbFxcXFxhcGlcXFxcc2VuZC1yZWNlaXB0LWVtYWlsLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9CQVNJQy9QZXJzb25hbC9NeSUyMFN0dWR5L1NraWxsJTIwVEFTSyUyMDIwMjUvMDAyLiUyMFdlYiUyMERldmVsb3BtZW50LzA0LiUyME90aGVycy9OYXJham9sZSUyMENoYXRyb2RvbC9uYXJham9sZV9jaGF0cm9kb2wvYXBpL3NlbmQtcmVjZWlwdC1lbWFpbC50c1wiOy8qKlxyXG4gKiBhcGkvc2VuZC1yZWNlaXB0LWVtYWlsLnRzXHJcbiAqXHJcbiAqIFNlbmRzIG9mZmljaWFsIHBheW1lbnQgcmVjZWlwdCBlbWFpbHMgdmlhIFJlc2VuZCBBUEkuXHJcbiAqIENhbGxlZCBhZnRlciBldmVyeSBzdWNjZXNzZnVsIGRvbmF0aW9uIG9yIG1vbnRobHkgY29udHJpYnV0aW9uIHBheW1lbnQuXHJcbiAqXHJcbiAqIEZ1bGx5IG9wdGltaXplZCBmb3IgYWxsIGVtYWlsIGNsaWVudHMgKEdtYWlsLCBBcHBsZSBNYWlsLCBPdXRsb29rKSBpbiBib3RoIExpZ2h0ICYgRGFyayBNb2RlLlxyXG4gKi9cclxuXHJcbmltcG9ydCB0eXBlIHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xyXG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xyXG5pbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgT3B0aW9uYWwgU3VwYWJhc2UgY2xpZW50IChmb3IgaW4tYXBwIG5vdGlmaWNhdGlvbiBsb2dnaW5nKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuZnVuY3Rpb24gZ2V0U3VwYWJhc2VDbGllbnQoKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN1cGFiYXNlVXJsID0gcHJvY2Vzcy5lbnYuU1VQQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMIHx8ICdodHRwczovL3d6cXVzemJtYnBrYmh5eXRoZHJqLnN1cGFiYXNlLmNvJztcclxuICAgIGNvbnN0IHN1cGFiYXNlS2V5ID0gcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSB8fCBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZIHx8IHByb2Nlc3MuZW52LlNVUEFCQVNFX0FOT05fS0VZO1xyXG4gICAgaWYgKCFzdXBhYmFzZVVybCB8fCAhc3VwYWJhc2VLZXkpIHJldHVybiBudWxsO1xyXG4gICAgcmV0dXJuIGNyZWF0ZUNsaWVudChzdXBhYmFzZVVybCwgc3VwYWJhc2VLZXkpO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgSGVscGVycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIHNlbmRKc29uKHJlczogU2VydmVyUmVzcG9uc2UsIHN0YXR1czogbnVtYmVyLCBkYXRhOiB1bmtub3duKSB7XHJcbiAgcmVzLnN0YXR1c0NvZGUgPSBzdGF0dXM7XHJcbiAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCB4LWludGVybmFsLXNlY3JldCcpO1xyXG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnUE9TVCwgT1BUSU9OUycpO1xyXG4gIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZUJvZHkocmVxOiBJbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PiB7XHJcbiAgaWYgKChyZXEgYXMgdW5rbm93biBhcyB7IGJvZHk/OiB1bmtub3duIH0pLmJvZHkpIHtcclxuICAgIGNvbnN0IGIgPSAocmVxIGFzIHVua25vd24gYXMgeyBib2R5OiB1bmtub3duIH0pLmJvZHk7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHR5cGVvZiBiID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UoYikgOiAoYiBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikpO1xyXG4gIH1cclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgbGV0IGJvZHkgPSAnJztcclxuICAgIHJlcS5vbignZGF0YScsIChjaHVuaykgPT4geyBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7IH0pO1xyXG4gICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICAgIHRyeSB7IHJlc29sdmUoYm9keSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fSk7IH1cclxuICAgICAgY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9XHJcbiAgICB9KTtcclxuICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKiogUmVhZCBSRVNFTkRfQVBJX0tFWSBmcm9tIHByb2Nlc3MuZW52IG9yIC5lbnYgZmlsZSAqL1xyXG5mdW5jdGlvbiBnZXRSZXNlbmRBcGlLZXkoKTogc3RyaW5nIHtcclxuICBsZXQga2V5ID0gcHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVkgfHwgJyc7XHJcbiAgaWYgKGtleSkgcmV0dXJuIGtleTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGVudlBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy5lbnYnKTtcclxuICAgIGlmIChmcy5leGlzdHNTeW5jKGVudlBhdGgpKSB7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZW52UGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiBjb250ZW50LnNwbGl0KCdcXG4nKSkge1xyXG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcclxuICAgICAgICBpZiAoIXRyaW1tZWQgfHwgdHJpbW1lZC5zdGFydHNXaXRoKCcjJykpIGNvbnRpbnVlO1xyXG4gICAgICAgIGNvbnN0IFtrLCAuLi52XSA9IHRyaW1tZWQuc3BsaXQoJz0nKTtcclxuICAgICAgICBpZiAoaz8udHJpbSgpID09PSAnUkVTRU5EX0FQSV9LRVknKSB7XHJcbiAgICAgICAgICBrZXkgPSB2LmpvaW4oJz0nKS50cmltKCkucmVwbGFjZSgvXltcIiddfFtcIiddJC9nLCAnJyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9IGNhdGNoIHsgLyogZmFsbGJhY2sgKi8gfVxyXG5cclxuICByZXR1cm4ga2V5O1xyXG59XHJcblxyXG4vKipcclxuICogUmVhZCBSRVNFTkRfRlJPTV9FTUFJTCBmcm9tIGVudiBvciAuZW52IGZpbGUuXHJcbiAqIERlZmF1bHQ6IFwiQ2hoYXRyYWRvbCBTb2NpYWwgV2VsZmFyZSBPcmdhbml6YXRpb24gPGRvbmF0aW9uc0BjaGhhdHJhZG9sLm9yZz5cIlxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0UmVzZW5kRnJvbUVtYWlsKCk6IHN0cmluZyB7XHJcbiAgbGV0IGZyb20gPSBwcm9jZXNzLmVudi5SRVNFTkRfRlJPTV9FTUFJTCB8fCAnJztcclxuICBpZiAoZnJvbSkgcmV0dXJuIGZyb207XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBlbnZQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52Jyk7XHJcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhlbnZQYXRoKSkge1xyXG4gICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGVudlBhdGgsICd1dGYtOCcpO1xyXG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgnXFxuJykpIHtcclxuICAgICAgICBjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XHJcbiAgICAgICAgaWYgKCF0cmltbWVkIHx8IHRyaW1tZWQuc3RhcnRzV2l0aCgnIycpKSBjb250aW51ZTtcclxuICAgICAgICBjb25zdCBbaywgLi4udl0gPSB0cmltbWVkLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgaWYgKGs/LnRyaW0oKSA9PT0gJ1JFU0VORF9GUk9NX0VNQUlMJykge1xyXG4gICAgICAgICAgZnJvbSA9IHYuam9pbignPScpLnRyaW0oKS5yZXBsYWNlKC9eW1wiJ118W1wiJ10kL2csICcnKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggeyAvKiBmYWxsYmFjayAqLyB9XHJcblxyXG4gIHJldHVybiBmcm9tIHx8ICdDaGhhdHJhZG9sIFNvY2lhbCBXZWxmYXJlIE9yZ2FuaXphdGlvbiA8ZG9uYXRpb25zQGNoaGF0cmFkb2wub3JnPic7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZWFkIFJFU0VORF9SRVBMWV9UTyBmcm9tIGVudiBvciAuZW52IGZpbGUuXHJcbiAqIERlZmF1bHQ6IFwiaW5mb0BjaGhhdHJhZG9sLm9yZ1wiXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRSZXNlbmRSZXBseVRvKCk6IHN0cmluZyB7XHJcbiAgbGV0IHJlcGx5VG8gPSBwcm9jZXNzLmVudi5SRVNFTkRfUkVQTFlfVE8gfHwgJyc7XHJcbiAgaWYgKHJlcGx5VG8pIHJldHVybiByZXBseVRvO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgZW52UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLmVudicpO1xyXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZW52UGF0aCkpIHtcclxuICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhlbnZQYXRoLCAndXRmLTgnKTtcclxuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoJ1xcbicpKSB7XHJcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xyXG4gICAgICAgIGlmICghdHJpbW1lZCB8fCB0cmltbWVkLnN0YXJ0c1dpdGgoJyMnKSkgY29udGludWU7XHJcbiAgICAgICAgY29uc3QgW2ssIC4uLnZdID0gdHJpbW1lZC5zcGxpdCgnPScpO1xyXG4gICAgICAgIGlmIChrPy50cmltKCkgPT09ICdSRVNFTkRfUkVQTFlfVE8nKSB7XHJcbiAgICAgICAgICByZXBseVRvID0gdi5qb2luKCc9JykudHJpbSgpLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgJycpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBjYXRjaCB7IC8qIGZhbGxiYWNrICovIH1cclxuXHJcbiAgcmV0dXJuIHJlcGx5VG8gfHwgJ2luZm9AY2hoYXRyYWRvbC5vcmcnO1xyXG59XHJcblxyXG4vKipcclxuICogUmVhZCBJTlRFUk5BTF9BUElfU0VDUkVUIGZyb20gZW52IG9yIC5lbnYgZmlsZS5cclxuICovXHJcbmZ1bmN0aW9uIGdldEludGVybmFsQXBpU2VjcmV0KCk6IHN0cmluZyB7XHJcbiAgbGV0IHNlY3JldCA9IHByb2Nlc3MuZW52LklOVEVSTkFMX0FQSV9TRUNSRVQgfHwgJyc7XHJcbiAgaWYgKHNlY3JldCkgcmV0dXJuIHNlY3JldDtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGVudlBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy5lbnYnKTtcclxuICAgIGlmIChmcy5leGlzdHNTeW5jKGVudlBhdGgpKSB7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZW52UGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiBjb250ZW50LnNwbGl0KCdcXG4nKSkge1xyXG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcclxuICAgICAgICBpZiAoIXRyaW1tZWQgfHwgdHJpbW1lZC5zdGFydHNXaXRoKCcjJykpIGNvbnRpbnVlO1xyXG4gICAgICAgIGNvbnN0IFtrLCAuLi52XSA9IHRyaW1tZWQuc3BsaXQoJz0nKTtcclxuICAgICAgICBpZiAoaz8udHJpbSgpID09PSAnSU5URVJOQUxfQVBJX1NFQ1JFVCcpIHtcclxuICAgICAgICAgIHNlY3JldCA9IHYuam9pbignPScpLnRyaW0oKS5yZXBsYWNlKC9eW1wiJ118W1wiJ10kL2csICcnKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggeyAvKiBmYWxsYmFjayAqLyB9XHJcblxyXG4gIHJldHVybiBzZWNyZXQ7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBQYXlsb2FkIHR5cGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNlbmRSZWNlaXB0RW1haWxQYXlsb2FkIHtcclxuICByZWNpcGllbnRFbWFpbDogc3RyaW5nO1xyXG4gIHJlY2lwaWVudE5hbWU6IHN0cmluZztcclxuICB0eXBlOiAnZG9uYXRpb24nIHwgJ2NvbnRyaWJ1dGlvbic7XHJcbiAgYW1vdW50OiBudW1iZXI7XHJcbiAgcmVjZWlwdE51bWJlcjogc3RyaW5nO1xyXG4gIGRhdGU6IHN0cmluZztcclxuICBwdXJwb3NlPzogc3RyaW5nO1xyXG4gIG1vbnRoPzogc3RyaW5nO1xyXG4gIHllYXI/OiBudW1iZXI7XHJcbiAgcGF5bWVudE1ldGhvZD86IHN0cmluZztcclxuICBwYXltZW50SWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBIVE1MIFJlY2VpcHQgQnVpbGRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBidWlsZFJlY2VpcHRIdG1sKGRhdGE6IFNlbmRSZWNlaXB0RW1haWxQYXlsb2FkKTogc3RyaW5nIHtcclxuICBjb25zdCB0eXBlVGl0bGUgPSBkYXRhLnR5cGUgPT09ICdjb250cmlidXRpb24nXHJcbiAgICA/ICdDaGhhdHJhZG9sIFNvY2lhbCBXZWxmYXJlIE9yZ2FuaXphdGlvbiAtIE1vbnRobHkgRG9uYXRpb24gU3VjY2Vzc2Z1bCdcclxuICAgIDogJ0NoaGF0cmFkb2wgU29jaWFsIFdlbGZhcmUgT3JnYW5pemF0aW9uIC0gRG9uYXRpb24gU3VjY2Vzc2Z1bCc7XHJcblxyXG4gIGNvbnN0IGFtb3VudEZvcm1hdHRlZCA9IGBcdTIwQjkke051bWJlcihkYXRhLmFtb3VudCkudG9Mb2NhbGVTdHJpbmcoJ2VuLUlOJyl9YDtcclxuICBjb25zdCBkaXNwbGF5RGF0ZSA9IGRhdGEuZGF0ZSB8fCBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCdlbi1JTicsIHsgZGF0ZVN0eWxlOiAnbWVkaXVtJywgdGltZVN0eWxlOiAnc2hvcnQnIH0pO1xyXG5cclxuICByZXR1cm4gYDwhRE9DVFlQRSBodG1sPlxyXG48aHRtbD5cclxuPGhlYWQ+XHJcbiAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCI+XHJcbiAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cclxuXHJcbiAgPHRpdGxlPiR7dHlwZVRpdGxlfTwvdGl0bGU+XHJcblxyXG4gIDxzdHlsZT5cclxuICAgIGJvZHkge1xyXG4gICAgICBtYXJnaW46IDA7XHJcbiAgICAgIHBhZGRpbmc6IDA7XHJcbiAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmM2Y0ZjY7XHJcbiAgICAgIGZvbnQtZmFtaWx5OiBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmO1xyXG4gICAgICBjb2xvcjogIzFmMjkzNztcclxuICAgIH1cclxuXHJcbiAgICAud3JhcHBlciB7XHJcbiAgICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgICBwYWRkaW5nOiAyNHB4IDEwcHg7XHJcbiAgICB9XHJcblxyXG4gICAgLmNhcmQge1xyXG4gICAgICBtYXgtd2lkdGg6IDYwMHB4O1xyXG4gICAgICBtYXJnaW46IDAgYXV0bztcclxuICAgICAgYmFja2dyb3VuZDogI2ZmZmZmZjtcclxuICAgICAgYm9yZGVyLXJhZGl1czogMTBweDtcclxuICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcclxuICAgICAgYm9yZGVyOiAxcHggc29saWQgI2Q5ZGRlMztcclxuICAgICAgYm94LXNoYWRvdzogMCA0cHggMThweCByZ2JhKDAsIDAsIDAsIDAuMDgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qID09PT09PT09PT09PT09PT09IEhFQURFUiA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIC5oZWFkZXIge1xyXG4gICAgICBiYWNrZ3JvdW5kOiAjMkY2OUY4O1xyXG4gICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgICAgIHBhZGRpbmc6IDI0cHggMjBweCA0MnB4O1xyXG4gICAgfVxyXG5cclxuICAgIC5sb2dvIHtcclxuICAgICAgd2lkdGg6IDcycHg7XHJcbiAgICAgIGhlaWdodDogNzJweDtcclxuICAgICAgb2JqZWN0LWZpdDogY29udGFpbjtcclxuICAgICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICAgIG1hcmdpbjogMCBhdXRvIDEycHg7XHJcbiAgICB9XHJcblxyXG4gICAgLm9yZy1uYW1lIHtcclxuICAgICAgbWFyZ2luOiAwO1xyXG4gICAgICBjb2xvcjogI2ZmZmZmZjtcclxuICAgICAgZm9udC1zaXplOiAyMHB4O1xyXG4gICAgICBsaW5lLWhlaWdodDogMS4zO1xyXG4gICAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgICBsZXR0ZXItc3BhY2luZzogMC4zcHg7XHJcbiAgICB9XHJcblxyXG4gICAgLyogPT09PT09PT09PT09PT09PT0gUEFZTUVOVCBCQURHRSA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIC5zdWNjZXNzLWJhZGdlIHtcclxuICAgICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgICBtYXJnaW4tdG9wOiAxNHB4O1xyXG4gICAgICBiYWNrZ3JvdW5kOiAjZmZmZmZmO1xyXG4gICAgICBib3JkZXItcmFkaXVzOiA2cHg7XHJcbiAgICAgIHBhZGRpbmc6IDdweCAxNHB4O1xyXG4gICAgICBjb2xvcjogIzM3NDE1MTtcclxuICAgICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgICBsZXR0ZXItc3BhY2luZzogMC40cHg7XHJcbiAgICAgIGJveC1zaGFkb3c6IDAgMnB4IDVweCByZ2JhKDAsMCwwLDAuMTUpO1xyXG4gICAgfVxyXG5cclxuICAgIC5zdWNjZXNzLWljb24ge1xyXG4gICAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XHJcbiAgICAgIHdpZHRoOiAxNXB4O1xyXG4gICAgICBoZWlnaHQ6IDE1cHg7XHJcbiAgICAgIGxpbmUtaGVpZ2h0OiAxNXB4O1xyXG4gICAgICBtYXJnaW4tbGVmdDogNXB4O1xyXG4gICAgICBiYWNrZ3JvdW5kOiAjMTZhMzRhO1xyXG4gICAgICBjb2xvcjogI2ZmZmZmZjtcclxuICAgICAgYm9yZGVyLXJhZGl1czogNTAlO1xyXG4gICAgICBmb250LXNpemU6IDEwcHg7XHJcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICAgICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcclxuICAgIH1cclxuXHJcbiAgICAvKiA9PT09PT09PT09PT09PT09PSBDT05URU5UID09PT09PT09PT09PT09PT09ICovXHJcblxyXG4gICAgLmNvbnRlbnQge1xyXG4gICAgICBwYWRkaW5nOiAwIDI2cHggMjZweDtcclxuICAgIH1cclxuXHJcbiAgICAvKiA9PT09PT09PT09PT09PT09PSBBTU9VTlQgQ0FSRCA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIC5yZWNlaXB0LWJveCB7XHJcbiAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgICAgbWFyZ2luLXRvcDogLTI0cHg7XHJcbiAgICAgIGJhY2tncm91bmQ6ICNmZmZmZmY7XHJcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNkN2RjZTM7XHJcbiAgICAgIGJvcmRlci1yYWRpdXM6IDhweDtcclxuICAgICAgcGFkZGluZzogMThweCAxNHB4IDE0cHg7XHJcbiAgICAgIGJveC1zaGFkb3c6IDAgM3B4IDEwcHggcmdiYSgwLDAsMCwwLjEwKTtcclxuICAgIH1cclxuXHJcbiAgICAuYW1vdW50LXRpdGxlIHtcclxuICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gICAgICBmb250LXNpemU6IDE4cHg7XHJcbiAgICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgICAgIGNvbG9yOiAjMWYyOTM3O1xyXG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgICBtYXJnaW4tYm90dG9tOiAxNnB4O1xyXG4gICAgICBsZXR0ZXItc3BhY2luZzogMC4zcHg7XHJcbiAgICB9XHJcblxyXG4gICAgLyogPT09PT09PT09PT09PT09PT0gREVUQUlMUyBUQUJMRSA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIC5kZXRhaWxzLXRhYmxlIHtcclxuICAgICAgd2lkdGg6IDEwMCU7XHJcbiAgICAgIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XHJcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcclxuICAgIH1cclxuXHJcbiAgICAuZGV0YWlscy10YWJsZSB0ZCB7XHJcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNkNmRiZTI7XHJcbiAgICAgIHBhZGRpbmc6IDlweCAxMHB4O1xyXG4gICAgfVxyXG5cclxuICAgIC5sYWJlbCB7XHJcbiAgICAgIHdpZHRoOiAzOCU7XHJcbiAgICAgIGJhY2tncm91bmQ6ICNmM2Y0ZjY7XHJcbiAgICAgIGNvbG9yOiAjMzc0MTUxO1xyXG4gICAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgICBmb250LXNpemU6IDExcHg7XHJcbiAgICB9XHJcblxyXG4gICAgLnZhbHVlIHtcclxuICAgICAgY29sb3I6ICMzNzQxNTE7XHJcbiAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XHJcbiAgICAgIHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyogPT09PT09PT09PT09PT09PT0gVEhBTksgWU9VID09PT09PT09PT09PT09PT09ICovXHJcblxyXG4gICAgLnRoYW5rLXlvdSB7XHJcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICAgICAgcGFkZGluZzogMThweCAxMnB4IDRweDtcclxuICAgICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgICBjb2xvcjogIzM3NDE1MTtcclxuICAgICAgbGluZS1oZWlnaHQ6IDEuNTU7XHJcbiAgICB9XHJcblxyXG4gICAgLyogPT09PT09PT09PT09PT09PT0gTEFSR0UgVkVSSUZJRUQgSUNPTiA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIC52ZXJpZmllZC1zZWN0aW9uIHtcclxuICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gICAgICBwYWRkaW5nOiAxOHB4IDAgNHB4O1xyXG4gICAgfVxyXG5cclxuICAgIC52ZXJpZmllZC1pY29uIHtcclxuICAgICAgd2lkdGg6IDcwcHg7XHJcbiAgICAgIGhlaWdodDogNzBweDtcclxuICAgICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgfVxyXG5cclxuICAgIC8qID09PT09PT09PT09PT09PT09IEZPT1RFUiA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIC5mb290ZXIge1xyXG4gICAgICBiYWNrZ3JvdW5kOiAjZWVmMGYzO1xyXG4gICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgICAgIHBhZGRpbmc6IDE2cHggMjBweCAxOHB4O1xyXG4gICAgICBib3JkZXItdG9wOiAxcHggc29saWQgI2Q5ZGRlMztcclxuICAgIH1cclxuXHJcbiAgICAuZm9vdGVyLW9yZyB7XHJcbiAgICAgIG1hcmdpbjogMDtcclxuICAgICAgY29sb3I6ICMzNzQxNTE7XHJcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcclxuICAgICAgZm9udC13ZWlnaHQ6IDcwMDtcclxuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcclxuICAgIH1cclxuXHJcbiAgICAucmVnaXN0cmF0aW9uIHtcclxuICAgICAgbWFyZ2luLXRvcDogNnB4O1xyXG4gICAgICBjb2xvcjogIzZiNzI4MDtcclxuICAgICAgZm9udC1zaXplOiAxMXB4O1xyXG4gICAgfVxyXG5cclxuICAgIC8qID09PT09PT09PT09PT09PT09IFNPQ0lBTCBJQ09OUyA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIC5zb2NpYWwtbGlua3Mge1xyXG4gICAgICBtYXJnaW4tdG9wOiAxNHB4O1xyXG4gICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgICB9XHJcblxyXG4gICAgLnNvY2lhbC1saW5rIHtcclxuICAgICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgICB3aWR0aDogMzJweDtcclxuICAgICAgaGVpZ2h0OiAzMnB4O1xyXG4gICAgICBsaW5lLWhlaWdodDogMzJweDtcclxuICAgICAgbWFyZ2luOiAwIDRweDtcclxuICAgICAgYm9yZGVyLXJhZGl1czogNTAlO1xyXG4gICAgICBiYWNrZ3JvdW5kOiAjZmZmZmZmO1xyXG4gICAgICBib3JkZXI6IDFweCBzb2xpZCAjZDVkOWRmO1xyXG4gICAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XHJcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICAgICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcclxuICAgIH1cclxuXHJcbiAgICAuc29jaWFsLWxpbmsgaW1nIHtcclxuICAgICAgd2lkdGg6IDE3cHg7XHJcbiAgICAgIGhlaWdodDogMTdweDtcclxuICAgICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcclxuICAgICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgfVxyXG5cclxuICAgIC8qID09PT09PT09PT09PT09PT09IE1PQklMRSA9PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuICAgIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogNjAwcHgpIHtcclxuXHJcbiAgICAgIC53cmFwcGVyIHtcclxuICAgICAgICBwYWRkaW5nOiAwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAuY2FyZCB7XHJcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMDtcclxuICAgICAgICBib3JkZXItbGVmdDogbm9uZTtcclxuICAgICAgICBib3JkZXItcmlnaHQ6IG5vbmU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC5oZWFkZXIge1xyXG4gICAgICAgIHBhZGRpbmc6IDIycHggMTVweCA0MHB4O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAuY29udGVudCB7XHJcbiAgICAgICAgcGFkZGluZy1sZWZ0OiAxNHB4O1xyXG4gICAgICAgIHBhZGRpbmctcmlnaHQ6IDE0cHg7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC5vcmctbmFtZSB7XHJcbiAgICAgICAgZm9udC1zaXplOiAxN3B4O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAuYW1vdW50LXRpdGxlIHtcclxuICAgICAgICBmb250LXNpemU6IDE2cHg7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC5kZXRhaWxzLXRhYmxlIHRkIHtcclxuICAgICAgICBwYWRkaW5nOiA4cHggN3B4O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAubGFiZWwge1xyXG4gICAgICAgIHdpZHRoOiA0MiU7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMHB4O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIDwvc3R5bGU+XHJcbjwvaGVhZD5cclxuXHJcbjxib2R5PlxyXG5cclxuICA8ZGl2IGNsYXNzPVwid3JhcHBlclwiPlxyXG5cclxuICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XHJcblxyXG4gICAgICA8IS0tID09PT09PT09PT09PT09PT09IEhFQURFUiA9PT09PT09PT09PT09PT09PSAtLT5cclxuXHJcbiAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cclxuXHJcbiAgICAgICAgPGltZ1xyXG4gICAgICAgICAgc3JjPVwiaHR0cHM6Ly93d3cuY2hoYXRyYWRvbC5vcmcvbG9nby5wbmdcIlxyXG4gICAgICAgICAgYWx0PVwiQ2hoYXRyYWRvbCBTb2NpYWwgV2VsZmFyZSBPcmdhbml6YXRpb25cIlxyXG4gICAgICAgICAgY2xhc3M9XCJsb2dvXCJcclxuICAgICAgICA+XHJcblxyXG4gICAgICAgIDxoMSBjbGFzcz1cIm9yZy1uYW1lXCI+XHJcbiAgICAgICAgICBDaGhhdHJhZG9sIFNvY2lhbCBXZWxmYXJlIE9yZ2FuaXphdGlvblxyXG4gICAgICAgIDwvaDE+XHJcblxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJzdWNjZXNzLWJhZGdlXCI+XHJcbiAgICAgICAgICBQYXltZW50IFN1Y2Nlc3NmdWxcclxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwic3VjY2Vzcy1pY29uXCI+XHUyNzEzPC9zcGFuPlxyXG4gICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgPC9kaXY+XHJcblxyXG5cclxuICAgICAgPCEtLSA9PT09PT09PT09PT09PT09PSBDT05URU5UID09PT09PT09PT09PT09PT09IC0tPlxyXG5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cclxuXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cInJlY2VpcHQtYm94XCI+XHJcblxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImFtb3VudC10aXRsZVwiPlxyXG4gICAgICAgICAgICBBbW91bnQgUmVjZWl2ZWQgJHthbW91bnRGb3JtYXR0ZWR9XHJcbiAgICAgICAgICA8L2Rpdj5cclxuXHJcblxyXG4gICAgICAgICAgPCEtLSBQQVlNRU5UIERFVEFJTFMgLS0+XHJcblxyXG4gICAgICAgICAgPHRhYmxlIGNsYXNzPVwiZGV0YWlscy10YWJsZVwiPlxyXG5cclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImxhYmVsXCI+XHJcbiAgICAgICAgICAgICAgICBSZWNlaXB0IE51bWJlclxyXG4gICAgICAgICAgICAgIDwvdGQ+XHJcblxyXG4gICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInZhbHVlXCI+XHJcbiAgICAgICAgICAgICAgICAke2RhdGEucmVjZWlwdE51bWJlciB8fCAnXHUyMDE0J31cclxuICAgICAgICAgICAgICA8L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG5cclxuXHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJsYWJlbFwiPlxyXG4gICAgICAgICAgICAgICAgRGF0ZSAmIFRpbWVcclxuICAgICAgICAgICAgICA8L3RkPlxyXG5cclxuICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJ2YWx1ZVwiPlxyXG4gICAgICAgICAgICAgICAgJHtkaXNwbGF5RGF0ZX1cclxuICAgICAgICAgICAgICA8L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG5cclxuXHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJsYWJlbFwiPlxyXG4gICAgICAgICAgICAgICAgJHtkYXRhLnR5cGUgPT09ICdjb250cmlidXRpb24nID8gJ01lbWJlcicgOiAnRG9ub3InfVxyXG4gICAgICAgICAgICAgIDwvdGQ+XHJcblxyXG4gICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInZhbHVlXCI+XHJcbiAgICAgICAgICAgICAgICAke2RhdGEucmVjaXBpZW50TmFtZSB8fCAnXHUyMDE0J31cclxuICAgICAgICAgICAgICA8L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG5cclxuXHJcbiAgICAgICAgICAgICR7ZGF0YS5wdXJwb3NlID8gYFxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIGNsYXNzPVwibGFiZWxcIj5cclxuICAgICAgICAgICAgICAgIFB1cnBvc2VcclxuICAgICAgICAgICAgICA8L3RkPlxyXG5cclxuICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJ2YWx1ZVwiPlxyXG4gICAgICAgICAgICAgICAgJHtkYXRhLnB1cnBvc2V9XHJcbiAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgYCA6ICcnfVxyXG5cclxuXHJcbiAgICAgICAgICAgICR7ZGF0YS5tb250aCA/IGBcclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImxhYmVsXCI+XHJcbiAgICAgICAgICAgICAgICBQZXJpb2RcclxuICAgICAgICAgICAgICA8L3RkPlxyXG5cclxuICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJ2YWx1ZVwiPlxyXG4gICAgICAgICAgICAgICAgJHtkYXRhLm1vbnRofSR7ZGF0YS55ZWFyID8gJyAnICsgZGF0YS55ZWFyIDogJyd9XHJcbiAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgYCA6ICcnfVxyXG5cclxuXHJcbiAgICAgICAgICAgICR7ZGF0YS5wYXltZW50TWV0aG9kID8gYFxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIGNsYXNzPVwibGFiZWxcIj5cclxuICAgICAgICAgICAgICAgIFBheW1lbnQgTWV0aG9kXHJcbiAgICAgICAgICAgICAgPC90ZD5cclxuXHJcbiAgICAgICAgICAgICAgPHRkIGNsYXNzPVwidmFsdWVcIj5cclxuICAgICAgICAgICAgICAgICR7ZGF0YS5wYXltZW50TWV0aG9kfVxyXG4gICAgICAgICAgICAgIDwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgIGAgOiAnJ31cclxuXHJcblxyXG4gICAgICAgICAgICAke2RhdGEucGF5bWVudElkID8gYFxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIGNsYXNzPVwibGFiZWxcIj5cclxuICAgICAgICAgICAgICAgIFRyYW5zYWN0aW9uIElEXHJcbiAgICAgICAgICAgICAgPC90ZD5cclxuXHJcbiAgICAgICAgICAgICAgPHRkIGNsYXNzPVwidmFsdWVcIj5cclxuICAgICAgICAgICAgICAgICR7ZGF0YS5wYXltZW50SWR9XHJcbiAgICAgICAgICAgICAgPC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgYCA6ICcnfVxyXG5cclxuICAgICAgICAgIDwvdGFibGU+XHJcblxyXG5cclxuICAgICAgICAgIDwhLS0gVEhBTksgWU9VIE1FU1NBR0UgLS0+XHJcblxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInRoYW5rLXlvdVwiPlxyXG5cclxuICAgICAgICAgICAgVGhhbmsgeW91IGZvciB5b3VyIHN1cHBvcnQuIFlvdXIgY29udHJpYnV0aW9uIGVuYWJsZXMgdXNcclxuICAgICAgICAgICAgdG8gY29udGludWUgb3VyIHNvY2lhbCB3ZWxmYXJlIGFuZCBjb21tdW5pdHkgZGV2ZWxvcG1lbnRcclxuICAgICAgICAgICAgaW5pdGlhdGl2ZXMuXHJcblxyXG4gICAgICAgICAgPC9kaXY+XHJcblxyXG5cclxuICAgICAgICAgIDwhLS0gTEFSR0UgVkVSSUZJRUQgU1ZHIC0tPlxyXG5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2ZXJpZmllZC1zZWN0aW9uXCI+XHJcblxyXG4gICAgICAgICAgICA8c3ZnXHJcbiAgICAgICAgICAgICAgY2xhc3M9XCJ2ZXJpZmllZC1pY29uXCJcclxuICAgICAgICAgICAgICB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIlxyXG4gICAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIlxyXG4gICAgICAgICAgICA+XHJcblxyXG4gICAgICAgICAgICAgIDxwYXRoXHJcbiAgICAgICAgICAgICAgICBkPVwiTTUwIDVcclxuICAgICAgICAgICAgICAgIEM1NyA1IDYxIDEwIDY4IDEwXHJcbiAgICAgICAgICAgICAgICBDNzUgMTAgNzkgNyA4NSAxM1xyXG4gICAgICAgICAgICAgICAgQzkxIDE5IDg4IDI0IDkxIDMxXHJcbiAgICAgICAgICAgICAgICBDOTQgMzggMTAwIDQxIDEwMCA1MFxyXG4gICAgICAgICAgICAgICAgQzEwMCA1OSA5NCA2MiA5MSA2OVxyXG4gICAgICAgICAgICAgICAgQzg4IDc2IDkxIDgxIDg1IDg3XHJcbiAgICAgICAgICAgICAgICBDNzkgOTMgNzUgOTAgNjggOTBcclxuICAgICAgICAgICAgICAgIEM2MSA5MCA1NyA5NSA1MCA5NVxyXG4gICAgICAgICAgICAgICAgQzQzIDk1IDM5IDkwIDMyIDkwXHJcbiAgICAgICAgICAgICAgICBDMjUgOTAgMjEgOTMgMTUgODdcclxuICAgICAgICAgICAgICAgIEM5IDgxIDEyIDc2IDkgNjlcclxuICAgICAgICAgICAgICAgIEM2IDYyIDAgNTkgMCA1MFxyXG4gICAgICAgICAgICAgICAgQzAgNDEgNiAzOCA5IDMxXHJcbiAgICAgICAgICAgICAgICBDMTIgMjQgOSAxOSAxNSAxM1xyXG4gICAgICAgICAgICAgICAgQzIxIDcgMjUgMTAgMzIgMTBcclxuICAgICAgICAgICAgICAgIEMzOSAxMCA0MyA1IDUwIDVaXCJcclxuICAgICAgICAgICAgICAgIGZpbGw9XCIjMTZhMzRhXCJcclxuICAgICAgICAgICAgICAvPlxyXG5cclxuICAgICAgICAgICAgICA8cGF0aFxyXG4gICAgICAgICAgICAgICAgZD1cIk0yOSA1MFxyXG4gICAgICAgICAgICAgICAgTDQzIDY0XHJcbiAgICAgICAgICAgICAgICBMNzIgMzRcIlxyXG4gICAgICAgICAgICAgICAgZmlsbD1cIm5vbmVcIlxyXG4gICAgICAgICAgICAgICAgc3Ryb2tlPVwiI2ZmZmZmZlwiXHJcbiAgICAgICAgICAgICAgICBzdHJva2Utd2lkdGg9XCIxMFwiXHJcbiAgICAgICAgICAgICAgICBzdHJva2UtbGluZWNhcD1cInJvdW5kXCJcclxuICAgICAgICAgICAgICAgIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCJcclxuICAgICAgICAgICAgICAvPlxyXG5cclxuICAgICAgICAgICAgPC9zdmc+XHJcblxyXG4gICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgPC9kaXY+XHJcblxyXG5cclxuICAgICAgPCEtLSA9PT09PT09PT09PT09PT09PSBGT09URVIgPT09PT09PT09PT09PT09PT0gLS0+XHJcblxyXG4gICAgICA8ZGl2IGNsYXNzPVwiZm9vdGVyXCI+XHJcblxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmb290ZXItb3JnXCI+XHJcbiAgICAgICAgICBDaGhhdHJhZG9sIFNvY2lhbCBXZWxmYXJlIE9yZ2FuaXphdGlvblxyXG4gICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwicmVnaXN0cmF0aW9uXCI+XHJcbiAgICAgICAgICBSZWdpc3RyYXRpb24gTm86IElWLTEwMDIwMDA0Ny8yMDI2XHJcbiAgICAgICAgPC9kaXY+XHJcblxyXG5cclxuICAgICAgICA8IS0tIFNPQ0lBTCBNRURJQSBJQ09OUyBPTkxZIC0tPlxyXG5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwic29jaWFsLWxpbmtzXCI+XHJcblxyXG4gICAgICAgICAgPCEtLSBGYWNlYm9vayAtLT5cclxuXHJcbiAgICAgICAgICA8YVxyXG4gICAgICAgICAgICBocmVmPVwiaHR0cHM6Ly9mYWNlYm9vay5jb20vY2hoYXRyYWRvbHN3b1wiXHJcbiAgICAgICAgICAgIGNsYXNzPVwic29jaWFsLWxpbmtcIlxyXG4gICAgICAgICAgICB0YXJnZXQ9XCJfYmxhbmtcIlxyXG4gICAgICAgICAgPlxyXG4gICAgICAgICAgICA8aW1nXHJcbiAgICAgICAgICAgICAgc3JjPVwiaHR0cHM6Ly9jZG4uc2ltcGxlaWNvbnMub3JnL2ZhY2Vib29rLzE4NzdGMlwiXHJcbiAgICAgICAgICAgICAgYWx0PVwiRmFjZWJvb2tcIlxyXG4gICAgICAgICAgICA+XHJcbiAgICAgICAgICA8L2E+XHJcblxyXG5cclxuICAgICAgICAgIDwhLS0gSW5zdGFncmFtIC0tPlxyXG5cclxuICAgICAgICAgIDxhXHJcbiAgICAgICAgICAgIGhyZWY9XCJodHRwczovL2luc3RhZ3JhbS5jb20vY2hoYXRyYWRvbHN3b1wiXHJcbiAgICAgICAgICAgIGNsYXNzPVwic29jaWFsLWxpbmtcIlxyXG4gICAgICAgICAgICB0YXJnZXQ9XCJfYmxhbmtcIlxyXG4gICAgICAgICAgPlxyXG4gICAgICAgICAgICA8aW1nXHJcbiAgICAgICAgICAgICAgc3JjPVwiaHR0cHM6Ly9jZG4uc2ltcGxlaWNvbnMub3JnL2luc3RhZ3JhbS9FNDQwNUZcIlxyXG4gICAgICAgICAgICAgIGFsdD1cIkluc3RhZ3JhbVwiXHJcbiAgICAgICAgICAgID5cclxuICAgICAgICAgIDwvYT5cclxuXHJcblxyXG4gICAgICAgICAgPCEtLSBYIC0tPlxyXG5cclxuICAgICAgICAgIDxhXHJcbiAgICAgICAgICAgIGhyZWY9XCJodHRwczovL3guY29tL0NoaGF0cmFkb2xzd29cIlxyXG4gICAgICAgICAgICBjbGFzcz1cInNvY2lhbC1saW5rXCJcclxuICAgICAgICAgICAgdGFyZ2V0PVwiX2JsYW5rXCJcclxuICAgICAgICAgID5cclxuICAgICAgICAgICAgPGltZ1xyXG4gICAgICAgICAgICAgIHNyYz1cImh0dHBzOi8vY2RuLnNpbXBsZWljb25zLm9yZy94LzAwMDAwMFwiXHJcbiAgICAgICAgICAgICAgYWx0PVwiWFwiXHJcbiAgICAgICAgICAgID5cclxuICAgICAgICAgIDwvYT5cclxuXHJcblxyXG4gICAgICAgICAgPCEtLSBZb3VUdWJlIC0tPlxyXG5cclxuICAgICAgICAgIDxhXHJcbiAgICAgICAgICAgIGhyZWY9XCJodHRwczovL3d3dy55b3V0dWJlLmNvbS9AQ2hoYXRyYWRvbHN3b1wiXHJcbiAgICAgICAgICAgIGNsYXNzPVwic29jaWFsLWxpbmtcIlxyXG4gICAgICAgICAgICB0YXJnZXQ9XCJfYmxhbmtcIlxyXG4gICAgICAgICAgPlxyXG4gICAgICAgICAgICA8aW1nXHJcbiAgICAgICAgICAgICAgc3JjPVwiaHR0cHM6Ly9jZG4uc2ltcGxlaWNvbnMub3JnL3lvdXR1YmUvRkYwMDAwXCJcclxuICAgICAgICAgICAgICBhbHQ9XCJZb3VUdWJlXCJcclxuICAgICAgICAgICAgPlxyXG4gICAgICAgICAgPC9hPlxyXG5cclxuICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgIDwvZGl2PlxyXG5cclxuICAgIDwvZGl2PlxyXG5cclxuICA8L2Rpdj5cclxuXHJcbjwvYm9keT5cclxuPC9odG1sPmA7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBSZXNlbmQgZW1haWwgZGlzcGF0Y2hlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHNlbmRWaWFSZXNlbmQoXHJcbiAgcmVzZW5kQXBpS2V5OiBzdHJpbmcsXHJcbiAgdG9FbWFpbDogc3RyaW5nLFxyXG4gIHRvTmFtZTogc3RyaW5nLFxyXG4gIHN1YmplY3Q6IHN0cmluZyxcclxuICBodG1sQ29udGVudDogc3RyaW5nLFxyXG4pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZUlkPzogc3RyaW5nOyBlcnJvcj86IHN0cmluZyB9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGZyb21BZGRyZXNzID0gZ2V0UmVzZW5kRnJvbUVtYWlsKCk7XHJcbiAgICBjb25zdCByZXBseVRvQWRkcmVzcyA9IGdldFJlc2VuZFJlcGx5VG8oKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5yZXNlbmQuY29tL2VtYWlscycsIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHtyZXNlbmRBcGlLZXl9YCxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZnJvbTogZnJvbUFkZHJlc3MsXHJcbiAgICAgICAgdG86IFtgJHt0b05hbWV9IDwke3RvRW1haWx9PmBdLFxyXG4gICAgICAgIHN1YmplY3QsXHJcbiAgICAgICAgaHRtbDogaHRtbENvbnRlbnQsXHJcbiAgICAgICAgcmVwbHlfdG86IHJlcGx5VG9BZGRyZXNzLFxyXG4gICAgICAgIHRhZ3M6IFtcclxuICAgICAgICAgIHsgbmFtZTogJ2NhdGVnb3J5JywgdmFsdWU6ICdwYXltZW50LXJlY2VpcHQnIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXNwb25zZS5qc29uKCkgYXMgeyBpZD86IHN0cmluZzsgbWVzc2FnZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9O1xyXG5cclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgY29uc3QgZXJyTXNnID0gcmVzdWx0Lm1lc3NhZ2UgfHwgcmVzdWx0Lm5hbWUgfHwgYFJlc2VuZCBBUEkgZXJyb3IgKCR7cmVzcG9uc2Uuc3RhdHVzfSlgO1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbUmVjZWlwdCBFbWFpbF0gUmVzZW5kIGRpc3BhdGNoIGZhaWxlZDonLCBlcnJNc2cpO1xyXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyck1zZyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2VJZDogcmVzdWx0LmlkIH07XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBjb25zdCBtc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ05ldHdvcmsgZXJyb3IgY2FsbGluZyBSZXNlbmQgQVBJJztcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tSZWNlaXB0IEVtYWlsXSBSZXNlbmQgZmV0Y2ggZXJyb3I6JywgbXNnKTtcclxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogbXNnIH07XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgTWFpbiBIYW5kbGVyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihyZXE6IEluY29taW5nTWVzc2FnZSwgcmVzOiBTZXJ2ZXJSZXNwb25zZSkge1xyXG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdQT1NULCBPUFRJT05TJyk7XHJcbiAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcclxuICAgIHJlcy5lbmQoKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcclxuICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDQwNSwgeyBlcnJvcjogJ01ldGhvZCBOb3QgQWxsb3dlZCcgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQXV0aG9yaXphdGlvbjogZW5zdXJlIG9ubHkgaW50ZXJuYWwgYmFja2VuZCBjYWxscyB0aGlzIGVuZHBvaW50IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGV4cGVjdGVkU2VjcmV0ID0gZ2V0SW50ZXJuYWxBcGlTZWNyZXQoKTtcclxuICBpZiAoZXhwZWN0ZWRTZWNyZXQpIHtcclxuICAgIGNvbnN0IGludGVybmFsU2VjcmV0ID1cclxuICAgICAgKHJlcS5oZWFkZXJzWyd4LWludGVybmFsLXNlY3JldCddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHxcclxuICAgICAgKChyZXEuaGVhZGVycyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ1gtSW50ZXJuYWwtU2VjcmV0J10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKTtcclxuXHJcbiAgICBpZiAoaW50ZXJuYWxTZWNyZXQgIT09IGV4cGVjdGVkU2VjcmV0KSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignW1JlY2VpcHQgRW1haWxdIFVuYXV0aG9yaXplZCBhdHRlbXB0IHRvIGludm9rZSAvYXBpL3NlbmQtcmVjZWlwdC1lbWFpbCBkaXJlY3RseScpO1xyXG4gICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA0MDEsIHsgZXJyb3I6ICdVbmF1dGhvcml6ZWQ6IGludGVybmFsIHNlY3JldCByZXF1aXJlZCcgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgYm9keSA9IChhd2FpdCBwYXJzZUJvZHkocmVxKSkgYXMgdW5rbm93biBhcyBTZW5kUmVjZWlwdEVtYWlsUGF5bG9hZDtcclxuXHJcbiAgICBpZiAoIWJvZHkucmVjaXBpZW50RW1haWwgfHwgIWJvZHkucmVjaXBpZW50RW1haWwuaW5jbHVkZXMoJ0AnKSkge1xyXG4gICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA0MDAsIHsgZXJyb3I6ICdyZWNpcGllbnRFbWFpbCBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSB2YWxpZCcgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAoIWJvZHkucmVjZWlwdE51bWJlciB8fCAhYm9keS5hbW91bnQpIHtcclxuICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgNDAwLCB7IGVycm9yOiAncmVjZWlwdE51bWJlciBhbmQgYW1vdW50IGFyZSByZXF1aXJlZCcgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgaHRtbENvbnRlbnQgPSBidWlsZFJlY2VpcHRIdG1sKGJvZHkpO1xyXG5cclxuICAgIGNvbnN0IHR5cGVMYWJlbCA9IGJvZHkudHlwZSA9PT0gJ2NvbnRyaWJ1dGlvbidcclxuICAgICAgPyAnQ2hoYXRyYWRvbCBTb2NpYWwgV2VsZmFyZSBPcmdhbml6YXRpb24gLSBNb250aGx5IERvbmF0aW9uIFN1Y2Nlc3NmdWwnXHJcbiAgICAgIDogJ0NoaGF0cmFkb2wgU29jaWFsIFdlbGZhcmUgT3JnYW5pemF0aW9uIC0gRG9uYXRpb24gU3VjY2Vzc2Z1bCc7XHJcbiAgICBjb25zdCBzdWJqZWN0ID0gYCR7dHlwZUxhYmVsfWA7XHJcblxyXG4gICAgLy8gXHUyNTAwXHUyNTAwIFNhdmUgaW4tYXBwIG5vdGlmaWNhdGlvbiB0byBTdXBhYmFzZSAobm9uLWJsb2NraW5nLCBkZWR1cGVkKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNsaWVudCA9IGdldFN1cGFiYXNlQ2xpZW50KCk7XHJcbiAgICAgIGlmIChjbGllbnQpIHtcclxuICAgICAgICBjb25zdCBub3RpZlRpdGxlID0gYFBheW1lbnQgUmVjZWlwdDogJHtib2R5LnJlY2VpcHROdW1iZXJ9YDtcclxuICAgICAgICBjb25zdCB7IGRhdGE6IGV4aXN0aW5nTm90aWYgfSA9IGF3YWl0IGNsaWVudFxyXG4gICAgICAgICAgLmZyb20oJ2Nzd29fbm90aWZpY2F0aW9ucycpXHJcbiAgICAgICAgICAuc2VsZWN0KCdpZCcpXHJcbiAgICAgICAgICAuZXEoJ3RpdGxlJywgbm90aWZUaXRsZSlcclxuICAgICAgICAgIC5tYXliZVNpbmdsZSgpO1xyXG5cclxuICAgICAgICBpZiAoIWV4aXN0aW5nTm90aWYpIHtcclxuICAgICAgICAgIGF3YWl0IGNsaWVudC5mcm9tKCdjc3dvX25vdGlmaWNhdGlvbnMnKS5pbnNlcnQoe1xyXG4gICAgICAgICAgICB0aXRsZTogbm90aWZUaXRsZSxcclxuICAgICAgICAgICAgYm9keTogYFlvdXIgcGF5bWVudCBvZiBcdTIwQjkke2JvZHkuYW1vdW50fSBmb3IgJHtib2R5LnB1cnBvc2UgfHwgYm9keS5tb250aCB8fCAnQ1NXTyd9IHdhcyBjb25maXJtZWQuIFJlY2VpcHQ6ICR7Ym9keS5yZWNlaXB0TnVtYmVyfWAsXHJcbiAgICAgICAgICAgIGtpbmQ6ICdwYXltZW50JyxcclxuICAgICAgICAgICAgbGluazogJy9tZW1iZXIvY29udHJpYnV0aW9ucycsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAvLyBOb24tY3JpdGljYWwgXHUyMDE0IGNvbnRpbnVlIGV2ZW4gaWYgbm90aWZpY2F0aW9uIHNhdmUgZmFpbHNcclxuICAgIH1cclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgRGlzcGF0Y2ggZW1haWwgdmlhIFJlc2VuZCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgIGNvbnN0IHJlc2VuZEFwaUtleSA9IGdldFJlc2VuZEFwaUtleSgpO1xyXG5cclxuICAgIGlmICghcmVzZW5kQXBpS2V5KSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignW1JlY2VpcHQgRW1haWxdIFJFU0VORF9BUElfS0VZIG5vdCBjb25maWd1cmVkIFx1MjAxNCBlbWFpbCBub3Qgc2VudCwgYnV0IHJlY2VpcHQgSFRNTCBnZW5lcmF0ZWQuJyk7XHJcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDIwMCwge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIHdhcm5pbmc6ICdSRVNFTkRfQVBJX0tFWSBub3QgY29uZmlndXJlZC4gRW1haWwgd2FzIG5vdCBzZW50LicsXHJcbiAgICAgICAgcmVjZWlwdE51bWJlcjogYm9keS5yZWNlaXB0TnVtYmVyLFxyXG4gICAgICAgIHByZXZpZXdIdG1sOiBodG1sQ29udGVudCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZW1haWxSZXN1bHQgPSBhd2FpdCBzZW5kVmlhUmVzZW5kKFxyXG4gICAgICByZXNlbmRBcGlLZXksXHJcbiAgICAgIGJvZHkucmVjaXBpZW50RW1haWwsXHJcbiAgICAgIGJvZHkucmVjaXBpZW50TmFtZSB8fCAnVmFsdWVkIFN1cHBvcnRlcicsXHJcbiAgICAgIHN1YmplY3QsXHJcbiAgICAgIGh0bWxDb250ZW50LFxyXG4gICAgKTtcclxuXHJcbiAgICBpZiAoIWVtYWlsUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgW1JlY2VpcHQgRW1haWxdIEZhaWxlZCB0byBzZW5kIHRvICR7Ym9keS5yZWNpcGllbnRFbWFpbH06ICR7ZW1haWxSZXN1bHQuZXJyb3J9YCk7XHJcbiAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIDIwMCwge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIHdhcm5pbmc6IGBFbWFpbCBkaXNwYXRjaCBmYWlsZWQ6ICR7ZW1haWxSZXN1bHQuZXJyb3J9YCxcclxuICAgICAgICByZWNlaXB0TnVtYmVyOiBib2R5LnJlY2VpcHROdW1iZXIsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbUmVjZWlwdCBFbWFpbF0gXHUyNzEzIFNlbnQgdG8gJHtib2R5LnJlY2lwaWVudEVtYWlsfSAoJHtib2R5LnJlY2VpcHROdW1iZXJ9KSBcdTIwMTQgUmVzZW5kIElEOiAke2VtYWlsUmVzdWx0Lm1lc3NhZ2VJZH1gKTtcclxuXHJcbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCAyMDAsIHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogYFJlY2VpcHQgZW1haWwgc2VudCB0byAke2JvZHkucmVjaXBpZW50RW1haWx9YCxcclxuICAgICAgcmVjZWlwdE51bWJlcjogYm9keS5yZWNlaXB0TnVtYmVyLFxyXG4gICAgICBtZXNzYWdlSWQ6IGVtYWlsUmVzdWx0Lm1lc3NhZ2VJZCxcclxuICAgIH0pO1xyXG5cclxuICB9IGNhdGNoIChlcnI6IHVua25vd24pIHtcclxuICAgIGNvbnN0IG1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnRmFpbGVkIHRvIHByb2Nlc3MgcmVjZWlwdCBlbWFpbCByZXF1ZXN0JztcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tSZWNlaXB0IEVtYWlsXSBIYW5kbGVyIGVycm9yOicsIGVycik7XHJcbiAgICByZXR1cm4gc2VuZEpzb24ocmVzLCA1MDAsIHsgZXJyb3I6IG1zZyB9KTtcclxuICB9XHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxCQVNJQ1xcXFxQZXJzb25hbFxcXFxNeSBTdHVkeVxcXFxTa2lsbCBUQVNLIDIwMjVcXFxcMDAyLiBXZWIgRGV2ZWxvcG1lbnRcXFxcMDQuIE90aGVyc1xcXFxOYXJham9sZSBDaGF0cm9kb2xcXFxcbmFyYWpvbGVfY2hhdHJvZG9sXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxCQVNJQ1xcXFxQZXJzb25hbFxcXFxNeSBTdHVkeVxcXFxTa2lsbCBUQVNLIDIwMjVcXFxcMDAyLiBXZWIgRGV2ZWxvcG1lbnRcXFxcMDQuIE90aGVyc1xcXFxOYXJham9sZSBDaGF0cm9kb2xcXFxcbmFyYWpvbGVfY2hhdHJvZG9sXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9CQVNJQy9QZXJzb25hbC9NeSUyMFN0dWR5L1NraWxsJTIwVEFTSyUyMDIwMjUvMDAyLiUyMFdlYiUyMERldmVsb3BtZW50LzA0LiUyME90aGVycy9OYXJham9sZSUyMENoYXRyb2RvbC9uYXJham9sZV9jaGF0cm9kb2wvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYsIHR5cGUgUGx1Z2luIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJztcclxuXHJcbmZ1bmN0aW9uIGFwaURldlNlcnZlclBsdWdpbigpOiBQbHVnaW4ge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnYXBpLWRldi1zZXJ2ZXInLFxyXG5cclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsID8gcmVxLnVybC5zcGxpdCgnPycpWzBdIDogJyc7XHJcblxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIHVybCA9PT0gJy9hcGkvY3JlYXRlLW9yZGVyJyB8fFxyXG4gICAgICAgICAgdXJsID09PSAnL2FwaS92ZXJpZnktcGF5bWVudCcgfHxcclxuICAgICAgICAgIHVybCA9PT0gJy9hcGkvY2FzaGZyZWUtb3JkZXInIHx8XHJcbiAgICAgICAgICB1cmwgPT09ICcvYXBpL2Nhc2hmcmVlLXZlcmlmeScgfHxcclxuICAgICAgICAgIHVybCA9PT0gJy9hcGkvY2FzaGZyZWUtd2ViaG9vaycgfHxcclxuICAgICAgICAgIHVybCA9PT0gJy9hcGkvc2VuZC1yZWNlaXB0LWVtYWlsJ1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgLy8gQWx3YXlzIHJlbG9hZCBsYXRlc3QgLmVudiB2YXJpYWJsZXMgaW4gZGV2XHJcbiAgICAgICAgICBjb25zdCBlbnYgPSBsb2FkRW52KCdkZXZlbG9wbWVudCcsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuXHJcbiAgICAgICAgICBpZiAoZW52LlJBWk9SUEFZX0tFWV9JRClcclxuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuUkFaT1JQQVlfS0VZX0lEID0gZW52LlJBWk9SUEFZX0tFWV9JRDtcclxuXHJcbiAgICAgICAgICBpZiAoZW52LlJBWk9SUEFZX0tFWV9TRUNSRVQpXHJcbiAgICAgICAgICAgIHByb2Nlc3MuZW52LlJBWk9SUEFZX0tFWV9TRUNSRVQgPSBlbnYuUkFaT1JQQVlfS0VZX1NFQ1JFVDtcclxuXHJcbiAgICAgICAgICBpZiAoZW52LlZJVEVfUkFaT1JQQVlfS0VZX0lEKVxyXG4gICAgICAgICAgICBwcm9jZXNzLmVudi5WSVRFX1JBWk9SUEFZX0tFWV9JRCA9XHJcbiAgICAgICAgICAgICAgZW52LlZJVEVfUkFaT1JQQVlfS0VZX0lEO1xyXG5cclxuICAgICAgICAgIGlmIChlbnYuQ0FTSEZSRUVfQVBQX0lEKVxyXG4gICAgICAgICAgICBwcm9jZXNzLmVudi5DQVNIRlJFRV9BUFBfSUQgPVxyXG4gICAgICAgICAgICAgIGVudi5DQVNIRlJFRV9BUFBfSUQ7XHJcblxyXG4gICAgICAgICAgaWYgKGVudi5DQVNIRlJFRV9TRUNSRVRfS0VZKVxyXG4gICAgICAgICAgICBwcm9jZXNzLmVudi5DQVNIRlJFRV9TRUNSRVRfS0VZID1cclxuICAgICAgICAgICAgICBlbnYuQ0FTSEZSRUVfU0VDUkVUX0tFWTtcclxuXHJcbiAgICAgICAgICBpZiAoZW52LkNBU0hGUkVFX0FQSV9FTlYpXHJcbiAgICAgICAgICAgIHByb2Nlc3MuZW52LkNBU0hGUkVFX0FQSV9FTlYgPVxyXG4gICAgICAgICAgICAgIGVudi5DQVNIRlJFRV9BUElfRU5WO1xyXG5cclxuICAgICAgICAgIGlmIChlbnYuUkVTRU5EX0FQSV9LRVkpXHJcbiAgICAgICAgICAgIHByb2Nlc3MuZW52LlJFU0VORF9BUElfS0VZID1cclxuICAgICAgICAgICAgICBlbnYuUkVTRU5EX0FQSV9LRVk7XHJcblxyXG4gICAgICAgICAgaWYgKGVudi5SRVNFTkRfRlJPTV9FTUFJTClcclxuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgPVxyXG4gICAgICAgICAgICAgIGVudi5SRVNFTkRfRlJPTV9FTUFJTDtcclxuXHJcbiAgICAgICAgICBpZiAoZW52LlJFU0VORF9SRVBMWV9UTylcclxuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuUkVTRU5EX1JFUExZX1RPID1cclxuICAgICAgICAgICAgICBlbnYuUkVTRU5EX1JFUExZX1RPO1xyXG5cclxuICAgICAgICAgIGlmIChlbnYuSU5URVJOQUxfQVBJX1NFQ1JFVClcclxuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuSU5URVJOQUxfQVBJX1NFQ1JFVCA9XHJcbiAgICAgICAgICAgICAgZW52LklOVEVSTkFMX0FQSV9TRUNSRVQ7XHJcblxyXG4gICAgICAgICAgaWYgKGVudi5TVVBBQkFTRV9VUkwpXHJcbiAgICAgICAgICAgIHByb2Nlc3MuZW52LlNVUEFCQVNFX1VSTCA9IGVudi5TVVBBQkFTRV9VUkw7XHJcblxyXG4gICAgICAgICAgaWYgKGVudi5WSVRFX1NVUEFCQVNFX1VSTClcclxuICAgICAgICAgICAgcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9VUkwgPSBlbnYuVklURV9TVVBBQkFTRV9VUkw7XHJcblxyXG4gICAgICAgICAgaWYgKGVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZKVxyXG4gICAgICAgICAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZID1cclxuICAgICAgICAgICAgICBlbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWTtcclxuXHJcbiAgICAgICAgICBpZiAoZW52LlNJVEVfVVJMKVxyXG4gICAgICAgICAgICBwcm9jZXNzLmVudi5TSVRFX1VSTCA9IGVudi5TSVRFX1VSTDtcclxuXHJcbiAgICAgICAgICAvLyBDUkVBVEUgT1JERVJcclxuICAgICAgICAgIGlmICh1cmwgPT09ICcvYXBpL2NyZWF0ZS1vcmRlcicpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCB7IGRlZmF1bHQ6IGhhbmRsZXIgfSA9XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBpbXBvcnQoJy4vYXBpL2NyZWF0ZS1vcmRlcicpO1xyXG5cclxuICAgICAgICAgICAgICBhd2FpdCBoYW5kbGVyKHJlcSwgcmVzKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZTogdW5rbm93bikge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXHJcbiAgICAgICAgICAgICAgICAnRXJyb3IgaW4gL2FwaS9jcmVhdGUtb3JkZXIgZGV2IG1pZGRsZXdhcmU6JyxcclxuICAgICAgICAgICAgICAgIGVcclxuICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFxyXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbidcclxuICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICBlcnJvcjpcclxuICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgRXJyb3JcclxuICAgICAgICAgICAgICAgICAgICAgID8gZS5tZXNzYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgICA6ICdJbnRlcm5hbCBTZXJ2ZXIgRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gVkVSSUZZIFJBWk9SUEFZIFBBWU1FTlRcclxuICAgICAgICAgIGlmICh1cmwgPT09ICcvYXBpL3ZlcmlmeS1wYXltZW50Jykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHsgZGVmYXVsdDogaGFuZGxlciB9ID1cclxuICAgICAgICAgICAgICAgIGF3YWl0IGltcG9ydCgnLi9hcGkvdmVyaWZ5LXBheW1lbnQnKTtcclxuXHJcbiAgICAgICAgICAgICAgYXdhaXQgaGFuZGxlcihyZXEsIHJlcyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IHVua25vd24pIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgICAgICAgJ0Vycm9yIGluIC9hcGkvdmVyaWZ5LXBheW1lbnQgZGV2IG1pZGRsZXdhcmU6JyxcclxuICAgICAgICAgICAgICAgIGVcclxuICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFxyXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAgICAgICAnYXBwbGljYXRpb24vanNvbidcclxuICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICBlcnJvcjpcclxuICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgRXJyb3JcclxuICAgICAgICAgICAgICAgICAgICAgID8gZS5tZXNzYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgICA6ICdJbnRlcm5hbCBTZXJ2ZXIgRXJyb3InLFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gQ1JFQVRFIENBU0hGUkVFIE9SREVSXHJcbiAgICAgICAgICBpZiAodXJsID09PSAnL2FwaS9jYXNoZnJlZS1vcmRlcicpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCB7IGRlZmF1bHQ6IGhhbmRsZXIgfSA9XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBpbXBvcnQoJy4vYXBpL2Nhc2hmcmVlLW9yZGVyJyk7XHJcblxyXG4gICAgICAgICAgICAgIGF3YWl0IGhhbmRsZXIocmVxLCByZXMpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAgICAgICAgICdFcnJvciBpbiAvYXBpL2Nhc2hmcmVlLW9yZGVyIGRldiBtaWRkbGV3YXJlOicsXHJcbiAgICAgICAgICAgICAgICBlXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcclxuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgZXJyb3I6XHJcbiAgICAgICAgICAgICAgICAgICAgZSBpbnN0YW5jZW9mIEVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICA/IGUubWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgOiAnSW50ZXJuYWwgU2VydmVyIEVycm9yJyxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFZFUklGWSBDQVNIRlJFRSBQQVlNRU5UXHJcbiAgICAgICAgICBpZiAodXJsID09PSAnL2FwaS9jYXNoZnJlZS12ZXJpZnknKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgeyBkZWZhdWx0OiBoYW5kbGVyIH0gPVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgaW1wb3J0KCcuL2FwaS9jYXNoZnJlZS12ZXJpZnknKTtcclxuXHJcbiAgICAgICAgICAgICAgYXdhaXQgaGFuZGxlcihyZXEsIHJlcyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IHVua25vd24pIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgICAgICAgJ0Vycm9yIGluIC9hcGkvY2FzaGZyZWUtdmVyaWZ5IGRldiBtaWRkbGV3YXJlOicsXHJcbiAgICAgICAgICAgICAgICBlXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcclxuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgZXJyb3I6XHJcbiAgICAgICAgICAgICAgICAgICAgZSBpbnN0YW5jZW9mIEVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICA/IGUubWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgOiAnSW50ZXJuYWwgU2VydmVyIEVycm9yJyxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIENBU0hGUkVFIFdFQkhPT0sgKHNlcnZlci10by1zZXJ2ZXIgY2FsbGJhY2spXHJcbiAgICAgICAgICBpZiAodXJsID09PSAnL2FwaS9jYXNoZnJlZS13ZWJob29rJykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHsgZGVmYXVsdDogaGFuZGxlciB9ID1cclxuICAgICAgICAgICAgICAgIGF3YWl0IGltcG9ydCgnLi9hcGkvY2FzaGZyZWUtd2ViaG9vaycpO1xyXG5cclxuICAgICAgICAgICAgICBhd2FpdCBoYW5kbGVyKHJlcSwgcmVzKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZTogdW5rbm93bikge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXHJcbiAgICAgICAgICAgICAgICAnRXJyb3IgaW4gL2FwaS9jYXNoZnJlZS13ZWJob29rIGRldiBtaWRkbGV3YXJlOicsXHJcbiAgICAgICAgICAgICAgICBlXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcclxuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgZXJyb3I6XHJcbiAgICAgICAgICAgICAgICAgICAgZSBpbnN0YW5jZW9mIEVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICA/IGUubWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgOiAnSW50ZXJuYWwgU2VydmVyIEVycm9yJyxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFNFTkQgUkVDRUlQVCBFTUFJTFxyXG4gICAgICAgICAgaWYgKHVybCA9PT0gJy9hcGkvc2VuZC1yZWNlaXB0LWVtYWlsJykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHsgZGVmYXVsdDogaGFuZGxlciB9ID1cclxuICAgICAgICAgICAgICAgIGF3YWl0IGltcG9ydCgnLi9hcGkvc2VuZC1yZWNlaXB0LWVtYWlsJyk7XHJcblxyXG4gICAgICAgICAgICAgIGF3YWl0IGhhbmRsZXIocmVxLCByZXMpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAgICAgICAgICdFcnJvciBpbiAvYXBpL3NlbmQtcmVjZWlwdC1lbWFpbCBkZXYgbWlkZGxld2FyZTonLFxyXG4gICAgICAgICAgICAgICAgZVxyXG4gICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXHJcbiAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgIGVycm9yOlxyXG4gICAgICAgICAgICAgICAgICAgIGUgaW5zdGFuY2VvZiBFcnJvclxyXG4gICAgICAgICAgICAgICAgICAgICAgPyBlLm1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICAgIDogJ0ludGVybmFsIFNlcnZlciBFcnJvcicsXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG5leHQoKTtcclxuICAgICAgfSk7XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuXHJcbiAgaWYgKGVudi5SQVpPUlBBWV9LRVlfSUQpXHJcbiAgICBwcm9jZXNzLmVudi5SQVpPUlBBWV9LRVlfSUQgPSBlbnYuUkFaT1JQQVlfS0VZX0lEO1xyXG5cclxuICBpZiAoZW52LlJBWk9SUEFZX0tFWV9TRUNSRVQpXHJcbiAgICBwcm9jZXNzLmVudi5SQVpPUlBBWV9LRVlfU0VDUkVUID1cclxuICAgICAgZW52LlJBWk9SUEFZX0tFWV9TRUNSRVQ7XHJcblxyXG4gIGlmIChlbnYuVklURV9SQVpPUlBBWV9LRVlfSUQpXHJcbiAgICBwcm9jZXNzLmVudi5WSVRFX1JBWk9SUEFZX0tFWV9JRCA9XHJcbiAgICAgIGVudi5WSVRFX1JBWk9SUEFZX0tFWV9JRDtcclxuXHJcbiAgaWYgKGVudi5DQVNIRlJFRV9BUFBfSUQpXHJcbiAgICBwcm9jZXNzLmVudi5DQVNIRlJFRV9BUFBfSUQgPVxyXG4gICAgICBlbnYuQ0FTSEZSRUVfQVBQX0lEO1xyXG5cclxuICBpZiAoZW52LkNBU0hGUkVFX1NFQ1JFVF9LRVkpXHJcbiAgICBwcm9jZXNzLmVudi5DQVNIRlJFRV9TRUNSRVRfS0VZID1cclxuICAgICAgZW52LkNBU0hGUkVFX1NFQ1JFVF9LRVk7XHJcblxyXG4gIGlmIChlbnYuQ0FTSEZSRUVfQVBJX0VOVilcclxuICAgIHByb2Nlc3MuZW52LkNBU0hGUkVFX0FQSV9FTlYgPVxyXG4gICAgICBlbnYuQ0FTSEZSRUVfQVBJX0VOVjtcclxuXHJcbiAgaWYgKGVudi5SRVNFTkRfQVBJX0tFWSlcclxuICAgIHByb2Nlc3MuZW52LlJFU0VORF9BUElfS0VZID1cclxuICAgICAgZW52LlJFU0VORF9BUElfS0VZO1xyXG5cclxuICBpZiAoZW52LlJFU0VORF9GUk9NX0VNQUlMKVxyXG4gICAgcHJvY2Vzcy5lbnYuUkVTRU5EX0ZST01fRU1BSUwgPVxyXG4gICAgICBlbnYuUkVTRU5EX0ZST01fRU1BSUw7XHJcblxyXG4gIGlmIChlbnYuUkVTRU5EX1JFUExZX1RPKVxyXG4gICAgcHJvY2Vzcy5lbnYuUkVTRU5EX1JFUExZX1RPID1cclxuICAgICAgZW52LlJFU0VORF9SRVBMWV9UTztcclxuXHJcbiAgaWYgKGVudi5JTlRFUk5BTF9BUElfU0VDUkVUKVxyXG4gICAgcHJvY2Vzcy5lbnYuSU5URVJOQUxfQVBJX1NFQ1JFVCA9XHJcbiAgICAgIGVudi5JTlRFUk5BTF9BUElfU0VDUkVUO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCgpLFxyXG4gICAgICBhcGlEZXZTZXJ2ZXJQbHVnaW4oKSxcclxuICAgIF0sXHJcblxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdAJzogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICAgIG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKVxyXG4gICAgICAgICksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG5cclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBwb3J0OiA1MTczLFxyXG5cclxuICAgICAgLy8gQWxsb3cgZXh0ZXJuYWwgYWNjZXNzIHRocm91Z2ggbmdyb2tcclxuICAgICAgaG9zdDogdHJ1ZSxcclxuXHJcbiAgICAgIC8vIElNUE9SVEFOVDogQWxsb3cgbmdyb2sgVVJMXHJcbiAgICAgIGFsbG93ZWRIb3N0czogW1xyXG4gICAgICAgICdjcml0ZXJpYS1tYWtlb3Zlci1qdW5lLm5ncm9rLWZyZWUuZGV2JyxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgfTtcclxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNBLE9BQU8sY0FBYztBQUNyQixPQUFPLFFBQVE7QUFDZixPQUFPLFVBQVU7QUFFakIsU0FBUyxTQUFTLEtBQXFCLFlBQW9CLE1BQWU7QUFDeEUsTUFBSSxVQUFVLGdCQUFnQixrQkFBa0I7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QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsOEJBbVNVLGVBQWU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQWMzQixLQUFLLGlCQUFpQixRQUFHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxrQkFXekIsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQU9YLEtBQUssU0FBUyxpQkFBaUIsV0FBVyxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUEsa0JBSWpELEtBQUssaUJBQWlCLFFBQUc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGNBSzdCLEtBQUssVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQU9YLEtBQUssT0FBTztBQUFBO0FBQUE7QUFBQSxnQkFHZCxFQUFFO0FBQUE7QUFBQTtBQUFBLGNBR0osS0FBSyxRQUFRO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsa0JBT1QsS0FBSyxLQUFLLEdBQUcsS0FBSyxPQUFPLE1BQU0sS0FBSyxPQUFPLEVBQUU7QUFBQTtBQUFBO0FBQUEsZ0JBRy9DLEVBQUU7QUFBQTtBQUFBO0FBQUEsY0FHSixLQUFLLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQU9qQixLQUFLLGFBQWE7QUFBQTtBQUFBO0FBQUEsZ0JBR3BCLEVBQUU7QUFBQTtBQUFBO0FBQUEsY0FHSixLQUFLLFlBQVk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxrQkFPYixLQUFLLFNBQVM7QUFBQTtBQUFBO0FBQUEsZ0JBR2hCLEVBQUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQXFKbEI7QUFJQSxlQUFlLGNBQ2IsY0FDQSxTQUNBLFFBQ0EsU0FDQSxhQUNtRTtBQUNuRSxNQUFJO0FBQ0YsVUFBTSxjQUFjLG1CQUFtQjtBQUN2QyxVQUFNLGlCQUFpQixpQkFBaUI7QUFFeEMsVUFBTSxXQUFXLE1BQU0sTUFBTSxpQ0FBaUM7QUFBQSxNQUM1RCxRQUFRO0FBQUEsTUFDUixTQUFTO0FBQUEs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LGtCQUNWLElBQUk7QUFFUixNQUFJLElBQUk7QUFDTixZQUFRLElBQUksc0JBQ1YsSUFBSTtBQUVSLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLG1CQUFtQjtBQUFBLElBQ3JCO0FBQUEsSUFFQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLO0FBQUEsVUFDSCxJQUFJQyxLQUFJLFNBQVMsd0NBQWU7QUFBQSxRQUNsQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFFQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUE7QUFBQSxNQUdOLE1BQU07QUFBQTtBQUFBLE1BR04sY0FBYztBQUFBLFFBQ1o7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJmcyIsICJwYXRoIiwgImNyZWF0ZUNsaWVudCIsICJmcyIsICJwYXRoIiwgImdldEVudlZhbHVlIiwgImdldFN1cGFiYXNlQ2xpZW50IiwgImhhbmRsZXIiLCAiY3J5cHRvIiwgImZzIiwgInBhdGgiLCAic2VuZEpzb24iLCAicGFyc2VCb2R5IiwgImdldENyZWRlbnRpYWxzIiwgImhhbmRsZXIiLCAiZnMiLCAicGF0aCIsICJzZW5kSnNvbiIsICJwYXJzZUJvZHkiLCAiaGFuZGxlciIsICJmcyIsICJwYXRoIiwgInNlbmRKc29uIiwgInBhcnNlQm9keSIsICJnZXRFbnZWYWx1ZSIsICJnZXRDYXNoZnJlZUNyZWRlbnRpYWxzIiwgImhhbmRsZXIiLCAiY3J5cHRvIiwgImZzIiwgInBhdGgiLCAic2VuZEpzb24iLCAiZ2V0RW52VmFsdWUiLCAiaGFuZGxlciIsICJjcmVhdGVDbGllbnQiLCAiZnMiLCAicGF0aCIsICJnZXRTdXBhYmFzZUNsaWVudCIsICJzZW5kSnNvbiIsICJwYXJzZUJvZHkiLCAiVVJMIiwgImhhbmRsZXIiLCAiVVJMIl0KfQo=
