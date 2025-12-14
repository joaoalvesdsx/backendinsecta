import nodemailer from "nodemailer";

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, // Exemplo: "smtp.gmail.com"
      port: parseInt(process.env.EMAIL_PORT || "587", 10), // Exemplo: 587
      secure: false, // true para 465, false para outros
      auth: {
        user: process.env.EMAIL_USER, // E-mail do remetente
        pass: process.env.EMAIL_PASS, // Senha do remetente
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetLink: string
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "no-reply@meuprojeto.com",
        to: email,
        subject: "Redefinição de Senha",
        html: `
          <h1>Recuperação de Senha</h1>
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para continuar:</p>
          <a href="${resetLink}" style="color: #007bff; text-decoration: none;">Redefinir Senha</a>
          <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
          <p>Este link é válido por 1 hora.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`E-mail de recuperação enviado para ${email}`);
    } catch (error) {
      console.error("Erro ao enviar o e-mail:", error);
      throw new Error("Erro ao enviar o e-mail de recuperação.");
    }
  }
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/activate-account?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || "no-reply@meuprojeto.com",
        to: email,
        subject: "Verificação de E-mail",
        html: `
        <h1>Verifique seu e-mail</h1>
        <p>Obrigado por se registrar!</p>
        <p>Clique no link abaixo para verificar seu endereço de e-mail e ativar sua conta:</p>
        <a href="${verificationLink}" style="color: #28a745; text-decoration: none;">Verificar E-mail</a>
        <p>Este link expira em 24 horas.</p>
      `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`E-mail de verificação enviado para ${email}`);
    } catch (error) {
      console.error("Erro ao enviar o e-mail de verificação:", error);
      throw new Error("Erro ao enviar o e-mail de verificação.");
    }
  }
}
