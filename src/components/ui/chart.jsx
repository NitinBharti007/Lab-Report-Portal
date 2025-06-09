import * as React from "react"
import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative w-full", className)}
    {...props}
  >
    {children}
  </div>
))
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <ChartTooltip>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{label}</span>
          </div>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {entry.name}
                </span>
              </div>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </ChartTooltip>
    )
  }
  return null
}

export { ChartContainer, ChartTooltip, ChartTooltipContent } 