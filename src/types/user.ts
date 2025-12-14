import { Request } from "express";
export interface IGetUserAuthInfoRequest extends Request {
  user?: {
    user_id: number;
    email: string;
    tipo: string;
    nome_completo: string;
  };
}
export interface UserPayload {
  user_id: number;
  email: string;
  tipo: string;
  nome_completo: string;
}
