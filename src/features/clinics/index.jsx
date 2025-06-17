import { useState, useEffect } from "react"
import PageLayout from "@/components/layouts/PageLayout"
import { Loader } from "@/components/shared/loader"
import * as z from "zod"
import ClinicList from "./components/ClinicList"
import ClinicDetails from "./components/ClinicDetails"
import ClinicForm from "./components/ClinicForm"
import ContactForm from "./components/ContactForm"
import ReportForm from "./components/ReportForm"
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast'
import { useLocation } from 'react-router-dom'

// Form schema for clinic
const clinicFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  region: z.string().min(2, "Region must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  logo_url: z.string().url("Invalid URL").optional(),
  contact_ids: z.array(z.string().uuid()).optional(),
  report_ids: z.array(z.string().uuid()).optional(),
})

export default function Clinics() {
  const [isLoading, setIsLoading] = useState(true)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [editingClinic, setEditingClinic] = useState(null)
  const [clinics, setClinics] = useState([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false)
  const [isAddReportDialogOpen, setIsAddReportDialogOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    fetchClinics()
  }, [])

  // Handle clinic selection from URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const clinicId = searchParams.get('clinic')
    
    if (clinicId && clinics.length > 0) {
      const clinic = clinics.find(c => c.id === clinicId)
      if (clinic) {
        handleViewClinic(clinic)
      }
    }
  }, [location.search, clinics])

  const fetchClinics = async () => {
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
        throw new Error('Please log in to view clinics')
      }

      console.log('Fetching clinics for user:', user.id)
      
      // Get user's role and clinic_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, clinic_id')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        throw userError
      }

      let query = supabase
        .from('clinics')
        .select(`
          id,
          reference_id,
          name,
          address,
          region,
          email,
          logo_url,
          contact_ids,
          report_ids,
          last_modified,
          created_at
        `)
        .order('created_at', { ascending: false })

      // If user is not admin, only show their linked clinic
      if (userData.role !== 'admin' && userData.clinic_id) {
        query = query.eq('id', userData.clinic_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Fetched clinics:', data)
      setClinics(data || [])
    } catch (error) {
      console.error('Error fetching clinics:', error)
      toast.error(error.message || 'Failed to fetch clinics')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewClinic = (clinic) => {
    setIsViewLoading(true)
    setTimeout(() => {
      setSelectedClinic(clinic)
      setIsViewLoading(false)
    }, 500)
  }

  const handleAddClinic = async (data) => {
    try {
      console.log('Adding new clinic with data:', data)
      
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!user) {
        throw new Error('Please log in to add a clinic')
      }

      // Check if user is an admin
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
        throw new Error('Only administrators can add new clinics')
      }

      // Get the latest clinic to determine the next reference ID
      const { data: existingClinics, error: latestError } = await supabase
        .from('clinics')
        .select('reference_id')
        .order('reference_id', { ascending: false })

      if (latestError) {
        console.error('Error fetching clinics:', latestError)
        throw latestError
      }

      // Generate new reference ID
      let newReferenceId = 'CLINIC001'
      if (existingClinics && existingClinics.length > 0) {
        // Find the highest number from existing reference IDs
        const highestNumber = existingClinics.reduce((max, clinic) => {
          const number = parseInt(clinic.reference_id.replace('CLINIC', '')) || 0
          return Math.max(max, number)
        }, 0)
        
        const nextNumber = highestNumber + 1
        newReferenceId = `CLINIC${nextNumber.toString().padStart(3, '0')}`
      }

      // Create a sanitized clinic name
      const sanitizedClinicName = data.name
        .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
        .toUpperCase() // Convert to uppercase
        .substring(0, 10) // Limit to 10 characters

      // Generate a proper UUID
      const uuid = crypto.randomUUID()
      
      const { data: newClinic, error } = await supabase
        .from('clinics')
        .insert([{
          id: uuid,
          name: data.name,
          address: data.address,
          region: data.region,
          email: data.email,
          logo_url: data.logo_url || null,
          contact_ids: [],
          report_ids: [],
          reference_id: `${newReferenceId}-${sanitizedClinicName}`, // Store combined identifier in reference_id
          last_modified: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error adding clinic:', error)
        throw error
      }

      console.log('Successfully added clinic:', newClinic)
      
      // Update the clinics list with the new clinic
      setClinics(prev => [newClinic, ...prev])
      
      // Close the add dialog
      setIsAddDialogOpen(false)
      
      toast.success('Clinic added successfully')
    } catch (error) {
      console.error('Error adding clinic:', error)
      toast.error(error.message || 'Failed to add clinic')
    }
  }

  const handleDeleteClinic = async (clinicId) => {
    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!user) {
        throw new Error('Please log in to delete a clinic')
      }

      // Check if user is an admin
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
        throw new Error('Only administrators can delete clinics')
      }

      // Delete the clinic
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', clinicId)

      if (error) throw error

      // Update the local state
      setClinics(prev => prev.filter(clinic => clinic.id !== clinicId))
      toast.success('Clinic deleted successfully')
    } catch (error) {
      console.error('Error deleting clinic:', error)
      toast.error(error.message || 'Failed to delete clinic')
    }
  }

  const handleEditClinic = async (data) => {
    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!user) {
        throw new Error('Please log in to edit a clinic')
      }

      // Check user's role and clinic association
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, clinic_id')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error checking user data:', userError)
        throw userError
      }

      // Allow if user is admin or if user is linked to the clinic being edited
      if (!userData || (userData.role !== 'admin' && userData.clinic_id !== editingClinic.id)) {
        throw new Error('You can only edit your linked clinic')
      }

      console.log('Editing clinic:', editingClinic)
      console.log('Update data:', data)

      // Update the clinic
      const { data: updatedClinic, error: updateError } = await supabase
        .from('clinics')
        .update({
          name: data.name,
          address: data.address,
          region: data.region,
          email: data.email,
          logo_url: data.logo_url,
          last_modified: new Date().toISOString()
        })
        .eq('id', editingClinic.id)
        .select()
        .single()

      if (updateError) throw updateError

      console.log('Updated clinic:', updatedClinic)

      // Update the local state
      setClinics(prev => prev.map(clinic => {
        if (clinic.id === editingClinic.id) {
          return {
            ...clinic,
            ...updatedClinic
          }
        }
        return clinic
      }))

      // If the edited clinic is currently selected, update it
      if (selectedClinic && selectedClinic.id === editingClinic.id) {
        setSelectedClinic(prev => ({
          ...prev,
          ...updatedClinic
        }))
      }

      toast.success('Clinic updated successfully')
      setIsEditDialogOpen(false)
      setEditingClinic(null)
    } catch (error) {
      console.error('Error updating clinic:', error)
      toast.error(error.message || 'Failed to update clinic')
    }
  }

  const handleAddContact = async (data) => {
    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }

      if (!user) {
        throw new Error('Please log in to add a contact')
      }

      // Check user's role and clinic association
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, clinic_id')
        .eq('user_id', user.id)
        .single()

      if (userError) {
        console.error('Error checking user data:', userError)
        throw userError
      }

      // Allow if user is admin or if user is linked to the clinic
      if (!userData || (userData.role !== 'admin' && userData.clinic_id !== selectedClinic.id)) {
        throw new Error('You can only add contacts to your linked clinic')
      }

      // Generate a new contact ID (you might want to use a proper UUID generation)
      const newContactId = crypto.randomUUID()

      // Get current contact_ids array
      const currentContactIds = selectedClinic.contact_ids || []

      // Update the clinic with the new contact ID
      const { data: updatedClinic, error } = await supabase
        .from('clinics')
        .update({
          contact_ids: [...currentContactIds, newContactId],
          last_modified: new Date().toISOString()
        })
        .eq('id', selectedClinic.id)
        .select()
        .single()

      if (error) {
        console.error('Error adding contact:', error)
        throw error
      }

      // Update the local state
      setClinics(prev => prev.map(clinic => 
        clinic.id === selectedClinic.id 
          ? { ...clinic, contact_ids: updatedClinic.contact_ids }
          : clinic
      ))
      setSelectedClinic(prev => ({
        ...prev,
        contact_ids: updatedClinic.contact_ids
      }))
      setIsAddContactDialogOpen(false)
    } catch (error) {
      console.error('Error adding contact:', error)
      // You might want to show an error toast here
    }
  }

  const handleAddReport = async (reportData) => {
    try {
      // Generate a reference ID for the report
      const { data: existingReports, error: countError } = await supabase
        .from('reports')
        .select('reference_id')
        .order('reference_id', { ascending: false })
        .limit(1)

      if (countError) throw countError

      let newReferenceId = 'REP001'
      if (existingReports && existingReports.length > 0) {
        const lastNumber = parseInt(existingReports[0].reference_id.replace('REP', '')) || 0
        newReferenceId = `REP${(lastNumber + 1).toString().padStart(3, '0')}`
      }

      // First, fetch the patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('first_name, last_name')
        .eq('id', reportData.patient)
        .single()

      if (patientError) throw patientError

      const { data: newReport, error } = await supabase
        .from('reports')
        .insert({
          reference_id: newReferenceId,
          status: reportData.testStatus,
          patient_id: reportData.patient,
          clinic_id: selectedClinic.id,
          lab_test_type: reportData.labTestType,
          processing_lab: reportData.processingLab,
          invoice_number: reportData.invoiceNumber,
          sample_collection_date: reportData.sampleCollectionDate,
          date_picked_up_by_lab: reportData.datePickedUpByLabLink,
          date_shipped_to_lab: reportData.dateShippedToLab,
          tracking_number: reportData.trackingNumber,
          report_completion_date: reportData.reportCompletionDate,
          notes: reportData.notes,
          pdf_url: reportData.reportPDF
        })
        .select()
        .single()

      if (error) throw error

      // Transform the report data for the UI
      const transformedReport = {
        id: newReport.id,
        referenceId: newReport.reference_id,
        firstName: patientData.first_name || 'N/A',
        lastName: patientData.last_name || 'N/A',
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
        associatedClinic: selectedClinic.name
      }

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
        .eq('clinic_id', selectedClinic.id)
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
        associatedClinic: selectedClinic.name
      }))

      // Update the clinics list with all reports
      setClinics(prev => prev.map(clinic => {
        if (clinic.id === selectedClinic.id) {
          return {
            ...clinic,
            reports: transformedReports,
            report_ids: transformedReports.map(r => r.id)
          }
        }
        return clinic
      }))

      // Update the selected clinic with all reports
      setSelectedClinic(prev => ({
        ...prev,
        reports: transformedReports,
        report_ids: transformedReports.map(r => r.id)
      }))

      setIsAddReportDialogOpen(false)
      toast.success('Report added successfully')
    } catch (error) {
      console.error('Error adding report:', error)
      toast.error('Failed to add report')
      throw error // Re-throw to let the form component know about the error
    }
  }

  const handleUpdateReport = async (updatedReport) => {
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
        .eq('clinic_id', updatedReport.clinic_id)
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
        associatedClinic: selectedClinic?.name || 'N/A'
      }))

      // Update the clinics list with all reports
      setClinics(prev => prev.map(clinic => {
        if (clinic.id === updatedReport.clinic_id) {
          return {
            ...clinic,
            reports: transformedReports,
            report_ids: transformedReports.map(r => r.id)
          }
        }
        return clinic
      }))

      // If a clinic is selected, update its reports immediately
      if (selectedClinic && selectedClinic.id === updatedReport.clinic_id) {
        setSelectedClinic(prev => ({
          ...prev,
          reports: transformedReports,
          report_ids: transformedReports.map(r => r.id)
        }))
      }

      // Force a re-render of the ClinicDetails component
      setSelectedClinic(prev => ({ ...prev }))

      toast.success('Report updated successfully')
    } catch (error) {
      console.error('Error updating report in parent:', error)
      toast.error('Failed to update report')
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader message="Loading clinics..." />
        </div>
      </PageLayout>
    )
  }

  if (isViewLoading) {
    return (
      <PageLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader message="Loading clinic details..." />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {selectedClinic ? (
        <ClinicDetails
          clinic={selectedClinic}
          onBack={() => setSelectedClinic(null)}
          onEditClinic={() => {
            setEditingClinic(selectedClinic)
            setIsEditDialogOpen(true)
          }}
          onAddContact={() => setIsAddContactDialogOpen(true)}
          onAddReport={() => setIsAddReportDialogOpen(true)}
          onUpdateReport={handleUpdateReport}
        />
      ) : (
        <ClinicList
          clinics={clinics}
          onAddClinic={() => setIsAddDialogOpen(true)}
          onViewClinic={handleViewClinic}
          onDeleteClinic={handleDeleteClinic}
          onEditClinic={(clinic) => {
            setEditingClinic(clinic)
            setIsEditDialogOpen(true)
          }}
        />
      )}

      <ClinicForm
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSubmit={handleAddClinic}
        mode="add"
      />

      <ClinicForm
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditingClinic(null)
        }}
        onSubmit={handleEditClinic}
        initialData={editingClinic}
        mode="edit"
      />

      <ContactForm
        isOpen={isAddContactDialogOpen}
        onClose={() => setIsAddContactDialogOpen(false)}
        onSubmit={handleAddContact}
      />

      <ReportForm
        isOpen={isAddReportDialogOpen}
        onClose={() => setIsAddReportDialogOpen(false)}
        onSubmit={handleAddReport}
      />
    </PageLayout>
  )
}
  