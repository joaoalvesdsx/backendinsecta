# Deploy no Vercel - Backend Insecta

## Passo 1: Preparar o Projeto

O projeto já está configurado com os arquivos necessários:
- `vercel.json` - Configuração do Vercel
- `.vercelignore` - Arquivos a serem ignorados
- `api/index.ts` - Entry point para o Vercel

## Passo 2: Instalar Vercel CLI (Opcional)

```bash
npm install -g vercel
```

## Passo 3: Deploy via Vercel Dashboard (Recomendado)

1. Acesse https://vercel.com e faça login
2. Clique em "Add New Project"
3. Importe seu repositório Git
4. Configure as seguintes variáveis de ambiente:

### Variáveis de Ambiente Necessárias:

```
NODE_ENV=production
PORT=3000

# Database
DB_HOST=seu_host_mysql
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco

# JWT
JWT_SECRET=seu_jwt_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# Frontend
FRONTEND_URL=https://seu-frontend.vercel.app

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_app
```

5. Em "Build & Development Settings":
   - **Framework Preset**: Other
   - **Build Command**: `npm run build` (ou deixe vazio)
   - **Output Directory**: dist (ou deixe vazio)
   - **Install Command**: `npm install`

6. Clique em "Deploy"

## Passo 4: Deploy via CLI (Alternativa)

```bash
# Login no Vercel
vercel login

# Deploy para produção
vercel --prod
```

## Importante: Configuração do Banco de Dados

⚠️ **ATENÇÃO**: O Vercel é uma plataforma serverless, então você precisa de um banco de dados externo. Opções recomendadas:

1. **PlanetScale** (MySQL compatível, gratuito): https://planetscale.com
2. **Railway** (MySQL, PostgreSQL): https://railway.app
3. **Amazon RDS** (pago)
4. **Google Cloud SQL** (pago)

### Configurar PlanetScale (Recomendado para MySQL)

1. Crie uma conta em https://planetscale.com
2. Crie um novo banco de dados
3. Obtenha a connection string
4. Adicione as variáveis no Vercel

## Passo 5: Testar o Deploy

Após o deploy, teste sua API:

```bash
# Health check
curl https://seu-projeto.vercel.app/health

# Testar rota de autenticação
curl https://seu-projeto.vercel.app/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Solução de Problemas

### Erro de CORS
Certifique-se de que a variável `FRONTEND_URL` está configurada corretamente.

### Erro de Banco de Dados
- Verifique se as credenciais estão corretas
- Certifique-se de que o banco permite conexões externas
- Use SSL se necessário (PlanetScale requer SSL)

### Timeout
Vercel tem um limite de 10 segundos para funções serverless (plano gratuito).
Se suas operações demoram muito, considere otimizar queries ou usar plano pago.

## URLs Úteis

- Dashboard Vercel: https://vercel.com/dashboard
- Documentação: https://vercel.com/docs
- Logs: https://vercel.com/[seu-usuario]/[seu-projeto]/logs
