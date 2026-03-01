import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "tu_secreto_super_seguro";

export interface AuthRequest extends Request {
  admin?: {
    id: number;
    nombre: string;
    email: string;
  };
}

export const verificarToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.admin = {
      id: decoded.id,
      nombre: decoded.nombre,
      email: decoded.email,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};
