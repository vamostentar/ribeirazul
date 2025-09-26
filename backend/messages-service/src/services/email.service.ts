import { config } from '@/utils/config';
import { createLogger } from '@/utils/logger';
import nodemailer, { Transporter } from 'nodemailer';
import { CircuitBreakerService } from './circuit-breaker.service';
import { MetricsService } from './metrics.service';

export interface EmailData {
  fromName: string;
  fromEmail: string;
  phone?: string;
  body: string;
  subject?: string;
  to?: string;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  response: string;
}

export class EmailService {
  private transporter!: Transporter;
  private logger = createLogger({ service: 'EmailService' });
  private circuitBreaker: any;

  constructor(
    private metricsService: MetricsService,
    private circuitBreakerService: CircuitBreakerService
  ) {
    this.initializeTransporter();
    this.initializeCircuitBreaker();
  }

  private initializeTransporter(): void {
    try {
      // Check if SMTP is configured
      if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
        this.logger.warn('SMTP not fully configured, email service will be disabled', {
          hasHost: !!config.SMTP_HOST,
          hasUser: !!config.SMTP_USER,
          hasPass: !!config.SMTP_PASS,
        });
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
        connectionTimeout: config.EMAIL_TIMEOUT,
        greetingTimeout: config.EMAIL_TIMEOUT,
        socketTimeout: config.EMAIL_TIMEOUT,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14, // messages per second
        rateDelta: 1000, // 1 second
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('SMTP connection verification failed', {
            error: error.message,
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
          });
        } else {
          this.logger.info('SMTP connection verified successfully', {
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
          });
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to initialize email transporter', {
        error: error.message,
      });
      throw error;
    }
  }

  private initializeCircuitBreaker(): void {
    this.circuitBreaker = this.circuitBreakerService.createCircuitBreaker(
      'email-service',
      this.sendEmailInternal.bind(this),
      {
        timeout: config.CIRCUIT_BREAKER_TIMEOUT,
        errorThresholdPercentage: config.CIRCUIT_BREAKER_ERROR_THRESHOLD,
        resetTimeout: config.CIRCUIT_BREAKER_RESET_TIMEOUT,
        onOpen: () => {
          this.logger.circuitBreaker('email-service', 'open');
          this.metricsService.incrementCounter('email_circuit_breaker_open_total');
        },
        onHalfOpen: () => {
          this.logger.circuitBreaker('email-service', 'half-open');
          this.metricsService.incrementCounter('email_circuit_breaker_half_open_total');
        },
        onClose: () => {
          this.logger.circuitBreaker('email-service', 'closed');
          this.metricsService.incrementCounter('email_circuit_breaker_close_total');
        },
      }
    );
  }

  /**
   * Send contact email (public interface with circuit breaker)
   */
  async sendContactEmail(data: EmailData): Promise<EmailResult> {
    const startTime = Date.now();
    const emailLogger = this.logger.child({ 
      operation: 'sendContactEmail',
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    });

    try {
      // Check if email service is configured
      if (!this.transporter) {
        emailLogger.warn('Email service not configured, skipping email send');
        
        return {
          messageId: `mock-${Date.now()}`,
          accepted: [data.fromEmail],
          rejected: [],
          pending: [],
          response: 'Email service not configured - message logged only',
        };
      }

      emailLogger.info('Sending contact email', {
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        hasPhone: !!data.phone,
        bodyLength: data.body.length,
      });

      // Use circuit breaker
      const result = await this.circuitBreaker.fire(data);

      const duration = Date.now() - startTime;
      
      emailLogger.external('smtp', 'sendContactEmail', duration, true, {
        messageId: result.messageId,
        accepted: result.accepted.length,
        rejected: result.rejected.length,
      });

      // Update metrics
      this.metricsService.incrementCounter('emails_sent_total');
      this.metricsService.recordHistogram('email_send_duration_ms', duration);

      // Business log
      emailLogger.business('contact_email_sent', {
        fromEmail: data.fromEmail,
        messageId: result.messageId,
        duration,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      emailLogger.external('smtp', 'sendContactEmail', duration, false, {
        error: error.message,
        fromEmail: data.fromEmail,
      });

      // Update metrics
      this.metricsService.incrementCounter('emails_failed_total');
      this.metricsService.recordHistogram('email_send_duration_ms', duration);

      throw error;
    }
  }

  /**
   * Internal email sending method (used by circuit breaker)
   */
  private async sendEmailInternal(data: EmailData): Promise<EmailResult> {
    const subject = data.subject || `Novo contacto: ${data.fromName}`;
    const to = data.to || config.EMAIL_FROM;

    const html = this.generateEmailTemplate(data);

    const mailOptions = {
      from: config.EMAIL_FROM,
      to,
      subject,
      html,
      replyTo: data.fromEmail,
      headers: {
        'X-Message-Source': 'ribeirazul-messages-service',
        'X-Priority': '3',
      },
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        messageId: info.messageId,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || [],
        response: info.response,
      };
    } catch (error: any) {
      // Log detailed SMTP error
      this.logger.error('SMTP send failed', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
      });

      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(data: EmailData): string {
    const { fromName, fromEmail, phone, body } = data;
    
    return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Novo Contacto - Ribeira Azul</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          margin: -30px -30px 30px -30px;
        }
        .field {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-left: 4px solid #2563eb;
          border-radius: 4px;
        }
        .field-label {
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 5px;
        }
        .field-value {
          color: #495057;
        }
        .message-body {
          background-color: #ffffff;
          padding: 20px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          font-size: 12px;
          color: #6c757d;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Novo Contacto Recebido</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Ribeira Azul - Sistema de Mensagens</p>
        </div>
        
        <div class="field">
          <div class="field-label">Nome:</div>
          <div class="field-value">${this.escapeHtml(fromName)}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Email:</div>
          <div class="field-value">
            <a href="mailto:${fromEmail}" style="color: #2563eb; text-decoration: none;">
              ${this.escapeHtml(fromEmail)}
            </a>
          </div>
        </div>
        
        ${phone ? `
        <div class="field">
          <div class="field-label">Telefone:</div>
          <div class="field-value">
            <a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">
              ${this.escapeHtml(phone)}
            </a>
          </div>
        </div>
        ` : ''}
        
        <div class="field">
          <div class="field-label">Mensagem:</div>
          <div class="message-body">${this.escapeHtml(body)}</div>
        </div>
        
        <div class="footer">
          <p>Esta mensagem foi enviada através do formulário de contacto do website Ribeira Azul.</p>
          <p>Data: ${new Date().toLocaleString('pt-PT')}</p>
          <p>Para responder, utilize o botão "Responder" do seu cliente de email ou responda directamente para: ${fromEmail}</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<EmailResult> {
    const startTime = Date.now();
    const emailLogger = this.logger.child({ 
      operation: 'sendCustomEmail',
      to,
      subject,
    });

    try {
      const mailOptions = {
        from: config.EMAIL_FROM,
        to,
        subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Message-Source': 'ribeirazul-messages-service',
          'X-Priority': '3',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      const result: EmailResult = {
        messageId: info.messageId,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        pending: info.pending || [],
        response: info.response,
      };

      const duration = Date.now() - startTime;
      
      emailLogger.external('smtp', 'sendCustomEmail', duration, true, {
        messageId: result.messageId,
        to,
      });

      this.metricsService.incrementCounter('custom_emails_sent_total');
      this.metricsService.recordHistogram('email_send_duration_ms', duration);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      emailLogger.external('smtp', 'sendCustomEmail', duration, false, {
        error: error.message,
        to,
      });

      this.metricsService.incrementCounter('custom_emails_failed_total');
      
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.info('Email connection test successful');
      return true;
    } catch (error: any) {
      this.logger.error('Email connection test failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get email service health
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    lastCheck: Date;
    details: any;
  }> {
    const lastCheck = new Date();
    
    try {
      const isConnected = await this.testConnection();
      const circuitBreakerState = this.circuitBreaker.state;
      
      return {
        status: isConnected && circuitBreakerState === 'closed' ? 'healthy' : 'unhealthy',
        lastCheck,
        details: {
          smtpConnected: isConnected,
          circuitBreakerState,
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_SECURE,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        lastCheck,
        details: {
          error: error.message,
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
        },
      };
    }
  }

  /**
   * Cleanup and close connections
   */
  async close(): Promise<void> {
    try {
      this.transporter.close();
      this.logger.info('Email service connections closed');
    } catch (error: any) {
      this.logger.error('Error closing email service connections', {
        error: error.message,
      });
    }
  }
}
