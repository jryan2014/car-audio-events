import * as React from "react"
import { motion } from "framer-motion"
import { Volume2, VolumeX } from "lucide-react"
import { cn } from "../utils"

export interface SPLMeterProps {
  value: number // Current SPL in dB
  max?: number // Maximum value for the meter (default 180)
  min?: number // Minimum value for the meter (default 0)
  peakValue?: number // Peak value achieved
  targetValue?: number // Target SPL to beat
  animated?: boolean
  showDigital?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function SPLMeter({
  value,
  max = 180,
  min = 0,
  peakValue,
  targetValue,
  animated = true,
  showDigital = true,
  className,
  size = "md"
}: SPLMeterProps) {
  const percentage = ((value - min) / (max - min)) * 100
  const peakPercentage = peakValue ? ((peakValue - min) / (max - min)) * 100 : 0
  const targetPercentage = targetValue ? ((targetValue - min) / (max - min)) * 100 : 0

  const sizeClasses = {
    sm: "h-32",
    md: "h-48",
    lg: "h-64"
  }

  const getColor = (val: number) => {
    if (val < 120) return "from-green-400 to-green-600"
    if (val < 140) return "from-yellow-400 to-yellow-600"
    if (val < 160) return "from-orange-400 to-orange-600"
    return "from-red-400 to-red-600"
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Analog Meter */}
      <div className="relative w-full h-full">
        {/* Background Arc */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120">
          <defs>
            <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="33%" stopColor="#eab308" />
              <stop offset="66%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="round"
          />
          
          {/* Value arc */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#meterGradient)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
            transition={{ duration: animated ? 0.5 : 0, ease: "easeOut" }}
          />
          
          {/* Target line */}
          {targetValue && (
            <line
              x1={20 + (160 * targetPercentage) / 100}
              y1="100"
              x2={20 + (160 * targetPercentage) / 100}
              y2="85"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
          
          {/* Peak indicator */}
          {peakValue && (
            <circle
              cx={20 + (160 * peakPercentage) / 100}
              cy="100"
              r="4"
              fill="#dc2626"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{
            width: "2px",
            height: "40%",
            background: "#1f2937",
            transformOrigin: "bottom center"
          }}
          animate={{
            rotate: -90 + (180 * percentage) / 100
          }}
          transition={{ duration: animated ? 0.3 : 0, ease: "easeOut" }}
        >
          <div className="absolute -top-2 -left-1 w-4 h-4 bg-gray-800 rounded-full" />
        </motion.div>
      </div>

      {/* Digital Display */}
      {showDigital && (
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <motion.div
            className="inline-flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {value > 0 ? (
              <Volume2 className="h-4 w-4 text-white" />
            ) : (
              <VolumeX className="h-4 w-4 text-gray-400" />
            )}
            <span className={cn(
              "font-mono text-2xl font-bold",
              value > 160 ? "text-red-500" : "text-white"
            )}>
              {value.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">dB</span>
          </motion.div>
          
          {peakValue && (
            <div className="text-xs text-gray-500 mt-1">
              Peak: {peakValue.toFixed(1)} dB
            </div>
          )}
        </div>
      )}
    </div>
  )
}