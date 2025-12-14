import { Router } from "express";
import { ImagemController } from "../controllers/imagemController";
import multer from "multer";
import { authenticateJWT } from "../middlewares/authMiddleware";

// Configuração melhorada do multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log("📁 Multer processando arquivo:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      const error = new Error("Apenas imagens são permitidas") as any;
      cb(error, false);
    }
  },
});

const imagemController = new ImagemController();
const router = Router();

// Listar todas as imagens
router.get("/imagens", authenticateJWT, (req, res) => {
  imagemController.getAll(req, res);
});

// Buscar uma imagem pelo ID
router.get("/imagens/:imagem_id", authenticateJWT, (req, res) => {
  imagemController.getById(req, res);
});

// Buscar imagens por ID da colaboração
router.get(
  "/imagens/colaboracao/:colaboracao_id",
  authenticateJWT,
  (req, res) => {
    imagemController.getByColaboracaoId(req, res);
  }
);

// Buscar uma imagem pelo Codigo da Imagem
router.get("/imagens/codigo/:codigo_imagem", authenticateJWT, (req, res) => {
  imagemController.getByCodImagem(req, res);
});

// Upload de uma nova imagem - ORDEM CORRIGIDA
router.post(
  "/imagens/:colaboracao_id/upload",
  authenticateJWT, // ← AUTH PRIMEIRO
  upload.single("imagem"), // ← MULTER DEPOIS
  (req, res) => {
    console.log("🎯 Chegou no controller com file:", req.file ? "SIM" : "NÃO");
    imagemController.create(req, res);
  }
);

// Atualizar uma imagem existente informacoes
router.put("/imagens/:imagem_id", authenticateJWT, (req, res) => {
  imagemController.update(req, res);
});

// Atualizar uma imagem existente
router.put("/imagens/status/:imagem_id", authenticateJWT, (req, res) => {
  imagemController.updateImagemStatus(req, res); // ← CORRIGIDO: era .update
});

// Deletar uma imagem
router.delete("/imagens/:imagem_id", authenticateJWT, (req, res) => {
  imagemController.delete(req, res);
});

export default router;
