import { Button } from "@/components/ui/button"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconDownload, IconPlus } from "@tabler/icons-react"

export default function ReportsHeader({ 
  totalReports, 
  onExport,
  onAdd
}) {
  return (
    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 px-3 sm:px-6">
      <div>
        <CardTitle className="text-xl sm:text-2xl font-bold">All Patient Reports</CardTitle>
        <CardDescription className="text-sm">
          {totalReports} reports
        </CardDescription>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button
          size="sm"
          onClick={onAdd}
          className="flex items-center"
        >
          <IconPlus className="h-4 w-4 mr-2" />
          Add Report
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center"
        >
          <IconDownload className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </CardHeader>
  )
} 