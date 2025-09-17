'use client';

import { useState, useEffect } from 'react';

const buttonClass = "bg-blue-500 hover:bg-blue-800 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
const logoutButtonClass = "bg-red-600 hover:bg-red-800 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm"
const h2Class = "text-xl mb-3 font-bold"

function TypingText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayText(text.slice(0, index + 1));
      index = (index + 1) % (text.length + 1);
      if (index === 0) {
        setTimeout(() => {}, 200);
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, [text]);
  
  return <h3 className="text-lg mb-3">{displayText}</h3>;
}

interface Choice {
  prompt: string
  choices: string[]
  message: string
  assessment: string
  level_label: string | null
  level: string | null
}

export default function BushfirePlan() {
  const [sessionId, setSessionId] = useState<string>('');
  const [motivation, setMotivation] = useState<string>('')
  const [answers, setAnswers] = useState<{[key: string]: string}>({})
  const [beginSession, setBeginSession] = useState<boolean>(true)
  const [isComplete, setIsComplete] = useState(false)
  const [currentQuestions, setCurrentQuestions] = useState<string[] | null>(null)
  const [currentChoice, setCurrentChoice] = useState<Choice | null>(null)
  const [plan, setPlan] = useState<string[]>([])

  useEffect(() => {
    const newSessionId = Date.now().toString();
    setSessionId(newSessionId);
    
    const eventSource = new EventSource(`/api/events?sessionId=${newSessionId}`);
    
    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };
    
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);

      if (message.type === 'connected') {
        console.log('Connected to server');
        return;
      }
      
      if (message.type === 'session_started') {
        setIsComplete(false)
      } else if (message.type === 'questions') {
        setCurrentQuestions(message.questions);
        setCurrentChoice(null);
        setPlan([]);
      } else if (message.type === 'choice') {
          setCurrentChoice({
            prompt: message.prompt,
            choices: message.choices,
            message: message.message,
            assessment: message.assessment,
            level_label: message.level_label,
            level: message.level
          })
        setCurrentQuestions(null);
        setPlan([]);
      } else if (message.type === 'plan_complete') {
        setPlan(message.plan);
        setCurrentChoice(null);
        setCurrentQuestions(null);
        setIsComplete(true)
      } else {
        setIsComplete(true)
      }
    }
    
    return () => eventSource.close();
  }, []);

  const sendMessage = async (message: object) => {
    console.log('Sending message:', message);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });
  };

  const startSession = () => {
    sendMessage({ type: 'start_session', motivation: motivation });
    setBeginSession(false)
  };

  const submitAnswers = () => {
    sendMessage({ type: 'user_response', answers: answers });
    setAnswers({})
    setCurrentQuestions([])
  };

  const submitChoice = (choice: string) => {
    sendMessage({ type: 'user_response', answers: choice });
    setCurrentChoice(null);
  };

  const handleAnswerChange = (question: string, answer: string) => {
    setAnswers(prev => ({...prev, [question]: answer}))
  }

  const savePlanAsPDF = async (htmlToConvert: string) => {
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' },
      body: htmlToConvert
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bushfire-plan.pdf';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

    // this removes any ``` demarcation that the LLM may include
  const cleanHTML = (html: string[]):string => {
    let text = ''
    const demarks = html.filter(l => l.includes("```")).length
    if (demarks === 0) {
      text = html.join('')
    } else {
      let demarkFound = false
      for (const line of html) {
        const demarcation = line.includes("```")
        if (demarkFound) {
          if (demarcation) {
            break
          }
          text += line
        }
        demarkFound = demarcation || demarkFound
      }
    }
    return text
  }

  const begin = sessionId && beginSession
  const showPlan = !begin && isComplete
  const questions = !showPlan && currentQuestions && currentQuestions?.length > 0
  const choices = !questions && currentChoice && currentChoice.choices.length > 0
  const analysing = !begin && !questions && !choices && !showPlan

  const planHTML = showPlan ? cleanHTML(plan) : ''

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
      {begin && (
       <div className="my-5">
          <h2 className={h2Class}>Introduction:</h2>
          <p className="mb-3">Welcome to the Bushfire Plan Generator. 
            This tool will guide you through a series of questions to help create a 
            personalized bushfire plan. Please provide honest and thoughtful answers 
            to ensure the best possible plan for your safety.
          </p>
          <p className='mb-3'>The plan is created in 3 steps:</p>
          <ol className="mb-3 list-decimal list-inside">
            <li>We look at the risk of bushfire adversely affecting you, your family or your property.</li>
            <li>We will then look at your capability to stay and defend your property.</li>
            <li>Finally, we create either a <i><b>leave early</b></i> or <i><b>stay and defend plan</b></i> based on your preferences.</li>
          </ol>
          <p className="mb-3">Please note that this tool is for informational purposes only and does not replace professional advice. Always follow local authorities&apos; recommendations during bushfire events.</p>
          <p className="mb-6">By clicking &quot;Start Planning&quot;, you acknowledge that you understand the limitations of this tool and agree to use it responsibly.</p>
          <h2 className={h2Class}>Tell us why you want to create a bushfire plan:</h2>
          <p className="mb-3">Provide as much detail as possible to help us understand your situation and needs.</p>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            rows={4}
            cols={50}
            placeholder="Enter your motivation..."
            className="my-2.5 p-2.5 w-full border rounded"
          />
          <br />
          <button onClick={startSession} className={buttonClass}>Start Planning</button>
        </div>
      )}

      {questions && (
        <div className="my-5">
          <h3 className="text-lg mb-3">Please answer these questions:</h3>
          {currentQuestions.map((question, index) => (
            <div key={index} className="my-5 min-w-1/2">
              <label className="block mb-2">{question}</label>
              <input
                type="text"
                value={answers[question] || ''}
                onChange={(e) => handleAnswerChange(question, e.target.value)}
                placeholder="Your answer..."
                className="my-2.5 p-2.5 w-full border rounded"
              />
            </div>
          ))}
          <button onClick={submitAnswers} className={buttonClass}>Submit Answers</button>
        </div>
      )}
      
      {choices && (
        <div className="my-5">
          {(currentChoice.message || currentChoice.assessment) && (
              <h3 className="text-lg font-bold mb-3">Summary</h3>
          )}
          {currentChoice.message && (
            <p className="mb-3">{currentChoice.message}</p>
          )}
          {currentChoice.assessment && (
            <p className="mb-3">{currentChoice.assessment}</p>
          )}
          {currentChoice.level_label && (
            <>
              <h3 className="text-lg font-bold mb-3">{currentChoice.level_label}</h3>
              <p className="mb-3">{currentChoice.level}</p>
            </>
          )}
          <h3 className="text-lg font-bold mb-3">{currentChoice.prompt}</h3>
          {currentChoice.choices.map((choice, index) => (
            <button key={index} onClick={() => submitChoice(choice)} className={`${buttonClass} mr-2 mb-2`}>
              {choice}
            </button>
          ))}
        </div>
      )}

      {showPlan && (
        <div className="my-5">
          <h2 className={h2Class}>Your Bushfire Plan:</h2>
          {planHTML.length === 0 ?
           (
            <>
              <p className="mb-3">No plan has been generated.</p>
              <button onClick={() => {setBeginSession(true); setIsComplete(false); setPlan([])}} className={buttonClass}>Start Again</button>
            </>
           ) : (
            <>
              <p className="mb-3">Below is your bushfire plan. You can save it as a PDF for your records.</p>
              <button onClick={() => savePlanAsPDF(planHTML)} className={`${buttonClass} mb-5`}>Save as PDF</button>
              <div className="bg-gray-100 p-5 my-5 rounded" dangerouslySetInnerHTML={{__html: planHTML}} />
            </>
           )
          }
        </div>
      )}

      {analysing && (
        <div className="my-5">
          <TypingText text="Analysing..." />
        </div>
      )}
    </div>
  );
}