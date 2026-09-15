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
    const teamsSchedulingUrl = start && end
      ? `https://teams.microsoft.com/l/meeting/new?subject=${encodeURIComponent(title).replace(/\+/g,'%20')}&startTime=${encodeURIComponent(start.toISOString())}&endTime=${encodeURIComponent(end.toISOString())}&content=${encodeURIComponent(content)}${candidateEmail ? `&attendees=${encodeURIComponent(candidateEmail)}` : ''}`
      : 'https://teams.microsoft.com/l/meeting/new'
    const message = `السلام عليكم ورحمة الله وبركاته،\nعزيزي/عزيزتي ${candidateName || 'المرشح'}،\n\nيسر شركة البنية الأساسية للمقاولات دعوتكم لإجراء (${interviewType}) لشغل وظيفة "${jobTitle || 'الوظيفة المتقدم لها'}".\n\n📅 الموعد: ${formattedDate}\n💻 المنصة: Microsoft Teams\n🔗 رابط الاجتماع: سيتم تزويدكم برابط الانضمام النهائي بعد إنشاء الاجتماع.\n\nيرجى الالتزام بالموعد والتأكد من جاهزية الاتصال والكاميرا والميكروفون.\n\nمع تمنياتنا لكم بالتوفيق،\n${interviewerName}\nشركة البنية الأساسية للمقاولات`
    return NextResponse.json({
      success: true,
      platform: 'Microsoft Teams',
      teamsSchedulingUrl,
      message,
      whatsappUrl: candidatePhone ? `https://wa.me/${cleanPhone(candidatePhone)}?text=${encodeURIComponent(message)}` : null,
      mailtoUrl: candidateEmail ? `mailto:${candidateEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}` : null,
      note: 'رابط Teams هنا يفتح شاشة جدولة اجتماع Microsoft Teams باليوم والساعة المحددين. بعد إنشاء الاجتماع من حساب المنظم، استخدم رابط الانضمام النهائي الذي يعرضه Teams لإرساله للمرشح.'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to prepare Microsoft Teams invitation' }, { status: 500 })
  }
}
