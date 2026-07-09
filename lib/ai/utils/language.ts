// Unicode range checks for script detection
const SCRIPTS: { name: string; range: RegExp }[] = [
  { name: 'Hindi',  range: /[ऀ-ॿ]/ },   // Devanagari
  { name: 'Urdu',   range: /[؀-ۿ]/ },   // Arabic script (also covers Urdu)
  { name: 'Arabic', range: /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/ },
  { name: 'Chinese', range: /[一-鿿㐀-䶿]/ },
  { name: 'Japanese', range: /[぀-ヿㇰ-ㇿ]/ },
  { name: 'Korean', range: /[가-힯ᄀ-ᇿ]/ },
  { name: 'Russian', range: /[Ѐ-ӿ]/ },
]

export interface LanguageDetection {
  code: string   // 'en' | 'hi' | 'ur' | 'ar' | 'zh' | 'ja' | 'ko' | 'ru'
  name: string   // 'English' | 'Hindi' | 'Urdu' etc.
  isLatin: boolean
}

export function detectLanguage(text: string): LanguageDetection {
  for (const script of SCRIPTS) {
    if (script.range.test(text)) {
      // Distinguish Hindi vs Urdu: Arabic script in Indian context → Urdu
      const code = script.name === 'Arabic' && /[؀-ۿ]/.test(text) ? 'ur' :
        script.name === 'Hindi' ? 'hi' :
        script.name === 'Chinese' ? 'zh' :
        script.name === 'Japanese' ? 'ja' :
        script.name === 'Korean' ? 'ko' :
        script.name === 'Russian' ? 'ru' : 'ar'

      const name = script.name === 'Arabic' && code === 'ur' ? 'Urdu' : script.name
      return { code, name, isLatin: false }
    }
  }
  return { code: 'en', name: 'English', isLatin: true }
}

/**
 * Returns a system-prompt instruction to inject when the user writes in a non-English language.
 * Generated code, filenames, and variable names always stay in English.
 */
export function languageInstruction(text: string): string {
  const lang = detectLanguage(text)
  if (lang.isLatin) return ''
  return `LANGUAGE NOTE: The user wrote their prompt in ${lang.name}. Respond to conversational text and questions in ${lang.name}. All generated code, file paths, variable names, function names, and JSON keys MUST remain in English — only natural-language prose (descriptions, explanations, question text) should be in ${lang.name}.`
}
