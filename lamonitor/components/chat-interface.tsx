import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, MessageCircle, X } from 'lucide-react'
import type { Timestamp } from '@/app/types'

interface Message {
  content: string
  role: 'user' | 'assistant'
}

interface ChatInterfaceProps {
  timestamps: Timestamp[]
  className?: string
}

export default function ChatInterface({ timestamps, className = '' }: ChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { content: input, role: 'user' as const }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          events: timestamps
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }
      
      const data = await response.json()
      setMessages(prev => [...prev, data])
    } catch (error: any) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to process your message. Please try again.'}`
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 p-3 bg-deck-panel border border-deck-line text-deck-signal hover:border-deck-signal hover:bg-deck-elev shadow-lg z-50 transition-all ${className}`}
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 h-[500px] bg-deck-panel/95 backdrop-blur-sm shadow-xl border border-deck-line flex flex-col z-50 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-deck-line bg-deck-bg">
        <div className="flex items-center gap-2">
          <span className="deck-dot text-deck-signal" />
          <span className="deck-label-hi">ASSISTANT</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-deck-dim hover:text-deck-fg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 text-[13px] font-medium ${
                message.role === 'user'
                  ? 'bg-deck-signal/20 text-deck-signal border border-deck-signal/30'
                  : 'bg-deck-elev text-deck-fg border border-deck-line'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-deck-elev border border-deck-line px-3 py-2 text-[12px] font-bold text-deck-signal">
              <span className="deck-dot deck-blink" />
              processing…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-deck-line bg-deck-bg">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="› type a message…"
            className="deck-input flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="deck-btn deck-btn--primary"
          >
            {isLoading ? '…' : '▸ SEND'}
          </button>
        </div>
      </form>
    </div>
  )
}
