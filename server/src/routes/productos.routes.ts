import express from "express";
import { supabase } from "../config/superbase";
import { verificarToken, AuthRequest } from "../middleware/auth.middleware";

const router = express.Router();

// Obtener todos los productos (público - no requiere token)
router.get("/api/productos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre");

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Obtener producto por ID (público)
router.get("/api/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: "Producto no encontrado" });
  }
});

// Crear nuevo producto (solo admin)
router.post(
  "/api/admin/productos",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const {
        id,
        nombre,
        tipo,
        gramaje,
        hojas,
        precio_unitario,
        stock,
        imagen,
      } = req.body;

      // Validar campos requeridos
      if (!id || !nombre || !precio_unitario) {
        return res
          .status(400)
          .json({ error: "ID, nombre y precio son requeridos" });
      }

      const { data, error } = await supabase
        .from("productos")
        .insert([
          {
            id,
            nombre,
            tipo,
            gramaje,
            hojas,
            precio_unitario,
            stock: stock || 0,
            imagen,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Violación de unique
          return res
            .status(400)
            .json({ error: "Ya existe un producto con ese ID" });
        }
        throw error;
      }

      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al crear producto" });
    }
  },
);

// Actualizar producto (solo admin)
router.put(
  "/api/admin/productos/:id",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // No permitir actualizar el ID
      delete updates.id;

      const { data, error } = await supabase
        .from("productos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar producto" });
    }
  },
);

// Actualizar stock específicamente (solo admin)
router.patch(
  "/api/admin/productos/:id/stock",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { stock } = req.body;

      if (stock === undefined || stock < 0) {
        return res.status(400).json({ error: "Stock inválido" });
      }

      const { data, error } = await supabase
        .from("productos")
        .update({ stock })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar stock" });
    }
  },
);

// Eliminar producto (solo admin - OJO: considera mejor desactivar)
router.delete(
  "/api/admin/productos/:id",
  verificarToken,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase.from("productos").delete().eq("id", id);

      if (error) throw error;
      res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar producto" });
    }
  },
);

export default router;
