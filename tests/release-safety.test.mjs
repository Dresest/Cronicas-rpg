import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('Vercel ejecuta guardia de producción en el build',()=>{
  const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(vercel.buildCommand,'npm run build:production');
  assert.match(pkg.scripts['build:production'],/check-release-safety/);
});
test('sin aprobación explícita, la verificación bloquea el despliegue',()=>{
  const env={...process.env};
  delete env.RPG_RELEASE_APPROVED;
  const result=spawnSync(process.execPath,['scripts/check-release-safety.mjs'],{encoding:'utf8',env});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/BLOQUEADO/);
});

test('una publicación aprobada no puede perder la IA por variables incompletas',()=>{
  const env={...process.env,RPG_RELEASE_APPROVED:'true'};
  delete env.AI_GENERATION_ENABLED;
  delete env.VITE_AI_GENERATION_ENABLED;
  const result=spawnSync(process.execPath,['scripts/check-release-safety.mjs'],{encoding:'utf8',env});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/interfaz y la API/);
});
