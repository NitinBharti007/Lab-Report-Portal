import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  IconArrowLeft,
  IconPencil,
  IconTrash,
  IconFileText
} from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import ReportForm from "./ReportForm"
import { useState } from "react"

export default function ReportDetails({ report, patient, onBack, onUpdate, onDelete }) {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/10 text-green-500"
      case "In Progress":
        return "bg-blue-500/10 text-blue-500"
      case "Pending":
        return "bg-yellow-500/10 text-yellow-500"
      case "Cancelled":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const handleUpdateSubmit = (data) => {
    onUpdate(data)
    setIsUpdateDialogOpen(false)
  }

  return (
    <div className="container mx-auto py-2 px-2 sm:py-4 sm:px-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <Button
          variant="ghost"
          className="text-sm sm:text-base w-auto"
          onClick={onBack}
        >
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setIsUpdateDialogOpen(true)} 
            className="text-sm w-full sm:w-auto"
          >
            <IconPencil className="h-4 w-4 mr-2" />
            Update Report
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDelete} 
            className="text-sm w-full sm:w-auto"
          >
            <IconTrash className="h-4 w-4 mr-2" />
            Delete Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 max-w-4xl mx-auto">
        {/* Patient and Test Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl mb-1">
                  {patient.first_name} {patient.last_name}
                </CardTitle>
                <CardDescription>
                  <Badge className={getStatusColor(report.testStatus)}>
                    {report.testStatus}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Clinic Name</h3>
                  <p className="text-sm text-muted-foreground">{report.associatedClinic}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Patient First Name</h3>
                  <p className="text-sm text-muted-foreground">{patient.first_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Patient Last Name</h3>
                  <p className="text-sm text-muted-foreground">{patient.last_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Processing Lab</h3>
                  <p className="text-sm text-muted-foreground">{report.processingLab}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Invoice #</h3>
                  <p className="text-sm text-muted-foreground">{report.invoice}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Sample Collection Date</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.sampleCollectionDate || report.reportCompletionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Date Picked Up by LabLink</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.datePickedUp || report.reportCompletionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Tracking Number</h3>
                  <p className="text-sm text-muted-foreground">{report.trackingNumber || "N/A"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Date Shipped to Lab</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.dateShipped || report.reportCompletionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Report Completion Date</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.reportCompletionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes and Report PDF */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {report.notes || "No notes available."}
              </p>
            </div>
            {report.reportPdf && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Report PDF</h3>
                <Button variant="outline" className="w-full sm:w-auto">
                  <IconFileText className="h-4 w-4 mr-2" />
                  View Report PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Report Dialog */}
      <ReportForm
        patient={patient}
        report={report}
        onSubmit={handleUpdateSubmit}
        onCancel={() => setIsUpdateDialogOpen(false)}
        mode="update"
        open={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
      />
    </div>
  )
} 