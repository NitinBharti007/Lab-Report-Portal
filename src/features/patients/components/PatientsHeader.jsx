import { Button } from "@/components/ui/button"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconPlus, IconDownload } from "@tabler/icons-react"

export default function PatientsHeader({ 
  totalPatients, 
  onAddPatient, 
  onExport 
}) {
  return (
    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 px-3 sm:px-6">
      <div>
        <CardTitle className="text-xl sm:text-2xl font-bold">Patients</CardTitle>
        <CardDescription className="text-sm">
          {totalPatients} patients
        </CardDescription>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button onClick={onAddPatient} size="sm" className="w-full sm:w-auto">
          <IconPlus className="h-4 w-4 mr-2" />
          Add Patient
        </Button>
        <Button onClick={onExport} variant="outline" size="sm" className="w-full sm:w-auto">
          <IconDownload className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </CardHeader>
  )
} 