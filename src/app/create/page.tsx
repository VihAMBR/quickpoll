"use client"

import CreatePoll from "@/components/CreatePoll"

export default function CreatePollPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <CreatePoll />
      </div>
    </div>
  )
}
