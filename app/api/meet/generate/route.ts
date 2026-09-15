import { NextRequest, NextResponse } from 'next/server'

function cleanPhone(phone: string) { return phone.replace(/[^0-9]/g, '') }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { candidateName, candidatePhone, candidateEmail, jobTitle, interviewDate, interviewType = 'مقابلة أولية', interviewerName = 'فريق الموارد البشرية - شركة البنية الأساسية للمقاولات' } = body

    // A random meet.google.com code is NOT a real Google Meet room.
    // Without Google OAuth/Workspace credentials the reliable public action is
    // Google's own "New meeting" endpoint. It opens a real Meet creation flow.
    const meetLink = 'https://meet.google.com/new'
    const formattedDate = interviewDate
      ? new Date(interviewDate).toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' })
      : 'سيتم تحديد الموعد بالتنسيق معك'
    const title = `مقابلة توظيف - ${jobTitle || 'الوظيفة المتقدم لها'}`
    const message = `السلام عليكم ورحمة الله وبركاته،\nعزيزي/عزيزتي ${candidateName || 'المرشح'}،\n\nيسر شركة البنية الأساسية للمقاولات دعوتكم لإجراء (${interviewType}) لشغل وظيفة "${jobTitle || 'الوظيفة المتقدم لها'}".\n\n📅 الموعد: ${formattedDate}\n🔗 رابط Google Meet:\n${meetLink}\n\nيرجى فتح الرابط والانضمام/إنشاء الاجتماع قبل الموعد والتأكد من عمل الكاميرا والميكروفون.\n\nمع تمنياتنا لكم بالتوفيق،\n${interviewerName}\nشركة البنية الأساسية للمقاولات ذ.م.م`

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(message)}${interviewDate ? `&dates=${encodeURIComponent(toCalendarDates(interviewDate))}` : ''}`
    return NextResponse.json({
      success: true,
      meetCode: null,
      meetLink,
      calendarUrl,
      message,
      whatsappUrl: candidatePhone ? `https://wa.me/${cleanPhone(candidatePhone)}?text=${encodeURIComponent(message)}` : null,
      mailtoUrl: candidateEmail ? `mailto:${candidateEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}` : null,
      note: 'تم إيقاف إنشاء أكواد Meet عشوائية لأنها ليست غرف Google Meet حقيقية. استخدم زر Google Meet لإنشاء غرفة فعلية من حساب Google.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to prepare Google Meet invitation' }, { status: 500 })
  }
}

function toCalendarDates(value: string) {
  const start = new Date(value)
  const end = new Date(start.getTime() + 45 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return `${fmt(start)}/${fmt(end)}`
}
