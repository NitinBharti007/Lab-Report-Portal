import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { IconX, IconUpload, IconFileText, IconTrash, IconAlertCircle } from "@tabler/icons-react"
import { supabase } from '@/lib/supabaseClient'
import { Alert, AlertDescription } from "../../../components/ui/alert"
import { toast } from 'react-hot-toast'

const TEST_STATUSES = ["Sample Received", "Resample Required", "In Progress", "Ready"]
const TEST_TYPES = ["Blood", "Urine", "COVID-19", "DNA"]
const PROCESSING_LABS = ["Central Lab", "East Lab", "West Lab", "North Lab"]

export default function AddReportDialog({ isOpen, onClose, onSubmit, patient: initialPatient }) {
  const initialFormState = {
    testStatus: "",
    testType: "",
    associatedClinic: "",
    processingLab: "",
    sampleCollectionDate: null,
    datePickedUpByLab: null,
    dateShippedToLab: null,
    reportCompletionDate: null,
    invoice: "",
    documents: [],
    notes: ""
  }

  const [formData, setFormData] = useState(initialFormState)
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [associatedClinics, setAssociatedClinics] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData(initialFormState)
    setErrors({})
    setFormError("")
    setSelectedPatient(null)
    setAssociatedClinics([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetForm()
      fetchPatients()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedPatient) {
      fetchAssociatedClinics()
    }
  }, [selectedPatient])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.testStatus) {
      newErrors.testStatus = "Test status is required"
    }
    if (!formData.testType) {
      newErrors.testType = "Lab test type is required"
    }
    if (!formData.associatedClinic) {
      newErrors.associatedClinic = "Associated clinic is required"
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

  const generateReferenceId = async () => {
    try {
      if (!selectedPatient) {
        throw new Error('No patient selected')
      }

      // Get the latest report to find the highest reference ID
      const { data: latestReport, error } = await supabase
        .from('reports')
        .select('reference_id')
        .order('reference_id', { ascending: false })
        .limit(1)

      if (error) throw error

      let nextNumber = 1 // Default to 001 if no reports exist
      
      if (latestReport && latestReport.length > 0) {
        // Extract the number from the latest reference_id (e.g., "REP001" -> 1)
        const lastNumber = parseInt(latestReport[0].reference_id.replace(/[^0-9]/g, ''))
        nextNumber = lastNumber + 1
      }

      // Format the number with leading zeros (e.g., 1 -> "001")
      const paddedNumber = nextNumber.toString().padStart(3, '0')
      
      // Get first 3 letters of patient's first name and last name, uppercase
      const firstNameInitials = selectedPatient.first_name.slice(0, 3).toUpperCase()
      const lastNameInitials = selectedPatient.last_name.slice(0, 3).toUpperCase()
      
      return `REP${paddedNumber}-${firstNameInitials}${lastNameInitials}`
    } catch (error) {
      console.error('Error generating reference ID:', error)
      // Fallback to timestamp-based ID if there's an error
      const timestamp = new Date().getTime()
      const random = Math.floor(Math.random() * 1000)
      return `REP-${timestamp}-${random}`
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      // Get the latest report to find the highest invoice number
      const { data: latestReport, error } = await supabase
        .from('reports')
        .select('invoice_number')
        .order('invoice_number', { ascending: false })
        .limit(1)

      if (error) throw error

      let nextNumber = 1 // Default to INV001 if no reports exist
      
      if (latestReport && latestReport.length > 0 && latestReport[0].invoice_number) {
        // Extract the number from the latest invoice_number (e.g., "INV001" -> 1)
        const lastNumber = parseInt(latestReport[0].invoice_number.replace('INV', ''))
        nextNumber = lastNumber + 1
      }

      // Format the number with leading zeros (e.g., 1 -> "001")
      const paddedNumber = nextNumber.toString().padStart(3, '0')
      return `INV${paddedNumber}`
    } catch (error) {
      console.error('Error generating invoice number:', error)
      // Fallback to timestamp-based ID if there's an error
      const timestamp = new Date().getTime()
      const random = Math.floor(Math.random() * 1000)
      return `INV-${timestamp}-${random}`
    }
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

    if (!formData.associatedClinic) {
      setFormError("Please select an associated clinic")
      return
    }

    try {
      setIsSubmitting(true)
      const [referenceId, invoiceNumber] = await Promise.all([
        generateReferenceId(),
        generateInvoiceNumber()
      ])

      const reportData = {
        ...formData,
        patient_id: selectedPatient.id,
        clinic_id: formData.associatedClinic,
        reference_id: referenceId,
        invoice_number: invoiceNumber,
        testStatus: formData.testStatus,
        testType: formData.testType,
        processingLab: formData.processingLab,
        sampleCollectionDate: formData.sampleCollectionDate || null,
        datePickedUpByLab: formData.datePickedUpByLab || null,
        dateShippedToLab: formData.dateShippedToLab || null,
        reportCompletionDate: formData.reportCompletionDate || null,
        notes: formData.notes
      }

      await onSubmit(reportData)
      handleClose()
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setFormError(error.message || "Failed to generate report ID or invoice number. Please try again.")
      toast.error('Failed to add report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, reference_id')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAssociatedClinics = async () => {
    try {
      setIsLoading(true)
      
      if (!selectedPatient) {
        console.log('No patient selected')
        setAssociatedClinics([])
        return
      }

      console.log('Fetching clinics for patient:', selectedPatient.id)

      // First get the user's role and clinic_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, clinic_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        throw userError
      }

      console.log('User data:', userData)

      // Fetch all clinics
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, reference_id')
        .order('name')

      if (clinicsError) {
        console.error('Error fetching clinics:', clinicsError)
        throw clinicsError
      }

      console.log('Fetched all clinics:', clinics)
      setAssociatedClinics(clinics || [])

      /* Commented out associated clinics logic
      // For non-admin users, fetch clinics that have reports for this patient
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('clinic_id')
        .eq('patient_id', selectedPatient.id)

      if (reportsError) {
        console.error('Error fetching reports:', reportsError)
        throw reportsError
      }

      console.log('Found reports:', reports)

      let clinicIds = []
      if (reports && reports.length > 0) {
        clinicIds = reports.map(report => report.clinic_id)
      }

      console.log('Clinic IDs from reports:', clinicIds)

      // If user is not admin, only include their clinic if it's in the list
      if (userData.clinic_id) {
        if (!clinicIds.includes(userData.clinic_id)) {
          clinicIds = []
        } else {
          clinicIds = [userData.clinic_id]
        }
      }

      console.log('Final clinic IDs to fetch:', clinicIds)

      // If no clinics found, return empty array
      if (clinicIds.length === 0) {
        console.log('No clinics found for patient')
        setAssociatedClinics([])
        return
      }

      // Fetch clinic details for the found clinic IDs
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, reference_id')
        .in('id', clinicIds)

      if (clinicsError) {
        console.error('Error fetching clinics:', clinicsError)
        throw clinicsError
      }

      console.log('Fetched clinics:', clinics)
      setAssociatedClinics(clinics || [])
      */
    } catch (error) {
      console.error('Error in fetchAssociatedClinics:', error)
      setAssociatedClinics([])
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleChange = (field, value) => {
    // Convert date strings to Date objects or null
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
    // Clear error when field is updated
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-xl font-semibold">Add New Report</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection Section */}
            <div className="space-y-4 bg-muted/50 p-3 sm:p-4 rounded-lg">
              <h3 className="font-medium text-base sm:text-lg">Patient Information</h3>
              <div className="space-y-2">
                <Label>Select Patient <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedPatient?.id}
                  onValueChange={(value) => {
                    const patient = patients.find(p => p.id === value)
                    setSelectedPatient(patient)
                  }}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.reference_id} - {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Patient Reference ID</Label>
                  <Input
                    value={selectedPatient?.reference_id || ''}
                    disabled
                    className="bg-background w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input
                    value={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                    disabled
                    className="bg-background w-full"
                  />
                </div>
              </div>
            </div>

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

                <div className="space-y-2">
                  <Label htmlFor="invoice">Invoice Number</Label>
                  <Input
                    id="invoice"
                    value={formData.invoice}
                    onChange={(e) => handleChange("invoice", e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2 col-span-1 sm:col-span-2">
                  <Label htmlFor="associatedClinic">Associated Clinic <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.associatedClinic}
                    onValueChange={(value) => {
                      console.log('Selected clinic:', value)
                      handleChange("associatedClinic", value)
                    }}
                    required
                    disabled={isLoading || associatedClinics.length === 0}
                  >
                    <SelectTrigger className={`w-full ${errors.associatedClinic ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {isLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading clinics...
                        </SelectItem>
                      ) : associatedClinics.length === 0 ? (
                        <SelectItem value="no-clinics" disabled>
                          No clinics available for this patient
                        </SelectItem>
                      ) : (
                        associatedClinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.reference_id} - {clinic.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.associatedClinic && (
                    <p className="text-sm text-destructive">{errors.associatedClinic}</p>
                  )}
                  {!isLoading && associatedClinics.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      This patient has no associated clinics. Please add a report for this patient first.
                    </p>
                  )}
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
            onClick={handleClose}
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            className="w-full sm:w-auto"
            disabled={!formData.associatedClinic || isSubmitting}
            onClick={() => handleSubmit()}
          >
            {isSubmitting ? 'Adding Report...' : 'Add Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 