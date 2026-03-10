import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  getActiveLocalSession,
  createSession,
  revokeSession,
} from '@/lib/sessionKeys'

type SessionState = 'none' | 'creating' | 'active' | 'expiring' | 'critical' | 'expired'

const DURATION_OPTIONS = [
  { label: '30 min', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
]

const GAS_FUNDING = 50000000000000000n // 0.05 QF

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const SessionKeyBanner: React.FC = () => {
  const [state, setState] = useState<SessionState>('none')
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const hadSessionRef = useRef(false)

  const refreshState = useCallback(() => {
    const session = getActiveLocalSession()
    if (session) {
      hadSessionRef.current = true
      const remaining = Math.max(0, Math.floor((session.expiry - Date.now()) / 1000))
      setTimeRemaining(remaining)
      if (remaining <= 0) {
        setState('expired')
      } else if (remaining < 60) {
        setState('critical')
      } else if (remaining < 300) {
        setState('expiring')
      } else {
        setState('active')
      }
      return
    }
    // No active session
    setTimeRemaining(0)
    if (hadSessionRef.current) {
      setState('expired')
    } else {
      setState('none')
    }
  }, [])

  useEffect(() => {
    refreshState()
    const interval = setInterval(refreshState, 1000)
    return () => clearInterval(interval)
  }, [refreshState])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    if (showPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  const handleCreate = async (durationSeconds: number) => {
    setShowPicker(false)
    setError(null)
    setIsCreatingSession(true)
    setState('creating')
    try {
      await createSession(durationSeconds, GAS_FUNDING)
      refreshState()
    } catch (err) {
      console.error('Failed to create session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
      setState('none')
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleRevoke = async () => {
    await revokeSession()
    hadSessionRef.current = false
    setState('none')
    setTimeRemaining(0)
  }

  if (state === 'creating') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-cyan-600/30 bg-cyan-600/5 px-3 py-1.5">
        <svg className="h-3.5 w-3.5 animate-spin text-cyan-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs font-medium text-cyan-600">Authorizing session…</span>
      </div>
    )
  }

  if (state === 'active') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
          {formatTimeRemaining(timeRemaining)}
        </span>
        <button
          onClick={handleRevoke}
          className="text-xs text-qx-text-muted hover:text-qx-text-primary transition-colors"
        >
          End
        </button>
      </div>
    )
  }

  if (state === 'expiring') {
    return (
      <div className="relative flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tabular-nums">
          {formatTimeRemaining(timeRemaining)}
        </span>
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          Renew
        </button>
        {showPicker && <DurationPicker pickerRef={pickerRef} onSelect={handleCreate} isLoading={isCreatingSession} />}
      </div>
    )
  }

  if (state === 'critical') {
    return (
      <div className="relative flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-medium text-red-600 dark:text-red-400 tabular-nums">
          {formatTimeRemaining(timeRemaining)}
        </span>
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          Renew
        </button>
        {showPicker && <DurationPicker pickerRef={pickerRef} onSelect={handleCreate} isLoading={isCreatingSession} />}
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div className="relative flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-xs text-red-500">Expired</span>
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          New session
        </button>
        {showPicker && <DurationPicker pickerRef={pickerRef} onSelect={handleCreate} isLoading={isCreatingSession} />}
      </div>
    )
  }

  // state === 'none'
  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        disabled={isCreatingSession}
        className={`flex items-center gap-1.5 rounded-lg border border-cyan-600/40 px-3 py-1.5 text-xs font-medium text-cyan-600 transition-colors hover:bg-cyan-600/10 hover:border-cyan-600/60 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isCreatingSession ? (
          <>
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Instant mode
          </>
        )}
      </button>
      {showPicker && !isCreatingSession && <DurationPicker pickerRef={pickerRef} onSelect={handleCreate} isLoading={isCreatingSession} />}
      {error && (
        <p className="absolute top-full mt-1 text-xs text-red-500 whitespace-nowrap">{error}</p>
      )}
    </div>
  )
}

const DurationPicker: React.FC<{
  pickerRef: React.RefObject<HTMLDivElement | null>
  onSelect: (seconds: number) => void
  isLoading?: boolean
}> = ({ pickerRef, onSelect, isLoading }) => (
  <div
    ref={pickerRef as React.RefObject<HTMLDivElement>}
    className="absolute top-full right-0 mt-2 z-50 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1A] shadow-xl p-3 space-y-2"
  >
    <p className="text-xs font-semibold text-qx-text-primary">Session duration</p>
    <div className="space-y-1">
      {DURATION_OPTIONS.map((opt) => (
        <button
          key={opt.seconds}
          onClick={() => onSelect(opt.seconds)}
          disabled={isLoading}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-qx-text-primary hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
        >
          <span>{opt.label}</span>
          <span className="text-xs text-qx-text-muted">0.05 QF gas</span>
        </button>
      ))}
    </div>
    <p className="text-[10px] text-qx-text-muted leading-tight">
      One wallet popup to authorize. Then messages send instantly with no popups.
    </p>
  </div>
)
