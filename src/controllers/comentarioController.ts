import { Request, Response } from "express";
import {
  createComentario,
  deleteComentario,
  findAllComentarios,
  findComentarioById,
  findComentariosByColaboracaoId,
  updateComentario,
  mapComentarioDTO,
} from "../repositories/ComentarioRepository";
import { IGetUserAuthInfoRequest } from "../types/user";

export class ComentarioController {
  // Criar um novo comentário
  async create(req: IGetUserAuthInfoRequest, res: Response) {
    const { assunto, conteudo } = req.body;
    const colaboracaoId = parseInt(
      req.params.colaboracao_id || req.body.colaboracao_id
    );
    try {
      if (!conteudo || !String(conteudo).trim()) {
        return res.status(400).json({ error: "Conteúdo obrigatório." });
      }
      const autorId = req.user?.user_id;
      const newComentario: any = await createComentario(
        { assunto, conteudo } as any,
        colaboracaoId,
        autorId
      );
      res.status(201).json(mapComentarioDTO(newComentario));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao criar o comentário." });
    }
  }

  // Buscar todos os comentários
  async getAll(req: Request, res: Response) {
    try {
      const comentarios = await findAllComentarios();
      res.json(comentarios);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar os comentários." });
    }
  }

  // Buscar um comentário pelo ID
  async getById(req: Request, res: Response) {
    const comentarioId =
      req.body.comentario_id || parseInt(req.params.comment_id);

    try {
      const comentario = await findComentarioById(comentarioId);
      if (!comentario) {
        return res.status(404).json({ message: "Comentário não encontrado." });
      }
      res.json(comentario);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar o comentário." });
    }
  }
  // Buscar comentários por colaboraçãoID
  async getByColaboracaoId(req: Request, res: Response) {
    const colaboracaoId =
      req.body.colaboracao_id || parseInt(req.params.colaboracao_id);

    try {
      const comentarios = await findComentariosByColaboracaoId(colaboracaoId);
      if (comentarios.length === 0) {
        return res.status(404).json({
          message: "Nenhum comentário encontrado para esta colaboração.",
        });
      }
      res.json(comentarios.map(mapComentarioDTO));
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Erro ao buscar comentários por colaboração." });
    }
  }

  // Nova rota REST: GET /colaboracoes/:colaboracao_id/comentarios
  async getByColaboracaoIdRest(req: Request, res: Response) {
    const rawId = req.params.colaboracao_id || req.params.id;
    const colaboracaoId = Number(rawId);
    if (Number.isNaN(colaboracaoId)) {
      return res.status(400).json({ error: "colaboracao_id inválido" });
    }
    try {
      const comentarios = await findComentariosByColaboracaoId(colaboracaoId);
      // Sempre retorna array (mesmo vazio)
      return res.json(comentarios.map(mapComentarioDTO));
    } catch (error) {
      console.error("Erro listando comentários (REST)", { rawId, error });
      return res
        .status(500)
        .json({ error: "Erro ao buscar comentários da colaboração" });
    }
  }

  // Atualizar um comentário
  async update(req: Request, res: Response) {
    console.log(req.params);
    const comentarioId = parseInt(req.params.comment_id);
    const comentarioData = req.body;

    try {
      const updatedComentario = await updateComentario(
        comentarioId,
        comentarioData
      );
      if (!updatedComentario) {
        return res
          .status(404)
          .json({ message: "Comentário não encontrado para atualizar." });
      }
      res.json(updatedComentario);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao atualizar o comentário." });
    }
  }

  // Deletar um comentário pelo ID
  async deleteById(req: Request, res: Response) {
    const comentarioId = parseInt(req.params.comment_id);

    try {
      const comentario = await findComentarioById(comentarioId);
      if (!comentario) {
        return res
          .status(404)
          .json({ message: "Comentário não encontrado para deletar." });
      }
      await deleteComentario(comentarioId);
      res.json({ message: "Comentário deletado com sucesso.", comentario });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao deletar o comentário." });
    }
  }
}
