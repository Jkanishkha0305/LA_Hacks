"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import VideoPlayer from "@/components/video-player"
import TimestampList from "@/components/timestamp-list"
import { Timeline } from "@/app/components/Timeline"
import type { Timestamp } from "@/app/types"

interface SavedVideo {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  timestamps: Timestamp[]
}

export default function VideoPage() {
  const [video, setVideo] = useState<SavedVideo | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const params = useParams()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const savedVideos: SavedVideo[] = JSON.parse(localStorage.getItem("savedVideos") || "[]")
    const foundVideo = savedVideos.find((v) => v.id === params.id)
    console.log('Found video:', foundVideo)
    if (foundVideo) {
      setVideo(foundVideo)
    } else {
      router.push("/saved-videos")
    }
  }, [params.id, router])

  // Track video time and duration
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      console.log('Current time:', video.currentTime)
    }

    const handleLoadedMetadata = () => {
      console.log('Video duration:', video.duration)
      setVideoDuration(video.duration)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    // Initial load if video is already loaded
    if (video.duration) {
      handleLoadedMetadata()
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const handleTimestampClick = (timestamp: string) => {
    if (!videoRef.current) return

    const [minutes, seconds] = timestamp.split(":").map(Number)
    const timeInSeconds = minutes * 60 + seconds
    videoRef.current.currentTime = timeInSeconds
    videoRef.current.play()
  }

  if (!video) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-[12px] font-bold text-deck-dim">
        // loading session…
      </div>
    )
  }

  const dangerCount = video.timestamps.filter(t => t.isDangerous).length

  return (
    <div className="relative mx-auto max-w-[1600px] px-6 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
            <span className="h-px w-8 bg-deck-signal" />
            <span className="text-deck-signal">/pages/video/{params.id} — deck/01</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold uppercase tracking-tight text-deck-fg">
            {video.name}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-deck-dim">
            {video.timestamps.length} key moments · {dangerCount} hazards detected
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/pages/saved-videos" className="deck-btn">
            // BACK TO LIBRARY
          </Link>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        <div className="deck-panel deck-scanlines overflow-hidden">
          <VideoPlayer url={video.url} timestamps={video.timestamps} ref={videoRef} />
        </div>

        {/* Timeline */}
        <div className="deck-panel p-5">
          <div className="deck-label-hi mb-3">KEY MOMENTS TIMELINE</div>
          <Timeline
            events={video.timestamps.map(ts => {
              let timeInSeconds;
              if (typeof ts.timestamp === 'string' && ts.timestamp.includes(':')) {
                const [minutes, seconds] = ts.timestamp.split(':').map(Number);
                timeInSeconds = minutes * 60 + seconds;
              } else {
                timeInSeconds = Number(ts.timestamp);
              }
              return {
                startTime: timeInSeconds,
                endTime: timeInSeconds + 3,
                type: ts.isDangerous ? 'warning' : 'normal',
                label: ts.description
              };
            })}
            totalDuration={videoDuration || 100}
            currentTime={currentTime}
          />
        </div>

        {/* Download */}
        <div className="flex justify-end">
          <button
            onClick={async () => {
              try {
                const a = document.createElement('a')
                a.href = video.url
                const downloadName = video.name.toLowerCase().endsWith('.mp4')
                  ? video.name
                  : `${video.name}.mp4`
                a.download = downloadName
                a.setAttribute('type', 'video/mp4')
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              } catch (error) {
                console.error('Download error:', error)
              }
            }}
            className="deck-btn deck-btn--ghost"
          >
            <Download className="w-4 h-4" />
            DOWNLOAD MP4
          </button>
        </div>

        <TimestampList timestamps={video.timestamps} onTimestampClick={handleTimestampClick} />
      </div>
    </div>
  )
}
