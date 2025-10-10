import { useEffect, useState } from 'react'

export default function TypingText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState('')
  
  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      setDisplayText(text.slice(0, index + 1))
      index = (index + 1) % (text.length + 1)
      if (index === 0) {
        setTimeout(() => {}, 100)
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [text])
  
  return <h3 className="text-lg mb-3">{displayText}</h3>
}
