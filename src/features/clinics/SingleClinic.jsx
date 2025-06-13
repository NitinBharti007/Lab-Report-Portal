import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import ClinicDetails from './components/ClinicDetails'
import { toast } from 'react-hot-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import ClinicForm from './components/ClinicForm'
import PageLayout from '@/components/layouts/PageLayout'
import { Loader } from '@/components/shared/loader'
import ReportForm from './components/ReportForm'

export default function SingleClinic() {
  const { clinicId } = useParams()
  const navigate = useNavigate()
  const { userDetails, isAuthenticated } = useAuth()
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isAddReportDialogOpen, setIsAddReportDialogOpen] = useState(false)

  useEffect(() => {
    let isMounted = true;

    const checkAuthorization = async () => {
      if (!isAuthenticated || !userDetails) {
        setLoading(true)
        return
      }

      // Check if user has access to this clinic
      if (userDetails.role !== 'admin' && userDetails.clinic_id !== clinicId) {
        toast.error('You do not have access to this clinic')
        navigate('/clinics', { replace: true })
        return
      }

      setIsAuthorized(true)
    }

    checkAuthorization()
  }, [isAuthenticated, userDetails, clinicId, navigate])

  useEffect(() => {
    let isMounted = true;

    const fetchClinic = async () => {
      if (!isAuthorized) return

      try {
        // Validate clinic ID
        if (!clinicId) {
          console.error('No clinic ID provided')
          toast.error('Invalid clinic ID')
          navigate('/clinics', { replace: true })
          return
        }

        console.log('Fetching clinic with ID:', clinicId) // Debug log

        const { data, error } = await supabase
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
            created_at,
            reports (
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
            )
          `)
          .eq('id', clinicId)
          .single()

        if (error) {
          console.error('Supabase error:', error) // Debug log
          if (error.code === 'PGRST116') {
            toast.error('Clinic not found')
            navigate('/clinics', { replace: true })
            return
          }
          throw error
        }

        if (data && isMounted) {
          console.log('Clinic data received:', data) // Debug log
          // Transform the reports data to match the expected format
          const transformedClinic = {
            ...data,
            reports: data.reports?.map(report => ({
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
              clinic_id: report.clinic_id
            })) || []
          }
          setClinic(transformedClinic)
        }
      } catch (error) {
        console.error('Error fetching clinic:', error)
        if (isMounted) {
          toast.error('Failed to load clinic details')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (isAuthorized) {
      fetchClinic()
    }

    // Set up real-time subscriptions only if authorized
    if (isAuthorized) {
      const clinicSubscription = supabase
        .channel('clinic-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clinics',
            filter: `id=eq.${clinicId}`
          },
          async (payload) => {
            console.log('Clinic change received:', payload)
            if (payload.eventType === 'DELETE') {
              toast.error('Clinic has been deleted')
              navigate('/clinics', { replace: true })
              return
            }
            
            // For UPDATE events, update the clinic state directly
            if (payload.eventType === 'UPDATE') {
              console.log('Updating clinic with payload:', payload.new)
              setClinic(prev => {
                const updatedClinic = {
                  ...prev,
                  ...payload.new,
                  last_modified: payload.new.last_modified
                }
                console.log('Updated clinic state:', updatedClinic)
                return updatedClinic
              })
              return
            }
            
            // For INSERT or other events, fetch the full clinic data
            const { data, error } = await supabase
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
                created_at,
                reports (
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
                )
              `)
              .eq('id', clinicId)
              .single()

            if (error) {
              console.error('Error fetching updated clinic:', error)
              return
            }

            if (data) {
              const transformedClinic = {
                ...data,
                reports: data.reports?.map(report => ({
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
                  clinic_id: report.clinic_id
                })) || []
              }
              setClinic(transformedClinic)
            }
          }
        )
        .subscribe()

      const reportsSubscription = supabase
        .channel('reports-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports',
            filter: `clinic_id=eq.${clinicId}`
          },
          async (payload) => {
            console.log('Report change received:', payload)
            // Fetch updated reports for the clinic
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
              .eq('clinic_id', clinicId)

            if (error) {
              console.error('Error fetching updated reports:', error)
              return
            }

            if (data) {
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
                clinic_id: report.clinic_id
              }))

              setClinic(prev => ({
                ...prev,
                reports: transformedReports,
                report_ids: transformedReports.map(r => r.id)
              }))
            }
          }
        )
        .subscribe()

      return () => {
        isMounted = false
        // Clean up subscriptions
        clinicSubscription.unsubscribe()
        reportsSubscription.unsubscribe()
      }
    }

    return () => {
      isMounted = false
    }
  }, [clinicId, isAuthorized, navigate])

  const handleBack = () => {
    navigate('/clinics', { replace: true })
  }

  const handleEditClinic = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (userDetails?.role !== 'admin') {
      toast.error('Only administrators can edit clinics')
      return
    }
    
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (data) => {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: data.name,
          address: data.address,
          region: data.region,
          email: data.email,
          logo_url: data.logo_url,
          last_modified: new Date().toISOString()
        })
        .eq('id', clinicId)

      if (error) throw error

      // Update local state immediately
      setClinic(prev => ({
        ...prev,
        name: data.name,
        address: data.address,
        region: data.region,
        email: data.email,
        logo_url: data.logo_url,
        last_modified: new Date().toISOString()
      }))

      setIsEditDialogOpen(false)
      toast.success('Clinic updated successfully')
    } catch (error) {
      console.error('Error updating clinic:', error)
      toast.error('Failed to update clinic')
    }
  }

  const handleDeleteClinic = () => {
    if (userDetails?.role !== 'admin') {
      toast.error('Only administrators can delete clinics')
      return
    }
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', clinicId)

      if (error) throw error

      toast.success('Clinic deleted successfully')
      navigate('/clinics', { replace: true })
    } catch (error) {
      console.error('Error deleting clinic:', error)
      toast.error('Failed to delete clinic')
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  const handleAddReport = () => {
    setIsAddReportDialogOpen(true)
  }

  const handleAddReportSubmit = async (data) => {
    try {
      // First, generate a reference ID
      const { data: existingReports, error: countError } = await supabase
        .from('reports')
        .select('reference_id')
        .order('reference_id', { ascending: false })
        .limit(1)

      if (countError) throw countError

      let newReferenceId = 'REP001'
      if (existingReports && existingReports.length > 0 && existingReports[0].reference_id) {
        const lastRefId = existingReports[0].reference_id
        const match = lastRefId.match(/REP(\d+)/)
        if (match) {
          const lastNumber = parseInt(match[1]) || 0
          newReferenceId = `REP${(lastNumber + 1).toString().padStart(3, '0')}`
        }
      }

      // Generate invoice number
      const { data: lastInvoice, error: invoiceError } = await supabase
        .from('reports')
        .select('invoice_number')
        .order('invoice_number', { ascending: false })
        .limit(1)

      if (invoiceError) throw invoiceError

      let newInvoiceNumber = 'INV001'
      if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].invoice_number) {
        const lastInvId = lastInvoice[0].invoice_number
        const match = lastInvId.match(/INV(\d+)/)
        if (match) {
          const lastNumber = parseInt(match[1]) || 0
          newInvoiceNumber = `INV${(lastNumber + 1).toString().padStart(3, '0')}`
        }
      }

      // Generate tracking number
      const { data: lastTracking, error: trackingError } = await supabase
        .from('reports')
        .select('tracking_number')
        .order('tracking_number', { ascending: false })
        .limit(1)

      if (trackingError) throw trackingError

      let newTrackingNumber = 'TRACK001'
      if (lastTracking && lastTracking.length > 0 && lastTracking[0].tracking_number) {
        const lastTrackId = lastTracking[0].tracking_number
        const match = lastTrackId.match(/TRACK(\d+)/)
        if (match) {
          const lastNumber = parseInt(match[1]) || 0
          newTrackingNumber = `TRACK${(lastNumber + 1).toString().padStart(3, '0')}`
        }
      }

      // Handle PDF upload if provided
      let pdfUrl = null
      if (data.reportPDF) {
        const file = data.reportPDF
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `reports/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath)

        pdfUrl = publicUrl
      }

      // Convert empty date strings to null
      const formatDate = (dateStr) => {
        if (!dateStr) return null
        return dateStr
      }

      // Insert the new report
      const { data: newReport, error } = await supabase
        .from('reports')
        .insert([{
          reference_id: newReferenceId,
          status: data.testStatus,
          patient_id: data.patient,
          clinic_id: clinic.id,
          lab_test_type: data.labTestType,
          processing_lab: data.processingLab,
          invoice_number: newInvoiceNumber,
          sample_collection_date: formatDate(data.sampleCollectionDate),
          date_picked_up_by_lab: data.datePickedUpByLab,
          date_shipped_to_lab: formatDate(data.dateShippedToLab),
          tracking_number: newTrackingNumber,
          report_completion_date: formatDate(data.reportCompletionDate),
          notes: data.notes || null,
          pdf_url: pdfUrl,
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString()
        }])
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

      // Transform the data to match the UI format
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

      // Update the reports list with the new report
      setClinic(prev => ({
        ...prev,
        reports: [transformedReport, ...prev.reports],
        report_ids: [transformedReport.id, ...prev.report_ids]
      }))
      setIsAddReportDialogOpen(false)
      toast.success('Report added successfully')
    } catch (error) {
      console.error('Error adding report:', error)
      toast.error(error.message || 'Failed to add report')
    }
  }

  const handleViewReport = (report) => {
    navigate(`/reports/${report.id}`)
  }

  // Show loading state while checking authorization or fetching data
  if (loading || !isAuthorized) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader message="Loading clinic details..." />
        </div>
      </PageLayout>
    )
  }

  if (!clinic) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">Clinic not found</div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="container mx-auto py-6">
        <ClinicDetails
          clinic={clinic}
          onBack={handleBack}
          onEditClinic={handleEditClinic}
          onDeleteClinic={handleDeleteClinic}
          onAddReport={handleAddReport}
          userDetails={userDetails}
          onViewReport={handleViewReport}
        />

        {isEditDialogOpen && (
          <ClinicForm
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSubmit={handleEditSubmit}
            initialData={clinic}
            mode="edit"
          />
        )}

        <ReportForm
          isOpen={isAddReportDialogOpen}
          onClose={() => setIsAddReportDialogOpen(false)}
          onSubmit={handleAddReportSubmit}
          clinic={clinic}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the clinic
                and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                Delete Clinic
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  )
} 