import { VitePWA } from 'vite-plugin-pwa';

export function withPWA() {
  return VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    devOptions: {
      enabled: true
    },
    workbox: {
      cleanupOutdatedCaches: true,
      clientsClaim: true
    },
    includeAssets: ['favicon.ico', 'favicon.svg'],
    manifest: {
      name: 'Whiteboard',
      short_name: 'Whiteboard',
      description: 'A whiteboard web app',
      start_url: '.',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      icons: [
        // Provide real PNGs in public/ for best results
        { src: '/favicon.ico', sizes: '48x48 72x72 96x96 128x128 256x256', type: 'image/x-icon' }
      ]
    }
  });
}
