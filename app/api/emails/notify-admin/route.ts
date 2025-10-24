import { NextRequest, NextResponse } from 'next/server'
import { transporter, emailConfig } from '@/lib/email/mailer'
import { adminNotificationTemplate } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify request is from Supabase with API key
    // Uncomment these lines if you want to add API key security
    // const authHeader = request.headers.get('authorization')
    // const expectedKey = process.env.EMAIL_API_SECRET_KEY
    // if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { userEmail, userType, clubName, registeredAt } = body

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get admin emails by joining admin_users with auth.users
    const supabase = await createClient()

    // First get admin user IDs from admin_users table
    const { data: adminUsers } = await supabase
      .from('admin_users')
      .select('id')
      .limit(100)

    if (!adminUsers || adminUsers.length === 0) {
      return NextResponse.json({ message: 'No admins found' }, { status: 200 })
    }

    // Create service role client to access auth.users
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the emails from auth.users using the service role client
    const adminEmails: string[] = []
    for (const admin of adminUsers) {
      try {
        const { data: { user }, error } = await serviceClient.auth.admin.getUserById(admin.id)
        if (user?.email) {
          adminEmails.push(user.email)
        } else {
          console.error(`No email found for admin ${admin.id}:`, error)
        }
      } catch (err) {
        console.error(`Error fetching user ${admin.id}:`, err)
      }
    }

    console.log('[Admin Notification] Found admin emails:', adminEmails)

    if (adminEmails.length === 0) {
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
