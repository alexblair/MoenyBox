/** @type {import("next").NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [],
  },
  allowedDevOrigins: ["192.168.200.8"],
};

export default nextConfig;
