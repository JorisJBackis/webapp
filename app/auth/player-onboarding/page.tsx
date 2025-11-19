"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Globe, Users, Upload, X, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Logo } from "@/components/logo"
import { Switch } from "@/components/ui/switch"
import { getCountryFlag } from "@/lib/utils/country-flags"

const STEPS = [
  { id: 1, title: "Essential Info", description: "Core information for matching" },
  { id: 2, title: "Enhance Matching", description: "Additional preferences" },
  { id: 3, title: "Professional Info", description: "Playing style & representation" }
]

// Transfermarkt positions from database
const POSITIONS = [
  "Goalkeeper",
  "Centre-Back",
  "Left-Back",
  "Right-Back",
  "Defensive Midfield",
  "Central Midfield",
  "Left Midfield",
  "Right Midfield",
  "Attacking Midfield",
  "Left Winger",
  "Right Winger",
  "Centre-Forward",
  "Second Striker"
]

// Granular salary brackets - low-end focused, growing exponentially
const SALARY_RANGES = [
  "Under €1k",
  "€1-2k",
  "€2-3k",
  "€3-5k",
  "€5-7k",
  "€7-10k",
  "€10-15k",
  "€15-25k",
  "€25-40k",
  "€40-60k",
  "€60k+",
  "Prefer not to say"
]

// World regions with their countries
const REGIONS = {
  "Western Europe": ["England", "France", "Germany", "Netherlands", "Belgium", "Switzerland", "Austria"],
  "Southern Europe": ["Spain", "Italy", "Portugal", "Greece", "Turkey"],
  "Scandinavia": ["Sweden", "Norway", "Denmark", "Finland", "Iceland"],
  "Eastern Europe": ["Poland", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria"],
  "Balkans": ["Croatia", "Serbia", "Bosnia", "Slovenia", "North Macedonia", "Albania", "Montenegro"],
  "British Isles": ["Scotland", "Wales", "Ireland", "Northern Ireland"],
  "Americas": ["USA", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia"],
  "Middle East": ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain"],
  "Asia": ["Japan", "South Korea", "China", "Thailand", "Singapore", "India"],
  "Africa": ["South Africa", "Egypt", "Morocco", "Tunisia", "Nigeria", "Ghana"],
  "Oceania": ["Australia", "New Zealand"]
}

// Major languages with proficiency levels
const LANGUAGES = {
  "English": ["Fluent", "Conversational", "Basic"],
  "Spanish": ["Fluent", "Conversational", "Basic"],
  "French": ["Fluent", "Conversational", "Basic"],
  "German": ["Fluent", "Conversational", "Basic"],
  "Italian": ["Fluent", "Conversational", "Basic"],
  "Portuguese": ["Fluent", "Conversational", "Basic"],
  "Dutch": ["Fluent", "Conversational", "Basic"],
  "Turkish": ["Fluent", "Conversational", "Basic"],
  "Arabic": ["Fluent", "Conversational", "Basic"],
  "Russian": ["Fluent", "Conversational", "Basic"],
  "Polish": ["Fluent", "Conversational", "Basic"],
  "Swedish": ["Fluent", "Conversational", "Basic"],
  "Norwegian": ["Fluent", "Conversational", "Basic"],
  "Danish": ["Fluent", "Conversational", "Basic"],
  "Finnish": ["Fluent", "Conversational", "Basic"],
  "Greek": ["Fluent", "Conversational", "Basic"],
  "Croatian": ["Fluent", "Conversational", "Basic"],
  "Serbian": ["Fluent", "Conversational", "Basic"],
  "Czech": ["Fluent", "Conversational", "Basic"],
  "Romanian": ["Fluent", "Conversational", "Basic"],
  "Hungarian": ["Fluent", "Conversational", "Basic"],
  "Bulgarian": ["Fluent", "Conversational", "Basic"],
  "Ukrainian": ["Fluent", "Conversational", "Basic"],
  "Slovak": ["Fluent", "Conversational", "Basic"],
  "Bosnian": ["Fluent", "Conversational", "Basic"],
  "Slovenian": ["Fluent", "Conversational", "Basic"],
  "Albanian": ["Fluent", "Conversational", "Basic"],
  "Macedonian": ["Fluent", "Conversational", "Basic"],
  "Icelandic": ["Fluent", "Conversational", "Basic"],
  "Japanese": ["Fluent", "Conversational", "Basic"],
  "Korean": ["Fluent", "Conversational", "Basic"],
  "Mandarin": ["Fluent", "Conversational", "Basic"],
  "Hindi": ["Fluent", "Conversational", "Basic"],
  "Bengali": ["Fluent", "Conversational", "Basic"],
  "Urdu": ["Fluent", "Conversational", "Basic"],
  "Indonesian": ["Fluent", "Conversational", "Basic"],
  "Vietnamese": ["Fluent", "Conversational", "Basic"],
  "Thai": ["Fluent", "Conversational", "Basic"],
  "Hebrew": ["Fluent", "Conversational", "Basic"],
  "Persian": ["Fluent", "Conversational", "Basic"]
}

// Language to representative country mapping for flags
const LANGUAGE_FLAGS: Record<string, string> = {
  "English": "England",
  "Spanish": "Spain",
  "French": "France",
  "German": "Germany",
  "Italian": "Italy",
  "Portuguese": "Portugal",
  "Dutch": "Netherlands",
  "Turkish": "Turkey",
  "Arabic": "Saudi Arabia",
  "Russian": "Russia",
  "Polish": "Poland",
  "Swedish": "Sweden",
  "Norwegian": "Norway",
  "Danish": "Denmark",
  "Finnish": "Finland",
  "Greek": "Greece",
  "Croatian": "Croatia",
  "Serbian": "Serbia",
  "Czech": "Czech Republic",
  "Romanian": "Romania",
  "Hungarian": "Hungary",
  "Bulgarian": "Bulgaria",
  "Ukrainian": "Ukraine",
  "Slovak": "Slovakia",
  "Bosnian": "Bosnia and Herzegovina",
  "Slovenian": "Slovenia",
  "Albanian": "Albania",
  "Macedonian": "North Macedonia",
  "Icelandic": "Iceland",
  "Japanese": "Japan",
  "Korean": "South Korea",
  "Mandarin": "China",
  "Hindi": "India",
  "Bengali": "Bangladesh",
  "Urdu": "Pakistan",
  "Indonesian": "Indonesia",
  "Vietnamese": "Vietnam",
  "Thai": "Thailand",
  "Hebrew": "Israel",
  "Persian": "Iran"
}

// Expanded playing styles
const PLAYING_STYLES = [
  "Possession-based / Tiki-taka",
  "Counter-attack / Direct play",
  "High press / Gegenpressing",
  "Low block / Defensive",
  "Wing play / Crossing",
  "Through the middle / Narrow",
  "Long ball / Route one",
  "Flexible / Adaptable"
]

type LanguageProficiency = {
  language: string
  level: string
}

type OnboardingData = {
  // Screen 1 - Required
  primary_position: string
  current_salary_range: string
  preferred_regions: string[]
  preferred_countries: string[]
  languages: LanguageProficiency[]

  // Screen 2 - Optional
  contract_end_date: string
  desired_salary_range: string
  family_status: string
  youtube_highlight_url: string
  has_performance_reports: boolean
  performance_report_files: File[]

  // Screen 3 - Optional
  is_free_agent: boolean
  preferred_playing_style: string
  agent_name: string
  agent_email: string
  agent_phone: string
}

export default function PlayerOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>("")

  const [formData, setFormData] = useState<OnboardingData>({
    primary_position: "",
    current_salary_range: "",
    preferred_regions: [],
    preferred_countries: [],
    languages: [],
    contract_end_date: "",
    desired_salary_range: "",
    family_status: "",
    youtube_highlight_url: "",
    has_performance_reports: false,
    performance_report_files: [],
    is_free_agent: false,
    preferred_playing_style: "",
    agent_name: "",
    agent_email: "",
    agent_phone: ""
  })

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, clubs(*)')
        .eq('id', user.id)
        .single()

      if (!profile || profile.user_type !== 'player') {
        router.push('/dashboard')
        return
      }

      setUser({ user, profile })
    }
    checkAuth()
  }, [router, supabase])

  const handleInputChange = useCallback((field: keyof OnboardingData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleMultiSelect = useCallback((field: keyof OnboardingData, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }))
  }, [])

  const handleLanguageAdd = useCallback((language: string, level: string) => {
    setFormData(prev => {
      const existingIndex = prev.languages.findIndex(l => l.language === language)
      if (existingIndex >= 0) {
        const newLanguages = [...prev.languages]
        newLanguages[existingIndex] = { language, level }
        return { ...prev, languages: newLanguages }
      }
      return { ...prev, languages: [...prev.languages, { language, level }] }
    })
  }, [])

  const handleLanguageRemove = useCallback((language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l.language !== language)
    }))
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    const maxSize = 10 * 1024 * 1024 // 10MB

    const validFiles = newFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setError(`${file.name} is not a supported format. Please upload PDF, PNG, or JPEG files.`)
        return false
      }
      if (file.size > maxSize) {
        setError(`${file.name} is too large. Maximum file size is 10MB.`)
        return false
      }
      return true
    })

    setFormData(prev => ({
      ...prev,
      performance_report_files: [...prev.performance_report_files, ...validFiles]
    }))
    setError(null)
  }, [])

  const handleFileRemove = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      performance_report_files: prev.performance_report_files.filter((_, i) => i !== index)
    }))
  }, [])

  const validateStep1 = useCallback(() => {
    return formData.primary_position &&
           formData.current_salary_range &&
           (formData.preferred_regions.length > 0 || formData.preferred_countries.length > 0) &&
           formData.languages.length > 0
  }, [formData])

  const handleNext = useCallback(() => {
    if (currentStep === 1 && !validateStep1()) {
      setError("Please complete all required fields in Step 1")
      return
    }
    setError(null)
    setCurrentStep(prev => Math.min(3, prev + 1))
  }, [currentStep, validateStep1])

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }, [])

  const handleComplete = async () => {
    if (!validateStep1()) {
      setError("Please complete all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!supabase) return;

      // Upload physical performance reports to Supabase Storage if any
      const uploadedFileUrls: string[] = []
      if (formData.has_performance_reports && formData.performance_report_files.length > 0) {
        for (const file of formData.performance_report_files) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${user?.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('performance-reports')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('performance-reports')
            .getPublicUrl(fileName)

          uploadedFileUrls.push(publicUrl)
        }
      }

      // Prepare countries list (from both regions and specific countries)
      const allCountries = [
        ...formData.preferred_countries,
        ...formData.preferred_regions.flatMap(region => REGIONS[region as keyof typeof REGIONS] || [])
      ]
      const uniqueCountries = Array.from(new Set(allCountries))

      // Prepare languages array (just the language names with levels as suffix for storage)
      const languageStrings = formData.languages.map(l => `${l.language} (${l.level})`)

      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({
          playing_positions: [formData.primary_position],
          current_salary_range: formData.current_salary_range,
          preferred_countries: uniqueCountries,
          languages: languageStrings,
          contract_end_date: formData.contract_end_date || null,
          desired_salary_range: formData.desired_salary_range || null,
          family_status: formData.family_status || null,
          youtube_highlight_url: formData.youtube_highlight_url || null,
          has_performance_reports: formData.has_performance_reports,
          performance_report_urls: uploadedFileUrls.length > 0 ? uploadedFileUrls : null,
          preferred_playing_style: formData.preferred_playing_style || null,
          is_free_agent: formData.is_free_agent,
          agent_name: formData.is_free_agent ? null : (formData.agent_name || null),
          agent_email: formData.is_free_agent ? null : (formData.agent_email || null),
          agent_phone: formData.is_free_agent ? null : (formData.agent_phone || null),
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.user.id)

      if (updateError) {
        throw updateError
      }

      router.push('/dashboard')
    } catch (error: any) {
      console.error("Onboarding error:", error)
      setError(error.message || "An error occurred during onboarding")
    } finally {
      setLoading(false)
    }
  }

  const progressPercentage = (currentStep / 3) * 100

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 absolute top-8">
        <Logo />
      </div>

      <Card className="w-full max-w-2xl bg-gray-50 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-primary">
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                Step {currentStep} of 3: {STEPS[currentStep - 1].description}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-2">Progress</div>
              <Progress value={progressPercentage} className="w-24" />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Essential Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="position">What's your primary playing position? *</Label>
                <Select value={formData.primary_position} onValueChange={(value) => handleInputChange('primary_position', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your position..." />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(pos => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">What's your current monthly salary range? *</Label>
                <Select value={formData.current_salary_range} onValueChange={(value) => handleInputChange('current_salary_range', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salary range..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_RANGES.map(range => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Which regions/countries would you consider playing in? *
                </Label>
                <p className="text-sm text-muted-foreground">Select regions or specific countries</p>

                {/* Regions */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Regions</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                    {Object.keys(REGIONS).map(region => (
                      <div key={region} className="flex items-center space-x-2">
                        <Checkbox
                          id={`region-${region}`}
                          checked={formData.preferred_regions.includes(region)}
                          onCheckedChange={(checked) => handleMultiSelect('preferred_regions', region, checked as boolean)}
                        />
                        <Label htmlFor={`region-${region}`} className="text-sm">{region}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specific Countries */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Or select specific countries</Label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a region to see countries..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(REGIONS).map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRegion && (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                      {REGIONS[selectedRegion as keyof typeof REGIONS]?.map(country => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country}`}
                            checked={formData.preferred_countries.includes(country)}
                            onCheckedChange={(checked) => handleMultiSelect('preferred_countries', country, checked as boolean)}
                          />
                          <Label htmlFor={`country-${country}`} className="text-sm flex items-center gap-1">
                            {getCountryFlag(country)} {country}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected items display */}
                {(formData.preferred_regions.length > 0 || formData.preferred_countries.length > 0) && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {formData.preferred_regions.join(", ")}
                    {formData.preferred_regions.length > 0 && formData.preferred_countries.length > 0 && ", "}
                    {formData.preferred_countries.map(country => `${getCountryFlag(country)} ${country}`).join(", ")}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  What languages do you speak? * (Select proficiency level)
                </Label>

                {/* Add Language Dropdown */}
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(lang) => {
                      if (lang && !formData.languages.find(l => l.language === lang)) {
                        handleLanguageAdd(lang, "Fluent")
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a language to add..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.keys(LANGUAGES)
                        .filter(lang => !formData.languages.find(l => l.language === lang))
                        .map(lang => (
                          <SelectItem key={lang} value={lang}>
                            <span className="flex items-center gap-2">
                              {getCountryFlag(LANGUAGE_FLAGS[lang])} {lang}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Languages with Proficiency */}
                {formData.languages.length > 0 && (
                  <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Selected Languages:</p>
                    {formData.languages.map(lang => (
                      <div key={lang.language} className="flex items-center justify-between gap-2 bg-background rounded-md p-2">
                        <span className="font-medium text-sm flex items-center gap-2">
                          {getCountryFlag(LANGUAGE_FLAGS[lang.language])} {lang.language}
                        </span>
                        <div className="flex items-center gap-2">
                          <Select
                            value={lang.level}
                            onValueChange={(level) => handleLanguageAdd(lang.language, level)}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES[lang.language as keyof typeof LANGUAGES].map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleLanguageRemove(lang.language)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Enhanced Matching */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="contract_end">When does your current contract end?</Label>
                <Input
                  id="contract_end"
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => handleInputChange('contract_end_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desired_salary">What's your ideal monthly salary range?</Label>
                <Select value={formData.desired_salary_range} onValueChange={(value) => handleInputChange('desired_salary_range', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select desired salary range..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_RANGES.map(range => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="family">What's your family situation?</Label>
                <Select value={formData.family_status} onValueChange={(value) => handleInputChange('family_status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="family_with_children">Family with children</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube" className="flex items-center gap-2">
                  Do you have a highlight video? (YouTube URL)
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="youtube"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtube_highlight_url}
                  onChange={(e) => handleInputChange('youtube_highlight_url', e.target.value)}
                />
              </div>

              {/* Physical Performance Reports Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-base font-medium">Physical Performance Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Do you have performance data from Catapult, PlayerData, gpexe, or similar systems?
                    </p>
                  </div>
                  <Switch
                    checked={formData.has_performance_reports}
                    onCheckedChange={(checked) => handleInputChange('has_performance_reports', checked)}
                  />
                </div>

                {formData.has_performance_reports && (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="performance-reports" className="text-sm font-medium">
                        Upload your physical performance reports
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Accepted formats: PDF, PNG, JPEG • Max size: 10MB per file
                      </p>

                      <div className="flex items-center gap-2">
                        <Input
                          id="performance-reports"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('performance-reports')?.click()}
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Choose Files
                        </Button>
                      </div>

                      {/* Display uploaded files */}
                      {formData.performance_report_files.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <Label className="text-sm font-medium">Uploaded Files:</Label>
                          <div className="space-y-2">
                            {formData.performance_report_files.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 border rounded-md"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                  <span className="text-sm truncate">{file.name}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFileRemove(index)}
                                  className="flex-shrink-0 ml-2"
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-xs text-green-900 dark:text-green-100">
                        <strong>Why this matters:</strong> Physical performance data gives clubs objective insights into your fitness, speed, stamina, and work rate. This data significantly enhances your profile and makes you more attractive to data-driven clubs.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Professional Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="playing_style" className="flex items-center gap-2">
                  What's your preferred playing style?
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Select value={formData.preferred_playing_style} onValueChange={(value) => handleInputChange('preferred_playing_style', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select playing style..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYING_STYLES.map(style => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-base font-medium">Are you a free agent?</Label>
                    <p className="text-sm text-muted-foreground">
                      Not represented by an agent
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_free_agent}
                    onCheckedChange={(checked) => handleInputChange('is_free_agent', checked)}
                  />
                </div>

                {!formData.is_free_agent && (
                  <>
                    <Label className="text-base font-medium">Agent Information (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Provide your agent's contact details
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="agent_name">Agent Name</Label>
                        <Input
                          id="agent_name"
                          placeholder="Agent's full name"
                          value={formData.agent_name}
                          onChange={(e) => handleInputChange('agent_name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="agent_email">Agent Email</Label>
                        <Input
                          id="agent_email"
                          type="email"
                          placeholder="agent@example.com"
                          value={formData.agent_email}
                          onChange={(e) => handleInputChange('agent_email', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="agent_phone">Agent Phone</Label>
                        <Input
                          id="agent_phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={formData.agent_phone}
                          onChange={(e) => handleInputChange('agent_phone', e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 mt-8 border-t">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? "Completing..." : (
                  <>
                    Complete Profile
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of 3 • You can skip optional steps and complete them later
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
