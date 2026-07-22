export const MPESA_CONFIG = {
  ENV: 'sandbox', // Change to 'production' for live
  CONSUMER_KEY: 'MPESA_CONSUMER_KEY',
  CONSUMER_SECRET: 'MPESA_CONSUMER_SECRET',
  SHORTCODE: 'MPESA_SHORTCODE', // For STK Push (Paybill/Buy Goods)
  PASSKEY: 'MPESA_PASSKEY',
  B2C_SHORTCODE: 'MPESA_B2C_SHORTCODE',
  INITIATOR_NAME: 'MPESA_INITIATOR_NAME',
  SECURITY_CREDENTIAL: 'MPESA_SECURITY_CREDENTIAL',
  CALLBACK_URL: 'MPESA_CALLBACK_URL', // Must be a public HTTPS URL
  B2C_RESULT_URL: 'MPESA_B2C_RESULT_URL',
  B2C_TIMEOUT_URL: 'MPESA_B2C_TIMEOUT_URL',
  BALANCE_RESULT_URL: 'MPESA_BALANCE_RESULT_URL',
  BALANCE_TIMEOUT_URL: 'MPESA_BALANCE_TIMEOUT_URL',

  // Daraja Sandbox URLs
  OAUTH_TOKEN_URL: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  STK_PUSH_URL: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  B2C_URL: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
  BALANCE_URL: 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query',

  // Production URLs (override in prod env)
  // OAUTH_TOKEN_URL: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  // STK_PUSH_URL: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
} as const;

export const MPESA_RESULT_CODES = {
  SUCCESS: 0,
  CANCELLED: 1,
  INVALID_PHONE: 13,
  INSUFFICIENT_FUNDS: 20,
  TIMEOUT: 25,
  DUPLICATE_TRANSACTION: 26,
} as const;

export const SAFARICOM_IPS = [
  '196.201.214.200',
  '196.201.214.206',
  '196.201.213.114',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.213.44',
  '196.201.212.127',
  '196.201.212.138',
  '196.201.212.60',
  '::1', // Localhost for testing
];
