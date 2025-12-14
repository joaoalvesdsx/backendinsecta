import { Request, Response } from "express";
import { IGetUserAuthInfoRequest } from "../types/user";
import {
  createUser,
  deleteUser,
  findAllUsers,
  findByEmail,
  findUserById,
  updateUser,
  updateUserSenha,
  updateUserTipo,
  userRepository,
} from "../repositories/UserRepository";
import bcrypt from "bcryptjs";
export class UserController {
  // Criar um novo usuário
  async create(req: Request, res: Response) {
    const userData = req.body;

    try {
      // Chamar a função para criar o usuário, que hasheia a senha internamente
      const newUser = await createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao criar o usuário." });
    }
  }

  // Buscar todos os usuários
  async getAll(req: Request, res: Response) {
    try {
      const users = await findAllUsers();
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar os usuários." });
    }
  }

  // Buscar um usuário pelo ID
  async getById(req: Request, res: Response) {
    const userId = parseInt(req.params.user_id); // Obtendo o user_id da rota

    try {
      const user = await findUserById(userId);
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar o usuário." });
    }
  }

  // Buscar um usuário pelo e-mail
  async getByUserEmail(req: Request, res: Response) {
    const { email } = req.body;
    console.log(email);
    try {
      const user = await findByEmail(email); // Chama a função de busca pelo e-mail
      console.log(email);
      return res.json(email);
    } catch (error) {
      return res
        .status(404)
        .json({ message: "Erro ao buscar o Usuario", email });
    }
  }

  // Atualizar informações de um usuário

  async update(req: Request, res: Response) {
    const userId = parseInt(req.params.user_id);
    const userData = req.body;

    try {
      const updatedUser = await updateUser(userId, userData);
      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao atualizar o usuário." });
    }
  }

  // Atualizar o tipo de um usuário
  async updateTipo(req: Request, res: Response) {
    const userId = parseInt(req.params.user_id);
    const tipo = req.body.tipo;

    try {
      const updatedUser = await updateUserTipo(userId, tipo);
      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao atualizar o tipo do usuário." });
    }
  }

  // Atualizar a senha
  async updateSenha(req: Request, res: Response) {
    const userId = parseInt(req.params.user_id);
    const { senhaAtual, novaSenha } = req.body;

    try {
      // Verificar se a senha atual e a nova senha foram fornecidas
      if (!senhaAtual || !novaSenha) {
        return res
          .status(400)
          .json({ message: "Faltaram dados para atualizar a senha" });
      }

      const user = await userRepository.findOneBy({ user_id: userId });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      // Comparar a senha atual com o hash armazenado no banco
      const isMatch = await bcrypt.compare(senhaAtual, user.senha);
      if (!isMatch) {
        return res.status(400).json({ message: "Senha atual incorreta." });
      }

      // Atualizar a senha
      const updatedUser = await updateUserSenha(userId, novaSenha);
      res.json({ message: "Senha atualizada com sucesso.", user: updatedUser });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Erro ao atualizar a senha do usuário." });
    }
  }

  // Deletar um usuário pelo ID
  async deleteById(req: IGetUserAuthInfoRequest, res: Response) {
    const userId = parseInt(req.params.user_id);
    try {
      const targetUser = await findUserById(userId);

      // Verificar autenticação
      const requester = req.user;
      if (!requester) {
        return res.status(401).json({ message: "Usuário não autenticado." });
      }

      const isAdmin = requester.tipo === "Admin";
      const isSelf = requester.user_id === userId;

      if (!isAdmin && !isSelf) {
        return res
          .status(403)
          .json({
            message:
              "Ação negada. Apenas administrador ou o próprio usuário pode deletar a conta.",
          });
      }

      await deleteUser(userId);
      res.json({ message: "Usuário deletado com sucesso.", user: targetUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao deletar o usuário." });
    }
  }
}
