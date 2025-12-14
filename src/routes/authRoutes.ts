import { Router } from "express";
import { AuthController } from "../controllers/authController"; // Importar os controladores necessários

const router = Router();
const authController = new AuthController();

// Rota para login
router.post("/login", (req, res) => {
  authController.login(req, res);
});

// Rota para solicitar recuperação de senha (enviar link para redefinição)
router.post("/request-password-reset", (req, res) => {
  authController.requestPasswordReset(req, res);
});

// Rota para redefinição de senha
router.post("/reset-password", (req, res) => {
  authController.resetPassword(req, res);
});

// Rota para registrar um novo usuário
router.post("/register", (req, res) => {
  authController.register(req, res);
});

// Rota para verificar o e-mail do usuário
router.get("/verify-email", (req, res) => {
  authController.verificarEmail(req, res);
});

export default router;
