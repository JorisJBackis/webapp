// Email template styles
const emailStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      height: 50px;
      width: auto;
      margin-bottom: 16px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    .info-card {
      background: #f9fafb;
      border-radius: 6px;
      padding: 16px;
      margin: 24px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #1a1a1a;
      font-weight: 600;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 24px 0;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .alert {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .success {
      background: #f0fdf4;
      border-left: 4px solid #22c55e;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
  </style>
`

interface AdminNotificationData {
  userEmail: string
  userType: string
  clubName?: string
  registeredAt: string
  adminPanelUrl: string
}

export function adminNotificationTemplate(data: AdminNotificationData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://jbqljjyctbsyawijlxfa.supabase.co/storage/v1/object/public/footylabs-logo/logo.png" alt="Footy Labs" class="logo">
            <h1>🔔 New User Registration</h1>
          </div>

          <p>A new user has registered and is awaiting approval.</p>

          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${data.userEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">User Type:</span>
              <span class="info-value">${data.userType}</span>
            </div>
            ${data.clubName ? `
              <div class="info-row">
                <span class="info-label">Club:</span>
                <span class="info-value">${data.clubName}</span>
              </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Registered:</span>
              <span class="info-value">${new Date(data.registeredAt).toLocaleString()}</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${data.adminPanelUrl}" class="button">
              Review in Admin Panel
            </a>
          </div>

          <div class="footer">
            <p>This is an automated notification from Footy Labs</p>
            <p>Admin Panel: <a href="${data.adminPanelUrl}">${data.adminPanelUrl}</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

interface UserApprovedData {
  userName: string
  dashboardUrl: string
}

export function userApprovedTemplate(data: UserApprovedData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://jbqljjyctbsyawijlxfa.supabase.co/storage/v1/object/public/footylabs-logo/logo.png" alt="Footy Labs" class="logo">
            <h1>🎉 Welcome to Footy Labs!</h1>
          </div>

          <div class="success">
            <strong>Your account has been approved!</strong>
          </div>

          <p>Hi ${data.userName || 'there'},</p>

          <p>Great news! Your Footy Labs account has been approved and you now have full access to the platform.</p>

          <p>You can now:</p>
          <ul>
            <li>Access advanced player analytics and scouting tools</li>
            <li>Browse the transfer marketplace</li>
            <li>Post recruitment needs</li>
            <li>Connect with clubs, agents, and players worldwide</li>
          </ul>

          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="button">
              Go to Dashboard
            </a>
          </div>

          <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>

          <div class="footer">
            <p>Welcome to the Footy Labs community!</p>
            <p>Need help? Contact us at <a href="mailto:support@footylabs.com">support@footylabs.com</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

interface UserRejectedData {
  userName: string
  rejectionReason: string
  supportEmail: string
}

export function userRejectedTemplate(data: UserRejectedData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://jbqljjyctbsyawijlxfa.supabase.co/storage/v1/object/public/footylabs-logo/logo.png" alt="Footy Labs" class="logo">
            <h1>Registration Update</h1>
          </div>

          <p>Hi ${data.userName || 'there'},</p>

          <p>Thank you for your interest in Footy Labs. Unfortunately, we're unable to approve your registration at this time.</p>

          <div class="alert">
            <strong>Reason:</strong>
            <p style="margin: 8px 0 0 0;">${data.rejectionReason}</p>
          </div>

          <p>If you believe this was a mistake or would like more information, please don't hesitate to contact our support team. We're here to help!</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="mailto:${data.supportEmail}" class="button">
              Contact Support
            </a>
          </div>

          <div class="footer">
            <p>Questions? We're here to help.</p>
            <p>Email us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}
