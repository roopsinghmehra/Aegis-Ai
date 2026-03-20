import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rickymehra.securityapp',
  appName: 'Security Camera Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
