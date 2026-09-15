import { NextRequest, NextResponse } from 'next/server'

function cleanPhone(phone: string) { return phone.replace(/[^0-9]/g, '') }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { candidateName, candidatePhone, candidateEmail, jobTitle, interviewDate, interviewEndDate, interviewType = 'مقابلة أولية', interviewerName = 'فريق الموارد البشرية - شركة البنية الأساسية للمقاولات' } = body
    const start = interviewDate ? new Date(interviewDate) : null
    const end = interviewEndDate ? new Date(interviewEndDate) : start ? new Date(start.getTime() + 45 * 60 * 1000) : null
    const title = `مقابلة توظيف - ${jobTitle || 'الوظيفة المتقدم لها'}`
    const formattedDate = start ? start.toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' }) : 'سيتم تحديد الموعد بالتنسيق معك'
    const content = `مقابلة ${interviewType} للمرشح ${candidateName || 'المرشح'}`
    const meetLink = 'https://meet.google.com/new'
    const meetCode = 'new'
    const calendarUrl = start && end
      ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}/${end.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}&details=${encodeURIComponent(content)}&location=${encodeURIComponent(meetLink)}${candidateEmail ? `&add=${encodeURIComponent(candidateEmail)}` : ''}`
      : `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&location=${encodeURIComponent(meetLink)}`
    const message = `السلام عليكم ورحمة الله وبركاته،\nعزيزي/عزيزتي ${candidateName || 'المرشح'}،\n\nيسر شركة البنية الأساسية للمقاولات دعوتكم لإجراء (${interviewType}) لشغل وظيفة "${jobTitle || 'الوظيفة المتقدم لها'}".\n\n📅 الموعد: ${formattedDate}\n💻 المنصة: Google Meet\n🔗 رابط الاجتماع: ${meetLink}\n\nيمكنكم فتح الرابط في الموعد المحدد، كما يمكن استخدام رابط التقويم لإضافة الموعد إلى تقويم Google.\n\nيرجى الالتزام بالموعد والتأكد من جاهزية الاتصال والكاميرا والميكروفون.\n\nمع تمنياتنا لكم بالتوفيق،\n${interviewerName}\nشركة البنية الأساسية للمقاولات`
    return NextResponse.json({
      success: true,
      platform: 'Google Meet',
      meetLink,
      meetCode,
      calendarUrl,
      message,
      whatsappUrl: candidatePhone ? `https://wa.me/${cleanPhone(candidatePhone)}?text=${encodeURIComponent(message)}` : null,
      mailtoUrl: candidateEmail ? `mailto:${candidateEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}` : null,
      note: 'تم اعتماد Google Meet للمقابلات. يمكن للموظف فتح الرابط مباشرة أو إضافة الموعد إلى تقويم Google.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to prepare Google Meet invitation' }, { status: 500 })
  }
}
