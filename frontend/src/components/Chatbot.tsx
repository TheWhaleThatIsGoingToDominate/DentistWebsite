import { FormEvent, useEffect, useRef, useState } from 'react'
import { LoaderCircle, MessageCircle, Send, X } from 'lucide-react'

// Replace this value with the URL of your chatbot backend.
const CHATBOT_ENDPOINT = 'https://clinic-demo-chatbot.vercel.app/chat'
const sessionId = crypto.randomUUID()

type ChatMessage = {
  id: number
  sender: 'assistant' | 'user'
  text: string
  bookingLink?: boolean
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'assistant',
    text: 'Hello! How can I help you today?',
  },
]

function detectsBookingIntent(message: string) {
  return /\b(book|booking|appointment|schedule|reserve|visit)\b/i.test(message)
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messageAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const messageArea = messageAreaRef.current
    if (messageArea) {
      messageArea.scrollTop = messageArea.scrollHeight
    }
  }, [messages, isLoading, error])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const userMessage = inputMessage.trim()
    if (!userMessage || isLoading) {
      return
    }

    setMessages((current) => [
      ...current,
      { id: Date.now(), sender: 'user', text: userMessage },
    ])
    setInputMessage('')
    setError('')

    if (detectsBookingIntent(userMessage)) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'You can choose an available appointment time on our booking page.',
          bookingLink: true,
        },
      ])
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(CHATBOT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
        }),
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const data = await response.json()
      if (typeof data.reply !== 'string') {
        throw new Error('Invalid chat response')
      }

      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, sender: 'assistant', text: data.reply },
      ])
    } catch {
      setError(
        'Sorry, the assistant is not connected right now. Please contact the business directly.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div
        id="chatbot-window"
        role="dialog"
        aria-label="Clinic Assistant chat"
        aria-hidden={!isOpen}
        className={`absolute bottom-[4.5rem] right-0 flex h-[min(31rem,calc(100vh-7rem))] w-[calc(100vw-2.5rem)] max-w-[23rem] origin-bottom-right flex-col overflow-hidden rounded-[1.5rem] border border-teal-100 bg-white shadow-[0_24px_70px_-18px_rgba(22,58,61,0.38)] transition duration-300 ${
          isOpen
            ? 'visible scale-100 opacity-100'
            : 'invisible pointer-events-none scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between bg-ink px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-gold-300">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl leading-none">Clinic Assistant</h2>
              <p className="mt-1.5 text-[11px] text-white/55">Here to help</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={messageAreaRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#f5faf9] p-4"
          aria-live="polite"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.sender === 'user'
                  ? 'ml-auto rounded-br-md bg-ink text-white'
                  : 'mr-auto rounded-bl-md border border-teal-100 bg-white text-slate-600 shadow-sm'
              }`}
            >
              {message.text}
              {message.bookingLink && (
                <a
                  href="/booking"
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-4 text-xs font-bold text-white transition hover:bg-teal-700"
                >
                  Open booking page
                </a>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-md border border-teal-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <LoaderCircle className="h-4 w-4 animate-spin text-teal-600" />
              Waiting for a reply...
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-100 bg-white p-3">
          <label htmlFor="chatbot-message" className="sr-only">
            Type your message
          </label>
          <input
            ref={inputRef}
            id="chatbot-message"
            type="text"
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            aria-label="Send chat message"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>Send</span>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="grid h-14 w-14 place-items-center rounded-full bg-ink text-white shadow-xl transition hover:scale-105 hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-200"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
        aria-controls="chatbot-window"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  )
}
