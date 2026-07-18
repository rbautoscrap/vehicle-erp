/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Windows: persistent webpack cache under .next often hits UNKNOWN/-4094 file locks
  // during route switches (logout → login → admin), which makes the server look dead.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
