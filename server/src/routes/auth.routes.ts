import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/superbase";

const router = express.Router();
const JWT_SECRET =
  process.env.JWT_SECRET || "tu_secreto_super_seguro_cambiar_en_produccion";

// Login de admin
router.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son requeridos" });
    }

    // Buscar admin en Supabase
    const { data: admin, error } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .eq("activo", true)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, admin.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Actualizar último acceso
    await supabase
      .from("admins")
      .update({ ultimo_acceso: new Date() })
      .eq("id", admin.id);

    // Generar token (expira en 8 horas)
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        nombre: admin.nombre_completo,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        nombre: admin.nombre_completo,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Verificar token (útil para el dashboard)
router.get("/api/admin/verificar", verificarToken, (req: AuthRequest, res) => {
  res.json({
    valido: true,
    admin: req.admin,
  });
});

export default router;
