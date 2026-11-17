const DAY = 86_400_000

export function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const today = () => iso(new Date())

export function addDays(s: string, n: number): string {
  return iso(new Date(parse(s).getTime() + n * DAY))
}

/** 0 = lunes … 6 = domingo */
export function dayIndex(s: string): number {
  return (parse(s).getDay() + 6) % 7
}

export function mondayOf(s: string): string {
  return addDays(s, -dayIndex(s))
}

/** Semanas transcurridas desde el lunes de inicio (puede ser negativo) */
export function weekNumber(start: string, s: string): number {
  return Math.round((parse(mondayOf(s)).getTime() - parse(mondayOf(start)).getTime()) / DAY / 7)
}

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function shortDate(s: string): string {
  const d = parse(s)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DAY_NAME = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTH = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function longDate(s: string): string {
  const d = parse(s)
  return `${DAY_NAME[dayIndex(s)]} ${d.getDate()} de ${MONTH[d.getMonth()]}`
}
export const dayNum = (s: string) => parse(s).getDate()
