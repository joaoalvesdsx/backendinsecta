import { UserController } from "../controllers/userController";
import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = Router();
const userController = new UserController();

// Rota para criar um usuário
router.post("/users", userController.create);

// Rota para buscar todos os usuários
router.get("/users", authenticateJWT, userController.getAll);

// Rota para buscar um usuário pelo ID
router.get("/users/:user_id", authenticateJWT, (req, res) => {
  userController.getById(req, res);
});

// Rota para buscar um usuário pelo e-mail
router.get("/user/email", authenticateJWT, (req, res) => {
  userController.getByUserEmail(req, res);
});

// Rota para atualizar um usuário
router.put("/users_update/:user_id", authenticateJWT, (req, res) => {
  userController.update(req, res);
});

// Rota para atualizar o tipo de um usuário
router.put("/users/:user_id/tipo", authenticateJWT, (req, res) => {
  userController.updateTipo(req, res);
});

// Rota para atualizar a senha de um usuário
router.put("/users/:user_id/senha", authenticateJWT, (req, res) => {
  userController.updateSenha(req, res);
});

// Rota para deletar um usuário
router.delete("/user_delete/:user_id", authenticateJWT, (req, res) => {
  userController.deleteById(req, res);
});

export default router;
