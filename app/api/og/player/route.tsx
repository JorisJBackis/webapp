import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const playerId = searchParams.get('id')

    if (!playerId) {
      return new Response('Missing player ID', { status: 400 })
    }

    // Create Supabase client without auth - OG images should work without authentication
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get player profile data
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', playerId)
      .single()

    if (!profile) {
      return new Response('Player not found', { status: 404 })
    }

    // Get wyscout player data if available
    let wyscoutPlayer = null
    if (profile.wyscout_player_id) {
      const { data: wyscoutData } = await supabase
        .from('players')
        .select('*')
        .eq('wyscout_player_id', profile.wyscout_player_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      wyscoutPlayer = wyscoutData
    }

    const playerName = wyscoutPlayer?.name || profile?.agent_name || "Player"
    const playerPosition = wyscoutPlayer?.position || profile?.playing_positions?.[0] || "Player"
    const playerTeam = wyscoutPlayer?.stats?.["Team"] || "Available"
    const playerAge = wyscoutPlayer?.stats?.["Age"] || "N/A"
    const playerHeight = wyscoutPlayer?.stats?.["Height"] || "N/A"
    const footylabsScore = wyscoutPlayer?.stats?.avg_percentile
      ? (wyscoutPlayer.stats.avg_percentile * 10).toFixed(1)
      : "N/A"

    // Generate seeded mock data for consistency
    const seed = playerId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const seededRandom = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
    }

    const matches = seededRandom(15, 35, 3)
    const goals = seededRandom(2, 12, 4)
    const assists = seededRandom(1, 8, 5)

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '40px 60px',
              position: 'absolute',
              top: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 32,
                  fontWeight: 'bold',
                  background: 'linear-gradient(to right, #2563eb, #7c3aed)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                FootyLabs
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '0 60px',
            }}
          >
            {/* Player Avatar */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(to right, #2563eb, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                color: 'white',
                fontWeight: 'bold',
                marginBottom: 20,
              }}
            >
              {playerName.charAt(0)}
            </div>

            {/* Player Name */}
            <div
              style={{
                display: 'flex',
                fontSize: 56,
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {playerName}
            </div>

            {/* Position & Team */}
            <div
              style={{
                display: 'flex',
                fontSize: 32,
                color: '#64748b',
                marginBottom: 40,
                textAlign: 'center',
              }}
            >
              {playerPosition} • {playerTeam}
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: 'flex',
                gap: 40,
                marginTop: 20,
              }}
            >
              {/* FootyLabs Score */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  padding: '24px 32px',
                  borderRadius: 16,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', fontSize: 48, fontWeight: 'bold', color: '#2563eb' }}>
                  {footylabsScore}
                </div>
                <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>Score</div>
              </div>

              {/* Matches */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  padding: '24px 32px',
                  borderRadius: 16,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', fontSize: 48, fontWeight: 'bold', color: '#16a34a' }}>
                  {matches}
                </div>
                <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>Matches</div>
              </div>

              {/* Goals */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  padding: '24px 32px',
                  borderRadius: 16,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', fontSize: 48, fontWeight: 'bold', color: '#7c3aed' }}>
                  {goals}
                </div>
                <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>Goals</div>
              </div>

              {/* Assists */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  padding: '24px 32px',
                  borderRadius: 16,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', fontSize: 48, fontWeight: 'bold', color: '#ea580c' }}>
                  {assists}
                </div>
                <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>Assists</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '30px',
              position: 'absolute',
              bottom: 0,
            }}
          >
            <div style={{ display: 'flex', fontSize: 20, color: '#94a3b8' }}>
              Age: {playerAge} • Height: {playerHeight}cm
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Error generating image', { status: 500 })
  }
}
