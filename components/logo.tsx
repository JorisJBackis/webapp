import Link from "next/link"
import Image from "next/image"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src="https://jbqljjyctbsyawijlxfa.supabase.co/storage/v1/object/sign/footylabs-logo/FootyLabs_logo.svg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJmb290eWxhYnMtbG9nby9Gb290eUxhYnNfbG9nby5zdmciLCJpYXQiOjE3NDM5NzY0MjYsImV4cCI6MTc0NDE0OTIyNn0.6ORw9Mf4Yptjm0WEpQcH4GgCNEJYcRDJDgAmu5wW8Z4"
        alt="FootyLabs Logo"
        width={150}
        height={60}
        className="h-auto"
      />
    </Link>
  )
}

