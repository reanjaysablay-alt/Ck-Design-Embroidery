/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Product images are uploaded through a server action (up to 5MB in
  // lib/upload.js). Next.js server actions default to a 1MB body limit,
  // which throws "Application error: a server-side exception has
  // occurred" when adding a product with a larger image. Raise it to
  // match the 5MB upload cap.
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

module.exports = nextConfig;
