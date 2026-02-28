import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { copyToClipboard } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  podId: number
  podName: string
}

function generateCode(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, podId, podName }) => {
  const toast = useToast()
  const [code, setCode] = useState(() => generateCode())
  const [copied, setCopied] = useState(false)

  const inviteLink = `https://qflink.app/invite/${podId}-${code}`

  const handleCopy = async () => {
    await copyToClipboard(inviteLink)
    setCopied(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerateNew = () => {
    setCode(generateCode())
    setCopied(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite to Pod">
      <div className="space-y-4">
        <p className="text-sm text-qx-text-secondary">
          Share this link to invite others to <span className="font-semibold text-qx-text-primary">{podName}</span>:
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-qx-border-prominent bg-qx-elevated p-3">
          <p className="flex-1 text-xs text-qx-text-secondary font-mono truncate">{inviteLink}</p>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors bg-cyan-600/15 text-cyan-600 hover:bg-cyan-600/25"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs text-yellow-400/90">
            This link can be used by anyone. Share carefully.
          </p>
        </div>

        <div className="flex justify-between items-center pt-1">
          <button
            onClick={handleGenerateNew}
            className="text-xs text-qx-text-muted hover:text-qx-text-secondary transition-colors underline underline-offset-2"
          >
            Generate New Link
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-qx-elevated px-4 py-2 text-sm font-medium text-qx-text-primary transition-colors hover:bg-qx-border-subtle"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
