'use client'

import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { TripNote } from '@travyl/shared'
import { useHourHeight } from './HourHeightContext'

const NOTE_COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#ede9fe']

function getRotation(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return ((hash % 7) - 3)
}

export function getNoteColor(collaboratorIndex: number): string {
  return NOTE_COLORS[collaboratorIndex % NOTE_COLORS.length]
}

interface PostItNoteProps {
  note: TripNote
  authorInitials: string
  canEdit: boolean
  canDelete: boolean
  timeRangeStartHour: number
  onUpdate: (noteId: string, text: string) => void
  onDelete: (noteId: string) => void
}

export function PostItNote({ note, authorInitials, canEdit, canDelete, timeRangeStartHour, onUpdate, onDelete }: PostItNoteProps) {
  const HOUR_HEIGHT = useHourHeight()
  const [isEditing, setIsEditing] = useState(!note.text)
  const [isHovered, setIsHovered] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note-${note.id}`,
    data: { type: 'note' as const, note },
    disabled: !canEdit,
  })

  const rotation = getRotation(note.id)
  const topPx = (note.hour - timeRangeStartHour) * HOUR_HEIGHT

  const style: React.CSSProperties = {
    position: 'absolute',
    right: 4,
    top: topPx,
    width: 120,
    zIndex: isDragging ? 100 : 20,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px) rotate(${rotation}deg)`
      : `rotate(${rotation}deg)`,
    opacity: isDragging ? 0.8 : 0.9,
    transition: isDragging ? undefined : 'box-shadow 0.15s ease',
  }

  useEffect(() => {
    if (isEditing && textRef.current) textRef.current.focus()
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    const text = textRef.current?.textContent ?? ''
    if (text !== note.text) onUpdate(note.id, text)
  }

  return (
    <div ref={setNodeRef} style={style} className="cursor-grab rounded-sm shadow-md active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      {...(canEdit ? { ...attributes, ...listeners } : {})}>
      <div className="relative rounded-sm p-2" style={{ backgroundColor: note.color }}>
        <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[8px] font-bold text-black/50">
          {authorInitials}
        </div>
        {canDelete && isHovered && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow">
            &times;
          </button>
        )}
        <div ref={textRef} contentEditable={canEdit} suppressContentEditableWarning
          onClick={(e) => { if (canEdit) { e.stopPropagation(); setIsEditing(true) } }}
          onBlur={handleBlur}
          className="min-h-[24px] text-xs leading-relaxed text-black/80 outline-none">
          {note.text}
        </div>
      </div>
    </div>
  )
}
