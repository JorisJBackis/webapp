import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { Logo } from "@/components/logo"

export default function VerificationPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-footylabs-darkblue px-4 py-12">
      <div className="mb-8">
        <Logo className="text-white" />
      </div>
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-footylabs-blue" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-footylabs-blue">Check your email</CardTitle>
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
          <Button asChild className="w-full bg-footylabs-blue hover:bg-footylabs-blue/90">
            <Link href="/auth/login">Return to login</Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Didn't receive an email? Check your spam folder or{" "}
            <Link href="/auth/register" className="text-footylabs-blue underline-offset-4 hover:underline">
              try again
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

