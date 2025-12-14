import { ComentarioController } from "../controllers/comentarioController";
import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = Router();
const commentController = new ComentarioController();

// LISTAR comentários de uma colaboração
router.get(
  "/colaboracoes/:colaboracao_id/comentarios",
  authenticateJWT,
  (req, res) => {
    commentController.getByColaboracaoIdRest(req, res);
  }
);

// CRIAR comentário em uma colaboração
router.post(
  "/colaboracoes/:colaboracao_id/comentarios",
  authenticateJWT,
  (req, res) => {
    commentController.create(req, res);
  }
);

// OBTER comentário individual
router.get("/comentarios/:comentario_id", authenticateJWT, (req, res) => {
  commentController.getById(req, res);
});

// ATUALIZAR comentário
router.patch("/comentarios/:comentario_id", authenticateJWT, (req, res) => {
  commentController.update(req, res);
});

// DELETAR comentário
router.delete("/comentarios/:comentario_id", authenticateJWT, (req, res) => {
  commentController.deleteById(req, res);
});

export default router;
