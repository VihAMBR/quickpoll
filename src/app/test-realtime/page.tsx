'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestRealtimePage() {
  const [messages, setMessages] = useState<string[]>([])
  const [channelStatus, setChannelStatus] = useState<string>('Not connected')
  const [channel, setChannel] = useState<any>(null)

  useEffect(() => {
    // Log when the component mounts
    addMessage('Component mounted')

    if (!supabase) {
      addMessage('ERROR: Supabase client not available')
      return
    }

    // Create a unique channel for testing
    const channelId = `test_channel_${Date.now()}`
    addMessage(`Creating channel: ${channelId}`)

    const newChannel = supabase.channel(channelId, {
      config: {
        broadcast: { self: true }
      }
    })

    // Setup listeners for all tables to see any real-time events
    newChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: '*'
        },
        (payload) => {
          addMessage(`Received real-time event: ${JSON.stringify(payload, null, 2)}`)
        }
      )
      .on('broadcast', { event: 'test' }, (payload) => {
        addMessage(`Received broadcast: ${JSON.stringify(payload, null, 2)}`)
      })
      .subscribe((status) => {
        addMessage(`Channel status: ${status}`)
        setChannelStatus(status)
      })

    setChannel(newChannel)

    // Cleanup on unmount
    return () => {
      addMessage('Unsubscribing from channel')
      newChannel.unsubscribe()
    }
  }, [])

  const addMessage = (message: string) => {
    console.log(`[Realtime Test] ${message}`)
    setMessages(prev => [...prev, `${new Date().toISOString()} - ${message}`])
  }

  const testBroadcast = () => {
    if (!channel) {
      addMessage('ERROR: Channel not initialized')
      return
    }

    addMessage('Sending test broadcast')
    channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Test broadcast from client', timestamp: new Date().toISOString() }
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-4">
      <h1 className="text-2xl font-bold">Supabase Real-time Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Channel Status: {channelStatus}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testBroadcast}>Test Broadcast</Button>
          
          <div className="p-4 border rounded bg-muted overflow-auto max-h-96">
            <pre className="whitespace-pre-wrap break-all text-xs">
              {messages.map((msg, i) => (
                <div key={i} className="mb-1">{msg}</div>
              ))}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 