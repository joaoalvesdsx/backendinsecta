import { AppDataSource } from "../ormconfig";
import { Imagem } from "../entities/Imagem";

export const imagemRepository = AppDataSource.getRepository(Imagem);

// Buscar todas as imagens
export async function findAllImagens() {
  return await imagemRepository.find({ relations: ["colaboracao"] });
}

// Buscar imagem por ID
export async function findImagemById(imagemId: number) {
  return await imagemRepository.findOne({
    where: { imagem_id: imagemId },
    relations: ["colaboracao"],
  });
}

// Buscar imagens por colaboração
export async function findImagensByColaboracaoId(colaboracaoId: number) {
  return await imagemRepository.find({
    where: { colaboracao: { colaboracao_id: colaboracaoId } },
    relations: ["colaboracao"],
  });
}
// Buscar imagem por Codigo da imagem
export async function findImagemByCodigo(codigoImagem: string) {
  return await imagemRepository.findOne({
    where: { codigo_imagem: codigoImagem },
  });
}

// Criar uma nova imagem
export async function createImagem(imagemData: Partial<Imagem>) {
  const imagem = imagemRepository.create(imagemData);
  return await imagemRepository.save(imagem);
}

// Atualizar imagem
export async function updateImagem(
  imagemId: number,
  imagemData: Partial<Imagem>
) {
  await imagemRepository.update(imagemId, imagemData);
  return await findImagemById(imagemId);
}
// Atualizar status da imagem
export async function updateImagemStatus(imagemId: number, status: string) {
  await imagemRepository.update(imagemId, { status });
  return await findImagemById(imagemId);
}
// Deletar imagem
export async function deleteImagem(imagemId: number) {
  return await imagemRepository.delete(imagemId);
}
