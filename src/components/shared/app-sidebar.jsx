import * as React from "react"
import {
  IconDashboard,
  IconHospital,
  IconInnerShadowTop,
  IconReportMedical,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/shared/nav-main"
import { NavUser } from "@/components/shared/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

export function AppSidebar({
  ...props
}) {
  const { userDetails } = useAuth()

  const adminNavItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Clinics",
      url: "/clinics",
      icon: IconHospital,
    },
    {
      title: "Patients",
      url: "/patients",
      icon: IconUsers,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: IconReportMedical,
    },
  ]

  const clientNavItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: IconReportMedical,
    },
  ]

  const navItems = userDetails?.role === 'admin' ? adminNavItems : clientNavItems

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link to="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">LAB REPORT PORTAL</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userDetails} />
      </SidebarFooter>
    </Sidebar>
  );
}
