import { Request, Response } from "express";
import { AppDataSource } from "../ormconfig";
import { Between, In } from "typeorm";
import { User } from "../entities/User";
import { Imagem } from "../entities/Imagem";
import { Colaboracao } from "../entities/Colaboracao";

interface PeriodFilter {
  from: Date;
  to: Date;
}

interface DashboardSummaryResponse {
  totalUsers: number;
  totalImages: number;
  pendingCollaborations: number;
  pendingImages: number;
  newUsersThisPeriod: number;
  newImagesThisPeriod: number;
  usersByType: {
    common: number;
    collaborator: number;
    admin: number;
  };
  period: {
    from: string;
    to: string;
  };
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: string;
  user: {
    id: string;
    name: string;
  };
  entity: {
    type: string;
    id: string;
    status?: string;
  };
}

interface ActivitiesResponse {
  items: ActivityItem[];
  total: number;
  limit: number;
  offset: number;
  period: {
    from: string;
    to: string;
  };
}

interface TimeseriesPoint {
  date: string;
  value: number;
}

interface TimeseriesResponse {
  metric: string;
  groupBy: string;
  points: TimeseriesPoint[];
  period: {
    from: string;
    to: string;
  };
}

export class DashboardController {
  constructor() {
    // Constructor vazio - usaremos AppDataSource diretamente
  }

  // Método para parsear período
  private parsePeriod(
    period?: string,
    from?: string,
    to?: string
  ): PeriodFilter {
    const now = new Date();

    // Se period for "todo" ou "all", retornar desde a data mais antiga possível
    if (period === "todo" || period === "all") {
      return {
        from: new Date("1900-01-01"), // Data arbitrária bem antiga
        to: now,
      };
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error("invalid_date_range");
      }

      if (fromDate >= toDate) {
        throw new Error("invalid_date_range");
      }

      // Verificar se o range não excede 365 dias
      const diffDays =
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        throw new Error("invalid_date_range");
      }

      return { from: fromDate, to: toDate };
    }

    const validPeriods = ["7d", "30d", "90d"];
    const selectedPeriod = period || "30d";

    if (!validPeriods.includes(selectedPeriod)) {
      throw new Error("invalid_period");
    }

    const days = parseInt(selectedPeriod.replace("d", ""));
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return { from: fromDate, to: now };
  }

  // GET /admin/dashboard/summary
  public summary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period, from, to } = req.query;

      const periodFilter = this.parsePeriod(
        period as string,
        from as string,
        to as string
      );

      const userRepo = AppDataSource.getRepository(User);
      const imagemRepo = AppDataSource.getRepository(Imagem);
      const colaboracaoRepo = AppDataSource.getRepository(Colaboracao);

      // Contagens totais
      const [
        totalUsers,
        totalImages,
        pendingCollaborations,
        pendingImages,
        newUsersThisPeriod,
        newImagesThisPeriod,
      ] = await Promise.all([
        userRepo.count(),
        imagemRepo.count({
          where: { status: In(["Aprovada", "Análise", "Reprovada"]) },
        }),
        colaboracaoRepo.count({ where: { status: "Em analise" } }),
        imagemRepo.count({ where: { status: "Análise" } }),
        userRepo.count({
          where: {
            created_at: Between(periodFilter.from, periodFilter.to),
          },
        }),
        colaboracaoRepo.count({
          where: {
            created_at: Between(periodFilter.from, periodFilter.to),
          },
        }),
      ]);

      // Contagem por tipo de usuário
      const usersByTypeResult = await userRepo
        .createQueryBuilder("user")
        .select("user.tipo", "tipo")
        .addSelect("COUNT(*)", "count")
        .groupBy("user.tipo")
        .getRawMany();

      const usersByType = {
        common: 0,
        collaborator: 0,
        admin: 0,
      };

      usersByTypeResult.forEach((item: any) => {
        switch (item.tipo) {
          case "Comum":
            usersByType.common = parseInt(item.count);
            break;
          case "Colaborador":
            usersByType.collaborator = parseInt(item.count);
            break;
          case "Admin":
            usersByType.admin = parseInt(item.count);
            break;
        }
      });

      const response: DashboardSummaryResponse = {
        totalUsers,
        totalImages,
        pendingCollaborations,
        pendingImages,
        newUsersThisPeriod,
        newImagesThisPeriod,
        usersByType,
        period: {
          from: periodFilter.from.toISOString(),
          to: periodFilter.to.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "invalid_period") {
          res.status(400).json({
            error: "invalid_period",
            message: "Período inválido. Use 7d, 30d, 90d ou todo.",
          });
          return;
        }
        if (error.message === "invalid_date_range") {
          res.status(400).json({
            error: "invalid_date_range",
            message:
              "Range de datas inválido. Verifique o formato ISO 8601 e se from < to.",
          });
          return;
        }
      }

      console.error("Erro ao buscar resumo do dashboard:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: "Erro interno do servidor",
      });
    }
  };

  // GET /admin/dashboard/activities
  public activities = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit, offset, period, from, to, types } = req.query;

      // Validações
      const parsedLimit = Math.min(parseInt(limit as string) || 20, 100);
      const parsedOffset = Math.max(parseInt(offset as string) || 0, 0);

      if (parsedLimit < 1 || parsedLimit > 100) {
        res.status(400).json({
          error: "invalid_limit",
          message: "Limit deve estar entre 1 e 100.",
        });
        return;
      }

      const periodFilter = this.parsePeriod(
        period as string,
        from as string,
        to as string
      );

      const validTypes = [
        "user_registration",
        "image_upload",
        "collaboration_submitted",
        "image_approved",
        "image_rejected",
      ];

      let filterTypes: string[] = validTypes;
      if (types) {
        const requestedTypes = (types as string).split(",");
        const invalidTypes = requestedTypes.filter(
          (type) => !validTypes.includes(type)
        );

        if (invalidTypes.length > 0) {
          res.status(400).json({
            error: "invalid_types",
            message: `Tipos inválidos: ${invalidTypes.join(", ")}`,
          });
          return;
        }

        filterTypes = requestedTypes;
      }

      // Como não temos uma tabela de auditoria, vamos simular com base nas entidades existentes
      const activities: ActivityItem[] = [];

      // Buscar colaborações recentes (como collaboration_submitted)
      if (filterTypes.includes("collaboration_submitted")) {
        const colaboracaoRepo = AppDataSource.getRepository(Colaboracao);
        const recentCollaboracoes = await colaboracaoRepo
          .createQueryBuilder("colaboracao")
          .innerJoinAndSelect("colaboracao.user", "user")
          .where("colaboracao.created_at BETWEEN :from AND :to", {
            from: periodFilter.from,
            to: periodFilter.to,
          })
          .orderBy("colaboracao.created_at", "DESC")
          .limit(parsedLimit)
          .offset(parsedOffset)
          .getMany();

        recentCollaboracoes.forEach((colaboracao: any) => {
          activities.push({
            id: `collab_${colaboracao.colaboracao_id}`,
            type: "collaboration_submitted",
            description: "Nova colaboração enviada",
            date: colaboracao.created_at.toISOString(),
            user: {
              id: `u_${colaboracao.user.user_id}`,
              name: colaboracao.user.nome_completo,
            },
            entity: {
              type: "collaboration",
              id: `collab_${colaboracao.colaboracao_id}`,
              status: colaboracao.status,
            },
          });
        });
      }

      // Buscar imagens recentes (como image_upload)
      if (filterTypes.includes("image_upload")) {
        const imagemRepo = AppDataSource.getRepository(Imagem);
        const recentImages = await imagemRepo
          .createQueryBuilder("imagem")
          .innerJoinAndSelect("imagem.colaboracao", "colaboracao")
          .innerJoinAndSelect("colaboracao.user", "user")
          .where("colaboracao.created_at BETWEEN :from AND :to", {
            from: periodFilter.from,
            to: periodFilter.to,
          })
          .orderBy("colaboracao.created_at", "DESC")
          .limit(parsedLimit)
          .offset(parsedOffset)
          .getMany();

        recentImages.forEach((imagem: any) => {
          activities.push({
            id: `img_${imagem.imagem_id}`,
            type: "image_upload",
            description: "Nova imagem enviada",
            date: imagem.colaboracao.created_at.toISOString(),
            user: {
              id: `u_${imagem.colaboracao.user.user_id}`,
              name: imagem.colaboracao.user.nome_completo,
            },
            entity: {
              type: "image",
              id: `img_${imagem.imagem_id}`,
              status: imagem.status,
            },
          });
        });
      }

      // Ordenar atividades por data (mais recente primeiro)
      activities.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Aplicar paginação
      const paginatedActivities = activities.slice(
        parsedOffset,
        parsedOffset + parsedLimit
      );

      const response: ActivitiesResponse = {
        items: paginatedActivities,
        total: activities.length,
        limit: parsedLimit,
        offset: parsedOffset,
        period: {
          from: periodFilter.from.toISOString(),
          to: periodFilter.to.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "invalid_period") {
          res.status(400).json({
            error: "invalid_period",
            message: "Período inválido. Use 7d, 30d, 90d ou todo.",
          });
          return;
        }
        if (error.message === "invalid_date_range") {
          res.status(400).json({
            error: "invalid_date_range",
            message: "Range de datas inválido.",
          });
          return;
        }
      }

      console.error("Erro ao buscar atividades:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: "Erro interno do servidor",
      });
    }
  };

  // GET /admin/dashboard/timeseries
  public timeseries = async (req: Request, res: Response): Promise<void> => {
    try {
      const { metric, groupBy, period, from, to } = req.query;

      if (!metric) {
        res.status(400).json({
          error: "invalid_metric",
          message: "Parâmetro 'metric' é obrigatório.",
        });
        return;
      }

      const validMetrics = ["uploads", "registrations"];
      if (!validMetrics.includes(metric as string)) {
        res.status(400).json({
          error: "invalid_metric",
          message: "Métrica inválida. Use 'uploads' ou 'registrations'.",
        });
        return;
      }

      const validGroupBy = ["day", "week", "month"];
      const selectedGroupBy = (groupBy as string) || "day";
      if (!validGroupBy.includes(selectedGroupBy)) {
        res.status(400).json({
          error: "invalid_groupBy",
          message: "GroupBy inválido. Use 'day', 'week' ou 'month'.",
        });
        return;
      }

      const periodFilter = this.parsePeriod(
        period as string,
        from as string,
        to as string
      );

      let dateFormat: string;
      switch (selectedGroupBy) {
        case "day":
          dateFormat = "%Y-%m-%d";
          break;
        case "week":
          dateFormat = "%Y-%u";
          break;
        case "month":
          dateFormat = "%Y-%m";
          break;
        default:
          dateFormat = "%Y-%m-%d";
      }

      let points: TimeseriesPoint[] = [];

      if (metric === "uploads") {
        const imagemRepo = AppDataSource.getRepository(Imagem);
        const results = await imagemRepo
          .createQueryBuilder("imagem")
          .innerJoin("imagem.colaboracao", "colaboracao")
          .select(
            `DATE_FORMAT(colaboracao.created_at, '${dateFormat}')`,
            "date"
          )
          .addSelect("COUNT(*)", "value")
          .where("colaboracao.created_at BETWEEN :from AND :to", {
            from: periodFilter.from,
            to: periodFilter.to,
          })
          .groupBy("date")
          .orderBy("date", "ASC")
          .getRawMany();

        points = results.map((result: any) => ({
          date: result.date,
          value: parseInt(result.value),
        }));
      } else if (metric === "registrations") {
        const userRepo = AppDataSource.getRepository(User);
        const results = await userRepo
          .createQueryBuilder("user")
          .select(`DATE_FORMAT(user.created_at, '${dateFormat}')`, "date")
          .addSelect("COUNT(*)", "value")
          .where("user.created_at BETWEEN :from AND :to", {
            from: periodFilter.from,
            to: periodFilter.to,
          })
          .groupBy("date")
          .orderBy("date", "ASC")
          .getRawMany();

        points = results.map((result: any) => ({
          date: result.date,
          value: parseInt(result.value),
        }));
      }

      const response: TimeseriesResponse = {
        metric: metric as string,
        groupBy: selectedGroupBy,
        points,
        period: {
          from: periodFilter.from.toISOString(),
          to: periodFilter.to.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "invalid_period") {
          res.status(400).json({
            error: "invalid_period",
            message: "Período inválido. Use 7d, 30d, 90d ou todo.",
          });
          return;
        }
        if (error.message === "invalid_date_range") {
          res.status(400).json({
            error: "invalid_date_range",
            message: "Range de datas inválido.",
          });
          return;
        }
      }

      console.error("Erro ao buscar série temporal:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: "Erro interno do servidor",
      });
    }
  };

  // GET /admin/dashboard/distribution
  public distribution = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period, from, to, limit } = req.query;
      const periodFilter = this.parsePeriod(
        period as string,
        from as string,
        to as string
      );
      const parsedLimit = Math.max(
        1,
        Math.min(parseInt(limit as string) || 10, 100)
      );

      const colaboracaoRepo = AppDataSource.getRepository(Colaboracao);

      // Agregação por espécie
      const speciesRaw = await colaboracaoRepo
        .createQueryBuilder("c")
        .select("c.nome_especie", "name")
        .addSelect("COUNT(*)", "count")
        .where("c.created_at BETWEEN :from AND :to", {
          from: periodFilter.from,
          to: periodFilter.to,
        })
        .groupBy("c.nome_especie")
        .orderBy("count", "DESC")
        .limit(parsedLimit)
        .getRawMany();

      // Agregação por país
      const countriesRaw = await colaboracaoRepo
        .createQueryBuilder("c")
        .select("c.pais", "name")
        .addSelect("COUNT(*)", "count")
        .where("c.created_at BETWEEN :from AND :to", {
          from: periodFilter.from,
          to: periodFilter.to,
        })
        .groupBy("c.pais")
        .orderBy("count", "DESC")
        .limit(parsedLimit)
        .getRawMany();

      // Agregação por estado
      const statesRaw = await colaboracaoRepo
        .createQueryBuilder("c")
        .select("c.estado", "name")
        .addSelect("COUNT(*)", "count")
        .where("c.created_at BETWEEN :from AND :to", {
          from: periodFilter.from,
          to: periodFilter.to,
        })
        .groupBy("c.estado")
        .orderBy("count", "DESC")
        .limit(parsedLimit)
        .getRawMany();

      const response = {
        species: speciesRaw.map((r: any) => ({
          name: r.name,
          count: parseInt(r.count),
        })),
        countries: countriesRaw.map((r: any) => ({
          name: r.name,
          count: parseInt(r.count),
        })),
        states: statesRaw.map((r: any) => ({
          name: r.name,
          count: parseInt(r.count),
        })),
        period: {
          from: periodFilter.from.toISOString(),
          to: periodFilter.to.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "invalid_period") {
          res.status(400).json({
            error: "invalid_period",
            message: "Período inválido. Use 7d, 30d, 90d ou todo.",
          });
          return;
        }
        if (error.message === "invalid_date_range") {
          res.status(400).json({
            error: "invalid_date_range",
            message: "Range de datas inválido.",
          });
          return;
        }
      }
      console.error("Erro ao buscar distribuição:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: "Erro interno do servidor",
      });
    }
  };

  // GET /admin/dashboard/distribution/species
  public distributionBySpecies = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { period, from, to, limit } = req.query;
      const topLimit = Math.min(parseInt(limit as string) || 5, 20); // máximo 20

      const periodFilter = this.parsePeriod(
        period as string,
        from as string,
        to as string
      );

      const colaboracaoRepo = AppDataSource.getRepository(Colaboracao);

      // Buscar todas as espécies com contagem no período
      const speciesRaw = await colaboracaoRepo
        .createQueryBuilder("c")
        .select(
          "COALESCE(NULLIF(c.nome_especie, ''), 'Não especificada')",
          "species"
        )
        .addSelect("COUNT(*)", "count")
        .where("c.status = :status", { status: "Aprovada" })
        .andWhere("c.created_at BETWEEN :from AND :to", {
          from: periodFilter.from,
          to: periodFilter.to,
        })
        .groupBy("species")
        .orderBy("count", "DESC")
        .getRawMany();

      // Separar top N e calcular others
      const topSpecies = speciesRaw.slice(0, topLimit);
      const othersCount = speciesRaw
        .slice(topLimit)
        .reduce((sum: number, item: any) => sum + parseInt(item.count), 0);

      const total = speciesRaw.reduce(
        (sum: number, item: any) => sum + parseInt(item.count),
        0
      );

      const response = {
        top: topSpecies.map((item: any) => ({
          species: item.species,
          count: parseInt(item.count),
        })),
        others: othersCount,
        total,
        period: {
          from: periodFilter.from.toISOString(),
          to: periodFilter.to.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Erro ao buscar distribuição por espécie:", error);
      this.handleDistributionError(error, res);
    }
  };

  // GET /admin/dashboard/distribution/regions
  public distributionByRegions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { period, from, to, limit } = req.query;
      const topLimit = Math.min(parseInt(limit as string) || 5, 20);

      const periodFilter = this.parsePeriod(
        period as string,
        from as string,
        to as string
      );

      const colaboracaoRepo = AppDataSource.getRepository(Colaboracao);

      // Buscar todas as regiões com contagem no período
      const regionsRaw = await colaboracaoRepo
        .createQueryBuilder("c")
        .select("COALESCE(NULLIF(c.regiao, ''), 'Não informado')", "region")
        .addSelect("COUNT(*)", "count")
        .where("c.status = :status", { status: "Aprovada" })
        .andWhere("c.created_at BETWEEN :from AND :to", {
          from: periodFilter.from,
          to: periodFilter.to,
        })
        .groupBy("region")
        .orderBy("count", "DESC")
        .getRawMany();

      // Separar top N e calcular others
      const topRegions = regionsRaw.slice(0, topLimit);
      const othersCount = regionsRaw
        .slice(topLimit)
        .reduce((sum: number, item: any) => sum + parseInt(item.count), 0);

      const total = regionsRaw.reduce(
        (sum: number, item: any) => sum + parseInt(item.count),
        0
      );

      const response = {
        top: topRegions.map((item: any) => ({
          region: item.region,
          count: parseInt(item.count),
        })),
        others: othersCount,
        total,
        period: {
          from: periodFilter.from.toISOString(),
          to: periodFilter.to.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Erro ao buscar distribuição por região:", error);
      this.handleDistributionError(error, res);
    }
  };

  // GET /admin/dashboard/distribution/cities
  public distributionByCities = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { period, from, to, limit } = req.query;
      const topLimit = Math.min(parseInt(limit as string) || 5, 20);

      const periodFilter = this.parsePeriod(
        period as string,
        from as string,
        to as string
      );

      const colaboracaoRepo = AppDataSource.getRepository(Colaboracao);

      // Buscar todos os municípios com contagem no período
      const citiesRaw = await colaboracaoRepo
        .createQueryBuilder("c")
        .select("COALESCE(NULLIF(c.municipio, ''), 'Não informado')", "city")
        .addSelect("COUNT(*)", "count")
        .where("c.status = :status", { status: "Aprovada" })
        .andWhere("c.created_at BETWEEN :from AND :to", {
          from: periodFilter.from,
          to: periodFilter.to,
        })
        .groupBy("city")
        .orderBy("count", "DESC")
        .getRawMany();

      // Separar top N e calcular others
      const topCities = citiesRaw.slice(0, topLimit);
      const othersCount = citiesRaw
        .slice(topLimit)
        .reduce((sum: number, item: any) => sum + parseInt(item.count), 0);

      const total = citiesRaw.reduce(
        (sum: number, item: any) => sum + parseInt(item.count),
        0
      );

      const response = {
        top: topCities.map((item: any) => ({
          city: item.city,
          count: parseInt(item.count),
        })),
        others: othersCount,
        total,
        period: {
          from: periodFilter.from.toISOString(),
          to: periodFilter.to.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Erro ao buscar distribuição por município:", error);
      this.handleDistributionError(error, res);
    }
  };

  // Helper para tratar erros de distribuição
  private handleDistributionError(error: unknown, res: Response): void {
    if (error instanceof Error) {
      if (error.message === "invalid_period") {
        res.status(400).json({
          error: "invalid_period",
          message: "Período inválido. Use 7d, 30d, 90d ou todo.",
        });
        return;
      }
      if (error.message === "invalid_date_range") {
        res.status(400).json({
          error: "invalid_date_range",
          message: "Range de datas inválido.",
        });
        return;
      }
    }
    res.status(500).json({
      error: "internal_server_error",
      message: "Erro interno do servidor",
    });
  }
}
