import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (
          url === '/api/create-order' ||
          url === '/api/verify-payment' ||
          url === '/api/cashfree-order' ||
          url === '/api/cashfree-verify' ||
          url === '/api/send-receipt-email'
        ) {
          // Always reload latest .env variables in dev
          const env = loadEnv('development', process.cwd(), '');
          if (env.RAZORPAY_KEY_ID) process.env.RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID;
          if (env.RAZORPAY_KEY_SECRET) process.env.RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET;
          if (env.VITE_RAZORPAY_KEY_ID) process.env.VITE_RAZORPAY_KEY_ID = env.VITE_RAZORPAY_KEY_ID;
          if (env.CASHFREE_APP_ID) process.env.CASHFREE_APP_ID = env.CASHFREE_APP_ID;
          if (env.CASHFREE_SECRET_KEY) process.env.CASHFREE_SECRET_KEY = env.CASHFREE_SECRET_KEY;
          if (env.CASHFREE_API_ENV) process.env.CASHFREE_API_ENV = env.CASHFREE_API_ENV;
          if (env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY;
          if (env.RESEND_FROM_EMAIL) process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL;
          if (env.RESEND_REPLY_TO) process.env.RESEND_REPLY_TO = env.RESEND_REPLY_TO;
          if (env.INTERNAL_API_SECRET) process.env.INTERNAL_API_SECRET = env.INTERNAL_API_SECRET;

          if (url === '/api/create-order') {
            try {
              const { default: handler } = await import('./api/create-order');
              await handler(req, res);
            } catch (e: unknown) {
              console.error('Error in /api/create-order dev middleware:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal Server Error' }));
            }
            return;
          }

          if (url === '/api/verify-payment') {
            try {
              const { default: handler } = await import('./api/verify-payment');
              await handler(req, res);
            } catch (e: unknown) {
              console.error('Error in /api/verify-payment dev middleware:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal Server Error' }));
            }
            return;
          }

          if (url === '/api/cashfree-order') {
            try {
              const { default: handler } = await import('./api/cashfree-order');
              await handler(req, res);
            } catch (e: unknown) {
              console.error('Error in /api/cashfree-order dev middleware:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal Server Error' }));
            }
            return;
          }

          if (url === '/api/cashfree-verify') {
            try {
              const { default: handler } = await import('./api/cashfree-verify');
              await handler(req, res);
            } catch (e: unknown) {
              console.error('Error in /api/cashfree-verify dev middleware:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal Server Error' }));
            }
            return;
          }

          if (url === '/api/send-receipt-email') {
            try {
              const { default: handler } = await import('./api/send-receipt-email');
              await handler(req, res);
            } catch (e: unknown) {
              console.error('Error in /api/send-receipt-email dev middleware:', e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal Server Error' }));
            }
            return;
          }
        }
        next();

      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.RAZORPAY_KEY_ID) process.env.RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID;
  if (env.RAZORPAY_KEY_SECRET) process.env.RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET;
  if (env.VITE_RAZORPAY_KEY_ID) process.env.VITE_RAZORPAY_KEY_ID = env.VITE_RAZORPAY_KEY_ID;
  if (env.CASHFREE_APP_ID) process.env.CASHFREE_APP_ID = env.CASHFREE_APP_ID;
  if (env.CASHFREE_SECRET_KEY) process.env.CASHFREE_SECRET_KEY = env.CASHFREE_SECRET_KEY;
  if (env.CASHFREE_API_ENV) process.env.CASHFREE_API_ENV = env.CASHFREE_API_ENV;
  if (env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY;
  if (env.RESEND_FROM_EMAIL) process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL;
  if (env.RESEND_REPLY_TO) process.env.RESEND_REPLY_TO = env.RESEND_REPLY_TO;
  if (env.INTERNAL_API_SECRET) process.env.INTERNAL_API_SECRET = env.INTERNAL_API_SECRET;


  return {
    plugins: [react(), apiDevServerPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
