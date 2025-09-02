import nodemailer from 'nodemailer';
import type { User, EnergyTrade, Household } from '../shared/schema';

interface EmailNotificationData {
  offerCreator: User;
  acceptor: User;
  trade: EnergyTrade;
  household: Household;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // For development, use Gmail SMTP with app passwords
      // In production, you would use a service like SendGrid, Mailgun, etc.
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
        },
      });

      // Verify the connection
      if (this.transporter) {
        await this.transporter.verify();
        console.log('📧 Email service initialized successfully');
      }
    } catch (error) {
      console.warn('⚠️ Email service initialization failed:', error);
      // Gracefully handle email service failure
      this.transporter = null;
    }
  }

  async sendTradeAcceptanceNotification(data: EmailNotificationData): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const { offerCreator, acceptor, trade, household } = data;
      
      const subject = `✅ Your Energy Trade Offer Has Been Accepted! - SolarSense`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🌞 SolarSense Energy Trading</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Sustainable Energy Trading Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #10b981; margin-top: 0;">Great News! Your Energy Offer Has Been Accepted 🎉</h2>
            
            <p>Hello <strong>${offerCreator.username}</strong>,</p>
            
            <p>Someone has accepted your energy trade offer! Here are the details:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #374151;">📊 Trade Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Energy Amount:</strong> ${trade.energyAmount} kWh</li>
                <li style="margin: 8px 0;"><strong>Price per kWh:</strong> ₹${trade.pricePerKwh}</li>
                <li style="margin: 8px 0;"><strong>Total Value:</strong> ₹${(trade.energyAmount * trade.pricePerKwh).toFixed(2)}</li>
                <li style="margin: 8px 0;"><strong>Trade Type:</strong> ${trade.tradeType === 'sell' ? '🔋 Selling Energy' : '⚡ Buying Energy'}</li>
              </ul>
            </div>
            
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #374151;">👤 Accepted By</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Username:</strong> ${acceptor.username}</li>
                <li style="margin: 8px 0;"><strong>Household:</strong> ${household.name}</li>
                <li style="margin: 8px 0;"><strong>Location:</strong> ${acceptor.district}, ${acceptor.state}</li>
              </ul>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #374151;">🔄 Next Steps</h3>
              <ol style="color: #374151; line-height: 1.6;">
                <li>Log into your SolarSense dashboard to view full contact details</li>
                <li>Coordinate with the other party for energy delivery/pickup</li>
                <li>Confirm the energy transfer once completed</li>
                <li>Rate your trading experience</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${'https://solarsense-ai.onrender.com/'}" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📱 View Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              🌍 SolarSense - Building a sustainable energy future together<br>
              Decentralized • Resilient • Equitable
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: offerCreator.email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Trade acceptance notification sent to ${offerCreator.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send trade acceptance notification:', error);
      return false;
    }
  }

  async sendContactSharingNotification(
    recipient: User, 
    sender: User, 
    trade: EnergyTrade
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `📞 Contact Details Shared - Energy Trade #${trade.id} - SolarSense`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📞 Contact Information Shared</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Energy Trade #${trade.id}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #3b82f6; margin-top: 0;">Contact Details Available 📱</h2>
            
            <p>Hello <strong>${recipient.username}</strong>,</p>
            
            <p>Contact information has been shared for your energy trade. You can now coordinate directly with:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #374151;">👤 Contact Information</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Name:</strong> ${sender.username}</li>
                <li style="margin: 8px 0;"><strong>Email:</strong> ${sender.email}</li>
                <li style="margin: 8px 0;"><strong>Phone:</strong> ${sender.phone || 'Not provided'}</li>
                <li style="margin: 8px 0;"><strong>Location:</strong> ${sender.district}, ${sender.state}</li>
              </ul>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              Please reach out to coordinate the energy transfer details, timing, and any technical requirements.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${'https://solarsense-ai.onrender.com/'}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📱 View Dashboard
              </a>
            </div>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Contact sharing notification sent to ${recipient.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send contact sharing notification:', error);
      return false;
    }
  }

  // Test email functionality
  async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: '🔧 SolarSense Email Service Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #10b981;">✅ Email Service Working!</h2>
            <p>This is a test email from your SolarSense application.</p>
            <p>Email notifications are now properly configured.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Test email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();