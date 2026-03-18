import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Isto força o PWA a funcionar no nosso localhost para testes!
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Ponto Virtual Biritiba',
        short_name: 'Táxi Biritiba',
        description: 'Aplicativo de Táxi de Biritiba Mirim',
        theme_color: '#ffb703',
        background_color: '#ffb703',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-logo.png', 
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})