/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true,
  },
  env: {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    TRANSLATE_API_URL: process.env.TRANSLATE_API_URL,
    TRANSLATE_API_KEY: process.env.TRANSLATE_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
}

module.exports = nextConfig