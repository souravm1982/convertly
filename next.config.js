/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/client-bedrock-runtime', 'fluent-ffmpeg']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ffmpeg from client bundle
      config.externals.push('fluent-ffmpeg');
    }
    return config;
  }
}

module.exports = nextConfig