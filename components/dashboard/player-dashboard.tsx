"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  BarChart3,
  MapPin,
  AlertCircle,
  ExternalLink,
  TrendingUpIcon,
  TrendingDownIcon,
  Activity,
  Zap,
  Shield,
  Crosshair,
  Users,
  Eye,
  Star,
  Building2,
  UserCircle,
  Check,
  ChevronDown
} from "lucide-react"
import { ReviewModal } from "@/components/reviews/review-modal"
import { ReviewPromptModal } from "@/components/reviews/review-prompt-modal"
import { ReviewReminderCard } from "@/components/reviews/review-reminder-card"

type PlayerDashboardData = {
  user: any
  profile: any
  playerProfile: any
  playerStats: any
  dataRequest?: any
}

interface PlayerStats {
  rating: number
  goals: number
  assists: number
  appearances: number
  minutesPlayed: number
  matchesStarted: number
  accuratePassesPercentage: number
  totalDuelsWonPercentage: number
  successfulDribblesPercentage: number
  aerialDuelsWonPercentage: number
  ballRecovery: number
  keyPasses: number
  shotsOnTarget: number
  totalShots: number
  goalConversionPercentage: number
  clearances: number
  accurateCrossesPercentage: number
  yellowCards: number
  redCards: number
  fouls: number
  wasFouled: number
}

interface PlayerData {
  id: number
  name: string
  age: number | null
  height: number | null
  foot: string | null
  picture_url: string | null
  position: string
  club: string
  club_id: number | null
  club_logo: string | null
  transfermarkt_url: string | null
  club_transfermarkt_url: string | null
  market_value_eur: number | null
  league: string
  league_logo: string | null
  league_url: string | null
  agency: string | null
  agency_id: number | null
  agency_logo: string | null
  agency_url: string | null
  stats: PlayerStats
  percentiles: { [key: string]: number }
  ranks: { [key: string]: number }
  totalPlayers: number
}

interface SeasonOption {
  id: string
  label: string // e.g., "24/25" or "2024/2025"
}

interface TournamentOption {
  id: string
  name: string
  seasons: SeasonOption[]
}

const positionNames: { [key: string]: string } = {
  'G': 'Goalkeeper',
  'D': 'Defender',
  'M': 'Midfielder',
  'F': 'Forward'
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 80) return 'text-green-600 dark:text-green-500'
  if (percentile >= 60) return 'text-blue-600 dark:text-blue-500'
  if (percentile >= 40) return 'text-yellow-600 dark:text-yellow-500'
  if (percentile >= 20) return 'text-orange-600 dark:text-orange-500'
  return 'text-red-600 dark:text-red-500'
}

function getPercentileBgColor(percentile: number): string {
  if (percentile >= 80) return 'bg-green-500'
  if (percentile >= 60) return 'bg-blue-500'
  if (percentile >= 40) return 'bg-yellow-500'
  if (percentile >= 20) return 'bg-orange-500'
  return 'bg-red-500'
}

export default function PlayerDashboard({ data }: { data: PlayerDashboardData }) {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean
    type: 'club' | 'agency'
    targetId: number | null
    targetName: string
  }>({ isOpen: false, type: 'club', targetId: null, targetName: '' })
  const [hasClubReview, setHasClubReview] = useState(false)
  const [hasAgencyReview, setHasAgencyReview] = useState(false)
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)

  // Tournament/Season selection state
  const [rawSfData, setRawSfData] = useState<any>(null)
  const [availableTournaments, setAvailableTournaments] = useState<TournamentOption[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [defaultTournamentId, setDefaultTournamentId] = useState<string>('')
  const [defaultSeasonId, setDefaultSeasonId] = useState<string>('')

  const supabase = createClient()

  // Track visits with 3-day gap logic
  useEffect(() => {
    const LAST_VISIT_KEY = "player_last_visit"
    const LOGIN_COUNT_KEY = "player_login_count"

    const now = Date.now()
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY)
    const hoursSinceLastVisit = lastVisit ? (now - parseInt(lastVisit)) / (1000 * 60 * 60) : 999

    // Only count as new "login" if 72+ hours (3 days) have passed
    if (hoursSinceLastVisit >= 72) {
      const currentCount = parseInt(localStorage.getItem(LOGIN_COUNT_KEY) || "0")
      localStorage.setItem(LOGIN_COUNT_KEY, (currentCount + 1).toString())
    }

    // Update last visit time
    localStorage.setItem(LAST_VISIT_KEY, now.toString())
  }, [])

  // Show review prompt on 2nd login if reviews not complete
  useEffect(() => {
    const LOGIN_COUNT_KEY = "player_login_count"
    const PROMPT_SHOWN_SESSION_KEY = "review_prompt_shown_session"

    const loginCount = parseInt(localStorage.getItem(LOGIN_COUNT_KEY) || "0")
    const alreadyShownThisSession = sessionStorage.getItem(PROMPT_SHOWN_SESSION_KEY)

    // Check if reviews are complete
    const reviewsComplete = hasClubReview && (hasAgencyReview || !playerData?.agency_id)

    // Show popup on 2nd+ login if reviews not done and not shown this session
    if (loginCount >= 2 && !reviewsComplete && playerData && !alreadyShownThisSession) {
      const timer = setTimeout(() => {
        setShowReviewPrompt(true)
        sessionStorage.setItem(PROMPT_SHOWN_SESSION_KEY, "true")
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [hasClubReview, hasAgencyReview, playerData])

  // Check if user has existing reviews
  const checkExistingReviews = async (clubId: number | null, agencyId: number | null) => {
    if (!data.user?.id) return

    try {
      // Check club review
      if (clubId) {
        const { data: clubReview } = await supabase
          .from("club_reviews")
          .select("id")
          .eq("club_transfermarkt_id", clubId)
          .eq("player_profile_id", data.user.id)
          .single()
        setHasClubReview(!!clubReview)
      }

      // Check agency review
      if (agencyId) {
        const { data: agencyReview } = await supabase
          .from("agent_reviews")
          .select("id")
          .eq("agency_id", agencyId)
          .eq("player_profile_id", data.user.id)
          .single()
        setHasAgencyReview(!!agencyReview)
      }
    } catch (err) {
      console.error("Error checking existing reviews:", err)
    }
  }

  useEffect(() => {
    const fetchPlayerData = async () => {
      setLoading(true)
      setError(null)

      const CACHE_KEY = 'player_dashboard_cache_v4' // v4: tournament/season selection support

      try {
        // Check sessionStorage cache first (includes tournament/season data)
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const cachedData = JSON.parse(cached)
          console.log('[PlayerDashboard] Using cached data')
          setPlayerData(cachedData.playerData)
          // Restore tournament/season state from cache
          if (cachedData.rawSfData) {
            setRawSfData(cachedData.rawSfData)
            setAvailableTournaments(cachedData.availableTournaments || [])
            setSelectedTournamentId(cachedData.selectedTournamentId || '')
            setSelectedSeasonId(cachedData.selectedSeasonId || '')
            setDefaultTournamentId(cachedData.defaultTournamentId || '')
            setDefaultSeasonId(cachedData.defaultSeasonId || '')
          }
          setLoading(false)
          return
        }
        // Clear old cache versions
        sessionStorage.removeItem('player_dashboard_cache')
        sessionStorage.removeItem('player_dashboard_cache_v2')
        sessionStorage.removeItem('player_dashboard_cache_v3')

        // Get current user's transfermarkt player ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: playerProfile } = await supabase
          .from('player_profiles')
          .select('transfermarkt_player_id')
          .eq('id', user.id)
          .single()

        if (!playerProfile?.transfermarkt_player_id) {
          throw new Error('Player profile not linked to Transfermarkt data')
        }

        // Fetch player data with stats
        const { data: tmPlayer, error: tmError } = await supabase
          .from('players_transfermarkt')
          .select(`
            id,
            name,
            age,
            height,
            foot,
            picture_url,
            main_position,
            sf_data,
            sofascore_id,
            club_id,
            agency_id,
            transfermarkt_url,
            market_value_eur,
            clubs_transfermarkt (
              id,
              name,
              logo_url,
              league_id,
              transfermarkt_url,
              leagues_transfermarkt (
                name,
                logo_url,
                url
              )
            ),
            agencies_transfermarkt (
              id,
              name,
              image_url,
              transfermarkt_url
            ),
            sofascore_players_staging (
              position
            )
          `)
          .eq('id', playerProfile.transfermarkt_player_id)
          .single()

        if (tmError) throw tmError
        if (!tmPlayer) throw new Error('Player not found')

        const club = tmPlayer.clubs_transfermarkt as any
        const league = club?.leagues_transfermarkt as any
        const agency = tmPlayer.agencies_transfermarkt as any
        const sfPosition = (tmPlayer.sofascore_players_staging as any)?.position

        if (!tmPlayer.sf_data) {
          throw new Error('No performance data available for your league yet')
        }

        // Store raw sf_data for tournament/season selection
        setRawSfData(tmPlayer.sf_data)

        // Extract available tournaments and seasons
        const tournaments = extractTournamentsFromSfData(tmPlayer.sf_data)
        setAvailableTournaments(tournaments)

        // Check localStorage for saved selection
        const SELECTION_CACHE_KEY = `player_stats_selection_${tmPlayer.id}`
        const savedSelection = localStorage.getItem(SELECTION_CACHE_KEY)
        let savedTournamentId = ''
        let savedSeasonId = ''
        if (savedSelection) {
          try {
            const parsed = JSON.parse(savedSelection)
            savedTournamentId = parsed.tournamentId || ''
            savedSeasonId = parsed.seasonId || ''
          } catch (e) {
            console.warn('[PlayerDashboard] Failed to parse saved selection')
          }
        }

        // Extract season stats from sf_data (prefers player's current league, falls back to first available)
        const { stats, tournamentName, matchedTournamentId, matchedSeasonId } = extractSeasonStats(tmPlayer.sf_data, league?.name)
        if (!stats) {
          throw new Error('No season statistics found')
        }

        // Set defaults (what the system auto-detected)
        setDefaultTournamentId(matchedTournamentId || '')
        setDefaultSeasonId(matchedSeasonId || '')

        // Use saved selection if valid, otherwise use defaults
        let useTournamentId = matchedTournamentId || ''
        let useSeasonId = matchedSeasonId || ''

        if (savedTournamentId && savedSeasonId) {
          // Verify saved selection is still valid
          const savedTournament = tmPlayer.sf_data[savedTournamentId]
          if (savedTournament?.seasons?.[savedSeasonId]) {
            useTournamentId = savedTournamentId
            useSeasonId = savedSeasonId
            console.log('[PlayerDashboard] Using saved selection:', savedTournamentId, savedSeasonId)
          }
        }

        setSelectedTournamentId(useTournamentId)
        setSelectedSeasonId(useSeasonId)

        // Get stats for the selected tournament/season (might differ from default if user had saved selection)
        const selectedStats = useTournamentId !== matchedTournamentId || useSeasonId !== matchedSeasonId
          ? getStatsForSelection(tmPlayer.sf_data, useTournamentId, useSeasonId) || stats
          : stats

        // Fetch percentiles for context
        const response = await fetch('/api/player-stats/percentiles')
        const percentilesData = await response.json()

        // Find this player in the percentiles data
        const playerWithPercentiles = percentilesData.players?.find(
          (p: any) => p.id === tmPlayer.id
        )

        console.log('[PlayerDashboard] Player data:', {
          name: tmPlayer.name,
          picture_url: tmPlayer.picture_url,
          club_logo: club?.logo_url
        })

        // Get the tournament name for the selected (possibly saved) stats
        const selectedTournamentName = useTournamentId
          ? (tmPlayer.sf_data[useTournamentId]?.tournament_name || tournamentName)
          : tournamentName

        const playerDataToCache = {
          id: tmPlayer.id,
          name: tmPlayer.name,
          age: tmPlayer.age,
          height: tmPlayer.height,
          foot: tmPlayer.foot,
          picture_url: tmPlayer.picture_url,
          position: sfPosition || tmPlayer.main_position,
          club: club?.name || 'Unknown Club',
          club_id: club?.id || null,
          club_logo: club?.logo_url,
          transfermarkt_url: tmPlayer.transfermarkt_url,
          club_transfermarkt_url: club?.transfermarkt_url,
          market_value_eur: tmPlayer.market_value_eur,
          league: league?.name || selectedTournamentName,
          league_logo: league?.logo_url || null,
          league_url: league?.url || null,
          agency: agency?.name || null,
          agency_id: agency?.id || null,
          agency_logo: agency?.image_url || null,
          agency_url: agency?.transfermarkt_url || null,
          stats: {
            rating: selectedStats.rating || 0,
            goals: selectedStats.goals || 0,
            assists: selectedStats.assists || 0,
            appearances: selectedStats.appearances || 0,
            minutesPlayed: selectedStats.minutesPlayed || 0,
            matchesStarted: selectedStats.matchesStarted || 0,
            accuratePassesPercentage: selectedStats.accuratePassesPercentage || 0,
            totalDuelsWonPercentage: selectedStats.totalDuelsWonPercentage || 0,
            successfulDribblesPercentage: selectedStats.successfulDribblesPercentage || 0,
            aerialDuelsWonPercentage: selectedStats.aerialDuelsWonPercentage || 0,
            ballRecovery: selectedStats.ballRecovery || 0,
            keyPasses: selectedStats.keyPasses || 0,
            shotsOnTarget: selectedStats.shotsOnTarget || 0,
            totalShots: selectedStats.totalShots || 0,
            goalConversionPercentage: selectedStats.goalConversionPercentage || 0,
            clearances: selectedStats.clearances || 0,
            accurateCrossesPercentage: selectedStats.accurateCrossesPercentage || 0,
            yellowCards: selectedStats.yellowCards || 0,
            redCards: selectedStats.redCards || 0,
            fouls: selectedStats.fouls || 0,
            wasFouled: selectedStats.wasFouled || 0,
          },
          percentiles: playerWithPercentiles?.percentiles || {},
          ranks: playerWithPercentiles?.ranks || {},
          totalPlayers: playerWithPercentiles?.totalPlayers || 0
        }

        // Cache for this session (includes tournament/season data for dropdown functionality)
        const cacheBundle = {
          playerData: playerDataToCache,
          rawSfData: tmPlayer.sf_data,
          availableTournaments: tournaments,
          selectedTournamentId: useTournamentId,
          selectedSeasonId: useSeasonId,
          defaultTournamentId: matchedTournamentId || '',
          defaultSeasonId: matchedSeasonId || ''
        }
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheBundle))
        setPlayerData(playerDataToCache)

      } catch (err) {
        console.error('[PlayerDashboard] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [])

  // Check for existing reviews when playerData loads
  useEffect(() => {
    if (playerData) {
      checkExistingReviews(playerData.club_id, playerData.agency_id)
    }
  }, [playerData?.club_id, playerData?.agency_id])

  // Callback when review is added/updated/deleted
  const handleReviewChange = () => {
    if (playerData) {
      checkExistingReviews(playerData.club_id, playerData.agency_id)
    }
  }

  // Handle tournament selection change
  const handleTournamentChange = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId)

    // Find the tournament and get its latest season
    const tournament = availableTournaments.find(t => t.id === tournamentId)
    if (tournament && tournament.seasons.length > 0) {
      const latestSeasonId = tournament.seasons[0].id // Already sorted newest first
      setSelectedSeasonId(latestSeasonId)

      // Update displayed stats
      updateStatsForSelection(tournamentId, latestSeasonId)
    }
  }

  // Handle season selection change
  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId)

    // Update displayed stats
    updateStatsForSelection(selectedTournamentId, seasonId)
  }

  // Update displayed stats based on selection
  const updateStatsForSelection = (tournamentId: string, seasonId: string) => {
    if (!rawSfData || !playerData) return

    const newStats = getStatsForSelection(rawSfData, tournamentId, seasonId)
    if (newStats) {
      // Update playerData with new stats
      const updatedPlayerData = { ...playerData, stats: newStats }
      setPlayerData(updatedPlayerData)

      // Save selection to localStorage (persists across sessions)
      const SELECTION_CACHE_KEY = `player_stats_selection_${playerData.id}`
      localStorage.setItem(SELECTION_CACHE_KEY, JSON.stringify({
        tournamentId,
        seasonId
      }))

      // Update session cache with new selection (keeps cache valid but with updated stats)
      const CACHE_KEY = 'player_dashboard_cache_v4'
      const cacheBundle = {
        playerData: updatedPlayerData,
        rawSfData: rawSfData,
        availableTournaments: availableTournaments,
        selectedTournamentId: tournamentId,
        selectedSeasonId: seasonId,
        defaultTournamentId: defaultTournamentId,
        defaultSeasonId: defaultSeasonId
      }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheBundle))

      console.log('[PlayerDashboard] Selection saved:', tournamentId, seasonId)
    }
  }

  // Get current tournament and season names for display
  const getCurrentSelectionNames = () => {
    const tournament = availableTournaments.find(t => t.id === selectedTournamentId)
    const season = tournament?.seasons.find(s => s.id === selectedSeasonId)
    return {
      tournamentName: tournament?.name || '',
      seasonLabel: season?.label || ''
    }
  }

  // Check if current selection is different from the default (auto-detected) selection
  const isUsingCustomSelection = () => {
    return selectedTournamentId !== defaultTournamentId || selectedSeasonId !== defaultSeasonId
  }

  // Reset to default selection
  const resetToDefault = () => {
    setSelectedTournamentId(defaultTournamentId)
    setSelectedSeasonId(defaultSeasonId)
    updateStatsForSelection(defaultTournamentId, defaultSeasonId)

    // Remove saved selection from localStorage
    if (playerData) {
      const SELECTION_CACHE_KEY = `player_stats_selection_${playerData.id}`
      localStorage.removeItem(SELECTION_CACHE_KEY)
    }
  }

  // Normalize league name for comparison (handles punctuation differences)
  function normalizeLeagueName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[.,\-–—]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')        // Collapse multiple spaces
      .trim()
  }

  // Known league name mappings (Transfermarkt name → Sofascore name)
  const leagueNameAliases: { [key: string]: string } = {
    'chance liga': 'czech first league',                // Czech league rebranding
    'premyer liqa': 'misli premier league',             // Azerbaijan league rebranding
    'obos ligaen': 'norwegian 1st division',            // Norwegian 2nd tier sponsor name
    'super league kerala': 'kerala premier league',     // Indian state league rebranding
    'liga puerto rico apertura': 'lpr pro apertura',    // Puerto Rico abbreviation
  }

  // Helper function to extract season stats - prefers player's league, falls back to first available
  function extractSeasonStats(sfData: any, preferredLeague?: string): {
    stats: any;
    tournamentName: string;
    matchedTournamentId?: string;
    matchedSeasonId?: string;
  } {
    if (!sfData) return { stats: null, tournamentName: '' }

    const getLatestStats = (tournamentData: any, tournamentId: string) => {
      const seasonIds = Object.keys(tournamentData.seasons)
      if (seasonIds.length === 0) return null
      const latestSeasonId = seasonIds.sort((a, b) => parseInt(b) - parseInt(a))[0]
      return {
        stats: tournamentData.seasons[latestSeasonId].statistics,
        tournamentName: tournamentData.tournament_name,
        matchedTournamentId: tournamentId,
        matchedSeasonId: latestSeasonId
      }
    }

    if (preferredLeague) {
      const normalizedPreferred = normalizeLeagueName(preferredLeague)
      const aliasedPreferred = leagueNameAliases[normalizedPreferred] || normalizedPreferred

      // Pass 1: Exact match
      for (const tournamentId in sfData) {
        const tournamentData = sfData[tournamentId]
        if (tournamentData.tournament_name === preferredLeague && tournamentData.seasons) {
          const result = getLatestStats(tournamentData, tournamentId)
          if (result) return result
        }
      }

      // Pass 2: Normalized match (handles punctuation differences like "Betclic 1 Liga" vs "Betclic 1. Liga")
      for (const tournamentId in sfData) {
        const tournamentData = sfData[tournamentId]
        if (!tournamentData.seasons) continue
        const normalizedTournament = normalizeLeagueName(tournamentData.tournament_name || '')
        if (normalizedTournament === normalizedPreferred || normalizedTournament === aliasedPreferred) {
          const result = getLatestStats(tournamentData, tournamentId)
          if (result) return result
        }
      }

      // Pass 3: Partial match (handles "Serie C - Girone C" matching "Serie C, Girone C")
      for (const tournamentId in sfData) {
        const tournamentData = sfData[tournamentId]
        if (!tournamentData.seasons) continue
        const normalizedTournament = normalizeLeagueName(tournamentData.tournament_name || '')
        // Check if one contains the other (for partial matches)
        if (normalizedTournament.includes(aliasedPreferred) || aliasedPreferred.includes(normalizedTournament)) {
          const result = getLatestStats(tournamentData, tournamentId)
          if (result) return result
        }
      }
    }

    // Fallback: get tournament with the MOST RECENT season (highest season ID = newest)
    let bestMatch: { stats: any; tournamentName: string; matchedTournamentId?: string; matchedSeasonId?: string } | null = null
    let mostRecentSeasonId = 0
    for (const tournamentId in sfData) {
      const tournamentData = sfData[tournamentId]
      if (tournamentData.seasons) {
        const seasonIds = Object.keys(tournamentData.seasons).map(id => parseInt(id))
        const latestSeasonId = Math.max(...seasonIds)
        if (latestSeasonId > mostRecentSeasonId) {
          mostRecentSeasonId = latestSeasonId
          const result = getLatestStats(tournamentData, tournamentId)
          if (result) bestMatch = result
        }
      }
    }
    return bestMatch || { stats: null, tournamentName: '' }
  }

  // Extract all available tournaments and seasons from sf_data
  function extractTournamentsFromSfData(sfData: any): TournamentOption[] {
    if (!sfData) return []

    const tournaments: TournamentOption[] = []

    // Season labels based on relative position (newest first)
    const seasonLabels = [
      'Current Season',
      'Previous Season',
      '2 Seasons Ago',
      '3 Seasons Ago',
      '4 Seasons Ago',
      '5 Seasons Ago'
    ]

    for (const tournamentId in sfData) {
      const tournamentData = sfData[tournamentId]
      if (!tournamentData.seasons) continue

      const seasons: SeasonOption[] = []
      const seasonIds = Object.keys(tournamentData.seasons).sort((a, b) => parseInt(b) - parseInt(a)) // newest first

      seasonIds.forEach((seasonId, index) => {
        // Use friendly labels for the first few seasons, then fall back to generic
        const label = index < seasonLabels.length ? seasonLabels[index] : `${index + 1} Seasons Ago`
        seasons.push({ id: seasonId, label })
      })

      if (seasons.length > 0) {
        tournaments.push({
          id: tournamentId,
          name: tournamentData.tournament_name || `Tournament ${tournamentId}`,
          seasons
        })
      }
    }

    // Sort tournaments alphabetically
    tournaments.sort((a, b) => a.name.localeCompare(b.name))

    return tournaments
  }

  // Get stats for a specific tournament and season
  function getStatsForSelection(sfData: any, tournamentId: string, seasonId: string): PlayerStats | null {
    if (!sfData || !tournamentId || !seasonId) return null

    const tournament = sfData[tournamentId]
    if (!tournament?.seasons?.[seasonId]?.statistics) return null

    const stats = tournament.seasons[seasonId].statistics
    return {
      rating: stats.rating || 0,
      goals: stats.goals || 0,
      assists: stats.assists || 0,
      appearances: stats.appearances || 0,
      minutesPlayed: stats.minutesPlayed || 0,
      matchesStarted: stats.matchesStarted || 0,
      accuratePassesPercentage: stats.accuratePassesPercentage || 0,
      totalDuelsWonPercentage: stats.totalDuelsWonPercentage || 0,
      successfulDribblesPercentage: stats.successfulDribblesPercentage || 0,
      aerialDuelsWonPercentage: stats.aerialDuelsWonPercentage || 0,
      ballRecovery: stats.ballRecovery || 0,
      keyPasses: stats.keyPasses || 0,
      shotsOnTarget: stats.shotsOnTarget || 0,
      totalShots: stats.totalShots || 0,
      goalConversionPercentage: stats.goalConversionPercentage || 0,
      clearances: stats.clearances || 0,
      accurateCrossesPercentage: stats.accurateCrossesPercentage || 0,
      yellowCards: stats.yellowCards || 0,
      redCards: stats.redCards || 0,
      fouls: stats.fouls || 0,
      wasFouled: stats.wasFouled || 0,
    }
  }

  // Get top strengths and weaknesses
  const getTopStats = (percentiles: { [key: string]: number }) => {
    const stats = Object.entries(percentiles)
      .filter(([key]) => key !== 'totalPlayers')
      .sort(([, a], [, b]) => b - a)

    return {
      strengths: stats.slice(0, 5),
      weaknesses: stats.slice(-5).reverse()
    }
  }

  const statLabels: { [key: string]: string } = {
    rating: 'FootyLabs Score',
    goals: 'Goals',
    assists: 'Assists',
    appearances: 'Appearances',
    minutesPlayed: 'Minutes',
    accuratePassesPercentage: 'Pass Accuracy',
    totalDuelsWonPercentage: 'Duels Won',
    successfulDribblesPercentage: 'Dribbles',
    aerialDuelsWonPercentage: 'Aerial Duels',
    ballRecovery: 'Ball Recoveries',
    keyPasses: 'Key Passes',
    shotsOnTarget: 'Shots on Target',
    clearances: 'Clearances',
    accurateCrossesPercentage: 'Crossing',
    goalConversionPercentage: 'Shot Conversion'
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading your performance data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (data.dataRequest) {
    return (
      <div className="container py-8">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Your data is being processed
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  FootyLabs has been notified of your registration and will add your statistics within 5 working days.
                  You registered on {new Date(data.dataRequest.requested_at).toLocaleDateString()}.
                </p>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  In the meantime, you can:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-1 space-y-1">
                  <li>• Complete your profile information</li>
                  <li>• Browse club opportunities</li>
                  <li>• Set up your preferences</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !playerData) {
    return (
      <div className="container py-8">
        <Card className="border-red-500">
          <CardContent className="p-6">
            <p className="text-red-500">Error: {error || 'Failed to load player data'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure you have completed your player onboarding and your data has been processed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const topStats = getTopStats(playerData.percentiles)
  const playerName = playerData.name

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Hero Section */}
      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Player Photo */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-xl ring-4 ring-background">
              {playerData.picture_url ? (
                <img
                  src={playerData.picture_url}
                  alt={playerData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl md:text-6xl font-bold text-primary">
                  {playerData.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="flex-1 space-y-4">
              <div>
                {playerData.transfermarkt_url ? (
                  <a
                    href={playerData.transfermarkt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline inline-flex items-center gap-2 group"
                  >
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      {playerData.name}
                    </h1>
                    <ExternalLink className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ) : (
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    {playerData.name}
                  </h1>
                )}

                {/* Club */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {playerData.club_logo && (
                    <img src={playerData.club_logo} alt={playerData.club} className="w-5 h-5 object-contain" />
                  )}
                  {playerData.club_transfermarkt_url ? (
                    <a
                      href={playerData.club_transfermarkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-muted-foreground hover:text-primary hover:underline"
                    >
                      {playerData.club}
                    </a>
                  ) : (
                    <span className="text-lg text-muted-foreground">{playerData.club}</span>
                  )}
                  {playerData.club_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-xs ${hasClubReview ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-primary'}`}
                      onClick={() => setReviewModal({
                        isOpen: true,
                        type: 'club',
                        targetId: playerData.club_id,
                        targetName: playerData.club
                      })}
                    >
                      <Star className={`w-3 h-3 mr-1 ${hasClubReview ? 'fill-amber-500' : ''}`} />
                      {hasClubReview ? 'Reviewed' : 'Review'}
                      {hasClubReview && <Check className="w-3 h-3 ml-0.5" />}
                    </Button>
                  )}
                </div>

                {/* Agency */}
                {playerData.agency && (
                  <div className="flex items-center gap-2 mt-1">
                    <UserCircle className="w-4 h-4 text-muted-foreground" />
                    {playerData.agency_logo && (
                      <img src={playerData.agency_logo} alt={playerData.agency} className="w-5 h-5 object-contain rounded" />
                    )}
                    {playerData.agency_url ? (
                      <a
                        href={playerData.agency_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary hover:underline"
                      >
                        {playerData.agency}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{playerData.agency}</span>
                    )}
                    {playerData.agency_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-xs ${hasAgencyReview ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-primary'}`}
                        onClick={() => setReviewModal({
                          isOpen: true,
                          type: 'agency',
                          targetId: playerData.agency_id,
                          targetName: playerData.agency || ''
                        })}
                      >
                        <Star className={`w-3 h-3 mr-1 ${hasAgencyReview ? 'fill-amber-500' : ''}`} />
                        {hasAgencyReview ? 'Reviewed' : 'Review'}
                        {hasAgencyReview && <Check className="w-3 h-3 ml-0.5" />}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {positionNames[playerData.position] || playerData.position}
                </Badge>
                {playerData.age && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {playerData.age} years old
                  </Badge>
                )}
                {playerData.height && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {playerData.height} cm
                  </Badge>
                )}
                {playerData.foot && (
                  <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
                    {playerData.foot} footed
                  </Badge>
                )}
                {playerData.market_value_eur !== null && playerData.market_value_eur > 0 && (
                  <Badge className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700">
                    €{(playerData.market_value_eur / 1000).toFixed(0)}k
                  </Badge>
                )}
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Reminder Card */}
      <ReviewReminderCard
        clubName={playerData.club}
        agencyName={playerData.agency}
        hasClubReview={hasClubReview}
        hasAgencyReview={hasAgencyReview}
        onReviewClub={() => setReviewModal({
          isOpen: true,
          type: 'club',
          targetId: playerData.club_id,
          targetName: playerData.club
        })}
        onReviewAgency={playerData.agency_id ? () => setReviewModal({
          isOpen: true,
          type: 'agency',
          targetId: playerData.agency_id,
          targetName: playerData.agency || ''
        }) : undefined}
      />

      {/* Tournament/Season Selector */}
      {availableTournaments.length > 0 && (
        <Card className="border-none shadow-sm bg-muted/30">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Stats for:</span>
              </div>

              {/* Tournament Selector */}
              <Select value={selectedTournamentId} onValueChange={handleTournamentChange}>
                <SelectTrigger className="w-[220px] bg-background">
                  <SelectValue placeholder="Select tournament" />
                </SelectTrigger>
                <SelectContent>
                  {availableTournaments.map(tournament => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Season Selector */}
              <Select value={selectedSeasonId} onValueChange={handleSeasonChange}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  {availableTournaments
                    .find(t => t.id === selectedTournamentId)
                    ?.seasons.map(season => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Reset to Default Button (only shown if using custom selection) */}
              {isUsingCustomSelection() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={resetToDefault}
                >
                  Reset to current league
                </Button>
              )}

              {/* Indicator when viewing non-default stats */}
              {isUsingCustomSelection() && (
                <Badge variant="secondary" className="text-xs">
                  Custom selection
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FootyLabs Score */}
        <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FootyLabs Score</CardTitle>
            <Award className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {playerData.stats.rating.toFixed(2)}
            </div>
            {playerData.percentiles.rating !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`text-xs font-medium ${getPercentileColor(playerData.percentiles.rating)}`}>
                  {playerData.percentiles.rating}th percentile
                </div>
                <Badge variant="outline" className="text-xs">
                  #{playerData.ranks.rating}/{playerData.totalPlayers}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals</CardTitle>
            <Target className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {playerData.stats.goals}
            </div>
            {playerData.percentiles.goals !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`text-xs font-medium ${getPercentileColor(playerData.percentiles.goals)}`}>
                  {playerData.percentiles.goals}th percentile
                </div>
                <Badge variant="outline" className="text-xs">
                  #{playerData.ranks.goals}/{playerData.totalPlayers}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assists */}
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assists</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {playerData.stats.assists}
            </div>
            {playerData.percentiles.assists !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`text-xs font-medium ${getPercentileColor(playerData.percentiles.assists)}`}>
                  {playerData.percentiles.assists}th percentile
                </div>
                <Badge variant="outline" className="text-xs">
                  #{playerData.ranks.assists}/{playerData.totalPlayers}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearances */}
        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appearances</CardTitle>
            <Activity className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {playerData.stats.appearances}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {playerData.stats.minutesPlayed.toLocaleString()} minutes played
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attacking">Attacking</TabsTrigger>
          <TabsTrigger value="defending">Defending</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5 text-green-500" />
                  Top 5 Strengths
                </CardTitle>
                <CardDescription>Your best performing areas vs peers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topStats.strengths.map(([key, percentile]) => {
                  const statValue = (playerData.stats as any)[key]
                  const rank = playerData.ranks[key]
                  const isPercentageStat = key.toLowerCase().includes('percentage')
                  const displayValue = isPercentageStat
                    ? `${statValue?.toFixed(1)}%`
                    : (typeof statValue === 'number' && statValue % 1 !== 0)
                      ? statValue?.toFixed(2)
                      : statValue
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{statLabels[key] || key}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">{displayValue}</span>
                          <span className="text-xs text-muted-foreground">#{rank}/{playerData.totalPlayers}</span>
                        </div>
                      </div>
                      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPercentileBgColor(percentile)} transition-all duration-500 rounded-full`}
                          style={{ width: `${percentile}%` }}
                        />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white drop-shadow-sm"
                          style={{ left: `${Math.max(percentile - 8, 2)}%` }}
                        >
                          {percentile}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Areas to Improve */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDownIcon className="w-5 h-5 text-orange-500" />
                  Areas to Improve
                </CardTitle>
                <CardDescription>Focus areas for development</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topStats.weaknesses.map(([key, percentile]) => {
                  const statValue = (playerData.stats as any)[key]
                  const rank = playerData.ranks[key]
                  const isPercentageStat = key.toLowerCase().includes('percentage')
                  const displayValue = isPercentageStat
                    ? `${statValue?.toFixed(1)}%`
                    : (typeof statValue === 'number' && statValue % 1 !== 0)
                      ? statValue?.toFixed(2)
                      : statValue
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{statLabels[key] || key}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">{displayValue}</span>
                          <span className="text-xs text-muted-foreground">#{rank}/{playerData.totalPlayers}</span>
                        </div>
                      </div>
                      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPercentileBgColor(percentile)} transition-all duration-500 rounded-full`}
                          style={{ width: `${percentile}%` }}
                        />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white drop-shadow-sm"
                          style={{ left: `${Math.max(percentile - 8, 2)}%` }}
                        >
                          {percentile}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attacking Tab */}
        <TabsContent value="attacking" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-green-600" />
                  Shooting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shots on Target</span>
                  <span className="font-bold">{playerData.stats.shotsOnTarget}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Shots</span>
                  <span className="font-bold">{playerData.stats.totalShots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversion %</span>
                  <span className="font-bold">{playerData.stats.goalConversionPercentage.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  Creativity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Key Passes</span>
                  <span className="font-bold">{playerData.stats.keyPasses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dribbles Success</span>
                  <span className="font-bold">{playerData.stats.successfulDribblesPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Crossing Accuracy</span>
                  <span className="font-bold">{playerData.stats.accurateCrossesPercentage.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  Passing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pass Accuracy</span>
                  <span className="font-bold">{playerData.stats.accuratePassesPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Key Passes</span>
                  <span className="font-bold">{playerData.stats.keyPasses}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Defending Tab */}
        <TabsContent value="defending" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Duels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Duels Won</span>
                  <span className="font-bold">{playerData.stats.totalDuelsWonPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aerial Duels Won</span>
                  <span className="font-bold">{playerData.stats.aerialDuelsWonPercentage.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  Recovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ball Recoveries</span>
                  <span className="font-bold">{playerData.stats.ballRecovery}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clearances</span>
                  <span className="font-bold">{playerData.stats.clearances}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Discipline Tab */}
        <TabsContent value="discipline" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Yellow Cards</span>
                  <span className="font-bold text-yellow-600">{playerData.stats.yellowCards}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Red Cards</span>
                  <span className="font-bold text-red-600">{playerData.stats.redCards}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Fouls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fouls Committed</span>
                  <span className="font-bold">{playerData.stats.fouls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Was Fouled</span>
                  <span className="font-bold">{playerData.stats.wasFouled}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Public Profile Card */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center text-primary-foreground">
                <Eye className="h-5 w-5 mr-2" />
                Your Public Profile
              </CardTitle>
              <CardDescription className="text-blue-100">
                Share your professional profile with clubs and agents worldwide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background/10 rounded-lg p-4">
                <p className="text-sm mb-2 text-blue-100">Your profile link:</p>
                <div className="flex items-center justify-between bg-background/20 rounded px-3 py-2">
                  <code className="text-sm font-mono">
                    {typeof window !== 'undefined' ? `${window.location.origin}/player/${data.user?.id}` : `/player/${data.user?.id}`}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-background/20 dark:hover:text-white"
                    onClick={() => {
                      const link = `${window.location.origin}/player/${data.user?.id}`
                      navigator.clipboard.writeText(link)
                      alert('Profile link copied to clipboard!')
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="bg-background text-blue-600 dark:text-blue-200 hover:bg-muted"
                  onClick={() => window.open(`/player/${data.user?.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>

                <Button
                  variant="ghost"
                  className="text-primary-foreground border-white/30 hover:bg-background/20 dark:hover:text-white"
                  onClick={() => window.open(`/player/${data.user?.id}/edit`, '_blank')}
                >
                  Edit Profile
                </Button>
              </div>
              <div className="pt-4 border-t border-white/20">
                <p className="text-sm text-blue-100 mb-3">Share your profile:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-background/10 hover:bg-background/20 dark:hover:text-white text-primary-foreground"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/player/${data.user?.id}`
                      const shareText = `Check out ${playerName}'s professional football profile on FootyLabs`
                      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`
                      window.open(url, '_blank', 'width=550,height=420')
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="ml-2">Facebook</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-background/10 hover:bg-background/20 dark:hover:text-white text-primary-foreground"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/player/${data.user?.id}`
                      const shareText = `Check out ${playerName}'s professional football profile on FootyLabs`
                      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`
                      window.open(url, '_blank', 'width=550,height=420')
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="ml-2">X</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-background/10 hover:bg-background/20 dark:hover:text-white text-primary-foreground"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/player/${data.user?.id}`
                      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`
                      window.open(url, '_blank', 'width=550,height=420')
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span className="ml-2">LinkedIn</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/player/${data.user?.id}`
                      const shareText = `Check out ${playerName}'s professional football profile on FootyLabs`
                      const url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + profileUrl)}`
                      window.open(url, '_blank')
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span className="ml-2">WhatsApp</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/player/${data.user?.id}`
                      navigator.clipboard.writeText(profileUrl)
                      alert('Profile link copied! Paste it in your Instagram bio or story')
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                    </svg>
                    <span className="ml-2">Instagram</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position:</span>
                  <span>{positionNames[playerData.position] || playerData.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span>{playerData.age || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height:</span>
                  <span>{playerData.height ? `${playerData.height} cm` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preferred Foot:</span>
                  <span className="capitalize">{playerData.foot || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Club:</span>
                  <span>{playerData.club}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-muted-foreground">Preferred Countries:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.playerProfile?.preferred_countries?.slice(0, 3).map((country: string) => (
                      <Badge key={country} variant="secondary" className="text-xs">
                        {country}
                      </Badge>
                    )) || <span className="text-sm">Not specified</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Languages:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.playerProfile?.languages?.slice(0, 3).map((lang: string) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    )) || <span className="text-sm">Not specified</span>}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary Range:</span>
                  <span>{data.playerProfile?.current_salary_range || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract End:</span>
                  <span>
                    {data.playerProfile?.contract_end_date
                      ? new Date(data.playerProfile.contract_end_date).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <a href="/dashboard/player-comparison">
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare with Peers
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
        onReviewChange={handleReviewChange}
        type={reviewModal.type}
        targetId={reviewModal.targetId}
        targetName={reviewModal.targetName}
        playerProfileId={data.user?.id}
      />

      {/* Review Prompt Modal (shows on 2nd login) */}
      {playerData && (
        <ReviewPromptModal
          isOpen={showReviewPrompt}
          onClose={() => setShowReviewPrompt(false)}
          clubName={playerData.club}
          agencyName={playerData.agency}
          onReviewClub={() => {
            setShowReviewPrompt(false)
            setReviewModal({
              isOpen: true,
              type: 'club',
              targetId: playerData.club_id,
              targetName: playerData.club
            })
          }}
          onReviewAgency={playerData.agency_id ? () => {
            setShowReviewPrompt(false)
            setReviewModal({
              isOpen: true,
              type: 'agency',
              targetId: playerData.agency_id,
              targetName: playerData.agency || ''
            })
          } : undefined}
        />
      )}
    </div>
  )
}
