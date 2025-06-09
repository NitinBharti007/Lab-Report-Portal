import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  IconDotsVertical
} from "@tabler/icons-react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import ReportForm from "./ReportForm"

const STATUS_TYPES = ["Pending", "Processing", "Completed", "Cancelled"]
const LAB_TEST_TYPES = ["Blood", "Urine", "COVID-19", "DNA"]
const PROCESSING_LABS = ["Lab A", "Lab B", "Lab C"]

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

  useEffect(() => {
    fetchReports()
  }, [patient.id])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      console.log('Fetching reports for patient:', patient.id)
      
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          status,
          lab_test_type,
          processing_lab,
          created_at,
          invoice_number,
          notes,
          pdf_url,
          clinic_id,
          clinics!reports_clinic_id_fkey (
            name
          )
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Raw reports data:', data)

      // Transform the data to match the UI format
      const transformedReports = data.map(report => ({
        id: report.id,
        testStatus: report.status,
        associatedClinic: report.clinics?.name || 'N/A',
        testType: report.lab_test_type,
        reportCompletionDate: report.created_at,
        processingLab: report.processing_lab,
        invoice: report.invoice_number,
        notes: report.notes,
        pdfUrl: report.pdf_url
      }))

      console.log('Transformed reports:', transformedReports)
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

  const handleAddReport = () => {
    setSelectedReport(null)
    setIsAddDialogOpen(true)
  }

  const handleUpdateReport = (report) => {
    setSelectedReport(report)
    setIsUpdateDialogOpen(true)
  }

  const handleAddReportSubmit = async (data) => {
    try {
      const { data: newReport, error } = await supabase
        .from('reports')
        .insert([{
          patient_id: patient.id,
          status: data.testStatus,
          lab_test_type: data.testType,
          processing_lab: data.processingLab,
          invoice_number: data.invoice,
          notes: data.notes,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      // Refresh reports after adding
      await fetchReports()
      setIsAddDialogOpen(false)
      toast.success('Report added successfully')
    } catch (error) {
      console.error('Error adding report:', error)
      toast.error('Failed to add report')
    }
  }

  const handleUpdateReportSubmit = async (data) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: data.testStatus,
          lab_test_type: data.testType,
          processing_lab: data.processingLab,
          invoice_number: data.invoice,
          notes: data.notes
        })
        .eq('id', selectedReport.id)

      if (error) throw error

      // Refresh reports after updating
      await fetchReports()
      setIsUpdateDialogOpen(false)
      setSelectedReport(null)
      toast.success('Report updated successfully')
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error('Failed to update report')
    }
  }

  const handleDeleteReport = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (error) throw error

      // Refresh reports after deleting
      await fetchReports()
      toast.success('Report deleted successfully')
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
    }
  }

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false)
  }

  const handleCancelUpdate = () => {
    setIsUpdateDialogOpen(false)
    setSelectedReport(null)
  }

  const handleSort = (key) => {
    let direction = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const getSortedReports = (reports) => {
    if (!sortConfig.key) return reports

    return [...reports].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1
      }
      return 0
    })
  }

  const filteredReports = reports
    .filter(report => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          (report.associatedClinic || '').toLowerCase().includes(query) ||
          (report.testType || '').toLowerCase().includes(query) ||
          (report.processingLab || '').toLowerCase().includes(query) ||
          (report.invoice || '').toLowerCase().includes(query)
        )
      }
      return true
    })
    .filter(report => {
      if (filters.testStatus !== "all") {
        return (report.testStatus || '').toUpperCase() === filters.testStatus.toUpperCase()
      }
      return true
    })
    .filter(report => {
      if (filters.testType !== "all") {
        return (report.testType || '').toUpperCase() === filters.testType.toUpperCase()
      }
      return true
    })
    .filter(report => {
      if (filters.processingLab !== "all") {
        return (report.processingLab || '').toUpperCase() === filters.processingLab.toUpperCase()
      }
      return true
    })

  const sortedReports = getSortedReports(filteredReports)

  const getStatusColor = (status) => {
    switch (status) {
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
    const rows = filteredReports.map(report => [
      report.id,
      report.testStatus,
      report.associatedClinic,
      report.testType,
      new Date(report.reportCompletionDate).toLocaleDateString(),
      report.processingLab,
      report.invoice || 'N/A',
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
      <Card className="w-full overflow-auto">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 px-3 sm:px-6">
          <div>
            <CardTitle className="text-lg">Reports</CardTitle>
            <p className="text-sm text-muted-foreground">
              {sortedReports.length} reports
            </p>
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
              Export Reports
            </Button>
          </div>
        </CardHeader>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('testStatus')}
                      >
                        <div className="flex items-center gap-1">
                          Test Status
                          {sortConfig.key === 'testStatus' && (
                            sortConfig.direction === 'ascending' 
                              ? <IconChevronUp className="h-4 w-4" />
                              : <IconChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('associatedClinic')}
                      >
                        <div className="flex items-center gap-1">
                          Associated Clinic
                          {sortConfig.key === 'associatedClinic' && (
                            sortConfig.direction === 'ascending' 
                              ? <IconChevronUp className="h-4 w-4" />
                              : <IconChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('testType')}
                      >
                        <div className="flex items-center gap-1">
                          Test Type
                          {sortConfig.key === 'testType' && (
                            sortConfig.direction === 'ascending' 
                              ? <IconChevronUp className="h-4 w-4" />
                              : <IconChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('reportCompletionDate')}
                      >
                        <div className="flex items-center gap-1">
                          Report Completion Date
                          {sortConfig.key === 'reportCompletionDate' && (
                            sortConfig.direction === 'ascending' 
                              ? <IconChevronUp className="h-4 w-4" />
                              : <IconChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('processingLab')}
                      >
                        <div className="flex items-center gap-1">
                          Processing Lab
                          {sortConfig.key === 'processingLab' && (
                            sortConfig.direction === 'ascending' 
                              ? <IconChevronUp className="h-4 w-4" />
                              : <IconChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('invoice')}
                      >
                        <div className="flex items-center gap-1">
                          Invoice
                          {sortConfig.key === 'invoice' && (
                            sortConfig.direction === 'ascending' 
                              ? <IconChevronUp className="h-4 w-4" />
                              : <IconChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge className={getStatusColor(report.testStatus)}>
                            {report.testStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.associatedClinic}</TableCell>
                        <TableCell>{report.testType}</TableCell>
                        <TableCell>
                          {new Date(report.reportCompletionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{report.processingLab}</TableCell>
                        <TableCell>{report.invoice}</TableCell>
                        <TableCell className="text-right">
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
    </>
  )
} 