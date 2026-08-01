#!/usr/bin/env node
/**
 * Verifica com qual chave o AAB/APK de release foi assinado.
 *
 * Uso:
 *   npm run android:verify:signature
 *   npm run android:verify:signature -- <caminho-do-aab-ou-apk>
 *
 * Compare o SHA-256 impresso com o fingerprint da sua chave de upload
 * registrada na Play Console. Se nao baterem, o upload sera recusado com
 * "O APK enviado tem uma assinatura diferente".
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_HINT =
  'Compare com o fingerprint da chave de upload na Play Console\n' +
  '  (Configuracao > Integridade do app > Certificado da chave de upload).';

const DEFAULT_CANDIDATES = [
  'android/app/build/outputs/bundle/release/app-release.aab',
  'android/app/build/outputs/apk/release/app-release.apk',
];

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const explicit = process.argv[2];
const candidates = explicit ? [explicit] : DEFAULT_CANDIDATES;
const target = candidates.map((p) => resolve(process.cwd(), p)).find((p) => existsSync(p));

if (!target) {
  fail(
    'Nenhum artefato de release encontrado.\n' +
      '   Procurado em:\n' +
      DEFAULT_CANDIDATES.map((p) => `     - ${p}`).join('\n') +
      '\n\n   Gere primeiro com: npm run android:release:aab',
  );
}

let output;
try {
  output = execFileSync('keytool', ['-printcert', '-jarfile', target], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  const stderr = String(error?.stderr ?? '');
  if (/not found|ENOENT/i.test(String(error?.message)) && !stderr) {
    fail('O comando "keytool" nao foi encontrado. Instale o JDK 17 (vem com o Android Studio).');
  }
  fail(`Falha ao ler a assinatura de ${target}\n\n${stderr || error?.message}`);
}

const sha256 = output.match(/SHA256:\s*([A-F0-9:]+)/i)?.[1];
const signedBy = output.match(/Owner:\s*(.+)/)?.[1]?.trim();
const isDebugKey = /CN=Android Debug/i.test(output);

console.log(`\nArtefato: ${target}`);
if (signedBy) console.log(`Assinado por: ${signedBy}`);
console.log(`\nSHA-256: ${sha256 ?? '(nao identificado)'}\n`);

if (isDebugKey) {
  fail(
    'Este artefato esta assinado com a CHAVE DE DEBUG.\n' +
      '   A Play Console vai recusar com "assinatura diferente".\n\n' +
      '   Crie android/keystore.properties com a sua keystore de upload\n' +
      '   e gere novamente com: npm run android:release:aab',
  );
}

console.log(`✅ Artefato assinado com uma chave de release.\n   ${EXPECTED_HINT}\n`);
