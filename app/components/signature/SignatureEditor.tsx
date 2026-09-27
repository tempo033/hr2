'use client'

import {useEffect,useRef,useState} from 'react'
import {Eraser,RefreshCw,Save} from 'lucide-react'

type Props={
  employeeId?:string|null
  publicToken?:string
  value?:string
  onChange?:(v:string)=>void
  onSaved?:(v:string)=>void
  autoUseSaved?:boolean
  disabled?:boolean
}

export default function SignatureEditor({
  employeeId,publicToken,value='',onChange,onSaved,autoUseSaved=true,disabled=false
}:Props){
  const [preview,setPreview]=useState(value)
  const [saved,setSaved]=useState('')
  const [msg,setMsg]=useState('')
  const [busy,setBusy]=useState(false)
  const canvas=useRef<HTMLCanvasElement>(null)
  const drawing=useRef(false)
  const last=useRef<{x:number;y:number}|null>(null)

  useEffect(()=>{if(value)setPreview(value)},[value])

  useEffect(()=>{
    if(!employeeId)return
    let live=true
    fetch('/api/signatures?employee_id='+encodeURIComponent(employeeId)+(publicToken?'&token='+encodeURIComponent(publicToken):''),{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(live&&d?.signature?.signature_url){
          setSaved(d.signature.signature_url)
          if(autoUseSaved&&!value){
            setPreview(d.signature.signature_url)
            onChange?.(d.signature.signature_url)
          }
        }
      })
    return()=>{live=false}
  },[employeeId,publicToken,autoUseSaved,value,onChange])

  const emit=(v:string)=>{setPreview(v);onChange?.(v);setMsg('')}

  const point=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    const r=e.currentTarget.getBoundingClientRect()
    return {
      x:(e.clientX-r.left)*e.currentTarget.width/r.width,
      y:(e.clientY-r.top)*e.currentTarget.height/r.height
    }
  }

  const start=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(disabled)return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current=true
    last.current=point(e)
  }

  const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(!drawing.current)return
    e.preventDefault()
    const c=canvas.current
    if(!c)return
    const ctx=c.getContext('2d')!
    const p=point(e),q=last.current
    if(!q)return
    ctx.strokeStyle='#0b3d91'
    ctx.lineWidth=5
    ctx.lineCap='round'
    ctx.lineJoin='round'
    ctx.beginPath()
    ctx.moveTo(q.x,q.y)
    ctx.lineTo(p.x,p.y)
    ctx.stroke()
    last.current=p
  }

  const end=()=>{
    if(!drawing.current)return
    drawing.current=false
    last.current=null
    if(canvas.current)emit(canvas.current.toDataURL('image/png'))
  }

  const clear=()=>{
    canvas.current?.getContext('2d')?.clearRect(0,0,canvas.current.width,canvas.current.height)
    emit('')
  }

  const save=async()=>{
    if(!preview){
      setMsg('ارسم التوقيع أولاً.')
      return
    }
    if(!employeeId){
      onSaved?.(preview)
      setMsg('تم تجهيز التوقيع.')
      return
    }
    setBusy(true)
    try{
      const r=await fetch('/api/signatures',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          employee_id:employeeId,
          token:publicToken,
          signature_data:preview,
          signature_type:'drawn',
          signature_color:'#0b3d91'
        })
      })
      const d=await r.json()
      if(!r.ok)throw new Error(d.error||'تعذر حفظ التوقيع')
      setSaved(d.signature.signature_url)
      emit(d.signature.signature_url)
      onSaved?.(d.signature.signature_url)
      setMsg('تم حفظ التوقيع بنجاح.')
    }catch(e){
      setMsg(e instanceof Error?e.message:'تعذر حفظ التوقيع')
    }finally{
      setBusy(false)
    }
  }

  return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3">
      <h3 className="font-black text-[#09233f] mb-2">التوقيع الإلكتروني</h3>
      <div className="text-sm font-bold">ارسم توقيعك</div>
    </div>

    <canvas
      ref={canvas}
      width={1200}
      height={300}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className="w-full rounded-xl border-2 touch-none bg-white"
      style={{aspectRatio:'4 / 1',height:'auto'}}
    />

    <button type="button" onClick={clear} className="mt-2 rounded-lg border px-3 py-2 text-xs font-bold inline-flex gap-1">
      <Eraser size={14}/>مسح وإعادة الرسم
    </button>

    <div className="mt-4 border-t pt-3">
      <button
        type="button"
        disabled={disabled||busy}
        onClick={save}
        className="rounded-lg bg-[#09233f] text-white px-4 py-2 text-sm font-bold inline-flex gap-1"
      >
        <Save size={15}/>حفظ التوقيع
      </button>
      {msg&&<div className="mt-2 text-xs font-bold">{msg}</div>}
    </div>
  </section>
}
