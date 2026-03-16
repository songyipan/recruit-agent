/** @type {import('next').NextConfig} */
const nextConfig = {
  // 配置静态文件服务，将 /uploads 映射到本地 uploads 目录
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/file/:path*",
      },
    ]
  },
}

export default nextConfig
