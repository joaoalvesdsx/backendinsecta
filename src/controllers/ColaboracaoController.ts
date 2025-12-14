import { Request, Response } from "express";
import { IGetUserAuthInfoRequest } from "../types/user";
import {
  createColaboracao,
  deleteColaboracao,
  findAllColaboracoes,
  findColaboracaoById,
  updateColaboracao,
  findColaboracoesByEspecie,
  findColaboracaoByUserId,
  getFilteredColaboracoes,
  searchColaboracoes,
} from "../repositories/ColaboracaoRepository";

export class ColaboracaoController {
  // Criar uma nova colaboração
  async create(req: Request, res: Response) {
    const colaboracaoData = req.body;
    const userId = parseInt(req.params.user_id);

    try {
      const newColaboracao = await createColaboracao(colaboracaoData, userId);
      res.status(201).json(newColaboracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao criar a colaboração." });
    }
  }

  // Buscar todas as colaborações
  async getAll(req: Request, res: Response) {
    try {
      const colaboracoes = await findAllColaboracoes();
      res.json(colaboracoes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar as colaborações." });
    }
  }

  // Nova listagem com DTO reduzido + filtro opcional por user_id via query param
  async listDTO(req: Request, res: Response) {
    try {
      const { list_dto } = req.query; // se front chamar /colaboracoes?dto=1 ou similar podemos usar, mas por simplicidade sempre disponível
      const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
      // carregar função dinamicamente para evitar import circular
      const { listColaboracoes } = await import(
        "../repositories/ColaboracaoRepository"
      );
      const data = await listColaboracoes(userId);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao listar colaborações" });
    }
  }

  // Buscar uma colaboração pelo ID
  async getById(req: Request, res: Response) {
    const colaboracaoId = parseInt(req.params.colaboracao_id);

    try {
      const colaboracao = await findColaboracaoById(colaboracaoId);
      if (!colaboracao) {
        return res.status(404).json({ message: "Colaboração não encontrada." });
      }
      res.json(colaboracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar a colaboração." });
    }
  }

  // Atualizar uma colaboração
  async update(req: Request, res: Response) {
    const colaboracaoId = parseInt(req.params.colaboracao_id);
    const colaboracaoData = req.body;

    try {
      const updatedColaboracao = await updateColaboracao(
        colaboracaoId,
        colaboracaoData
      );
      if (!updatedColaboracao) {
        return res
          .status(404)
          .json({ message: "Colaboração não encontrada para atualizar." });
      }
      res.json(updatedColaboracao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao atualizar a colaboração." });
    }
  }

  // Deletar uma colaboração pelo ID
  async deleteById(req: IGetUserAuthInfoRequest, res: Response) {
    const colaboracaoId = parseInt(req.params.colaboracao_id);

    try {
      const colaboracao = await findColaboracaoById(colaboracaoId);
      if (!colaboracao) {
        return res
          .status(404)
          .json({ message: "Colaboração não encontrada para deletar." });
      }

      // Checagem de permissão: admin pode deletar qualquer colaboração;
      // usuário comum só pode deletar suas próprias colaborações
      const requester = req.user;
      if (!requester) {
        return res.status(401).json({ message: "Usuário não autenticado." });
      }

      const isAdmin = requester.tipo === "Admin";
      const isOwner =
        colaboracao.user && colaboracao.user.user_id === requester.user_id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          message:
            "Ação negada. Só administrador ou proprietário podem deletar.",
        });
      }

      await deleteColaboracao(colaboracaoId);
      res.json({ message: "Colaboração deletada com sucesso.", colaboracao });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao deletar a colaboração." });
    }
  }

  // Buscar colaborações por nome de espécie
  async getByEspecie(req: Request, res: Response) {
    const { nome_especie } = req.params;

    try {
      const colaboracoes = await findColaboracoesByEspecie(nome_especie);
      res.json(colaboracoes);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Erro ao buscar colaborações por espécie." });
    }
  }

  // Buscar colaborações por User ID

  async getByUserId(req: Request, res: Response) {
    const userId = parseInt(req.params.user_id);

    try {
      const colaboracoes = await findColaboracaoByUserId(userId);
      res.json(colaboracoes);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Erro ao buscar colaborações por usuário." });
    }
  }

  // Filtrar colaborações

  async filterColaboracoes(req: Request, res: Response) {
    const filters = req.body; // Filtros enviados no corpo da requisição
    try {
      const colaboracoes = await getFilteredColaboracoes(filters);
      res.status(200).json(colaboracoes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao filtrar colaborações." });
    }
  }

  // Busca avançada com filtros server-side
  async search(req: Request, res: Response) {
    try {
      // Parse dos query params em arrays quando necessário
      const filters: any = {
        termo: req.query.termo as string,
        pais: Array.isArray(req.query.pais)
          ? req.query.pais
          : req.query.pais
          ? [req.query.pais]
          : [],
        regiao: Array.isArray(req.query.regiao)
          ? req.query.regiao
          : req.query.regiao
          ? [req.query.regiao]
          : [],
        estado: Array.isArray(req.query.estado)
          ? req.query.estado
          : req.query.estado
          ? [req.query.estado]
          : [],
        municipio: Array.isArray(req.query.municipio)
          ? req.query.municipio
          : req.query.municipio
          ? [req.query.municipio]
          : [],
        dataInicio: req.query.dataInicio as string,
        dataFim: req.query.dataFim as string,
        ladoAsa: req.query.ladoAsa as string,
        ordenar: req.query.ordenar as string,
        page: req.query.page as string,
        pageSize: req.query.pageSize as string,
      };

      const result = await searchColaboracoes(filters);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao realizar a busca." });
    }
  }
}
