import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function VerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We've sent you a verification link to complete your registration
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Please check your email inbox and click on the verification link to complete your account setup. If you
            don't see the email, check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Return to login</Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Didn't receive an email? Check your spam folder or{" "}
            <Link href="/auth/register" className="text-primary underline-offset-4 hover:underline">
              try again
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

