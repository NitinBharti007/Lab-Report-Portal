import { useState, useEffect } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  IconArrowLeft, 
  IconCalendar, 
  IconGenderMale, 
  IconGenderFemale,
  IconFileReport,
  IconPencil,
  IconTrash
} from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"
import PatientReports from "./PatientReports"
import ReportDetails from "./ReportDetails"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"

export default function PatientView({ patient, onBack, onUpdate, onDelete }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { reportId } = useParams()
  const [selectedReport, setSelectedReport] = useState(null)
  const [viewMode, setViewMode] = useState("patient") // "patient" or "report"

  // Add effect to handle direct report access via URL
  useEffect(() => {
    const fetchReport = async () => {
      if (reportId) {
        try {
          const { data, error } = await supabase
            .from('reports')
            .select(`
              id,
              status,
              lab_test_type,
              processing_lab,
              created_at,
              invoice_number,
              tracking_number,
              notes,
              pdf_url,
              clinic_id,
              sample_collection_date,
              date_picked_up_by_lab,
              date_shipped_to_lab,
              report_completion_date,
              clinics!reports_clinic_id_fkey (
                id,
                name
              )
            `)
            .eq('id', reportId)
            .single()

          if (error) throw error
          if (data) {
            // Transform the data to match the UI format
            const transformedReport = {
              id: data.id,
              testStatus: data.status,
              clinic_id: data.clinic_id,
              associatedClinic: data.clinics?.name || 'N/A',
              testType: data.lab_test_type,
              processingLab: data.processing_lab,
              invoice: data.invoice_number,
              trackingNumber: data.tracking_number,
              notes: data.notes,
              pdfUrl: data.pdf_url,
              sampleCollectionDate: data.sample_collection_date,
              datePickedUpByLab: data.date_picked_up_by_lab,
              dateShippedToLab: data.date_shipped_to_lab,
              reportCompletionDate: data.report_completion_date || data.created_at,
              firstName: patient.first_name,
              lastName: patient.last_name
            }
            setSelectedReport(transformedReport)
            setViewMode("report")
          }
        } catch (error) {
          console.error('Error fetching report:', error)
          toast.error('Failed to load report')
          navigate(`/patients/${patient.id}`)
        }
      }
    }

    fetchReport()
  }, [reportId, patient.id, navigate, patient.first_name, patient.last_name])

  const getGenderIcon = (gender) => {
    return gender === "Male" ? (
      <IconGenderMale className="h-5 w-5 text-blue-500" />
    ) : (
      <IconGenderFemale className="h-5 w-5 text-pink-500" />
    )
  }

  const handleViewReport = (report) => {
    setSelectedReport(report)
    setViewMode("report")
    // Update URL to include report ID within patient context
    navigate(`/patients/${patient.id}/reports/${report.id}`, { replace: true })
  }

  const handleUpdateReport = async (data) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: data.testStatus,
          clinic_id: data.clinic_id,
          lab_test_type: data.testType,
          processing_lab: data.processingLab,
          invoice_number: data.invoice,
          notes: data.notes,
          sample_collection_date: data.sampleCollectionDate,
          date_picked_up_by_lab: data.datePickedUpByLab,
          date_shipped_to_lab: data.dateShippedToLab,
          report_completion_date: data.reportCompletionDate,
          last_modified: new Date().toISOString()
        })
        .eq('id', selectedReport.id)

      if (error) throw error

      // Update the selected report with new data
      setSelectedReport(prev => ({
        ...prev,
        ...data,
        testStatus: data.testStatus,
        testType: data.testType,
        processingLab: data.processingLab,
        invoice: data.invoice,
        notes: data.notes,
        sampleCollectionDate: data.sampleCollectionDate,
        datePickedUpByLab: data.datePickedUpByLab,
        dateShippedToLab: data.dateShippedToLab,
        reportCompletionDate: data.reportCompletionDate
      }))

      toast.success('Report updated successfully')
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error(error.message || 'Failed to update report')
    }
  }

  const handleDeleteReport = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (error) throw error

      // If we're deleting the currently selected report, go back to patient view
      if (selectedReport?.id === reportId) {
        setSelectedReport(null)
        setViewMode("patient")
      }

      toast.success('Report deleted successfully')
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error(error.message || 'Failed to delete report')
    }
  }

  const handleBack = () => {
    if (viewMode === "report") {
      setViewMode("patient")
      // Navigate back to patient view
      navigate(`/patients/${patient.id}`, { replace: true })
    } else {
      navigate('/patients')
    }
  }

  if (viewMode === "report" && selectedReport) {
    return (
      <ReportDetails 
        report={selectedReport}
        patient={patient}
        onBack={handleBack}
        onUpdate={handleUpdateReport}
        onDelete={handleDeleteReport}
      />
    )
  }

  return (
    <div className="container mx-auto py-2 px-2 sm:py-4 sm:px-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <Button
          variant="ghost"
          className="text-sm sm:text-base w-auto"
          onClick={handleBack}
        >
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={onUpdate} 
            className="text-sm w-full sm:w-auto"
          >
            <IconPencil className="h-4 w-4 mr-2" />
            Update Patient
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => onDelete(patient)} 
            className="text-sm w-full sm:w-auto"
          >
            <IconTrash className="h-4 w-4 mr-2" />
            Delete Patient
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 max-w-4xl mx-auto">
        {/* Basic Information Card */}
        <Card>
          <CardHeader className="pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {getGenderIcon(patient.gender)}
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl mb-1">
                  {patient.first_name} {patient.last_name}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 px-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Gender */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getGenderIcon(patient.gender)}
                  <h3 className="text-sm font-semibold">Gender</h3>
                </div>
                <p className="text-sm text-muted-foreground">{patient.gender}</p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconCalendar className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Date of Birth</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(patient.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Section */}
        <PatientReports 
          patient={patient}
          onViewReport={handleViewReport}
        />
      </div>
    </div>
  )
} 