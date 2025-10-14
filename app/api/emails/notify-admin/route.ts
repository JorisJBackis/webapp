import { NextRequest, NextResponse } from 'next/server'
import { transporter, emailConfig } from '@/lib/email/mailer'
import { adminNotificationTemplate } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify request is from Supabase (optional: add API key verification)
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.EMAIL_API_SECRET_KEY

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userEmail, userType, clubName, registeredAt } = body

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get all admin emails from database
    const supabase = await createClient()
    const { data: admins } = await supabase
      .from('admin_users')
      .select('id, profiles!inner(id)')
      .limit(100)

    if (!admins || admins.length === 0) {
      console.log('No admins found to notify')
      return NextResponse.json({ message: 'No admins to notify' }, { status: 200 })
    }

    // Get admin emails from auth.users
    const adminIds = admins.map(admin => admin.id)
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const adminEmails = users
      .filter(user => adminIds.includes(user.id))
      .map(user => user.email)
      .filter(Boolean)

    if (adminEmails.length === 0) {
      console.log('No admin emails found')
      return NextResponse.json({ message: 'No admin emails found' }, { status: 200 })
    }

    const adminPanelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://footylabs.ai'}/admin`

    // Send email to all admins
    const emailPromises = adminEmails.map(adminEmail =>
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
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}
