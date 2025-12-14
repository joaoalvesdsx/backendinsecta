import { AppDataSource } from "../ormconfig";
import { Comentario } from "../entities/Comentario";
import { colaboracaoRepository } from "./ColaboracaoRepository";
import { User } from "../entities/User";

export const comentarioRepository = AppDataSource.getRepository(Comentario);

async function findAllComentarios() {
  return await comentarioRepository.find();
}

async function createComentario(
  comentarioData: Partial<Comentario & { conteudo?: string }>,
  colaboracaoId: number,
  autorId?: number
) {
  const colaboracao = await colaboracaoRepository.findOneByOrFail({
    colaboracao_id: colaboracaoId,
  });

  // Normaliza campo de conteúdo vindo do front (conteudo) para a coluna 'comentario'
  const texto = (comentarioData as any).conteudo;
  if (!texto || !String(texto).trim()) {
    throw new Error("Conteúdo do comentário é obrigatório.");
  }

  let autor: User | undefined;
  if (autorId) {
    autor = (await AppDataSource.getRepository(User).findOne({
      where: { user_id: autorId },
    })) as any;
  }

  const novoComentario = comentarioRepository.create({
    assunto: comentarioData.assunto ?? null,
    conteudo: texto as any,
    colaboracao: colaboracao as any,
    autor: autor as any,
  } as any);
  return await comentarioRepository.save(novoComentario);
}

async function findComentarioById(id: number) {
  return await comentarioRepository.findOneBy({ comentario_id: id });
}

async function findComentariosByColaboracaoId(colaboracaoId: number) {
  return await comentarioRepository.find({
    where: { colaboracao: { colaboracao_id: colaboracaoId } },
    relations: ["colaboracao", "autor"],
    order: { created_at: "DESC" },
  });
}

async function updateComentario(
  id: number,
  comentarioData: Partial<Comentario & { conteudo?: string }>
) {
  const existing = await findComentarioById(id);
  if (!existing) return null;
  if (comentarioData.assunto !== undefined)
    existing.assunto = comentarioData.assunto!;
  if ((comentarioData as any).conteudo !== undefined) {
    const texto = (comentarioData as any).conteudo;
    if (!texto || !String(texto).trim()) {
      throw new Error("Conteúdo do comentário vazio.");
    }
    (existing as any).conteudo = texto as any;
  }
  return await comentarioRepository.save(existing);
}

async function deleteComentario(id: number) {
  return await comentarioRepository.delete(id);
}

export {
  findAllComentarios,
  createComentario,
  findComentarioById,
  updateComentario,
  deleteComentario,
  findComentariosByColaboracaoId,
};

// DTO Mapper
export function mapComentarioDTO(c: Comentario) {
  return {
    comentario_id: (c as any).comentario_id,
    assunto: (c as any).assunto ?? null,
    conteudo: (c as any).conteudo,
    colaboracao_id:
      (c as any).colaboracao?.colaboracao_id ?? (c as any).colaboracao_id,
    autor: c.autor
      ? {
          user_id: (c.autor as any).user_id,
          nome_completo: (c.autor as any).nome_completo,
        }
      : null,
    created_at: ((c as any).created_at as Date).toISOString(),
  };
}
