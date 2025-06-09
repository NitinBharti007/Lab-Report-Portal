import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconSearch } from "@tabler/icons-react"

// These values should match exactly with the database enum values
const TEST_STATUSES = ["Sample Received", "Resample Required", "In Progress", "Ready"]
const TEST_TYPES = ["Blood", "Urine", "COVID-19", "DNA"]
const PROCESSING_LABS = ["Central Lab", "East Lab", "West Lab", "North Lab"]

export default function ReportsFilters({ 
  searchQuery, 
  onSearchChange, 
  filters, 
  onFilterChange 
}) {
  return (
    <div className="p-4 space-y-4 border-b">
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select
          value={filters.testStatus}
          onValueChange={(value) => onFilterChange('testStatus', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TEST_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.testType}
          onValueChange={(value) => onFilterChange('testType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Test Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Test Types</SelectItem>
            {TEST_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.processingLab}
          onValueChange={(value) => onFilterChange('processingLab', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Processing Lab" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labs</SelectItem>
            {PROCESSING_LABS.map((lab) => (
              <SelectItem key={lab} value={lab}>
                {lab}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 