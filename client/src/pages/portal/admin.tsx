import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePortalAuth } from "@/lib/portal-auth";
import { Search, Users, ArrowLeft, FileText, Calendar, Mail, Phone, Clock, CheckCircle, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface MemberProfile {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    createdAt: string;
  };
  formResponses: {
    id: string;
    formId: string;
    answers: any;
    status: string;
    submittedAt: string | null;
    createdAt: string;
    updatedAt: string;
    form: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      fields: any;
      isRequired: boolean;
    };
  }[];
  bookings: {
    id: string;
    start: string;
    end: string;
    sessionType: string;
    status: string;
    amountCents: number;
    trainer: { name: string };
  }[];
}

export default function PortalAdmin() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, isAdmin } = usePortalAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formDetailOpen, setFormDetailOpen] = useState<{ open: boolean; response: any | null }>({ open: false, response: null });

  const { data: members = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/admin/members"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: memberProfile, isLoading: profileLoading } = useQuery<MemberProfile>({
    queryKey: ["/api/portal/admin/members", selectedMemberId],
    enabled: !!selectedMemberId && isAuthenticated && isAdmin,
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      setLocation("/portal/dashboard");
    }
  }, [authLoading, isAuthenticated, isAdmin, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#B06CFF]" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const filteredMembers = members.filter((m: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.firstName?.toLowerCase().includes(q) ||
      m.lastName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q)
    );
  });

  const renderFormAnswers = (response: any) => {
    if (!response?.answers || !response?.form?.fields) return null;
    const fields = Array.isArray(response.form.fields) ? response.form.fields : [];
    const answers = response.answers;

    return (
      <div className="space-y-3">
        {fields.map((field: any) => {
          const answer = answers[field.name || field.id];
          if (answer === undefined || answer === null || answer === "") return null;
          return (
            <div key={field.name || field.id} className="border-b border-white/5 pb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{field.label || field.name}</p>
              <p className="text-sm text-white mt-1">
                {typeof answer === "boolean" ? (answer ? "Yes" : "No") : String(answer)}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Submitted</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><AlertCircle className="h-3 w-3 mr-1" /> Not Started</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14]">
      <header className="bg-[#121826] border-b border-white/5 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              ADMIN <span className="gradient-text-purple">MEMBERS</span>
            </h1>
            <p className="text-sm text-gray-400">Search and view member profiles</p>
          </div>
          <Button variant="outline" size="sm" className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5" asChild>
            <Link href="/portal/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-[#121826] border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-[#B06CFF]" />
                  Members ({filteredMembers.length})
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-500"
                    data-testid="input-member-search"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#B06CFF]" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No members found</p>
                ) : (
                  <div className="space-y-1">
                    {filteredMembers.map((member: any) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
                          selectedMemberId === member.id
                            ? "bg-[#B06CFF]/20 border border-[#B06CFF]/30"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                        data-testid={`member-item-${member.id}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{member.email}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          selectedMemberId === member.id ? "text-[#B06CFF]" : "text-gray-500 group-hover:text-gray-300"
                        }`} />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {!selectedMemberId ? (
              <Card className="bg-[#121826] border-white/5">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <Users className="h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg">Select a member to view their profile</p>
                  <p className="text-gray-500 text-sm mt-1">Use the search bar to find members by name or email</p>
                </CardContent>
              </Card>
            ) : profileLoading ? (
              <Card className="bg-[#121826] border-white/5">
                <CardContent className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#B06CFF]" />
                </CardContent>
              </Card>
            ) : memberProfile ? (
              <div className="space-y-6">
                <Card className="bg-[#121826] border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                      {memberProfile.user.firstName} {memberProfile.user.lastName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300">{memberProfile.user.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300">{memberProfile.user.phone || "Not provided"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300">Joined {format(new Date(memberProfile.user.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge className={memberProfile.user.role === "admin" ? "bg-[#B06CFF]/20 text-[#B06CFF] border-[#B06CFF]/30" : "bg-[#5EEBFF]/20 text-[#5EEBFF] border-[#5EEBFF]/30"}>
                          {memberProfile.user.role === "admin" ? "Admin" : "Member"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#121826] border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#B06CFF]" />
                      Submitted Forms ({memberProfile.formResponses.filter(r => r.status === "submitted").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {memberProfile.formResponses.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No form responses yet</p>
                    ) : (
                      <div className="space-y-3">
                        {memberProfile.formResponses.map((response) => (
                          <div key={response.id} className="p-3 rounded-lg bg-[#0B0F14] border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">{response.form.title}</p>
                              <p className="text-xs text-gray-400">
                                {response.submittedAt
                                  ? `Submitted ${format(new Date(response.submittedAt), "MMM d, yyyy 'at' h:mm a")}`
                                  : `Last updated ${format(new Date(response.updatedAt), "MMM d, yyyy")}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(response.status)}
                              {response.status === "submitted" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#5EEBFF] hover:text-[#5EEBFF]/80 hover:bg-[#5EEBFF]/10"
                                  onClick={() => setFormDetailOpen({ open: true, response })}
                                  data-testid={`view-form-${response.id}`}
                                >
                                  View Answers
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-[#121826] border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-[#B06CFF]" />
                      Bookings ({memberProfile.bookings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {memberProfile.bookings.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No bookings yet</p>
                    ) : (
                      <div className="space-y-2">
                        {memberProfile.bookings.map((booking) => (
                          <div key={booking.id} className="p-3 rounded-lg bg-[#0B0F14] border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {format(new Date(booking.start), "EEEE, MMM d, yyyy")}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(booking.start), "h:mm a")} - {format(new Date(booking.end), "h:mm a")} with {booking.trainer?.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-300">${(booking.amountCents / 100).toFixed(2)}</span>
                              <Badge className={
                                booking.status === "paid" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                booking.status === "canceled" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              }>
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <Dialog open={formDetailOpen.open} onOpenChange={(open) => setFormDetailOpen({ open, response: open ? formDetailOpen.response : null })}>
        <DialogContent className="bg-[#121826] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {formDetailOpen.response?.form?.title}
            </DialogTitle>
            {formDetailOpen.response?.submittedAt && (
              <p className="text-xs text-gray-400">
                Submitted {format(new Date(formDetailOpen.response.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4">
            {renderFormAnswers(formDetailOpen.response)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
