import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
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
  IconBarcode,
  IconLoader2
} from "@tabler/icons-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import UpdateClinicReportDialog from "./UpdateClinicReportDialog"
import { toast } from "react-hot-toast"
import { supabase } from "@/lib/supabaseClient"
import { Loader } from "@/components/shared/loader"
import { useAuth } from "@/context/AuthContext"

export default function ClinicReportDetails({ report: initialReport, onBack: initialOnBack, onUpdate: initialOnUpdate, onDelete: initialOnDelete }) {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const { userDetails } = useAuth()
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [currentReport, setCurrentReport] = useState(initialReport)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(!initialReport)

  useEffect(() => {
    const fetchReport = async () => {
      if (initialReport) return

      try {
        const { data, error } = await supabase
          .from('reports')
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
          .eq('id', reportId)
          .single()

        if (error) throw error

        if (!data) {
          toast.error('Report not found')
          navigate('/reports')
          return
        }

        // Transform the data to match the UI format
        const transformedReport = {
          id: data.id,
          referenceId: data.reference_id,
          firstName: data.patients?.first_name || 'N/A',
          lastName: data.patients?.last_name || 'N/A',
          testStatus: data.status,
          testType: data.lab_test_type,
          processingLab: data.processing_lab,
          invoice: data.invoice_number,
          sampleCollectionDate: data.sample_collection_date,
          datePickedUpByLab: data.date_picked_up_by_lab,
          dateShippedToLab: data.date_shipped_to_lab,
          trackingNumber: data.tracking_number,
          reportCompletionDate: data.report_completion_date,
          notes: data.notes,
          pdfUrl: data.pdf_url,
          createdAt: data.created_at,
          lastModified: data.last_modified,
          patient_id: data.patient_id,
          clinic_id: data.clinic_id,
          associatedClinic: data.clinics?.name || 'N/A'
        }

        setCurrentReport(transformedReport)
      } catch (error) {
        console.error('Error fetching report:', error)
        toast.error('Failed to fetch report details')
        navigate('/reports')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportId, initialReport, navigate])

  useEffect(() => {
    if (initialReport) {
      setCurrentReport(initialReport)
    }
  }, [initialReport])

  useEffect(() => {
    if (currentReport && initialOnUpdate) {
      initialOnUpdate(currentReport.id)
    }
  }, [currentReport, initialOnUpdate])

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
    if (initialOnUpdate) {
      initialOnUpdate(updatedReport.id)
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true)
      if (initialOnDelete) {
        await initialOnDelete(currentReport)
        toast.success('Report deleted successfully')
      } else {
        const { error } = await supabase
          .from('reports')
          .delete()
          .eq('id', currentReport.id)

        if (error) throw error
        toast.success('Report deleted successfully')
      }
      handleBack()
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleBack = () => {
    if (initialOnBack) {
      initialOnBack()
    } else {
      navigate(-1)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader message="Loading report details..." />
      </div>
    )
  }

  if (!currentReport) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Report not found
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
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
        {/* Only show Update and Delete buttons for admin users */}
        {userDetails?.role === 'admin' && (
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
                  onClick={handleDeleteClick}
                  className="flex-1 sm:flex-none"
                >
                  <IconTrash className="h-4 w-4 mr-2" />
                  Delete Report
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
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Report'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
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

              {/* Only show Associated Clinic for admin users */}
              {userDetails?.role === 'admin' && (
                <div className="space-y-2">
                  <Label htmlFor="associatedClinic">Associated Clinic</Label>
                  <div className="flex items-center gap-2 text-sm sm:text-base">
                    <IconBuilding className="h-4 w-4 text-muted-foreground" />
                    <span>{currentReport.associatedClinic || 'N/A'}</span>
                  </div>
                </div>
              )}
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

      {/* Only show Update Report dialog for admin users */}
      {userDetails?.role === 'admin' && (
        <UpdateClinicReportDialog
          isOpen={isUpdateDialogOpen}
          onClose={() => setIsUpdateDialogOpen(false)}
          onSubmit={handleUpdateSuccess}
          report={currentReport}
        />
      )}
    </div>
  )
} 