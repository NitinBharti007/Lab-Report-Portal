import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const GENDERS = ["Male", "Female", "Other"]

const patientFormSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  gender: z.string().min(1, "Please select a gender"),
  date_of_birth: z.string().min(1, "Please select a date of birth"),
})

export default function PatientForm({ 
  patient, 
  onSubmit, 
  onCancel, 
  mode = "add",
  open = true,
  onOpenChange
}) {
  const form = useForm({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      gender: "",
      date_of_birth: "",
    },
  })

  // Update form values when patient data changes or dialog opens
  useEffect(() => {
    if (open) {
      if (patient && mode === "update") {
        form.reset({
          first_name: patient.first_name,
          last_name: patient.last_name,
          gender: patient.gender,
          date_of_birth: patient.date_of_birth,
        })
      } else {
        form.reset({
          first_name: "",
          last_name: "",
          gender: "",
          date_of_birth: "",
        })
      }
    }
  }, [patient, mode, form, open])

  const handleSubmit = (data) => {
    onSubmit(data)
  }

  const handleClose = () => {
    // Don't reset form here, let the parent component handle state
    onCancel?.()
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
        onOpenChange?.(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto px-4 sm:px-6">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {mode === "add" ? "Add New Patient" : "Update Patient"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === "add" 
              ? "Enter the patient's information below. All fields marked with * are required."
              : "Update the patient's information below. All fields marked with * are required."
            }
          </DialogDescription>
        </DialogHeader>

        <Separator className="mb-6" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium mb-1.5">First Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter first name" 
                        {...field} 
                        className="h-10 w-full"
                      />
                    </FormControl>
                    <FormMessage className="text-xs mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium mb-1.5">Last Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter last name" 
                        {...field} 
                        className="h-10 w-full"
                      />
                    </FormControl>
                    <FormMessage className="text-xs mt-1" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium mb-1.5">Gender <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDERS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium mb-1.5">Date of Birth <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="h-10 w-full"
                      />
                    </FormControl>
                    <FormMessage className="text-xs mt-1" />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6" />

            <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="w-full sm:w-[120px] h-10"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="w-full sm:w-[120px] h-10"
              >
                {mode === "add" ? "Add Patient" : "Update Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 