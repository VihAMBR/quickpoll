"use client"

import CreatePoll from "@/components/CreatePoll"
import { Navigation } from "@/components/navigation"

export default function CreatePollPage() {
  return (
    <>
      <Navigation />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 pt-32 pb-16">
        <div className="w-full max-w-2xl">
          <CreatePoll />
        </div>
      </div>
    </>
  )
}
