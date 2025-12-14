import { Router } from "express";
import { ColaboracaoController } from "../controllers/ColaboracaoController";

const router = Router();
const colaboracaoController = new ColaboracaoController();

// Rota de busca avançada com filtros server-side
// GET /api/search/colaboracoes
router.get("/search/colaboracoes", (req, res) => {
  colaboracaoController.search(req, res);
});

export default router;
