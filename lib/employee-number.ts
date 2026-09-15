import { supabase } from '@/lib/supabase'

/**
 * Generate the next employee number as EMP-XXXX.
 * Called when the joining form is saved without an employee number.
 */
export async function generateNextEmployeeNumber(): Promise<string> {
  try {
    const [{ data: onboarding }, { data: employees }] = await Promise.all([
      supabase.from('employee_onboarding').select('employee_number').not('employee_number', 'is', null),
      supabase.from('employee_records').select('employee_number').not('employee_number', 'is', null),
    ])

    const used = new Set<string>()
    let max = 1000

    for (const row of [...(onboarding || []), ...(employees || [])]) {
      const value = String(row.employee_number || '').trim().toUpperCase()
      if (!value) continue
      used.add(value)
      const match = value.match(/^EMP-(\d+)$/i)
      if (match) max = Math.max(max, Number(match[1]))
    }

    let number = max + 1
    let code = `EMP-${String(number).padStart(4, '0')}`
    while (used.has(code)) {
      number += 1
      code = `EMP-${String(number).padStart(4, '0')}`
    }
    return code
  } catch {
    return `EMP-${Date.now().toString().slice(-4)}`
  }
}
