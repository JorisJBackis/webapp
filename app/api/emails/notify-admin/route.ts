import { NextRequest, NextResponse } from 'next/server'
import { transporter, emailConfig } from '@/lib/email/mailer'
import { adminNotificationTemplate } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // adminEmails is now passed from the database trigger
    const { userEmail, userType, clubName, registeredAt, adminEmails } = body

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!adminEmails || adminEmails.length === 0) {
      return NextResponse.json({ message: 'No admin emails provided' }, { status: 200 })
    }

    console.log('[Admin Notification] Sending to admin emails:', adminEmails)

    const adminPanelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://footylabs.ai'}/admin`

    // Send email to all admins
    const emailPromises = adminEmails.map((adminEmail: string) =>
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

    console.log(`Admin notification emails sent to ${adminEmails.length} admins for user: ${userEmail}`)

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${adminEmails.length} admins`
    })
  } catch (error) {
    console.error('Error sending admin notification email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: (error as Error).message },
      { status: 500 }
    )
  }
}
