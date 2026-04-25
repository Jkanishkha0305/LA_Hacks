"use client"

import { forwardRef } from "react"
import type { Timestamp } from "@/app/types"

interface VideoPlayerProps {
  url: string
  timestamps: Timestamp[]
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ url, timestamps }, ref) => {
  return (
    <div className="aspect-video overflow-hidden bg-deck-bg">
      <video 
        ref={ref} 
        src={url} 
        className="w-full h-full" 
        controls 
        preload="metadata"
        onLoadedMetadata={(e) => {
          // Ensure video starts from beginning
          const video = e.target as HTMLVideoElement;
          video.currentTime = 0;
        }}
      />
    </div>
  )
})

VideoPlayer.displayName = "VideoPlayer"

export default VideoPlayer
