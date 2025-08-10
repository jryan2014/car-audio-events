import * as React from "react"
import { motion } from "framer-motion"
import { User, Car, Trophy, Medal, Star } from "lucide-react"
import { Card, CardContent, CardHeader } from "../Card"
import { Badge } from "../NewBadge"
import { Button } from "../Button"
import { cn } from "../utils"

export interface CompetitorCardProps {
  competitor: {
    id: string
    name: string
    team?: string
    vehicle: {
      year: number
      make: string
      model: string
      color?: string
    }
    class: string
    score?: number
    rank?: number
    achievements?: string[]
    avatar?: string
    status?: "registered" | "checked_in" | "competing" | "completed"
  }
  showActions?: boolean
  onViewProfile?: () => void
  onViewResults?: () => void
  className?: string
}

const statusColors = {
  registered: "info",
  checked_in: "success",
  competing: "warning",
  completed: "secondary"
} as const

export function CompetitorCard({
  competitor,
  showActions = true,
  onViewProfile,
  onViewResults,
  className
}: CompetitorCardProps) {
  const getRankIcon = (rank?: number) => {
    if (!rank) return null
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" />
    return <span className="text-sm font-bold">#{rank}</span>
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={cn("h-full", className)}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                {competitor.avatar ? (
                  <img
                    src={competitor.avatar}
                    alt={competitor.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
                {competitor.rank && competitor.rank <= 3 && (
                  <div className="absolute -bottom-1 -right-1">
                    {getRankIcon(competitor.rank)}
                  </div>
                )}
              </div>

              {/* Name and Team */}
              <div>
                <h3 className="font-semibold text-lg">{competitor.name}</h3>
                {competitor.team && (
                  <p className="text-sm text-gray-600">Team {competitor.team}</p>
                )}
              </div>
            </div>

            {/* Rank Badge */}
            {competitor.rank && competitor.rank > 3 && (
              <Badge variant="outline">
                {getRankIcon(competitor.rank)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Vehicle Info */}
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-gray-500" />
            <span>
              {competitor.vehicle.year} {competitor.vehicle.make} {competitor.vehicle.model}
              {competitor.vehicle.color && (
                <span className="text-gray-500"> • {competitor.vehicle.color}</span>
              )}
            </span>
          </div>

          {/* Class and Score */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{competitor.class}</Badge>
            {competitor.score !== undefined && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-lg">{competitor.score.toFixed(1)}</span>
                <span className="text-sm text-gray-500">dB</span>
              </div>
            )}
          </div>

          {/* Status */}
          {competitor.status && (
            <Badge 
              variant={statusColors[competitor.status]}
              size="sm"
              className="w-full justify-center"
            >
              {competitor.status.replace("_", " ").toUpperCase()}
            </Badge>
          )}

          {/* Achievements */}
          {competitor.achievements && competitor.achievements.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {competitor.achievements.slice(0, 3).map((achievement, index) => (
                <Badge key={index} variant="outline" size="sm">
                  {achievement}
                </Badge>
              ))}
              {competitor.achievements.length > 3 && (
                <Badge variant="outline" size="sm">
                  +{competitor.achievements.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewProfile}
                className="flex-1"
              >
                Profile
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onViewResults}
                className="flex-1"
              >
                Results
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}