import { Suspense } from "react"
import { UpdatePasswordContent } from "./content"
import { Card,CardContent } from "@/components/ui/card"
import { Logo } from "@/components/logo"

function UpdatePasswordSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md border-0 shadow-lg bg-gray-50">
        <CardContent className="text-center pt-6">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<UpdatePasswordSkeleton />}>
      <UpdatePasswordContent />
    </Suspense>
  )
}