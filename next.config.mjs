/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    serverComponentsExternalPackages: [
      "@imgly/background-removal-node",
      "sharp",
      "onnxruntime-node",
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    } else {
      config.externals = [
        ...(config.externals || []),
        "@imgly/background-removal-node",
        "sharp",
        "onnxruntime-node",
      ];
    }
    return config;
  },
};

export default nextConfig;
