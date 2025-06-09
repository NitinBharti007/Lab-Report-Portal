import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  IconMapPin, 
  IconMail, 
  IconEdit, 
  IconUserPlus, 
  IconFileReport, 
  IconArrowLeft, 
  IconEye, 
  IconPencil, 
  IconTrash, 
  IconArrowUp, 
  IconArrowDown, 
  IconArrowsSort,
  IconSearch
} from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useState, useMemo, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"
import ClinicReportDetails from "./ClinicReportDetails"
import UpdateClinicReportDialog from "./UpdateClinicReportDialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import ContactForm from "./ContactForm"

const TEST_TYPES = ["Blood", "Urine", "COVID-19", "DNA"]

const TEST_STATUS = ["Sample Received", "Resample Required", "In Progress", "Ready"]

const PROCESSING_LABS = ["Central Lab", "East Lab", "West Lab", "North Lab"]

export default function ClinicDetails({ 
  clinic: initialClinic, 
  onBack, 
  onEditClinic, 
  onAddContact, 
  onAddReport,
  onUpdateReport
}) {
  const [clinic, setClinic] = useState(initialClinic)
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [viewMode, setViewMode] = useState("list")
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [filters, setFilters] = useState({
    testStatus: "all",
    testType: "all",
    processingLab: "all"
  })

  const [searchQuery, setSearchQuery] = useState("")

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  })

  const [showContactForm, setShowContactForm] = useState(false)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (clinic.reports) {
      setReports(clinic.reports)
      setIsLoading(false)
    } else {
      fetchReports()
    }
  }, [clinic])

  // Add new useEffect to handle report updates
  useEffect(() => {
    if (clinic.reports) {
      setReports(clinic.reports)
    }
  }, [clinic.reports])

  useEffect(() => {
    if (viewMode === "view" && selectedReport) {
      const updatedReport = reports.find(r => r.id === selectedReport.id)
      if (updatedReport) {
        setSelectedReport(updatedReport)
      }
    }
  }, [reports, viewMode])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      
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
          )
        `)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      const transformedReports = data.map(report => ({
        id: report.id,
        referenceId: report.reference_id,
        firstName: report.patients?.first_name || 'N/A',
        lastName: report.patients?.last_name || 'N/A',
        testStatus: report.status,
        testType: report.lab_test_type,
        processingLab: report.processing_lab,
        invoice: report.invoice_number,
        sampleCollectionDate: report.sample_collection_date,
        datePickedUpByLab: report.date_picked_up_by_lab,
        dateShippedToLab: report.date_shipped_to_lab,
        trackingNumber: report.tracking_number,
        reportCompletionDate: report.report_completion_date,
        notes: report.notes,
        pdfUrl: report.pdf_url,
        createdAt: report.created_at,
        lastModified: report.last_modified,
        patient_id: report.patient_id,
        clinic_id: report.clinic_id,
        associatedClinic: clinic.name
      }))

      setReports(transformedReports)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to fetch reports')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewReport = (reportId) => {
    const report = reports.find(r => r.id === reportId)
    if (report) {
      setSelectedReport(report)
      setViewMode("view")
    }
  }

  const handleUpdateReport = (reportId) => {
    const report = reports.find(r => r.id === reportId)
    if (report) {
      setSelectedReport(report)
      setIsUpdateDialogOpen(true)
    }
  }

  const handleUpdateSuccess = async (updatedReport) => {
    setIsUpdateDialogOpen(false)
    
    try {
      // Fetch all reports for the clinic to ensure we have the complete list
      const { data: allReports, error: fetchError } = await supabase
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
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Transform all reports for the UI
      const transformedReports = allReports.map(report => ({
        id: report.id,
        referenceId: report.reference_id,
        firstName: report.patients?.first_name || 'N/A',
        lastName: report.patients?.last_name || 'N/A',
        testStatus: report.status,
        testType: report.lab_test_type,
        processingLab: report.processing_lab,
        invoice: report.invoice_number,
        sampleCollectionDate: report.sample_collection_date,
        datePickedUpByLab: report.date_picked_up_by_lab,
        dateShippedToLab: report.date_shipped_to_lab,
        trackingNumber: report.tracking_number,
        reportCompletionDate: report.report_completion_date,
        notes: report.notes,
        pdfUrl: report.pdf_url,
        createdAt: report.created_at,
        lastModified: report.last_modified,
        patient_id: report.patient_id,
        clinic_id: report.clinic_id,
        associatedClinic: clinic.name
      }))

      // Update the reports list immediately
      setReports(transformedReports)

      // If in view mode, update the selected report
      if (viewMode === "view" && selectedReport) {
        const updatedSelectedReport = transformedReports.find(r => r.id === selectedReport.id)
        if (updatedSelectedReport) {
          setSelectedReport(updatedSelectedReport)
        }
      }

      // Notify parent component about the update with all reports
      if (onUpdateReport) {
        onUpdateReport(transformedReports.find(r => r.id === updatedReport.id))
      }

      // Only show success message if we're in view mode
      if (viewMode === "view") {
        toast.success('Report updated successfully')
      }
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error('Failed to update report')
    }
  }

  const handleDeleteReport = async (report) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', report.id)

      if (error) throw error

      // Update the reports list
      setReports(prev => prev.filter(r => r.id !== report.id))
      
      // If in view mode and the deleted report is selected, go back to list view
      if (viewMode === "view" && selectedReport?.id === report.id) {
        setSelectedReport(null)
        setViewMode("list")
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
    }
  }

  const handleBackFromReport = async () => {
    try {
      // Fetch fresh data when returning to list view
      const { data: allReports, error: fetchError } = await supabase
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
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Transform all reports for the UI
      const transformedReports = allReports.map(report => ({
        id: report.id,
        referenceId: report.reference_id,
        firstName: report.patients?.first_name || 'N/A',
        lastName: report.patients?.last_name || 'N/A',
        testStatus: report.status,
        testType: report.lab_test_type,
        processingLab: report.processing_lab,
        invoice: report.invoice_number,
        sampleCollectionDate: report.sample_collection_date,
        datePickedUpByLab: report.date_picked_up_by_lab,
        dateShippedToLab: report.date_shipped_to_lab,
        trackingNumber: report.tracking_number,
        reportCompletionDate: report.report_completion_date,
        notes: report.notes,
        pdfUrl: report.pdf_url,
        createdAt: report.created_at,
        lastModified: report.last_modified,
        patient_id: report.patient_id,
        clinic_id: report.clinic_id,
        associatedClinic: clinic.name
      }))

      // Update the reports list with fresh data
      setReports(transformedReports)

      // Notify parent component about the update
      if (onUpdateReport) {
        onUpdateReport(transformedReports[0]) // Pass the first report to trigger parent update
      }

      setSelectedReport(null)
      setViewMode("list")
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to update reports list')
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }))
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <IconArrowsSort className="h-4 w-4 ml-1" />
    return sortConfig.direction === 'ascending' 
      ? <IconArrowUp className="h-4 w-4 ml-1" />
      : <IconArrowDown className="h-4 w-4 ml-1" />
  }

  const filteredAndSortedReports = useMemo(() => {
    let result = [...reports]

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(report => 
        report.firstName.toLowerCase().includes(query) ||
        report.lastName.toLowerCase().includes(query) ||
        report.testType.toLowerCase().includes(query) ||
        report.processingLab.toLowerCase().includes(query) ||
        report.invoice.toLowerCase().includes(query)
      )
    }

    // Apply filters
    if (filters.testStatus !== "all") {
      result = result.filter(report => report.testStatus === filters.testStatus)
    }
    if (filters.testType !== "all") {
      result = result.filter(report => report.testType === filters.testType)
    }
    if (filters.processingLab !== "all") {
      result = result.filter(report => report.processingLab === filters.processingLab)
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return result
  }, [reports, filters, sortConfig, searchQuery])

  const formatDate = (date) => {
    if (!date) return 'N/A'
    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) return 'N/A'
      return dateObj.toLocaleDateString()
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'N/A'
    }
  }

  const handleDeleteClick = (report) => {
    setReportToDelete(report)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return

    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportToDelete.id)

      if (error) throw error

      // Update the reports list
      setReports(prev => prev.filter(report => report.id !== reportToDelete.id))
      
      // If in view mode and the deleted report is selected, go back to list view
      if (viewMode === "view" && selectedReport?.id === reportToDelete.id) {
        setSelectedReport(null)
        setViewMode("list")
      }
      
      // Show success message only after successful deletion
      toast.success('Report deleted successfully')
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setReportToDelete(null)
    }
  }

  const handleAddReport = async (reportData) => {
    try {
      // Generate reference ID and invoice number
      const { data: latestReport } = await supabase
        .from('reports')
        .select('reference_id, invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const referenceId = latestReport?.reference_id 
        ? `REF${(parseInt(latestReport.reference_id.slice(3)) + 1).toString().padStart(6, '0')}`
        : 'REF000001'

      const invoiceNumber = latestReport?.invoice_number
        ? `INV${(parseInt(latestReport.invoice_number.slice(3)) + 1).toString().padStart(6, '0')}`
        : 'INV000001'

      // Insert the new report
      const { data: newReport, error } = await supabase
        .from('reports')
        .insert({
          reference_id: referenceId,
          status: reportData.testStatus,
          patient_id: reportData.patient_id,
          clinic_id: clinic.id,
          lab_test_type: reportData.testType,
          processing_lab: reportData.processingLab,
          invoice_number: invoiceNumber,
          sample_collection_date: reportData.sampleCollectionDate,
          date_picked_up_by_lab: reportData.datePickedUpByLab,
          date_shipped_to_lab: reportData.dateShippedToLab,
          tracking_number: reportData.trackingNumber,
          report_completion_date: reportData.reportCompletionDate,
          notes: reportData.notes,
          pdf_url: reportData.pdfUrl
        })
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
        .single()

      if (error) throw error

      // Transform the report data for the UI
      const transformedReport = {
        id: newReport.id,
        referenceId: newReport.reference_id,
        firstName: newReport.patients?.first_name || 'N/A',
        lastName: newReport.patients?.last_name || 'N/A',
        testStatus: newReport.status,
        testType: newReport.lab_test_type,
        processingLab: newReport.processing_lab,
        invoice: newReport.invoice_number,
        sampleCollectionDate: newReport.sample_collection_date,
        datePickedUpByLab: newReport.date_picked_up_by_lab,
        dateShippedToLab: newReport.date_shipped_to_lab,
        trackingNumber: newReport.tracking_number,
        reportCompletionDate: newReport.report_completion_date,
        notes: newReport.notes,
        pdfUrl: newReport.pdf_url,
        createdAt: newReport.created_at,
        lastModified: newReport.last_modified,
        patient_id: newReport.patient_id,
        clinic_id: newReport.clinic_id,
        associatedClinic: clinic.name
      }

      // Update the reports list by adding the new report at the beginning
      setReports(prev => [transformedReport, ...prev])
      toast.success('Report added successfully')
    } catch (error) {
      console.error('Error adding report:', error)
      toast.error('Failed to add report')
    }
  }

  const handleAddContact = async (contactData) => {
    try {
      // Generate a new UUID for the contact
      const contactId = crypto.randomUUID()

      // Update the clinic's contact_ids array with the new contact ID
      const updatedContactIds = [...(clinic.contact_ids || []), contactId]
      const { error: updateError } = await supabase
        .from('clinics')
        .update({ 
          contact_ids: updatedContactIds,
          last_modified: new Date().toISOString()
        })
        .eq('id', clinic.id)

      if (updateError) {
        console.error('Error updating clinic:', updateError)
        throw updateError
      }

      // Update local state
      setClinic(prev => ({
        ...prev,
        contact_ids: updatedContactIds
      }))

      // Add to contacts list with the new contact data
      const newContact = {
        id: contactId,
        name: contactData.name,
        email: contactData.email,
        role: contactData.role,
        clinic_id: clinic.id
      }
      setContacts(prev => [...prev, newContact])

      toast.success("Contact added successfully")
      setShowContactForm(false)
    } catch (error) {
      console.error('Error adding contact:', error)
      toast.error("Failed to add contact")
    }
  }

  if (viewMode === "view" && selectedReport) {
    return (
      <div className="container mx-auto py-2 px-2 sm:py-4 sm:px-4">
        <ClinicReportDetails
          report={selectedReport}
          onBack={handleBackFromReport}
          onUpdate={handleUpdateReport}
          onDelete={handleDeleteReport}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-2 px-2 sm:py-4 sm:px-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <Button
          variant="ghost"
          className="text-sm sm:text-base"
          onClick={onBack}
        >
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back to Clinics
        </Button>
        <Button variant="outline" onClick={onEditClinic} className="text-sm w-full sm:w-auto">
          <IconEdit className="h-4 w-4 mr-2" />
          Edit Clinic
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 max-w-4xl mx-auto">
        {/* Basic Information Card */}
        <Card>
          <CardHeader className="pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                <AvatarImage src={clinic.logo_url} />
                <AvatarFallback className="text-lg">{clinic.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl sm:text-2xl mb-1">{clinic.name}</CardTitle>
                <CardDescription className="text-sm">
                  Reference ID: {clinic.reference_id}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 px-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Region */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconMapPin className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Region</h3>
                </div>
                <p className="text-sm text-muted-foreground">{clinic.region}</p>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconMapPin className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Address</h3>
                </div>
                <p className="text-sm text-muted-foreground">{clinic.address}</p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconMail className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Email</h3>
                </div>
                <p className="text-sm text-muted-foreground break-all">{clinic.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Section */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 px-3 sm:px-6">
            <div>
              <CardTitle className="text-lg">Contacts</CardTitle>
              <CardDescription className="text-sm">
                {clinic.contact_ids?.length || 0} contacts
              </CardDescription>
            </div>
            <Button onClick={() => setShowContactForm(true)} size="sm" className="w-full sm:w-auto">
              <IconUserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 px-3 sm:px-6">
            {clinic.contact_ids?.length > 0 ? (
              <div className="grid gap-3">
                {clinic.contact_ids.map((contactId) => (
                  <div key={contactId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Contact ID</p>
                      <p className="text-sm text-muted-foreground">{contactId}</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No contacts added yet.</p>
                <Button onClick={() => setShowContactForm(true)} variant="link" className="mt-2">
                  Add your first contact
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports Section */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 px-3 sm:px-6">
            <div>
              <CardTitle className="text-lg">Reports</CardTitle>
              <CardDescription className="text-sm">
                {isLoading ? "Loading..." : `${filteredAndSortedReports.length} reports`}
              </CardDescription>
            </div>
            <Button onClick={onAddReport} size="sm" className="w-full sm:w-auto">
              <IconFileReport className="h-4 w-4 mr-2" />
              Add Report
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <div className="border-t">
              {/* Search and Filters */}
              <div className="p-4 space-y-4 border-b">
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select
                    value={filters.testStatus}
                    onValueChange={(value) => handleFilterChange('testStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Test Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {TEST_STATUS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.testType}
                    onValueChange={(value) => handleFilterChange('testType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Test Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {TEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.processingLab}
                    onValueChange={(value) => handleFilterChange('processingLab', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Processing Lab" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Labs</SelectItem>
                      {PROCESSING_LABS.map((lab) => (
                        <SelectItem key={lab} value={lab}>
                          {lab}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Loading reports...</p>
                </div>
              ) : filteredAndSortedReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-lg font-medium text-muted-foreground">No reports found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchQuery || Object.values(filters).some(v => v !== 'all') 
                      ? 'Try adjusting your search or filters'
                      : 'Add your first report using the "Add Report" button above'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="whitespace-nowrap cursor-pointer group"
                            onClick={() => handleSort('testStatus')}
                          >
                            <div className="flex items-center">
                              Test Status
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSortIcon('testStatus')}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className="whitespace-nowrap cursor-pointer group"
                            onClick={() => handleSort('lastName')}
                          >
                            <div className="flex items-center">
                              Last Name
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSortIcon('lastName')}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className="whitespace-nowrap cursor-pointer group"
                            onClick={() => handleSort('firstName')}
                          >
                            <div className="flex items-center">
                              First Name
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSortIcon('firstName')}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className="whitespace-nowrap cursor-pointer group"
                            onClick={() => handleSort('testType')}
                          >
                            <div className="flex items-center">
                              Test Type
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSortIcon('testType')}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className="whitespace-nowrap cursor-pointer group"
                            onClick={() => handleSort('reportCompletionDate')}
                          >
                            <div className="flex items-center">
                              Completion Date
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSortIcon('reportCompletionDate')}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className="whitespace-nowrap cursor-pointer group"
                            onClick={() => handleSort('processingLab')}
                          >
                            <div className="flex items-center">
                              Processing Lab
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSortIcon('processingLab')}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead 
                            className="whitespace-nowrap cursor-pointer group"
                            onClick={() => handleSort('invoice')}
                          >
                            <div className="flex items-center">
                              Invoice
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSortIcon('invoice')}
                              </span>
                            </div>
                          </TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={
                                report.testStatus === "Completed" ? "success" :
                                report.testStatus === "In Progress" ? "warning" :
                                report.testStatus === "Cancelled" ? "destructive" :
                                "secondary"
                              }>
                                {report.testStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{report.lastName}</TableCell>
                            <TableCell className="whitespace-nowrap">{report.firstName}</TableCell>
                            <TableCell className="whitespace-nowrap">{report.testType}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(report.reportCompletionDate)}</TableCell>
                            <TableCell className="whitespace-nowrap">{report.processingLab}</TableCell>
                            <TableCell className="whitespace-nowrap">{report.invoice}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <IconPencil className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewReport(report.id)}>
                                    <IconEye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateReport(report.id)}>
                                    <IconPencil className="h-4 w-4 mr-2" />
                                    Update
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteClick(report)}>
                                    <IconTrash className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Dialog */}
      {selectedReport && (
        <UpdateClinicReportDialog
          report={selectedReport}
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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

      {/* Add ContactForm component */}
      <ContactForm
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
        onSubmit={handleAddContact}
      />
    </div>
  )
} 