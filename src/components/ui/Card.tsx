import * as React from "react"
import { cn } from "./utils"
import { motion, type MotionProps } from "framer-motion"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hoverable?: boolean
    glowing?: boolean
  }
>(({ className, hoverable = false, glowing = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      hoverable && "transition-all hover:shadow-lg hover:-translate-y-1",
      glowing && "shadow-lg shadow-blue-500/20 border-blue-500/50",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Animated Card variant using Framer Motion
const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & MotionProps & {
    hoverable?: boolean
    glowing?: boolean
  }
>(({ className, hoverable = false, glowing = false, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      glowing && "shadow-lg shadow-blue-500/20 border-blue-500/50",
      className
    )}
    whileHover={hoverable ? { scale: 1.02, y: -4 } : undefined}
    whileTap={hoverable ? { scale: 0.98 } : undefined}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    {...props}
  >
    {children}
  </motion.div>
))
AnimatedCard.displayName = "AnimatedCard"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, AnimatedCard }