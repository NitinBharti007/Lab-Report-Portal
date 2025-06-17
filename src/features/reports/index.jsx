import { useState, useEffect } from "react"
import PageLayout from "@/components/layouts/PageLayout"
import { Card } from "@/components/ui/card"
import { Loader } from "@/components/shared/loader"
import ReportsHeader from "./components/ReportsHeader"
import ReportsFilters from "./components/ReportsFilters"
import ReportsTable from "./components/ReportsTable"
import ReportDetails from "./components/ReportDetails"
import AddReportDialog from "./components/AddReportDialog"
import UpdateReportDialog from "./components/UpdateReportDialog"
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { Button } from "@/components/ui/button"

export default function Reports() {
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [allReports, setAllReports] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    testStatus: "all",
    testType: "all",
    processingLab: "all"
  })
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  })
  const [selectedReport, setSelectedReport] = useState(null)
  const [viewMode, setViewMode] = useState("list")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  })
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    console.log('Component mounted, fetching reports...')
    fetchReports()
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    if (allReports.length > 0) {
      let filteredReports = allReports.filter(report => {
        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const matchesSearch = 
            (report.reference_id || '').toLowerCase().includes(query) ||
            (report.firstName || '').toLowerCase().includes(query) ||
            (report.lastName || '').toLowerCase().includes(query) ||
            (report.associatedClinic || '').toLowerCase().includes(query) ||
            (report.testType || '').toLowerCase().includes(query) ||
            (report.processingLab || '').toLowerCase().includes(query) ||
            (report.invoice_number || '').toLowerCase().includes(query)
          
          if (!matchesSearch) return false
        }

        // Apply other filters
        if (filters.testStatus !== 'all') {
          const reportStatus = report.testStatus?.toUpperCase()
          const filterStatus = filters.testStatus.toUpperCase()
          if (reportStatus !== filterStatus) {
            return false
          }
        }
        if (filters.testType !== 'all') {
          const reportType = report.testType?.toUpperCase()
          const filterType = filters.testType.toUpperCase()
          if (reportType !== filterType) {
            return false
          }
        }
        if (filters.processingLab !== 'all') {
          const reportLab = report.processingLab?.toUpperCase()
          const filterLab = filters.processingLab.toUpperCase()
          if (reportLab !== filterLab) {
            return false
          }
        }
        return true
      })

      const sortedReports = [...filteredReports].sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        if (sortConfig.key === 'firstName') {
          aValue = a.firstName
          bValue = b.firstName
        } else if (sortConfig.key === 'lastName') {
          aValue = a.lastName
          bValue = b.lastName
        } else if (sortConfig.key === 'associatedClinic') {
          aValue = a.associatedClinic
          bValue = b.associatedClinic
        }

        if (aValue === null) return 1
        if (bValue === null) return -1

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })

      setPagination(prev => ({ ...prev, total: filteredReports.length }))

      const start = (pagination.page - 1) * pagination.pageSize
      const end = start + pagination.pageSize
      setReports(sortedReports.slice(start, end))

      if (sortedReports.length === 0 && filteredReports.length > 0) {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    }
  }, [sortConfig, allReports, filters, searchQuery, pagination.page, pagination.pageSize])

  // Handle direct URL visits and browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const reportIdMatch = path.match(/\/reports\/(\d+)/)
      
      if (reportIdMatch) {
        const reportId = reportIdMatch[1]
        const report = allReports.find(r => r.id === reportId)
        if (report) {
          setSelectedReport(report)
          setViewMode("view")
        } else {
          // If report not found, go back to list view
          setViewMode("list")
          setSelectedReport(null)
        }
      } else {
        setViewMode("list")
        setSelectedReport(null)
      }
    }

    // Handle initial load
    handlePopState()

    // Add event listener for browser navigation
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [allReports])

  const fetchReports = async () => {
    try {
      console.log('Starting fetchReports...')
      setIsLoading(true)
      setError(null)
      
      if (!user) {
        console.log('No user found')
        toast.error('Please log in to view reports')
        return
      }

      console.log('Fetching user data...')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, clinic_id')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error checking user role:', userError)
        throw userError
      }

      console.log('User data:', userData)
      setUserRole(userData.role) // Store user role for component rendering
      
      let query = supabase
        .from('reports')
        .select(`
          id,
          reference_id,
          status,
          patient_id,
          clinic_id,
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
          last_modified,
          created_at,
          patients (
            first_name,
            last_name
          ),
          clinics (
            name
          )
        `, { count: 'exact' })

      if (userData.role !== 'admin' && userData.clinic_id) {
        query = query.eq('clinic_id', userData.clinic_id)
      }

      if (searchQuery) {
        query = query.or(`
          reference_id.ilike.%${searchQuery}%,
          patients.first_name.ilike.%${searchQuery}%,
          patients.last_name.ilike.%${searchQuery}%,
          clinics.name.ilike.%${searchQuery}%
        `)
      }

      if (filters.testStatus !== 'all') {
        query = query.eq('status', filters.testStatus)
      }

      if (filters.testType !== 'all') {
        query = query.eq('lab_test_type', filters.testType)
      }

      if (filters.processingLab !== 'all') {
        query = query.eq('processing_lab', filters.processingLab)
      }

      console.log('Executing query...')
      const { data, error, count } = await query

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Query successful, transforming data...')
      const transformedReports = data.map(report => ({
        id: report.id,
        reference_id: report.reference_id,
        testStatus: report.status,
        firstName: report.patients?.first_name || 'N/A',
        lastName: report.patients?.last_name || 'N/A',
        associatedClinic: report.clinics?.name || 'N/A',
        testType: report.lab_test_type,
        processingLab: report.processing_lab,
        invoice_number: report.invoice_number,
        reportCompletionDate: report.report_completion_date,
        sampleCollectionDate: report.sample_collection_date,
        datePickedUpByLab: report.date_picked_up_by_lab,
        dateShippedToLab: report.date_shipped_to_lab,
        trackingNumber: report.tracking_number,
        notes: report.notes,
        pdf_url: report.pdf_url,
        last_modified: report.last_modified,
        created_at: report.created_at
      }))

      console.log('Setting reports data...')
      setAllReports(transformedReports)
      setPagination(prev => ({ ...prev, total: count || 0 }))

      if (transformedReports.length === 0 && count > 0) {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    } catch (error) {
      console.error('Error in fetchReports:', error)
      setError(error.message)
      toast.error('Failed to fetch reports. Please try again.')
      setReports([])
      setAllReports([])
      setPagination(prev => ({ ...prev, total: 0, page: 1 }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }))
  }

  const handleView = (report) => {
    setSelectedReport(report)
    setViewMode("view")
    window.history.pushState({}, '', `/reports/${report.id}`)
  }

  const handleBack = () => {
    setViewMode("list")
    setSelectedReport(null)
    window.history.pushState({}, '', '/reports')
  }

  const handleUpdate = (report) => {
    setSelectedReport(report)
    setIsUpdateDialogOpen(true)
  }

  const handleDelete = async (reportId) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (error) throw error

      // Update both reports lists
      setReports(prev => prev.filter(report => report.id !== reportId))
      setAllReports(prev => prev.filter(report => report.id !== reportId))
      
      // Update pagination total
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }))

      toast.success('Report deleted successfully')
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report. Please try again.')
    }
  }

  const handleExport = () => {
    const headers = [
      'Reference ID',
      'Status',
      'Patient Name',
      'Clinic',
      'Test Type',
      'Processing Lab',
      'Invoice Number',
      'Sample Collection Date',
      'Date Picked Up',
      'Date Shipped',
      'Tracking Number',
      'Completion Date'
    ]

    const rows = reports.map(report => [
      report.reference_id,
      report.status,
      `${report.firstName} ${report.lastName}`,
      report.associatedClinic,
      report.lab_test_type,
      report.processing_lab,
      report.invoice_number || 'N/A',
      new Date(report.sample_collection_date).toLocaleDateString(),
      new Date(report.date_picked_up_by_lab).toLocaleDateString(),
      new Date(report.date_shipped_to_lab).toLocaleDateString(),
      report.tracking_number || 'N/A',
      new Date(report.report_completion_date).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleAdd = async () => {
    // Only allow admin users to add reports
    if (userRole !== 'admin') {
      toast.error('Only administrators can add reports')
      return
    }

    try {
      // Fetch all patients to show in the dialog
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, reference_id')
        .order('created_at', { ascending: false })

      if (error) throw error

      setIsAddDialogOpen(true)
      setSelectedPatient(patients[0]) // Set the first patient as default
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error('Failed to fetch patients. Please try again.')
    }
  }

  const handleAddSubmit = async (newReport) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([{
          reference_id: newReport.reference_id,
          status: newReport.testStatus,
          patient_id: newReport.patient_id,
          clinic_id: newReport.clinic_id,
          lab_test_type: newReport.testType,
          processing_lab: newReport.processingLab,
          invoice_number: newReport.invoice_number,
          sample_collection_date: newReport.sampleCollectionDate,
          date_picked_up_by_lab: newReport.datePickedUpByLab,
          date_shipped_to_lab: newReport.dateShippedToLab,
          tracking_number: newReport.trackingNumber,
          report_completion_date: newReport.reportCompletionDate,
          notes: newReport.notes,
          pdf_url: newReport.pdf_url,
          last_modified: new Date().toISOString()
        }])
        .select(`
          id,
          reference_id,
          status,
          patient_id,
          clinic_id,
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
          last_modified,
          created_at,
          patients (
            first_name,
            last_name
          ),
          clinics (
            name
          )
        `)
        .single()

      if (error) throw error

      const transformedReport = {
        id: data.id,
        reference_id: data.reference_id,
        testStatus: data.status,
        firstName: data.patients?.first_name || 'N/A',
        lastName: data.patients?.last_name || 'N/A',
        associatedClinic: data.clinics?.name || 'N/A',
        testType: data.lab_test_type,
        processingLab: data.processing_lab,
        invoice_number: data.invoice_number,
        reportCompletionDate: data.report_completion_date,
        sampleCollectionDate: data.sample_collection_date,
        datePickedUpByLab: data.date_picked_up_by_lab,
        dateShippedToLab: data.date_shipped_to_lab,
        trackingNumber: data.tracking_number,
        notes: data.notes,
        pdf_url: data.pdf_url,
        last_modified: data.last_modified,
        created_at: data.created_at
      }

      // Update both reports lists with the new report at the beginning
      setAllReports(prev => [transformedReport, ...prev])
      setReports(prev => [transformedReport, ...prev])
      
      // Update pagination total
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }))

      setIsAddDialogOpen(false)
      toast.success('Report added successfully')
    } catch (error) {
      console.error('Error adding report:', error)
      toast.error(error.message || 'Failed to add report')
    }
  }

  const handleUpdateSubmit = async (updatedReport) => {
    try {
      // First, handle document uploads if there are any new files
      let documentUrls = updatedReport.documents || []
      if (updatedReport.documents?.length > 0) {
        // Check if bucket exists
        const { data: buckets, error: bucketError } = await supabase
          .storage
          .listBuckets()

        if (bucketError) {
          console.error('Error checking buckets:', bucketError)
          throw new Error('Failed to access storage buckets')
        }

        const reportPdfsBucket = buckets.find(b => b.name === 'report-pdfs')
        if (!reportPdfsBucket) {
          console.error('report-pdfs bucket not found')
          throw new Error('Storage bucket not found. Please contact support.')
        }

        const uploadPromises = updatedReport.documents.map(async (file) => {
          if (file instanceof File) {
            try {
              const fileExt = file.name.split('.').pop()
              const fileName = `${uuidv4()}.${fileExt}`
              
              // First check if file is a valid PDF
              if (file.type !== 'application/pdf') {
                throw new Error('Only PDF files are allowed')
              }

              // Check file size (limit to 10MB)
              if (file.size > 10 * 1024 * 1024) {
                throw new Error('File size must be less than 10MB')
              }

              const { data, error } = await supabase.storage
                .from('report-pdfs')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: false
                })
              
              if (error) {
                console.error('Upload error:', error)
                throw new Error(`Failed to upload file: ${error.message}`)
              }
              
              const { data: { publicUrl } } = supabase.storage
                .from('report-pdfs')
                .getPublicUrl(fileName)
                
              return { name: file.name, url: publicUrl }
            } catch (error) {
              console.error('Error processing file:', error)
              throw new Error(`Failed to process file: ${error.message}`)
            }
          }
          return file // If it's already a URL object, return as is
        })
        
        try {
          documentUrls = await Promise.all(uploadPromises)
        } catch (error) {
          console.error('Error uploading files:', error)
          throw new Error(`Failed to upload files: ${error.message}`)
        }
      }

      // Rest of the update logic
      const { error } = await supabase
        .from('reports')
        .update({
          reference_id: updatedReport.reference_id,
          status: updatedReport.testStatus,
          patient_id: updatedReport.patient_id,
          clinic_id: updatedReport.clinic_id,
          lab_test_type: updatedReport.testType,
          processing_lab: updatedReport.processingLab,
          invoice_number: updatedReport.invoice_number,
          sample_collection_date: updatedReport.sampleCollectionDate,
          date_picked_up_by_lab: updatedReport.datePickedUpByLab,
          date_shipped_to_lab: updatedReport.dateShippedToLab,
          tracking_number: updatedReport.trackingNumber,
          report_completion_date: updatedReport.reportCompletionDate,
          notes: updatedReport.notes,
          pdf_url: documentUrls.length > 0 ? documentUrls[0].url : updatedReport.pdf_url,
          last_modified: new Date().toISOString()
        })
        .eq('id', updatedReport.id)

      if (error) {
        console.error('Database update error:', error)
        throw new Error(`Failed to update report: ${error.message}`)
      }

      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          id,
          reference_id,
          status,
          patient_id,
          clinic_id,
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
          last_modified,
          created_at,
          patients (
            first_name,
            last_name
          ),
          clinics (
            name
          )
        `)
        .eq('id', updatedReport.id)
        .single()

      if (fetchError) throw fetchError

      const transformedReport = {
        id: data.id,
        reference_id: data.reference_id,
        testStatus: data.status,
        firstName: data.patients?.first_name || 'N/A',
        lastName: data.patients?.last_name || 'N/A',
        associatedClinic: data.clinics?.name || 'N/A',
        testType: data.lab_test_type,
        processingLab: data.processing_lab,
        invoice_number: data.invoice_number,
        sampleCollectionDate: data.sample_collection_date,
        datePickedUpByLab: data.date_picked_up_by_lab,
        dateShippedToLab: data.date_shipped_to_lab,
        trackingNumber: data.tracking_number,
        reportCompletionDate: data.report_completion_date,
        notes: data.notes,
        pdf_url: data.pdf_url,
        documents: documentUrls,
        last_modified: data.last_modified,
        created_at: data.created_at
      }

      // Update both reports lists
      setReports(prev => prev.map(report => 
        report.id === transformedReport.id ? transformedReport : report
      ))
      setAllReports(prev => prev.map(report => 
        report.id === transformedReport.id ? transformedReport : report
      ))

      // Update selected report if it's the one being viewed
      if (selectedReport?.id === transformedReport.id) {
        setSelectedReport(transformedReport)
      }

      setIsUpdateDialogOpen(false)
      toast.success('Report updated successfully')
    } catch (error) {
      console.error('Error updating report:', error)
      throw error // Throw the error to be handled by the dialog component
    }
  }

  const handleDownloadPDF = async (report) => {
    try {
      if (!report.pdf_url) {
        toast.error('No PDF available for this report')
        return
      }

      const { data: { signedURL }, error } = await supabase
        .storage
        .from('reports')
        .createSignedUrl(report.pdf_url, 60)

      if (error) {
        console.error('Error getting signed URL:', error)
        throw error
      }

      window.open(signedURL, '_blank')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader message="Loading reports..." />
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Reports</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button 
              onClick={() => fetchReports()} 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="container mx-auto py-2 px-2 sm:py-4 sm:px-4">
        <Card>
          {viewMode === "list" && (
            <>
              <ReportsHeader 
                totalReports={pagination.total} 
                onExport={handleExport}
                onAdd={handleAdd}
                userRole={userRole}
              />
              <ReportsFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-lg font-medium text-muted-foreground">No reports found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchQuery || Object.values(filters).some(v => v !== 'all') 
                      ? 'Try adjusting your search or filters'
                      : userRole === 'admin' 
                        ? 'Add your first report using the "Add Report" button above'
                        : 'No reports are available for your clinic'
                    }
                  </p>
                </div>
              ) : (
                <ReportsTable
                  reports={reports}
                  onView={handleView}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onDownloadPDF={handleDownloadPDF}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  userRole={userRole}
                />
              )}
            </>
          )}

          {viewMode === "view" && selectedReport && (
            <ReportDetails
              report={selectedReport}
              onBack={handleBack}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              userRole={userRole}
            />
          )}
        </Card>
      </div>

      {/* Only show Add Report dialog for admin users */}
      {userRole === 'admin' && (
        <AddReportDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSubmit={handleAddSubmit}
          patient={selectedPatient}
        />
      )}

      {/* Only show Update Report dialog for admin users */}
      {userRole === 'admin' && (
        <UpdateReportDialog
          isOpen={isUpdateDialogOpen}
          onClose={() => setIsUpdateDialogOpen(false)}
          onSubmit={handleUpdateSubmit}
          report={selectedReport}
        />
      )}
    </PageLayout>
  )
}
