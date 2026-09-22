# Roadmap

- [x] Corrigir "spawn npx ENOENT" no Windows: shell:true em scripts/build-app-shell.mjs + fallback de montagem estática da casca (sem subprocesso).
- [x] Priorizar `visitasc.com.br` diretamente no aplicativo e validar o fallback de conexão da versão 4.1.3.
- [x] Corrigir o CORS real das server functions, validar a origem antes do login e publicar a correção Android 4.1.4.
- [x] Sonda de conexão resistente a redirecionamento 302 (redirect: manual), versão 4.1.5 (versionCode 8).
- [x] Normalizar identificadores das funções entre Windows/Linux e bloquear pacotes Android incompatíveis.
- [x] Remover a dependência de CORS do WebView usando HTTPS nativo no APK/AAB 4.2.2.
- [ ] (usuário) Remover domínio principal em Project Settings → Domains para ativar as 3 contingências reais.
- [ ] (usuário) Abrir chamado no suporte Lovable sobre falha regional de acesso a *.lovable.app.
- [x] Aplicar melhorias bíblicas ao esboço e à Tela Cheia, incluindo inserção direta do texto na nota.
- [x] Detectar citações bíblicas por bloco (parágrafo/lista), corrigindo links e avisos de referência com erro nos modos Esboço e Tela Cheia; completar abreviações 1Te/2Te/1Thess/2Thess.
