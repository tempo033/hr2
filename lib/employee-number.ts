import { supabase } from '@/lib/supabase'

/**
 * Generate a new employee number formatted as EMP-XXXX (e.g., EMP-1042)
 * Ensures uniqueness by checking both candidate_onboarding and employee_onboarding tables.
 */
export async function generateNextEmployeeNumber(): Promise<string> {
  try {
    const [{ data: o1 }, { data: o2 }] = await Promise.all([
      supabase.from('employee_onboarding').select('employee_number').not('employee_number', 'is', null),
      supabase.from('candidate_onboarding').select('employee_number').not('employee_number', 'is', null),
    ])

    const existingNumbers = new Set<string>()
    const maxNum = { value: 1000 }

    const parseNum = (list: any[]) => {
      list?.forEach(row => {
        if (!row.employee_number) return
        existingNumbers.add(row.employee_number.trim().toUpperCase())
        const match = row.employee_number.match(/EMP-(\d+)/i)
        if (match) {
          const val = parseInt(match[1], 10)
          if (!isNaN(val) && val > maxNum.value) {
            maxNum.value = val
          }
        }
      })
    }

    parseNum(o1 || [])
    parseNum(o2 || [])

    // Increment highest or find next free
    let nextNum = maxNum.value + 1
    let candidateCode = `EMP-${String(nextNum).padStart(4, '0')}`

    while (existingNumbers.has(candidateCode)) {
      nextNum++
      candidateCode = `EMP-${String(nextNum).padStart(4, '0')}`
    }

    return candidateCode
  } catch {
    // Fallback: Random 4-digit unique code
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `EMP-${rand}`
  }
}
