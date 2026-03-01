import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// IMPORTANTE: Cargar variables de entorno inmediatamente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validación explícita
if (!supabaseUrl) {
  console.error("❌ Error: SUPABASE_URL no está definida en el archivo .env");
  console.error("📁 Valor actual:", supabaseUrl);
  process.exit(1);
}

if (!supabaseKey) {
  console.error(
    "❌ Error: SUPABASE_SERVICE_ROLE_KEY no está definida en el archivo .env",
  );
  console.error("🔑 Valor actual:", supabaseKey ? "definida" : "no definida");
  process.exit(1);
}

console.log("✅ Supabase configurado correctamente");
console.log("📌 URL:", supabaseUrl.substring(0, 20) + "...");

// Crear y exportar el cliente
export const supabase = createClient(supabaseUrl, supabaseKey);
