import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.BUDGETLY_LOCAL_AUTH_TESTS === '1' ? '.next-e2e' : '.next',
};

export default nextConfig;
