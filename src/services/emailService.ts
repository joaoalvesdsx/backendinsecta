import { Resend } from "resend";

export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY não configurada nas variáveis de ambiente"
      );
    }
    this.resend = new Resend(apiKey);
  }

  async sendPasswordResetEmail(
    email: string,
    resetLink: string
  ): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || "Insecta <onboarding@resend.dev>",
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
      });

      if (error) {
        console.error("Erro Resend:", error);
        throw new Error(`Erro ao enviar email: ${error.message}`);
      }

      console.log(
        `E-mail de recuperação enviado para ${email}. ID: ${data?.id}`
      );
    } catch (error) {
      console.error("Erro ao enviar o e-mail:", error);
      throw new Error("Erro ao enviar o e-mail de recuperação.");
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/activate-account?token=${token}`;

      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || "Insecta <onboarding@resend.dev>",
        to: email,
        subject: "Verificação de E-mail",
        html: `
          <h1>Verifique seu e-mail</h1>
          <p>Obrigado por se registrar!</p>
          <p>Clique no link abaixo para verificar seu endereço de e-mail e ativar sua conta:</p>
          <a href="${verificationLink}" style="color: #28a745; text-decoration: none;">Verificar E-mail</a>
          <p>Este link expira em 24 horas.</p>
        `,
      });

      if (error) {
        console.error("Erro Resend:", error);
        throw new Error(`Erro ao enviar email: ${error.message}`);
      }

      console.log(
        `E-mail de verificação enviado para ${email}. ID: ${data?.id}`
      );
    } catch (error) {
      console.error("Erro ao enviar o e-mail de verificação:", error);
      throw new Error("Erro ao enviar o e-mail de verificação.");
    }
  }
}
