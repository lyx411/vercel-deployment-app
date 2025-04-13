import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material'
import { useLanguage } from '../contexts/LanguageContext'

interface LanguageOption {
  code: string
  name: string
  nativeName: string
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
]

interface LanguageSelectorProps {
  variant?: 'standard' | 'outlined' | 'filled'
  size?: 'small' | 'medium'
  label?: string
  fullWidth?: boolean
}

const LanguageSelector = ({
  variant = 'outlined',
  size = 'medium',
  label = '选择语言',
  fullWidth = false
}: LanguageSelectorProps) => {
  const { userLanguage, setUserLanguage } = useLanguage()
  
  const handleChange = (event: SelectChangeEvent) => {
    setUserLanguage(event.target.value)
  }
  
  return (
    <FormControl variant={variant} size={size} fullWidth={fullWidth}>
      <InputLabel id="language-select-label">{label}</InputLabel>
      <Select
        labelId="language-select-label"
        id="language-select"
        value={userLanguage || ''}
        label={label}
        onChange={handleChange}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default LanguageSelector