import { AppDataSource } from "../ormconfig";
import { Colaboracao } from "../entities/Colaboracao";
import { userRepository } from "./UserRepository";
import cloudinary from "../../cloudinaryConfig";

// Helper: aceita DMS (ex: 11°31’5.02”S) ou decimal e retorna string decimal com 6 casas ou null
function dmsToDecimal(input: any): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return input.toFixed(6);
  let s = String(input).trim();
  if (!s) return null;
  // normaliza aspas/símbolos comuns
  s = s.replace(/[’‘]/g, "'").replace(/[”“]/g, '"').replace(/[º˚]/g, "°");

  // tenta DMS: deg [°] min [' or ′] sec [" or ″] [NSEW]
  const dmsRegex =
    /(\d+(?:[\.,]\d+)?)\D+(\d+(?:[\.,]\d+)?)\D+(\d+(?:[\.,]\d+)?)(?:\D*([NnSsEeWw]))?/;
  const m = s.match(dmsRegex);
  if (m) {
    const deg = parseFloat(m[1].replace(",", "."));
    const min = parseFloat(m[2].replace(",", "."));
    const sec = parseFloat(m[3].replace(",", "."));
    const dir = (m[4] || "").toUpperCase();
    let dec = deg + min / 60 + sec / 3600;
    if (dir === "S" || dir === "W") dec = -Math.abs(dec);
    return dec.toFixed(6);
  }

  // fallback: extrai número decimal simples
  const num = s.match(/-?\d+(?:[\.,]\d+)?/);
  if (num) {
    return parseFloat(num[0].replace(",", ".")).toFixed(6);
  }
  return null;
}

// --- Status constants (single source of truth) ---
export const COLABORACAO_VALID_STATUSES = [
  "Em analise",
  "Aprovada",
  "Rejeitada",
  "Algo a corrigir",
] as const;
type ColaboracaoStatus = (typeof COLABORACAO_VALID_STATUSES)[number];

const STATUS_FRONT_MAP: Record<string, string> = {
  "Em analise": "pending",
  Aprovada: "approved",
  Rejeitada: "rejected",
  "Algo a corrigir": "correction",
};

export const colaboracaoRepository = AppDataSource.getRepository(Colaboracao);

// Buscar todas as colaborações
async function findAllColaboracoes() {
  return await colaboracaoRepository.find();
}

// Nova listagem com join para expor apenas campos necessários do usuário
async function listColaboracoes(userId?: number) {
  const qb = colaboracaoRepository
    .createQueryBuilder("c")
    .leftJoinAndSelect("c.user", "u")
    .select([
      "c.colaboracao_id",
      "c.nome_especie",
      "c.status",
      "c.pais",
      "c.estado",
      "c.municipio",
      "c.data",
      "c.regiao",
      "u.user_id",
      "u.nome_completo",
    ]);

  if (userId) {
    qb.andWhere("c.user_id = :uid", { uid: userId });
  }

  const rows = await qb.getMany();
  return rows.map(mapToDTO);
}

// DTO e mapper
export interface ColaboracaoDTO {
  colaboracao_id: number;
  nome_especie: string;
  status?: string;
  user: { user_id?: number; nome_completo?: string } | null;
  pais?: string;
  estado?: string;
  municipio?: string;
  regiao?: string;
}

function toFrontStatus(s?: string) {
  if (!s) return s;
  return STATUS_FRONT_MAP[s] || s;
}

function mapToDTO(c: Colaboracao): ColaboracaoDTO {
  return {
    colaboracao_id: c.colaboracao_id!,
    nome_especie: c.nome_especie,
    status: toFrontStatus(c.status),
    user: c.user
      ? { user_id: c.user.user_id, nome_completo: c.user.nome_completo }
      : null,
    pais: (c as any).pais,
    estado: (c as any).estado,
    municipio: (c as any).municipio,
    regiao: (c as any).regiao,
  };
}

// Criar uma nova colaboração
async function createColaboracao(data: Partial<Colaboracao>, userId: number) {
  const user = await userRepository.findOneByOrFail({ user_id: userId }); // Obter o usuário pelo ID
  // Normalizar campos que podem vir em formatos variados
  const payload: any = { ...data };
  if (payload.latitude !== undefined) {
    const lat = dmsToDecimal(payload.latitude);
    if (lat !== null) payload.latitude = lat;
  }
  if (payload.longitude !== undefined) {
    const lon = dmsToDecimal(payload.longitude);
    if (lon !== null) payload.longitude = lon;
  }
  // altitude armazenado como varchar na entidade -> garantir string
  if (payload.altitude !== undefined && payload.altitude !== null) {
    payload.altitude = String(payload.altitude);
  }

  const novaColaboracao = colaboracaoRepository.create({
    ...payload,
    user, // Relacionar o usuário diretamente
  });
  return await colaboracaoRepository.save(novaColaboracao);
}

// Buscar uma colaboração por ID
async function findColaboracaoById(id: number) {
  return await colaboracaoRepository.findOne({
    where: { colaboracao_id: id },
    relations: ["user"],
  });
}

// Atualizar uma colaboração existente
async function updateColaboracao(
  id: number,
  colaboracaoData: Partial<Colaboracao>
) {
  // Executa update normal
  await colaboracaoRepository.update(id, colaboracaoData);
  // Busca novamente com relação user para possível promoção
  const colaboracao = await colaboracaoRepository.findOne({
    where: { colaboracao_id: id },
    relations: ["user"],
  });

  // Se o update incluiu mudança de status, tentar promover usuário se ele ainda for user comum
  if (colaboracaoData.status !== "Em analise" && colaboracao?.user?.user_id) {
    await promoteUserIfCommon(colaboracao.user.user_id);
  }

  return colaboracao || (await findColaboracaoById(id));
}

// Deletar uma colaboração por ID (remove imagens do Cloudinary antes)
async function deleteColaboracao(id: number) {
  const colaboracao = await colaboracaoRepository.findOne({
    where: { colaboracao_id: id },
    relations: ["imagens"],
  });

  if (!colaboracao) return { affected: 0 } as any;

  // Deletar imagens do Cloudinary
  try {
    const imagemRepo = AppDataSource.getRepository("Imagem");
    if (colaboracao.imagens && colaboracao.imagens.length) {
      for (const img of colaboracao.imagens) {
        const publicId = img.url_imagem?.split("/").pop()?.split(".")[0];
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(`colaboracoes/${publicId}`);
          } catch (e) {
            console.error("Erro ao deletar imagem no Cloudinary:", e);
          }
        }
      }
      // Remover registros de imagem do DB
      await imagemRepo.remove(colaboracao.imagens as any);
    }
  } catch (e) {
    console.error("Erro ao processar imagens ao deletar colaboração:", e);
  }

  return await colaboracaoRepository.delete(id);
}

// Buscar colaborações por nome de espécie
async function findColaboracoesByEspecie(nomeEspecie: string) {
  return await colaboracaoRepository.find({
    where: { nome_especie: nomeEspecie },
  });
}

// Buscar colaborações por User ID (chave estrangeira)
async function findColaboracaoByUserId(userId: number) {
  return await colaboracaoRepository.find({
    where: { user: { user_id: userId } }, // Usando a relação com o User
    relations: ["user"], // Inclui a entidade "user" para facilitar o acesso
  });
}

// Atualizar o status de uma colaboração
async function updateColaboracaoStatus(
  id: number,
  status: string
): Promise<Colaboracao | null> {
  if (!COLABORACAO_VALID_STATUSES.includes(status as ColaboracaoStatus)) {
    throw new Error(
      `Status inválido. Permitidos: ${COLABORACAO_VALID_STATUSES.join(", ")}`
    );
  }

  await colaboracaoRepository.update(id, { status });
  const colaboracao = await colaboracaoRepository.findOne({
    where: { colaboracao_id: id },
    relations: ["user"],
  });

  if (status === "Aprovada" && colaboracao?.user?.user_id) {
    await promoteUserIfCommon(colaboracao.user.user_id);
  }

  return colaboracao || (await findColaboracaoById(id));
}

// Filtro geral por colaborações
async function getFilteredColaboracoes(filters: any): Promise<Colaboracao[]> {
  const queryBuilder = colaboracaoRepository.createQueryBuilder("colaboracao");

  queryBuilder.leftJoinAndSelect("colaboracao.imagens", "imagem");

  if (!filters.status) {
    filters.status = "Aprovada";
  }

  // Filtros dinâmicos
  if (filters.nome_especie) {
    queryBuilder.andWhere("colaboracao.nome_especie = :nome_especie", {
      nome_especie: filters.nome_especie,
    });
  }
  if (filters.pais) {
    queryBuilder.andWhere("colaboracao.pais = :pais", { pais: filters.pais });
  }
  if (filters.regiao) {
    queryBuilder.andWhere("colaboracao.regiao = :regiao", {
      regiao: filters.regiao,
    });
  }
  if (filters.estado) {
    queryBuilder.andWhere("colaboracao.estado = :estado", {
      estado: filters.estado,
    });
  }
  if (filters.municipio) {
    queryBuilder.andWhere("colaboracao.municipio = :municipio", {
      municipio: filters.municipio,
    });
  }
  if (filters.minDate || filters.maxDate) {
    if (filters.minDate) {
      queryBuilder.andWhere("colaboracao.data >= :minDate", {
        minDate: filters.minDate,
      });
    }
    if (filters.maxDate) {
      queryBuilder.andWhere("colaboracao.data <= :maxDate", {
        maxDate: filters.maxDate,
      });
    }
  }
  // (Pagination could be added here in future)
  return await queryBuilder.getMany();
}

// Busca avançada com filtros server-side e paginação
async function searchColaboracoes(filters: any): Promise<any> {
  const query = colaboracaoRepository
    .createQueryBuilder("c")
    .where("c.status = :status", { status: "Aprovada" });

  // 1. Filtro de busca por espécie
  if (filters.termo) {
    query.andWhere("LOWER(c.nome_especie) LIKE LOWER(:termo)", {
      termo: `%${filters.termo}%`,
    });
  }

  // 2. Filtros de localização (arrays)
  if (filters.pais?.length > 0) {
    query.andWhere("c.pais IN (:...paises)", { paises: filters.pais });
  }
  if (filters.regiao?.length > 0) {
    query.andWhere("c.regiao IN (:...regioes)", { regioes: filters.regiao });
  }
  if (filters.estado?.length > 0) {
    query.andWhere("c.estado IN (:...estados)", { estados: filters.estado });
  }
  if (filters.municipio?.length > 0) {
    query.andWhere("c.municipio IN (:...municipios)", {
      municipios: filters.municipio,
    });
  }

  // 3. Filtro de data (range)
  if (filters.dataInicio) {
    query.andWhere("c.data >= :dataInicio", { dataInicio: filters.dataInicio });
  }
  if (filters.dataFim) {
    query.andWhere("c.data <= :dataFim", { dataFim: filters.dataFim });
  }

  // 4. Filtro de lado da asa (último caractere do código) - usando EXISTS para não perder colaborações
  if (filters.ladoAsa && filters.ladoAsa !== "all") {
    query.andWhere(
      `EXISTS (
        SELECT 1 FROM imagem img 
        WHERE img.colaboracao_id = c.colaboracao_id 
        AND (img.status = 'Aprovada' OR img.status IS NULL)
        AND RIGHT(img.codigo_imagem, 1) = :ladoAsa
      )`,
      { ladoAsa: filters.ladoAsa }
    );
  }

  // Agora fazer o join com as imagens APÓS aplicar os filtros na colaboração
  // Isso garante que pegamos apenas imagens aprovadas, mas não filtramos colaborações por elas
  query.leftJoinAndSelect(
    "c.imagens",
    "i",
    "i.status = :imgStatus OR i.status IS NULL",
    { imgStatus: "Aprovada" }
  );

  // 5. Ordenação
  if (filters.ordenar === "recent") {
    query.orderBy("c.data", "DESC").addOrderBy("c.colaboracao_id", "DESC");
  } else {
    query.orderBy("c.data", "ASC").addOrderBy("c.colaboracao_id", "ASC");
  }

  // 6. Paginação
  const page = parseInt(filters.page) || 1;
  const pageSize = Math.min(parseInt(filters.pageSize) || 12, 100); // limite máximo: 100
  query.skip((page - 1) * pageSize).take(pageSize);

  // Executar query
  const [results, total] = await query.getManyAndCount();

  // 7. Gerar facets (contadores)
  const facets = await getFacets(filters);

  return {
    results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    facets,
  };
}

// Função para gerar contadores dos filtros (facets)
async function getFacets(filters: any): Promise<any> {
  const baseQuery = colaboracaoRepository
    .createQueryBuilder("c")
    .where("c.status = :status", { status: "Aprovada" });

  // Aplicar filtros existentes (exceto o que estamos contando)
  if (filters.termo) {
    baseQuery.andWhere("LOWER(c.nome_especie) LIKE LOWER(:termo)", {
      termo: `%${filters.termo}%`,
    });
  }

  // Contar países
  const paisQuery = baseQuery.clone();
  if (filters.regiao?.length)
    paisQuery.andWhere("c.regiao IN (:...regioes)", {
      regioes: filters.regiao,
    });
  if (filters.estado?.length)
    paisQuery.andWhere("c.estado IN (:...estados)", {
      estados: filters.estado,
    });
  if (filters.municipio?.length)
    paisQuery.andWhere("c.municipio IN (:...municipios)", {
      municipios: filters.municipio,
    });
  const paises = await paisQuery
    .select("c.pais", "pais")
    .addSelect("COUNT(*)", "count")
    .groupBy("c.pais")
    .getRawMany();

  // Contar regiões
  const regiaoQuery = baseQuery.clone();
  if (filters.pais?.length)
    regiaoQuery.andWhere("c.pais IN (:...paises)", { paises: filters.pais });
  if (filters.estado?.length)
    regiaoQuery.andWhere("c.estado IN (:...estados)", {
      estados: filters.estado,
    });
  if (filters.municipio?.length)
    regiaoQuery.andWhere("c.municipio IN (:...municipios)", {
      municipios: filters.municipio,
    });
  const regioes = await regiaoQuery
    .select("c.regiao", "regiao")
    .addSelect("COUNT(*)", "count")
    .groupBy("c.regiao")
    .getRawMany();

  // Contar estados
  const estadoQuery = baseQuery.clone();
  if (filters.pais?.length)
    estadoQuery.andWhere("c.pais IN (:...paises)", { paises: filters.pais });
  if (filters.regiao?.length)
    estadoQuery.andWhere("c.regiao IN (:...regioes)", {
      regioes: filters.regiao,
    });
  if (filters.municipio?.length)
    estadoQuery.andWhere("c.municipio IN (:...municipios)", {
      municipios: filters.municipio,
    });
  const estados = await estadoQuery
    .select("c.estado", "estado")
    .addSelect("COUNT(*)", "count")
    .groupBy("c.estado")
    .getRawMany();

  // Contar municípios
  const municipioQuery = baseQuery.clone();
  if (filters.pais?.length)
    municipioQuery.andWhere("c.pais IN (:...paises)", {
      paises: filters.pais,
    });
  if (filters.regiao?.length)
    municipioQuery.andWhere("c.regiao IN (:...regioes)", {
      regioes: filters.regiao,
    });
  if (filters.estado?.length)
    municipioQuery.andWhere("c.estado IN (:...estados)", {
      estados: filters.estado,
    });
  const municipios = await municipioQuery
    .select("c.municipio", "municipio")
    .addSelect("COUNT(*)", "count")
    .groupBy("c.municipio")
    .getRawMany();

  return {
    pais: Object.fromEntries(paises.map((p) => [p.pais, parseInt(p.count)])),
    regiao: Object.fromEntries(
      regioes.map((r) => [r.regiao, parseInt(r.count)])
    ),
    estado: Object.fromEntries(
      estados.map((e) => [e.estado, parseInt(e.count)])
    ),
    municipio: Object.fromEntries(
      municipios.map((m) => [m.municipio, parseInt(m.count)])
    ),
  };
}

export {
  findAllColaboracoes,
  createColaboracao,
  findColaboracaoById,
  updateColaboracao,
  deleteColaboracao,
  findColaboracoesByEspecie,
  findColaboracaoByUserId,
  updateColaboracaoStatus,
  getFilteredColaboracoes,
  listColaboracoes,
  searchColaboracoes,
};

// --- Helper interno ---
async function promoteUserIfCommon(userId: number) {
  // Precisamos selecionar campo 'tipo' (select:false na entidade)
  const user = await userRepository
    .createQueryBuilder("user")
    .addSelect("user.tipo")
    .where("user.user_id = :uid", { uid: userId })
    .getOne();
  if (user && (user.tipo === "Comum" || !user.tipo)) {
    user.tipo = "Colaborador";
    await userRepository.save(user);
  }
}
