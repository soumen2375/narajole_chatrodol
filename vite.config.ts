import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/create-order' || url === '/api/verify-payment' || url === '/api/cashfree-order' || url === '/api/send-receipt-email') {
          // Always reload latest .env variables in dev
          const env = loadEnv('development', process.cwd(), '');
          if (env.RAZORPAY_KEY_ID) process.env.RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID;
          if (env.RAZORPAY_KEY_SECRET) process.env.RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET;
          if (env.VITE_RAZORPAY_KEY_ID) process.env.VITE_RAZORPAY_KEY_ID = env.VITE_RAZORPAY_KEY_ID;
          if (env.CASHFREE_APP_ID) process.env.CASHFREE_APP_ID = env.CASHFREE_APP_ID;
          if (env.CASHFREE_SECRET_KEY) process.env.CASHFREE_SECRET_KEY = env.CASHFREE_SECRET_KEY;
          if (env.CASHFREE_API_ENV) process.env.CASHFREE_API_ENV = env.CASHFREE_API_ENV;

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
