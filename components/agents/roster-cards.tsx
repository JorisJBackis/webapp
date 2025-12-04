"use client"

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Trash2,
  Edit,
  Save,
  X,
  ExternalLink,
  User,
  Calendar,
  Euro,
  Ruler,
  MapPin,
  Filter,
  RotateCcw,
  Grid3x3,
  LayoutGrid,
  Grid2x2,
  ChevronsUpDown,
  Search,
  BarChart3,
  Upload,
  Loader2
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { RosterPlayer } from '@/app/dashboard/agents/roster/page'
import { getCountryFlag, isEUCountry } from '@/lib/utils/country-flags'
import { getPlayerImageUrl } from '@/lib/utils'
import PlayerStatsModal from './player-stats-modal'

interface RosterCardsProps {
  roster: RosterPlayer[]
  onPlayerRemoved: (playerId: number) => void
  onNotesUpdated: (playerId: number, newNotes: string) => void
  onRosterRefresh: () => void
}

export default function RosterCards({ roster, onPlayerRemoved, onNotesUpdated, onRosterRefresh }: RosterCardsProps) {
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [removingPlayer, setRemovingPlayer] = useState<number | null>(null)
  const [playerToRemove, setPlayerToRemove] = useState<RosterPlayer | null>(null)
  const [statsModalPlayer, setStatsModalPlayer] = useState<RosterPlayer | null>(null)

  // Field editing state
  const [editingField, setEditingField] = useState<{ playerId: number; field: string } | null>(null)
  const [fieldValue, setFieldValue] = useState<string>('')
  const [savingField, setSavingField] = useState(false)

  // Image upload state
  const [uploadingImageForPlayer, setUploadingImageForPlayer] = useState<number | null>(null)
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set())

  // Nationality dropdown state
  const [nationalitySearch, setNationalitySearch] = useState('')
  const [openNationality, setOpenNationality] = useState(false)
  const [primaryNationality, setPrimaryNationality] = useState('')
  const [secondaryNationality, setSecondaryNationality] = useState('')
  const [openSecondaryNationality, setOpenSecondaryNationality] = useState(false)
  const [secondaryNationalitySearch, setSecondaryNationalitySearch] = useState('')

  // View density state
  const [viewDensity, setViewDensity] = useState<'default' | 'compact' | 'ultra'>('default')

  // Filters and sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [euPassportFilter, setEuPassportFilter] = useState('all')
  const [contractExpiryFilter, setContractExpiryFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'market_value' | 'added' | 'contract_expiry'>('market_value')

  const supabase = createClient()

  // List of all nationalities (extracted from common football nations)
  const nationalities = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
    'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
    'Benin', 'Bhutan', 'Bolivia', 'Bosnia-Herzegovina', 'Botswana', 'Brazil',
    'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
    'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic',
    'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Czechia',
    'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
    'DR Congo', 'Ecuador', 'Egypt', 'El Salvador', 'England', 'Equatorial Guinea',
    'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
    'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
    'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
    'Haiti', 'Honduras', 'Hong Kong', 'Hungary',
    'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    "Ivory Coast", "Côte d'Ivoire",
    'Jamaica', 'Japan', 'Jordan',
    'Kazakhstan', 'Kenya', 'Korea', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
    'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
    'Lithuania', 'Luxembourg',
    'Macau', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
    'Malta', 'Mauritania', 'Mauritius', 'Mexico', 'Moldova', 'Monaco', 'Mongolia',
    'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
    'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
    'Nigeria', 'North Korea', 'Northern Ireland', 'North Macedonia', 'Norway',
    'Oman',
    'Pakistan', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
    'Philippines', 'Poland', 'Portugal',
    'Qatar',
    'Romania', 'Russia', 'Rwanda',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
    'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Scotland',
    'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia',
    'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
    'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
    'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
    'UAE', 'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
    'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
    'Wales',
    'Yemen',
    'Zambia', 'Zimbabwe'
  ].sort()

  // Density configuration
  const densityConfig = {
    default: {
      gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      photoSize: 'w-24 h-24',
      titleSize: 'text-lg',
      textSize: 'text-sm',
      gap: 'gap-6',
      padding: 'p-6',
      badgeSize: 'text-sm',
      statsGap: 'gap-2'
    },
    compact: {
      gridCols: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4',
      photoSize: 'w-20 h-20',
      titleSize: 'text-base',
      textSize: 'text-xs',
      gap: 'gap-4',
      padding: 'p-4',
      badgeSize: 'text-xs',
      statsGap: 'gap-1.5'
    },
    ultra: {
      gridCols: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
      photoSize: 'w-16 h-16',
      titleSize: 'text-sm',
      textSize: 'text-[10px]',
      gap: 'gap-3',
      padding: 'p-3',
      badgeSize: 'text-[10px]',
      statsGap: 'gap-1'
    }
  }

  const currentDensity = densityConfig[viewDensity]

  // Get unique positions and tiers for filters
  const uniquePositions = useMemo(() => {
    const positions = [...new Set(roster.map(p => p.position).filter(Boolean))]
    return positions.sort()
  }, [roster])

  const uniqueTiers = useMemo(() => {
    const tiers = [...new Set(roster.map(p => p.league_tier).filter(Boolean))]
    return tiers.sort((a, b) => a! - b!)
  }, [roster])

  // Apply filters and sorting
  const filteredRoster = useMemo(() => {
    let filtered = roster

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.club_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(p => p.position === positionFilter)
    }

    // EU Passport filter - use dynamic calculation based on nationality (with override)
    if (euPassportFilter === 'yes') {
      filtered = filtered.filter(p => isEUCountry(p.nationality))
    } else if (euPassportFilter === 'no') {
      filtered = filtered.filter(p => !isEUCountry(p.nationality))
    }

    // Contract Expiry filter
    if (contractExpiryFilter === '6_months') {
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      filtered = filtered.filter(p => {
        if (!p.contract_expires) return false
        const expiryDate = new Date(p.contract_expires)
        const now = new Date()
        return expiryDate <= sixMonthsFromNow && expiryDate >= now
      })
    } else if (contractExpiryFilter === '12_months') {
      const twelveMonthsFromNow = new Date()
      twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12)
      filtered = filtered.filter(p => {
        if (!p.contract_expires) return false
        const expiryDate = new Date(p.contract_expires)
        const now = new Date()
        return expiryDate <= twelveMonthsFromNow && expiryDate >= now
      })
    } else if (contractExpiryFilter === 'expired') {
      filtered = filtered.filter(p => {
        if (!p.contract_expires) return false
        return new Date(p.contract_expires) < new Date()
      })
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(p => p.league_tier === parseInt(tierFilter))
    }

    // Apply sorting
    if (sortBy === 'contract_expiry') {
      filtered = [...filtered].sort((a, b) => {
        if (!a.contract_expires) return 1
        if (!b.contract_expires) return -1
        return new Date(a.contract_expires).getTime() - new Date(b.contract_expires).getTime()
      })
    } else if (sortBy === 'added') {
      filtered = [...filtered].sort((a, b) =>
        new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      )
    } else if (sortBy === 'market_value') {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.market_value_eur || 0
        const bValue = b.market_value_eur || 0
        return bValue - aValue
      })
    }

    return filtered
  }, [roster, searchTerm, positionFilter, euPassportFilter, contractExpiryFilter, tierFilter, sortBy])

  const handleStartEditNotes = (player: RosterPlayer) => {
    setEditingNotes(player.player_id)
    setNotesValue(player.agent_notes || '')
  }

  const handleCancelEditNotes = () => {
    setEditingNotes(null)
    setNotesValue('')
  }

  const handleSaveNotes = async (playerId: number) => {
    try {
      setSavingNotes(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('agent_rosters')
        .update({ notes: notesValue || null, updated_at: new Date().toISOString() })
        .eq('agent_id', user.id)
        .eq('player_id', playerId)

      if (error) throw error

      onNotesUpdated(playerId, notesValue)
      setEditingNotes(null)
      setNotesValue('')
    } catch (err: any) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes: ' + err.message)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleRemovePlayer = async () => {
    if (!playerToRemove) return

    try {
      setRemovingPlayer(playerToRemove.player_id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('remove_player_from_roster', {
        p_agent_id: user.id,
        p_player_id: playerToRemove.player_id
      })

      if (error) throw error

      onPlayerRemoved(playerToRemove.player_id)
      setPlayerToRemove(null)
    } catch (err: any) {
      console.error('Error removing player:', err)
      alert('Failed to remove player: ' + err.message)
    } finally {
      setRemovingPlayer(null)
    }
  }

  const handleStartFieldEdit = (playerId: number, field: string, currentValue: any) => {
    setEditingField({ playerId, field })

    // For nationality, parse dual nationalities
    if (field === 'nationality') {
      if (currentValue) {
        const valueStr = currentValue.toString()
        if (valueStr.includes(' / ')) {
          const [primary, secondary] = valueStr.split(' / ').map(n => n.trim())
          setPrimaryNationality(primary)
          setSecondaryNationality(secondary)
        } else {
          setPrimaryNationality(valueStr)
          setSecondaryNationality('')
        }
        setFieldValue(valueStr)
      } else {
        // No nationality set yet - initialize to empty
        setPrimaryNationality('')
        setSecondaryNationality('')
        setFieldValue('')
      }
    }
    // For date fields, ensure we use YYYY-MM-DD format
    else if (field === 'contract' && currentValue) {
      // If it's already in YYYY-MM-DD format, use it directly
      const valueStr = currentValue.toString()
      if (/^\d{4}-\d{2}-\d{2}/.test(valueStr)) {
        setFieldValue(valueStr.split('T')[0]) // Take just the date part if it includes time
      } else {
        // Otherwise parse and format
        try {
          const date = new Date(currentValue)
          const yyyy = date.getUTCFullYear()
          const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
          const dd = String(date.getUTCDate()).padStart(2, '0')
          setFieldValue(`${yyyy}-${mm}-${dd}`)
        } catch {
          setFieldValue(valueStr)
        }
      }
    }
    // For foot field, default to 'right' if empty
    else if (field === 'foot') {
      setFieldValue(currentValue?.toString() || 'right')
    } else {
      setFieldValue(currentValue?.toString() || '')
    }
  }

  const handleCancelFieldEdit = () => {
    setEditingField(null)
    setFieldValue('')
    setPrimaryNationality('')
    setSecondaryNationality('')
  }

  const handleSaveField = async () => {
    if (!editingField) return

    try {
      setSavingField(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Prepare parameters based on field type
      const params: any = {
        p_agent_id: user.id,
        p_player_id: editingField.playerId,
        p_position: null,
        p_age: null,
        p_height: null,
        p_foot: null,
        p_nationality: null,
        p_contract_expires: null,
        p_market_value: null
      }

      // Set the specific field value
      if (editingField.field === 'position') {
        params.p_position = fieldValue || null
      } else if (editingField.field === 'age') {
        params.p_age = fieldValue ? parseInt(fieldValue) : null
      } else if (editingField.field === 'height') {
        params.p_height = fieldValue ? parseInt(fieldValue) : null
      } else if (editingField.field === 'foot') {
        params.p_foot = fieldValue || null
      } else if (editingField.field === 'nationality') {
        // Combine primary and secondary nationality
        const secondary = secondaryNationality?.trim()
        if (primaryNationality && secondary) {
          params.p_nationality = `${primaryNationality} / ${secondary}`
        } else if (primaryNationality) {
          params.p_nationality = primaryNationality
        } else {
          params.p_nationality = null
        }
      } else if (editingField.field === 'contract') {
        // Append time to ensure no timezone shift (use noon UTC to avoid any date boundary issues)
        params.p_contract_expires = fieldValue ? `${fieldValue}T12:00:00Z` : null
      } else if (editingField.field === 'value') {
        params.p_market_value = fieldValue ? parseInt(fieldValue) : null
      }

      const { error } = await supabase.rpc('upsert_player_override', params)

      if (error) throw error

      // Refresh the roster data
      setEditingField(null)
      setFieldValue('')
      setPrimaryNationality('')
      setSecondaryNationality('')
      onRosterRefresh()
    } catch (err: any) {
      console.error('Error saving field:', err)
      alert('Failed to save field: ' + err.message)
    } finally {
      setSavingField(false)
    }
  }

  const handleResetField = async (playerId: number, field: string) => {
    try {
      setSavingField(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('reset_player_override_field', {
        p_agent_id: user.id,
        p_player_id: playerId,
        p_field: field
      })

      if (error) throw error

      // Refresh the roster data
      onRosterRefresh()
    } catch (err: any) {
      console.error('Error resetting field:', err)
      alert('Failed to reset field: ' + err.message)
    } finally {
      setSavingField(false)
    }
  }

  const handleImageUpload = async (playerId: number, file: File) => {
    try {
      setUploadingImageForPlayer(playerId)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB')
      }

      // Create unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${playerId}_${Date.now()}.${fileExt}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('player-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-images')
        .getPublicUrl(fileName)

      // Save URL to database via RPC
      const { error: rpcError } = await supabase.rpc('upsert_player_override', {
        p_agent_id: user.id,
        p_player_id: playerId,
        p_picture_url: publicUrl
      })

      if (rpcError) throw rpcError

      // Refresh the roster data
      onRosterRefresh()
    } catch (err: any) {
      console.error('Error uploading image:', err)
      alert('Failed to upload image: ' + err.message)
    } finally {
      setUploadingImageForPlayer(null)
    }
  }

  const handleResetImage = async (playerId: number) => {
    try {
      setUploadingImageForPlayer(playerId)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('reset_player_override_field', {
        p_agent_id: user.id,
        p_player_id: playerId,
        p_field: 'picture'
      })

      if (error) throw error

      // Refresh the roster data
      onRosterRefresh()
    } catch (err: any) {
      console.error('Error resetting image:', err)
      alert('Failed to reset image: ' + err.message)
    } finally {
      setUploadingImageForPlayer(null)
    }
  }

  const renderEditableInline = (
    playerId: number,
    field: string,
    value: any,
    hasOverride: boolean,
    originalValue: any,
    inputType: string = 'text',
    placeholder?: string,
    formatDisplayValue?: (val: any) => string,
    suffix?: string
  ) => {
    const isEditing = editingField?.playerId === playerId && editingField?.field === field

    if (isEditing) {
      // Special handling for position field - use dropdown
      if (field === 'position') {
        const positions = [
          'Goalkeeper',
          'Centre-Back',
          'Left-Back',
          'Right-Back',
          'Defensive Midfield',
          'Central Midfield',
          'Left Midfield',
          'Right Midfield',
          'Attacking Midfield',
          'Left Winger',
          'Right Winger',
          'Centre-Forward'
        ]

        return (
          <div className="flex items-center gap-1 min-w-0">
            <Select value={fieldValue} onValueChange={setFieldValue} disabled={savingField}>
              <SelectTrigger className="h-7 text-xs w-40 text-foreground">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map(pos => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleSaveField}
              disabled={savingField}
              className="h-7 w-7 p-0 shrink-0"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelFieldEdit}
              disabled={savingField}
              className="h-7 w-7 p-0 shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )
      }

      // Special handling for foot field - use dropdown
      if (field === 'foot') {
        const footOptions = [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'both', label: 'Both' }
        ]

        return (
          <div className="flex items-center gap-1 min-w-0">
            <Select value={fieldValue} onValueChange={setFieldValue} disabled={savingField}>
              <SelectTrigger className="h-7 text-xs w-24 text-foreground">
                <SelectValue placeholder="Select foot" />
              </SelectTrigger>
              <SelectContent>
                {footOptions.map(foot => (
                  <SelectItem key={foot.value} value={foot.value}>
                    {foot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleSaveField}
              disabled={savingField}
              className="h-7 w-7 p-0 shrink-0"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelFieldEdit}
              disabled={savingField}
              className="h-7 w-7 p-0 shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )
      }

      // Special handling for nationality field - use dual searchable dropdowns
      if (field === 'nationality') {
        const filteredPrimaryNationalities = nationalities.filter(nat =>
          nat.toLowerCase().includes(nationalitySearch.toLowerCase())
        )
        const filteredSecondaryNationalities = nationalities.filter(nat =>
          nat.toLowerCase().includes(secondaryNationalitySearch.toLowerCase()) &&
          nat !== primaryNationality // Don't show already selected primary
        )

        return (
          <div className="flex flex-col gap-2 min-w-0">
            {/* Primary Nationality */}
            <div className="flex items-center gap-1">
              <Popover modal={true} open={openNationality} onOpenChange={(open) => {
                setOpenNationality(open)
                if (!open) setNationalitySearch('')
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openNationality}
                    className="h-7 text-xs w-36 justify-between text-foreground"
                    disabled={savingField}
                  >
                    {primaryNationality || 'Primary'}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                  <div className="flex items-center border-b px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Search nationality..."
                      className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 bg-transparent"
                      value={nationalitySearch}
                      onChange={(e) => setNationalitySearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredPrimaryNationalities.map((nat) => (
                      <div
                        key={nat}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setPrimaryNationality(nat)
                          setOpenNationality(false)
                          setNationalitySearch('')
                        }}
                      >
                        <span className="mr-2">{getCountryFlag(nat) || '🌍'}</span>
                        {nat}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Secondary Nationality or Add Button */}
              {(secondaryNationality && secondaryNationality.trim()) || openSecondaryNationality ? (
                <>
                  <Popover modal={true} open={openSecondaryNationality} onOpenChange={(open) => {
                    setOpenSecondaryNationality(open)
                    if (!open) {
                      setSecondaryNationalitySearch('')
                      // If closing without selection, clear the secondary nationality
                      if (!secondaryNationality || !secondaryNationality.trim()) {
                        setSecondaryNationality('')
                      }
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSecondaryNationality}
                        className="h-7 text-xs w-36 justify-between text-foreground"
                        disabled={savingField}
                      >
                        {(secondaryNationality && secondaryNationality.trim()) || 'Secondary'}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                      <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="Search nationality..."
                          className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 bg-transparent"
                          value={secondaryNationalitySearch}
                          onChange={(e) => setSecondaryNationalitySearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto p-1">
                        {filteredSecondaryNationalities.map((nat) => (
                          <div
                            key={nat}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setSecondaryNationality(nat)
                              setOpenSecondaryNationality(false)
                              setSecondaryNationalitySearch('')
                            }}
                          >
                            <span className="mr-2">{getCountryFlag(nat) || '🌍'}</span>
                            {nat}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {secondaryNationality && secondaryNationality.trim() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSecondaryNationality('')
                        setOpenSecondaryNationality(false)
                      }}
                      disabled={savingField}
                      className="h-7 w-7 p-0"
                      title="Remove second nationality"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpenSecondaryNationality(true)
                  }}
                  disabled={savingField}
                  className="h-7 text-xs px-2"
                  title="Add second nationality"
                >
                  + Add 2nd
                </Button>
              )}
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={handleSaveField}
                disabled={savingField || !primaryNationality}
                className="flex-1 h-7"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelFieldEdit}
                disabled={savingField}
                className="h-7"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      }

      // Regular input for other fields
      return (
        <div className="flex items-center gap-1 min-w-0">
          <Input
            type={inputType}
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveField()
              if (e.key === 'Escape') handleCancelFieldEdit()
            }}
            className={`h-7 text-xs ${inputType === 'date' ? 'w-[100px]' : 'w-20'} text-foreground shrink-0`}
            autoFocus
            disabled={savingField}
            placeholder={placeholder}
            onFocus={(e) => {
              if (inputType === 'date') {
                e.target.showPicker?.()
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleSaveField}
            disabled={savingField}
            className="h-7 w-7 p-0 shrink-0"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancelFieldEdit}
            disabled={savingField}
            className="h-7 w-7 p-0 shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    const displayValue = formatDisplayValue ? formatDisplayValue(value) : (value || 'N/A')
    const originalDisplayValue = formatDisplayValue ? formatDisplayValue(originalValue) : (originalValue || 'N/A')

    return (
      <span
        onDoubleClick={() => handleStartFieldEdit(playerId, field, value)}
        className="cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded inline-flex items-center gap-1 transition-colors"
        title={hasOverride ? `Original: ${originalDisplayValue} (Double-click to edit)` : 'Double-click to edit'}
      >
        {hasOverride && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Edited by you" />
        )}
        {displayValue}
        {suffix && <span>{suffix}</span>}
        {hasOverride && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              handleResetField(playerId, field)
            }}
            className="h-4 w-4 p-0 opacity-0 group-hover/field:opacity-100 hover:opacity-100 transition-opacity ml-1 shrink-0"
            title="Reset to original value"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
        )}
      </span>
    )
  }

  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`
    return `€${value}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
  }

  const formatFoot = (foot: string | null) => {
    if (!foot) return 'N/A'
    const footLower = foot.toLowerCase()
    if (footLower === 'right') return 'Right'
    if (footLower === 'left') return 'Left'
    if (footLower === 'both') return 'Both'
    return foot.charAt(0).toUpperCase() + foot.slice(1)
  }

  const isContractExpiringSoon = (contractExpires: string | null): boolean => {
    if (!contractExpires) return false
    const expiryDate = new Date(contractExpires)
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    return expiryDate <= sixMonthsFromNow && expiryDate >= new Date()
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="w-full md:flex-1">
          <Label htmlFor="search" className="text-xs">Search</Label>
          <Input
            id="search"
            placeholder="Player, club, nationality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="w-full md:w-[140px] md:flex-shrink-0">
          <Label htmlFor="position" className="text-xs">Position</Label>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger id="position" className="h-9">
              <SelectValue placeholder="All positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {uniquePositions.map(pos => (
                <SelectItem key={pos} value={pos!}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[130px] md:flex-shrink-0">
          <Label htmlFor="eu-passport" className="text-xs">EU Passport</Label>
          <Select value={euPassportFilter} onValueChange={setEuPassportFilter}>
            <SelectTrigger id="eu-passport" className="h-9">
              <SelectValue placeholder="All players" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              <SelectItem value="yes">🇪🇺 EU Passport</SelectItem>
              <SelectItem value="no">Non-EU</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[150px] md:flex-shrink-0">
          <Label htmlFor="contract-expiry" className="text-xs">Contract Expiry</Label>
          <Select value={contractExpiryFilter} onValueChange={setContractExpiryFilter}>
            <SelectTrigger id="contract-expiry" className="h-9">
              <SelectValue placeholder="All contracts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contracts</SelectItem>
              <SelectItem value="6_months">Expiring in 6 months</SelectItem>
              <SelectItem value="12_months">Expiring in 12 months</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-[120px] md:flex-shrink-0">
          <Label htmlFor="tier" className="text-xs">League Tier</Label>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger id="tier" className="h-9">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {uniqueTiers.map(tier => (
                <SelectItem key={tier} value={tier!.toString()}>
                  Tier {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count and View Density Toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRoster.length} of {roster.length} players
        </p>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: 'market_value' | 'added' | 'contract_expiry') => setSortBy(value)}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market_value">Market Value</SelectItem>
                <SelectItem value="added">Recently Added</SelectItem>
                <SelectItem value="contract_expiry">Contract Expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View density */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              size="sm"
              variant={viewDensity === 'default' ? 'secondary' : 'ghost'}
              onClick={() => setViewDensity('default')}
              className="h-7 px-2"
              title="Default view (3 per row)"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewDensity === 'compact' ? 'secondary' : 'ghost'}
              onClick={() => setViewDensity('compact')}
              className="h-7 px-2"
              title="Compact view (4 per row)"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewDensity === 'ultra' ? 'secondary' : 'ghost'}
              onClick={() => setViewDensity('ultra')}
              className="h-7 px-2"
              title="Ultra compact view (6 per row)"
            >
              <Grid2x2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className={`grid ${currentDensity.gridCols} ${currentDensity.gap}`}>
        {filteredRoster.map((player) => (
          <Card key={player.player_id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
              {/* Header with player photo */}
              <div className={`relative bg-gradient-to-br from-primary/10 to-primary/5 ${currentDensity.padding}`}>
                <div className={`flex items-start ${viewDensity === 'ultra' ? 'gap-2' : 'gap-4'}`}>
                  {/* Player Photo with Upload */}
                  <div className="flex-shrink-0 relative">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`photo-upload-${player.player_id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(player.player_id, file)
                        }
                        e.target.value = '' // Reset input
                      }}
                      disabled={uploadingImageForPlayer === player.player_id}
                    />

                    {/* Photo display */}
                    {(() => {
                      const imageUrl = getPlayerImageUrl(player.picture_url, player.sofascore_id, player.picture_url_override)
                      const isBroken = brokenImages.has(player.player_id)
                      const showPlaceholder = !imageUrl || isBroken

                      return (
                        <>
                          {imageUrl && !isBroken && (
                            <img
                              src={imageUrl}
                              alt={player.player_name}
                              className={`${currentDensity.photoSize} rounded-lg object-cover border-2 ${player.has_picture_override ? 'border-blue-500' : 'border-background'} shadow-md`}
                              onError={() => {
                                setBrokenImages(prev => new Set(prev).add(player.player_id))
                              }}
                            />
                          )}

                          {/* Placeholder - shows when no image or image failed */}
                          {showPlaceholder && (
                            <div className={`${currentDensity.photoSize} rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md`}>
                              <User className={`${viewDensity === 'ultra' ? 'h-8 w-8' : viewDensity === 'compact' ? 'h-10 w-10' : 'h-12 w-12'} text-muted-foreground`} />
                            </div>
                          )}

                          {/* Reset button - shows when custom photo exists */}
                          {player.has_picture_override && !isBroken && (
                            <button
                              onClick={() => handleResetImage(player.player_id)}
                              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center border-2 border-background shadow-md transition-colors cursor-pointer"
                              title="Reset to original photo"
                            >
                              <RotateCcw className="h-2.5 w-2.5 text-white" />
                            </button>
                          )}

                          {/* Upload button - shows when no image or image failed */}
                          {showPlaceholder && (
                            <button
                              onClick={() => document.getElementById(`photo-upload-${player.player_id}`)?.click()}
                              disabled={uploadingImageForPlayer === player.player_id}
                              className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center border-2 border-background shadow-md transition-colors cursor-pointer"
                              title="Upload photo"
                            >
                              {uploadingImageForPlayer === player.player_id ? (
                                <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3 text-primary-foreground" />
                              )}
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    {/* Player Name - Clickable */}
                    {player.player_transfermarkt_url ? (
                      <a
                        href={player.player_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <h3 className={`font-bold ${currentDensity.titleSize} truncate ${viewDensity === 'ultra' ? 'mb-0.5' : 'mb-1'}`}>{player.player_name}</h3>
                      </a>
                    ) : (
                      <h3 className={`font-bold ${currentDensity.titleSize} truncate ${viewDensity === 'ultra' ? 'mb-0.5' : 'mb-1'}`}>{player.player_name}</h3>
                    )}

                    {/* Position & Age */}
                    <div className={`flex ${viewDensity === 'ultra' ? 'gap-1 mb-1' : 'gap-2 mb-2'} group/field`}>
                      <Badge className="bg-primary text-primary-foreground flex items-center gap-1 whitespace-nowrap text-xs">
                        {renderEditableInline(
                          player.player_id,
                          'position',
                          player.position,
                          player.has_position_override,
                          player.original_position,
                          'text',
                          'Position'
                        )}
                      </Badge>
                      <Badge variant="outline" className="group/field flex items-center gap-1 border-2 whitespace-nowrap shrink-0 text-xs">
                        {renderEditableInline(
                          player.player_id,
                          'age',
                          player.age,
                          player.has_age_override,
                          player.original_age,
                          'number',
                          'Age',
                          undefined,
                          ' years'
                        )}
                      </Badge>
                    </div>

                    {/* Nationality */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground group/field whitespace-nowrap">
                      <span className={viewDensity === 'ultra' ? 'text-sm' : 'text-lg'}>{getCountryFlag(player.nationality || '')}</span>
                      {renderEditableInline(
                        player.player_id,
                        'nationality',
                        player.nationality,
                        player.has_nationality_override,
                        player.original_nationality,
                        'text',
                        'Nationality'
                      )}
                      {/* Only show EU badge when NOT editing nationality */}
                      {isEUCountry(player.nationality) && !(editingField?.playerId === player.player_id && editingField?.field === 'nationality') && (
                        <Badge variant="outline" className="text-xs ml-1.5 px-2">
                          🇪🇺 EU
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Transfermarkt Link */}
                  {player.player_transfermarkt_url && (
                    <a
                      href={player.player_transfermarkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button size="sm" variant="ghost" className={viewDensity === 'ultra' ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'}>
                        <ExternalLink className={viewDensity === 'ultra' ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className={`${currentDensity.padding} flex flex-col flex-1`}>
                {/* Top Section - Club and Stats */}
                <div className={`${viewDensity === 'ultra' ? 'space-y-1.5 pb-2' : 'space-y-3 pb-3'}`}>
                  {/* Current Club */}
                  {player.club_name && (
                    <div className={`flex items-center gap-2 ${viewDensity === 'ultra' ? 'pb-2' : 'pb-3'} border-b`}>
                    {/* Club Logo - Clickable */}
                    {player.club_logo_url && (
                      <>
                        {player.club_transfermarkt_url ? (
                          <a
                            href={player.club_transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={player.club_logo_url}
                              alt={player.club_name}
                              className={viewDensity === 'ultra' ? 'w-6 h-6 object-contain cursor-pointer' : 'w-8 h-8 object-contain cursor-pointer'}
                            />
                          </a>
                        ) : (
                          <img
                            src={player.club_logo_url}
                            alt={player.club_name}
                            className={viewDensity === 'ultra' ? 'w-6 h-6 object-contain' : 'w-8 h-8 object-contain'}
                          />
                        )}
                      </>
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Club Name - Clickable */}
                      {player.club_transfermarkt_url ? (
                        <a
                          href={player.club_transfermarkt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <p className={`font-semibold ${viewDensity === 'ultra' ? 'text-xs' : 'text-base'} truncate`}>{player.club_name}</p>
                        </a>
                      ) : (
                        <p className={`font-semibold ${viewDensity === 'ultra' ? 'text-xs' : 'text-base'} truncate`}>{player.club_name}</p>
                      )}
                      {/* League Name - Clickable */}
                      {player.league_name && (
                        <>
                          {player.league_transfermarkt_url ? (
                            <a
                              href={player.league_transfermarkt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              <p className={`${currentDensity.textSize} text-muted-foreground truncate flex items-center gap-1`}>
                                <span>{getCountryFlag(player.league_country || player.club_country)}</span>
                                <span>{player.league_name}</span>
                              </p>
                            </a>
                          ) : (
                            <p className={`${currentDensity.textSize} text-muted-foreground truncate flex items-center gap-1`}>
                              <span>{getCountryFlag(player.league_country || player.club_country)}</span>
                              <span>{player.league_name}</span>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {player.league_tier && (
                        <Badge variant="secondary" className={currentDensity.badgeSize}>
                          Tier {player.league_tier}
                        </Badge>
                      )}
                      {player.club_avg_market_value_eur && (
                        <Badge variant="outline" className={currentDensity.badgeSize}>
                          {formatMarketValue(player.club_avg_market_value_eur)}/p
                        </Badge>
                      )}
                    </div>
                    </div>
                  )}

                  {/* Player Stats Grid */}
                  <div className={`grid grid-cols-2 ${currentDensity.statsGap} ${currentDensity.textSize}`}>
                    <div className="flex items-center gap-1 text-muted-foreground group/field" title="Height (double-click to edit)">
                      <Ruler className={`${viewDensity === 'ultra' ? 'h-2.5 w-2.5' : 'h-3 w-3'} shrink-0`} />
                      {renderEditableInline(
                        player.player_id,
                        'height',
                        player.height ? `${player.height}` : null,
                        player.has_height_override,
                        player.original_height ? `${player.original_height}` : null,
                        'number',
                        'Height (cm)',
                        undefined,
                        ' cm'
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground group/field" title="Preferred Foot (double-click to edit)">
                      <span className={`${viewDensity === 'ultra' ? 'text-[10px]' : 'text-xs'} shrink-0`}>⚽</span>
                      {renderEditableInline(
                        player.player_id,
                        'foot',
                        player.foot,
                        player.has_foot_override,
                        player.original_foot,
                        'text',
                        'Foot',
                        formatFoot,
                        ' Foot'
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground group/field" title="Market Value (double-click to edit)">
                      <Euro className={`${viewDensity === 'ultra' ? 'h-2.5 w-2.5' : 'h-3 w-3'} shrink-0`} />
                      {renderEditableInline(
                        player.player_id,
                        'value',
                        player.market_value_eur,
                        player.has_value_override,
                        player.original_market_value_eur,
                        'number',
                        'Value in EUR',
                        formatMarketValue
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground group/field min-w-0 flex-1" title={isContractExpiringSoon(player.contract_expires) ? 'Contract expiring soon! (double-click to edit)' : 'Contract Expires (double-click to edit)'}>
                      {isContractExpiringSoon(player.contract_expires) ? (
                        <Badge variant="destructive" className="flex items-center gap-1.5 text-[13px] font-medium">
                          <Calendar className="h-3 w-3" />
                          {renderEditableInline(
                            player.player_id,
                            'contract',
                            player.contract_expires,
                            player.has_contract_override,
                            player.original_contract_expires,
                            'date',
                            'YYYY-MM-DD',
                            formatDate
                          )}
                        </Badge>
                      ) : (
                        <>
                          <Calendar className={`${viewDensity === 'ultra' ? 'h-2.5 w-2.5' : 'h-3 w-3'} shrink-0`} />
                          {renderEditableInline(
                            player.player_id,
                            'contract',
                            player.contract_expires,
                            player.has_contract_override,
                            player.original_contract_expires,
                            'date',
                            'YYYY-MM-DD',
                            formatDate
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Notes and Actions - Always at bottom */}
                <div className={`mt-auto ${viewDensity === 'ultra' ? 'pt-2 space-y-1' : 'pt-4 space-y-2'} border-t`}>
                  {/* Notes Section */}
                  <div>
                    {editingNotes === player.player_id ? (
                      <div className={viewDensity === 'ultra' ? 'space-y-1' : 'space-y-2'}>
                        <Textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes about this player..."
                          rows={viewDensity === 'ultra' ? 2 : 3}
                          className={`${currentDensity.textSize} resize-none`}
                          disabled={savingNotes}
                        />
                        <div className={`flex ${viewDensity === 'ultra' ? 'gap-1' : 'gap-2'}`}>
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(player.player_id)}
                            disabled={savingNotes}
                            className={`flex-1 ${viewDensity === 'ultra' ? 'h-7 text-[10px]' : ''}`}
                          >
                            <Save className={`${viewDensity === 'ultra' ? 'h-2.5 w-2.5 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditNotes}
                            disabled={savingNotes}
                            className={viewDensity === 'ultra' ? 'h-7' : ''}
                          >
                            <X className={viewDensity === 'ultra' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className={`${currentDensity.textSize} text-muted-foreground ${viewDensity === 'ultra' ? 'mb-0.5' : 'mb-1'}`}>Notes:</p>
                        <p className={`${currentDensity.textSize} ${viewDensity === 'ultra' ? 'min-h-[2rem] p-1' : 'min-h-[3rem] p-2'} bg-muted/30 rounded border`}>
                          {player.agent_notes || 'No notes yet'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex ${viewDensity === 'ultra' ? 'gap-1' : 'gap-2'}`}>
                    {editingNotes !== player.player_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEditNotes(player)}
                        className={`flex-1 ${viewDensity === 'ultra' ? 'h-7 text-[10px] px-2' : ''}`}
                      >
                        <Edit className={`${viewDensity === 'ultra' ? 'h-2.5 w-2.5 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                        {viewDensity !== 'ultra' && 'Edit Notes'}
                      </Button>
                    )}
                    {player.sf_data && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setStatsModalPlayer(player)}
                        className={viewDensity === 'ultra' ? 'h-7 px-2' : ''}
                        title="View detailed performance stats"
                      >
                        <BarChart3 className={viewDensity === 'ultra' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                        {viewDensity !== 'ultra' && <span className="ml-1">Stats</span>}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPlayerToRemove(player)}
                      disabled={removingPlayer === player.player_id}
                      className={viewDensity === 'ultra' ? 'h-7 px-2' : ''}
                    >
                      <Trash2 className={viewDensity === 'ultra' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Remove player confirmation dialog */}
      <AlertDialog open={!!playerToRemove} onOpenChange={(open) => !open && setPlayerToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player from Roster?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{playerToRemove?.player_name}</strong> from your roster?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingPlayer}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePlayer}
              disabled={!!removingPlayer}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingPlayer ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Player Stats Modal */}
      <PlayerStatsModal
        isOpen={!!statsModalPlayer}
        onClose={() => setStatsModalPlayer(null)}
        player={statsModalPlayer ? {
          player_id: statsModalPlayer.player_id,
          player_name: statsModalPlayer.player_name,
          picture_url: statsModalPlayer.picture_url,
          position: statsModalPlayer.position,
          age: statsModalPlayer.age,
          nationality: statsModalPlayer.nationality,
          club_name: statsModalPlayer.club_name,
          club_logo_url: statsModalPlayer.club_logo_url,
          market_value_eur: statsModalPlayer.market_value_eur,
          sf_data: statsModalPlayer.sf_data,
          league_name: statsModalPlayer.league_name,
        } : null}
      />
    </>
  )
}
