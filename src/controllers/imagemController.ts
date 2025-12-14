import { Request, Response } from "express";
import {
  findAllImagens,
  findImagemById,
  findImagensByColaboracaoId,
  findImagemByCodigo,
  createImagem,
  updateImagem,
  deleteImagem,
  updateImagemStatus,
} from "../repositories/ImagemRepository";
import cloudinary from "../../cloudinaryConfig"; // Cloudinary SDK para upload
import { findColaboracaoById } from "../repositories/ColaboracaoRepository";

export class ImagemController {
  // Buscar todas as imagens
  async getAll(req: Request, res: Response) {
    try {
      const imagens = await findAllImagens();
      res.json(imagens);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar as imagens." });
    }
  }

  // Buscar imagem por ID
  async getById(req: Request, res: Response) {
    const imagemId = parseInt(req.params.imagem_id);

    try {
      const imagem = await findImagemById(imagemId);
      if (!imagem) {
        return res.status(404).json({ message: "Imagem não encontrada." });
      }
      res.json(imagem);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar a imagem." });
    }
  }

  // Buscar imagens por colaboração
  async getByColaboracaoId(req: Request, res: Response) {
    const colaboracaoId = parseInt(req.params.colaboracao_id);

    try {
      const imagens = await findImagensByColaboracaoId(colaboracaoId);
      res.json(imagens);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Erro ao buscar as imagens por colaboração." });
    }
  }

  // Buscar imagem por Codigo
  async getByCodImagem(req: Request, res: Response) {
    const codigo_imagem = (req.params.codigo_imagem as string).trim();

    try {
      const imagem = await findImagemByCodigo(codigo_imagem);
      if (!imagem) {
        return res.status(404).json({ message: "Imagem não encontrada." });
      }
      res.json(imagem);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao buscar a imagem." });
    }
  }

  // Criar uma nova imagem (upload para o Cloudinary e salvar a URL)
  async create(req: Request, res: Response) {
    // DEBUG COMPLETO
    console.log("=== DEBUG UPLOAD ===");
    console.log("Params:", req.params);
    console.log("Body:", req.body);
    console.log(
      "File:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "NO FILE"
    );
    console.log("Headers authorization:", req.headers.authorization);
    console.log("===================");

    // Extrair dados do body (que agora pode vir do multer)
    const codigo_imagem = req.body?.codigo_imagem;
    const descricao = req.body?.descricao;
    const colaboracao_id = parseInt(req.params.colaboracao_id);

    try {
      // Verificar se o arquivo foi enviado
      if (!req.file) {
        console.error("❌ Arquivo de imagem não fornecido");
        return res.status(400).json({
          message: "Arquivo de imagem não fornecido.",
          details: "Campo 'imagem' não encontrado no request",
        });
      }

      // Verificar se código da imagem foi fornecido
      if (!codigo_imagem || codigo_imagem.trim() === "") {
        console.error("❌ Código da imagem não fornecido");
        return res.status(400).json({
          message: "Código da imagem é obrigatório.",
          receivedBody: req.body,
        });
      }

      // Verificar se colaboracao_id é válido
      if (isNaN(colaboracao_id)) {
        console.error(
          "❌ ID da colaboração inválido:",
          req.params.colaboracao_id
        );
        return res.status(400).json({
          message: "ID da colaboração inválido.",
          receivedId: req.params.colaboracao_id,
        });
      }

      console.log("✅ Validações passaram, fazendo upload para Cloudinary...");

      // Upload da imagem para o Cloudinary
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        {
          folder: "colaboracoes", // Pasta no Cloudinary
          public_id: `${colaboracao_id}_${codigo_imagem.trim()}_${Date.now()}`, // ID único
        }
      );

      console.log("✅ Upload Cloudinary concluído:", uploadResult.public_id);

      // Verificar se a colaboração existe

      const colaboracao = await findColaboracaoById(colaboracao_id);
      if (!colaboracao) {
        console.error("❌ Colaboração não encontrada:", colaboracao_id);
        // Limpar imagem do Cloudinary se colaboração não existir
        await cloudinary.uploader.destroy(uploadResult.public_id);
        return res.status(404).json({
          message: "Colaboração não encontrada.",
          colaboracaoId: colaboracao_id,
        });
      }

      console.log("✅ Colaboração encontrada, criando registro da imagem...");

      // Validar se a colaboração tem usuário e user_id válido
      if (!colaboracao.user || !colaboracao.user.user_id) {
        console.error("❌ Colaboração sem usuário válido:", {
          colaboracao_id,
          user: colaboracao.user,
          user_id: colaboracao.user?.user_id,
        });
        await cloudinary.uploader.destroy(uploadResult.public_id);
        return res.status(400).json({
          message: "Colaboração não possui usuário válido.",
          colaboracaoId: colaboracao_id,
        });
      }

      // Monta o código conforme solicitado: id do colaborador + id da colaboração + código do front
      const codigoFinal = `${colaboracao.user.user_id}${
        colaboracao.colaboracao_id
      }${codigo_imagem.trim()}`;

      console.log("📝 Código final montado:", codigoFinal);

      const novaImagem = {
        colaboracao,
        url_imagem: uploadResult.secure_url,
        descricao: descricao || "", // Usar string vazia se não fornecida
        codigo_imagem: codigoFinal,
        estado: "Analise", // Estado padrão
      };

      const imagemCriada = await createImagem(novaImagem);

      console.log("✅ Imagem criada com sucesso:", imagemCriada.imagem_id);

      res.status(201).json({
        success: true,
        message: "Imagem criada com sucesso",
        imagem: imagemCriada,
      });
    } catch (error: unknown) {
      console.error("❌ Erro ao criar a imagem:", error);

      // Type guard para tratar o erro
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      const errorName = error instanceof Error ? error.name : "UnknownError";

      // Resposta mais detalhada do erro
      if (errorName === "ValidationError") {
        return res.status(400).json({
          message: "Erro de validação",
          details: errorMessage,
        });
      }

      // Verificar se é erro do Cloudinary
      if (error && typeof error === "object" && "http_code" in error) {
        return res.status(400).json({
          message: "Erro no upload da imagem",
          details: errorMessage,
        });
      }

      res.status(500).json({
        message: "Erro interno do servidor ao criar a imagem.",
        error:
          process.env.NODE_ENV === "development"
            ? errorMessage
            : "Internal server error",
      });
    }
  }
  // Atualizar uma imagem
  async update(req: Request, res: Response) {
    const imagemId = parseInt(req.params.imagem_id);
    const imagemData = req.body;

    try {
      const imagemAtualizada = await updateImagem(imagemId, imagemData);
      if (!imagemAtualizada) {
        return res
          .status(404)
          .json({ message: "Imagem não encontrada para atualizar." });
      }
      res.json(imagemAtualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao atualizar a imagem." });
    }
  }
  // Atualizar o status de uma imagem
  async updateImagemStatus(req: Request, res: Response) {
    const imagemId = parseInt(req.params.imagem_id);
    const imagemStatus = req.body.status;

    try {
      const imagemStatusAtualizada = await updateImagemStatus(
        imagemId,
        imagemStatus
      );
      if (!imagemStatusAtualizada) {
        return res
          .status(404)
          .json({ message: "Imagem não encontrada para atualizar." });
      }
      res.json(imagemStatusAtualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao atualizar a imagem." });
    }
  }

  // Deletar uma imagem
  async delete(req: Request, res: Response) {
    const imagemId = parseInt(req.params.imagem_id);

    try {
      const imagem = await findImagemById(imagemId);
      if (!imagem) {
        return res
          .status(404)
          .json({ message: "Imagem não encontrada para deletar." });
      }

      // Deletar do Cloudinary
      const publicId = imagem.url_imagem.split("/").pop()?.split(".")[0];
      console.log(publicId);

      if (publicId) {
        await cloudinary.uploader.destroy(`colaboracoes/${publicId}`);
      }

      await deleteImagem(imagemId);
      res.json({ message: "Imagem deletada com sucesso.", imagem });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao deletar a imagem." });
    }
  }
}
