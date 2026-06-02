export function safeParse<T>(str: string): T {
  try {
    return JSON.parse(str) as T
  } catch {
    const cleaned = str
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    return JSON.parse(cleaned) as T
  }
}
