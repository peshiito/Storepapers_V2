import express from "express";
import { supabase } from "../config/superbase";
import { verificarToken, AuthRequest } from "../middleware/auth.middleware";

const router = express.Router();

// Obtener todas las ventas (solo admin)
router.get(
  "/api/admin/ventas",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { estado, fecha } = req.query;

      let query = supabase
        .from("ventas")
        .select(
          `
                *,
                usuarios (
                    nombre_completo,
                    dni,
                    telefono,
                    email
                )
            `,
        )
        .order("fecha_venta", { ascending: false });

      // Filtros opcionales
      if (estado) {
        query = query.eq("estado", estado);
      }
      if (fecha) {
        query = query.gte("fecha_venta", fecha);
      }

      const { data, error } = await query;

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  },
);

// Obtener venta por ID (solo admin)
router.get(
  "/api/admin/ventas/:id",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("ventas")
        .select(
          `
                *,
                usuarios (
                    nombre_completo,
                    dni,
                    telefono,
                    email,
                    direccion
                )
            `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(404).json({ error: "Venta no encontrada" });
    }
  },
);

// Crear nueva venta (desde el dashboard o frontend de ventas)
router.post("/api/ventas", async (req, res) => {
  try {
    const { usuario_id, productos, descripcion, metodo_pago, lugar_entrega } =
      req.body;

    if (!usuario_id || !productos) {
      return res
        .status(400)
        .json({ error: "usuario_id y productos son requeridos" });
    }

    const { data, error } = await supabase
      .from("ventas")
      .insert([
        {
          usuario_id,
          productos,
          descripcion,
          metodo_pago,
          lugar_entrega,
          estado: "pendiente",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al crear venta" });
  }
});

// Actualizar estado de venta (solo admin)
router.patch(
  "/api/admin/ventas/:id/estado",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      const estadosValidos = ["pendiente", "pagado", "entregado", "cancelado"];

      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: "Estado no válido" });
      }

      const { data, error } = await supabase
        .from("ventas")
        .update({ estado })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar estado" });
    }
  },
);

// Actualizar venta completa (solo admin)
router.put(
  "/api/admin/ventas/:id",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // No permitir actualizar ciertos campos
      delete updates.id;
      delete updates.fecha_venta;

      const { data, error } = await supabase
        .from("ventas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar venta" });
    }
  },
);

// Obtener ventas por estado (solo admin)
router.get(
  "/api/admin/ventas/estado/:estado",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { estado } = req.params;

      const { data, error } = await supabase
        .from("ventas")
        .select(
          `
                *,
                usuarios (
                    nombre_completo,
                    telefono
                )
            `,
        )
        .eq("estado", estado)
        .order("fecha_venta", { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  },
);

export default router;
