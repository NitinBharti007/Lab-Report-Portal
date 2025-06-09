import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { 
  IconArrowLeft,
  IconPencil,
  IconTrash,
  IconFileText,
  IconCalendar,
  IconBuilding,
  IconMicroscope,
  IconReceipt,
  IconNotes,
  IconTruck,
  IconPackage
} from "@tabler/icons-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from 'react-hot-toast'

const getStatusVariant = (status) => {
  switch (status?.toLowerCase()) {
    case 'sample received':
      return 'bg-blue-500'
    case 'resample required':
      return 'bg-yellow-500'
    case 'in progress':
      return 'bg-purple-500'
    case 'ready':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'N/A'
  }
}

export default function ReportDetails({ report, onBack, onUpdate, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await onDelete(report.id)
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <IconArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Report Details</h1>
            <p className="text-sm text-muted-foreground">
              View and manage report information
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate(report)}
            className="flex-1 sm:flex-none"
          >
            <IconPencil className="h-4 w-4 mr-2" />
            Update Report
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={isDeleting}
              >
                <IconTrash className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the report
                  and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete Report
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-4 sm:gap-6">
        {/* Status and Basic Info */}
        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Report Information</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="reference_id">Reference ID</Label>
                <div className="text-sm sm:text-base">
                  {report.reference_id}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Badge className={`${getStatusVariant(report.testStatus)} text-white`}>
                  {report.testStatus}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab_test_type">Test Type</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconMicroscope className="h-4 w-4 text-muted-foreground" />
                  <span>{report.testType}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="processing_lab">Processing Lab</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconBuilding className="h-4 w-4 text-muted-foreground" />
                  <span>{report.processingLab}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconReceipt className="h-4 w-4 text-muted-foreground" />
                  <span>{report.invoice_number || 'N/A'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient and Clinic Info */}
        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Patient & Clinic Information</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="text-sm sm:text-base">
                  {report.firstName}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="text-sm sm:text-base">
                  {report.lastName}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="associatedClinic">Associated Clinic</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconBuilding className="h-4 w-4 text-muted-foreground" />
                  <span>{report.associatedClinic}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Information */}
        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="sampleCollectionDate">Sample Collection Date</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconCalendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(report.sampleCollectionDate)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="datePickedUpByLab">Date Picked Up by Lab</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconTruck className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(report.datePickedUpByLab)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateShippedToLab">Date Shipped to Lab</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconPackage className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(report.dateShippedToLab)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportCompletionDate">Report Completion Date</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconCalendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(report.reportCompletionDate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconTruck className="h-4 w-4 text-muted-foreground" />
                  <span>{report.trackingNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                {report.notes ? (
                  <div className="flex items-start gap-2 text-sm sm:text-base">
                    <IconNotes className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="whitespace-pre-wrap">{report.notes}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No notes available
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-base sm:text-lg">Report Documents</h3>
              {report.documents && report.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {report.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <IconFileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[200px]">
                          {doc.name}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                        className="h-8"
                      >
                        <IconFileText className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  No documents available
                </div>
              )}
            </div>

            {report.pdf_url && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => window.open(report.pdf_url, '_blank')}
                >
                  <IconFileText className="h-4 w-4 mr-2" />
                  View Report PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 