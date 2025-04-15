import Link from "next/link"
import Image from "next/image"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src="https://jbqljjyctbsyawijlxfa.supabase.co/storage/v1/object/public/footylabs-logo//FootyLabs_logo.svg"
        alt="FootyLabs Logo"
        width={100}
        height={40}
        className="h-auto"
      />
    </Link>
  )
}
