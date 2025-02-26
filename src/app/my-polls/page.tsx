"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Share2, Trash2 } from "lucide-react"
import { ShareDialog } from "@/components/ui/share-dialog"
import type { Poll } from "@/types/database.types"

export default function MyPolls() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchPolls()
  }, [])

  const fetchPolls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
        return
      }

      const { data } = await supabase
        .from('polls')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (data) setPolls(data)
    } catch (error) {
      console.error('Error fetching polls:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleResults = async (pollId: string, currentValue: boolean) => {
    await supabase
      .from('polls')
      .update({ show_results: !currentValue })
      .eq('id', pollId)

    setPolls(polls.map(poll => 
      poll.id === pollId ? { ...poll, show_results: !currentValue } : poll
    ))
  }

  const deletePoll = async (pollId: string) => {
    await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)

    setPolls(polls.filter(poll => poll.id !== pollId))
  }

  if (loading) {
    return <div className="container py-8">Loading...</div>
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Polls</h1>
        <Button asChild>
          <Link href="/create">Create New Poll</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {polls.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">You haven't created any polls yet.</p>
              <Button asChild className="mt-4">
                <Link href="/create">Create Your First Poll</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          polls.map((poll) => (
            <Card key={poll.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{poll.title}</CardTitle>
                    {poll.description && (
                      <CardDescription>{poll.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleResults(poll.id, poll.show_results)}
                    >
                      {poll.show_results ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <ShareDialog url={`${window.location.origin}/poll/${poll.id}`}>
                      <Button variant="outline" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </ShareDialog>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deletePoll(poll.id)}
                      className="hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
