import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconSearch, IconPlus } from "@tabler/icons-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IconMapPin, IconMail } from "@tabler/icons-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

export default function ClinicList({ 
  clinics, 
  onAddClinic
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const navigate = useNavigate()
  const { userDetails } = useAuth()

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewClinic = (clinic) => {
    navigate(`/clinic/${clinic.id}`)
  }

  return (
    <div className="container mx-auto py-2 px-2 sm:py-8 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Clinics</h1>
          <p className="text-xs sm:text-base text-muted-foreground">
            {clinics.length} {clinics.length === 1 ? 'clinic' : 'clinics'}
          </p>
        </div>
        {userDetails?.role === 'admin' && (
          <Button onClick={onAddClinic} className="w-full sm:w-auto text-sm sm:text-base">
            <IconPlus className="h-4 w-4 mr-2" />
            Add Clinic
          </Button>
        )}
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clinics by name, region, or email..."
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
                    <AvatarImage 
                      src={clinic.logo_url} 
                      alt={clinic.name}
                      className="object-cover"
                      onError={(e) => {
                        console.error('Error loading image:', clinic.logo_url);
                        e.target.style.display = 'none';
                      }}
                    />
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
                    onClick={() => handleViewClinic(clinic)} 
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 