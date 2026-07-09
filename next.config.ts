import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['node-pty', 'playwright', '@playwright/test'],
  // The terminal (xterm) is an imperative, stateful component holding a live
  // WebSocket + PTY. StrictMode double-mounts in dev, spawning a second xterm
  // (the "split"), duplicating the shell command, and wiping scrollback (so
  // Copy only sees the last 2 lines). Disable it so the terminal is stable.
  reactStrictMode: false,
};

export default nextConfig;
