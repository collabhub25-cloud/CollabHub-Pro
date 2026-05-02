import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Unified Button Component — AlloySphere Design System
 *
 * This is the SINGLE standardized button component for the entire platform.
 * All button implementations across the app should use this component.
 *
 * Variants:
 * - default:     Primary filled button (brand color)
 * - destructive: Red/danger actions
 * - outline:     Bordered, transparent background
 * - secondary:   Muted background
 * - ghost:       No background, subtle hover
 * - link:        Underlined text button
 * - cta:         Call-to-action with brand gradient + hover scale (replaces InteractiveHoverButton)
 *
 * Sizes: sm, default, lg, xl, icon
 *
 * Features:
 * - Loading state with spinner
 * - Disabled state with opacity
 * - Accessible focus rings
 * - Responsive across devices
 * - Supports asChild for custom elements (links, etc.)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        cta: "bg-[#0d3b2e] text-white hover:bg-[#1a5b48] shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] rounded-xl font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child element (e.g., Link) instead of a button */
  asChild?: boolean
  /** Show a loading spinner and disable the button */
  loading?: boolean
  /** Custom loading text to display alongside spinner */
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText && <span>{loadingText}</span>}
            {!loadingText && children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
