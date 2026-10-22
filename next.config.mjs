/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  // Pacotes 3D são grandes: o Next gera só o que cada rota usa.
  experimental: { optimizePackageImports: ['framer-motion', 'three', '@react-three/drei'], inlineCss: true },
  // ERP (app Vite em public/erp): qualquer rota /erp/... que não seja arquivo cai no index.html dele
  async rewrites() {
    return [
      { source: '/erp', destination: '/erp/index.html' },
      { source: '/erp/:path((?!assets/).*)', destination: '/erp/index.html' },
    ];
  },
  async headers() {
    return [
      {
        source: '/media/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};
export default nextConfig;
