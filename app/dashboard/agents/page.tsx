"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AgentDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()

        if (profile?.user_type === 'agent') {
          // Redirect agents to My Roster
          router.replace('/dashboard/agents/roster')
        }
      }
    }

    checkAndRedirect()
  }, [router, supabase])

  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
