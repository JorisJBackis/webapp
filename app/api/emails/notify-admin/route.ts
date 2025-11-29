import { NextRequest, NextResponse } from 'next/server'
import { transporter, emailConfig } from '@/lib/email/mailer'
import { adminNotificationTemplate } from '@/lib/email/templates'

// Admin emails - update this list when admins change
const ADMIN_EMAILS = [
  'jorisbackis@gmail.com',
  'sviatoslav.zubrytskiy@gmail.com',
  'danius.jean@footylabs.ai',
  'aleksisjonaslesieur@gmail.com'
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, userType, clubName, registeredAt, adminEmails } = body

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use provided adminEmails or fall back to hardcoded list
    const emailsToNotify = (adminEmails && adminEmails.length > 0) ? adminEmails : ADMIN_EMAILS

    console.log('[Admin Notification] Sending to admin emails:', emailsToNotify)

    const adminPanelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://footylabs.ai'}/admin`

    // Send email to all admins
    const emailPromises = emailsToNotify.map((adminEmail: string) =>
      transporter.sendMail({
        from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
        to: adminEmail,
        subject: '🔔 New User Registration - Footy Labs',
        html: adminNotificationTemplate({
          userEmail,
          userType,
          clubName,
          registeredAt,
          adminPanelUrl,
        }),
      })
    )

    await Promise.all(emailPromises)

    console.log(`Admin notification emails sent to ${emailsToNotify.length} admins for user: ${userEmail}`)

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${emailsToNotify.length} admins`
    })
  } catch (error) {
    console.error('Error sending admin notification email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: (error as Error).message },
      { status: 500 }
    )
  }
}
