import { createContext, useState, useContext, ReactNode, useEffect } from 'react'

interface LanguageContextType {
  userLanguage: string | null
  setUserLanguage: (language: string) => void
}

const defaultValue: LanguageContextType = {
  userLanguage: null,
  setUserLanguage: () => {}
}

const LanguageContext = createContext<LanguageContextType>(defaultValue)

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  // 发现如果某个语言已经在 localStorage 中设置
  const [userLanguage, setUserLanguageState] = useState<string | null>(() => {
    try {
      const storedLanguage = localStorage.getItem('userLanguage')
      return storedLanguage
    } catch (e) {
      console.error('Error accessing localStorage:', e)
      return null
    }
  })
  
  // 当语言变化时将其保存到 localStorage
  const setUserLanguage = (language: string) => {
    try {
      localStorage.setItem('userLanguage', language)
      setUserLanguageState(language)
    } catch (e) {
      console.error('Error saving to localStorage:', e)
      setUserLanguageState(language) // 仍然更新状态，即使无法持久化
    }
  }
  
  return (
    <LanguageContext.Provider value={{ userLanguage, setUserLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)