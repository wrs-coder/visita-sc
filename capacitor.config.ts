import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waorodrigues.visitasc',
  appName: 'Visita SC',
  // Casca local (SPA shell) gerada por `npm run android:shell`.
  // O app roda 100% no aparelho; apenas as chamadas de dados vão para os
  // domínios publicados, escolhidos dinamicamente em src/lib/api-origin.ts.
  webDir: 'dist-app',
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'visita-sc.lovable.app',
      'visitasc.com.br',
      'www.visitasc.com.br',
      '*.supabase.co',
    ],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // A ponte é chamada explicitamente apenas no APK/AAB; o site mantém fetch.
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
