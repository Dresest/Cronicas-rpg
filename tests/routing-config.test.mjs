import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("el cron conserva la frecuencia de producción", () => {
  assert.deepEqual(config.crons, [
    { path: "/api/database-health", schedule: "0 9 * * 0" }
  ]);
});

test("el fallback SPA no intercepta funciones API ni archivos estáticos", () => {
  assert.equal(config.rewrites.length, 1);
  const { source, destination } = config.rewrites[0];
  assert.equal(destination, "/index.html");
  const matcher = new RegExp("^" + source + "$");
  assert.equal(matcher.test("/api/database-health"), false);
  assert.equal(matcher.test("/api/generate-item"), false);
  assert.equal(matcher.test("/api/generate-rpg"), false);
  assert.equal(matcher.test("/assets/index.js"), false);
  assert.equal(matcher.test("/inventario"), true);
  assert.equal(matcher.test("/personajes/1"), true);
});
