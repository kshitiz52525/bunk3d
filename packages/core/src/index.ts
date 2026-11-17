// Pure business rules. No I/O, no framework imports. The mock API calls these now;
// Supabase Edge Functions / Postgres functions will reuse them in the backend phase.
export * from './age';
export * from './otp';
export * from './anon';
