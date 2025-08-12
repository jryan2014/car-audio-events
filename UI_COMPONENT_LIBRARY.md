# Car Audio Events UI Component Library

## 🎨 Overview

A modern, accessible, and highly customizable UI component library built specifically for the Car Audio Events platform. This library combines the best of modern React patterns with Tailwind CSS for rapid development.

### Key Features
- 🚀 **Modern Stack**: React 18, TypeScript, Tailwind CSS
- ♿ **Accessible**: Built on Radix UI primitives for full accessibility
- 🎭 **Animated**: Framer Motion for smooth, performant animations
- 🎨 **Customizable**: Variant-based styling with CVA (Class Variance Authority)
- 📱 **Responsive**: Mobile-first design approach
- 🏎️ **Car Audio Specific**: Custom components for SPL meters, event cards, etc.

---

## 📦 Installation

All dependencies have been installed:
```bash
npm install @radix-ui/react-* framer-motion clsx tailwind-merge class-variance-authority
```

---

## 🧩 Component Library

### Core Components

#### Button
A versatile button component with multiple variants and states.

```tsx
import { Button } from '@/components/ui/Button'

// Basic usage
<Button>Click me</Button>

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
<Button variant="gradient">Gradient</Button>
<Button variant="glow">Glow Effect</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
<Button size="icon"><Settings /></Button>

// With icons
<Button leftIcon={<Plus />}>Add Item</Button>
<Button rightIcon={<ArrowRight />}>Continue</Button>

// Loading state
<Button loading>Processing...</Button>

// Disabled
<Button disabled>Unavailable</Button>
```

#### Card
Flexible card component with hover effects and animations.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, AnimatedCard } from '@/components/ui/Card'

// Basic card
<Card>
  <CardHeader>
    <CardTitle>Event Details</CardTitle>
    <CardDescription>Summer Bass Championship 2025</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Join us for the biggest SPL competition of the year!</p>
  </CardContent>
  <CardFooter>
    <Button>Register Now</Button>
  </CardFooter>
</Card>

// Hoverable card
<Card hoverable>
  <CardContent>Hover over me!</CardContent>
</Card>

// Glowing card
<Card glowing>
  <CardContent>Premium Event</CardContent>
</Card>

// Animated card
<AnimatedCard hoverable>
  <CardContent>Smooth animations with Framer Motion</CardContent>
</AnimatedCard>
```

#### Modal
Accessible modal/dialog component.

```tsx
import { Modal, ModalTrigger, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'

<Modal>
  <ModalTrigger asChild>
    <Button>Open Modal</Button>
  </ModalTrigger>
  <ModalContent size="lg">
    <ModalHeader>
      <ModalTitle>Registration Confirmation</ModalTitle>
      <ModalDescription>
        Please review your registration details
      </ModalDescription>
    </ModalHeader>
    <div className="py-4">
      {/* Modal content */}
    </div>
    <ModalFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </ModalFooter>
  </ModalContent>
</Modal>

// Size variants
<ModalContent size="sm">  // Small modal
<ModalContent size="md">  // Medium (default)
<ModalContent size="lg">  // Large
<ModalContent size="xl">  // Extra large
<ModalContent size="full"> // Full screen
```

#### Input
Enhanced input component with icons and error states.

```tsx
import { Input } from '@/components/ui/Input'

// Basic input
<Input type="text" placeholder="Enter your name" />

// With icon
<Input 
  icon={<User className="h-4 w-4" />}
  placeholder="Username"
/>

// With right element
<Input 
  type="password"
  rightElement={<Eye className="h-4 w-4" />}
/>

// Error state
<Input 
  error
  placeholder="Invalid input"
/>

// Disabled
<Input disabled placeholder="Cannot edit" />
```

#### Select
Accessible dropdown select component.

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select a class" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="spl">SPL Competition</SelectItem>
    <SelectItem value="sq">Sound Quality</SelectItem>
    <SelectItem value="show">Show & Shine</SelectItem>
  </SelectContent>
</Select>
```

#### Alert
Informative alert component with variants.

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'

// Success alert
<Alert variant="success">
  <AlertTitle>Registration Complete!</AlertTitle>
  <AlertDescription>
    You've successfully registered for the event.
  </AlertDescription>
</Alert>

// Warning alert
<Alert variant="warning">
  <AlertTitle>Limited Spots</AlertTitle>
  <AlertDescription>
    Only 10 registration spots remaining!
  </AlertDescription>
</Alert>

// Error alert
<Alert variant="destructive" onClose={() => console.log('closed')}>
  <AlertTitle>Payment Failed</AlertTitle>
  <AlertDescription>
    There was an error processing your payment.
  </AlertDescription>
</Alert>

// Info alert
<Alert variant="info">
  <AlertTitle>Event Update</AlertTitle>
  <AlertDescription>
    The venue has been changed to Miami Convention Center.
  </AlertDescription>
</Alert>
```

#### Badge
Status and label badges with multiple variants.

```tsx
import { Badge } from '@/components/ui/NewBadge'

// Variants
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="premium">Premium</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="default">Default</Badge>
<Badge size="lg">Large</Badge>
```

---

## 🏎️ Car Audio Specific Components

### EventCard
Specialized card for displaying competition events.

```tsx
import { EventCard } from '@/components/ui/car-audio/EventCard'

<EventCard
  event={{
    id: "evt_001",
    name: "Summer Bass Championship 2025",
    type: "SPL",
    date: "2025-06-15",
    location: "Miami, FL",
    venue: "Miami Convention Center",
    registrations: 85,
    maxCompetitors: 100,
    price: 75,
    earlyBirdPrice: 50,
    image: "/event-image.jpg",
    status: "upcoming",
    featured: true
  }}
  onRegister={() => handleRegister()}
  onViewDetails={() => handleViewDetails()}
/>
```

### SPLMeter
Animated SPL (Sound Pressure Level) meter display.

```tsx
import { SPLMeter } from '@/components/ui/car-audio/SPLMeter'

<SPLMeter
  value={142.5}
  max={180}
  min={0}
  peakValue={145.2}
  targetValue={140}
  animated
  showDigital
  size="lg"
/>

// Different sizes
<SPLMeter value={135} size="sm" />
<SPLMeter value={148} size="md" />
<SPLMeter value={162} size="lg" />
```

### CompetitorCard
Display competitor information and stats.

```tsx
import { CompetitorCard } from '@/components/ui/car-audio/CompetitorCard'

<CompetitorCard
  competitor={{
    id: "comp_001",
    name: "John Doe",
    team: "Bass Addicts",
    vehicle: {
      year: 2023,
      make: "Honda",
      model: "Civic",
      color: "Blue"
    },
    class: "SPL Pro",
    score: 152.3,
    rank: 1,
    achievements: ["State Champion", "150+ dB Club", "Best Install"],
    avatar: "/avatar.jpg",
    status: "competing"
  }}
  showActions
  onViewProfile={() => handleViewProfile()}
  onViewResults={() => handleViewResults()}
/>
```

---

## 🎨 Theming & Customization

### Using the cn() utility
The `cn()` utility function combines Tailwind classes intelligently:

```tsx
import { cn } from '@/components/ui/utils'

// Merge classes with conflict resolution
<div className={cn(
  "bg-blue-500 p-4",  // Base classes
  condition && "bg-red-500",  // Conditional override
  className  // Props override
)} />
```

### Custom Variants with CVA
Create your own variant-based components:

```tsx
import { cva } from 'class-variance-authority'

const customVariants = cva(
  "base-classes",
  {
    variants: {
      intent: {
        primary: "primary-classes",
        secondary: "secondary-classes"
      },
      size: {
        small: "small-classes",
        large: "large-classes"
      }
    },
    defaultVariants: {
      intent: "primary",
      size: "small"
    }
  }
)

// Usage
<div className={customVariants({ intent: "primary", size: "large" })} />
```

### Tailwind Configuration
The components use these Tailwind CSS variables (configure in your CSS):

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

---

## 🚀 Best Practices

### 1. Import Optimization
Use the barrel export for cleaner imports:
```tsx
import { Button, Card, Modal, Alert } from '@/components/ui'
```

### 2. Accessibility
All interactive components include proper ARIA attributes:
- Keyboard navigation support
- Screen reader announcements
- Focus management
- Proper semantic HTML

### 3. Performance
- Components use React.forwardRef for ref forwarding
- Animations use Framer Motion's hardware acceleration
- Lazy load heavy components when needed

### 4. Responsive Design
All components are mobile-first:
```tsx
<Card className="w-full sm:w-1/2 lg:w-1/3">
  {/* Responsive width */}
</Card>
```

---

## 📚 Advanced Examples

### Complex Event Registration Form
```tsx
import { useState } from 'react'
import { Modal, Input, Select, Checkbox, Button, Alert } from '@/components/ui'

function RegistrationForm() {
  const [formData, setFormData] = useState({})
  const [showSuccess, setShowSuccess] = useState(false)

  return (
    <Modal>
      <ModalTrigger asChild>
        <Button variant="gradient" size="lg">
          Register for Event
        </Button>
      </ModalTrigger>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Event Registration</ModalTitle>
        </ModalHeader>
        
        <div className="space-y-4">
          <Input 
            placeholder="Full Name"
            icon={<User className="h-4 w-4" />}
          />
          
          <Input 
            type="email"
            placeholder="Email Address"
            icon={<Mail className="h-4 w-4" />}
          />
          
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Competition Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spl-pro">SPL Pro</SelectItem>
              <SelectItem value="spl-amateur">SPL Amateur</SelectItem>
              <SelectItem value="sq">Sound Quality</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <label htmlFor="terms">
              I agree to the competition rules
            </label>
          </div>
        </div>
        
        <ModalFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="success">
            Complete Registration
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

### Live SPL Competition Display
```tsx
import { useState, useEffect } from 'react'
import { SPLMeter, CompetitorCard, Badge } from '@/components/ui'

function LiveCompetition() {
  const [currentSPL, setCurrentSPL] = useState(0)
  const [peakSPL, setPeakSPL] = useState(0)
  
  useEffect(() => {
    // Simulate live SPL readings
    const interval = setInterval(() => {
      const newSPL = 130 + Math.random() * 30
      setCurrentSPL(newSPL)
      if (newSPL > peakSPL) setPeakSPL(newSPL)
    }, 100)
    
    return () => clearInterval(interval)
  }, [peakSPL])
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Live SPL Reading</h2>
        <SPLMeter
          value={currentSPL}
          peakValue={peakSPL}
          targetValue={150}
          size="lg"
          animated
          showDigital
        />
        <Badge variant="premium" size="lg">
          LIVE
        </Badge>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Current Competitor</h2>
        <CompetitorCard
          competitor={{
            id: "1",
            name: "Mike Johnson",
            team: "Bass Warriors",
            vehicle: {
              year: 2024,
              make: "Chevrolet",
              model: "Tahoe"
            },
            class: "SPL Pro",
            score: peakSPL,
            status: "competing"
          }}
          showActions={false}
        />
      </div>
    </div>
  )
}
```

---

## 🔧 TypeScript Support

All components are fully typed with TypeScript:

```tsx
import type { ButtonProps } from '@/components/ui/Button'
import type { EventCardProps } from '@/components/ui/car-audio/EventCard'

// Extend component props
interface CustomButtonProps extends ButtonProps {
  customProp?: string
}

// Use with confidence
const MyButton: React.FC<CustomButtonProps> = (props) => {
  return <Button {...props} />
}
```

---

## 📦 Bundle Size

The component library is optimized for production:
- Tree-shakeable exports
- Minimal runtime overhead
- Tailwind CSS purging removes unused styles
- Lazy loadable components

---

## 🎉 Summary

This UI component library provides:
- ✅ 15+ ready-to-use components
- ✅ Full accessibility support
- ✅ Smooth animations
- ✅ Car audio specific components
- ✅ TypeScript support
- ✅ Tailwind CSS integration
- ✅ Production ready

The components are designed to work seamlessly with your existing Car Audio Events platform and can be customized to match your brand identity.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready