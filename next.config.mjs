/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["xlsx", "bcryptjs", "@prisma/client", "prisma"],
  },
};

export default nextConfig;
