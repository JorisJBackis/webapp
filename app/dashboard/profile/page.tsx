import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/get-user-profile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default async function ProfilePage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect("/auth/login")
  }

  const { user, profile } = userProfile
  const club = profile?.clubs

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-footylabs-blue">Your Profile</h1>
        <p className="text-muted-foreground">View and manage your account information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b bg-footylabs-darkblue text-white">
            <CardTitle>Account Information</CardTitle>
            <CardDescription className="text-white/80">Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.user_metadata?.avatar_url || ""} alt={user.email || ""} />
                <AvatarFallback className="bg-footylabs-blue text-white text-lg">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{user.email}</h3>
                <p className="text-sm text-muted-foreground">
                  Account created: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b bg-footylabs-darkblue text-white">
            <CardTitle>Club Information</CardTitle>
            <CardDescription className="text-white/80">Your associated football club</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {club ? (
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-footylabs-blue/10 flex items-center justify-center">
                  {club.logo_url ? (
                    <img
                      src={club.logo_url || "/placeholder.svg"}
                      alt={club.name}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-8 w-8 text-footylabs-blue"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m4.93 4.93 4.24 4.24" />
                      <path d="m14.83 9.17 4.24-4.24" />
                      <path d="m14.83 14.83 4.24 4.24" />
                      <path d="m9.17 14.83-4.24 4.24" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{club.name}</h3>
                  <Badge className="mt-1 bg-footylabs-blue">Club ID: {club.id}</Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No club associated with your account</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b bg-footylabs-darkblue text-white">
            <CardTitle>Registration Details</CardTitle>
            <CardDescription className="text-white/80">Information about your profile record</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Profile ID</h4>
                <p className="text-sm font-mono">{profile?.id}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Club ID</h4>
                <p className="text-sm font-mono">{profile?.club_id || "Not set"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Profile Created</h4>
                <p className="text-sm">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleString() : "Unknown"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Profile Updated</h4>
                <p className="text-sm">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

