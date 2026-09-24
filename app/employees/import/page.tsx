'use client'
import Link from 'next/link'
import {useState} from 'react'
import {ArrowLeft,Download,Upload,Users,RefreshCw} from 'lucide-react'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

const fields=[
 ['employee_number','الرقم الوظيفي',['الرقم الوظيفي','رقم الموظف','رقم العامل','employee number','employee no','emp no']],
 ['full_name','الاسم الكامل',['الاسم','اسم الموظف','اسم العامل','الاسم الكامل','full name','name']],
 ['nationality','الجنسية',['الجنسية','nationality']],
 ['national_id','رقم الهوية / الإقامة',['رقم الاقامة','رقم الإقامة','رقم الهوية','الهوية الوطنية','رقم الهوية / الإقامة','national id','iqama']],
 ['phone','الجوال',['الجوال','رقم الجوال','الهاتف','phone','mobile']],
 ['email','البريد الإلكتروني',['البريد الإلكتروني','البريد الالكتروني','email']],
 ['date_of_birth','تاريخ الميلاد',['تاريخ الميلاد','date of birth','birth date']],
 ['marital_status','الحالة الاجتماعية',['الحالة الاجتماعية','marital status']],
 ['degree','المؤهل',['المؤهل','المؤهل العلمي','الدرجة العلمية','degree','qualification']],
 ['specialization','التخصص',['التخصص','specialization']],
 ['job_title','المسمى الوظيفي',['المسمى الوظيفي','المسمى','الوظيفة','الوظيفة الحالية','job title','position']],
 ['department','الإدارة',['الإدارة','القسم','الادارة','department']],
 ['project_name','المشروع',['المشروع','اسم المشروع','project']],
 ['work_location','موقع العمل',['موقع العمل','الموقع','work location']],
 ['manager_name','المدير المباشر',['المدير المباشر','اسم المدير','manager']],
 ['hire_date','تاريخ التعيين',['تاريخ التعيين','تاريخ المباشرة','hire date','joining date']],
 ['contract_type','نوع العقد',['نوع العقد','contract type']],
 ['salary','الراتب المسجل',['الراتب','الراتب الشهري','salary']],
 ['employment_status','الحالة الوظيفية',['الحالة الوظيفية','حالة العامل','الحالة','employment status','status']],
 ['residency_status','حالة الإقامة / الكفالة',['حالة الإقامة','حالة الكفالة','residency status']],
 ['basic_salary','الراتب الأساسي',['الراتب الاساسي','الراتب الأساسي','basic salary']],
 ['housing_allowance','بدل السكن',['بدل السكن','housing allowance']],
 ['transportation_allowance','بدل النقل',['بدل النقل','بدل المواصلات','transportation allowance','transport allowance']],
 ['other_allowances','البدلات الأخرى',['البدلات الأخرى','بدلات أخرى','other allowances']],
 ['total_salary_with_allowances','إجمالي الراتب',['اجمالي الراتب مع البدلات','إجمالي الراتب مع البدلات','إجمالي الراتب','total salary']],
 ['notes','ملاحظات',['ملاحظات','notes']]
] as const

function norm(v:any){return String(v??'').trim().toLowerCase().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/\s+/g,' ')}
function dateValue(v:any){if(!v)return null;if(v instanceof Date&&!isNaN(v.getTime()))return v.toISOString().slice(0,10);if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);if(d)return d.y+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0')}const s=String(v).trim();const m=s.match(/^(\d{1,2})[\\/-](\d{1,2})[\\/-](\d{4})$/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):s||null}
function money(v:any){if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null}

export default function EmployeeImportPage(){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[preview,setPreview]=useState<any[]>([]),[mapping,setMapping]=useState<any[]>([])
 const downloadTemplate=async()=>{const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('بيانات الموظفين');ws.views=[{rightToLeft:true}];ws.addRow(fields.map(x=>x[1]));ws.addRow(fields.map(x=>x[0]==='employee_number'?'EMP-1001':x[0]==='full_name'?'محمد أحمد':x[0]==='nationality'?'مصري':x[0]==='hire_date'?'2026-01-01':x[0].includes('salary')||x[0].includes('allowance')?5000:''));ws.columns=fields.map(x=>({header:x[1],width:22}));ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF09233F'}};const buffer=await wb.xlsx.writeBuffer();const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='نموذج_استيراد_الموظفين.xlsx';a.click();URL.revokeObjectURL(url)}
 const importFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];if(!file)return;setBusy(true);setMessage('جاري قراءة الملف وتحليل الأعمدة...');setPreview([]);setMapping([])
  try{
   let rows:any[][]=[]
   if(file.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(await file.text());const arr=Array.isArray(parsed)?parsed:parsed.employees||parsed.data||[];if(!arr.length)throw new Error('ملف JSON لا يحتوي على موظفين.');const keys=Object.keys(arr[0]);rows=[keys,...arr.map((x:any)=>keys.map(k=>x[k]))]}else{const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];rows=XLSX.utils.sheet_to_json<any[]>(ws,{header:1,defval:''})}
   if(rows.length<2)throw new Error('الملف لا يحتوي على صفوف بيانات.')
   const headers=rows[0].map(norm);const maps=fields.map(([key,label,aliases])=>{const index=headers.findIndex(h=>(aliases as readonly string[]).some(a=>norm(a)===h));return{key,label,index,source:index>=0?String(rows[0][index]):'غير موجود'}});setMapping(maps)
   const usable=maps.filter(x=>x.index>=0);if(!usable.some(x=>x.key==='full_name'))throw new Error('لم أجد عمود الاسم. ارفع الملف وسيقوم النظام بمطابقة عناوين الأعمدة العربية أو الإنجليزية.')
   const data=rows.slice(1).map((r:any[])=>{const o:any={};maps.forEach(m=>{if(m.index<0)return;let v=r[m.index];if(['hire_date','date_of_birth'].includes(m.key))v=dateValue(v);if(['basic_salary','housing_allowance','transportation_allowance','other_allowances','total_salary_with_allowances'].includes(m.key))v=money(v);if(v!==''&&v!==null&&v!==undefined)o[m.key]=typeof v==='string'?v.trim():v});return o}).filter(x=>x.full_name)
   if(!data.length)throw new Error('لم يتم العثور على موظفين صالحين.')
   setPreview(data.slice(0,10));setMessage('تم تحليل الملف. سيتم مطابقة الموظف بالرقم الوظيفي ثم الهوية/الإقامة ثم الجوال ثم الاسم. الحقول الفارغة في الملف لن تمسح البيانات القديمة.')
   const r=await fetch('/api/employees/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows:data})});const b=await r.json();if(!r.ok)throw new Error(b.error||'تعذر الاستيراد')
   setMessage('تمت المعالجة: '+b.summary.created+' موظف جديد، '+b.summary.updated+' سجل محدث، '+b.summary.unchanged+' بدون تغيير'+(b.summary.ambiguous?'، '+b.summary.ambiguous+' صف يحتاج مراجعة.':'')+' لا يتم إنشاء نسخة مكررة للموظف الموجود.')
  }catch(err:any){setMessage('تعذر معالجة الملف: '+(err?.message||'خطأ غير معروف'))}finally{setBusy(false);e.target.value=''}
 }
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa]"><div className="max-w-7xl mx-auto p-5 md:p-8"><header className="flex items-center justify-between mb-7"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-[#09233f] text-[#d4a72c] grid place-items-center"><Users/></div><div><div className="text-sm text-[#b88618] font-bold">ملفات الموظفين</div><h1 className="text-3xl font-black text-[#09233f]">استيراد وتحليل بيانات الموظفين</h1><p className="text-slate-500 mt-1">Excel / CSV / JSON — مطابقة وتحديث وإضافة بدون تكرار.</p></div></div><Link href="/employees" className="font-bold text-[#09233f] inline-flex gap-2 items-center"><ArrowLeft size={18}/> الموظفون</Link></header>
 <section className="card p-6"><div className="flex flex-wrap gap-3"><button onClick={downloadTemplate} className="rounded-xl border px-5 py-3 font-bold inline-flex items-center gap-2"><Download size={18}/> نموذج موحد</button><label className="rounded-xl bg-[#09233f] text-white px-5 py-3 font-bold inline-flex items-center gap-2 cursor-pointer"><Upload size={18}/>{busy?'جاري التحليل...':'اختيار الملف'}<input hidden type="file" accept=".xlsx,.xls,.csv,.json" onChange={importFile} disabled={busy}/></label><button onClick={()=>location.reload()} className="rounded-xl border px-5 py-3 font-bold inline-flex items-center gap-2"><RefreshCw size={18}/> تحديث</button></div>
 <div className="mt-5 grid md:grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-4"><b>مطابقة ذكية</b><div className="text-sm text-slate-500 mt-1">الرقم الوظيفي → الهوية/الإقامة → الجوال → الاسم.</div></div><div className="rounded-xl bg-slate-50 p-4"><b>تحديث آمن</b><div className="text-sm text-slate-500 mt-1">لا يتم استبدال قيمة قديمة بقيمة فارغة من الملف.</div></div><div className="rounded-xl bg-slate-50 p-4"><b>بدون تكرار</b><div className="text-sm text-slate-500 mt-1">الموظف الموجود يتم تحديثه فقط، والجديد تتم إضافته.</div></div></div>
 {message&&<div className="mt-5 rounded-xl border p-4 font-bold">{message}</div>}
 {mapping.length>0&&<div className="mt-6"><h2 className="font-black text-xl mb-3">تحليل أعمدة الملف</h2><div className="grid md:grid-cols-3 gap-2">{mapping.map(m=><div key={m.key} className="border rounded-xl p-3"><div className="font-bold">{m.label}</div><div className="text-xs text-slate-500">من الملف: {m.source}</div></div>)}</div></div>}
 {preview.length>0&&<div className="mt-6 overflow-auto"><h2 className="font-black text-xl mb-3">معاينة البيانات التي تمت قراءتها</h2><table className="w-full min-w-[1200px] text-sm"><thead className="bg-[#09233f] text-white"><tr>{Object.keys(preview[0]).map(k=><th key={k} className="p-2 text-right">{fields.find(x=>x[0]===k)?.[1]||k}</th>)}</tr></thead><tbody>{preview.map((r,i)=><tr key={i} className="border-b">{Object.keys(preview[0]).map(k=><td key={k} className="p-2 whitespace-nowrap">{r[k]??'—'}</td>)}</tr>)}</tbody></table></div>}
 </section></div></main>
}