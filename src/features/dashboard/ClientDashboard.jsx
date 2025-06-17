import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { 
  IconReportMedical, 
  IconEye, 
  IconCalendar,
  IconUsers,
  IconSearch,
  IconFilter,
  IconDownload,
  IconPrinter,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconBell,
  IconSettings,
  IconFileText
} from "@tabler/icons-react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

export default function ClientDashboard() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState({
    recent: [],
    pending: [],
    completed: []
  })
  const [clinicStats, setClinicStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0
  })
  const [userClinic, setUserClinic] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      if (!user) {
        toast.error('Please log in to view dashboard')
        return
      }

      // Get user's clinic information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, clinic_id')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        throw userError
      }

      console.log('User data:', userData)
      console.log('User role:', userData.role)
      console.log('User clinic_id:', userData.clinic_id)

      // Check if user is a client (not admin) and has a clinic_id
      if (userData.role === 'admin') {
        toast.error('This dashboard is for client users only. Please use the admin dashboard.')
        return
      }

      if (!userData.clinic_id) {
        toast.error('No clinic assigned to your account. Please contact your administrator.')
        return
      }

      // Get clinic information
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name, address')
        .eq('id', userData.clinic_id)
        .single()

      if (clinicError) {
        console.error('Error fetching clinic data:', clinicError)
        throw clinicError
      }

      setUserClinic(clinicData)

      // Fetch reports for the user's clinic
      const { data: reportsData, error: reportsError } = await supabase
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
          patients (
            first_name,
            last_name
          )
        `)
        .eq('clinic_id', userData.clinic_id)
        .order('created_at', { ascending: false })

      if (reportsError) {
        console.error('Error fetching reports:', reportsError)
        throw reportsError
      }

      // Transform reports data
      const transformedReports = reportsData.map(report => ({
        id: report.id,
        referenceId: report.reference_id,
        title: `${report.reference_id} - ${report.patients?.first_name || 'N/A'} ${report.patients?.last_name || 'N/A'}`,
        patientName: `${report.patients?.first_name || 'N/A'} ${report.patients?.last_name || 'N/A'}`,
        status: report.status,
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
        date: report.created_at,
        expectedDate: report.report_completion_date,
        completedDate: report.report_completion_date
      }))

      // Organize reports by status
      const organizedReports = {
        recent: transformedReports.slice(0, 5), // Latest 5 reports
        pending: transformedReports.filter(report => 
          ['Sample Received', 'Resample Required', 'In Progress'].includes(report.status)
        ),
        completed: transformedReports.filter(report => report.status === 'Ready')
      }
      
      setReports(organizedReports)
      
      // Update stats
      setClinicStats({
        totalReports: transformedReports.length,
        pendingReports: organizedReports.pending.length,
        completedReports: organizedReports.completed.length
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchDashboardData()
  }

  const handleDownloadPDF = async (report) => {
    try {
      if (!report.pdfUrl) {
        toast.error('No PDF available for this report')
        return
      }

      const { data: { signedURL }, error } = await supabase
        .storage
        .from('reports')
        .createSignedUrl(report.pdfUrl, 60)

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

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'sample received':
        return 'bg-blue-500'
      case 'resample required':
        return 'bg-yellow-500'
      case 'in progress':
        return 'bg-purple-500'
      case 'ready':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Welcome back, {user?.email?.split('@')[0] || 'User'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {userClinic ? `Your clinic: ${userClinic.name}` : 'Client Dashboard'}
              </p>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <IconRefresh className={cn("h-4 w-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/account">
                  <IconSettings className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Settings</span>
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <IconChevronUp className="h-5 w-5" />
              ) : (
                <IconChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 space-y-4 border-t">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <IconRefresh className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/account">
                  <IconSettings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <IconFilter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <IconCalendar className="h-4 w-4" />
              <span className="hidden sm:inline">Date Range</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-primary/5 hover:bg-primary/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconReportMedical className="h-5 w-5 text-primary" />
                Total Reports
              </CardTitle>
              <CardDescription>All reports from your clinic</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="text-3xl font-bold mb-4">{clinicStats.totalReports}</div>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link to="/reports" className="flex items-center">
                    <IconEye className="mr-2 h-4 w-4" />
                    View All Reports
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconReportMedical className="h-5 w-5 text-yellow-500" />
                Pending Reports
              </CardTitle>
              <CardDescription>Reports awaiting results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="text-3xl font-bold mb-4">{clinicStats.pendingReports}</div>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link to="/reports?status=pending" className="flex items-center">
                    <IconEye className="mr-2 h-4 w-4" />
                    View Pending
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 hover:bg-green-500/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconReportMedical className="h-5 w-5 text-green-500" />
                Completed Reports
              </CardTitle>
              <CardDescription>Reports with results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="text-3xl font-bold mb-4">{clinicStats.completedReports}</div>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link to="/reports?status=completed" className="flex items-center">
                    <IconEye className="mr-2 h-4 w-4" />
                    View Completed
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <IconDownload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          <TabsContent value="recent" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>Latest reports from your clinic</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {reports.recent.length > 0 ? (
                      reports.recent.map((report) => (
                        <div
                          key={report.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="space-y-1 mb-4 sm:mb-0">
                            <p className="font-medium">{report.title}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                              <span>Patient: {report.patientName}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Date: {new Date(report.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={`${getStatusVariant(report.status)} text-white`}
                            >
                              {report.status}
                            </Badge>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/reports/${report.id}`} className="flex items-center">
                                <IconEye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent reports found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Pending Reports</CardTitle>
                <CardDescription>Reports awaiting results from your clinic</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {reports.pending.length > 0 ? (
                      reports.pending.map((report) => (
                        <div 
                          key={report.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="space-y-1 mb-4 sm:mb-0">
                            <p className="font-medium">{report.title}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                              <span>Patient: {report.patientName}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Expected: {report.expectedDate ? new Date(report.expectedDate).toLocaleDateString() : 'TBD'}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/reports/${report.id}`}>
                              <IconEye className="h-4 w-4 mr-2" />
                              View Status
                            </Link>
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No pending reports</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Completed Reports</CardTitle>
                <CardDescription>Reports with available results from your clinic</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {reports.completed.length > 0 ? (
                      reports.completed.map((report) => (
                        <div 
                          key={report.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="space-y-1 mb-4 sm:mb-0">
                            <p className="font-medium">{report.title}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                              <span>Patient: {report.patientName}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Completed: {report.completedDate ? new Date(report.completedDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {report.pdfUrl && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadPDF(report)}
                              >
                                <IconFileText className="h-4 w-4 mr-2" />
                                Download PDF
                              </Button>
                            )}
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/reports/${report.id}`}>
                                <IconEye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No completed reports</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
} 