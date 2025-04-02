import Link from "next/link"
import Image from "next/image"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image src="/FootyLabs_logo.svg" alt="FootyLabs Logo" width={150} height={60} className="h-auto" />
    </Link>
  )
}

