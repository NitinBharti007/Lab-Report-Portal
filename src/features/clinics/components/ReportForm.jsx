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
import { Textarea } from "@/components/ui/textarea"
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
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"

// Form schema for report
const reportFormSchema = z.object({
  testStatus: z.string().min(1, "Test status is required"),
  patient: z.string().min(1, "Patient is required"),
  labTestType: z.string().min(1, "Lab test type is required"),
  processingLab: z.string().min(1, "Processing lab is required"),
  invoiceNumber: z.string().optional(),
  sampleCollectionDate: z.string().optional(),
  datePickedUpByLab: z.string().min(1, "Date picked up by lab is required"),
  dateShippedToLab: z.string().optional(),
  trackingNumber: z.string().optional(),
  reportCompletionDate: z.string().optional(),
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
const generateIds = async (patientId, type) => {
  try {
    // Get the latest report for reference ID
    const { data: latestReport, error: reportError } = await supabase
      .from('reports')
      .select('reference_id, invoice_number, tracking_number')
      .order('created_at', { ascending: false })
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

export default function ReportForm({ isOpen, onClose, onSubmit, clinic }) {
  const [patients, setPatients] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [generatedIds, setGeneratedIds] = useState(null)

  const form = useForm({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      testStatus: "",
      patient: "",
      labTestType: "",
      processingLab: "",
      invoiceNumber: "",
      sampleCollectionDate: "",
      datePickedUpByLab: "",
      dateShippedToLab: "",
      trackingNumber: "",
      reportCompletionDate: "",
      notes: ""
    }
  })

  // Fetch patients when form opens
  useEffect(() => {
    if (isOpen) {
      fetchPatients()
    }
  }, [isOpen])

  // Generate IDs when patient is selected
  useEffect(() => {
    const patientId = form.watch('patient')
    if (patientId) {
      generateIds(patientId).then(ids => {
        setGeneratedIds(ids)
        form.setValue('invoiceNumber', ids.invoiceNumber)
        form.setValue('trackingNumber', ids.trackingNumber)
      }).catch(error => {
        console.error('Error generating IDs:', error)
        toast.error('Failed to generate reference numbers')
      })
    }
  }, [form.watch('patient')])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, reference_id')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error('Failed to fetch patients')
    }
  }

  const handleSubmit = async (data) => {
    try {
      setIsLoading(true)
      let pdfUrl = null

      // Handle PDF upload if provided
      if (data.reportPDF) {
        const file = data.reportPDF
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `reports/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath)

        pdfUrl = publicUrl
      }

      // Convert empty date strings to null
      const formatDate = (dateStr) => {
        if (!dateStr) return null
        return dateStr
      }

      // Prepare report data
      const reportData = {
        reference_id: generatedIds.referenceId,
        testStatus: data.testStatus,
        labTestType: data.labTestType,
        processingLab: data.processingLab,
        invoiceNumber: generatedIds.invoiceNumber,
        sampleCollectionDate: formatDate(data.sampleCollectionDate),
        datePickedUpByLab: formatDate(data.datePickedUpByLab),
        dateShippedToLab: formatDate(data.dateShippedToLab),
        trackingNumber: generatedIds.trackingNumber,
        reportCompletionDate: formatDate(data.reportCompletionDate),
        notes: data.notes || null,
        pdf_url: pdfUrl,
        patient: data.patient,
        clinic_id: clinic.id
      }

      await onSubmit(reportData)
      form.reset()
      setGeneratedIds(null)
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Failed to submit report')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setGeneratedIds(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Add New Report</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Fill in the details to create a new report for {clinic?.name}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Patient <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.reference_id} - {patient.first_name} {patient.last_name}
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
                      defaultValue={field.value}
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
                name="labTestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Test Type <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                      defaultValue={field.value}
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
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-muted" />
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
                      <Input {...field} disabled className="bg-muted" />
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
                      <Input type="date" {...field} className="w-full" />
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
                    <FormLabel className="text-sm font-medium">Date Picked Up by Lab<span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="w-full" />
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
                      <Input type="date" {...field} className="w-full" />
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
                      <Input type="date" {...field} className="w-full" />
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto"
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
                    Adding Report...
                  </>
                ) : (
                  'Add Report'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 