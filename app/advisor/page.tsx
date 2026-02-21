'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'

type AdvisorTopic = 'playbook' | 'exit_strategy' | 'sops' | 'financial' | 'growth'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  topic: AdvisorTopic
  title: string
  messages: Message[]
  updated_at: string
}

const ADVISOR_TOPICS = [
  {
    id: 'playbook' as AdvisorTopic,
    icon: '📖',
    name: 'Business Playbook',
    description: 'Build a comprehensive business playbook covering vision, operations, and strategy'
  },
  {
    id: 'exit_strategy' as AdvisorTopic,
    icon: '💰',
    name: 'Exit Strategy & Valuation',
    description: 'Prepare your business for sale and understand valuation multiples'
  },
  {
    id: 'sops' as AdvisorTopic,
    icon: '📋',
    name: 'SOPs & Documentation',
    description: 'Document standard operating procedures and systematize your business'
  },
  {
    id: 'financial' as AdvisorTopic,
    icon: '📊',
    name: 'Financial Analysis',
    description: 'Analyze profit margins, costs, and pricing strategy'
  },
  {
    id: 'growth' as AdvisorTopic,
    icon: '🚀',
    name: 'Growth Strategy',
    description: 'Scale your business with marketing, hiring, and expansion strategies'
  }
]

export default function AdvisorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [selectedTopic, setSelectedTopic] = useState<AdvisorTopic | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsApiKey, setNeedsApiKey] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (status === 'authenticated') {
      loadConversations()
    }
  }, [status])

  useEffect(() => {
    if (currentConversation) {
      setMessages(currentConversation.messages || [])
    } else {
      setMessages([])
    }
  }, [currentConversation])

  if (status === 'loading') return <p className="text-center p-8">Loading...</p>
  if (!session) {
    router.push('/login')
    return null
  }

  const loadConversations = async () => {
    try {
      const response = await axios.get('/api/advisor/chat')
      setConversations(response.data.conversations || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const handleTopicSelect = (topic: AdvisorTopic) => {
    setSelectedTopic(topic)
    setCurrentConversation(null)
    setMessages([])
    setInput('')
    setNeedsApiKey(false)
  }

  const loadConversation = async (convId: string) => {
    try {
      const response = await axios.get(`/api/advisor/chat?conversationId=${convId}`)
      setCurrentConversation(response.data.conversation)
      setSelectedTopic(response.data.conversation.topic)
    } catch (error) {
      console.error('Error loading conversation:', error)
      toast({ title: 'Error loading conversation' })
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedTopic) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await axios.post('/api/advisor/chat', {
        conversationId: currentConversation?.id,
        topic: selectedTopic,
        message: userMessage
      })

      setMessages(response.data.messages)

      // Update or create conversation
      if (!currentConversation) {
        const newConv: Conversation = {
          id: response.data.conversationId,
          topic: selectedTopic,
          title: ADVISOR_TOPICS.find(t => t.id === selectedTopic)?.name || 'Conversation',
          messages: response.data.messages,
          updated_at: new Date().toISOString()
        }
        setCurrentConversation(newConv)
        setConversations(prev => [newConv, ...prev])
      } else {
        setCurrentConversation({
          ...currentConversation,
          messages: response.data.messages,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      
      if (error.response?.data?.needsApiKey) {
        setNeedsApiKey(true)
        toast({ 
          title: 'API Key Required',
          description: 'Business Advisor requires Anthropic API key. Please add ANTHROPIC_API_KEY to your environment.'
        })
      } else {
        const errorMsg = error.response?.data?.error || 'Sorry, something went wrong.'
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: errorMsg }
        ])
        toast({ title: 'Error', description: errorMsg })
      }
    } finally {
      setLoading(false)
    }
  }

  const newConversation = () => {
    setCurrentConversation(null)
    setMessages([])
    setInput('')
  }

  const currentTopicInfo = selectedTopic ? ADVISOR_TOPICS.find(t => t.id === selectedTopic) : null

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Business Advisor</h1>
            <p className="text-gray-400">Powered by Claude Sonnet 4</p>
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            ← Dashboard
          </Button>
        </div>

        {needsApiKey && (
          <Card className="bg-yellow-900 border-yellow-700 mb-6">
            <CardContent className="pt-6">
              <p className="text-yellow-100">
                <strong>⚠️ API Key Required:</strong> Business Advisor requires the Anthropic API key (Claude). 
                Please add <code className="bg-yellow-800 px-2 py-1 rounded">ANTHROPIC_API_KEY</code> to your environment variables.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Topic Selector */}
            <Card className="bg-gray-800 border-gray-700 mb-4">
              <CardHeader>
                <CardTitle className="text-white text-sm">Select Topic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ADVISOR_TOPICS.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedTopic === topic.id
                        ? 'bg-blue-900 border-2 border-blue-500'
                        : 'bg-gray-700 border-2 border-transparent hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{topic.icon}</span>
                      <div>
                        <p className="font-semibold text-white text-sm">{topic.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{topic.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Conversations */}
            {conversations.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Recent Conversations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {conversations.slice(0, 10).map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full p-2 rounded text-left text-sm transition-all ${
                        currentConversation?.id === conv.id
                          ? 'bg-blue-900'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <p className="text-white truncate">
                        {ADVISOR_TOPICS.find(t => t.id === conv.topic)?.icon} {conv.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">
                    {currentTopicInfo ? (
                      <span>{currentTopicInfo.icon} {currentTopicInfo.name}</span>
                    ) : (
                      'Select a topic to begin'
                    )}
                  </CardTitle>
                  {currentConversation && (
                    <Button onClick={newConversation} size="sm" variant="outline">
                      + New Chat
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedTopic ? (
                  <div className="text-center text-gray-400 py-16">
                    <p className="text-lg mb-2">👈 Select a topic from the sidebar to get started</p>
                    <p>I'm here to help you build, grow, and optimize your construction business.</p>
                  </div>
                ) : (
                  <>
                    {/* Messages */}
                    <div className="h-[600px] overflow-y-auto space-y-4 mb-4 p-4 bg-gray-900 rounded">
                      {messages.length === 0 && (
                        <div className="text-center text-gray-400 py-8">
                          <p className="text-lg mb-2">
                            {currentTopicInfo?.icon} {currentTopicInfo?.name}
                          </p>
                          <p className="mb-4">{currentTopicInfo?.description}</p>
                          <p className="text-sm">Start the conversation by asking a question or sharing what you'd like to work on.</p>
                        </div>
                      )}
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] p-4 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-100'
                            }`}
                          >
                            <p className="text-sm font-semibold mb-2">
                              {msg.role === 'user' ? 'You' : 'Business Advisor'}
                            </p>
                            <div className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-700 text-gray-100 p-4 rounded-lg">
                            <p className="text-sm font-semibold mb-2">Business Advisor</p>
                            <p className="animate-pulse">Thinking...</p>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-2">
                      <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                          }
                        }}
                        placeholder="Ask a question or share what you'd like to work on..."
                        className="bg-gray-700 border-gray-600 text-white"
                        disabled={loading || needsApiKey}
                      />
                      <Button 
                        onClick={handleSend} 
                        disabled={loading || !input.trim() || needsApiKey}
                      >
                        Send
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
