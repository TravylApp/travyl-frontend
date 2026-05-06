'use client'

import { useState, useCallback } from 'react'
import { useAuthStore, fetchDocumentUploadUrl, uploadToS3Presigned, fetchDocumentParse, type DocumentParseResult } from '@travyl/shared'

export type UploadPhase = 'idle' | 'confirm-paste' | 'uploading' | 'parsing' | 'review' | 'reparse' | 'error'

export interface UploadState {
  phase: UploadPhase
  error: string | null
  result: DocumentParseResult | null
  pendingPasteFile: File | null
  lastObjectKey: string | null  // S3 key for re-processing "other" type
  unreadable: boolean           // true when server returned 422
}

export function useDocumentUpload(tripId?: string) {
  const token = useAuthStore((s) => s.session?.access_token)
  const [state, setState] = useState<UploadState>({
    phase: 'idle',
    error: null,
    result: null,
    pendingPasteFile: null,
    lastObjectKey: null,
    unreadable: false,
  })

  const reset = useCallback(() => {
    setState({ phase: 'idle', error: null, result: null, pendingPasteFile: null, lastObjectKey: null, unreadable: false })
  }, [])

  const triggerFilePicker = useCallback(() => {
    document.getElementById('document-upload-input')?.click()
  }, [])

  const handleFileSelected = useCallback(async (file: File) => {
    if (!token) return
    setState({ phase: 'uploading', error: null, result: null, pendingPasteFile: null, lastObjectKey: null, unreadable: false })

    // Convert PDF to PNG if needed
    let uploadFile = file
    if (file.type === 'application/pdf') {
      const { convertPdfToImage } = await import('@/components/documents/pdfUtils')
      uploadFile = await convertPdfToImage(file)
    }

    try {
      // Step 1: Get presigned URL
      const { uploadUrl, objectKey } = await fetchDocumentUploadUrl(token, uploadFile.type, uploadFile.size)

      // Step 2: Upload to S3
      await uploadToS3Presigned(uploadUrl, uploadFile)

      // Step 3: Parse
      setState((prev) => ({ ...prev, phase: 'parsing' }))
      const result = await fetchDocumentParse(token, objectKey, tripId)

      setState({ phase: 'review', error: null, result, pendingPasteFile: null, lastObjectKey: objectKey, unreadable: false })
    } catch (err: any) {
      if (err.message?.includes('422') || err.message?.includes('unreadable')) {
        setState({ phase: 'error', error: 'Could not read this document clearly. Try a clearer photo.', result: null, pendingPasteFile: null, lastObjectKey: null, unreadable: true })
      } else {
        setState({ phase: 'error', error: err.message ?? 'Upload failed', result: null, pendingPasteFile: null, lastObjectKey: null, unreadable: false })
      }
    }
  }, [token, tripId])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
    e.target.value = ''
  }, [handleFileSelected])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          setState((prev) => ({ ...prev, phase: 'confirm-paste', pendingPasteFile: file }))
        }
        return
      }
    }
  }, [])

  const confirmPaste = useCallback(() => {
    if (state.pendingPasteFile) {
      handleFileSelected(state.pendingPasteFile)
    }
  }, [state.pendingPasteFile, handleFileSelected])

  const cancelPaste = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'idle', pendingPasteFile: null, lastObjectKey: null }))
  }, [])

  // For "other" type re-processing with a hint — uses stored objectKey
  const reparseWithHint = useCallback(async (hint: string) => {
    if (!token || !state.lastObjectKey) return
    setState((prev) => ({ ...prev, phase: 'parsing', error: null }))
    try {
      const result = await fetchDocumentParse(token, state.lastObjectKey!, tripId, hint)
      setState((prev) => ({ ...prev, phase: 'review', result, error: null }))
    } catch (err: any) {
      setState((prev) => ({ ...prev, phase: 'error', error: err.message ?? 'Re-processing failed' }))
    }
  }, [token, tripId, state.lastObjectKey])

  return {
    ...state,
    triggerFilePicker,
    handleFileInputChange,
    handleFileSelected,
    handlePaste,
    confirmPaste,
    cancelPaste,
    reparseWithHint,
    reset,
  }
}
