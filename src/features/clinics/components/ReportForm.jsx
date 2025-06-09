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

// Form schema for report
const reportFormSchema = z.object({
  testStatus: z.string().min(1, "Test status is required"),
  patient: z.string().min(1, "Patient is required"),
  labTestType: z.string().min(1, "Lab test type is required"),
  processingLab: z.string().min(1, "Processing lab is required"),
  invoiceNumber: z.string().optional(),
  sampleCollectionDate: z.string().optional(),
  datePickedUpByLabLink: z.string().min(1, "Date picked up by LabLink is required"),
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

export default function ReportForm({ isOpen, onClose, onSubmit }) {
  const [patients, setPatients] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      testStatus: "",
      patient: "",
      labTestType: "",
      processingLab: "",
      invoiceNumber: "",
      sampleCollectionDate: "",
      datePickedUpByLabLink: "",
      dateShippedToLab: "",
      trackingNumber: "",
      reportCompletionDate: "",
      reportPDF: null,
      notes: "",
    },
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('id, reference_id, first_name, last_name')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error('Failed to fetch patients')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (data) => {
    try {
      // Convert empty date strings to null
      const processedData = {
        ...data,
        sampleCollectionDate: data.sampleCollectionDate || null,
        datePickedUpByLabLink: data.datePickedUpByLabLink || null,
        dateShippedToLab: data.dateShippedToLab || null,
        reportCompletionDate: data.reportCompletionDate || null,
      }
      await onSubmit(processedData)
      form.reset()
      onClose()
    } catch (error) {
      console.error("Error submitting report form:", error)
      toast.error("Failed to add report")
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Report</DialogTitle>
          <DialogDescription>
            Add a new report. Fill in the required information below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="testStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Status <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select test status" />
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
                name="patient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
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
                name="labTestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lab Test Type <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>Processing Lab <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select processing lab" />
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
                    <FormLabel>Invoice #</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter invoice number" {...field} />
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
                    <FormLabel>Sample Collection Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="datePickedUpByLabLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Picked Up by LabLink <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
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
                    <FormLabel>Date Shipped to Lab</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
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
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tracking number" {...field} />
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
                    <FormLabel>Report Completion Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
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
                    <FormLabel>Report PDF</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => onChange(e.target.files[0])}
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes"
                      className="resize-none"
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
              <Button type="submit" className="w-full sm:w-auto">
                Add Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 