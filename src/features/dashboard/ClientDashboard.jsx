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
  IconSettings
} from "@tabler/icons-react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

export default function ClientDashboard() {
  const { user, userDetails } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [reports, setReports] = useState({
    recent: [],
    pending: [],
    completed: []
  })
  const [clinicStats, setClinicStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
    associatedPatients: 0
  })
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [clinics, setClinics] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        setIsLoading(true)
        // Fetch clinics associated with the client
        const clinicsResponse = await fetch('/api/client/clinics')
        const clinicsData = await clinicsResponse.json()
        setClinics(clinicsData)
        
        if (clinicsData.length > 0) {
          setSelectedClinic(clinicsData[0].id)
          await fetchReports(clinicsData[0].id)
        }
      } catch (error) {
        console.error('Error fetching clinic data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClinicData()
  }, [])

  const fetchReports = async (clinicId) => {
    try {
      // Fetch reports for the selected clinic
      const reportsResponse = await fetch(`/api/client/reports?clinicId=${clinicId}`)
      const reportsData = await reportsResponse.json()
      
      // Organize reports by status
      const organizedReports = {
        recent: reportsData.slice(0, 5), // Latest 5 reports
        pending: reportsData.filter(report => report.status === 'pending'),
        completed: reportsData.filter(report => report.status === 'completed')
      }
      
      setReports(organizedReports)
      
      // Update stats
      setClinicStats({
        totalReports: reportsData.length,
        pendingReports: organizedReports.pending.length,
        completedReports: organizedReports.completed.length,
        associatedPatients: new Set(reportsData.map(report => report.patientId)).size
      })
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const handleClinicChange = async (clinicId) => {
    setSelectedClinic(clinicId)
    await fetchReports(clinicId)
  }

  const handleRefresh = async () => {
    if (selectedClinic) {
      await fetchReports(selectedClinic)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Welcome back, {userDetails?.name?.split(' ')[0] || 'User'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedClinic ? `Viewing reports for ${clinics.find(c => c.id === selectedClinic)?.name}` : 'Select a clinic to view reports'}
              </p>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="relative"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                >
                  <IconBell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    3
                  </span>
                </Button>
              </div>
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
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                >
                  <IconBell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
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
        {/* Search and Filter Bar */}
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

        {/* Clinic Selector */}
        {clinics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {clinics.map((clinic) => (
              <Button
                key={clinic.id}
                variant={selectedClinic === clinic.id ? "default" : "outline"}
                onClick={() => handleClinicChange(clinic.id)}
                className="h-auto py-2 px-4"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{clinic.name}</span>
                  <span className="text-xs text-muted-foreground">{clinic.address}</span>
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-primary/5 hover:bg-primary/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconReportMedical className="h-5 w-5 text-primary" />
                Total Reports
              </CardTitle>
              <CardDescription>All reports from this clinic</CardDescription>
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

          <Card className="bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconUsers className="h-5 w-5 text-blue-500" />
                Associated Patients
              </CardTitle>
              <CardDescription>Total patients with reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="text-3xl font-bold mb-4">{clinicStats.associatedPatients}</div>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link to="/patients" className="flex items-center">
                    <IconEye className="mr-2 h-4 w-4" />
                    View Patients
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
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <IconPrinter className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          <TabsContent value="recent" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>Latest reports from this clinic</CardDescription>
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
                              variant={report.status === 'completed' ? 'default' : 'secondary'}
                              className="whitespace-nowrap"
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
                <CardDescription>Reports awaiting results</CardDescription>
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
                              <span>Expected: {new Date(report.expectedDate).toLocaleDateString()}</span>
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
                <CardDescription>Reports with available results</CardDescription>
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
                              <span>Completed: {new Date(report.completedDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/reports/${report.id}/download`}>
                                <IconDownload className="h-4 w-4 mr-2" />
                                Download
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/reports/${report.id}/print`}>
                                <IconPrinter className="h-4 w-4 mr-2" />
                                Print
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