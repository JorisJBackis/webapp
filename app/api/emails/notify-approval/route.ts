import { NextRequest, NextResponse } from 'next/server'
import { transporter, emailConfig } from '@/lib/email/mailer'
import { userApprovedTemplate } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    // Verify request is from Supabase (optional: add API key verification)
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.EMAIL_API_SECRET_KEY

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userEmail, userName } = body

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://footylabs.ai'}/dashboard`

    // Send approval email
    await transporter.sendMail({
      from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
      to: userEmail,
      subject: '🎉 Your Footy Labs Account Has Been Approved!',
      html: userApprovedTemplate({
        userName,
        dashboardUrl,
      }),
    })

    console.log(`Approval notification sent to: ${userEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Approval notification sent successfully'
    })
  } catch (error) {
    console.error('Error sending approval notification email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}
