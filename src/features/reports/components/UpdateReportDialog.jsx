import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { IconAlertCircle, IconUpload, IconFileText, IconTrash } from "@tabler/icons-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from 'react-hot-toast'

const TEST_STATUSES = ["Sample Received", "Resample Required", "In Progress", "Ready"]
const TEST_TYPES = ["Blood", "Urine", "COVID-19", "DNA"]
const PROCESSING_LABS = ["Central Lab", "East Lab", "West Lab", "North Lab"]

export default function UpdateReportDialog({ isOpen, onClose, onSubmit, report }) {
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (report) {
      setFormData({
        testStatus: report.testStatus || "",
        testType: report.testType || "",
        processingLab: report.processingLab || "",
        sampleCollectionDate: report.sampleCollectionDate ? new Date(report.sampleCollectionDate) : null,
        datePickedUpByLab: report.datePickedUpByLab ? new Date(report.datePickedUpByLab) : null,
        dateShippedToLab: report.dateShippedToLab ? new Date(report.dateShippedToLab) : null,
        reportCompletionDate: report.reportCompletionDate ? new Date(report.reportCompletionDate) : null,
        notes: report.notes || "",
        documents: report.documents || []
      })
    }
  }, [report, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setFormData({
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
      setErrors({})
      setFormError("")
      setIsSubmitting(false)
    }
  }, [isOpen])

  const formatDateForInput = (date) => {
    if (!date) return ''
    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) return ''
      return dateObj.toISOString().split('T')[0]
    } catch (error) {
      console.error('Error formatting date:', error)
      return ''
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.testStatus) {
      newErrors.testStatus = "Test status is required"
    }
    if (!formData.testType) {
      newErrors.testType = "Lab test type is required"
    }
    if (!formData.processingLab) {
      newErrors.processingLab = "Processing lab is required"
    }
    if (!formData.datePickedUpByLab) {
      newErrors.datePickedUpByLab = "Date picked up by lab is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field, value) => {
    let processedValue = value
    if (field.includes('Date') && value) {
      try {
        const dateObj = new Date(value)
        if (!isNaN(dateObj.getTime())) {
          processedValue = dateObj
        } else {
          processedValue = null
        }
      } catch (error) {
        console.error('Error processing date:', error)
        processedValue = null
      }
    } else if (field.includes('Date') && !value) {
      processedValue = null
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...files]
    }))
  }

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault()
    }
    setFormError("")

    if (!validateForm()) {
      setFormError("Please fill in all required fields")
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        ...report,
        testStatus: formData.testStatus,
        testType: formData.testType,
        processingLab: formData.processingLab,
        sampleCollectionDate: formData.sampleCollectionDate,
        datePickedUpByLab: formData.datePickedUpByLab,
        dateShippedToLab: formData.dateShippedToLab,
        reportCompletionDate: formData.reportCompletionDate,
        notes: formData.notes,
        documents: formData.documents
      })
      onClose()
    } catch (error) {
      console.error('Error updating report:', error)
      setFormError(error.message || "Failed to update report. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-xl font-semibold">Update Report</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Report Details Section */}
            <div className="space-y-4 bg-muted/50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-medium text-base sm:text-lg">Report Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testStatus">Test Status <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.testStatus}
                    onValueChange={(value) => handleChange("testStatus", value)}
                    required
                  >
                    <SelectTrigger className={`w-full ${errors.testStatus ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.testStatus && (
                    <p className="text-sm text-destructive">{errors.testStatus}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testType">Lab Test Type <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.testType}
                    onValueChange={(value) => handleChange("testType", value)}
                    required
                  >
                    <SelectTrigger className={`w-full ${errors.testType ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.testType && (
                    <p className="text-sm text-destructive">{errors.testType}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processingLab">Processing Lab <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.processingLab}
                    onValueChange={(value) => handleChange("processingLab", value)}
                    required
                  >
                    <SelectTrigger className={`w-full ${errors.processingLab ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESSING_LABS.map((lab) => (
                        <SelectItem key={lab} value={lab}>
                          {lab}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.processingLab && (
                    <p className="text-sm text-destructive">{errors.processingLab}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleCollectionDate">Sample Collection Date</Label>
                  <Input
                    id="sampleCollectionDate"
                    type="date"
                    value={formatDateForInput(formData.sampleCollectionDate)}
                    onChange={(e) => handleChange("sampleCollectionDate", e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="datePickedUpByLab">Date Picked Up by Lab <span className="text-destructive">*</span></Label>
                  <Input
                    id="datePickedUpByLab"
                    type="date"
                    value={formatDateForInput(formData.datePickedUpByLab)}
                    onChange={(e) => handleChange("datePickedUpByLab", e.target.value)}
                    required
                    className={`w-full ${errors.datePickedUpByLab ? "border-destructive" : ""}`}
                  />
                  {errors.datePickedUpByLab && (
                    <p className="text-sm text-destructive">{errors.datePickedUpByLab}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateShippedToLab">Date Shipped to Lab</Label>
                  <Input
                    id="dateShippedToLab"
                    type="date"
                    value={formatDateForInput(formData.dateShippedToLab)}
                    onChange={(e) => handleChange("dateShippedToLab", e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportCompletionDate">Report Completion Date</Label>
                  <Input
                    id="reportCompletionDate"
                    type="date"
                    value={formatDateForInput(formData.reportCompletionDate)}
                    onChange={(e) => handleChange("reportCompletionDate", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4 bg-muted/50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-medium text-base sm:text-lg">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes or comments about the report..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  className="min-h-[100px] resize-none w-full"
                />
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="space-y-4 bg-muted/50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-medium text-base sm:text-lg">Report Documents</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="documents"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted/80"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <IconUpload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground text-center px-4">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground text-center px-4">
                        PDF, DOC, DOCX, or images (MAX. 10MB)
                      </p>
                    </div>
                    <input
                      id="documents"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,image/*"
                    />
                  </label>
                </div>

                {/* File List */}
                {formData.documents.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {formData.documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-background"
                      >
                        <div className="flex items-center gap-2">
                          <IconFileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">
                            {file.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index)}
                          className="h-8 w-8"
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="flex-none gap-2 sm:gap-0 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            onClick={() => handleSubmit()}
          >
            {isSubmitting ? 'Updating Report...' : 'Update Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 