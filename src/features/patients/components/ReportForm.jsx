import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"

// Form schema for report
const reportFormSchema = z.object({
  testStatus: z.string().min(1, "Test status is required"),
  clinic_id: z.string().min(1, "Associated clinic is required"),
  testType: z.string().min(1, "Lab test type is required"),
  processingLab: z.string().min(1, "Processing lab is required"),
  invoice: z.string().optional(),
  sampleCollectionDate: z.string().optional().nullable(),
  datePickedUpByLab: z.string().min(1, "Date picked up by lab is required"),
  dateShippedToLab: z.string().optional().nullable(),
  trackingNumber: z.string().optional(),
  reportCompletionDate: z.string().optional().nullable(),
  reportPDF: z.any().optional(),
  notes: z.string().optional(),
})

const TEST_STATUS = [
  "Sample Received",
  "Resample Required",
  "In Progress",
  "Ready"
]

const TEST_TYPES = [
  "Blood",
  "Urine",
  "COVID-19",
  "DNA"
]

const PROCESSING_LABS = [
  "Central Lab",
  "East Lab",
  "West Lab",
  "North Lab"
]

// Utility function to generate IDs
const generateIds = async () => {
  try {
    // Get the latest report for reference ID
    const { data: latestReport, error: reportError } = await supabase
      .from('reports')
      .select('reference_id, invoice_number, tracking_number')
      .order('reference_id', { ascending: false })
      .limit(1)
      .single()

    if (reportError && reportError.code !== 'PGRST116') throw reportError

    // Generate reference ID
    let nextRefNumber = 1
    if (latestReport?.reference_id) {
      const refMatch = latestReport.reference_id.match(/REP(\d+)/)
      if (refMatch) {
        nextRefNumber = parseInt(refMatch[1]) + 1
      }
    }
    const referenceId = `REP${nextRefNumber.toString().padStart(3, '0')}`

    // Generate invoice number
    let nextInvNumber = 1
    if (latestReport?.invoice_number) {
      const invMatch = latestReport.invoice_number.match(/INV(\d+)/)
      if (invMatch) {
        nextInvNumber = parseInt(invMatch[1]) + 1
      }
    }
    const invoiceNumber = `INV${nextInvNumber.toString().padStart(3, '0')}`

    // Generate tracking number
    let nextTrackNumber = 1
    if (latestReport?.tracking_number) {
      const trackMatch = latestReport.tracking_number.match(/TRACK(\d+)/)
      if (trackMatch) {
        nextTrackNumber = parseInt(trackMatch[1]) + 1
      }
    }
    const trackingNumber = `TRACK${nextTrackNumber.toString().padStart(3, '0')}`

    return {
      referenceId,
      invoiceNumber,
      trackingNumber
    }
  } catch (error) {
    console.error('Error generating IDs:', error)
    throw error
  }
}

// Helper function to format date for form - modified to handle null/empty values
const formatDateForForm = (dateString) => {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) return null
    return date.toISOString().split('T')[0]
  } catch {
    return null
  }
}

// Helper function to format date for database - modified to handle null/empty values
const formatDateForDatabase = (dateStr) => {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    // Check if date is valid
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

export default function ReportForm({ 
  patient, 
  report, 
  onSubmit, 
  onCancel, 
  mode = "add",
  open = true,
  onOpenChange
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [clinics, setClinics] = useState([])
  const [generatedIds, setGeneratedIds] = useState(null)
  const [isGeneratingId, setIsGeneratingId] = useState(false)

  // Initialize form with proper date formatting
  const form = useForm({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      testStatus: report?.testStatus || "",
      clinic_id: report?.clinic_id || "",
      testType: report?.testType || "",
      processingLab: report?.processingLab || "",
      invoice: report?.invoice || "",
      sampleCollectionDate: formatDateForForm(report?.sampleCollectionDate),
      datePickedUpByLab: formatDateForForm(report?.datePickedUpByLab),
      dateShippedToLab: formatDateForForm(report?.dateShippedToLab),
      trackingNumber: report?.trackingNumber || "",
      reportCompletionDate: formatDateForForm(report?.reportCompletionDate),
      notes: report?.notes || ""
    }
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      fetchClinics()
      if (mode === "add") {
        // Reset form to initial values when opening in add mode
        form.reset({
          testStatus: "",
          clinic_id: "",
          testType: "",
          processingLab: "",
          invoice: "",
          sampleCollectionDate: "",
          datePickedUpByLab: "",
          dateShippedToLab: "",
          trackingNumber: "",
          reportCompletionDate: "",
          notes: ""
        })
        // Generate new IDs
        generateIds().then(ids => {
          setGeneratedIds(ids)
          form.setValue('invoice', ids.invoiceNumber)
          form.setValue('trackingNumber', ids.trackingNumber)
        }).catch(error => {
          console.error('Error generating IDs:', error)
          toast.error('Failed to generate reference numbers')
        })
      }
    } else {
      // Reset form and generated IDs when dialog closes
      form.reset({
        testStatus: "",
        clinic_id: "",
        testType: "",
        processingLab: "",
        invoice: "",
        sampleCollectionDate: "",
        datePickedUpByLab: "",
        dateShippedToLab: "",
        trackingNumber: "",
        reportCompletionDate: "",
        notes: ""
      })
      setGeneratedIds(null)
    }
  }, [open, mode])

  // Reset form when report changes - simplified
  useEffect(() => {
    if (mode === "update" && report) {
      form.reset({
        ...report,
        sampleCollectionDate: formatDateForForm(report.sampleCollectionDate),
        datePickedUpByLab: formatDateForForm(report.datePickedUpByLab),
        dateShippedToLab: formatDateForForm(report.dateShippedToLab),
        reportCompletionDate: formatDateForForm(report.reportCompletionDate)
      })
    }
  }, [report, mode, form])

  const fetchClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name')
        .order('name')

      if (error) throw error
      setClinics(data || [])
    } catch (error) {
      console.error('Error fetching clinics:', error)
      toast.error('Failed to fetch clinics')
    }
  }

  const handleSubmit = async (data) => {
    try {
      setIsLoading(true)
      
      // Format dates for database submission and include generated IDs in add mode
      const formattedData = {
        ...data,
        // Include generated IDs only in add mode
        ...(mode === "add" ? {
          reference_id: generatedIds?.referenceId,
          invoice: generatedIds?.invoiceNumber,
          trackingNumber: generatedIds?.trackingNumber
        } : {}),
        // Format dates for database
        sampleCollectionDate: formatDateForDatabase(data.sampleCollectionDate),
        datePickedUpByLab: formatDateForDatabase(data.datePickedUpByLab),
        dateShippedToLab: formatDateForDatabase(data.dateShippedToLab),
        reportCompletionDate: formatDateForDatabase(data.reportCompletionDate)
      }

      await onSubmit(formattedData)
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error(error.message || 'Failed to submit form')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Reset form and generated IDs when manually closing
    form.reset({
      testStatus: "",
      clinic_id: "",
      testType: "",
      processingLab: "",
      invoice: "",
      sampleCollectionDate: "",
      datePickedUpByLab: "",
      dateShippedToLab: "",
      trackingNumber: "",
      reportCompletionDate: "",
      notes: ""
    })
    setGeneratedIds(null)
    onCancel?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {mode === "add" ? "Add New Report" : "Update Report"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === "add" 
              ? `Fill in the details to create a new report for ${patient.first_name} ${patient.last_name}.`
              : "Update the report details."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clinic_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Associated Clinic <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a clinic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Test Status <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEST_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Test Type <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select test type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEST_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="processingLab"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Processing Lab <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select lab" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROCESSING_LABS.map((lab) => (
                          <SelectItem key={lab} value={lab}>
                            {lab}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full bg-muted cursor-not-allowed" readOnly={true} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trackingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Tracking Number</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full bg-muted cursor-not-allowed" readOnly={true} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sampleCollectionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Sample Collection Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''} 
                        className="w-full"
                        onChange={(e) => {
                          // Handle empty date input
                          const value = e.target.value || null
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="datePickedUpByLab"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Date Picked Up by Lab <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''} 
                        className="w-full"
                        onChange={(e) => {
                          // Handle empty date input
                          const value = e.target.value || null
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateShippedToLab"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Date Shipped to Lab</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''} 
                        className="w-full"
                        onChange={(e) => {
                          // Handle empty date input
                          const value = e.target.value || null
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportCompletionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Report Completion Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''} 
                        className="w-full"
                        onChange={(e) => {
                          // Handle empty date input
                          const value = e.target.value || null
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportPDF"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Report PDF</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => onChange(e.target.files[0])}
                        className="w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes"
                      className="resize-none min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-none gap-2 sm:gap-0 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "add" ? "Adding Report..." : "Updating Report..."}
                  </>
                ) : (
                  mode === "add" ? "Add Report" : "Update Report"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 