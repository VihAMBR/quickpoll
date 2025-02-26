"use client"

import PollVoting from "@/components/PollVoting"

export default function PollPage({ params }: { params: { id: string } }) {
  return <PollVoting pollId={params.id} />
}
