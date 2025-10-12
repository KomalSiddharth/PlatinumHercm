import type { User } from '@shared/schema';

interface EmailServiceConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  apiKey?: string;
  from: string;
}

class EmailService {
  private config: EmailServiceConfig | null = null;

  initialize(config: EmailServiceConfig) {
    this.config = config;
  }

  async sendWeeklyReminder(user: User, weekNumber: number): Promise<boolean> {
    if (!this.config) {
      console.warn('Email service not configured - skipping email send');
      return false;
    }

    const emailContent = {
      to: user.email!,
      from: this.config.from,
      subject: `⏰ Week ${weekNumber} HRCM Check-in Reminder`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Hi ${user.firstName || 'there'}! 👋</h2>
          <p style="font-size: 16px; color: #374151;">
            It's time for your Week ${weekNumber} HRCM check-in!
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            Track your progress in Health, Relationship, Career, and Money to achieve your Platinum Standards.
          </p>
          <div style="margin: 30px 0; padding: 20px; background: #eff6ff; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #374151;">
              <strong>Remember:</strong> Monthly progress > 80% = Platinum Badge! 🏆
            </p>
          </div>
          <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'your-app-url'}/dashboard" 
             style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Start Week ${weekNumber} Check-in
          </a>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
            Platinum HRCM Dashboard - Your Personal Growth Companion
          </p>
        </div>
      `
    };

    try {
      if (this.config.provider === 'resend' && this.config.apiKey) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailContent)
        });
        
        if (!response.ok) {
          throw new Error(`Resend API error: ${response.statusText}`);
        }
        return true;
      } else if (this.config.provider === 'sendgrid' && this.config.apiKey) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: emailContent.to }] }],
            from: { email: emailContent.from },
            subject: emailContent.subject,
            content: [{ type: 'text/html', value: emailContent.html }]
          })
        });
        
        if (!response.ok) {
          throw new Error(`SendGrid API error: ${response.statusText}`);
        }
        return true;
      }
      
      console.warn(`Unsupported email provider: ${this.config.provider}`);
      return false;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendPlatinumBadgeNotification(user: User): Promise<boolean> {
    if (!this.config) {
      console.warn('Email service not configured - skipping email send');
      return false;
    }

    const emailContent = {
      to: user.email!,
      from: this.config.from,
      subject: '🏆 Congratulations! Platinum Standards Achieved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 40px; border-radius: 12px; margin-bottom: 30px;">
            <h1 style="color: white; font-size: 32px; margin: 0;">🏆 PLATINUM ACHIEVED! 🏆</h1>
          </div>
          <h2 style="color: #1e40af;">Congratulations ${user.firstName || 'Champion'}!</h2>
          <p style="font-size: 18px; color: #374151;">
            You've achieved <strong>Platinum Standards</strong> with over 80% monthly progress!
          </p>
          <div style="margin: 30px 0; padding: 30px; background: #fef3c7; border-radius: 8px;">
            <p style="font-size: 16px; color: #92400e; margin: 0;">
              This is a remarkable achievement in your personal growth journey. Your dedication to Health, Relationship, Career, and Money excellence is truly inspiring!
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            Keep up the amazing work and continue your journey to excellence!
          </p>
          <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'your-app-url'}/dashboard" 
             style="display: inline-block; padding: 14px 28px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold;">
            View Your Dashboard
          </a>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 40px;">
            Platinum HRCM Dashboard - Excellence in Every Area
          </p>
        </div>
      `
    };

    try {
      if (this.config.provider === 'resend' && this.config.apiKey) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailContent)
        });
        
        if (!response.ok) {
          throw new Error(`Resend API error: ${response.statusText}`);
        }
        return true;
      } else if (this.config.provider === 'sendgrid' && this.config.apiKey) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: emailContent.to }] }],
            from: { email: emailContent.from },
            subject: emailContent.subject,
            content: [{ type: 'text/html', value: emailContent.html }]
          })
        });
        
        if (!response.ok) {
          throw new Error(`SendGrid API error: ${response.statusText}`);
        }
        return true;
      }
      
      console.warn(`Unsupported email provider: ${this.config.provider}`);
      return false;
    } catch (error) {
      console.error('Failed to send platinum badge email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();

// Initialize email service if credentials are available
const emailApiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;
const emailProvider = process.env.RESEND_API_KEY ? 'resend' : process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp';
const emailFrom = process.env.EMAIL_FROM || 'noreply@hrcm.app';

if (emailApiKey) {
  emailService.initialize({
    provider: emailProvider,
    apiKey: emailApiKey,
    from: emailFrom
  });
  console.log(`Email service initialized with ${emailProvider}`);
} else {
  console.warn('No email API key found - email notifications disabled. Set RESEND_API_KEY or SENDGRID_API_KEY to enable.');
}
