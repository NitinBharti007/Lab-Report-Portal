import { useState } from "react"
import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  IconEye, 
  IconPencil, 
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconDownload,
  IconDotsVertical
} from "@tabler/icons-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from 'react-hot-toast'

export default function ReportsTable({ 
  reports, 
  sortConfig, 
  onSort, 
  onView, 
  onUpdate, 
  onDelete,
  onDownloadPDF
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (report) => {
    setReportToDelete(report)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return

    try {
      setIsDeleting(true)
      await onDelete(reportToDelete.id)
      setDeleteDialogOpen(false)
      setReportToDelete(null)
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <IconArrowsSort className="h-4 w-4 ml-1" />
    return sortConfig.direction === 'asc' 
      ? <IconArrowUp className="h-4 w-4 ml-1" />
      : <IconArrowDown className="h-4 w-4 ml-1" />
  }

  const getStatusVariant = (status) => {
    if (!status) return 'secondary'
    
    switch (status.toLowerCase()) {
      case 'sample received':
        return 'info'
      case 'resample required':
        return 'warning'
      case 'in progress':
        return 'warning'
      case 'ready':
        return 'success'
      default:
        return 'secondary'
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="whitespace-nowrap cursor-pointer group"
                  onClick={() => onSort('testStatus')}
                >
                  <div className="flex items-center">
                    Status
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getSortIcon('testStatus')}
                    </span>
                  </div>
                </TableHead>
                <TableHead 
                  className="whitespace-nowrap cursor-pointer group"
                  onClick={() => onSort('lastName')}
                >
                  <div className="flex items-center">
                    Last Name
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getSortIcon('lastName')}
                    </span>
                  </div>
                </TableHead>
                <TableHead 
                  className="whitespace-nowrap cursor-pointer group"
                  onClick={() => onSort('firstName')}
                >
                  <div className="flex items-center">
                    First Name
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getSortIcon('firstName')}
                    </span>
                  </div>
                </TableHead>
                <TableHead 
                  className="whitespace-nowrap cursor-pointer group"
                  onClick={() => onSort('associatedClinic')}
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
                  onClick={() => onSort('testType')}
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
                  onClick={() => onSort('reportCompletionDate')}
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
                  onClick={() => onSort('processingLab')}
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
                  onClick={() => onSort('invoice_number')}
                >
                  <div className="flex items-center">
                    Invoice
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getSortIcon('invoice_number')}
                    </span>
                  </div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant={getStatusVariant(report.testStatus)}>
                      {report.testStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{report.lastName}</TableCell>
                  <TableCell className="whitespace-nowrap">{report.firstName}</TableCell>
                  <TableCell className="whitespace-nowrap">{report.associatedClinic}</TableCell>
                  <TableCell className="whitespace-nowrap">{report.testType}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {report.reportCompletionDate ? new Date(report.reportCompletionDate).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{report.processingLab}</TableCell>
                  <TableCell className="whitespace-nowrap">{report.invoice_number}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <IconDotsVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(report)}>
                          <IconEye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {report.pdf_url && (
                          <DropdownMenuItem onClick={() => onDownloadPDF(report)}>
                            <IconDownload className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onUpdate(report)}>
                          <IconPencil className="h-4 w-4 mr-2" />
                          Update
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(report)}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
              {reportToDelete && (
                <div className="mt-2 text-sm">
                  <p>Report ID: {reportToDelete.reference_id}</p>
                  <p>Patient: {reportToDelete.firstName} {reportToDelete.lastName}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 