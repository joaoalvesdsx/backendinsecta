import { Router } from "express";
import { ColaboracaoController } from "../controllers/ColaboracaoController";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = Router();
const colaboracaoController = new ColaboracaoController();

// Rota para criar uma nova colaboração (requere autenticação)
router.post("/colaboracoes/:user_id", authenticateJWT, (req, res) => {
  colaboracaoController.create(req, res);
});

// Rota para buscar todas as colaborações com DTO (retorna user { user_id, nome_completo })
router.get("/colaboracoes", authenticateJWT, (req, res) => {
  colaboracaoController.listDTO(req, res);
});

// Rota para buscar uma colaboração pelo ID (não requer autenticação)
router.get("/colaboracoes/:colaboracao_id", authenticateJWT, (req, res) => {
  colaboracaoController.getById(req, res);
});

// Rota para atualizar uma colaboração (requere autenticação)
router.put("/colaboracoes/:colaboracao_id", authenticateJWT, (req, res) => {
  colaboracaoController.update(req, res);
});

// Rota para deletar uma colaboração pelo ID (requere autenticação)
router.delete("/colaboracoes/:colaboracao_id", authenticateJWT, (req, res) => {
  colaboracaoController.deleteById(req, res);
});

// Rota para buscar colaborações por nome de espécie (não requer autenticação)
router.get(
  "/colaboracoes/especie/:nomeEspecie",
  authenticateJWT,
  (req, res) => {
    colaboracaoController.getByEspecie(req, res);
  }
);

// Rota para buscar colaborações por User ID (requere autenticação)
router.get("/colaboracoes/usuario/:user_id", authenticateJWT, (req, res) => {
  colaboracaoController.getByUserId(req, res);
});

router.post("/colaboracoes-filtros", authenticateJWT, (req, res) => {
  console.log("Chegou");
  colaboracaoController.filterColaboracoes(req, res);
});

export default router;
