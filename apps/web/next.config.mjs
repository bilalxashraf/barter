/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@barter/chains",
    "@barter/config",
    "@barter/db",
    "@barter/observability"
  ]
};

export default nextConfig;

