import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// =====================================
// CONFIGURACIÓN INICIAL (LO PRIMERO SIEMPRE)
// =====================================
dotenv.config();

// Verificar variables de entorno críticas
console.log("🚀 Iniciando servidor...");
console.log("📁 Puerto:", process.env.PORT || 3000);
console.log(
  "📡 Supabase URL:",
  process.env.SUPABASE_URL ? "✅ Configurada" : "❌ No configurada",
);
console.log(
  "🔑 Supabase Key:",
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "✅ Configurada"
    : "❌ No configurada",
);

// =====================================
// IMPORTACIONES
// =====================================
import { supabase } from "./config/superbase";
import { verificarToken } from "./middleware/auth.middleware";

// =====================================
// INICIALIZACIÓN DE EXPRESS
// =====================================
const app = express();
const port = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// =====================================
// RUTAS PÚBLICAS (NO REQUIEREN TOKEN)
// =====================================

// Health check y prueba de conexión
app.get("/api/test", async (req, res) => {
  try {
    const { error } = await supabase
      .from("usuarios")
      .select("count", { count: "exact", head: true });

    if (error) throw error;

    res.json({
      success: true,
      message: "✅ Conexión exitosa con Supabase",
      db_status: "conectado",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en test de conexión:", error);
    res.status(500).json({
      success: false,
      message: "❌ Error de conexión con Supabase",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

// =====================================
// RUTAS DE PRODUCTOS (PÚBLICAS)
// =====================================

// Obtener todos los productos
app.get("/api/productos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre");

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Obtener un producto por ID
app.get("/api/productos/:id", async (req, res) => {
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

// =====================================
// RUTAS DE USUARIOS (PÚBLICAS)
// =====================================

// Crear nuevo usuario (registro de clientes)
app.post("/api/usuarios", async (req, res) => {
  try {
    const { dni, nombre_completo, telefono, email } = req.body;

    // Validaciones
    if (!dni || !nombre_completo) {
      return res.status(400).json({ error: "DNI y nombre son requeridos" });
    }

    if (dni.length < 5) {
      return res.status(400).json({ error: "DNI inválido" });
    }

    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          dni,
          nombre_completo,
          telefono: telefono || null,
          email: email || null,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "El DNI ya está registrado" });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// Obtener usuario por DNI
app.get("/api/usuarios/:dni", async (req, res) => {
  try {
    const { dni } = req.params;

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("dni", dni)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

// =====================================
// RUTAS DE VENTAS (PÚBLICAS - PARA CLIENTES)
// =====================================

// Crear nueva venta
app.post("/api/ventas", async (req, res) => {
  try {
    const { usuario_id, productos, descripcion, metodo_pago, lugar_entrega } =
      req.body;

    // Validaciones
    if (!usuario_id || !productos) {
      return res
        .status(400)
        .json({ error: "usuario_id y productos son requeridos" });
    }

    // Verificar que el usuario existe
    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", usuario_id)
      .single();

    if (errorUsuario || !usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const { data, error } = await supabase
      .from("ventas")
      .insert([
        {
          usuario_id,
          productos,
          descripcion: descripcion || null,
          metodo_pago: metodo_pago || null,
          lugar_entrega: lugar_entrega || null,
          estado: "pendiente",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error("Error al crear venta:", error);
    res.status(500).json({ error: "Error al crear venta" });
  }
});

// Obtener ventas de un usuario específico
app.get("/api/usuarios/:usuario_id/ventas", async (req, res) => {
  try {
    const { usuario_id } = req.params;

    const { data, error } = await supabase
      .from("ventas")
      .select(
        `
        *,
        usuarios (
          nombre_completo,
          dni,
          telefono
        )
      `,
      )
      .eq("usuario_id", usuario_id)
      .order("fecha_venta", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error al obtener ventas del usuario:", error);
    res.status(500).json({ error: "Error al obtener ventas" });
  }
});

// =====================================
// RUTAS DE ADMIN (PROTEGIDAS CON TOKEN)
// =====================================

// -------------------------
// Autenticación de Admin
// -------------------------

// Login de admin
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Importar bcrypt y jwt aquí para evitar problemas de carga circular
    const bcrypt = require("bcryptjs");
    const jwt = require("jsonwebtoken");

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

    // Generar token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        nombre: admin.nombre_completo,
      },
      process.env.JWT_SECRET || "tu_secreto_super_seguro",
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
app.get("/api/admin/verificar", verificarToken, (req: any, res) => {
  res.json({
    valido: true,
    admin: req.admin,
  });
});

// -------------------------
// Gestión de Productos (Admin)
// -------------------------

// Crear nuevo producto
app.post("/api/admin/productos", verificarToken, async (req: any, res) => {
  try {
    const { id, nombre, tipo, gramaje, hojas, precio_unitario, stock, imagen } =
      req.body;

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
          tipo: tipo || null,
          gramaje: gramaje || null,
          hojas: hojas || null,
          precio_unitario,
          stock: stock || 0,
          imagen: imagen || null,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(400)
          .json({ error: "Ya existe un producto con ese ID" });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// Actualizar producto
app.put("/api/admin/productos/:id", verificarToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id; // No permitir cambiar el ID

    const { data, error } = await supabase
      .from("productos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// Actualizar stock
app.patch(
  "/api/admin/productos/:id/stock",
  verificarToken,
  async (req: any, res) => {
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
      console.error("Error al actualizar stock:", error);
      res.status(500).json({ error: "Error al actualizar stock" });
    }
  },
);

// Eliminar producto
app.delete(
  "/api/admin/productos/:id",
  verificarToken,
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase.from("productos").delete().eq("id", id);

      if (error) throw error;
      res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      res.status(500).json({ error: "Error al eliminar producto" });
    }
  },
);

// -------------------------
// Gestión de Ventas (Admin)
// -------------------------

// Obtener todas las ventas
app.get("/api/admin/ventas", verificarToken, async (req: any, res) => {
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
    console.error("Error al obtener ventas:", error);
    res.status(500).json({ error: "Error al obtener ventas" });
  }
});

// Obtener venta por ID
app.get("/api/admin/ventas/:id", verificarToken, async (req: any, res) => {
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
          email
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
});

// Obtener ventas por estado
app.get(
  "/api/admin/ventas/estado/:estado",
  verificarToken,
  async (req: any, res) => {
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
      console.error("Error al obtener ventas por estado:", error);
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  },
);

// Actualizar estado de venta
app.patch(
  "/api/admin/ventas/:id/estado",
  verificarToken,
  async (req: any, res) => {
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
      console.error("Error al actualizar estado:", error);
      res.status(500).json({ error: "Error al actualizar estado" });
    }
  },
);

// Actualizar venta completa
app.put("/api/admin/ventas/:id", verificarToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

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
    console.error("Error al actualizar venta:", error);
    res.status(500).json({ error: "Error al actualizar venta" });
  }
});

// -------------------------
// Gestión de Usuarios (Admin)
// -------------------------

// Obtener todos los usuarios
app.get("/api/admin/usuarios", verificarToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("fecha_registro", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Obtener usuario por ID
app.get("/api/admin/usuarios/:id", verificarToken, async (req: any, res) => {
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
});

// Obtener ventas de un usuario específico
app.get(
  "/api/admin/usuarios/:id/ventas",
  verificarToken,
  async (req: any, res) => {
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
      console.error("Error al obtener ventas del usuario:", error);
      res.status(500).json({ error: "Error al obtener ventas del usuario" });
    }
  },
);

// =====================================
// MIDDLEWARE DE ERRORES 404 (CORREGIDO - SIN EL *)
// =====================================
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// =====================================
// INICIAR SERVIDOR
// =====================================
app.listen(port, () => {
  console.log(`\n=================================`);
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(
    `📡 Conectado a Supabase: ${process.env.SUPABASE_URL ? "✅" : "❌"}`,
  );
  console.log(`🔐 Rutas de admin protegidas con JWT`);
  console.log(`=================================\n`);
});
