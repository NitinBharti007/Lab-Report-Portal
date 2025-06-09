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
  IconDotsVertical
} from "@tabler/icons-react"

export default function PatientsTable({ 
  patients, 
  sortConfig, 
  onSort, 
  onView, 
  onUpdate, 
  onDelete 
}) {
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <IconArrowsSort className="h-4 w-4 ml-1" />
    return sortConfig.direction === 'ascending' 
      ? <IconArrowUp className="h-4 w-4 ml-1" />
      : <IconArrowDown className="h-4 w-4 ml-1" />
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="whitespace-nowrap cursor-pointer group"
                onClick={() => onSort('last_name')}
              >
                <div className="flex items-center">
                  Last Name
                  <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('last_name')}
                  </span>
                </div>
              </TableHead>
              <TableHead 
                className="whitespace-nowrap cursor-pointer group"
                onClick={() => onSort('first_name')}
              >
                <div className="flex items-center">
                  First Name
                  <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('first_name')}
                  </span>
                </div>
              </TableHead>
              <TableHead 
                className="whitespace-nowrap cursor-pointer group"
                onClick={() => onSort('gender')}
              >
                <div className="flex items-center">
                  Gender
                  <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('gender')}
                  </span>
                </div>
              </TableHead>
              <TableHead 
                className="whitespace-nowrap cursor-pointer group"
                onClick={() => onSort('date_of_birth')}
              >
                <div className="flex items-center">
                  Date of Birth
                  <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('date_of_birth')}
                  </span>
                </div>
              </TableHead>
              <TableHead 
                className="whitespace-nowrap cursor-pointer group"
                onClick={() => onSort('total_reports')}
              >
                <div className="flex items-center">
                  Total Reports
                  <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getSortIcon('total_reports')}
                  </span>
                </div>
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="whitespace-nowrap">{patient.last_name}</TableCell>
                <TableCell className="whitespace-nowrap">{patient.first_name}</TableCell>
                <TableCell className="whitespace-nowrap">{patient.gender}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(patient.date_of_birth).toLocaleDateString()}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="secondary">{patient.total_reports}</Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <IconDotsVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(patient)}>
                        <IconEye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdate(patient)}>
                        <IconPencil className="h-4 w-4 mr-2" />
                        Update
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(patient)}>
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
  )
} 