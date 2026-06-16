import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, AlertCircle, Clock, RefreshCw } from 'lucide-react'

interface SavedResume {
  text: string
  fileName: string
  savedAt: number
}

interface ResumeUploaderProps {
  onUpload: (file: File) => Promise<void>
  onResumeCached: (text: string, fileName: string) => void
  resumeStoreKey: string
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function ResumeUploader({ onUpload, onResumeCached, resumeStoreKey }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [savedResume, setSavedResume] = useState<SavedResume | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(resumeStoreKey)
      if (raw) {
        const parsed = JSON.parse(raw) as SavedResume
        if (parsed.text && parsed.fileName) {
          setSavedResume(parsed)
        }
      }
    } catch {
      // corrupted cache — ignore
    }
  }, [resumeStoreKey])

  const handleFile = async (file: File) => {
    setError(null)

    const name = file.name.toLowerCase()
    const isValidType =
      file.type.includes('pdf') ||
      file.type.includes('document') ||
      file.type.includes('word') ||
      name.endsWith('.pdf') ||
      name.endsWith('.docx') ||
      name.endsWith('.doc')
    if (!isValidType) {
      setError('Please upload a PDF or Word document (.pdf, .docx, .doc)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setIsLoading(true)
    try {
      await onUpload(file)
    } catch (err) {
      console.error('Resume processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process resume')
      setIsLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) handleFile(file)
  }

  // Show cached resume choice screen
  if (savedResume && !showUpload) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="section-title mb-2">Welcome Back</h2>
          <p className="section-subtitle">We found your previously uploaded resume</p>
        </div>

        <div className="card border-2 border-gray-200 dark:border-dark-border space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{savedResume.fileName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400 dark:text-dark-text-secondary" />
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  Saved {timeAgo(savedResume.savedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onResumeCached(savedResume.text, savedResume.fileName)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Continue with this resume
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Upload new
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Normal upload screen
  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-2">Upload Your Resume</h2>
        <p className="section-subtitle">Upload your current CV to get started with optimization</p>
      </div>

      {savedResume && showUpload && (
        <button
          onClick={() => setShowUpload(false)}
          className="text-sm text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-white flex items-center gap-1 transition-colors"
        >
          ← Back to previous resume
        </button>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`card cursor-pointer border-2 border-dashed transition-all ${
          isLoading ? 'opacity-60 cursor-not-allowed' : ''
        } ${
          isDragging
            ? 'border-black dark:border-white bg-gray-50 dark:bg-dark-card'
            : 'border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx"
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center mb-4">
            {isLoading ? (
              <div className="animate-spin">
                <Upload className="w-8 h-8 text-gray-600 dark:text-dark-text-secondary" />
              </div>
            ) : (
              <Upload className="w-8 h-8 text-gray-600 dark:text-dark-text-secondary" />
            )}
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {isLoading ? 'Processing resume...' : 'Drop your resume here'}
          </h3>
          <p className="text-gray-600 dark:text-dark-text-secondary text-center">
            {isLoading ? 'Extracting text from your file. This may take a moment...' : 'or click to browse. Supports PDF, DOCX, DOC'}
          </p>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-2">
            Max file size: 10MB
          </p>
        </div>
      </div>

      {error && (
        <div className="flex gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Supported Formats</h4>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">PDF, Word Documents</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
            <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Quick Upload</h4>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Drag or click</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Privacy First</h4>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Data stays secure</p>
          </div>
        </div>
      </div>
    </div>
  )
}
