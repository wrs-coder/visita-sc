import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waorodrigues.visitasc',
  appName: 'Visita SC',
  webDir: 'dist',
  server: {
    // Aponta para o site publicado no Lovable (recomendado para apps com Supabase Auth).
    // Comente esta seção se quiser empacotar o conteúdo estático local (webDir).
    url: 'https://visita-sc.lovable.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
