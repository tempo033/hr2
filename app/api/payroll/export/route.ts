import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pdkdvaisggntdrvpxuur.supabase.co'

async function getData(path: string, auth: any) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: supabaseHeaders(auth),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response.json()
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, [
      'admin',
      'hr',
      'finance',
      'general_manager',
    ])

    if (!auth) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const searchParams = new URL(req.url).searchParams
    const runId = searchParams.get('run_id')

    if (!runId) {
      return NextResponse.json({ error: 'run_id مطلوب' }, { status: 400 })
    }

    const runs = await getData(
      `payroll_runs?select=*&id=eq.${runId}&limit=1`,
      auth
    )
    const run = runs[0]

    if (!run) {
      return NextResponse.json({ error: 'المسير غير موجود' }, { status: 404 })
    }

    const items = await getData(
      `payroll_items?select=*,employee:employee_records(employee_number,full_name,nationality,job_title,department,project_name,iban)&run_id=eq.${runId}&order=created_at`,
      auth
    )

    const rows = items.map((x: any) => ({
      'رقم الموظف': x.employee?.employee_number || '',
      'اسم الموظف': x.employee?.full_name || '',
      'الجنسية': x.employee?.nationality || '',
      'المسمى': x.employee?.job_title || '',
      'القسم': x.employee?.department || '',
      'المشروع': x.employee?.project_name || '',
      'الأساسي': x.basic_salary,
      'السكن': x.housing_allowance,
      'النقل': x.transportation_allowance,
      'بدلات أخرى': x.other_allowances,
      'الإضافي': x.overtime,
      'المكافآت': x.bonuses,
      'الغياب': x.absence,
      'التأخير': x.lateness,
      'السلف': x.advances,
      'الجزاءات': x.penalties,
      'التأمينات': x.insurance_employee,
      'خصومات أخرى': x.other_deductions,
      'إجمالي الاستحقاقات': x.total_earnings,
      'إجمالي الخصومات': x.total_deductions,
      'صافي الراتب': x.net_salary,
      'IBAN': x.employee?.iban || '',
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'مسير الرواتب')

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="payroll.xlsx"',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'تعذر التصدير' },
      { status: 500 }
    )
  }
}
