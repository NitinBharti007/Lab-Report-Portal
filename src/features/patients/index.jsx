import { useState, useEffect } from "react"
import PageLayout from "@/components/layouts/PageLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Loader } from "@/components/shared/loader"
import PatientView from "./components/PatientView"
import PatientForm from "./components/PatientForm"
import PatientsHeader from "./components/PatientsHeader"
import PatientsFilters from "./components/PatientsFilters"
import PatientsTable from "./components/PatientsTable"
import { supabase } from "@/lib/supabaseClient"
import toast, { Toaster } from 'react-hot-toast'
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

const GENDERS = ["Male", "Female", "Other"]

export default function Patients() {
  const [isLoading, setIsLoading] = useState(true)
  const [patients, setPatients] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    gender: "all"
  })
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  })
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [viewMode, setViewMode] = useState("list") // "list", "view", "update", or "add"
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState(null)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      setIsLoading(true)
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!user) {
        console.error('No authenticated user found')
        throw new Error('Please log in to view patients')
      }

      console.log('Current user:', user)

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('User data from database:', userData)
      console.log('User error if any:', userError)

      if (userError) {
        console.error('Error checking user role:', userError)
        throw userError
      }

      if (!userData) {
        console.error('No user data found in users table')
        throw new Error('User data not found')
      }

      if (userData.role !== 'admin') {
        console.error('User role is not admin:', userData.role)
        throw new Error('Only administrators can access patients')
      }

      console.log('Fetching patients for admin user:', user.id)

      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          reference_id,
          first_name,
          last_name,
          gender,
          date_of_birth,
          created_at,
          last_modified,
          reports:reports(count)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Raw patient data:', data)

      // Transform the data to include total_reports
      const transformedData = data.map(patient => ({
        ...patient,
        total_reports: patient.reports?.[0]?.count || 0
      }))

      console.log('Transformed patient data:', transformedData)

      setPatients(transformedData || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error(error.message || 'Failed to fetch patients')
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

  const handleAddPatient = () => {
    setSelectedPatient(null)
    setIsAddDialogOpen(true)
  }

  const handleAddPatientSubmit = async (data) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      if (!user) throw new Error('Please log in to add a patient')

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error checking user role:', userError)
        throw userError
      }

      if (!userData || userData.role !== 'admin') {
        throw new Error('Only administrators can add patients')
      }

      // Get the latest patient to determine the next reference ID
      const { data: existingPatients, error: latestError } = await supabase
        .from('patients')
        .select('reference_id')
        .order('reference_id', { ascending: false })

      if (latestError) throw latestError

      // Generate new reference ID
      let newReferenceId = 'PAT001'
      if (existingPatients && existingPatients.length > 0) {
        // Find the highest number from existing reference IDs
        const highestNumber = existingPatients.reduce((max, patient) => {
          const number = parseInt(patient.reference_id.replace('PAT', '')) || 0
          return Math.max(max, number)
        }, 0)
        
        const nextNumber = highestNumber + 1
        newReferenceId = `PAT${nextNumber.toString().padStart(3, '0')}`
      }

      // Create a sanitized patient name
      const sanitizedPatientName = `${data.first_name}${data.last_name}`
        .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
        .toUpperCase() // Convert to uppercase
        .substring(0, 10) // Limit to 10 characters

      // Generate a proper UUID
      const uuid = crypto.randomUUID()
      
      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert([{
          id: uuid,
          first_name: data.first_name,
          last_name: data.last_name,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          reference_id: `${newReferenceId}-${sanitizedPatientName}`, // Store combined identifier in reference_id
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      setPatients(prevPatients => [...prevPatients, { ...newPatient, total_reports: 0 }])
      setIsAddDialogOpen(false)
      toast.success('Patient added successfully')
    } catch (error) {
      console.error('Error adding patient:', error)
      toast.error(error.message || 'Failed to add patient')
    }
  }

  const handleView = (patient) => {
    setSelectedPatient(patient)
    setViewMode("view")
  }

  const handleUpdateFromList = (patient) => {
    console.log('Update from list:', patient) // Debug log
    setSelectedPatient(patient)
    setIsUpdateDialogOpen(true)
  }

  const handleUpdateFromDetails = (patient) => {
    console.log('Update from details:', patient) // Debug log
    setSelectedPatient(patient)
    setIsUpdateDialogOpen(true)
  }

  const handleUpdateSubmit = async (data) => {
    try {
      console.log('Updating patient:', { selectedPatient, data }) // Debug log
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      if (!user) throw new Error('Please log in to update patient')

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error checking user role:', userError)
        throw userError
      }

      if (!userData || userData.role !== 'admin') {
        throw new Error('Only administrators can update patients')
      }

      const { error: updateError } = await supabase
        .from('patients')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          last_modified: new Date().toISOString()
        })
        .eq('id', selectedPatient.id)

      if (updateError) {
        console.error('Error updating patient:', updateError)
        throw updateError
      }

      // Update local state
      const updatedPatient = { ...selectedPatient, ...data }
      setPatients(prevPatients => 
        prevPatients.map(p => 
          p.id === selectedPatient.id ? updatedPatient : p
        )
      )
      
      setIsUpdateDialogOpen(false)
      
      // If we're in details view, update the selected patient
      if (viewMode === "view") {
        setSelectedPatient(updatedPatient)
      } else {
        setSelectedPatient(null)
      }

      toast.success('Patient updated successfully')
    } catch (error) {
      console.error('Error updating patient:', error)
      toast.error(error.message || 'Failed to update patient')
    }
  }

  const handleDeletePatient = async (patientId) => {
    try {
      console.log('Deleting patient with ID:', patientId) // Debug log

      if (!patientId) {
        throw new Error('Invalid patient ID')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      if (!user) throw new Error('Please log in to delete patient')

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error checking user role:', userError)
        throw userError
      }

      if (!userData || userData.role !== 'admin') {
        throw new Error('Only administrators can delete patients')
      }

      // Delete the patient
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)

      if (deleteError) {
        console.error('Error deleting patient:', deleteError)
        throw deleteError
      }

      // Update local state
      setPatients(prev => prev.filter(patient => patient.id !== patientId))
      
      // If we're in details view and this is the selected patient, go back to list
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null)
        setViewMode("list")
      }

      // Close the delete dialog
      setPatientToDelete(null)
      
      // Show success message
      toast.success('Patient deleted successfully')
    } catch (error) {
      console.error('Error in handleDeletePatient:', error)
      toast.error(error.message || 'Failed to delete patient')
    }
  }

  const handleExport = () => {
    // Define CSV headers
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Gender',
      'Date of Birth',
      'Total Reports',
      'Created At'
    ]

    // Convert patient data to CSV rows
    const rows = patients.map(patient => [
      patient.id,
      patient.first_name,
      patient.last_name,
      patient.gender,
      new Date(patient.date_of_birth).toLocaleDateString(),
      patient.total_reports,
      new Date(patient.created_at).toLocaleDateString()
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
    link.download = `patients_export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false)
  }

  const handleCancelUpdate = () => {
    setIsUpdateDialogOpen(false)
    setSelectedPatient(null)
  }

  const filteredAndSortedPatients = patients
    .filter(patient => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          patient.first_name.toLowerCase().includes(query) ||
          patient.last_name.toLowerCase().includes(query)
        )
      }
      return true
    })
    .filter(patient => {
      if (filters.gender !== "all") {
        return patient.gender === filters.gender
      }
      return true
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0
      
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1
      }
      return 0
    })

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader message="Loading patients..." />
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
              <PatientsHeader 
                totalPatients={patients.length} 
                onAddPatient={handleAddPatient} 
                onExport={handleExport} 
              />
              <PatientsFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
              <PatientsTable
                patients={filteredAndSortedPatients}
                onView={handleView}
                onUpdate={handleUpdateFromList}
                onDelete={(patient) => {
                  console.log('Delete clicked for patient:', patient)
                  setPatientToDelete(patient)
                }}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </>
          )}

          {viewMode === "view" && selectedPatient && (
            <PatientView
              patient={selectedPatient}
              onBack={() => {
                setViewMode("list")
                setSelectedPatient(null)
              }}
              onUpdate={() => handleUpdateFromDetails(selectedPatient)}
              onDelete={() => {
                console.log('Delete clicked from details for patient:', selectedPatient)
                setPatientToDelete(selectedPatient)
              }}
            />
          )}

          {/* Add Patient Dialog */}
          <PatientForm
            onSubmit={handleAddPatientSubmit}
            onCancel={handleCancelAdd}
            mode="add"
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
          />

          {/* Update Patient Dialog */}
          <PatientForm
            patient={selectedPatient}
            onSubmit={handleUpdateSubmit}
            onCancel={handleCancelUpdate}
            mode="update"
            open={isUpdateDialogOpen}
            onOpenChange={setIsUpdateDialogOpen}
          />
        </Card>
      </div>

      <AlertDialog open={!!patientToDelete} onOpenChange={() => setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the patient
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                console.log('Delete confirmed for patient:', patientToDelete)
                if (patientToDelete?.id) {
                  handleDeletePatient(patientToDelete.id)
                } else {
                  toast.error('Invalid patient data')
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
  