import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),

  // Database (MSSQL)
  DB_CONNECTION_STRING: required('DATABASE_URL'),

  // JWT
  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),

  // App
  APP_BASE_URL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
