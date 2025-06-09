import { useState } from "react"
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
import ReportUpdate from "./ReportUpdate"

export default function PatientView({ patient, onBack, onUpdate, onDelete }) {
  const [selectedReport, setSelectedReport] = useState(null)
  const [viewMode, setViewMode] = useState("patient") // "patient", "report", "update_from_table", or "update_from_view"
  const [reports, setReports] = useState([])

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
  }

  const handleUpdateFromTable = (report) => {
    setSelectedReport(report)
    setViewMode("update_from_table")
  }

  const handleUpdateFromView = (report) => {
    setSelectedReport(report)
    setViewMode("update_from_view")
  }

  const handleDeleteReport = (reportId) => {
    console.log("Delete report:", reportId)
  }

  const handleReportUpdateSubmit = (data) => {
    console.log("Update report:", data)
    // Here you would typically make an API call to update the report
    const updatedReport = { ...selectedReport, ...data }
    setSelectedReport(updatedReport)
    
    // Return to the appropriate view based on where the update was initiated
    if (viewMode === "update_from_table") {
      setViewMode("patient")
    } else {
      setViewMode("report")
    }
  }

  const handleBack = () => {
    if (viewMode === "update_from_table") {
      setViewMode("patient")
    } else if (viewMode === "update_from_view") {
      setViewMode("report")
    } else if (viewMode === "report") {
      setViewMode("patient")
    } else {
      onBack()
    }
  }

  if (viewMode === "update_from_table" && selectedReport) {
    return (
      <ReportUpdate 
        report={selectedReport}
        patient={patient}
        onBack={handleBack}
        onSubmit={handleReportUpdateSubmit}
        onCancel={handleBack}
        isTableUpdate={true}
      />
    )
  }

  if (viewMode === "update_from_view" && selectedReport) {
    return (
      <ReportUpdate 
        report={selectedReport}
        patient={patient}
        onBack={handleBack}
        onSubmit={handleReportUpdateSubmit}
        onCancel={handleBack}
        isTableUpdate={false}
      />
    )
  }

  if (viewMode === "report" && selectedReport) {
    return (
      <ReportDetails 
        report={selectedReport}
        patient={patient}
        onBack={handleBack}
        onUpdate={() => handleUpdateFromView(selectedReport)}
        onDelete={() => handleDeleteReport(selectedReport.id)}
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
                <CardDescription className="text-sm">
                  Reference ID: {patient.reference_id || 'Not assigned'}
                </CardDescription>
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
          onUpdateReport={handleUpdateFromTable}
          onDeleteReport={handleDeleteReport}
        />
      </div>
    </div>
  )
} 