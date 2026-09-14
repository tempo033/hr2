import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const source = 'https://www.hrsd.gov.sa/skills-occupations/occupations'
const UA = 'Mozilla/5.0 HRanalysis occupation catalog'

type Occupation = { name: string; code: string }

function strip(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

function extract(html: string): Occupation[] {
  const out: Occupation[] = []
  for (const match of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...match[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => strip(m[1]))
    const codeIndex = cells.findIndex((x) => /^\d{6}$/.test(x))
    if (codeIndex < 0) continue
    const name = cells[codeIndex + 1]
    if (name && name.length > 1) out.push({ name, code: cells[codeIndex] })
  }
  return out
}

function occupationLinks(html: string, base: string) {
  const links = new Set<string>()
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1].replace(/&amp;/g, '&')
    if (!href.includes('/skills-taxonomy/occupations/') && !href.includes('/skills-occupations/occupations')) continue
    try { links.add(new URL(href, base).toString()) } catch {}
  }
  return [...links]
}

async function get(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    next: { revalidate: 86400 },
  })
  if (!response.ok) throw new Error(`HRSD ${response.status}`)
  return response.text()
}

const fallbackNames = [
  'مدير مشاريع','مدير مشروع','مدير الموارد البشرية','مدير المشتريات','مدير مالي','مدير جودة','مدير سلامة وصحة مهنية','مدير تشغيل','مدير مستودعات',
  'مهندس مدني','مهندس معماري','مهندس إنشائي','مهندس كهرباء','مهندس ميكانيكا','مهندس تكييف وتبريد','مهندس سباكة','مهندس طرق','مهندس مياه وصرف صحي','مهندس تخطيط','مهندس تكلفة','مهندس عقود','مهندس مكتب فني','مهندس موقع','مهندس جودة','مهندس سلامة','مهندس مشتريات','مهندس مبيعات','مهندس كميات','مهندس مساح','مهندس BIM',
  'مساح','حاسب كميات','مراقب مدني','مراقب معماري','مراقب كهرباء','مراقب ميكانيكا','مشرف موقع','مشرف تشطيبات','مشرف كهرباء','مشرف ميكانيكا','مشرف سلامة','مشرف جودة','مشرف مستودع','مشرف حركة',
  'محاسب','محاسب موقع','محاسب عام','محاسب تكاليف','محاسب رواتب','مراجع داخلي','أمين صندوق','أمين مستودع','موظف مشتريات','أخصائي مشتريات','أخصائي سلسلة إمداد','منسق مشتريات','منسق لوجستي','أخصائي عقود','مسؤول عقود','مسؤول موردين',
  'أخصائي موارد بشرية','أخصائي توظيف','مسؤول توظيف','أخصائي رواتب','مسؤول شؤون موظفين','أخصائي تدريب وتطوير','منسق موارد بشرية','سكرتير','سكرتير مدير مشاريع','مساعد إداري','منسق إداري','مدخل بيانات','مسؤول وثائق','منسق وثائق','مراقب مستندات','موظف استقبال','خدمة عملاء',
  'مصمم معماري','مصمم داخلي','مصمم جرافيك','مصمم جرافيك دعاية وإعلان','مصمم ثلاثي الأبعاد','مصمم UX/UI','مصور','محرر فيديو','أخصائي تسويق','مسوق','أخصائي تسويق رقمي','أخصائي مبيعات','ممثل مبيعات','مندوب مبيعات','أخصائي تطوير أعمال','مسؤول علاقات عامة','أخصائي فعاليات',
  'مبرمج مواقع','مطور ويب','مطور تطبيقات','مطور برمجيات','مطور واجهات أمامية','مطور واجهات خلفية','مهندس بيانات','محلل بيانات','مسؤول قواعد بيانات','مسؤول أنظمة','مسؤول تقنية معلومات','أخصائي دعم فني','أخصائي أمن معلومات','محلل أمن سيبراني',
  'سائق','سائق شاحنة','سائق نقل ثقيل','سائق حافلة','مشغل رافعة','مشغل حفار','مشغل شيول','مشغل بلدوزر','مشغل معدات ثقيلة','فني كهرباء','فني ميكانيكا','فني تكييف','فني سباكة','فني لحام','فني صيانة','فني شبكات','فني اتصالات','فني أجهزة','عامل موقع','عامل بناء','عامل تشطيبات','عامل مستودع','حارس أمن'
]

function fallback() {
  return fallbackNames.map((name, i) => ({ name, code: `LOCAL-${String(i + 1).padStart(4, '0')}` }))
}

export async function GET() {
  try {
    const first = await get(source)
    const categoryLinks = occupationLinks(first, source)
    const seeds = [...new Set([source, ...categoryLinks])]
    const seedResults = await Promise.allSettled(seeds.slice(0, 20).map(get))
    const pageUrls = new Set<string>(seeds)
    const seedPages = seedResults.flatMap((p) => p.status === 'fulfilled' ? [p.value] : [])

    seedPages.forEach((html, index) => {
      for (const link of occupationLinks(html, seeds[index] || source)) pageUrls.add(link)
    })

    const urls = [...pageUrls].slice(0, 350)
    const pages = await Promise.allSettled(urls.map(get))
    const occupations = pages.flatMap((p) => p.status === 'fulfilled' ? extract(p.value) : [])
    const unique = [...new Map(occupations.map((x) => [x.code, x])).values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'))

    if (unique.length < 500) throw new Error(`HRSD catalog incomplete (${unique.length})`)

    return NextResponse.json({ occupations: unique, count: unique.length, source, sourceType: 'HRSD', updated: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
  } catch (error) {
    const occupations = fallback()
    return NextResponse.json({ occupations, count: occupations.length, source, sourceType: 'fallback-library', warning: 'تعذر قراءة دليل الوزارة بالكامل؛ تم استخدام القائمة الاحتياطية دون خلط متطلبات الوظائف.', error: error instanceof Error ? error.message : 'unknown' }, { headers: { 'Cache-Control': 'public, max-age=900, s-maxage=3600' } })
  }
}
