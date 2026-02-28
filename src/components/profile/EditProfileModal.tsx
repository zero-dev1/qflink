import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { LIMITS } from '@/types'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  currentName: string
  onSave: (name: string) => void
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentName,
  onSave,
}) => {
  const toast = useToast()
  const [name, setName] = useState(currentName)
  const [isSaving, setIsSaving] = useState(false)

  const trimmed = name.trim()
  const isValid = trimmed.length > 0 && trimmed.length <= LIMITS.MAX_DISPLAY_NAME_LENGTH
  const isChanged = trimmed !== currentName

  const handleSave = async () => {
    if (!isValid || !isChanged) return
    setIsSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      onSave(trimmed)
      toast.success('Display name updated')
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setName(currentName)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Profile"
      footer={
        <>
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-qx-text-secondary transition-colors hover:bg-qx-elevated"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || !isChanged || isSaving}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
            )}
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-qx-text-secondary mb-1.5 block">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Enter display name"
            maxLength={LIMITS.MAX_DISPLAY_NAME_LENGTH}
            autoFocus
            className="w-full rounded-lg border border-qx-border-prominent bg-qx-card px-3 py-2 text-sm text-qx-text-primary placeholder:text-qx-text-muted focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-qx-text-muted">
              Shown to other users in pods and DMs
            </span>
            <span className={`text-xs tabular-nums ${name.length > LIMITS.MAX_DISPLAY_NAME_LENGTH ? 'text-red-400' : 'text-qx-text-muted'}`}>
              {name.length}/{LIMITS.MAX_DISPLAY_NAME_LENGTH}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
