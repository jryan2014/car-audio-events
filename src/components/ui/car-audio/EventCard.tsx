import * as React from "react"
import { motion } from "framer-motion"
import { Calendar, MapPin, Users, Trophy, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../Card"
import { Badge } from "../NewBadge"
import { Button } from "../Button"
import { cn } from "../utils"

export interface EventCardProps {
  event: {
    id: string
    name: string
    type: "SPL" | "SQ" | "Show" | "Custom"
    date: string
    location: string
    venue: string
    registrations: number
    maxCompetitors: number
    price: number
    earlyBirdPrice?: number
    image?: string
    status: "upcoming" | "ongoing" | "completed" | "cancelled"
    featured?: boolean
  }
  onRegister?: () => void
  onViewDetails?: () => void
  className?: string
}

const eventTypeColors = {
  SPL: "bg-red-500",
  SQ: "bg-blue-500",
  Show: "bg-purple-500",
  Custom: "bg-gray-500"
}

const eventStatusColors = {
  upcoming: "success",
  ongoing: "warning",
  completed: "secondary",
  cancelled: "destructive"
} as const

export function EventCard({ event, onRegister, onViewDetails, className }: EventCardProps) {
  const spotsLeft = event.maxCompetitors - event.registrations
  const isSoldOut = spotsLeft <= 0
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 10

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className={cn("h-full", className)}
    >
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-xl transition-shadow">
        {/* Event Image */}
        {event.image && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover"
            />
            {event.featured && (
              <Badge className="absolute top-2 left-2" variant="premium">
                Featured Event
              </Badge>
            )}
            <div className={cn(
              "absolute top-2 right-2 px-3 py-1 rounded-full text-white font-bold",
              eventTypeColors[event.type]
            )}>
              {event.type}
            </div>
          </div>
        )}

        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="line-clamp-2">{event.name}</CardTitle>
              <CardDescription className="mt-2">
                <Badge variant={eventStatusColors[event.status]} size="sm">
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="space-y-3">
            {/* Date */}
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{new Date(event.date).toLocaleDateString()}</span>
            </div>

            {/* Location */}
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="line-clamp-1">{event.venue}, {event.location}</span>
            </div>

            {/* Registration Status */}
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2" />
              <span className={cn(
                isAlmostFull && "text-orange-600 font-semibold",
                isSoldOut && "text-red-600 font-semibold"
              )}>
                {isSoldOut ? (
                  "SOLD OUT"
                ) : isAlmostFull ? (
                  `Only ${spotsLeft} spots left!`
                ) : (
                  `${event.registrations}/${event.maxCompetitors} registered`
                )}
              </span>
            </div>

            {/* Pricing */}
            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-2" />
              <div className="flex items-center gap-2">
                {event.earlyBirdPrice && event.earlyBirdPrice < event.price ? (
                  <>
                    <span className="text-green-600 font-semibold">
                      ${event.earlyBirdPrice} Early Bird
                    </span>
                    <span className="text-gray-400 line-through">
                      ${event.price}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold">${event.price}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex-1"
          >
            View Details
          </Button>
          <Button
            variant={isSoldOut ? "secondary" : "default"}
            size="sm"
            onClick={onRegister}
            disabled={isSoldOut || event.status === "completed" || event.status === "cancelled"}
            className="flex-1"
          >
            {isSoldOut ? "Join Waitlist" : "Register Now"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}