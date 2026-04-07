import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface AvatarUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | null) => void;
  disabled?: boolean;
  hideButtons?: boolean;
}

export function AvatarUpload({ currentImage, onImageChange, disabled, hideButtons = false }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with parent's currentImage prop (e.g. on discard changes)
  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreview(result);
        onImageChange(result);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  }, [onImageChange]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageChange(null);
    setShowRemoveConfirm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar Display */}
      <div
        className={`relative group flex-shrink-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <div
          className={`
            w-20 h-20 rounded-full overflow-hidden border-3 border-gray-200
            transition-all duration-200
            ${isDragging ? 'border-blue-500 scale-105' : ''}
            ${disabled ? 'opacity-60' : 'group-hover:border-blue-400'}
          `}
        >
          {preview ? (
            <img src={preview} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Camera size={28} className="text-gray-400" />
            </div>
          )}
        </div>

        {!disabled && (
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Upload size={24} className="text-white" />
            </div>
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 rounded-full bg-blue-500/50 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            <Upload size={24} className="text-white" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="Upload profile photo"
        />
      </div>

      {/* Compact Action Buttons */}
      {!hideButtons && (
        <div className="flex flex-col items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}
            disabled={disabled}
            className="gap-1 text-xs h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Upload size={12} />
            {preview ? 'Change' : 'Upload'}
          </Button>

          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(true); }}
              disabled={disabled}
              className="gap-1 text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={12} />
              Remove
            </Button>
          )}
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={() => setShowRemoveConfirm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Remove Profile Photo?</h3>
                <p className="text-sm text-gray-600">
                  Your profile photo will be removed and replaced with a default avatar.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowRemoveConfirm(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleRemoveImage} className="bg-red-600 hover:bg-red-700 text-white">
                Remove Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}