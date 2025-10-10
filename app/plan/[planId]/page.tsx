'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

const buttonClass = "bg-blue-500 hover:bg-blue-800 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
const logoutButtonClass = "bg-red-600 hover:bg-red-800 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm"
const h2Class = "text-xl mb-3 font-bold"

type ViewState = 'start_planning' | 'questions' | 'choices' | 'plan_complete' | 'analysing'

interface Choice {
  prompt: string
  choices: string[]
  message?: string
  assessment?: string
  level_label?: string
  level?: string
}

interface Questions {
  questions: string[]
  section?: string
}

// Extract plan name from URL slug
const extractPlanName = (slug: string): string => {
  return slug
    .replace(/-/g, ' ') // Replace hyphens with spaces
}

export default function BushfirePlan() {
  const params = useParams()
  const router = useRouter()
  const planId = params.planId as string
  const extractedPlanName = extractPlanName(planId)
  
  const [sessionId, setSessionId] = useState<string>('')
  const [view, setView] = useState<ViewState>('analysing')
  const [motivation, setMotivation] = useState<string>('')
  const [answers, setAnswers] = useState<{[key: string]: string}>({})
  const [questionsData, setQuestionsData] = useState<Questions | null>(null)
  const [choiceData, setChoiceData] = useState<Choice | null>(null)
  const [plan, setPlan] = useState<string[]>([])
  const [currentSection, setCurrentSection] = useState<string>('Getting Started')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const connectionAttemptRef = useRef<boolean>(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tabId = useRef<string>(crypto.randomUUID())

  const formatSection = (section: string) => 
    section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  // Generate session ID once the planId has been read from the URL
  useEffect(() => {
    if (planId) {
      const generateSessionId = async () => {
        try {
          // Get user ID from OAuth or use dev fallback
          const response = await fetch('/api/auth/user')
          const { userId } = await response.json()
          
          // Generate session ID from user + plan
          const sessionData = `${userId}-${planId}`
          const sessionHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionData))
          const sessionIdGenerated = Array.from(new Uint8Array(sessionHash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
          
          setSessionId(sessionIdGenerated)
        } catch (error) {
          console.error('Failed to generate session ID:', error)
          setErrorMessage('Failed to initialize session')
        }
      }
      
      generateSessionId()
    }
  }, [planId])

  // Setup SSE connection
  useEffect(() => {
    if (!sessionId) return
    if (eventSourceRef.current) return
    
    const eventSource = new EventSource(`/api/events?sessionId=${sessionId}`)
    eventSourceRef.current = eventSource
      
    eventSource.onopen = () => {
      setIsConnected(true)
    }
      
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      setIsConnected(false)
    }
      
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data)

      // Filter messages by tab_id if present
      if (message.tab_id && message.tab_id !== tabId.current) return

      // This message is sent by the BFF to confirm connection
      if (message.type === 'connected') {
        sendMessage({ type: 'connect', tab_id: tabId.current })
        return
      }
      
      // these messages are sent by the BFP API
      switch (message.type) {
        case 'no_session':
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          setView('start_planning')
          setCurrentSection('Plan Setup')
          break
        case 'session_ready':
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          if (message.needs_setup) {
            setView('start_planning')
          } else {
            setView('analysing')
          }
          break
        case 'questions':
          setQuestionsData({ questions: message.questions, section: message.section })
          setView('questions')
          setCurrentSection(formatSection(message.section || 'Questions'))
          break
        case 'choice':
          setChoiceData(message)
          setView('choices')
          setCurrentSection(formatSection(message.section || 'Decision Point'))
          break
        case 'plan_complete':
          setPlan(message.plan)
          setView('plan_complete')
          setCurrentSection('Plan Complete')
          break
        case 'error':
          console.error('Backend error:', message)
          setErrorMessage(message.message || 'An error occurred')
          break
      }
    }
    
    // Don't cleanup on dependency changes to prevent Fast Refresh issues
  }, [sessionId])

  // Final cleanup on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
        eventSourceRef.current.close()
      }
      eventSourceRef.current = null
      connectionAttemptRef.current = false
    }
  }, [])

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (view === 'analysing') {
      timeout = setTimeout(() => {
        setErrorMessage('Failed to receive response after 20 seconds')
      }, 20000)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [view])

  const sendMessage = async (message: object) => {
    const messageWithSession = { ...message, session_id: sessionId, tab_id: tabId.current }
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: messageWithSession })
    })
  }

  const startPlanning = () => {
    sendMessage({ type: 'start_new_plan', motivation: `Plan name: ${extractedPlanName}` })
    setView('analysing')
  }



  const submitAnswers = () => {
    sendMessage({ type: 'answers', answers })
    setAnswers({})
    setView('analysing')
  }

  const submitChoice = (choice: string) => {
    sendMessage({ type: 'choice', choice })
    setView('analysing')
  }

  const startNewPlan = () => {
    router.push('/')
  }

  const savePlanAsPDF = async (htmlToConvert: string) => {
    const pdfHTML = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; }
          </style>
        </head>
        <body>${htmlToConvert}</body>
      </html>
    `
    
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' },
      body: pdfHTML
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${planId}-bushfire-plan.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const cleanHTML = (html: string[]): string => {
    let text = html.join('')
    
    // Remove existing html, head, body tags and extract content
    text = text.replace(/<\/?html[^>]*>/gi, '')
                .replace(/<\/?head[^>]*>/gi, '')
                .replace(/<\/?body[^>]*>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .trim()
    
    // Add inline styles to HTML elements
    const styledHTML = `
      <style>
        h1 { font-size: 1.875rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937; }
        h2 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.75rem; color: #1f2937; }
        h3 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: #1f2937; }
        ol { margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: decimal; }
        ul { margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc; }
        li { margin-bottom: 0.5rem; }
        p { margin-bottom: 1rem; }
      </style>
      ${text}
    `
    
    return styledHTML
  }

  const planHTML = view === 'plan_complete' ? cleanHTML(plan) : ''

  return (
    <div className="max-w-3xl mx-auto p-5">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Bushfire Plan Generator</h1>
        <button 
          onClick={() => window.location.href = '/logout'}
          className={logoutButtonClass}
        >
          Logout
        </button>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-5">
        <p className="text-blue-800 font-medium">Current Section: {currentSection}</p>
        <p className="text-blue-600 text-sm">Plan: {planId}</p>
      </div>
      
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-5">
          <p className="text-red-800 font-medium">Error: {errorMessage}</p>
          <button 
            onClick={startNewPlan}
            className="text-red-600 underline text-sm mt-1"
          >
            Start New Plan
          </button>
        </div>
      )}

      {view === 'start_planning' && (
        <div className="my-5">
          <h2 className={h2Class}>Start Planning</h2>
          <p className="mb-3">Tell us why you want to create this bushfire plan:</p>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={4}
            placeholder="Enter your motivation..."
            className="my-2.5 p-2.5 w-full border rounded"
          />
          <button onClick={startPlanning} className={buttonClass}>Start Planning</button>
        </div>
      )}

      {view === 'questions' && questionsData && (
        <div className="my-5">
          <h3 className="text-lg mb-3">Please answer these questions:</h3>
          {questionsData.questions.map((question, index) => (
            <div key={index} className="my-5">
              <label className="block mb-2">{question}</label>
              <input
                type="text"
                value={answers[question] || ''}
                onChange={(e) => setAnswers(prev => ({...prev, [question]: e.target.value}))}
                placeholder="Your answer..."
                className="my-2.5 p-2.5 w-full border rounded"
              />
            </div>
          ))}
          <button onClick={submitAnswers} className={buttonClass}>Submit Answers</button>
        </div>
      )}
      
      {view === 'choices' && choiceData && (
        <div className="my-5">
          {choiceData.message && <p className="mb-3">{choiceData.message}</p>}
          {choiceData.assessment && <p className="mb-3">{choiceData.assessment}</p>}
          {choiceData.level_label && (
            <>
              <h3 className="text-lg font-bold mb-3">{choiceData.level_label}</h3>
              <p className="mb-3">{choiceData.level}</p>
            </>
          )}
          <h3 className="text-lg font-bold mb-3">{choiceData.prompt}</h3>
          {choiceData.choices.map((choice, index) => (
            <button key={index} onClick={() => submitChoice(choice)} className={`${buttonClass} mr-2 mb-2`}>
              {choice}
            </button>
          ))}
        </div>
      )}

      {view === 'plan_complete' && (
        <div className="my-5">
          <h2 className={h2Class}>Your Bushfire Plan: {extractedPlanName}</h2>
          <button onClick={() => savePlanAsPDF(planHTML)} className={`${buttonClass} mb-5 mr-2`}>Save as PDF</button>
          <button onClick={startNewPlan} className={`${buttonClass} mb-5`}>Create New Plan</button>
          <div className="bg-gray-100 p-5 my-5 rounded" 
               style={{ fontSize: '16px', lineHeight: '1.6' }}
               dangerouslySetInnerHTML={{__html: planHTML}} />
        </div>
      )}

      {view === 'analysing' && (
        <div className="my-5">
          <div className="text-center">
            <div className="inline-block animate-pulse text-lg">Analysing...</div>
          </div>
        </div>
      )}
    </div>
  )
}