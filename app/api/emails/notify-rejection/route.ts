import { NextRequest, NextResponse } from 'next/server'
import { transporter, emailConfig } from '@/lib/email/mailer'
import { userRejectedTemplate } from '@/lib/email/templates'

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
    const { userEmail, userName, rejectionReason } = body

    if (!userEmail || !rejectionReason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supportEmail = 'support@footylabs.com'

    // Send rejection email
    await transporter.sendMail({
      from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
      to: userEmail,
      subject: 'Footy Labs Registration Update',
      html: userRejectedTemplate({
        userName,
        rejectionReason,
        supportEmail,
      }),
    })

    console.log(`Rejection notification sent to: ${userEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Rejection notification sent successfully'
    })
  } catch (error) {
    console.error('Error sending rejection notification email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}
