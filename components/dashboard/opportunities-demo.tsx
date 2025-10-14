"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

export default function OpportunitiesDemo() {
  // Lower-tier club opportunities with the clean design
  const mockOpportunities = [
    {
      club: "Real Oviedo",
      position: "Central Midfielder", 
      league: "Segunda División",
      fitScore: 88,
      salary: "€12-18k",
      contract: "2+1 years"
    },
    {
      club: "FC Twente",
      position: "Defensive Midfielder",
      league: "Eredivisie", 
      fitScore: 84,
      salary: "€10-16k",
      contract: "3 years"
    },
    {
      club: "Rio Ave FC",
      position: "Central Midfielder",
      league: "Primeira Liga",
      fitScore: 81,
      salary: "€9-15k", 
      contract: "2 years"
    },
    {
      club: "Willem II",
      position: "Central Midfielder",
      league: "Eredivisie",
      fitScore: 78,
      salary: "€8-14k", 
      contract: "2+1 years"
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Matching Opportunities (Demo)
        </CardTitle>
        <CardDescription>
          Clubs looking for players with your profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockOpportunities.map((opp, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div>
                    <h4 className="font-medium">{opp.club}</h4>
                    <p className="text-sm text-muted-foreground">
                      {opp.position} • {opp.league}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{opp.fitScore}%</div>
                  <div className="text-xs text-muted-foreground">Fit Score</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{opp.salary}</div>
                  <div className="text-xs text-muted-foreground">{opp.contract}</div>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Apply
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}