import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Logo />
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-6">
              <Link href="/" className="text-sm font-medium text-foreground">
                Home
              </Link>
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="#services" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Services
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="hero-section w-full py-24 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
                  Data Science & AI Solutions for Football
                </h1>
                <p className="mx-auto max-w-[700px] text-lg text-white/80 md:text-xl">
                  Transforming data into winning strategies for your football club
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/auth/register">
                  <Button className="bg-white text-footylabs-blue hover:bg-white/90">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-footylabs-blue px-3 py-1 text-sm text-white">Services</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-footylabs-blue">
                  Comprehensive Football Analytics
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Our platform provides cutting-edge analytics and insights for football clubs
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 mt-12">
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6">
                <div className="rounded-full bg-footylabs-blue p-2 text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Player Recruitment</h3>
                <p className="text-center text-muted-foreground">
                  Identify the best talent using advanced data analytics and ML algorithms
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6">
                <div className="rounded-full bg-footylabs-blue p-2 text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M2 9.5V4a2 2 0 0 1 2-2h3.5"></path>
                    <path d="M2 14.5V20a2 2 0 0 0 2 2h3.5"></path>
                    <path d="M22 9.5V4a2 2 0 0 0-2-2h-3.5"></path>
                    <path d="M22 14.5V20a2 2 0 0 1-2 2h-3.5"></path>
                    <path d="M9.5 2h5"></path>
                    <path d="M9.5 22h5"></path>
                    <path d="M14.5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>
                    <path d="M7 10.5h.5"></path>
                    <path d="M7 13.5h.5"></path>
                    <path d="M16.5 10.5h.5"></path>
                    <path d="M16.5 13.5h.5"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Tactical Analysis</h3>
                <p className="text-center text-muted-foreground">
                  Gain insights into game patterns and optimize your team's tactical approach
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6">
                <div className="rounded-full bg-footylabs-blue p-2 text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M12 20v-6M6 20V10M18 20V4"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Performance Analytics</h3>
                <p className="text-center text-muted-foreground">
                  Track and analyze player and team performance with detailed metrics
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-footylabs-darkblue">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">
                  Why Choose FootyLabs?
                </h2>
                <p className="mx-auto max-w-[700px] text-white/80 md:text-xl">
                  Our platform provides unique advantages for football clubs of all levels
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 mt-12">
              <div className="flex flex-col space-y-2 rounded-lg border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-bold text-white">Advanced ML Algorithms</h3>
                <p className="text-white/80">
                  Our platform uses cutting-edge machine learning to provide insights that traditional analysis can't
                  reveal
                </p>
              </div>
              <div className="flex flex-col space-y-2 rounded-lg border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-bold text-white">Comprehensive Data</h3>
                <p className="text-white/80">
                  Access to extensive datasets covering all aspects of the game, from player performance to team tactics
                </p>
              </div>
              <div className="flex flex-col space-y-2 rounded-lg border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-bold text-white">Intuitive Visualizations</h3>
                <p className="text-white/80">
                  Complex data presented in clear, actionable visualizations that make insights immediately apparent
                </p>
              </div>
              <div className="flex flex-col space-y-2 rounded-lg border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-bold text-white">Customized for Your Club</h3>
                <p className="text-white/80">
                  Tailored analytics that focus on your club's specific needs, goals, and playing style
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-footylabs-blue">
                  Ready to Transform Your Club?
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Join the growing number of clubs using data science to gain a competitive edge
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-footylabs-blue text-white hover:bg-footylabs-blue/90">
                    Get Started Today
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6 bg-footylabs-darkblue text-white">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <Logo className="text-white" />
          <p className="text-center text-sm text-white/60">
            © {new Date().getFullYear()} FootyLabs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

