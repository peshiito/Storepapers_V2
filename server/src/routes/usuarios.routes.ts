import express from "express";
import { supabase } from "../config/superbase";
import { verificarToken, AuthRequest } from "../middleware/auth.middleware";

const router = express.Router();

// Obtener todos los usuarios (solo admin)
router.get(
  "/api/admin/usuarios",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("fecha_registro", { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  },
);

// Obtener usuario por ID (solo admin)
router.get(
  "/api/admin/usuarios/:id",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  },
);

// Obtener ventas de un usuario específico (solo admin)
router.get(
  "/api/admin/usuarios/:id/ventas",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("ventas")
        .select("*")
        .eq("usuario_id", id)
        .order("fecha_venta", { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas del usuario" });
    }
  },
);

export default router;
