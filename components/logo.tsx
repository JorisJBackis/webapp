import Link from "next/link"
import Image from "next/image"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src="https://jbqljjyctbsyawijlxfa.supabase.co/storage/v1/object/sign/footylabs-logo/FootyLabs_logo.svg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJmb290eWxhYnMtbG9nby9Gb290eUxhYnNfbG9nby5zdmciLCJpYXQiOjE3NDQ3NTAyNTIsImV4cCI6MTkwMjQzMDI1Mn0.3SMHjYjUaGynS4avRZ4Utr5ydFIVJMN4ZzsIZWteKp4"
        alt="FootyLabs Logo"
        width={100}
        height={40}
        className="h-auto"
      />
    </Link>
  )
}
