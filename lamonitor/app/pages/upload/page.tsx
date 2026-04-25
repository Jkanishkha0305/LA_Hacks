"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Save } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import VideoPlayer from "@/components/video-player"
import TimestampList from "@/components/timestamp-list"
import type { Timestamp } from "@/app/types"
import { detectEvents, type VideoEvent } from "./actions"
import Link from "next/link"

interface SavedVideo {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  timestamps: Timestamp[]
}

export default function UploadPage() {
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [timestamps, setTimestamps] = useState<Timestamp[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoName, setVideoName] = useState("")
  const [saveConfirm, setSaveConfirm] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const captureFrame = async (video: HTMLVideoElement, time: number): Promise<string | null> => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Failed to get canvas context');
      return null;
    }

    try {
      video.currentTime = time;
    } catch (error) {
      console.error('Error setting video time:', error);
      return null;
    }
    
    // Wait for video to seek to the specified time
    await new Promise((resolve) => {
      video.onseeked = resolve;
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleFileUpload = async (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setTimestamps([])

    try {

      const localUrl = URL.createObjectURL(file)
      setVideoUrl(localUrl)
      setVideoName(file.name)

      // Wait for video element to be available
      while (!videoRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Set the source and wait for video to load
      const video = videoRef.current
      video.src = localUrl

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for video metadata'))
        }, 10000)

        const handleLoad = () => {
          clearTimeout(timeout)
          resolve(true)
        }

        const handleError = () => {
          clearTimeout(timeout)
          reject(new Error('Failed to load video: ' + video.error?.message))
        }

        video.addEventListener('loadeddata', handleLoad)
        video.addEventListener('error', handleError)

        if (video.readyState >= 2) {
          handleLoad()
        }

        return () => {
          video.removeEventListener('loadeddata', handleLoad)
          video.removeEventListener('error', handleError)
        }
      })
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setIsUploading(false)
      setUploadProgress(100)

      // Start analysis
      setIsAnalyzing(true)
      const duration = video.duration
      
      if (!duration || duration === Infinity || isNaN(duration)) {
        throw new Error('Invalid video duration')
      }

      console.log('Video duration:', duration)
      const interval = 3 // Analyze one frame every 3 seconds
      const totalFrames = Math.floor(duration / interval)
      const newTimestamps: Timestamp[] = []

      // Process frames at regular intervals
      for (let time = 0; time < duration; time += interval) {
        const progress = Math.floor((time / duration) * 100)
        setUploadProgress(progress)
        console.log(`Analyzing frame at ${time}s (${progress}%)...`)

        const frame = await captureFrame(video, time)
        if (frame) {
          try {
            const result = await detectEvents(frame)
            console.log('Frame analysis result:', result)
            if (result.events && result.events.length > 0) {
              result.events.forEach((event: VideoEvent) => {
                const minutes = Math.floor(time / 60)
                const seconds = Math.floor(time % 60)
                newTimestamps.push({
                  timestamp: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
                  description: event.description,
                  isDangerous: event.isDangerous
                })
              })
            }
          } catch (error) {
            console.error('Error analyzing frame:', error)
          }
        }
      }

      console.log('Analysis complete, found timestamps:', newTimestamps)
      setTimestamps(newTimestamps)
      setIsAnalyzing(false)
      setUploadProgress(100)
    } catch (error) {
      console.error("Error uploading/analyzing video:", error)
      setIsUploading(false)
      setIsAnalyzing(false)
    }
  }

  const handleTimestampClick = (timestamp: string) => {
    if (!videoRef.current) return

    const [minutes, seconds] = timestamp.split(":").map(Number)
    const timeInSeconds = minutes * 60 + seconds
    videoRef.current.currentTime = timeInSeconds
    videoRef.current.play()
  }

  const handleSaveVideo = () => {
    if (!videoUrl || !videoName) return

    const savedVideos: SavedVideo[] = JSON.parse(localStorage.getItem("savedVideos") || "[]")
    const newVideo: SavedVideo = {
      id: Date.now().toString(),
      name: videoName,
      url: videoUrl,
      thumbnailUrl: videoUrl, 
      timestamps: timestamps,
    }
    savedVideos.push(newVideo)
    localStorage.setItem("savedVideos", JSON.stringify(savedVideos))
    setSaveConfirm(true)
    setTimeout(() => setSaveConfirm(false), 3000)
  }

  return (
    <div className="relative mx-auto max-w-[1600px] px-6 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
            <span className="h-px w-8 bg-deck-signal" />
            <span className="text-deck-signal">/pages/upload — deck/01</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold uppercase tracking-tight text-deck-fg">
            VIDEO <span className="text-deck-signal">·</span> UPLOAD ANALYZER
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13px] font-medium text-deck-dim">
            Upload a video file for frame-by-frame VLM analysis. Key moments
            and hazards are timestamped and logged automatically.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/pages/saved-videos" className="deck-btn">
            // VIEW LIBRARY
          </Link>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Upload zone */}
        {!videoUrl && (
          <div className="deck-panel">
            <label
              htmlFor="video-upload"
              className="flex flex-col items-center justify-center w-full py-12 cursor-pointer border-2 border-dashed border-deck-line hover:border-deck-signal/50 transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('border-deck-signal');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-deck-signal');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-deck-signal');
                
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('video/')) {
                  const input = document.getElementById('video-upload') as HTMLInputElement;
                  if (input) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                    handleFileUpload({ target: { files: dataTransfer.files } } as any);
                  }
                }
              }}
            >
              <Upload className="h-6 w-6 mb-3 text-deck-signal" />
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-deck-dim">
                <span className="text-deck-signal">Click to upload</span> or drag and drop
              </p>
              <p className="mt-1 text-[11px] text-deck-faint">
                MP4, WEBM, MOV — analyzed at 3s intervals
              </p>
            </label>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading || isAnalyzing}
            />
          </div>
        )}

        {/* Progress bar */}
        {(isUploading || isAnalyzing) && (
          <div className="deck-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                <span className="deck-dot text-deck-signal deck-blink" />
                <span className="text-deck-signal">
                  {isUploading ? 'LOADING VIDEO' : 'ANALYZING FRAMES'}
                </span>
              </div>
              <span className="deck-num text-[12px] font-bold tabular-nums text-deck-fg">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-deck-elev overflow-hidden">
              <div
                className="h-full bg-deck-signal transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Video + Analysis */}
        {videoUrl && (
          <div className="space-y-6">
            <div className="deck-panel overflow-hidden">
              <VideoPlayer url={videoUrl} timestamps={timestamps} ref={videoRef} />
            </div>

            <TimestampList timestamps={timestamps} onTimestampClick={handleTimestampClick} />

            {/* Save section */}
            <div className="deck-panel p-5">
              <div className="deck-label-hi mb-3">SAVE SESSION</div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="› enter video name"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  className="deck-input flex-1"
                />
                <button onClick={handleSaveVideo} disabled={!videoName} className="deck-btn deck-btn--primary">
                  ▸ SAVE
                </button>
              </div>
              {saveConfirm && (
                <div className="mt-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-deck-ok">
                  <span className="deck-dot" />
                  SESSION SAVED TO LIBRARY
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
