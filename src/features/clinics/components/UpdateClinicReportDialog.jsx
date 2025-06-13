import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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

export default function UpdateClinicReportDialog({ isOpen, onClose, onSubmit, report, clinic }) {
  const [patients, setPatients] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    testStatus: "",
    testType: "",
    processingLab: "",
    sampleCollectionDate: null,
    datePickedUpByLab: null,
    dateShippedToLab: null,
    reportCompletionDate: null,
    notes: "",
    documents: []
  })

  const form = useForm({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      testStatus: report?.testStatus || "",
      patient: report?.patient_id || "",
      labTestType: report?.testType || "",
      processingLab: report?.processingLab || "",
      invoiceNumber: report?.invoice || "",
      sampleCollectionDate: report?.sampleCollectionDate || "",
      datePickedUpByLab: report?.datePickedUpByLab || "",
      dateShippedToLab: report?.dateShippedToLab || "",
      trackingNumber: report?.trackingNumber || "",
      reportCompletionDate: report?.reportCompletionDate || "",
      notes: report?.notes || ""
    }
  })

  // Fetch patients when form opens
  useEffect(() => {
    if (isOpen) {
      fetchPatients()
    }
  }, [isOpen])

  // Normalize report data to handle both formats
  const normalizeReportData = (report) => {
    if (!report) return null
    return {
      id: report.id,
      referenceId: report.reference_id || report.referenceId,
      testStatus: report.status || report.testStatus,
      testType: report.lab_test_type || report.testType,
      processingLab: report.processing_lab || report.processingLab,
      sampleCollectionDate: report.sample_collection_date || report.sampleCollectionDate,
      datePickedUpByLab: report.date_picked_up_by_lab || report.datePickedUpByLab,
      dateShippedToLab: report.date_shipped_to_lab || report.dateShippedToLab,
      reportCompletionDate: report.report_completion_date || report.reportCompletionDate,
      notes: report.notes,
      documents: report.documents || []
    }
  }

  // Update form values when report changes
  useEffect(() => {
    if (report) {
      const normalizedReport = normalizeReportData(report)
      form.reset({
        testStatus: normalizedReport.testStatus || "",
        patient: report.patient_id || "",
        labTestType: normalizedReport.testType || "",
        processingLab: normalizedReport.processingLab || "",
        invoiceNumber: report.invoice || report.invoice_number || "",
        sampleCollectionDate: normalizedReport.sampleCollectionDate || "",
        datePickedUpByLab: normalizedReport.datePickedUpByLab || "",
        dateShippedToLab: normalizedReport.dateShippedToLab || "",
        trackingNumber: report.trackingNumber || report.tracking_number || "",
        reportCompletionDate: normalizedReport.reportCompletionDate || "",
        notes: normalizedReport.notes || ""
      })
    }
  }, [report, form])

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
      setIsSubmitting(true)
      // Handle PDF upload if provided
      let pdfUrl = report.pdf_url
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

      // Update the report
      const { data: updatedReport, error } = await supabase
        .from('reports')
        .update({
          status: data.testStatus,
          patient_id: data.patient,
          lab_test_type: data.labTestType,
          processing_lab: data.processingLab,
          sample_collection_date: formatDate(data.sampleCollectionDate),
          date_picked_up_by_lab: data.datePickedUpByLab,
          date_shipped_to_lab: formatDate(data.dateShippedToLab),
          report_completion_date: formatDate(data.reportCompletionDate),
          notes: data.notes || null,
          pdf_url: pdfUrl,
          last_modified: new Date().toISOString()
        })
        .eq('id', report.id)
        .select(`
          id,
          reference_id,
          status,
          lab_test_type,
          processing_lab,
          invoice_number,
          sample_collection_date,
          date_picked_up_by_lab,
          date_shipped_to_lab,
          tracking_number,
          report_completion_date,
          notes,
          pdf_url,
          created_at,
          last_modified,
          patient_id,
          clinic_id,
          patients (
            first_name,
            last_name
          ),
          clinics (
            name
          )
        `)
        .single()

      if (error) throw error

      // Transform the data to match the UI format
      const transformedReport = {
        id: updatedReport.id,
        referenceId: updatedReport.reference_id,
        firstName: updatedReport.patients?.first_name || 'N/A',
        lastName: updatedReport.patients?.last_name || 'N/A',
        testStatus: updatedReport.status,
        testType: updatedReport.lab_test_type,
        processingLab: updatedReport.processing_lab,
        invoice: updatedReport.invoice_number,
        sampleCollectionDate: updatedReport.sample_collection_date,
        datePickedUpByLab: updatedReport.date_picked_up_by_lab,
        dateShippedToLab: updatedReport.date_shipped_to_lab,
        trackingNumber: updatedReport.tracking_number,
        reportCompletionDate: updatedReport.report_completion_date,
        notes: updatedReport.notes,
        pdfUrl: updatedReport.pdf_url,
        createdAt: updatedReport.created_at,
        lastModified: updatedReport.last_modified,
        patient_id: updatedReport.patient_id,
        clinic_id: updatedReport.clinic_id,
        associatedClinic: updatedReport.clinics?.name || clinic?.name || 'N/A'
      }

      onSubmit(transformedReport)
      form.reset()
      onClose()
      toast.success('Report updated successfully')
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error(error.message || 'Failed to update report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Update Report</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update the report details for {clinic?.name}.
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
                      <Input {...field} readOnly className="bg-muted cursor-not-allowed" />
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
                      <Input {...field} readOnly className="bg-muted cursor-not-allowed" />
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
                    <FormLabel className="text-sm font-medium">Date Picked Up by Lab <span className="text-destructive">*</span></FormLabel>
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

            <DialogFooter className="flex-none gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Report'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 