import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

export default async function TestTriggerPage() {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get the user's metadata
  const metadata = user.user_metadata || {}

  // Get the user's profile
  const { data: profile, error } = await supabase.from("profiles").select("*, clubs(*)").eq("id", user.id).single()

  const hasClubInMetadata = metadata.club_id !== undefined
  const hasClubInProfile = profile?.club_id !== null && profile?.club_id !== undefined
  const triggerWorking = hasClubInProfile && profile?.club_id === Number(metadata.club_id)

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-footylabs-blue">Trigger Test</h1>
        <p className="text-muted-foreground">Verify that the database trigger is working correctly</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b bg-footylabs-darkblue text-white">
            <CardTitle>Trigger Status</CardTitle>
            <CardDescription className="text-white/80">
              Check if the club_id is being properly stored in your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {triggerWorking ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-800">Trigger is working correctly</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your club_id is properly stored in your profile record.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Trigger may not be working correctly</AlertTitle>
                <AlertDescription>
                  There appears to be an issue with storing your club_id in your profile.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-2">User Metadata</h3>
                <div className="bg-slate-50 p-4 rounded-md">
                  <pre className="text-xs overflow-auto">{JSON.stringify(metadata, null, 2)}</pre>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasClubInMetadata ? (
                    <span className="text-green-600">✓ club_id found in metadata</span>
                  ) : (
                    <span className="text-red-600">✗ No club_id in metadata</span>
                  )}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Profile Record</h3>
                <div className="bg-slate-50 p-4 rounded-md">
                  <pre className="text-xs overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasClubInProfile ? (
                    <span className="text-green-600">✓ club_id found in profile</span>
                  ) : (
                    <span className="text-red-600">✗ No club_id in profile</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

