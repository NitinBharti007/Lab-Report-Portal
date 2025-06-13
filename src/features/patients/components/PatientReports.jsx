import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { 
  IconSearch, 
  IconFileReport, 
  IconDownload,
  IconEye, 
  IconPencil, 
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconDotsVertical,
  IconArrowsSort,
  IconArrowUp,
  IconArrowDown
} from "@tabler/icons-react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"
import ReportForm from "./ReportForm"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const STATUS_TYPES = [
  "Sample Received",
  "Resample Required",
  "In Progress",
  "Ready"
]
const LAB_TEST_TYPES = [
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

export default function PatientReports({ patient, onViewReport, onUpdateReport, onDeleteReport }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    testStatus: "all",
    testType: "all",
    processingLab: "all"
  })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  })
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [patient.id])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
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
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to match the UI format - simplified for better performance
      const transformedReports = data.map(report => ({
        id: report.id,
        testStatus: report.status,
        clinic_id: report.clinic_id,
        associatedClinic: report.clinics?.name || 'N/A',
        testType: report.lab_test_type,
        processingLab: report.processing_lab,
        invoice: report.invoice_number,
        trackingNumber: report.tracking_number,
        notes: report.notes,
        pdfUrl: report.pdf_url,
        sampleCollectionDate: report.sample_collection_date,
        datePickedUpByLab: report.date_picked_up_by_lab,
        dateShippedToLab: report.date_shipped_to_lab,
        reportCompletionDate: report.report_completion_date || report.created_at
      }))

      setReports(transformedReports)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to fetch reports')
    } finally {
      setIsLoading(false)
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
        (report.associatedClinic || '').toLowerCase().includes(query) ||
        (report.testType || '').toLowerCase().includes(query) ||
        (report.processingLab || '').toLowerCase().includes(query) ||
        (report.invoice || '').toLowerCase().includes(query)
      )
    }

    // Apply filters
    if (filters.testStatus !== "all") {
      result = result.filter(report => (report.testStatus || '').toUpperCase() === filters.testStatus.toUpperCase())
    }
    if (filters.testType !== "all") {
      result = result.filter(report => (report.testType || '').toUpperCase() === filters.testType.toUpperCase())
    }
    if (filters.processingLab !== "all") {
      result = result.filter(report => (report.processingLab || '').toUpperCase() === filters.processingLab.toUpperCase())
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return result
  }, [reports, filters, sortConfig, searchQuery])

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-500"
      case "PROCESSING":
        return "bg-blue-500/10 text-blue-500"
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500"
      case "CANCELLED":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const handleAddReport = () => {
    setSelectedReport(null)
    setIsAddDialogOpen(true)
  }

  const handleUpdateReport = (report) => {
    // Transform the report data to match the form fields - simplified
    const transformedReport = {
      ...report,
      clinic_id: report.clinic_id,
      testStatus: report.testStatus,
      testType: report.testType,
      processingLab: report.processingLab,
      invoice: report.invoice,
      trackingNumber: report.trackingNumber,
      notes: report.notes || '',
      sampleCollectionDate: report.sampleCollectionDate,
      datePickedUpByLab: report.datePickedUpByLab,
      dateShippedToLab: report.dateShippedToLab,
      reportCompletionDate: report.reportCompletionDate
    }
    setSelectedReport(transformedReport)
    setIsUpdateDialogOpen(true)
  }

  const handleDeleteReport = async (reportId) => {
    setReportToDelete(reportId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!reportToDelete) return

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportToDelete)

      if (error) throw error

      // Remove the report from the local state
      setReports(prev => prev.filter(report => report.id !== reportToDelete))
      toast.success('Report deleted successfully')
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error(error.message || 'Failed to delete report')
    } finally {
      setIsDeleteDialogOpen(false)
      setReportToDelete(null)
    }
  }

  const handleAddReportSubmit = async (data) => {
    try {
      // First, get the clinic information
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', data.clinic_id)
        .single()

      if (clinicError) throw clinicError

      // Format dates for database
      const formatDate = (dateStr) => {
        if (!dateStr) return null
        try {
          const date = new Date(dateStr)
          return date.toISOString()
        } catch (error) {
          console.error('Error formatting date:', error)
          return null
        }
      }

      const { data: newReport, error } = await supabase
        .from('reports')
        .insert([{
          patient_id: patient.id,
          clinic_id: data.clinic_id,
          reference_id: data.reference_id,
          status: data.testStatus,
          lab_test_type: data.testType,
          processing_lab: data.processingLab,
          invoice_number: data.invoice,
          tracking_number: data.trackingNumber,
          notes: data.notes,
          sample_collection_date: formatDate(data.sampleCollectionDate),
          date_picked_up_by_lab: formatDate(data.datePickedUpByLab),
          date_shipped_to_lab: formatDate(data.dateShippedToLab),
          report_completion_date: formatDate(data.reportCompletionDate),
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString()
        }])
        .select(`
          id,
          reference_id,
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
            name
          )
        `)
        .single()

      if (error) {
        console.error('Error inserting report:', error)
        throw error
      }

      console.log('New report data:', newReport)

      // Transform the new report to match the UI format
      const transformedReport = {
        id: newReport.id,
        reference_id: newReport.reference_id,
        testStatus: newReport.status,
        associatedClinic: newReport.clinics?.name || 'N/A',
        testType: newReport.lab_test_type,
        reportCompletionDate: newReport.report_completion_date,
        sampleCollectionDate: newReport.sample_collection_date,
        datePickedUpByLab: newReport.date_picked_up_by_lab,
        dateShippedToLab: newReport.date_shipped_to_lab,
        processingLab: newReport.processing_lab,
        invoice: newReport.invoice_number,
        trackingNumber: newReport.tracking_number,
        notes: newReport.notes,
        pdfUrl: newReport.pdf_url,
        clinic_id: newReport.clinic_id
      }

      console.log('Transformed report:', transformedReport)

      // Update the reports list with the new report at the beginning
      setReports(prev => [transformedReport, ...prev])
      setIsAddDialogOpen(false)
      toast.success('Report added successfully')
    } catch (error) {
      console.error('Error adding report:', error)
      toast.error(error.message || 'Failed to add report')
    }
  }

  const handleUpdateReportSubmit = async (data) => {
    try {
      setIsLoading(true)
      const { data: updatedReport, error } = await supabase
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
        .single()

      if (error) throw error

      // Transform the updated report - simplified
      const transformedReport = {
        id: updatedReport.id,
        testStatus: updatedReport.status,
        clinic_id: updatedReport.clinic_id,
        associatedClinic: updatedReport.clinics?.name || 'N/A',
        testType: updatedReport.lab_test_type,
        processingLab: updatedReport.processing_lab,
        invoice: updatedReport.invoice_number,
        trackingNumber: updatedReport.tracking_number,
        notes: updatedReport.notes,
        pdfUrl: updatedReport.pdf_url,
        sampleCollectionDate: updatedReport.sample_collection_date,
        datePickedUpByLab: updatedReport.date_picked_up_by_lab,
        dateShippedToLab: updatedReport.date_shipped_to_lab,
        reportCompletionDate: updatedReport.report_completion_date
      }

      setReports(prev => prev.map(report => 
        report.id === selectedReport.id ? transformedReport : report
      ))
      setIsUpdateDialogOpen(false)
      toast.success('Report updated successfully')
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error(error.message || 'Failed to update report')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false)
  }

  const handleCancelUpdate = () => {
    setIsUpdateDialogOpen(false)
    setSelectedReport(null)
  }

  const handleExportReports = () => {
    // Define CSV headers
    const headers = [
      'ID',
      'Test Status',
      'Associated Clinic',
      'Test Type',
      'Report Completion Date',
      'Processing Lab',
      'Invoice',
      'Notes'
    ]

    // Convert report data to CSV rows
    const rows = filteredAndSortedReports.map(report => [
      report.id,
      report.testStatus,
      report.associatedClinic,
      report.testType,
      new Date(report.reportCompletionDate).toLocaleDateString(),
      report.processingLab,
      report.invoice,
      report.notes || 'N/A'
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `patient_${patient.id}_reports_export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <p>Loading reports...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 px-3 sm:px-6">
          <div>
            <CardTitle className="text-lg">Reports</CardTitle>
            <CardDescription className="text-sm">
              {filteredAndSortedReports.length} reports
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto" onClick={handleAddReport}>
              <IconFileReport className="h-4 w-4 mr-2" />
              Add Report
            </Button>
            <Button 
              onClick={handleExportReports} 
              variant="outline" 
              size="sm" 
              className="w-full sm:w-auto"
            >
              <IconDownload className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="border-t">
            {/* Search and Filters */}
            <div className="p-4 space-y-4 border-b">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reports by clinic, test type, or processing lab..."
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
                    {STATUS_TYPES.map((status) => (
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
                    <SelectItem value="all">All Test Types</SelectItem>
                    {LAB_TEST_TYPES.map((type) => (
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

            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {filteredAndSortedReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-lg font-medium text-muted-foreground">No reports found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {searchQuery || Object.values(filters).some(v => v !== 'all') 
                        ? 'Try adjusting your search or filters'
                        : 'Add your first report using the "Add Report" button above'}
                    </p>
                  </div>
                ) : (
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
                        onClick={() => handleSort('associatedClinic')}
                      >
                          <div className="flex items-center">
                          Associated Clinic
                            <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {getSortIcon('associatedClinic')}
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
                          <Badge className={getStatusColor(report.testStatus)}>
                            {report.testStatus}
                          </Badge>
                        </TableCell>
                          <TableCell className="whitespace-nowrap">{report.associatedClinic}</TableCell>
                          <TableCell className="whitespace-nowrap">{report.testType}</TableCell>
                          <TableCell className="whitespace-nowrap">
                          {new Date(report.reportCompletionDate).toLocaleDateString()}
                        </TableCell>
                          <TableCell className="whitespace-nowrap">{report.processingLab}</TableCell>
                          <TableCell className="whitespace-nowrap">{report.invoice}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <IconDotsVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onViewReport(report)}>
                                <IconEye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateReport(report)}>
                                <IconPencil className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteReport(report.id)}>
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
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Report Dialog */}
      <ReportForm
        patient={patient}
        onSubmit={handleAddReportSubmit}
        onCancel={handleCancelAdd}
        mode="add"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Update Report Dialog */}
      <ReportForm
        patient={patient}
        report={selectedReport}
        onSubmit={handleUpdateReportSubmit}
        onCancel={handleCancelUpdate}
        mode="update"
        open={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 