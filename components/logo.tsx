import Link from "next/link"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center space-x-2 ${className}`}>
      <div className="relative h-8 w-8 rounded-full bg-footylabs-blue flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-white"
        >
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 2a8.09 8.09 0 0 1 7.86 6.31A7.72 7.72 0 0 1 12 8a7.72 7.72 0 0 1-7.86 2.31A8.09 8.09 0 0 1 12 4z" />
          <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
        </svg>
      </div>
      <span className="font-bold text-xl text-footylabs-blue">FootyLabs</span>
    </Link>
  )
}

