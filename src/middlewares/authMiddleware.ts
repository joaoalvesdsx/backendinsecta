import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IGetUserAuthInfoRequest, UserPayload } from "../types/user";

dotenv.config();

export function authenticateJWT(
  req: IGetUserAuthInfoRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token não fornecido ou mal formatado" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET não configurado nas variáveis de ambiente");
    }

    const decoded = jwt.verify(token, secret);

    req.user = decoded as UserPayload; // Anexa o payload do usuário no objeto req

    next(); // Prossegue para o próximo middleware ou rota
  } catch (error) {
    res.status(403).json({
      message: "Token inválido ou expirado",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

// Autorização por tipo de usuário
export function authorizeRoles(...allowedRoles: string[]) {
  return (req: IGetUserAuthInfoRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(403)
        .json({ message: "Acesso negado. Usuário não autenticado." });
    }
    const userRole = req.user.tipo;

    if (!allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Acesso negado. Permissão insuficiente." });
    }

    next();
  };
}

// Middleware específico para Admin
export function authorizeAdmin(
  req: IGetUserAuthInfoRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res
      .status(401)
      .json({ message: "Acesso negado. Usuário não autenticado." });
    return;
  }

  if (req.user.tipo !== "Admin") {
    res.status(403).json({ message: "Acesso negado. Permissão insuficiente." });
    return;
  }

  next();
}
