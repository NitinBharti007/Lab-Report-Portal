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
  IconRefresh
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalClinics: 0,
    totalReports: 0,
    totalRevenue: 0,
    monthlyGrowth: {
      patients: 0,
      clinics: 0,
      reports: 0,
      revenue: 0
    }
  })
  const [patientTrends, setPatientTrends] = useState([])
  const [clinicPerformance, setClinicPerformance] = useState([])
  const [reportStats, setReportStats] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [topClinics, setTopClinics] = useState([])
  const { user } = useAuth()

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
        const totalRevenue = reports.length * 100 // Assuming $100 per report
        const completionRate = reports.length ? (completedReports / reports.length) * 100 : 0

        return {
          name: clinic.name,
          logo: clinic.logo_url,
          patients: reports.length,
          revenue: totalRevenue,
          completionRate
        }
      }).sort((a, b) => b.revenue - a.revenue)

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
        totalRevenue: (reportsCount || 0) * 100,
        monthlyGrowth: {
          patients: calculateGrowth(patientsData),
          clinics: calculateGrowth(clinicsData),
          reports: calculateGrowth(reportsData),
          revenue: calculateGrowth(reportsData)
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                  <p className="text-muted-foreground">Manage your healthcare system</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                  <IconRefresh className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Overview Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <IconCalendarStats className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className={getGrowthColor(stats.monthlyGrowth.revenue)}>
                        {getGrowthIcon(stats.monthlyGrowth.revenue)}
                        {Math.abs(stats.monthlyGrowth.revenue).toFixed(1)}%
                      </span>
                      <span className="ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Detailed Stats */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="patients">Patients</TabsTrigger>
                  <TabsTrigger value="clinics">Clinics</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
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

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Top Performing Clinics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Performing Clinics</CardTitle>
                        <CardDescription>Based on revenue and completion rate</CardDescription>
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
                                    <p className="text-sm font-medium">${clinic.revenue.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">{clinic.patients} patients</p>
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

                <TabsContent value="patients" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Patient Management</CardTitle>
                      <CardDescription>View and manage patient records</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-2xl font-bold">{stats.totalPatients} Total Patients</div>
                        <Button asChild>
                          <Link to="/patients">
                            <IconPlus className="mr-2 h-4 w-4" />
                            Add New Patient
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="clinics" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Clinic Management</CardTitle>
                      <CardDescription>View and manage clinic locations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-2xl font-bold">{stats.totalClinics} Active Clinics</div>
                        <Button asChild>
                          <Link to="/clinics">
                            <IconPlus className="mr-2 h-4 w-4" />
                            Add New Clinic
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Report Management</CardTitle>
                      <CardDescription>View and manage medical reports</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-2xl font-bold">{stats.totalReports} Total Reports</div>
                        <Button asChild>
                          <Link to="/reports">
                            <IconPlus className="mr-2 h-4 w-4" />
                            Generate New Report
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 