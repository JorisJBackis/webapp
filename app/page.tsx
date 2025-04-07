import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-16 items-center">
          <Logo />
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="border-[#3144C3] text-[#3144C3]">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-[#3144C3] hover:bg-[#3144C3]/90">
                  Sign Up
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="hero-section w-full py-24 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-10 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
                  The AI-Driven Recruitment Platform for Modern Football
                </h1>
                <p className="mx-auto max-w-[700px] text-lg text-white/80 md:text-xl">
                  Where clubs, agents and players meet through data
                </p>
              </div>
              <div className="space-x-4 pt-4">
                <Link href="/auth/register">
                  <Button className="bg-white text-[#3144C3] hover:bg-white/90">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6 bg-white text-[#3144C3]">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <Logo />
          <p className="text-center text-sm text-[#3144C3]/60">
            © {new Date().getFullYear()} FootyLabs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

