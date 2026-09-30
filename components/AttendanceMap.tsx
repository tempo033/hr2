'use client'
import {useEffect,useRef} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
type Props={lat:number|null;lng:number|null;radius:number;onChange:(lat:number,lng:number)=>void}
export default function AttendanceMap({lat,lng,radius,onChange}:Props){
 const ref=useRef<HTMLDivElement|null>(null),map=useRef<L.Map|null>(null),marker=useRef<L.Marker|null>(null),circle=useRef<L.Circle|null>(null)
 useEffect(()=>{if(!ref.current)return;const start:[number,number]=[lat??24.7136,lng??46.6753];const m=L.map(ref.current).setView(start,lat&&lng?17:12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(m);map.current=m
 const set=(a:number,b:number)=>{marker.current?.remove();circle.current?.remove();marker.current=L.marker([a,b],{draggable:true}).addTo(m);circle.current=L.circle([a,b],{radius,weight:2}).addTo(m);marker.current.on('dragend',()=>{const p=marker.current!.getLatLng();onChange(p.lat,p.lng)})}
 if(lat!=null&&lng!=null)set(lat,lng)
 m.on('click',(e:L.LeafletMouseEvent)=>set(e.latlng.lat,e.latlng.lng))
 return()=>{m.remove();map.current=null}},[])
 useEffect(()=>{if(!map.current)return;if(lat!=null&&lng!=null){marker.current?.setLatLng([lat,lng]);if(!circle.current)circle.current=L.circle([lat,lng],{radius,weight:2}).addTo(map.current);else circle.current.setLatLng([lat,lng]).setRadius(radius);map.current.setView([lat,lng],17)}},[lat,lng,radius])
 return <div ref={ref} className="h-[380px] w-full rounded-2xl overflow-hidden border border-slate-200"/>
}