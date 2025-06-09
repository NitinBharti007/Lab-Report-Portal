import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"

const TEST_STATUS = [
  "Sample Received",
  "Resample Required",
  "In Progress",
  "Ready"
]

const TEST_TYPES = [
  "Blood",
  "Urine",
  "COVID-19",
  "DNA"
]

const PROCESSING_LABS = [
  "Central Lab",
  "East Lab",
  "West Lab",
  "North Lab"
]

export default function UpdateClinicReportDialog({ report, open, onOpenChange, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false)
  const [patients, setPatients] = useState([])
  const [clinics, setClinics] = useState([])
  const [formData, setFormData] = useState({
    status: "",
    lab_test_type: "",
    processing_lab: "",
    reference_id: "",
    invoice_number: "",
    sample_collection_date: "",
    date_picked_up_by_lab: "",
    date_shipped_to_lab: "",
    tracking_number: "",
    report_completion_date: "",
    notes: "",
    patient_id: "",
    clinic_id: ""
  })

  useEffect(() => {
    if (report) {
      const formData = {
        status: report.testStatus || "",
        lab_test_type: report.testType || "",
        processing_lab: report.processingLab || "",
        reference_id: report.referenceId || "",
        invoice_number: report.invoice || "",
        sample_collection_date: report.sampleCollectionDate || "",
        date_picked_up_by_lab: report.datePickedUpByLab || "",
        date_shipped_to_lab: report.dateShippedToLab || "",
        tracking_number: report.trackingNumber || "",
        report_completion_date: report.reportCompletionDate || "",
        notes: report.notes || "",
        patient_id: report.patient_id || "",
        clinic_id: report.clinic_id || ""
      }
      setFormData(formData)
    }
  }, [report])

  useEffect(() => {
    fetchPatients()
    fetchClinics()
  }, [])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, reference_id, first_name, last_name')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error('Failed to fetch patients')
    }
  }

  const fetchClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, reference_id, name')
        .order('name')

      if (error) throw error
      setClinics(data || [])
    } catch (error) {
      console.error('Error fetching clinics:', error)
      toast.error('Failed to fetch clinics')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Process form data
      const processedData = {
        ...formData,
        sample_collection_date: formData.sample_collection_date || null,
        date_picked_up_by_lab: formData.date_picked_up_by_lab || null,
        date_shipped_to_lab: formData.date_shipped_to_lab || null,
        report_completion_date: formData.report_completion_date || null
      }

      // Validate required fields
      if (!processedData.status || !processedData.patient_id || !processedData.clinic_id) {
        throw new Error('Please fill in all required fields')
      }

      // Update the report
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: processedData.status,
          patient_id: processedData.patient_id,
          clinic_id: processedData.clinic_id,
          lab_test_type: processedData.lab_test_type,
          processing_lab: processedData.processing_lab,
          invoice_number: processedData.invoice_number,
          sample_collection_date: processedData.sample_collection_date,
          date_picked_up_by_lab: processedData.date_picked_up_by_lab,
          date_shipped_to_lab: processedData.date_shipped_to_lab,
          tracking_number: processedData.tracking_number,
          report_completion_date: processedData.report_completion_date,
          notes: processedData.notes,
          pdf_url: processedData.pdf_url,
          last_modified: new Date().toISOString()
        })
        .eq('id', report.id)

      if (updateError) throw updateError

      // Fetch the updated report with patient information
      const { data: updatedReport, error: fetchError } = await supabase
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
          )
        `)
        .eq('id', report.id)
        .single()

      if (fetchError) throw fetchError

      // Transform the report data for the UI
      const transformedReport = {
        id: updatedReport.id,
        referenceId: updatedReport.reference_id,
        firstName: updatedReport.patients?.first_name || 'N/A',
        lastName: updatedReport.patients?.last_name || 'N/A',
        testStatus: updatedReport.status,
        testType: updatedReport.lab_test_type,
        processingLab: updatedReport.processing_lab,
        invoice: updatedReport.invoice_number,
        sampleCollectionDate: updatedReport.sample_collection_date,
        datePickedUpByLab: updatedReport.date_picked_up_by_lab,
        dateShippedToLab: updatedReport.date_shipped_to_lab,
        trackingNumber: updatedReport.tracking_number,
        reportCompletionDate: updatedReport.report_completion_date,
        notes: updatedReport.notes,
        pdfUrl: updatedReport.pdf_url,
        createdAt: updatedReport.created_at,
        lastModified: updatedReport.last_modified,
        patient_id: updatedReport.patient_id,
        clinic_id: updatedReport.clinic_id,
        associatedClinic: report.associatedClinic
      }

      onSuccess(transformedReport)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error(error.message || 'Failed to update report')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Test Status <span className="text-red-500">*</span></Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="patient">Patient <span className="text-red-500">*</span></Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, patient_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
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

            <div>
              <Label htmlFor="lab_test_type">Lab Test Type <span className="text-red-500">*</span></Label>
              <Select
                value={formData.lab_test_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, lab_test_type: value }))}
                required
              >
                <SelectTrigger>
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
            </div>

            <div>
              <Label htmlFor="processing_lab">Processing Lab <span className="text-red-500">*</span></Label>
              <Select
                value={formData.processing_lab}
                onValueChange={(value) => setFormData(prev => ({ ...prev, processing_lab: value }))}
                required
              >
                <SelectTrigger>
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
            </div>

            <div>
              <Label htmlFor="clinic">Associated Clinic <span className="text-red-500">*</span></Label>
              <Select
                value={formData.clinic_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, clinic_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.reference_id} - {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference_id">Reference ID</Label>
              <Input
                id="reference_id"
                value={formData.reference_id}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="sample_collection_date">Sample Collection Date</Label>
              <Input
                id="sample_collection_date"
                type="date"
                value={formatDateForInput(formData.sample_collection_date)}
                onChange={(e) => setFormData(prev => ({ ...prev, sample_collection_date: e.target.value || null }))}
              />
            </div>

            <div>
              <Label htmlFor="date_picked_up_by_lab">Date Picked Up by Lab <span className="text-red-500">*</span></Label>
              <Input
                id="date_picked_up_by_lab"
                type="date"
                value={formatDateForInput(formData.date_picked_up_by_lab)}
                onChange={(e) => setFormData(prev => ({ ...prev, date_picked_up_by_lab: e.target.value || null }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="date_shipped_to_lab">Date Shipped to Lab</Label>
              <Input
                id="date_shipped_to_lab"
                type="date"
                value={formatDateForInput(formData.date_shipped_to_lab)}
                onChange={(e) => setFormData(prev => ({ ...prev, date_shipped_to_lab: e.target.value || null }))}
              />
            </div>

            <div>
              <Label htmlFor="tracking_number">Tracking Number</Label>
              <Input
                id="tracking_number"
                value={formData.tracking_number}
                onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="report_completion_date">Report Completion Date</Label>
              <Input
                id="report_completion_date"
                type="date"
                value={formatDateForInput(formData.report_completion_date)}
                onChange={(e) => setFormData(prev => ({ ...prev, report_completion_date: e.target.value || null }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="flex-none gap-2 sm:gap-0 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Updating...' : 'Update Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 