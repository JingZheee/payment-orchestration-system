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

  PAYMENTS: {
    INITIATE:  '/payments/initiate',
    DISBURSE:  '/payments/disburse',
    STATUS:    (id: string) => `/payments/${id}/status`,
  },
} as const;
