"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SavedVideo {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  timestamps: { timestamp: string; description: string }[]
}

export default function SavedVideosPage() {
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredVideos, setFilteredVideos] = useState<SavedVideo[]>([])

  useEffect(() => {
    const videos = JSON.parse(localStorage.getItem("savedVideos") || "[]")
    setSavedVideos(videos)
    setFilteredVideos(videos)
  }, [])

  useEffect(() => {
    const filtered = savedVideos.filter(
      (video) =>
        video.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.timestamps.some((timestamp) => timestamp.description.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    setFilteredVideos(filtered)
  }, [searchTerm, savedVideos])

  const handleDelete = (id: string) => {
    const updatedVideos = savedVideos.filter((video) => video.id !== id)
    setSavedVideos(updatedVideos)
    localStorage.setItem("savedVideos", JSON.stringify(updatedVideos))
  }

  return (
    <div className="relative mx-auto max-w-[1600px] px-6 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
            <span className="h-px w-8 bg-deck-signal" />
            <span className="text-deck-signal">/pages/library — deck/01</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold uppercase tracking-tight text-deck-fg">
            VIDEO <span className="text-deck-signal">·</span> LIBRARY
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13px] font-medium text-deck-dim">
            Browse and manage previously analyzed video sessions with their
            detected key moments and timestamps.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/pages/upload" className="deck-btn deck-btn--primary">
            ▸ NEW UPLOAD
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-deck-faint" size={16} />
        <input
          type="text"
          placeholder="› search videos…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="deck-input w-full pl-10"
        />
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            className="group deck-panel overflow-hidden transition-all duration-200 hover:border-deck-linehi"
          >
            <div className="relative aspect-video deck-scanlines bg-deck-bg">
              <div className="absolute left-2 top-2 z-10 flex items-center gap-2 bg-deck-bg/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-deck-signal">
                <span className="deck-dot" />
                RECORDED
              </div>
              <video
                src={video.url}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 border-t border-deck-line">
              <h2 className="text-sm font-bold uppercase tracking-tight text-deck-fg">{video.name}</h2>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
                {video.timestamps.length} moments detected
              </div>
              <div className="mt-3 flex justify-between items-center">
                <Link
                  href={`/pages/video/${video.id}`}
                  className="deck-btn deck-btn--ghost text-[11px]"
                >
                  ▸ VIEW ANALYSIS
                </Link>
                <button
                  onClick={() => handleDelete(video.id)}
                  className="text-deck-faint hover:text-deck-alert transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="mt-12 text-center text-[12px] font-bold text-deck-dim">
          // {searchTerm ? 'no videos match your search' : 'no saved videos — analyze a stream or upload a video first'}
        </div>
      )}
    </div>
  )
}
