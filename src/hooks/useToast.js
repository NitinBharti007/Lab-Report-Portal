import { useToast as useToastOriginal } from "@/components/ui/use-toast"

export function useToast() {
  const { toast } = useToastOriginal()

  return {
    toast: ({ title, description, variant = "default" }) => {
      toast({
        title,
        description,
        variant,
      })
    },
  }
} 