import { AppDataSource } from "../ormconfig";
import { User } from "../entities/User";
import { Colaboracao } from "../entities/Colaboracao";
import { Imagem } from "../entities/Imagem";
import { Comentario } from "../entities/Comentario";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import cloudinary from "../config/cloudinaryConfig";

export const userRepository = AppDataSource.getRepository(User);

async function createUser(userData: Partial<User>) {
  if (userData.senha) {
    userData.senha = await bcrypt.hash(userData.senha, 10);
  }

  // Se não houver usuários, o primeiro criado é Admin
  const totalUsers = await userRepository.count();
  if (totalUsers === 0) {
    console.log("Primeiro usuário sendo criado — atribuindo role Admin");
    userData.tipo = "Admin";
  }

  const newUser = userRepository.create(userData);
  return await userRepository.save(newUser);
}

async function findAllUsers() {
  return await userRepository.find();
}

async function findUserById(id: number) {
  const user = await userRepository.findOneBy({ user_id: id });

  if (!user) {
    throw new Error(`Usuário com ID ${id} não encontrado`);
  }

  return user;
}

async function findByEmail(Email: string) {
  const user = await userRepository.findOneBy({ email: Email });
  if (!user) {
    throw new Error(`Usuário com e-mail ${Email} não encontrado`);
  }

  return user;
}

async function updateUserTipo(id: number, novoTipo: string) {
  const user = await findUserById(id);
  user.tipo = novoTipo;
  return await userRepository.save(user);
}

async function updateUserSenha(id: number, novaSenha: string) {
  const user = await findUserById(id);
  user.senha = await bcrypt.hash(novaSenha, 10);
  return await userRepository.save(user);
}

async function deleteUser(id: number) {
  const user = await findUserById(id);
  // Remover colaborações manualmente caso o onDelete ainda não esteja refletido no schema existente
  try {
    const colabRepo = AppDataSource.getRepository(Colaboracao);
    const colabs = await colabRepo.find({
      where: { user: { user_id: id } },
      relations: ["imagens", "comentarios"],
    });
    if (colabs.length) {
      // Remover filhos primeiro caso cascade não exista ainda no schema
      const imagemRepo = AppDataSource.getRepository(Imagem);
      const comentarioRepo = AppDataSource.getRepository(Comentario);
      for (const c of colabs) {
        if (c.imagens?.length) {
          // Deletar imagens do Cloudinary antes de remover do DB
          for (const img of c.imagens) {
            try {
              const publicId = img.url_imagem?.split("/").pop()?.split(".")[0];
              if (publicId)
                await cloudinary.uploader.destroy(`colaboracoes/${publicId}`);
            } catch (e) {
              console.error("Erro ao deletar imagem no Cloudinary:", e);
            }
          }
          await imagemRepo.remove(c.imagens as any);
        }
        if (c.comentarios?.length) await comentarioRepo.remove(c.comentarios);
      }
      await colabRepo.remove(colabs);
    }
  } catch (e) {
    // silencioso: se falhar não bloqueia delete, banco pode ter cascade
  }
  await userRepository.delete(id);
  return { message: `Usuário com ID ${id} foi deletado com sucesso` };
}

async function updateUser(id: number, updates: Partial<User>) {
  if (updates.senha) {
    delete updates.senha;
    delete updates.tipo;
  }
  const result = await userRepository.update(id, updates);
  if (result.affected === 0) {
    throw new Error(`Usuário com ID ${id} não encontrado`);
  }
  return await findUserById(id);
}

async function generateResetToken(email: string): Promise<string> {
  const user = await userRepository.findOneBy({ email });
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }
  const resetToken = uuidv4();
  const expiration = new Date(Date.now() + 60 * 60 * 1000);
  user.reset_token = resetToken;
  user.reset_token_expiration = expiration;
  await userRepository.save(user);
  return resetToken;
}

export {
  createUser,
  findAllUsers,
  findUserById,
  updateUserTipo,
  updateUserSenha,
  deleteUser,
  updateUser,
  generateResetToken,
  findByEmail,
};
