import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconSearch, IconPlus, IconEdit, IconTrash } from "@tabler/icons-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IconMapPin, IconMail } from "@tabler/icons-react"
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
import { toast } from "sonner"

export default function ClinicList({ 
  clinics, 
  onAddClinic, 
  onViewClinic,
  onDeleteClinic,
  onEditClinic 
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [clinicToDelete, setClinicToDelete] = useState(null)

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteClick = (clinic) => {
    setClinicToDelete(clinic)
  }

  const handleDeleteConfirm = async () => {
    if (clinicToDelete) {
      try {
        await onDeleteClinic(clinicToDelete.id)
        toast.success("Clinic deleted successfully")
      } catch (error) {
        toast.error("Failed to delete clinic")
        console.error("Error deleting clinic:", error)
      }
      setClinicToDelete(null)
    }
  }

  return (
    <div className="container mx-auto py-2 px-2 sm:py-8 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Clinics</h1>
          <p className="text-xs sm:text-base text-muted-foreground">Manage your clinic network</p>
        </div>
        <Button onClick={onAddClinic} className="w-full sm:w-auto text-sm sm:text-base">
          <IconPlus className="h-4 w-4 mr-2" />
          Add Clinic
        </Button>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clinics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full text-sm sm:text-base"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-6">
        {filteredClinics.map((clinic) => (
          <Card key={clinic.id} className="w-full">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 w-full sm:w-auto">
                  <Avatar className="h-8 w-8 sm:h-12 sm:w-12">
                    <AvatarImage src={clinic.logo_url} className="object-cover" />
                    <AvatarFallback className="text-xs sm:text-sm">{clinic.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-lg font-semibold truncate">{clinic.name}</h3>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2">
                        <IconMapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {clinic.region}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconMail className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {clinic.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => onViewClinic(clinic)} 
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onEditClinic(clinic)} 
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <IconEdit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteClick(clinic)} 
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <IconTrash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!clinicToDelete} onOpenChange={() => setClinicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the clinic
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 