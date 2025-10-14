import nodemailer from 'nodemailer'

// Create reusable transporter using Office365 SMTP
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Email sender configuration
export const emailConfig = {
  from: {
    name: process.env.SMTP_SENDER_NAME || 'Footy Labs',
    address: process.env.SMTP_SENDER_EMAIL || 'noreply@footylabs.ai',
  },
}

// Verify transporter configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify()
    console.log('Email transporter is ready')
    return true
  } catch (error) {
    console.error('Email transporter error:', error)
    return false
  }
}
