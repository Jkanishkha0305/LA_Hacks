"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, StopCircle, PlayCircle, Save, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TimestampList from "@/components/timestamp-list"
import ChatInterface from "@/components/chat-interface"
import { Timeline } from "../../components/Timeline"
import type { Timestamp } from "@/app/types"
import { detectEvents, type VideoEvent } from "./actions"

// Dynamically import TensorFlow.js and models
import type * as blazeface from '@tensorflow-models/blazeface'
import type * as posedetection from '@tensorflow-models/pose-detection'
import type * as tf from '@tensorflow/tfjs'

let tfjs: typeof tf
let blazefaceModel: typeof blazeface
let poseDetection: typeof posedetection

interface SavedVideo {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  timestamps: Timestamp[]
}

interface Keypoint {
  x: number
  y: number
  score?: number
  name?: string
}

interface FacePrediction {
  topLeft: [number, number] | tf.Tensor1D
  bottomRight: [number, number] | tf.Tensor1D
  landmarks?: Array<[number, number]> | tf.Tensor2D
  probability: number | tf.Tensor1D
}

export default function Page() {
  // States
  const [isRecording, setIsRecording] = useState(false)
  const [timestamps, setTimestamps] = useState<Timestamp[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [initializationProgress, setInitializationProgress] = useState<string>('')
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [videoName, setVideoName] = useState('')
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const [mlModelsReady, setMlModelsReady] = useState(false)
  const [lastPoseKeypoints, setLastPoseKeypoints] = useState<Keypoint[]>([])
  const [isClient, setIsClient] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const detectionFrameRef = useRef<number | null>(null)
  const lastDetectionTime = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(performance.now())
  const startTimeRef = useRef<Date | null>(null)
  const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null)
  const poseModelRef = useRef<posedetection.PoseDetector | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const isRecordingRef = useRef<boolean>(false)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previewFrameRef = useRef<number | null>(null)

  // -----------------------------
  // 1) Initialize ML Models
  // -----------------------------
  const initMLModels = async () => {
    try {
      setIsInitializing(true)
      setMlModelsReady(false)
      setError(null)

      // Start loading TensorFlow.js in parallel with other initialization
      setInitializationProgress('Loading TensorFlow.js...')
      const tfPromise = import('@tensorflow/tfjs').then(async (tf) => {
        tfjs = tf
        // Configure TF.js for better performance
        await tf.ready()
        await tf.setBackend('webgl')
        await tf.env().set('WEBGL_FORCE_F16_TEXTURES', true) // Use F16 textures for better performance
        await tf.env().set('WEBGL_PACK', true) // Enable texture packing
        await tf.env().set('WEBGL_CHECK_NUMERICAL_PROBLEMS', false) // Disable numerical checks in production
      })

      // Load models in parallel
      setInitializationProgress('Loading face and pose detection models...')
      const [blazefaceModule, poseDetectionModule] = await Promise.all([
        import('@tensorflow-models/blazeface'),
        import('@tensorflow-models/pose-detection')
      ])

      blazefaceModel = blazefaceModule
      poseDetection = poseDetectionModule

      // Wait for TF.js to be ready
      await tfPromise

      // Load models in parallel
      setInitializationProgress('Initializing models...')
      const [faceModel, poseModel] = await Promise.all([
        blazefaceModel.load({
          maxFaces: 1, // Limit to 1 face for better performance
          scoreThreshold: 0.5 // Increase threshold for better performance
        }),
        poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.3
          }
        )
      ])

      faceModelRef.current = faceModel
      poseModelRef.current = poseModel

      setMlModelsReady(true)
      setIsInitializing(false)
      console.log('All ML models loaded successfully')
    } catch (err) {
      console.error('Error loading ML models:', err)
      setError('Failed to load ML models: ' + (err as Error).message)
      setMlModelsReady(false)
      setIsInitializing(false)
    }
  }

  // Helper to set canvas dimensions
  const updateCanvasSize = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = 640 // fixed width
    canvas.height = 360 // fixed height (16:9)
  }

  const stopPreviewLoop = () => {
    if (previewFrameRef.current) {
      cancelAnimationFrame(previewFrameRef.current)
      previewFrameRef.current = null
    }
  }

  const startPreviewLoop = () => {
    stopPreviewLoop()

    const drawPreview = () => {
      if (!isRecordingRef.current) {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            drawVideoToCanvas(video, canvas, ctx)
          }
        }
      }
      previewFrameRef.current = requestAnimationFrame(drawPreview)
    }

    previewFrameRef.current = requestAnimationFrame(drawPreview)
  }

  // -----------------------------
  // 2) Set up the webcam
  // -----------------------------
  const startWebcam = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Webcam capture isn't supported in this environment. Try a secure browser tab with camera access enabled.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 640 },
          height: { ideal: 360, max: 360 },
          frameRate: { ideal: 30 },
          facingMode: "user"
        },
        audio: true
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        mediaStreamRef.current = stream

        // Wait for video metadata so we can set the canvas size
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            updateCanvasSize()
            videoRef.current?.play().catch(() => undefined)
            startPreviewLoop()
            resolve()
          }
        })
      }
    } catch (error) {
      console.error("Error accessing webcam:", error)
      setError(
        "Failed to access webcam. Please make sure you have granted camera permissions."
      )
    }
  }

  const stopWebcam = () => {
    stopPreviewLoop()
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
  }

  // -----------------------------
  // 3) Speech Recognition
  // -----------------------------
  const initSpeechRecognition = () => {
    if (typeof window === "undefined") return
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + " " + finalTranscript)
        }
      }

      recognitionRef.current = recognition
    } else {
      console.warn("Speech recognition not supported in this browser.")
    }
  }

  // -----------------------------
  // 4) TensorFlow detection loop
  // -----------------------------
  const runDetection = async () => {
    if (!isRecordingRef.current) return

    // Throttle detection to ~10 FPS (every 100ms)
    const now = performance.now()
    if (now - lastDetectionTime.current < 100) {
      detectionFrameRef.current = requestAnimationFrame(runDetection)
      return
    }
    lastDetectionTime.current = now

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      detectionFrameRef.current = requestAnimationFrame(runDetection)
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      detectionFrameRef.current = requestAnimationFrame(runDetection)
      return
    }

    // Clear canvas and draw current video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawVideoToCanvas(video, canvas, ctx)

    // Scale for drawing predictions
    const scaleX = canvas.width / video.videoWidth
    const scaleY = canvas.height / video.videoHeight

    // Face detection
    if (faceModelRef.current) {
      try {
        const predictions = await faceModelRef.current.estimateFaces(video, false)
        predictions.forEach((prediction: blazeface.NormalizedFace) => {
          const start = prediction.topLeft as [number, number]
          const end = prediction.bottomRight as [number, number]
          const size = [end[0] - start[0], end[1] - start[1]]

          const scaledStart = [start[0] * scaleX, start[1] * scaleY]
          const scaledSize = [size[0] * scaleX, size[1] * scaleY]

          // Draw bounding box
          ctx.strokeStyle = "rgba(0, 255, 0, 0.8)"
          ctx.lineWidth = 2
          ctx.strokeRect(
            scaledStart[0],
            scaledStart[1],
            scaledSize[0],
            scaledSize[1]
          )

          // Draw confidence
          const confidence = Math.round((prediction.probability as number) * 100)
          ctx.fillStyle = "white"
          ctx.font = "16px Arial"
          ctx.fillText(`${confidence}%`, scaledStart[0], scaledStart[1] - 5)
        })
      } catch (err) {
        console.error("Face detection error:", err)
      }
    }

    // Pose detection
    if (poseModelRef.current) {
      try {
        const poses = await poseModelRef.current.estimatePoses(video)
        if (poses.length > 0) {
          const keypoints = poses[0].keypoints
          // Convert TF keypoints to our Keypoint type
          const convertedKeypoints: Keypoint[] = keypoints.map(kp => ({
            x: kp.x,
            y: kp.y,
            score: kp.score ?? 0, // Use 0 as default if score is undefined
            name: kp.name
          }))
          setLastPoseKeypoints(convertedKeypoints)

          keypoints.forEach((keypoint) => {
            // Use nullish coalescing to provide a default value of 0
            if ((keypoint.score ?? 0) > 0.3) {
              const x = keypoint.x * scaleX
              const y = keypoint.y * scaleY

              // Draw keypoint
              ctx.beginPath()
              ctx.arc(x, y, 4, 0, 2 * Math.PI)
              ctx.fillStyle = "rgba(108, 138, 78, 0.9)"
              ctx.fill()

              // Outer circle
              ctx.beginPath()
              ctx.arc(x, y, 6, 0, 2 * Math.PI)
              ctx.strokeStyle = "white"
              ctx.lineWidth = 1.5
              ctx.stroke()

              // Label (if available)
              // Use nullish coalescing to provide a default value of 0
              if ((keypoint.score ?? 0) > 0.5 && keypoint.name) {
                ctx.fillStyle = "white"
                ctx.font = "12px Arial"
                ctx.fillText(`${keypoint.name}`, x + 8, y)
              }
            }
          })
        }
      } catch (err) {
        console.error("Pose detection error:", err)
      }
    }

    // (Optional) Compute FPS
    lastFrameTimeRef.current = performance.now()

    detectionFrameRef.current = requestAnimationFrame(runDetection)
  }

  // Helper: Draw video to canvas (maintaining aspect ratio)
  function drawVideoToCanvas(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    const videoAspect = video.videoWidth / video.videoHeight
    const canvasAspect = canvas.width / canvas.height

    let drawWidth = canvas.width
    let drawHeight = canvas.height
    let offsetX = 0
    let offsetY = 0

    if (videoAspect > canvasAspect) {
      drawHeight = canvas.width / videoAspect
      offsetY = (canvas.height - drawHeight) / 2
    } else {
      drawWidth = canvas.height * videoAspect
      offsetX = (canvas.width - drawWidth) / 2
    }

    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)
  }

  // -----------------------------
  // 5) Analyze frame via API (and send email if dangerous)
  // -----------------------------
  const analyzeFrame = async () => {
    if (!isRecordingRef.current) return

    const currentTranscript = transcript.trim()
    const currentPoseKeypoints = [...lastPoseKeypoints]

    try {
      const frame = await captureFrame()
      if (!frame) return

      if (!frame.startsWith("data:image/jpeg")) {
        console.error("Invalid frame format")
        return
      }

      const result = await detectEvents(frame, currentTranscript)
      if (!isRecordingRef.current) return

      if (result.events && result.events.length > 0) {
        result.events.forEach(async (event: VideoEvent) => {
          const newTimestamp = {
            timestamp: getElapsedTime(),
            description: event.description,
            isDangerous: event.isDangerous
          }
          setTimestamps((prev) => [...prev, newTimestamp])

          // For dangerous events, send an email notification
          if (event.isDangerous) {
            try {
              const emailPayload = {
                title: "Dangerous Activity Detected",
                description: `At ${newTimestamp.timestamp}, the following dangerous activity was detected: ${event.description}`
              }
              const response = await fetch("/api/send-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json"
                },
                body: JSON.stringify(emailPayload)
              })
              
              // Check if response is ok before trying to parse JSON
              if (!response.ok) {
                if (response.status === 401) {
                  setError(
                    "Please sign in to receive email notifications for dangerous events."
                  )
                } else if (response.status === 500) {
                  setError(
                    "Email service not properly configured. Please contact support."
                  )
                } else {
                  const errorText = await response.text()
                  console.error("Failed to send email notification:", errorText)
                  setError(
                    `Failed to send email notification. Please try again later.`
                  )
                }
                return
              }
              
              // Only try to parse JSON for successful responses
              const resData = await response.json()
              console.log("Email notification sent successfully:", resData)
            } catch (error) {
              console.error("Error sending email notification:", error)
            }
          }
        })
      }
    } catch (error) {
      console.error("Error analyzing frame:", error)
      setError("Error analyzing frame. Please try again.")
      if (isRecordingRef.current) {
        stopRecording()
      }
    }
  }

  // -----------------------------
  // 6) Capture current video frame (for analysis)
  // -----------------------------
  const captureFrame = async (): Promise<string | null> => {
    if (!videoRef.current) return null

    const video = videoRef.current
    const tempCanvas = document.createElement("canvas")
    const width = 640
    const height = 360
    tempCanvas.width = width
    tempCanvas.height = height

    const context = tempCanvas.getContext("2d")
    if (!context) return null

    try {
      context.drawImage(video, 0, 0, width, height)
      const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.8)
      return dataUrl
    } catch (error) {
      console.error("Error capturing frame:", error)
      return null
    }
  }

  // -----------------------------
  // 7) Get elapsed time string
  // -----------------------------
  const getElapsedTime = () => {
    if (!startTimeRef.current) return "00:00"
    const elapsed = Math.floor(
      (Date.now() - startTimeRef.current.getTime()) / 1000
    )
    // Update current time for timeline
    setCurrentTime(elapsed)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  // -----------------------------
  // 8) Recording control (start/stop)
  // -----------------------------
  const startRecording = () => {
    setCurrentTime(0)
    setVideoDuration(0)
    if (!mlModelsReady) {
      setError("ML models not ready. Please wait for initialization.")
      return
    }
    if (!mediaStreamRef.current) return

    setError(null)
    setTimestamps([])
    setAnalysisProgress(0)

    startTimeRef.current = new Date()
    isRecordingRef.current = true
    setIsRecording(true)
    stopPreviewLoop()
    // Start tracking video duration
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
    }
    durationIntervalRef.current = setInterval(() => {
      if (isRecordingRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000)
        setVideoDuration(elapsed)
      }
    }, 1000)

    // Start speech recognition
    if (recognitionRef.current) {
      setTranscript("")
      setIsTranscribing(true)
      recognitionRef.current.start()
    }

    // Start video recording using MediaRecorder with MP4 container
    recordedChunksRef.current = []
    const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: "video/mp4"
    })

    // Set up data handling before starting
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/mp4" })
      const url = URL.createObjectURL(blob)
      setRecordedVideoUrl(url)
      setVideoName("stream.mp4")
    }

    mediaRecorderRef.current = mediaRecorder
    // Start recording with a timeslice of 1000ms (1 second)
    mediaRecorder.start(1000)

    // Start the TensorFlow detection loop
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current)
    }
    lastDetectionTime.current = 0
    detectionFrameRef.current = requestAnimationFrame(runDetection)

    // Set up repeated frame analysis every 3 seconds
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
    }
    analyzeFrame() // first immediate call
    analysisIntervalRef.current = setInterval(analyzeFrame, 3000)
  }

  const stopRecording = () => {
    startTimeRef.current = null
    isRecordingRef.current = false
    setIsRecording(false)

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsTranscribing(false)
    }

    // Stop MediaRecorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    // Stop detection loop and analysis interval
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current)
      detectionFrameRef.current = null
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
      analysisIntervalRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    if (mediaStreamRef.current) {
      startPreviewLoop()
    }
  }

  // -----------------------------
  // 9) Save video functionality
  // -----------------------------
  const handleSaveVideo = () => {
    if (!recordedVideoUrl || !videoName) return

    try {
      const savedVideos: SavedVideo[] = JSON.parse(
        localStorage.getItem("savedVideos") || "[]"
      )
      const newVideo: SavedVideo = {
        id: Date.now().toString(),
        name: videoName,
        url: recordedVideoUrl,
        thumbnailUrl: recordedVideoUrl,
        timestamps: timestamps
      }
      savedVideos.push(newVideo)
      localStorage.setItem("savedVideos", JSON.stringify(savedVideos))
      alert("Video saved successfully!")
    } catch (error) {
      console.error("Error saving video:", error)
      alert("Failed to save video. Please try again.")
    }
  }

  // -----------------------------
  // 10) useEffect hooks
  // -----------------------------
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Update current time and duration
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration || 60)
      // Reset playback position to start
      video.currentTime = 0
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    // Reset playback position when video source changes
    video.currentTime = 0

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [recordedVideoUrl])

  useEffect(() => {
    initSpeechRecognition()
    const init = async () => {
      await startWebcam()
      await initMLModels()
    }
    init()

    return () => {
      stopWebcam()
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current)
      if (detectionFrameRef.current) cancelAnimationFrame(detectionFrameRef.current)
    }
  }, [])

  // -----------------------------
  // Render
  // -----------------------------
  const dangerCount = timestamps.filter(t => t.isDangerous).length
  const safeCount = timestamps.length - dangerCount

  return (
    <div className="relative mx-auto max-w-[1600px] px-6 py-8">
      {/* Page header bar */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
            <span className="h-px w-8 bg-deck-signal" />
            <span className="text-deck-signal">/pages/realtime — deck/01</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold uppercase tracking-tight text-deck-fg">
            REALTIME <span className="text-deck-signal">·</span> STREAM ANALYZER
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13px] font-medium text-deck-dim">
            Browser webcam capture with TensorFlow.js pose detection, per-frame
            VLM analysis, and timestamped key-moment detection. All on-device.
          </p>
        </div>
        <div className="hidden flex-col items-end gap-1.5 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim md:flex">
          <div className="flex items-center gap-2">
            <span className={`deck-dot ${isRecording ? 'text-deck-alert deck-blink' : 'text-deck-signal'}`} />
            <span className={isRecording ? 'text-deck-alert' : 'text-deck-signal'}>
              {isRecording ? 'REC ACTIVE' : mlModelsReady ? 'MODELS READY' : 'INITIALIZING'}
            </span>
          </div>
          {isRecording && (
            <div className="deck-num tabular-nums text-deck-fg text-[13px]">
              {String(Math.floor(videoDuration / 60)).padStart(2, '0')}:
              {String(videoDuration % 60).padStart(2, '0')}
            </div>
          )}
          <div className="deck-num tabular-nums">
            [{String(timestamps.length).padStart(3, '0')} EVENTS]
          </div>
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* -------- LEFT: video + controls -------- */}
        <section className="space-y-6">
          {/* Video container */}
          <div className="deck-panel relative deck-scanlines overflow-hidden">
            {isInitializing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-deck-bg/90">
                <div className="flex items-center gap-2 text-[12px] font-bold text-deck-signal">
                  <span className="deck-dot deck-blink" />
                  {initializationProgress || 'initializing models…'}
                </div>
                <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
                  // tensorflow.js + blazeface + movenet
                </div>
              </div>
            )}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 bg-deck-bg/80 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-signal">
              <span className={`deck-dot ${isRecording ? 'deck-blink' : ''}`} />
              {isRecording ? 'LIVE · WEBCAM' : 'PREVIEW'}
            </div>
            {isRecording && (
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2 bg-deck-bg/80 px-2.5 py-1.5">
                <span className="deck-num text-[12px] font-bold tabular-nums text-deck-fg">
                  {String(Math.floor(videoDuration / 60)).padStart(2, '0')}:
                  {String(videoDuration % 60).padStart(2, '0')}
                </span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 bg-deck-bg/80 px-2.5 py-1.5">
              {isRecording && <span className="deck-label text-deck-alert">▲ REC</span>}
              {!isRecording && <span className="deck-label text-deck-dim">▣ IDLE</span>}
            </div>
            <div className="absolute bottom-3 right-3 z-10 deck-num text-[11px] font-bold text-deck-dim bg-deck-bg/80 px-2.5 py-1.5">
              TFJS · WEBGL
            </div>
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              {isClient && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={640}
                  height={360}
                  className="absolute inset-0 w-full h-full object-cover opacity-0"
                />
              )}
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>

          {error && !isInitializing && (
            <div className="border-l-2 border-deck-alert bg-deck-alert/10 px-4 py-3 text-[12px] font-bold text-deck-alert">
              err · {error}
            </div>
          )}

          {/* Controls */}
          <div className="deck-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {isInitializing ? (
                <button disabled className="deck-btn opacity-50 cursor-not-allowed">
                  ▸ INITIALIZING MODELS…
                </button>
              ) : !isRecording ? (
                <button onClick={startRecording} className="deck-btn deck-btn--primary">
                  ▶ START ANALYSIS
                </button>
              ) : (
                <button onClick={stopRecording} className="deck-btn" style={{ borderColor: 'rgb(var(--alert))', color: 'rgb(var(--alert))' }}>
                  ■ STOP ANALYSIS
                </button>
              )}
              <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
                <span>MODEL · GEMMA-4-26B-A4B</span>
                <span className="deck-num tabular-nums">
                  {isRecording ? 'ANALYZING · 3s INTERVAL' : 'IDLE'}
                </span>
              </div>
            </div>
            {isRecording && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                  <span className="deck-dot text-deck-alert deck-blink" />
                  <span className="text-deck-alert">recording and analyzing</span>
                </div>
                <div className="deck-divider-dash flex-1" />
                <div className="deck-num text-[11px] font-bold tabular-nums text-deck-dim">
                  {timestamps.length} events detected
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="deck-panel p-5">
            <div className="deck-label-hi mb-3">KEY MOMENTS TIMELINE</div>
            {timestamps.length > 0 ? (
              <Timeline
                events={timestamps.map(ts => {
                  const [minutes, seconds] = ts.timestamp.split(':').map(Number);
                  const timeInSeconds = minutes * 60 + seconds;
                  return {
                    startTime: timeInSeconds,
                    endTime: timeInSeconds + 3,
                    type: ts.isDangerous ? 'warning' : 'normal',
                    label: ts.description
                  };
                })}
                totalDuration={videoDuration || 60}
                currentTime={currentTime}
              />
            ) : (
              <div className="text-[12px] font-bold text-deck-dim">
                // {isRecording ? 'awaiting events…' : 'start analysis to detect events'}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="deck-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="deck-label-hi">AUDIO TRANSCRIPT</div>
              {isTranscribing && (
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-ok">
                  <span className="deck-dot deck-blink" />
                  TRANSCRIBING
                </div>
              )}
            </div>
            <div className="min-h-[60px] text-[13px] font-medium leading-relaxed text-deck-fg/80">
              {transcript ? (
                <p className="whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-deck-faint">
                  // {isRecording ? 'awaiting speech…' : 'start recording to capture audio'}
                </p>
              )}
            </div>
          </div>

          {/* Save section */}
          {isClient && !isRecording && recordedVideoUrl && (
            <div className="deck-panel p-5">
              <div className="deck-label-hi mb-3">SAVE RECORDING</div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="› enter video name"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  className="deck-input flex-1"
                />
                <button
                  onClick={handleSaveVideo}
                  disabled={!videoName}
                  className="deck-btn deck-btn--primary"
                >
                  ▸ SAVE
                </button>
              </div>
            </div>
          )}
        </section>

        {/* -------- RIGHT: detection stream sidebar -------- */}
        <aside className="deck-panel flex flex-col overflow-hidden lg:max-h-[calc(100vh-12rem)]">
          <div className="flex items-center justify-between border-b border-deck-line px-4 py-3">
            <div className="deck-label-hi">DETECTION STREAM</div>
            <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] ${
              dangerCount > 0 ? 'text-deck-alert' : timestamps.length > 0 ? 'text-deck-ok' : 'text-deck-dim'
            }`}>
              <span className="deck-dot" />
              {dangerCount > 0 ? 'HAZARD' : timestamps.length > 0 ? 'NOMINAL' : 'IDLE'}
            </div>
          </div>

          {/* Stats strip */}
          {timestamps.length > 0 && (
            <div className="flex items-center justify-around border-b border-deck-line px-4 py-2.5">
              <div className="text-center">
                <div className="deck-num text-lg font-extrabold text-deck-fg">{timestamps.length}</div>
                <div className="deck-label mt-0.5">TOTAL</div>
              </div>
              <div className="w-px h-6 bg-deck-line" />
              <div className="text-center">
                <div className="deck-num text-lg font-extrabold text-deck-alert">{dangerCount}</div>
                <div className="deck-label mt-0.5">HAZARD</div>
              </div>
              <div className="w-px h-6 bg-deck-line" />
              <div className="text-center">
                <div className="deck-num text-lg font-extrabold text-deck-ok">{safeCount}</div>
                <div className="deck-label mt-0.5">SAFE</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {timestamps.length === 0 && !isRecording && (
              <div className="p-4 text-[12px] font-bold text-deck-dim">
                // stream idle — run analysis to populate
              </div>
            )}
            {timestamps.length === 0 && isRecording && (
              <div className="flex items-center gap-2 p-4 text-[12px] font-bold text-deck-signal">
                <span className="deck-dot deck-blink" />
                awaiting detections…
              </div>
            )}
            <ul>
              {[...timestamps].reverse().map((ts, idx) => (
                <li
                  key={`${ts.timestamp}-${idx}`}
                  className={`border-l-2 px-4 py-3 ${
                    ts.isDangerous
                      ? 'border-deck-alert bg-deck-alert/10'
                      : 'border-deck-line'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em]">
                    <span className={ts.isDangerous ? 'text-deck-alert' : 'text-deck-dim'}>
                      {ts.isDangerous ? '▲ HAZARD' : '■ OBSERVATION'}
                    </span>
                    <span className="deck-num text-deck-faint">
                      {String(timestamps.length - idx).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="deck-num mt-2 text-[12px] font-bold tabular-nums text-deck-signal">
                    T{ts.timestamp}
                  </div>
                  <div className="mt-1.5 text-[13px] font-medium leading-snug text-deck-fg">
                    {ts.description}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <ChatInterface />
    </div>
  )
}
