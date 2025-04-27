import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Team Performance Insights</h1>
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-[#31348D]" />
      </div>
    </div>
  )
}
