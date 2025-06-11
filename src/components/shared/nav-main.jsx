import { IconCirclePlusFilled, IconMail } from "@tabler/icons-react";
import { Link, useLocation, useNavigate } from "react-router-dom"
// import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

export function NavMain({
  items
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { userDetails } = useAuth()

  const handleNavigation = (url) => {
    navigate(url)
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {userDetails?.role === 'admin' && (
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              {/* <SidebarMenuButton
                tooltip="Quick Create"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear">
                <IconCirclePlusFilled />
                <span>Quick Create</span>
              </SidebarMenuButton> */}
              {/* <Button
                size="icon"
                className="size-8 group-data-[collapsible=icon]:opacity-0"
                variant="outline">
                <IconMail />
                <span className="sr-only">Inbox</span>
              </Button> */}
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  className={`w-full justify-start ${
                    isActive ? "bg-muted text-primary" : "text-muted-foreground"
                  }`}
                  onClick={() => handleNavigation(item.url)}
                >
                  {item.icon && <item.icon/>}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
