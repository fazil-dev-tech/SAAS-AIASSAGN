import './src/utils/dns-hook.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/@sparticuz/chromium/bin/**/*']
  }
};

export default nextConfig;


