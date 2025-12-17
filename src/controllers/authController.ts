import { Request, Response } from "express";
import {
  authenticateUser,
  generateTokenJWT,
  generatePasswordResetToken,
} from "../services/authService";
import { createUser, userRepository } from "../repositories/UserRepository";
import { EmailService } from "../services/emailService";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
export class AuthController {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body;
    console.log(
      "[AuthController] login - recebido login request for email:",
      email
    );
    try {
      // Verificar se os campos necessários foram fornecidos
      if (!email || !senha) {
        console.log("[AuthController] login - faltando email ou senha");
        return res
          .status(400)
          .json({ message: "E-mail e senha são obrigatórios." });
      }

      // Autenticar o usuário
      console.log("[AuthController] login - chamando authenticateUser");
      const user = await authenticateUser(email, senha);
      console.log(
        "[AuthController] login - authenticateUser retornou user_id:",
        user?.user_id,
        "ativo:",
        user?.ativo,
        "tipo:",
        user?.tipo
      );

      // Garantir que o user_id esteja definido
      if (!user.user_id) {
        console.log(
          "[AuthController] login - user_id indefinido no usuário retornado"
        );
        return res
          .status(500)
          .json({ message: "Erro interno: ID do usuário não encontrado." });
      }

      //  Verificar se o e-mail foi confirmado (TEMPORARIAMENTE DESABILITADO)
      // if (!user.ativo) {
      //   console.log(
      //     "[AuthController] login - tentativa de login com conta não verificada. user_id:",
      //     user.user_id
      //   );
      //   return res.status(403).json({
      //     message:
      //       "Conta não verificada. Verifique seu e-mail antes de fazer login.",
      //   });
      // }

      const userPayload = {
        user_id: user.user_id,
        email: user.email,
        tipo: user.tipo,
        nome_completo: user.nome_completo,
      };

      console.log(
        "[AuthController] login - preparando token para user_id:",
        user.user_id
      );
      // Gerar o token JWT
      // Passar o objeto user completo (sem senha) para que todos os campos entrem no JWT
      const token = generateTokenJWT(user);

      console.log(
        "[AuthController] login - token gerado para user_id:",
        user.user_id
      );
      // Retornar o token para o cliente
      res.json({ message: "Login bem-sucedido", token, user: userPayload });
    } catch (error) {
      console.error("[AuthController] login - erro ao autenticar:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    const { email } = req.body;

    try {
      // Verificar se o e-mail foi fornecido
      if (!email) {
        return res.status(400).json({ message: "E-mail é obrigatório." });
      }

      // Buscar o usuário pelo e-mail
      const user = await userRepository.findOneBy({ email });

      if (!user) {
        return res.status(404).json({ message: "E-mail não encontrado." });
      }

      // Gerar um token único para redefinição de senha com validade de 1 hora
      const resetToken = await generatePasswordResetToken(user.email);

      // Criar o link para redefinição de senha
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      console.log(resetLink);

      // Responder ao cliente IMEDIATAMENTE
      res
        .status(200)
        .json({ message: "E-mail de recuperação enviado com sucesso." });

      // Enviar e-mail de recuperação de senha em background (sem await)
      const emailService = new EmailService();
      emailService.sendPasswordResetEmail(email, resetLink).catch((error) => {
        console.error("Erro ao enviar e-mail de recuperação:", error);
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Erro ao solicitar recuperação de senha." });
    }
  }

  async resetPassword(req: Request, res: Response) {
    const { token } = req.query;
    const { novaSenha, novaSenhaConfirmacao } = req.body;

    try {
      // Verificar se o token foi fornecido
      if (!token || !novaSenha) {
        return res
          .status(400)
          .json({ message: "Token e nova senha são obrigatórios." });
      }

      // Verificar se as senhas são iguais
      if (novaSenha !== novaSenhaConfirmacao) {
        return res.status(400).json({ message: "Senhas não coincidem." });
      }

      // Encontrar o usuário pelo token
      const user = await userRepository.findOneBy({
        reset_token: token as string,
      });

      if (!user) {
        return res.status(404).json({ message: "Token inválido ou expirado." });
      }

      // Verificar se o token ainda é válido
      if (
        !user.reset_token_expiration ||
        user.reset_token_expiration < new Date()
      ) {
        return res.status(400).json({ message: "Token expirado." });
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(novaSenha, 10);

      // Atualizar a senha do usuário
      user.senha = hashedPassword;
      if (user.reset_token) delete user.reset_token;
      if (user.reset_token_expiration) delete user.reset_token_expiration;
      console.log("Tokens", user.reset_token_expiration, user.reset_token);
      await userRepository.save(user);

      res.json({ message: "Senha redefinida com sucesso." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao redefinir senha." });
    }
  }
  // Registrar um novo usuário
  async register(req: Request, res: Response) {
    const { nome_completo, email, senha, telefone } = req.body;
    const userData = {
      nome_completo,
      telefone,
      email,
      senha,
      ativo: true, // TEMPORARIAMENTE: ativando contas automaticamente
      // email_verification_token: uuidv4(),
      // email_verification_expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    };

    try {
      if (!nome_completo || !email || !senha) {
        return res
          .status(400)
          .json({ message: "Nome, e-mail e senha são obrigatórios." });
      }

      // Verifica se já existe um usuário com esse e-mail
      const existingUser = await userRepository.findOneBy({ email });
      if (existingUser) {
        return res.status(400).json({ message: "E-mail já está em uso." });
      }

      // Criação do usuário (TEMPORARIAMENTE sem verificação de email)
      const newUser = await createUser(userData);

      await userRepository.save(newUser);

      // TEMPORARIAMENTE DESABILITADO: Enviar e-mail de verificação
      // const emailService = new EmailService();
      // await emailService.sendVerificationEmail(
      //   email,
      //   newUser.email_verification_token
      // );

      return res.status(201).json({
        message: "Usuário criado com sucesso! Você já pode fazer login.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro ao registrar usuário." });
    }
  }

  // Verificar o e-mail do usuário
  async verificarEmail(req: Request, res: Response) {
    const { token } = req.query;

    try {
      if (!token) {
        return res
          .status(400)
          .json({ message: "Token de verificação ausente." });
      }
      // Encontrar o usuário pelo token
      const user = await userRepository.findOneBy({
        email_verification_token: token as string,
      });

      if (!user) {
        return res.status(404).json({ message: "Token inválido." });
      }
      // Verificar se o token ainda é válido
      if (
        !user.email_verification_expires ||
        user.email_verification_expires < new Date()
      ) {
        return res.status(400).json({ message: "Token expirado." });
      }
      // Ativar a conta do usuário
      user.ativo = true;
      user.email_verification_token = "";
      await userRepository.save(user);

      return res
        .status(200)
        .json({ message: "E-mail verificado com sucesso. Conta ativada!" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro ao verificar e-mail." });
    }
  }
}
