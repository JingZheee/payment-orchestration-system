export const API = {
  AUTH: {
    LOGIN:    '/auth/login',
    REGISTER: '/auth/register',
    REFRESH:  '/auth/refresh',
  },

  DASHBOARD: {
    SUMMARY:             '/admin/dashboard/transactions/summary',
    SCORES:              '/admin/dashboard/scores',
    STRATEGY_COMPARISON: '/admin/dashboard/strategy-comparison',
  },

  TRANSACTIONS: {
    LIST:   '/admin/transactions',
    DETAIL: (id: string) => `/admin/transactions/${id}`,
  },

  ROUTING_RULES: {
    LIST:   '/admin/routing-rules',
    BY_ID:  (id: number) => `/admin/routing-rules/${id}`,
  },

  PROVIDERS: {
    LIST:   '/admin/providers',
    TOGGLE: (provider: string) => `/admin/providers/${provider}/toggle`,
  },

  FEE_RATES: {
    LIST:   '/admin/fee-rates',
    BY_ID:  (id: number) => `/admin/fee-rates/${id}`,
  },

  METRICS: {
    LIST: '/admin/metrics',
  },

  RECON: {
    LIST:      '/admin/recon',
    ANOMALIES: '/admin/recon/anomalies',
  },

  PAYMENT_METHODS: {
    LIST:   '/admin/payment-methods',
    BY_KEY: (region: string, code: string) => `/admin/payment-methods/${region}/${code}`,
  },

  PAYMENTS: {
    INITIATE:  '/payments/initiate',
    DISBURSE:  '/payments/disburse',
    STATUS:    (id: string) => `/payments/${id}/status`,
    METHODS:   '/payments/methods',
  },

  DEMO_POLICIES: {
    LIST:   '/admin/demo-policies',
    CREATE: '/admin/demo-policies',
    DELETE: (id: string) => `/admin/demo-policies/${id}`,
  },

  NOTIFICATION_QUEUE: {
    STATUS: '/admin/notification-queue/status',
    START:  '/admin/notification-queue/consumer/start',
    STOP:   '/admin/notification-queue/consumer/stop',
  },
} as const;
