import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      candidateName,
      candidatePhone,
      candidateEmail,
      jobTitle,
      interviewDate,
      interviewType = 'مقابلة أولية',
      interviewerName = 'فريق الموارد البشرية - شركة البنية الأساسية للمقاولات'
    } = body

    // Generate unique Google Meet code: xxx-yyyy-zzz
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    const randPart = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const meetCode = `${randPart(3)}-${randPart(4)}-${randPart(3)}`
    const meetLink = `https://meet.google.com/${meetCode}`

    const formattedDate = interviewDate 
      ? new Date(interviewDate).toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' })
      : 'سيتم تحديد الموعد بالتنسيق معك'

    const message = `السلام عليكم ورحمة الله وبركاته،
عزيزي/عزيزتي ${candidateName || 'المرشح'}،

يسر شركة البنية الأساسية للمقاولات دعوتكم لإجراء (${interviewType}) لشغل وظيفة "${jobTitle || 'الوظيفة المتقدم لها'}".

📅 الموعد: ${formattedDate}
🔗 رابط الاجتماع عبر Google Meet:
${meetLink}

📌 تعليمات الانضمام:
1. يرجى الدخول للرابط قبل الموعد بـ 5 دقائق.
2. التأكد من جودة اتصال الإنترنت وعمل الكاميرا والميكروفون.
3. التواجد في مكان هادئ ومناسب للمقابلة.

مع تمنياتنا لكم بالتوفيق،
${interviewerName}
شركة البنية الأساسية للمقاولات ذ.م.م`

    return NextResponse.json({
      success: true,
      meetCode,
      meetLink,
      message,
      whatsappUrl: candidatePhone ? `https://wa.me/${candidatePhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}` : null,
      mailtoUrl: candidateEmail ? `mailto:${candidateEmail}?subject=${encodeURIComponent(`دعوة لمقابلة توظيف - شركة البنية الأساسية للمقاولات`)}&body=${encodeURIComponent(message)}` : null
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to generate meet link' }, { status: 500 })
  }
}
