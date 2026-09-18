/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
    outputFileTracingExcludes: {
      "*": [
        "node_modules/@swc/core-linux-x64-gnu",
        "node_modules/@swc/core-linux-x64-musl",
        "node_modules/@esbuild/linux-x64",
        "node_modules/onnxruntime-node/**",
        "node_modules/onnxruntime-web/**",
        "node_modules/@imgly/**",
        "falcon_mobile/**",
        "backups/**",
        "database/**",
        "docs/**",
        "scripts/**",
        ".git/**",
      ],
    },
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
