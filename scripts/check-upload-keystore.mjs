#!/usr/bin/env node
/**
 * Confere se uma keystore local corresponde ao certificado de upload esperado.
 * A senha e o alias sao solicitados pelo proprio keytool e nunca passam pelo script.
 *
 * Uso:
 *   npm run android:check:keystore -- caminho/para/chave.keystore
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_SHA256 =
  '2C:EA:E9:A9:3E:7E:70:29:DE:95:94:BB:9C:20:69:EC:5B:9D:44:95:0B:83:51:B6:6B:8C:16:0C:67:A9:61:CA';

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const suppliedPath = process.argv[2];
if (!suppliedPath) {
  fail(
    'Informe o caminho da keystore.\n' +
      '   Exemplo: npm run android:check:keystore -- ~/Downloads/minha-chave.keystore',
  );
}

const keystorePath = resolve(process.cwd(), suppliedPath);
if (!existsSync(keystorePath)) {
  fail(`Arquivo nao encontrado: ${keystorePath}`);
}

let output;
try {
  output = execFileSync('keytool', ['-list', '-v', '-keystore', keystorePath], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });
} catch (error) {
  if (/not found|ENOENT/i.test(String(error?.message))) {
    fail('O comando "keytool" nao foi encontrado. Instale o JDK 17 (incluido no Android Studio).');
  }
  fail('Nao foi possivel ler a keystore. Confira a senha e tente novamente.');
}

const fingerprints = [...output.matchAll(/SHA256:\s*([A-F0-9:]+)/gi)].map((match) =>
  match[1].toUpperCase(),
);

if (fingerprints.length === 0) {
  fail('Nenhum certificado SHA-256 foi encontrado nessa keystore.');
}

console.log('\nFingerprints encontrados:');
for (const fingerprint of fingerprints) console.log(`  ${fingerprint}`);

if (!fingerprints.includes(EXPECTED_SHA256)) {
  fail(
    'Esta keystore NAO corresponde a chave de upload registrada.\n' +
      `   Esperado: ${EXPECTED_SHA256}\n\n` +
      '   Nao gere o AAB com este arquivo. Solicite a redefinicao da chave de upload na Play Console.',
  );
}

console.log('\n✅ Keystore correta: o certificado corresponde a chave de upload registrada.\n');