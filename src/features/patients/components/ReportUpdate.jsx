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
import { IconArrowLeft } from "@tabler/icons-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Separator } from "@/components/ui/separator"

const TEST_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"]
const TEST_TYPES = ["Blood Test", "Urine Test", "X-Ray", "MRI", "CT Scan"]
const PROCESSING_LABS = ["Lab A", "Lab B", "Lab C", "Lab D"]

const reportFormSchema = z.object({
  testStatus: z.string().min(1, "Please select a test status"),
  associatedClinic: z.string().min(2, "Clinic name must be at least 2 characters"),
  testType: z.string().min(1, "Please select a test type"),
  reportCompletionDate: z.string().min(1, "Please select a completion date"),
  processingLab: z.string().min(1, "Please select a processing lab"),
  invoice: z.string().min(1, "Please enter an invoice number"),
  sampleCollectionDate: z.string().optional(),
  datePickedUp: z.string().optional(),
  trackingNumber: z.string().optional(),
  dateShipped: z.string().optional(),
  notes: z.string().optional(),
})

export default function ReportUpdate({ report, patient, onBack, onSubmit, onCancel, isTableUpdate }) {
  const form = useForm({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
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
    },
  })

  const handleSubmit = (data) => {
    onSubmit(data)
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <Button
          variant="ghost"
          className="text-sm sm:text-base hover:bg-primary/10"
          onClick={onBack}
        >
          <IconArrowLeft className="h-4 w-4 mr-2" />
          {isTableUpdate ? "Back to Reports" : "Back to Report Details"}
        </Button>
      </div>

      <div className="grid gap-6 max-w-3xl mx-auto">
        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Update Report</CardTitle>
            <CardDescription className="text-base">
              Update the report details for {patient.first_name} {patient.last_name}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="testStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Test Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
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
                        <FormItem>
                          <FormLabel className="text-base">Test Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="associatedClinic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Associated Clinic</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter clinic name" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="processingLab"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Processing Lab</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="reportCompletionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Report Completion Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter invoice number" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Additional Details Section - Only show in view mode */}
                {!isTableUpdate && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">Additional Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="sampleCollectionDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Sample Collection Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="h-10" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="datePickedUp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Date Picked Up</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="h-10" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="trackingNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Tracking Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter tracking number" {...field} className="h-10" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dateShipped"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Date Shipped</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="h-10" />
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
                            <FormLabel className="text-base">Notes</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter additional notes" {...field} className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                <Separator className="my-6" />

                {/* Form Actions */}
                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel}
                    className="h-10 px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="h-10 px-6"
                  >
                    Update Report
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 