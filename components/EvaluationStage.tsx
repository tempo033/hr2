'use client'
import {useMemo} from 'react'
import type {EvaluationQuestion} from './DepartmentEvaluationQuestions'

type Props={questions:EvaluationQuestion[];scores:Record<string,number>;setScore:(id:string,v:number)=>void}
const level=(v:number)=>v===0?'غير متحقق':v<=25?'محدود':v<=50?'مقبول':v<=75?'جيد':'ممتاز'
export default function EvaluationStage({questions,scores,setScore}:Props){
 const total=useMemo(()=>{const applicable=questions.filter(q=>Number(scores[q.id])>=0);if(!applicable.length)return 0;return Math.round(applicable.reduce((s,q)=>s+(Number(scores[q.id])||0),0)/applicable.length)},[questions,scores])
 return <section className="bg-white border-2 border-slate-200 rounded-2xl p-6 mb-5">
  <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><div><h2 className="text-xl font-black">أسئلة التقييم الخاصة بالإدارة</h2><p className="text-sm text-slate-500 mt-1">اختر «لا ينطبق» للسؤال غير المرتبط بالوظيفة، ولن يدخل في احتساب النسبة.</p></div><div className="min-w-[180px] rounded-2xl border-2 border-[#d4a72c] bg-amber-50 p-3 text-center"><div className="text-xs text-slate-500">نسبة موافقة الإدارة</div><div className="text-3xl font-black text-[#09233f]">{total}%</div><div className="text-xs font-bold text-[#b88618]">{level(total)}</div></div></div>
  {questions.map(q=>{const v=Number.isFinite(Number(scores[q.id]))?Number(scores[q.id]):-1;return <div key={q.id} className="border-2 border-slate-200 rounded-2xl p-5 mb-4 hover:border-[#d4a72c] transition-all"><div className="font-black text-[#09233f]">{q.title}</div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4">{q.options.map(o=><button key={o.v} type="button" onClick={()=>setScore(q.id,o.v)} className={`border-2 rounded-xl px-2 py-3 text-xs font-bold ${v===o.v?'border-[#b88618] bg-amber-50 shadow-md':'border-slate-200 bg-white hover:border-[#b88618]'}`}><span className="block text-base font-black">{o.v<0?'—':`${o.v}%`}</span><span className="block mt-1">{o.t}</span></button>)}</div>{v>=0?<div className="h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden mt-3"><div className="h-full bg-[#d4a72c] transition-all duration-300" style={{width:`${v}%`}}/></div>:<div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 py-2 text-center text-xs font-bold text-slate-500">تم استبعاد هذا السؤال من نسبة التقييم</div>}</div>})}
 </section>
}
