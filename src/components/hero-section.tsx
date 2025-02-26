"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { AuthModal } from "@/components/auth-modal"

export function HeroSection() {
  const [showAuth, setShowAuth] = useState(false)

  const handleGetStarted = () => {
    setShowAuth(true)
  }

  return (
    <section className="relative flex flex-col-reverse items-center justify-center gap-8 py-8 px-4 md:flex-row md:py-16 max-w-6xl mx-auto mt-24">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-blue-50/30 dark:from-blue-950/30 dark:via-transparent dark:to-blue-950/20 rounded-3xl -z-10"></div>
      <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-1">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-900 via-blue-600 to-blue-400 dark:from-blue-800 dark:via-blue-500 dark:to-blue-300">
              Create Polls<br />in Seconds.
            </span>
          </h1>
          <p className="mt-2 max-w-[38rem] text-muted-foreground sm:text-xl sm:leading-8">
            QuickPoll makes it easy to gather opinions and make decisions. Create, share, and analyze polls instantly.
          </p>
        </div>
        <Button 
          variant="default"
          className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors" 
          size="lg"
          onClick={handleGetStarted}
        >
          Get Started
        </Button>
        <AuthModal 
          isOpen={showAuth} 
          onClose={() => setShowAuth(false)} 
        />
      </div>
      <div className="relative w-full md:w-[45%] max-w-[400px] transition-transform hover:scale-105 duration-300 ease-out">
        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-primary/25 to-blue-600/25 dark:from-primary/15 dark:to-blue-400/15 blur-2xl"></div>
        <div className="relative">
          <Image
            src="/poll-owl.png"
            alt="QuickPoll Owl Mascot"
            width={400}
            height={400}
            className="drop-shadow-2xl rounded-2xl"
            priority
          />
        </div>
      </div>
    </section>
  )
}
