/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!supabaseUrl) return [];
    return [{ source: "/sb/:path*", destination: `${supabaseUrl}/:path*` }];
  },
};

export default nextConfig;
