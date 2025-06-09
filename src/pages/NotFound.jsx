import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[500px] flex-col items-center justify-center text-center">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for doesn't exist or you don't have permission to access it.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  )
} 