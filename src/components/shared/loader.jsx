import { IconLoader } from "@tabler/icons-react"

export function Loader({ message = "Loading..." }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="flex items-center gap-2">
        <IconLoader className="h-6 w-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">{message}</span>
      </div>
    </div>
  )
} 