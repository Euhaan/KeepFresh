import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages는 https://<계정>.github.io/<저장소>/ 아래에 서빙되므로 base를 저장소 이름으로 둔다.
// 커스텀 도메인이나 루트 배포로 바꾸면 VITE_BASE=/ 로 덮어쓴다.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/KanKan/' : '/');

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '칸칸 · 우리집 냉장고',
        short_name: '칸칸',
        description: '가족이 함께 쓰는 냉장고 관리 앱',
        lang: 'ko',
        theme_color: '#0E7C86',
        background_color: '#F6F8F7',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
