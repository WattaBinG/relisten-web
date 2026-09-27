export default {
  output: 'standalone',
  serverExternalPackages: ['@takumi-rs/image-response'],
  async rewrites() {
    return [
      {
        source: '/privacy-policy',
        destination: '/privacy_policy.html',
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
