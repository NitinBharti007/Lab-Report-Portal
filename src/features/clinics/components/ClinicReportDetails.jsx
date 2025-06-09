import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  IconUser,
  IconTruck,
  IconPackage,
  IconBarcode
} from "@tabler/icons-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import UpdateClinicReportDialog from "./UpdateClinicReportDialog"
import { toast } from "sonner"

export default function ClinicReportDetails({ report, onBack, onUpdate, onDelete }) {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [currentReport, setCurrentReport] = useState(report)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (report) {
      setCurrentReport(report)
    }
  }, [report])

  useEffect(() => {
    if (currentReport) {
      onUpdate(currentReport.id)
    }
  }, [currentReport, onUpdate])

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'cancelled':
        return 'destructive'
      case 'in progress':
        return 'info'
      default:
        return 'secondary'
    }
  }

  const handleUpdateSuccess = (updatedReport) => {
    setIsUpdateDialogOpen(false)
    setCurrentReport(updatedReport)
    onUpdate(updatedReport.id)
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true)
      await onDelete(currentReport)
      onBack()
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
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
            onClick={() => setIsUpdateDialogOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <IconPencil className="h-4 w-4 mr-2" />
            Update Report
          </Button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                <AlertDialogAction onClick={handleDeleteConfirm}>
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
                  {currentReport.referenceId}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Badge variant={getStatusVariant(currentReport.testStatus)}>
                  {currentReport.testStatus}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab_test_type">Test Type</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconMicroscope className="h-4 w-4 text-muted-foreground" />
                  <span>{currentReport.testType}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="processing_lab">Processing Lab</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconBuilding className="h-4 w-4 text-muted-foreground" />
                  <span>{currentReport.processingLab}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconReceipt className="h-4 w-4 text-muted-foreground" />
                  <span>{currentReport.invoice || 'N/A'}</span>
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
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconUser className="h-4 w-4 text-muted-foreground" />
                  <span>{currentReport.firstName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconUser className="h-4 w-4 text-muted-foreground" />
                  <span>{currentReport.lastName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="associatedClinic">Associated Clinic</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconBuilding className="h-4 w-4 text-muted-foreground" />
                  <span>{currentReport.associatedClinic || 'N/A'}</span>
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
                  <span>{formatDate(currentReport.sampleCollectionDate)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="datePickedUpByLab">Date Picked Up by Lab</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconTruck className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(currentReport.datePickedUpByLab)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateShippedToLab">Date Shipped to Lab</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconPackage className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(currentReport.dateShippedToLab)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportCompletionDate">Report Completion Date</Label>
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <IconCalendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(currentReport.reportCompletionDate)}</span>
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
                  <IconBarcode className="h-4 w-4 text-muted-foreground" />
                  <span>{currentReport.trackingNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                {currentReport.notes ? (
                  <div className="flex items-start gap-2 text-sm sm:text-base">
                    <IconNotes className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="whitespace-pre-wrap">{currentReport.notes}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No notes available
                  </div>
                )}
              </div>
            </div>

            {/* Report PDF */}
            {currentReport.pdfUrl && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => window.open(currentReport.pdfUrl, '_blank')}
                >
                  <IconFileText className="h-4 w-4 mr-2" />
                  View Report PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Dialog */}
      <UpdateClinicReportDialog
        report={currentReport}
        open={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  )
} 