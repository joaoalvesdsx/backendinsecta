import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { userRepository } from "../repositories/UserRepository";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

dotenv.config();

export async function generatePasswordResetToken(
  email: string
): Promise<string> {
  const user = await userRepository.findOneBy({ email });
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const resetToken = uuidv4();
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 1); // Define a expiração para 1 hora

  // Atualiza o usuário com o token de redefinição e a data de expiração
  user.reset_token = resetToken;
  user.reset_token_expiration = expiration;
  await userRepository.save(user);

  return resetToken;
}

export async function authenticateUser(email: string, senha: string) {
  // Buscar o usuário no banco de dados, explicitamente selecionando campos com select:false (senha, tipo)
  console.log(
    "[authService] authenticateUser - buscando usuário com email:",
    email
  );
  const user = await userRepository
    .createQueryBuilder("user")
    .addSelect(["user.senha", "user.tipo"]) // 'tipo' tem select:false na entidade
    .where("user.email = :email", { email })
    .getOne();

  if (!user) {
    console.log(
      "[authService] authenticateUser - usuário NÃO encontrado para email:",
      email
    );
    throw new Error("Usuário não encontrado.");
  }

  //  Verificar a senha (não logar a senha em texto claro)
  const isPasswordValid = await bcrypt.compare(senha, user.senha);

  if (!isPasswordValid) {
    console.log(
      "[authService] authenticateUser - senha inválida para user_id:",
      user.user_id,
      "email:",
      user.email
    );
    throw new Error("Senha incorreta.");
  }

  console.log(
    "[authService] authenticateUser - autenticação bem-sucedida para user_id:",
    user.user_id,
    "email:",
    user.email
  );
  const { senha: _, ...userWithoutPassword } = user; // Desestruturação para remover a propriedade 'senha'

  return userWithoutPassword; // Retorna o usuário SEM o hash da senha
}

export function generateTokenJWT(user: {
  user_id?: number;
  tipo?: string;
  email?: string;
  nome_completo?: string;
}) {
  const payload = {
    user_id: user.user_id,
    tipo: user.tipo, // manter consistência com middleware e tipos
    email: user.email,
    nome_completo: user.nome_completo,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não está configurado");
  }

  return jwt.sign(payload, secret, { expiresIn: "8h" } as jwt.SignOptions);
}
