import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type ClubCardProps = {
  club: {
    id: number
    name: string
    logo_url: string | null
  } | null
  className?: string
}

export function ClubCard({ club, className = "" }: ClubCardProps) {
  return (
    <Card className={`border-0 shadow-md ${className}`}>
      <CardHeader className="border-b bg-footylabs-darkblue text-white">
        <CardTitle>Club Information</CardTitle>
        <CardDescription className="text-white/80">Your associated football club</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {club ? (
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-footylabs-blue/10 flex items-center justify-center">
              {club.logo_url ? (
                <img src={club.logo_url || "/placeholder.svg"} alt={club.name} className="h-12 w-12 object-contain" />
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
  )
}

