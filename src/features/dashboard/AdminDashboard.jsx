import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  IconHospital, 
  IconUsers, 
  IconReportMedical, 
  IconPlus,
  IconTrendingUp,
  IconTrendingDown,
  IconActivity,
  IconCalendarStats,
  IconArrowUpRight,
  IconArrowDownRight,
  IconClock,
  IconBuilding,
  IconUser,
  IconFileText,
  IconChartBar,
  IconRefresh,
  IconChartLine,
  IconChartPie,
  IconChartDots
} from "@tabler/icons-react"
import { Link } from "react-router-dom"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell, Tooltip } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import PatientForm from "@/features/patients/components/PatientForm"
import ClinicForm from "@/features/clinics/components/ClinicForm"
import AddReportDialog from "@/features/reports/components/AddReportDialog"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalClinics: 0,
    totalReports: 0,
    monthlyGrowth: {
      patients: 0,
      clinics: 0,
      reports: 0
    }
  })
  const [patientTrends, setPatientTrends] = useState([])
  const [clinicPerformance, setClinicPerformance] = useState([])
  const [reportStats, setReportStats] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [topClinics, setTopClinics] = useState([])
  const { user, userDetails } = useAuth()
  const [patientHistogram, setPatientHistogram] = useState([])
  const [reportsPerClinic, setReportsPerClinic] = useState([])
  const [reportCreationTrend, setReportCreationTrend] = useState([])

  // Form states
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false)
  const [isClinicFormOpen, setIsClinicFormOpen] = useState(false)
  const [isReportFormOpen, setIsReportFormOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // Check if Supabase is configured
      if (!supabase) {
        console.error('Supabase client is not configured')
        toast.error('Database connection not configured')
        return
      }

      console.log('Fetching dashboard data...')

      // Fetch total counts and calculate growth
      const [
        { count: patientsCount, data: patientsData },
        { count: clinicsCount, data: clinicsData },
        { count: reportsCount, data: reportsData }
      ] = await Promise.all([
        supabase.from('patients').select('created_at', { count: 'exact' }),
        supabase.from('clinics').select('created_at', { count: 'exact' }),
        supabase.from('reports').select('created_at, status', { count: 'exact' })
      ]).catch(error => {
        console.error('Error fetching data:', error)
        toast.error('Failed to fetch data from database')
        return [{ count: 0, data: [] }, { count: 0, data: [] }, { count: 0, data: [] }]
      })

      console.log('Fetched counts:', { patientsCount, clinicsCount, reportsCount })
      console.log('Fetched data:', { patientsData, clinicsData, reportsData })

      // Calculate monthly growth
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const calculateGrowth = (data) => {
        const lastMonthCount = data?.filter(item => 
          new Date(item.created_at) >= lastMonth && new Date(item.created_at) < thisMonth
        ).length || 0
        const thisMonthCount = data?.filter(item => 
          new Date(item.created_at) >= thisMonth
        ).length || 0
        return lastMonthCount ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0
      }

      // Fetch patient trends (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      if (patientError) {
        console.error('Error fetching patient data:', patientError)
        toast.error('Failed to fetch patient data')
      }

      console.log('Fetched patient data:', patientData)

      // Process patient trends data
      const monthlyData = {}
      patientData?.forEach(patient => {
        const month = new Date(patient.created_at).toLocaleString('default', { month: 'short' })
        monthlyData[month] = (monthlyData[month] || 0) + 1
      })

      const patientTrendsData = Object.entries(monthlyData).map(([month, count]) => ({
        month,
        patients: count
      }))

      console.log('Patient trends data for chart:', patientTrendsData)

      // Histogram for patient registrations (last 12 months)
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (11 - i))
        return d.toLocaleString('default', { month: 'short', year: '2-digit' })
      })
      const patientHistogramData = months.map(monthLabel => ({
        month: monthLabel,
        count: patientData?.filter(patient => {
          const d = new Date(patient.created_at)
          const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
          return label === monthLabel
        }).length || 0
      }))
      setPatientHistogram(patientHistogramData)

      // Fetch clinic performance with more details
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select(`
          id,
          name,
          logo_url,
          reports (
            id,
            status,
            created_at
          )
        `)

      if (clinicError) {
        console.error('Error fetching clinic data:', clinicError)
        toast.error('Failed to fetch clinic data')
      }

      console.log('Raw clinic data:', clinicData)

      const clinicPerformanceData = clinicData?.map(clinic => {
        const reports = clinic.reports || []
        const completedReports = reports.filter(r => r.status === 'Completed').length
        const completionRate = reports.length ? (completedReports / reports.length) * 100 : 0
        return {
          name: clinic.name,
          logo: clinic.logo_url,
          patients: reports.length,
          completionRate
        }
      }).sort((a, b) => b.patients - a.patients)

      console.log('Processed clinic performance data:', clinicPerformanceData)

      // Get top 5 clinics
      setTopClinics(clinicPerformanceData?.slice(0, 5) || [])

      // Fetch report statistics with more details
      const reportStatusCounts = reportsData?.reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1
        return acc
      }, {})

      const reportStatsData = Object.entries(reportStatusCounts || {}).map(([name, value]) => ({
        name,
        value,
        percentage: (value / (reportsCount || 1)) * 100
      }))

      console.log('Report stats data for pie chart:', reportStatsData)

      // Bar chart for reports per clinic
      const reportsPerClinicData = (clinicData || []).map(clinic => ({
        name: clinic.name,
        reports: clinic.reports.length
      }))
      setReportsPerClinic(reportsPerClinicData)

      // Line chart for report creation trend (last 12 months)
      const reportMonths = months
      const reportCreationTrendData = reportMonths.map(monthLabel => ({
        month: monthLabel,
        count: reportsData?.filter(report => {
          const d = new Date(report.created_at)
          const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
          return label === monthLabel
        }).length || 0
      }))
      setReportCreationTrend(reportCreationTrendData)

      // Fetch recent activity with more details
      const { data: recentReports, error: recentError } = await supabase
        .from('reports')
        .select(`
          id,
          status,
          created_at,
          patients (
            first_name,
            last_name
          ),
          clinics (
            name,
            logo_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError) {
        console.error('Error fetching recent reports:', recentError)
        toast.error('Failed to fetch recent reports')
      }

      console.log('Fetched recent reports:', recentReports)

      setStats({
        totalPatients: patientsCount || 0,
        totalClinics: clinicsCount || 0,
        totalReports: reportsCount || 0,
        monthlyGrowth: {
          patients: calculateGrowth(patientsData),
          clinics: calculateGrowth(clinicsData),
          reports: calculateGrowth(reportsData)
        }
      })
      setPatientTrends(patientTrendsData)
      setClinicPerformance(clinicPerformanceData || [])
      setReportStats(reportStatsData)
      setRecentActivity(recentReports || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchDashboardData()
  }

  const getGrowthColor = (value) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500'
  }

  const getGrowthIcon = (value) => {
    return value >= 0 ? <IconArrowUpRight className="h-4 w-4" /> : <IconArrowDownRight className="h-4 w-4" />
  }

  // Form submission handlers
  const handlePatientSubmit = async (data) => {
    try {
      const { error } = await supabase
        .from('patients')
        .insert([data])

      if (error) throw error

      toast.success('Patient added successfully!')
      setIsPatientFormOpen(false)
      fetchDashboardData() // Refresh dashboard data
    } catch (error) {
      console.error('Error adding patient:', error)
      toast.error('Failed to add patient')
    }
  }

  const handleClinicSubmit = async (data) => {
    try {
      const { error } = await supabase
        .from('clinics')
        .insert([data])

      if (error) throw error

      toast.success('Clinic added successfully!')
      setIsClinicFormOpen(false)
      fetchDashboardData() // Refresh dashboard data
    } catch (error) {
      console.error('Error adding clinic:', error)
      toast.error('Failed to add clinic')
    }
  }

  const handleReportSubmit = async (data) => {
    try {
      const { error } = await supabase
        .from('reports')
        .insert([data])

      if (error) throw error

      toast.success('Report added successfully!')
      setIsReportFormOpen(false)
      fetchDashboardData() // Refresh dashboard data
    } catch (error) {
      console.error('Error adding report:', error)
      toast.error('Failed to add report')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="h-4 w-[120px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-[150px]" />
                <Skeleton className="h-4 w-[200px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-6">
              {/* Header Section */}
              <header className="sticky top-0 z-50 bg-background border-b">
                <div className="container mx-auto px-4">
                  <div className="flex items-center justify-between h-16">
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
                      <p className="text-sm text-muted-foreground">Welcome back, {userDetails?.name?.split(' ')[0] || 'Admin'}</p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleRefresh} 
                        disabled={isRefreshing}
                        className="h-9 w-9"
                      >
                        <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="sr-only">Refresh</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </header>

              {/* Overview Stats Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                    <IconUsers className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPatients}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className={getGrowthColor(stats.monthlyGrowth.patients)}>
                        {getGrowthIcon(stats.monthlyGrowth.patients)}
                        {Math.abs(stats.monthlyGrowth.patients).toFixed(1)}%
                      </span>
                      <span className="ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Clinics</CardTitle>
                    <IconHospital className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalClinics}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className={getGrowthColor(stats.monthlyGrowth.clinics)}>
                        {getGrowthIcon(stats.monthlyGrowth.clinics)}
                        {Math.abs(stats.monthlyGrowth.clinics).toFixed(1)}%
                      </span>
                      <span className="ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                    <IconReportMedical className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalReports}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className={getGrowthColor(stats.monthlyGrowth.reports)}>
                        {getGrowthIcon(stats.monthlyGrowth.reports)}
                        {Math.abs(stats.monthlyGrowth.reports).toFixed(1)}%
                      </span>
                      <span className="ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Detailed Stats */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <IconChartLine className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="patients" className="flex items-center gap-2">
                    <IconUsers className="h-4 w-4" />
                    Patients
                  </TabsTrigger>
                  <TabsTrigger value="clinics" className="flex items-center gap-2">
                    <IconHospital className="h-4 w-4" />
                    Clinics
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2">
                    <IconReportMedical className="h-4 w-4" />
                    Reports
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Patient Trends Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Patient Trends</CardTitle>
                        <CardDescription>Monthly patient registrations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {patientTrends && patientTrends.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={patientTrends}>
                                <defs>
                                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="month" 
                                  tick={{ fontSize: 12 }}
                                  tickLine={false}
                                />
                                <YAxis 
                                  tick={{ fontSize: 12 }}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Area 
                                  type="monotone" 
                                  dataKey="patients" 
                                  stroke="#8884d8" 
                                  fillOpacity={1} 
                                  fill="url(#colorPatients)" 
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground">No data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Report Status Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Report Status</CardTitle>
                        <CardDescription>Current report distribution</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {reportStats && reportStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={reportStats}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                  {reportStats.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={COLORS[index % COLORS.length]} 
                                    />
                                  ))}
                                </Pie>
                                <Tooltip content={<ChartTooltipContent />} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground">No data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Patient Registrations Histogram */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Patient Registrations (Histogram)</CardTitle>
                        <CardDescription>Registrations per month (last 12 months)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {patientHistogram && patientHistogram.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={patientHistogram}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground">No data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    {/* Reports per Clinic Bar Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Reports per Clinic</CardTitle>
                        <CardDescription>Number of reports by clinic</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {reportsPerClinic && reportsPerClinic.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={reportsPerClinic} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="reports" fill="#00C49F" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground">No data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 md:grid-cols-1">
                    {/* Report Creation Trend Line Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Report Creation Trend</CardTitle>
                        <CardDescription>Reports created per month (last 12 months)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          {reportCreationTrend && reportCreationTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={reportCreationTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="count" stroke="#FF8042" strokeWidth={2} dot={{ r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground">No data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Top Performing Clinics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Performing Clinics</CardTitle>
                        <CardDescription>Based on completion rate and report volume</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-4">
                            {topClinics && topClinics.length > 0 ? (
                              topClinics.map((clinic, index) => (
                                <div key={clinic.name} className="flex items-center gap-4">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={clinic.logo} alt={clinic.name} />
                                    <AvatarFallback>{clinic.name.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">{clinic.name}</p>
                                    <div className="flex items-center gap-2">
                                      <Progress value={clinic.completionRate} className="h-2 w-[100px]" />
                                      <span className="text-xs text-muted-foreground">
                                        {clinic.completionRate.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">{clinic.patients} reports</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">No clinic data available</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest reports and updates</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-4">
                            {recentActivity && recentActivity.length > 0 ? (
                              recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center gap-4">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={activity.patients?.avatar_url} />
                                    <AvatarFallback>
                                      {activity.patients?.first_name?.[0]}
                                      {activity.patients?.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                      {activity.patients?.first_name} {activity.patients?.last_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {activity.clinics?.name} - {activity.status}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="outline">
                                      {new Date(activity.created_at).toLocaleDateString()}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">No recent activity</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="patients" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Patient Management</CardTitle>
                        <CardDescription>View and manage patient records</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-2xl font-bold">{stats.totalPatients} Total Patients</div>
                          <Button onClick={() => setIsPatientFormOpen(true)}>
                            <IconPlus className="mr-2 h-4 w-4" />
                            Add New Patient
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-medium">Quick Actions</h3>
                              <p className="text-sm text-muted-foreground">Manage patient data</p>
                            </div>
                            <Button variant="outline" asChild>
                              <Link to="/patients">View All Patients</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Patients</CardTitle>
                        <CardDescription>Latest patient registrations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center py-8">
                            <IconUsers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Patient data will appear here</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setIsPatientFormOpen(true)}
                            >
                              <IconPlus className="mr-2 h-4 w-4" />
                              Add First Patient
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="clinics" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Clinic Management</CardTitle>
                        <CardDescription>View and manage clinic locations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-2xl font-bold">{stats.totalClinics} Active Clinics</div>
                          <Button onClick={() => setIsClinicFormOpen(true)}>
                            <IconPlus className="mr-2 h-4 w-4" />
                            Add New Clinic
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-medium">Quick Actions</h3>
                              <p className="text-sm text-muted-foreground">Manage clinic data</p>
                            </div>
                            <Button variant="outline" asChild>
                              <Link to="/clinics">View All Clinics</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Clinics</CardTitle>
                        <CardDescription>Latest clinic registrations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center py-8">
                            <IconHospital className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Clinic data will appear here</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setIsClinicFormOpen(true)}
                            >
                              <IconPlus className="mr-2 h-4 w-4" />
                              Add First Clinic
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="reports" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Report Management</CardTitle>
                        <CardDescription>View and manage medical reports</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-2xl font-bold">{stats.totalReports} Total Reports</div>
                          <Button onClick={() => setIsReportFormOpen(true)}>
                            <IconPlus className="mr-2 h-4 w-4" />
                            Generate New Report
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-medium">Quick Actions</h3>
                              <p className="text-sm text-muted-foreground">Manage report data</p>
                            </div>
                            <Button variant="outline" asChild>
                              <Link to="/reports">View All Reports</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Reports</CardTitle>
                        <CardDescription>Latest report generations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center py-8">
                            <IconReportMedical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Report data will appear here</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setIsReportFormOpen(true)}
                            >
                              <IconPlus className="mr-2 h-4 w-4" />
                              Generate First Report
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Form Components */}
      <PatientForm
        open={isPatientFormOpen}
        onOpenChange={setIsPatientFormOpen}
        onSubmit={handlePatientSubmit}
        onCancel={() => setIsPatientFormOpen(false)}
        mode="add"
      />

      <ClinicForm
        isOpen={isClinicFormOpen}
        onClose={() => setIsClinicFormOpen(false)}
        onSubmit={handleClinicSubmit}
        mode="add"
      />

      <AddReportDialog
        isOpen={isReportFormOpen}
        onClose={() => setIsReportFormOpen(false)}
        onSubmit={handleReportSubmit}
      />
    </div>
  )
} 