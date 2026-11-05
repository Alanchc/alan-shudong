import sentryConfig from "@sentry/nextjs/config";

const { withSentryConfig } = sentryConfig;

/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!supabaseUrl) return [];
    return [{ source: "/sb/:path*", destination: `${supabaseUrl}/:path*` }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,
  silent: !sentryAuthToken,
  telemetry: false,
  // 国内访问 sentry.io 不稳定，事件走自己的域名转发
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: !sentryAuthToken },
});
