import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const TEST_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"]
const TEST_TYPES = ["Blood Test", "Urine Test", "X-Ray", "MRI", "CT Scan"]
const PROCESSING_LABS = ["Lab A", "Lab B", "Lab C", "Lab D"]

const reportFormSchema = z.object({
  testStatus: z.string().min(1, "Test status is required"),
  associatedClinic: z.string().min(1, "Clinic name is required"),
  testType: z.string().min(1, "Test type is required"),
  reportCompletionDate: z.string().min(1, "Completion date is required"),
  processingLab: z.string().min(1, "Processing lab is required"),
  invoice: z.string().min(1, "Invoice number is required"),
  sampleCollectionDate: z.string().optional(),
  datePickedUp: z.string().optional(),
  trackingNumber: z.string().optional(),
  dateShipped: z.string().optional(),
  notes: z.string().optional(),
})

export default function ReportForm({ 
  patient, 
  report, 
  onSubmit, 
  onCancel, 
  mode = "add",
  open = true,
  onOpenChange
}) {
  const form = useForm({
    resolver: zodResolver(reportFormSchema),
    defaultValues: report ? {
      testStatus: report.testStatus,
      associatedClinic: report.associatedClinic,
      testType: report.testType,
      reportCompletionDate: report.reportCompletionDate,
      processingLab: report.processingLab,
      invoice: report.invoice,
      sampleCollectionDate: report.sampleCollectionDate || "",
      datePickedUp: report.datePickedUp || "",
      trackingNumber: report.trackingNumber || "",
      dateShipped: report.dateShipped || "",
      notes: report.notes || "",
    } : {
      testStatus: "",
      associatedClinic: "",
      testType: "",
      reportCompletionDate: "",
      processingLab: "",
      invoice: "",
      sampleCollectionDate: "",
      datePickedUp: "",
      trackingNumber: "",
      dateShipped: "",
      notes: "",
    }
  })

  const handleSubmit = (data) => {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "add" ? "Add New Report" : "Update Report"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary" />
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="testStatus"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Test Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select test status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEST_STATUSES.map((status) => (
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Test Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  name="associatedClinic"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Associated Clinic</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter clinic name" {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="processingLab"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Processing Lab</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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
                  name="reportCompletionDate"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
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
                  name="invoice"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Invoice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter invoice number" {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Additional Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary" />
                <h3 className="text-lg font-semibold">Additional Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sampleCollectionDate"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
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
                  name="datePickedUp"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Date Picked Up</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Tracking Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tracking number" {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateShipped"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Date Shipped</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2 space-y-2">
                      <FormLabel className="text-sm font-medium">Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes"
                          className="min-h-[100px] w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {mode === "add" ? "Add Report" : "Update Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 