import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { IconLock } from "@tabler/icons-react"

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <IconLock className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold">401</h1>
        <h2 className="text-2xl font-semibold">Unauthorized Access</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )
} 