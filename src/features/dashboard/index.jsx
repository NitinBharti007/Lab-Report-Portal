import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/shared/app-sidebar"
import { ChartAreaInteractive } from "@/components/shared/chart-area-interactive"
import { DataTable } from "@/components/shared/data-table"
import { SectionCards } from "@/components/shared/section-cards"
import { SiteHeader } from "@/components/shared/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Loader } from "@/components/shared/loader"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import AdminDashboard from "./AdminDashboard"
import ClientDashboard from "./ClientDashboard"


export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const [userDetails, setUserDetails] = useState(null)

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user) return;
  
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("user_id", user.id)
          .single();
  
        if (error) throw error;
        setUserDetails(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching user details:", error.message);
        setIsLoading(false);
      }
    };
  
    fetchUserDetails();
  }, [user?.id]);

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <Loader message="Loading dashboard..." />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {userDetails?.role === 'admin' ? <AdminDashboard /> : <ClientDashboard />}
      </SidebarInset>
    </SidebarProvider>
  )
}