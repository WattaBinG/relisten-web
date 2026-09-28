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
  async redirects() {
    return [
      // The signup flow lives on /account ("Create an account"); /sign-up 404'd.
      { source: '/sign-up', destination: '/account', permanent: false },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
