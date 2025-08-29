"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Logo } from "@/components/logo"
// Remove server-side import since this is a client component

const STEPS = [
  { id: 1, title: "Essential Info", description: "Core information for matching" },
  { id: 2, title: "Enhance Matching", description: "Additional preferences" },
  { id: 3, title: "Professional Info", description: "Playing style & representation" }
]

const COUNTRIES = [
  "England", "Spain", "Germany", "France", "Italy", "Netherlands", 
  "Portugal", "Belgium", "Turkey", "Greece", "Switzerland", "Austria",
  "Poland", "Czech Republic", "Croatia", "Serbia", "Denmark", "Sweden",
  "Norway", "Scotland", "Ireland", "Wales", "Romania", "Bulgaria"
]

const LANGUAGES = [
  "English", "Spanish", "German", "French", "Italian", "Dutch", 
  "Portuguese", "Turkish", "Greek", "Polish", "Croatian", "Serbian",
  "Danish", "Swedish", "Norwegian", "Romanian", "Bulgarian", "Czech"
]

const POSITIONS = [
  "Goalkeeper", "Centre Back", "Full Back", "Defensive Midfielder",
  "Central Midfielder", "Attacking Midfielder", "Winger", "Centre Forward"
]

type OnboardingData = {
  // Screen 1 - Required
  primary_position: string
  current_salary_range: string
  preferred_countries: string[]
  languages: string[]
  
  // Screen 2 - Optional
  contract_end_date: string
  desired_salary_range: string
  family_status: string
  youtube_highlight_url: string
  
  // Screen 3 - Optional
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

  const [formData, setFormData] = useState<OnboardingData>({
    primary_position: "",
    current_salary_range: "",
    preferred_countries: [],
    languages: [],
    contract_end_date: "",
    desired_salary_range: "",
    family_status: "",
    youtube_highlight_url: "",
    preferred_playing_style: "",
    agent_name: "",
    agent_email: "",
    agent_phone: ""
  })

  useEffect(() => {
    const checkAuth = async () => {
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

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelect = (field: keyof OnboardingData, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }))
  }

  const validateStep1 = () => {
    return formData.primary_position && 
           formData.current_salary_range && 
           formData.preferred_countries.length > 0 && 
           formData.languages.length > 0
  }

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) {
      setError("Please complete all required fields in Step 1")
      return
    }
    setError(null)
    setCurrentStep(prev => Math.min(3, prev + 1))
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  const handleComplete = async () => {
    if (!validateStep1()) {
      setError("Please complete all required fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Update player_profiles with onboarding data
      const { error: updateError } = await supabase
        .from('player_profiles')
        .update({
          // Convert arrays to PostgreSQL format
          playing_positions: [formData.primary_position],
          current_salary_range: formData.current_salary_range,
          preferred_countries: formData.preferred_countries,
          languages: formData.languages,
          contract_end_date: formData.contract_end_date || null,
          desired_salary_range: formData.desired_salary_range || null,
          family_status: formData.family_status || null,
          youtube_highlight_url: formData.youtube_highlight_url || null,
          preferred_playing_style: formData.preferred_playing_style || null,
          agent_name: formData.agent_name || null,
          agent_email: formData.agent_email || null,
          agent_phone: formData.agent_phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.user.id)

      if (updateError) {
        throw updateError
      }

      // Success! Redirect to player dashboard
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
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="mb-8 absolute top-8">
        <Logo />
      </div>
      
      <Card className="w-full max-w-2xl bg-gray-50 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-[#3144C3]">
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
                    <SelectItem value="Under €5k">Under €5k</SelectItem>
                    <SelectItem value="€5-10k">€5k - €10k</SelectItem>
                    <SelectItem value="€10-20k">€10k - €20k</SelectItem>
                    <SelectItem value="€20-40k">€20k - €40k</SelectItem>
                    <SelectItem value="€40k+">€40k+</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Which countries would you consider playing in? * (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {COUNTRIES.map(country => (
                    <div key={country} className="flex items-center space-x-2">
                      <Checkbox
                        id={country}
                        checked={formData.preferred_countries.includes(country)}
                        onCheckedChange={(checked) => handleMultiSelect('preferred_countries', country, checked as boolean)}
                      />
                      <Label htmlFor={country} className="text-sm">{country}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>What languages do you speak fluently? * (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {LANGUAGES.map(language => (
                    <div key={language} className="flex items-center space-x-2">
                      <Checkbox
                        id={language}
                        checked={formData.languages.includes(language)}
                        onCheckedChange={(checked) => handleMultiSelect('languages', language, checked as boolean)}
                      />
                      <Label htmlFor={language} className="text-sm">{language}</Label>
                    </div>
                  ))}
                </div>
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
                    <SelectItem value="Under €5k">Under €5k</SelectItem>
                    <SelectItem value="€5-10k">€5k - €10k</SelectItem>
                    <SelectItem value="€10-20k">€10k - €20k</SelectItem>
                    <SelectItem value="€20-40k">€20k - €40k</SelectItem>
                    <SelectItem value="€40k+">€40k+</SelectItem>
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
                <Label htmlFor="youtube">Do you have a highlight video? (YouTube URL)</Label>
                <Input
                  id="youtube"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtube_highlight_url}
                  onChange={(e) => handleInputChange('youtube_highlight_url', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Professional Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="playing_style">What's your preferred playing style?</Label>
                <Select value={formData.preferred_playing_style} onValueChange={(value) => handleInputChange('preferred_playing_style', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select playing style..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="possession">Possession-based</SelectItem>
                    <SelectItem value="counter_attack">Counter-attack</SelectItem>
                    <SelectItem value="high_press">High press</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-medium">Agent Information (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you represented by an agent?
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
                className="bg-[#3144C3] hover:bg-[#3144C3]/90"
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