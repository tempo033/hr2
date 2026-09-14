import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSuggestedRequirements } from '@/lib/request-requirements'

type Requirement = { name: string; category: string; required: boolean; source?: string }

function unique(items: Requirement[]) {
  const seen = new Set<string>()
  return items.filter((x) => {
    const key = x.name.trim().toLocaleLowerCase('ar')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalize(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ar')
}

function localRequirements(job: string, type: string) {
  const direct = getSuggestedRequirements(job)
  if (direct.length) return direct.map((x) => ({ ...x, required: Boolean(x.required), source: 'مكتبة متطلبات الوظائف المعتمدة' }))
  
  if (type !== 'توظيف') {
    const exactRequestType = getSuggestedRequirements(type)
    if (exactRequestType.length) return exactRequestType.map((x) => ({ ...x, required: Boolean(x.required), source: 'مكتبة نوع الطلب' }))
  }
  return []
}

async function aiRequirements(job: string, type: string): Promise<Requirement[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return []

  try {
    const ai = new GoogleGenAI({ apiKey })
    const prompt = `أنت خبير موارد بشرية واستقطاب مواهب لشركة مقاولات وإنشاءات سعودية كبرى (شركة البنية الأساسية للمقاولات).
المطلوب إعداد قائمة متطلبات ومعايير وظيفية دقيقة وشاملة للمسمى التالي: "${job}" ضمن نوع طلب: "${type}".
قواعد الإخراج:
- أرجع من 5 إلى 8 متطلبات أساسية ومهمة للوظيفة (مؤهل، خبرة، مهارات فنية، برامج هندسية أو تخصصية، تصاريح أو سلامة).
- اجعل المتطلبات الأولى (2 أو 3) متطلبات أساسية required: true، والباقي required: false.
- الصياغة باللغة العربية المهنية المعتمدة في قطاع المقاولات السعودي.
- يجب أن يكون الرد عبارة عن JSON صالح فقط كمصفوفة كائنات، بدون أي نصوص أو markdown إضافي:
[
  {"name": "...", "category": "مؤهل", "required": true},
  {"name": "...", "category": "خبرة", "required": true},
  {"name": "...", "category": "مهارة فنية", "required": false}
]
الفئات المسموحة: مؤهل، خبرة، مهارة فنية، برنامج هندسي، إدارة، سلامة، أنظمة، مشتريات، محاسبة، تشغيل، عام.`

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    })

    const text = (response.text || '').trim()
    const cleanJson = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleanJson)
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: String(item.name || '').trim(),
        category: String(item.category || 'عام').trim(),
        required: Boolean(item.required),
        source: 'محرك المعايير المهنية الذكي'
      })).filter(x => x.name.length > 2)
    }
    return []
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const job = (searchParams.get('job') || '').trim()
  const type = (searchParams.get('type') || 'توظيف').trim()
  const occupationCode = (searchParams.get('code') || '').trim()

  if (!job) return NextResponse.json({ requirements: [], source: 'none', searchedJob: '', searchedType: type })

  // 1. Check local catalog first
  const local = localRequirements(job, type)
  if (local.length) {
    return NextResponse.json({
      requirements: unique(local),
      source: 'exact-local-profile',
      searchedJob: job,
      occupationCode,
      searchedType: type,
      matchedOccupation: job,
      note: 'تم جلب المتطلبات بنجاح من مكتبة المسميات المعتمدة.'
    })
  }

  // 2. Generate specialized requirements via AI
  const generated = await aiRequirements(job, type)
  if (generated.length) {
    return NextResponse.json({
      requirements: unique(generated),
      source: 'ai-occupational-standards',
      searchedJob: job,
      occupationCode,
      searchedType: type,
      matchedOccupation: job,
      note: 'تم توليد وتحديد متطلبات المسمى الوظيفي بدقة متوافقة مع سوق العمل والمقاولات.'
    })
  }

  return NextResponse.json({
    requirements: [],
    source: 'none',
    searchedJob: job,
    occupationCode,
    searchedType: type,
    matchedOccupation: null,
    note: 'لم يتم العثور على متطلبات محددة، يمكنك إضافة المتطلبات يدويًا.'
  })
}
