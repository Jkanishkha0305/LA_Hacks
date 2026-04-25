"use client"

import { useState, useEffect } from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Download } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  LineController,
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineController
)

interface KeyMoment {
  videoName: string
  timestamp: string
  description: string
  isDangerous: boolean
}

export default function StatisticsPage() {
  const exportToCSV = () => {
    // Convert keyMoments to CSV format
    const csvContent = [
      // Header row
      ['Video Name', 'Timestamp', 'Description', 'Is Dangerous'].join(','),
      // Data rows
      ...keyMoments.map(moment => [
        moment.videoName,
        moment.timestamp,
        `"${moment.description}"`, // Wrap description in quotes to handle commas
        moment.isDangerous
      ].join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `safety-statistics-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([])
  const [summary, setSummary] = useState<string>('')
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [chartData, setChartData] = useState<{
    dangerousMomentsByVideo: any;
    dangerTypeDistribution: any;
    dangerTrend: any;
  }>({
    dangerousMomentsByVideo: null,
    dangerTypeDistribution: null,
    dangerTrend: null,
  })

  useEffect(() => {
    const savedVideos = JSON.parse(localStorage.getItem("savedVideos") || "[]")
    const moments: KeyMoment[] = savedVideos.flatMap((video: any) =>
      video.timestamps.map((ts: any) => ({
        videoName: video.name,
        timestamp: ts.timestamp,
        description: ts.description,
        isDangerous: ts.isDangerous || false,
      }))
    )
    setKeyMoments(moments)

    // Generate summary using API route
    const fetchSummary = async () => {
      setIsLoadingSummary(true)
      try {
        const response = await fetch('/api/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keyMoments: moments })
        })
        
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }
        setSummary(data.summary)
      } catch (error: any) {
        console.error('Error fetching summary:', error)
        const errorMessage = error?.message || 'Unable to generate summary at this time.'
        setSummary(`Error: ${errorMessage}`)
        if (error?.details) {
          console.error('Error details:', error.details)
        }
      } finally {
        setIsLoadingSummary(false)
      }
    }

    if (moments.length > 0) {
      fetchSummary()
    }

    // Filter dangerous moments using the isDangerous flag
    const dangerousMoments = moments.filter(moment => moment.isDangerous)

    // Count dangerous moments by video
    const dangerousByVideo = dangerousMoments.reduce((acc: { [key: string]: number }, moment) => {
      acc[moment.videoName] = (acc[moment.videoName] || 0) + 1
      return acc
    }, {})

    // Calculate dangerous vs non-dangerous ratio
    const dangerousCount = dangerousMoments.length
    const nonDangerousCount = moments.length - dangerousCount

    // Create time-based trend data (by 15-minute intervals)
    const trendData = dangerousMoments.reduce((acc: { [key: string]: number }, moment) => {
      const [hours, minutes] = moment.timestamp.split(':').map(Number)
      const interval = `${hours.toString().padStart(2, '0')}:${Math.floor(minutes / 15) * 15}`.padEnd(5, '0')
      acc[interval] = (acc[interval] || 0) + 1
      return acc
    }, {})

    setChartData({
      dangerousMomentsByVideo: {
        labels: Object.keys(dangerousByVideo),
        datasets: [
          {
            label: 'Dangerous Moments per Video',
            data: Object.values(dangerousByVideo),
            backgroundColor: 'rgba(255, 184, 28, 0.4)',
            borderColor: 'rgba(255, 184, 28, 1)',
            borderWidth: 1,
          },
        ],
      },
      dangerTypeDistribution: {
        labels: ['Dangerous Moments', 'Non-Dangerous Moments'],
        datasets: [
          {
            label: 'Safety Incident Distribution',
            data: [dangerousCount, nonDangerousCount],
            backgroundColor: [
              'rgba(108, 138, 78, 0.6)',
              'rgba(52, 211, 153, 0.4)',
            ],
            borderColor: [
              'rgba(108, 138, 78, 1)',
              'rgba(52, 211, 153, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      dangerTrend: {
        labels: Object.keys(trendData).sort(),
        datasets: [
          {
            label: 'Dangerous Moments Over Time',
            data: Object.keys(trendData).sort().map(key => trendData[key]),
            backgroundColor: 'rgba(255, 184, 28, 0.15)',
            borderColor: 'rgba(255, 184, 28, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
    })
  }, [])

  const columnHelper = createColumnHelper<KeyMoment>()

  const columns = [
    columnHelper.accessor("videoName", {
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Video Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("timestamp", {
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("description", {
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Description
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => info.getValue(),
    }),
  ]

  const table = useReactTable({
    data: keyMoments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(190,190,196)',
          font: { family: 'JetBrains Mono, monospace', size: 10, weight: 'bold' as const },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgb(120,120,126)', font: { family: 'JetBrains Mono, monospace', size: 10 } },
        grid: { color: 'rgba(52,52,58,0.5)' },
      },
      y: {
        ticks: { color: 'rgb(120,120,126)', font: { family: 'JetBrains Mono, monospace', size: 10 } },
        grid: { color: 'rgba(52,52,58,0.5)' },
        beginAtZero: true,
      },
    },
  }

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgb(190,190,196)',
          font: { family: 'JetBrains Mono, monospace', size: 10, weight: 'bold' as const },
          padding: 12,
        },
      },
      title: { display: false },
    },
  }

  const dangerTotal = keyMoments.filter(m => m.isDangerous).length

  return (
    <div className="relative mx-auto max-w-[1600px] px-6 py-8">
      {/* Page header bar */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim">
            <span className="h-px w-8 bg-deck-signal" />
            <span className="text-deck-signal">/pages/statistics — deck/01</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold uppercase tracking-tight text-deck-fg">
            STATISTICS <span className="text-deck-signal">·</span> ANALYSIS
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13px] font-medium text-deck-dim">
            Historical key-moment charts across all saved video sessions with
            AI-generated summaries and exportable CSV data.
          </p>
        </div>
        <div className="hidden flex-col items-end gap-1.5 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim md:flex">
          <div className="deck-num tabular-nums text-deck-fg text-[13px]">
            {keyMoments.length} KEY MOMENTS
          </div>
          <div className="deck-num tabular-nums">
            {dangerTotal} HAZARDS · {keyMoments.length - dangerTotal} SAFE
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { val: String(keyMoments.length), label: 'TOTAL EVENTS', color: 'text-deck-fg' },
          { val: String(dangerTotal), label: 'HAZARDS', color: 'text-deck-alert' },
          { val: String(keyMoments.length - dangerTotal), label: 'SAFE', color: 'text-deck-ok' },
        ].map(({ val, label, color }) => (
          <div key={label} className="deck-panel p-4">
            <div className={`deck-num text-2xl font-extrabold ${color}`}>{val}</div>
            <div className="deck-label mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="deck-panel p-5">
          <div className="deck-label-hi mb-4">HAZARDS BY VIDEO</div>
          {chartData.dangerousMomentsByVideo && (
            <Bar data={chartData.dangerousMomentsByVideo} options={chartOptions} />
          )}
        </div>
        <div className="deck-panel p-5">
          <div className="deck-label-hi mb-4">INCIDENT DISTRIBUTION</div>
          {chartData.dangerTypeDistribution && (
            <Pie data={chartData.dangerTypeDistribution} options={pieOptions} />
          )}
        </div>
        <div className="deck-panel p-5">
          <div className="deck-label-hi mb-4">DANGER TREND</div>
          {chartData.dangerTrend && (
            <Line data={chartData.dangerTrend} options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: { ...chartOptions.scales.y, title: { display: true, text: 'INCIDENTS', color: 'rgb(120,120,126)', font: { family: 'JetBrains Mono, monospace', size: 9 } } },
                x: { ...chartOptions.scales.x, title: { display: true, text: '15-MIN INTERVALS', color: 'rgb(120,120,126)', font: { family: 'JetBrains Mono, monospace', size: 9 } } },
              },
            }} />
          )}
        </div>
      </div>

      {/* Table header */}
      <div className="flex justify-between items-center mb-4">
        <div className="deck-label-hi">VIDEO KEY MOMENTS</div>
        <button onClick={exportToCSV} className="deck-btn deck-btn--ghost">
          <Download className="h-4 w-4" />
          EXPORT CSV
        </button>
      </div>

      {/* Table */}
      <div className="deck-panel overflow-hidden">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left bg-deck-elev text-[11px] font-bold uppercase tracking-[0.14em] text-deck-dim border-b border-deck-line">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-t border-deck-line hover:bg-deck-elev/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[13px] font-medium text-deck-fg">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-[12px] font-bold text-deck-dim">
                  // no key moments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deck-faint">
        {keyMoments.length} key moments across all saved videos
      </div>

      {/* AI Summary Section */}
      <div className="mt-8 deck-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="deck-label-hi">AI ANALYSIS SUMMARY</div>
          {isLoadingSummary && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-deck-signal">
              <span className="deck-dot deck-blink" />
              GENERATING
            </div>
          )}
        </div>
        {isLoadingSummary ? (
          <div className="py-6 text-center text-[12px] font-bold text-deck-dim">
            // inference in progress…
          </div>
        ) : summary ? (
          <div className="text-[13px] font-medium leading-relaxed text-deck-fg/90 whitespace-pre-line">
            {summary}
          </div>
        ) : (
          <div className="py-4 text-[12px] font-bold text-deck-dim">
            // no data — save video sessions to generate summary
          </div>
        )}
      </div>
    </div>
  )
}
