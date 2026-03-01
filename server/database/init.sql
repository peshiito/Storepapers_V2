-- =====================================
-- BASE TIENDA - INIT
-- PostgreSQL
-- =====================================

-- =====================
-- TABLA USUARIOS
-- =====================
CREATE TABLE usuarios (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dni VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(150),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- TABLA PRODUCTOS
-- =====================
CREATE TABLE productos (
    id VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50),
    gramaje INT,
    hojas INT,
    precio_unitario DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    imagen VARCHAR(255)
);

-- =====================
-- TABLA VENTAS
-- =====================
CREATE TABLE ventas (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INT NOT NULL,
    productos TEXT NOT NULL,          -- formato: A1x2,A2x1
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente',
    metodo_pago VARCHAR(30),
    lugar_entrega VARCHAR(50),
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega DATE,

    CONSTRAINT fk_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
);