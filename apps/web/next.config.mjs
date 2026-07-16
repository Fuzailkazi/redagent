/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @armoriq/schema is a workspace TS package; let Next transpile it.
  transpilePackages: ['@armoriq/schema'],
};

export default nextConfig;
