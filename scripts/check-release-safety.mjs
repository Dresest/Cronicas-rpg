// Puerta de seguridad para evitar un despliegue incompleto.
// Este comando debe ejecutarse antes de habilitar despliegues desde GitHub.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "api/database-health.js",
  "api/generate-item.js",
  "api/generate-rpg.js",
  "vercel.json",
  "src/App.tsx",
];
const missing = required.filter(path => !existsSync(resolve(process.cwd(), path)));
if (missing.length > 0) {
  console.error("BLOQUEADO: faltan módulos de producción en el repositorio:");
  for (const path of missing) console.error("  - " + path);
  console.error("No desplegar este código sobre Crónicas RPG.");
  process.exitCode = 1;
} else {
  console.log("Los archivos requeridos existen. Aun debes ejecutar pruebas funcionales antes de producción.");
}
