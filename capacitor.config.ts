import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lukasfe3d.hub',
  appName: 'LukasFe3D Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // url: 'https://yellow-mouse-74e7.meuspersonalizados3d.workers.dev/',
    // allowNavigation: ['yellow-mouse-74e7.meuspersonalizados3d.workers.dev'],
    cleartext: false
  }
};

export default config;
