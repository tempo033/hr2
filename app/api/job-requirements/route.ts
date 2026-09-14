import { NextResponse } from 'next/server'
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

function labelOf(value: any) {
  return String(value?.preferredLabel || value?.title || value?.label || value?.prefLabel || '').trim()
}

function localRequirements(job: string, type: string) {
  // Local data is allowed only when the requested title is an exact library key.
  // We never use a related/nearby occupation as a substitute.
  const direct = getSuggestedRequirements(job)
  if (direct.length) return direct.map((x) => ({ ...x, required: Boolean(x.required), source: 'مكتبة المتطلبات للمسمى المحدد' }))
  if (type !== 'توظيف') {
    const exactRequestType = getSuggestedRequirements(type)
    if (exactRequestType.length) return exactRequestType.map((x) => ({ ...x, required: Boolean(x.required), source: 'مكتبة نوع الطلب المحدد' }))
  }
  return []
}

async function escoRequirements(job: string): Promise<Requirement[]> {
  try {
    const searchUrl = `https://ec.europa.eu/esco/api/search?text=${encodeURIComponent(job)}&language=ar&type=occupation&limit=10&selectedVersion=latest&viewObsolete=false`
    const searchResponse = await fetch(searchUrl, { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } })
    if (!searchResponse.ok) return []
    const searchData = await searchResponse.json()
    const results = Array.isArray(searchData?.results) ? searchData.results : Array.isArray(searchData) ? searchData : []
    if (!results.length) return []

    const wanted = normalize(job)
    const exact = results.find((item: any) => normalize(labelOf(item)) === wanted)
    if (!exact?.uri) return []

    const occupationLabel = labelOf(exact)
    const resourceUrl = `https://ec.europa.eu/esco/api/resource/occupation?uri=${encodeURIComponent(exact.uri)}&language=ar&selectedVersion=latest`
    const resourceResponse = await fetch(resourceUrl, { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } })
    if (!resourceResponse.ok) return []
    const resource = await resourceResponse.json()

    const essential = Array.isArray(resource?.hasEssentialSkill) ? resource.hasEssentialSkill : []
    const optional = Array.isArray(resource?.hasOptionalSkill) ? resource.hasOptionalSkill : []
    const skills = [...essential.map((skill: any) => ({ skill, required: true })), ...optional.map((skill: any) => ({ skill, required: false }))]

    const requirements = await Promise.all(skills.slice(0, 30).map(async ({ skill, required }) => {
      if (typeof skill === 'object') {
        const label = labelOf(skill)
        return label ? { name: label, category: required ? 'مهارة أساسية للمهنة' : 'مهارة اختيارية للمهنة', required, source: 'ESCO — المهنة المطابقة تمامًا' } : null
      }
      if (typeof skill !== 'string' || !skill.includes('esco')) return null
      try {
        const skillUrl = `https://ec.europa.eu/esco/api/resource/skill?uri=${encodeURIComponent(skill)}&language=ar&selectedVersion=latest`
        const response = await fetch(skillUrl, { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } })
        if (!response.ok) return null
        const data = await response.json()
        const label = labelOf(data)
        return label ? { name: label, category: required ? 'مهارة أساسية للمهنة' : 'مهارة اختيارية للمهنة', required, source: 'ESCO — المهنة المطابقة تمامًا' } : null
      } catch { return null }
    }))

    return unique(requirements.filter(Boolean) as Requirement[]).map((x) => ({ ...x, source: `${x.source} (${occupationLabel})` }))
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

  const local = localRequirements(job, type)
  if (local.length) {
    return NextResponse.json({
      requirements: unique(local),
      source: 'exact-local-profile',
      searchedJob: job,
      occupationCode,
      searchedType: type,
      matchedOccupation: job,
      note: 'تم استخدام متطلبات المسمى المحدد فقط.'
    })
  }

  const external = await escoRequirements(job)
  return NextResponse.json({
    requirements: external,
    source: external.length ? 'exact-occupation-ESCO' : 'none',
    searchedJob: job,
    occupationCode,
    searchedType: type,
    matchedOccupation: external.length ? job : null,
    note: external.length
      ? 'تم تحميل متطلبات المهنة المطابقة تمامًا فقط؛ لا يتم دمج متطلبات وظائف مشابهة.'
      : 'لم يتم العثور على ملف مهنة مطابق تمامًا. أضف المتطلبات يدويًا بدل استخدام وظيفة مشابهة.'
  })
}
