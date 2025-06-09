import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconReportMedical, IconEye } from "@tabler/icons-react"
import { Link } from "react-router-dom"

export default function ClientDashboard() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold">Client Dashboard</h1>
                <p className="text-muted-foreground">View your medical reports</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Recent Reports Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconReportMedical className="h-5 w-5" />
                      Recent Reports
                    </CardTitle>
                    <CardDescription>Your latest medical reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="text-2xl font-bold">12</div>
                      <Button asChild className="w-full">
                        <Link to="/reports">
                          <IconEye className="mr-2 h-4 w-4" />
                          View Reports
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Reports Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconReportMedical className="h-5 w-5" />
                      Pending Reports
                    </CardTitle>
                    <CardDescription>Reports awaiting results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="text-2xl font-bold">3</div>
                      <Button asChild className="w-full">
                        <Link to="/reports?status=pending">
                          <IconEye className="mr-2 h-4 w-4" />
                          View Pending
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Completed Reports Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconReportMedical className="h-5 w-5" />
                      Completed Reports
                    </CardTitle>
                    <CardDescription>Reports with results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="text-2xl font-bold">9</div>
                      <Button asChild className="w-full">
                        <Link to="/reports?status=completed">
                          <IconEye className="mr-2 h-4 w-4" />
                          View Completed
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 