'use client'

interface AvatarUploadProps {
  currentUrl?: string | null
  currentImage?: string
  onUpload?: (url: string) => void
  onImageChange?: (url: string) => void
  size?: number
  hideButtons?: boolean
}

export function AvatarUpload({ currentUrl, currentImage, onUpload, onImageChange, size = 96, hideButtons }: AvatarUploadProps) {
  const imgSrc = currentUrl || currentImage
  return (
    <label className="cursor-pointer relative group" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
        {imgSrc ? (
          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">?</div>
        )}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs font-medium">Change</span>
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : null
          if (!result) return
          onUpload?.(result)
          onImageChange?.(result)
        }
        reader.readAsDataURL(file)
      }} />
    </label>
  )
}
