// Alias de compatibilidad para clientes antiguos; comparte autenticación y cuotas.
import { generate } from './lib/generator-core.js';
export default function handler(req,res){ return generate(req,res,'item'); }
