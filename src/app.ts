import express from "express";
import { connectToDatabase } from "./database/connection";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import colaboracaoRoutes from "./routes/colaboracaoRoutes";
import comentarioRoutes from "./routes/comentarioRoutes";
import imagemRoutes from "./routes/imagemRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import searchRoutes from "./routes/searchRoutes";
import routes from "./routes";
import cors from "cors";

const app = express();

// Configuração do CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080", // URL do frontend
    credentials: true,
  })
);

// Middlewares
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(routes);
app.use(userRoutes); // Usando as rotas de usuário aqui
app.use(authRoutes); // Usando as rotas de autenticação aqui
app.use(colaboracaoRoutes); // Usando as rotas de colaboração aqui
app.use(comentarioRoutes); // Usando as rotas de comentário aqui
app.use(imagemRoutes); // Usando as rotas de imagem aqui
app.use("/admin/dashboard", dashboardRoutes); // Usando as rotas do dashboard aqui
app.use("/api", searchRoutes); // Usando as rotas de busca aqui

// Inicializar o banco de dados
connectToDatabase();

export default app;
