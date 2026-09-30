'use client'

import {useEffect,useRef} from 'react'
import {Eraser} from 'lucide-react'

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
  value='',onChange,disabled=false
}:Props){
  const canvas=useRef<HTMLCanvasElement>(null)
  const drawing=useRef(false)
  const last=useRef<{x:number;y:number}|null>(null)

  useEffect(()=>{
    const c=canvas.current
    if(!c)return
    const ctx=c.getContext('2d')
    if(!ctx)return
    ctx.clearRect(0,0,c.width,c.height)
    if(!value)return
    const img=new Image()
    img.onload=()=>ctx.drawImage(img,0,0,c.width,c.height)
    img.src=value
  },[value])

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
    if(canvas.current)onChange?.(canvas.current.toDataURL('image/png'))
  }

  const clear=()=>{
    canvas.current?.getContext('2d')?.clearRect(0,0,canvas.current.width,canvas.current.height)
    onChange?.('')
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

    <button type="button" disabled={disabled} onClick={clear} className="mt-2 rounded-lg border px-3 py-2 text-xs font-bold inline-flex gap-1">
      <Eraser size={14}/>مسح وإعادة الرسم
    </button>
  </section>
}
