import type { NextConfig } from "next";

// No /api/* rewrite to the worker: the frontend calls the worker directly via
// NEXT_PUBLIC_SERVER_URL, and proxying /api/* through this domain exposed the
// worker's unauthenticated routes (e.g. /admin/delete-user) here too.
const nextConfig: NextConfig = {};

export default nextConfig;
