import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import createOrderHandler from '../api/create-order.ts';
import verifyPaymentHandler from '../api/verify-payment.ts';

// Load environment variables from .env if not present in process.env
function loadEnvFile() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const key = k?.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

loadEnvFile();

const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error('❌ Error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env file or environment variables.');
  process.exit(1);
}

async function testBackend() {
  console.log('--- STARTING RAZORPAY INTEGRATION VERIFICATION ---');
  console.log('Using Key ID:', keyId);

  // Helper to simulate HTTP requests to handler
  const callHandler = (handler, { method = 'POST', body = {} } = {}) => {
    return new Promise((resolve) => {
      const bodyStr = JSON.stringify(body);
      const req = new http.IncomingMessage(null);
      req.method = method;
      req.headers = {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(bodyStr),
      };

      const res = new http.ServerResponse(req);
      let output = '';
      const headers = {};

      res.setHeader = (k, v) => {
        headers[k] = v;
      };
      res.end = (chunk) => {
        if (chunk) output += chunk;
        let parsed = output;
        try {
          parsed = JSON.parse(output);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers,
          data: parsed,
        });
      };

      // Push body into req stream
      req.push(bodyStr);
      req.push(null);

      handler(req, res);
    });
  };

  // Test 1: Order Creation with valid amount (₹500 = 50000 paise)
  console.log('\n[Test 1] Testing /api/create-order with amount = 50000 paise (₹500)...');
  const res1 = await callHandler(createOrderHandler, {
    body: {
      amount: 50000,
      currency: 'INR',
      receipt: `test_rcpt_${Date.now()}`,
    },
  });

  console.log('Status Code:', res1.statusCode);
  console.log('Response Body:', res1.data);
  if (res1.statusCode === 200 && res1.data.order_id && res1.data.amount === 50000) {
    console.log('✅ Test 1 PASSED: Order successfully created with ID:', res1.data.order_id);
  } else {
    console.error('❌ Test 1 FAILED:', res1.data);
    process.exit(1);
  }

  const generatedOrderId = res1.data.order_id;

  // Test 2: Order Creation validation with invalid amount (< 100 paise)
  console.log('\n[Test 2] Testing /api/create-order with amount = 50 paise (under 100 paise minimum)...');
  const res2 = await callHandler(createOrderHandler, {
    body: {
      amount: 50,
      currency: 'INR',
    },
  });

  console.log('Status Code:', res2.statusCode);
  console.log('Response Body:', res2.data);
  if (res2.statusCode === 400 && res2.data.error) {
    console.log('✅ Test 2 PASSED: Correctly rejected order below 100 paise');
  } else {
    console.error('❌ Test 2 FAILED: Expected 400 validation error');
    process.exit(1);
  }

  // Test 3: Signature Verification with valid HMAC signature
  console.log('\n[Test 3] Testing /api/verify-payment with authentic HMAC-SHA256 signature...');
  const testPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${generatedOrderId}|${testPaymentId}`)
    .digest('hex');

  const res3 = await callHandler(verifyPaymentHandler, {
    body: {
      order_id: generatedOrderId,
      payment_id: testPaymentId,
      razorpay_signature: validSignature,
    },
  });

  console.log('Status Code:', res3.statusCode);
  console.log('Response Body:', res3.data);
  if (res3.statusCode === 200 && res3.data.success === true) {
    console.log('✅ Test 3 PASSED: Signature verification succeeded');
  } else {
    console.error('❌ Test 3 FAILED:', res3.data);
    process.exit(1);
  }

  // Test 4: Signature Verification with tampered/invalid signature
  console.log('\n[Test 4] Testing /api/verify-payment with invalid signature...');
  const res4 = await callHandler(verifyPaymentHandler, {
    body: {
      order_id: generatedOrderId,
      payment_id: testPaymentId,
      razorpay_signature: 'fake_tampered_signature_1234567890abcdef1234567890abcdef',
    },
  });

  console.log('Status Code:', res4.statusCode);
  console.log('Response Body:', res4.data);
  if (res4.statusCode === 400 && res4.data.success === false) {
    console.log('✅ Test 4 PASSED: Invalid signature properly rejected with 400');
  } else {
    console.error('❌ Test 4 FAILED: Tampered signature was not rejected');
    process.exit(1);
  }

  // Test 5: Signature Verification with missing parameters
  console.log('\n[Test 5] Testing /api/verify-payment with missing signature...');
  const res5 = await callHandler(verifyPaymentHandler, {
    body: {
      order_id: generatedOrderId,
      payment_id: testPaymentId,
    },
  });

  console.log('Status Code:', res5.statusCode);
  console.log('Response Body:', res5.data);
  if (res5.statusCode === 400 && res5.data.success === false) {
    console.log('✅ Test 5 PASSED: Missing parameters properly rejected with 400');
  } else {
    console.error('❌ Test 5 FAILED: Expected 400 for missing parameter');
    process.exit(1);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL 5 RAZORPAY INTEGRATION TESTS PASSED!');
  console.log('=============================================\n');
}

testBackend().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
