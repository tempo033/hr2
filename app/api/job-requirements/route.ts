import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getSuggestedRequirements, REQUEST_REQUIREMENTS } from '@/lib/request-requirements'

type Requirement = { name: string; category: string; required: boolean; source?: string }

function normalize(value: string) {
  return value.normalize('NFKC').replace(/[ًٌٍَُِّْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar')
}
function unique(items: Requirement[]) {
  const seen = new Set<string>()
  return items.filter(x => { const key=normalize(x.name); if(!key||seen.has(key))return false; seen.add(key); return true })
}

function exactLocalRequirements(job: string): Requirement[] {
  const direct = getSuggestedRequirements(job)
  if (direct.length) return direct.map(x => ({...x,required:Boolean(x.required),source:'مكتبة متطلبات الوظائف المعتمدة'}))
  const target=normalize(job)
  const exactKey=Object.keys(REQUEST_REQUIREMENTS).find(key=>normalize(key)===target)
  if (!exactKey) return []
  return REQUEST_REQUIREMENTS[exactKey].map(x=>({...x,required:Boolean(x.required),source:'مكتبة متطلبات الوظائف المعتمدة'}))
}

async function aiRequirements(job: string, type: string): Promise<Requirement[]> {
  const apiKey=process.env.GEMINI_API_KEY
  if(!apiKey)return []
  try {
    const ai=new GoogleGenAI({apiKey})
    const prompt=`أنت خبير موارد بشرية في شركة مقاولات سعودية. أعد متطلبات مهنية دقيقة للمسمى الوظيفي المحدد فقط: "${job}". لا تستبدل المسمى بمهنة قريبة ولا تخلط بين تخصصات مختلفة. نوع الطلب: "${type}". أرجع 6-10 متطلبات، منها المؤهل والخبرة والمهارات والبرامج/الأنظمة الخاصة بالمهنة عند الحاجة. اجعل 2-4 متطلبات أساسية required=true. العربية المهنية. أرجع JSON array فقط بدون markdown. الفئات: مؤهل، خبرة، مهارة فنية، برنامج هندسي، برنامج، إدارة، سلامة، أنظمة، مشتريات، محاسبة، تشغيل، عام.`
    const response=await ai.models.generateContent({model:'gemini-3.6-flash',contents:prompt})
    const text=(response.text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim()
    const parsed=JSON.parse(text)
    if(!Array.isArray(parsed))return []
    return parsed.map((item:any)=>({name:String(item.name||'').trim(),category:String(item.category||'عام').trim(),required:Boolean(item.required),source:'محرك المعايير المهنية الذكي'})).filter(x=>x.name.length>2)
  } catch { return [] }
}

export async function GET(req: Request) {
  const {searchParams}=new URL(req.url)
  const job=(searchParams.get('job')||'').trim()
  const type=(searchParams.get('type')||'توظيف').trim()
  const occupationCode=(searchParams.get('code')||'').trim()
  if(!job)return NextResponse.json({requirements:[],source:'none',searchedJob:'',searchedType:type})

  const local=exactLocalRequirements(job)
  if(local.length)return NextResponse.json({requirements:unique(local),source:'exact-local-profile',searchedJob:job,occupationCode,searchedType:type,matchedOccupation:job,note:'تم العثور على متطلبات المسمى نفسه بعد مطابقة الاسم بشكل دقيق.'})

  const generated=await aiRequirements(job,type)
  if(generated.length)return NextResponse.json({requirements:unique(generated),source:'ai-exact-occupation-profile',searchedJob:job,occupationCode,searchedType:type,matchedOccupation:job,note:'تم توليد متطلبات للمسمى المحدد دون استبداله بمهنة مشابهة.'})

  return NextResponse.json({requirements:[],source:'none',searchedJob:job,occupationCode,searchedType:type,matchedOccupation:null,note:'لا توجد متطلبات معتمدة لهذا المسمى حتى الآن؛ لم يتم خلط متطلبات مهنة أخرى. أضفها يدويًا أو فعّل محرك المعايير الذكي.'})
}
