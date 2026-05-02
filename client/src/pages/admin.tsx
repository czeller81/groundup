import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar, DollarSign, Users, CalendarDays, Edit, X, LogOut, Download } from "lucide-react";

interface AdminStats {
  todaySessions: number;
  weekSessions: number;
  monthRevenue: number;
  activeClients: number;
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ email: "admin@groundupbjj.com", password: "ChangeMe123!" });
  const [filters, setFilters] = useState({
    trainerId: "all",
    status: "all",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest("POST", "/api/admin/login", credentials);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      if (result.success) {
        setIsLoggedIn(true);
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/bookings"],
    enabled: isLoggedIn,
  });

  // Fetch trainers
  const { data: trainers = [] } = useQuery<any[]>({
    queryKey: ["/api/trainers"],
    enabled: isLoggedIn,
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("PUT", `/api/admin/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Booking Cancelled",
        description: "The booking has been successfully cancelled",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginData({ email: "admin@groundupbjj.com", password: "ChangeMe123!" });
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelBookingMutation.mutate(bookingId);
    }
  };

  const handleExportCSV = () => {
    if (bookings.length === 0) {
      toast({
        title: "No Data",
        description: "No bookings available to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = ["Date", "Time", "Client", "Email", "Phone", "Trainer", "Session", "Amount", "Status"];
    const csvData = bookings.map((booking: any) => [
      format(new Date(booking.start), "yyyy-MM-dd"),
      format(new Date(booking.start), "HH:mm") + " - " + format(new Date(booking.end), "HH:mm"),
      booking.customerName,
      booking.customerEmail,
      booking.customerPhone,
      booking.trainer?.name || "Unknown",
      booking.sessionType,
      `$${booking.amountCents / 100}`,
      booking.status
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported",
      description: "Bookings data has been exported successfully",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "canceled": return "destructive";
      case "refunded": return "outline";
      default: return "secondary";
    }
  };

  // Calculate stats
  const stats: AdminStats = {
    todaySessions: bookings.filter((b: any) => {
      const today = new Date().toDateString();
      return new Date(b.start).toDateString() === today && b.status === "paid";
    }).length,
    weekSessions: bookings.filter((b: any) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(b.start) >= weekAgo && b.status === "paid";
    }).length,
    monthRevenue: bookings
      .filter((b: any) => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(b.start) >= monthAgo && b.status === "paid";
      })
      .reduce((sum: number, b: any) => sum + (b.amountCents / 100), 0),
    activeClients: new Set(bookings.map((b: any) => b.customerEmail)).size,
  };

  // Filter bookings
  const filteredBookings = bookings.filter((booking: any) => {
    if (filters.trainerId !== "all" && booking.trainerId !== filters.trainerId) return false;
    if (filters.status !== "all" && booking.status !== filters.status) return false;
    return true;
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md" data-testid="admin-login">
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
            <p className="text-center text-muted-foreground">Access the booking management dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  data-testid="input-admin-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold">Booking Management</h1>
              <p className="text-muted-foreground">Manage personal training appointments and schedules</p>
            </div>
            <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-today">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Today's Sessions</p>
                  <p className="text-2xl font-bold">{stats.todaySessions}</p>
                </div>
                <CalendarDays className="text-primary h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-week">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">This Week</p>
                  <p className="text-2xl font-bold">{stats.weekSessions}</p>
                </div>
                <Calendar className="text-primary h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-revenue">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Revenue (Month)</p>
                  <p className="text-2xl font-bold">${stats.monthRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="text-primary h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-clients">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Clients</p>
                  <p className="text-2xl font-bold">{stats.activeClients}</p>
                </div>
                <Users className="text-primary h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-8" data-testid="booking-management">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <CardTitle>Booking Management</CardTitle>
              <div className="flex space-x-4">
                <Select value={filters.trainerId} onValueChange={(value) => setFilters(prev => ({ ...prev, trainerId: value }))}>
                  <SelectTrigger className="w-40" data-testid="filter-trainer">
                    <SelectValue placeholder="All Trainers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trainers</SelectItem>
                    {trainers.map((trainer: any) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-32" data-testid="filter-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Bookings Table */}
          <CardContent>
            {bookingsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-bookings">
                No bookings found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="bookings-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking: any) => (
                      <TableRow key={booking.id} data-testid={`booking-row-${booking.id}`}>
                        <TableCell>
                          <div>{format(new Date(booking.start), "MMM dd, yyyy")}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(booking.start), "h:mm a")} - {format(new Date(booking.end), "h:mm a")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{booking.customerName}</div>
                          <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                          <div className="text-sm text-muted-foreground">{booking.customerPhone}</div>
                        </TableCell>
                        <TableCell>{booking.trainer?.name || "Unknown"}</TableCell>
                        <TableCell>{booking.sessionType}</TableCell>
                        <TableCell>${(booking.amountCents / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" data-testid={`edit-booking-${booking.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {booking.status !== "canceled" && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCancelBooking(booking.id)}
                                data-testid={`cancel-booking-${booking.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trainer Availability Management */}
        <Card data-testid="trainer-availability">
          <CardHeader>
            <CardTitle>Trainer Availability</CardTitle>
            <p className="text-muted-foreground">Manage trainer schedules and availability</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              {trainers.slice(0, 3).map((trainer: any) => (
                <div key={trainer.id} data-testid={`trainer-schedule-${trainer.id}`}>
                  <h3 className="font-bold mb-4">{trainer.name}</h3>
                  <div className="space-y-2">
                    {Object.entries(trainer.availability || {}).map(([day, times]) => (
                      <div key={day} className="flex justify-between items-center">
                        <span className="text-sm">{day}</span>
                        <span className="text-sm text-muted-foreground">
                          {Array.isArray(times) && times.length > 0 
                            ? `${times[0]} - ${times[times.length - 1]}`
                            : "Unavailable"
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-4 text-primary hover:text-primary/80">
                    Edit Schedule
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
