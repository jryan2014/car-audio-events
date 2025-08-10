import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./utils"
import { AlertCircle, CheckCircle, X, Info, AlertTriangle } from "lucide-react"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-red-50 dark:bg-red-900/20",
        success:
          "border-green-500/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 [&>svg]:text-green-600",
        warning:
          "border-yellow-500/50 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 [&>svg]:text-yellow-600",
        info:
          "border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 [&>svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  onClose?: () => void
  icon?: React.ReactNode | false
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, onClose, icon, children, ...props }, ref) => {
    const getDefaultIcon = () => {
      if (icon === false) return null
      if (icon) return icon
      
      switch (variant) {
        case "destructive":
          return <AlertCircle className="h-4 w-4" />
        case "success":
          return <CheckCircle className="h-4 w-4" />
        case "warning":
          return <AlertTriangle className="h-4 w-4" />
        case "info":
          return <Info className="h-4 w-4" />
        default:
          return <AlertCircle className="h-4 w-4" />
      }
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {getDefaultIcon()}
        {children}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Close alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }