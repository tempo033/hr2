'use client'
import Link from 'next/link'
import {WalletCards,LayoutDashboard,FileText,Clock3,MinusCircle,HandCoins,Award,ShieldCheck,FileSpreadsheet,ReceiptText,Archive,Building2,BarChart3,CheckCircle2,Settings} from 'lucide-react'
const items=[['/payroll','نظرة عامة',LayoutDashboard],['/payroll/runs','مسيرات الرواتب',FileText],['/payroll/attendance','الحضور والغياب',Clock3],['/payroll/overtime','العمل الإضافي',Clock3],['/payroll/deductions','الخصومات والجزاءات',MinusCircle],['/payroll/advances','السلف',HandCoins],['/payroll/bonuses','المكافآت والحوافز',Award],['/payroll/gosi','التأمينات',ShieldCheck],['/payroll/wps','حماية الأجور WPS',FileSpreadsheet],['/payroll/payslips','قسائم الرواتب',ReceiptText],['/payroll/archive','أرشيف المسيرات',Archive],['/payroll/projects','تكلفة المشاريع',Building2],['/payroll/reports','التقارير',BarChart3],['/payroll/approvals','اعتماد الرواتب',CheckCircle2],['/payroll/settings','إعدادات الرواتب',Settings]]
export default function PayrollShell({children}:{children:React.ReactNode}){
 return <div dir="rtl" className="payroll-workspace">
  <div className="payroll-head"><div><div className="hr-page-kicker">PAYROLL OPERATIONS</div><h1>الرواتب والمزايا</h1><p>مساحة تشغيل ومراجعة المسيرات، الاستحقاقات والاستقطاعات.</p></div><div className="payroll-mark"><WalletCards size={20}/></div></div>
  <nav className="payroll-nav">{items.map(([href,label,Icon]:any)=><Link key={href} href={href} className="payroll-nav-item"><Icon size={15}/><span>{label}</span></Link>)}</nav>
  <div>{children}</div>
 </div>
}