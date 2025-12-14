import app from "./app";

const PORT = process.env.PORT || 3000;

// Para Vercel, não iniciar o servidor em modo serverless
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

export default app;
