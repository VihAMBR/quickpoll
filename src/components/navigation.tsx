"use client"

import { useState } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { AuthModal } from "@/components/auth-modal"

interface NavigationProps {
  hideAuth?: boolean;
}

export function Navigation({ hideAuth = false }: NavigationProps) {
  const [showAuth, setShowAuth] = useState(false)

  const handleSignIn = () => {
    setShowAuth(true)
  }

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[1200px] rounded-lg bg-[hsl(var(--nav-bg))] bg-opacity-20 backdrop-blur-[2px] supports-[backdrop-filter]:bg-opacity-20 shadow-lg dark:shadow-white/10 border-[1.5px] border-border/30">
      <div className="flex h-[72px] items-center px-6">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-8 flex items-center space-x-2">
            <span className="hidden font-bold text-xl sm:inline-block text-blue-600 dark:text-blue-400">QuickPoll</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <ModeToggle />
            {!hideAuth && (
              <Button 
                onClick={handleSignIn}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Sign In
              </Button>
            )}
            <AuthModal 
              isOpen={showAuth} 
              onClose={() => setShowAuth(false)} 
            />
          </nav>
        </div>
      </div>
    </nav>
  )
}
