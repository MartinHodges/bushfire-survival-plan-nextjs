'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Convert plan name to URL-friendly slug
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

// This is different to createSlug as we want the user to be able to enter
// spaces and hyphens freely when typing the plan name
const sanitize = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
}

const buttonClass = "bg-blue-500 hover:bg-blue-800 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
const logoutButtonClass = "bg-red-600 hover:bg-red-800 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm"
const h2Class = "text-xl mb-3 font-bold"

export default function Home() {
  const router = useRouter()
  const [planId, setPlanId] = useState('')
  const [newPlanName, setNewPlanName] = useState('')

  const gotoPlan = (planId: string) => {
    if (planId.trim()) {
      const slug = createSlug(planId)
      router.push(`/plan/${slug}`)
    }
  }

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

      <div className="my-5">
        <h2 className={h2Class}>Welcome</h2>
        <p className="mb-6">Create and manage your bushfire emergency plans. Each plan is bookmarkable and can be accessed from multiple tabs.</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-3">Create New Plan</h3>
            <p className="mb-4 text-gray-600">Give your plan a name to create a bookmarkable URL.</p>
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => {
                const sanitizedInput = sanitize(e.target.value);
                setNewPlanName(sanitizedInput);
              }}
              placeholder="e.g., Home Plan, Farm Plan, Holiday House"
              className="w-full p-2 border rounded mb-3"
              onKeyDown={(e) => e.key === 'Enter' && gotoPlan(newPlanName)}
            />
            <button 
              onClick={() => gotoPlan(newPlanName)} 
              disabled={!newPlanName.trim()}
              className={`${buttonClass} ${!newPlanName.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Create Plan
            </button>
          </div>
          
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-3">Open Existing Plan</h3>
            <p className="mb-4 text-gray-600">Continue working on an existing plan using its ID.</p>
            <input
              type="text"
              value={planId}
              onChange={(e) => {
                const sanitizedInput = sanitize(e.target.value);
                setPlanId(sanitizedInput);
              }}
              placeholder="Enter plan ID"
              className="w-full p-2 border rounded mb-3"
              onKeyDown={(e) => e.key === 'Enter' && gotoPlan(planId)}
            />
            <button 
              onClick={() => gotoPlan(planId)} 
              disabled={!planId.trim()}
              className={`${buttonClass} ${!planId.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Open Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}