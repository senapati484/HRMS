"use client";

import { useState } from "react";
import { 
  Search, Plus, X, Mail, Phone, Calendar, Shield, Award, 
  BookOpen, Briefcase, DollarSign, Lock, AlertCircle, 
  Check, Plane, Landmark, Eye, Heart, Compass, FileText, User as UserIcon, Clock
} from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  name: string;
  employeeId: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
  companyName?: string;
  companyLogo?: string;
  about?: string;
  jobLove?: string;
  interests?: string;
  skills?: string[];
  certifications?: string[];
  dob?: string;
  residingAddress?: string;
  nationality?: string;
  personalEmail?: string;
  gender?: string;
  maritalStatus?: string;
  employmentType?: string;
  workLocation?: string;
  empStatus?: string;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    pan?: string;
    uan?: string;
  };
  documents?: {
    name: string;
    url: string;
    uploadedAt?: string;
  }[];
  status?: "Present" | "Leave" | "Absent";
  attendanceToday?: {
    checkIn?: string;
    checkOut?: string;
  };
}

interface DashboardClientProps {
  currentUser: User;
  initialEmployees: User[];
  recentAttendance?: any[];
  recentLeaves?: any[];
}

export default function DashboardClient({ 
  currentUser, 
  initialEmployees,
  recentAttendance = [],
  recentLeaves = []
}: DashboardClientProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<User[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "private" | "documents" | "salary">("resume");
  
  const isAdmin = currentUser.role === "admin";
  
  // Tab toggle between "dashboard" and "employees" directory (default to dashboard for employees, directory for admins)
  const [viewMode, setViewMode] = useState<"dashboard" | "employees">(isAdmin ? "employees" : "dashboard");

  // Add Employee Form States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    joinDate: new Date().toISOString().split("T")[0],
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ id: string; pass: string } | null>(null);

  // Edit Profile States
  const [editForm, setEditForm] = useState<User | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  
  // Skills/Cert Tags Temp States
  const [newSkill, setNewSkill] = useState("");
  const [newCert, setNewCert] = useState("");

  // Documents temp states
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");

  // Salary states
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryMsg, setSalaryMsg] = useState("");

  // Filtered employees
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.designation && emp.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchSalary = async (empId: string) => {
    setLoadingSalary(true);
    setSalaryMsg("");
    try {
      const res = await fetch(`/api/payroll/${empId}`);
      if (res.ok) {
        const data = await res.json();
        setSalaryInfo(data.payroll);
      } else {
        setSalaryInfo(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSalary(false);
    }
  };

  const handleCardClick = (emp: User) => {
    setSelectedEmp(emp);
    setEditForm(JSON.parse(JSON.stringify(emp))); // deep copy
    setActiveTab("resume");
    fetchSalary(emp._id);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    setCreatedCredentials(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to create employee.");
        return;
      }
      setCreatedCredentials({ id: data.user.employeeId, pass: data.tempPassword });
      
      // Refresh local employee list
      const resEmp = await fetch("/api/users");
      if (resEmp.ok) {
        const dataEmp = await resEmp.json();
        if (dataEmp.users) {
          setEmployees(dataEmp.users);
        }
      }
      router.refresh();
    } catch (err) {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !selectedEmp) return;
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await fetch(`/api/users/${selectedEmp._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMsg(data.error || "Failed to save profile.");
        return;
      }
      setProfileMsg("✓ Profile updated successfully!");
      setSelectedEmp(data.user);
      
      // Update local employee state list
      setEmployees(prev => prev.map(emp => emp._id === data.user._id ? { ...emp, ...data.user } : emp));
      router.refresh();
    } catch (err) {
      setProfileMsg("Error saving updates.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !salaryInfo) return;
    setSavingSalary(true);
    setSalaryMsg("");
    try {
      const res = await fetch(`/api/payroll/${selectedEmp._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyWage: salaryInfo.monthlyWage,
          workingDaysPerWeek: salaryInfo.workingDaysPerWeek,
          breakTime: salaryInfo.breakTime,
          bonus: salaryInfo.bonus,
          payCycle: salaryInfo.payCycle,
          currency: salaryInfo.currency,
          taxId: salaryInfo.taxId,
          pfNumber: salaryInfo.pfNumber,
          esiNumber: salaryInfo.esiNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSalaryMsg(data.error || "Failed to update salary.");
        return;
      }
      setSalaryMsg("✓ Salary settings saved!");
      setSalaryInfo(data.payroll);
      router.refresh();
    } catch (err) {
      setSalaryMsg("Error saving salary.");
    } finally {
      setSavingSalary(false);
    }
  };

  // Add tag (skill or cert)
  const addTag = (type: "skills" | "certifications") => {
    if (!editForm) return;
    const value = type === "skills" ? newSkill.trim() : newCert.trim();
    if (!value) return;

    const currentArray = editForm[type] || [];
    if (currentArray.includes(value)) return;

    setEditForm({
      ...editForm,
      [type]: [...currentArray, value]
    });
    
    if (type === "skills") setNewSkill("");
    else setNewCert("");
  };

  // Remove tag
  const removeTag = (type: "skills" | "certifications", val: string) => {
    if (!editForm) return;
    const currentArray = editForm[type] || [];
    setEditForm({
      ...editForm,
      [type]: currentArray.filter(t => t !== val)
    });
  };

  // Helper setter functions
  function setFormAndEdit(payload: Partial<User>) {
    if (!editForm) return;
    setEditForm({ ...editForm, ...payload });
  }

  function setBankDetailField(key: string, val: string) {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      bankDetails: {
        ...(editForm.bankDetails || {}),
        [key]: val
      }
    });
  }

  function handleWageChange(wage: number) {
    if (!salaryInfo) return;
    
    // Auto-calculate components in real-time on UI
    const basic = Math.round(wage * 0.5 * 100) / 100;
    const hra = Math.round(basic * 0.5 * 100) / 100;
    const standardAllowance = Math.round(wage * 0.0833 * 100) / 100;
    const performanceBonus = Math.round(wage * 0.0833 * 100) / 100;
    const leaveTravelAllowance = Math.round(wage * 0.0833 * 100) / 100;
    
    const sumOther = basic + hra + standardAllowance + performanceBonus + leaveTravelAllowance;
    const fixedAllowance = Math.max(0, Math.round((wage - sumOther) * 100) / 100);

    const employeePF = Math.round(basic * 0.12 * 100) / 100;
    const employerPF = Math.round(basic * 0.12 * 100) / 100;

    setSalaryInfo({
      ...salaryInfo,
      monthlyWage: wage,
      basic,
      hra,
      standardAllowance,
      performanceBonus,
      leaveTravelAllowance,
      fixedAllowance,
      employeePF,
      employerPF,
      allowances: hra + standardAllowance + performanceBonus + leaveTravelAllowance + fixedAllowance,
      deductions: employeePF + 200
    });
  }

  const isOwnProfile = selectedEmp?._id === currentUser._id;
  const canEditProfile = isOwnProfile || isAdmin;

  // -------------------------------------------------------------
  // RENDERING EMPLOYEE DASHBOARD (Welcome page)
  // -------------------------------------------------------------
  if (viewMode === "dashboard" && !isAdmin) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground animate-in fade-in duration-300">
        {/* Toggle headers */}
        <div className="flex border-b" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={() => setViewMode("dashboard")}
            className="px-6 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all"
            style={{
              color: "var(--primary)",
              borderBottomColor: "var(--primary)"
            }}
          >
            My Dashboard
          </button>
          <button
            onClick={() => setViewMode("employees")}
            className="px-6 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all"
            style={{
              color: "var(--muted)",
              borderBottomColor: "transparent"
            }}
          >
            Directory (Employees)
          </button>
        </div>

        {/* Welcome Greeting Banner */}
        <div className="rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.05))", border: "1px solid var(--card-border)" }}>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight font-precise">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {currentUser.designation || "Employee"} · {currentUser.department || "No Department"} · {currentUser.companyName || "Acme Corp"}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-500/10 text-indigo-400 font-mono">
              ID: {currentUser.employeeId}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-green-500/10 text-green-400 font-precise">
              Active Session
            </span>
          </div>
        </div>

        {/* Quick Access Portal Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "My Profile", desc: "View and edit resume details", link: "/profile", icon: <UserIcon size={20} className="text-indigo-400" /> },
            { label: "Attendance Logs", desc: "Check daily check-in timesheets", link: "/attendance", icon: <Clock size={20} className="text-emerald-400" /> },
            { label: "Time Off Requests", desc: "Submit and review leave applications", link: "/leave", icon: <Plane size={20} className="text-blue-400" /> },
            { label: "My Salary & Payslip", desc: "View wage breakdown structures", link: "/payroll", icon: <DollarSign size={20} className="text-amber-400" /> },
          ].map((card, idx) => (
            <div
              key={idx}
              onClick={() => router.push(card.link)}
              className="rounded-2xl p-5 border cursor-pointer hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300 glass-panel flex flex-col justify-between"
              style={{ borderColor: "var(--card-border)" }}
            >
              <div className="p-2.5 bg-slate-500/5 rounded-xl border w-fit" style={{ borderColor: "var(--card-border)" }}>
                {card.icon}
              </div>
              <div className="mt-5">
                <h3 className="font-bold text-foreground text-sm font-precise">{card.label}</h3>
                <p className="text-[10px] mt-1 line-clamp-1" style={{ color: "var(--muted)" }}>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent logs activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Attendance */}
          <div className="rounded-2xl border p-5 glass-panel" style={{ borderColor: "var(--card-border)" }}>
            <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <Clock size={16} className="text-emerald-400" /> Recent Attendance Logs
            </h3>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {recentAttendance.map((att) => (
                <div key={att._id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-foreground">
                      {new Date(att.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                      {att.checkIn ? `In: ${new Date(att.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
                      {att.checkOut ? ` · Out: ${new Date(att.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider`}
                    style={{
                      background: att.status === "Present" ? "var(--success-bg)" : "var(--danger-bg)",
                      color: att.status === "Present" ? "var(--success)" : "var(--danger)",
                      borderColor: att.status === "Present" ? "var(--success-border)" : "var(--danger-border)"
                    }}>
                    {att.status}
                  </span>
                </div>
              ))}
              {recentAttendance.length === 0 && (
                <div className="text-center py-8 text-xs text-muted italic">No recent attendance records.</div>
              )}
            </div>
          </div>

          {/* Recent Leaves */}
          <div className="rounded-2xl border p-5 glass-panel" style={{ borderColor: "var(--card-border)" }}>
            <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <Plane size={16} className="text-blue-400" /> Recent Leave Requests
            </h3>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {recentLeaves.map((l) => (
                <div key={l._id} className="py-3 flex justify-between items-start text-xs">
                  <div>
                    <div className="font-bold text-foreground">{l.leaveType} Leave</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                      {new Date(l.startDate).toLocaleDateString("en-IN")} – {new Date(l.endDate).toLocaleDateString("en-IN")}
                    </div>
                    {l.remarks && <p className="text-[10px] mt-1 text-slate-400 italic">"{l.remarks}"</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider`}
                    style={{
                      background: l.status === "Approved" ? "var(--success-bg)" : l.status === "Rejected" ? "var(--danger-bg)" : "var(--warning-bg)",
                      color: l.status === "Approved" ? "var(--success)" : l.status === "Rejected" ? "var(--danger)" : "var(--warning)",
                      borderColor: l.status === "Approved" ? "var(--success-border)" : l.status === "Rejected" ? "var(--danger-border)" : "var(--warning-border)"
                    }}>
                    {l.status}
                  </span>
                </div>
              ))}
              {recentLeaves.length === 0 && (
                <div className="text-center py-8 text-xs text-muted italic">No recent leave requests.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING DIRECTORY GRID (For Admin, and toggle-able for Employee)
  // -------------------------------------------------------------
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-foreground">
      {/* Toggle headers for Employee */}
      {!isAdmin && (
        <div className="flex border-b mb-4" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={() => setViewMode("dashboard")}
            className="px-6 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all"
            style={{
              color: "var(--muted)",
              borderBottomColor: "transparent"
            }}
          >
            My Dashboard
          </button>
          <button
            onClick={() => setViewMode("employees")}
            className="px-6 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all"
            style={{
              color: "var(--primary)",
              borderBottomColor: "var(--primary)"
            }}
          >
            Directory (Employees)
          </button>
        </div>
      )}

      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Employees</h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            View employee profiles, availability status, and resume records
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search employee, dept, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs text-foreground outline-none border transition-all"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            />
          </div>

          {/* Admin: Add Employee Button */}
          {isAdmin && (
            <button
              onClick={() => {
                setAddForm({
                  name: "",
                  email: "",
                  phone: "",
                  department: "",
                  designation: "",
                  joinDate: new Date().toISOString().split("T")[0],
                });
                setCreatedCredentials(null);
                setAddError("");
                setAddModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer hover:opacity-90 shadow-md shadow-indigo-600/10"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
            >
              <Plus size={14} /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredEmployees.map((emp) => {
          const initials = emp.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
          
          // Status configurations
          const statusColors = {
            Present: "bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
            Leave: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
            Absent: "bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          };

          return (
            <div
              key={emp._id}
              onClick={() => handleCardClick(emp)}
              className="rounded-2xl p-5 border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-lg shadow-black/5 relative group glass-panel flex flex-col items-center text-center"
            >
              {/* Top Right Status Dot */}
              <div className="absolute top-4 right-4 flex items-center justify-center">
                {emp.status === "Leave" ? (
                  <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400" title="On Leave">
                    <Plane size={12} />
                  </div>
                ) : (
                  <span className={`h-2.5 w-2.5 rounded-full ${statusColors[emp.status || "Absent"]}`} title={emp.status || "Absent"} />
                )}
              </div>

              {/* Profile Avatar */}
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-lg mb-4 shadow-sm border border-slate-500/10"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {emp.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover" />
                ) : initials}
              </div>

              {/* Employee Info */}
              <h3 className="font-bold text-foreground text-sm group-hover:text-indigo-400 transition-colors font-precise line-clamp-1">{emp.name}</h3>
              <p className="text-xs font-semibold mt-1" style={{ color: "var(--muted)" }}>{emp.designation || "Employee"}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)", opacity: 0.7 }}>{emp.department || "No Department"}</p>

              <div className="mt-4 pt-3 border-t w-full flex justify-between items-center text-[10px] font-mono" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
                <span>{emp.employeeId}</span>
                <span className="uppercase tracking-widest text-[9px] font-bold text-indigo-400">{emp.role}</span>
              </div>
            </div>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full text-center py-16 border rounded-2xl glass-panel">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-bold text-foreground text-sm">No employees found</h3>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Try searching a different name, designation, or department.</p>
          </div>
        )}
      </div>

      {/* DETAILED INFORMATION MODAL (Clicking card) */}
      {selectedEmp && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-hidden"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            
            {/* Modal Left Column (Quick details) */}
            <div className="p-6 md:w-80 border-b md:border-b-0 md:border-r flex flex-col items-center text-center flex-shrink-0"
              style={{ borderColor: "var(--card-border)", background: "rgba(255,255,255,0.01)" }}>
              
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-3xl mb-4 border shadow-md"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {editForm.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editForm.profilePicture} alt={editForm.name} className="w-full h-full object-cover" />
                ) : editForm.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>

              <h2 className="font-bold text-foreground text-base font-precise">{editForm.name}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 mt-2 font-mono">{editForm.employeeId}</span>
              
              <p className="text-xs font-semibold mt-3 text-foreground">{editForm.designation || "Employee"}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{editForm.department || "No Department"}</p>

              <div className="w-full mt-6 space-y-3.5 text-left text-xs border-t pt-5" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
                <div className="flex items-center gap-2.5 truncate">
                  <Mail size={14} className="text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{editForm.email}</span>
                </div>
                {editForm.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone size={14} className="text-indigo-400 flex-shrink-0" />
                    <span>{editForm.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-indigo-400 flex-shrink-0" />
                  <span>Joined {editForm.joinDate ? new Date(editForm.joinDate).toLocaleDateString("en-IN") : "Pending"}</span>
                </div>
              </div>

              {/* Close Action */}
              <button
                onClick={() => setSelectedEmp(null)}
                className="mt-auto w-full py-2 border rounded-xl text-xs font-bold text-foreground hover:bg-slate-500/5 transition-all cursor-pointer"
                style={{ borderColor: "var(--card-border)" }}
              >
                Close View
              </button>
            </div>

            {/* Modal Right Column (Tabbing section) */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Tab Selector Headers */}
              <div className="flex border-b overflow-x-auto" style={{ borderColor: "var(--card-border)" }}>
                {[
                  { id: "resume", label: "Resume" },
                  { id: "private", label: "Private Info" },
                  { id: "documents", label: "Documents" },
                  ...(isAdmin || isOwnProfile ? [{ id: "salary", label: "Salary Info" }] : []),
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className="px-6 py-4 text-xs font-bold transition-all relative border-b-2 border-transparent cursor-pointer whitespace-nowrap"
                    style={{
                      color: activeTab === t.id ? "var(--primary)" : "var(--muted)",
                      borderBottomColor: activeTab === t.id ? "var(--primary)" : "transparent"
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                {profileMsg && (
                  <div className="mb-4 p-3 rounded-lg text-xs font-semibold" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                    {profileMsg}
                  </div>
                )}

                {/* 1. RESUME TAB */}
                {activeTab === "resume" && (
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>About</label>
                      <textarea
                        rows={3}
                        disabled={!canEditProfile}
                        value={editForm.about || ""}
                        onChange={e => setFormAndEdit({ about: e.target.value })}
                        placeholder="Tell us about yourself..."
                        className="w-full px-4 py-3 rounded-xl text-xs text-foreground outline-none border resize-none disabled:opacity-70"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>What I love about my job</label>
                      <textarea
                        rows={2}
                        disabled={!canEditProfile}
                        value={editForm.jobLove || ""}
                        onChange={e => setFormAndEdit({ jobLove: e.target.value })}
                        placeholder="What motivates you at Odoo..."
                        className="w-full px-4 py-3 rounded-xl text-xs text-foreground outline-none border resize-none disabled:opacity-70"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Interests & Hobbies</label>
                      <textarea
                        rows={2}
                        disabled={!canEditProfile}
                        value={editForm.interests || ""}
                        onChange={e => setFormAndEdit({ interests: e.target.value })}
                        placeholder="Painting, traveling, coding..."
                        className="w-full px-4 py-3 rounded-xl text-xs text-foreground outline-none border resize-none disabled:opacity-70"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      />
                    </div>

                    {/* Skills list tags */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Skills</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(editForm.skills || []).map(sk => (
                          <span key={sk} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-indigo-500/10 text-indigo-400">
                            {sk}
                            {canEditProfile && (
                              <button type="button" onClick={() => removeTag("skills", sk)} className="hover:text-red-400 transition-colors ml-1 font-bold">×</button>
                            )}
                          </span>
                        ))}
                        {(editForm.skills || []).length === 0 && <span className="text-xs italic" style={{ color: "var(--muted)" }}>No skills listed</span>}
                      </div>
                      {canEditProfile && (
                        <div className="flex gap-2 max-w-xs">
                          <input
                            type="text"
                            placeholder="Add skill tag"
                            value={newSkill}
                            onChange={e => setNewSkill(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag("skills"))}
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs text-foreground outline-none border"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          />
                          <button type="button" onClick={() => addTag("skills")} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-bold text-white hover:bg-indigo-700">Add</button>
                        </div>
                      )}
                    </div>

                    {/* Certifications list tags */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Certifications</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(editForm.certifications || []).map(crt => (
                          <span key={crt} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400">
                            {crt}
                            {canEditProfile && (
                              <button type="button" onClick={() => removeTag("certifications", crt)} className="hover:text-red-400 transition-colors ml-1 font-bold">×</button>
                            )}
                          </span>
                        ))}
                        {(editForm.certifications || []).length === 0 && <span className="text-xs italic" style={{ color: "var(--muted)" }}>No certifications listed</span>}
                      </div>
                      {canEditProfile && (
                        <div className="flex gap-2 max-w-xs">
                          <input
                            type="text"
                            placeholder="Add certification tag"
                            value={newCert}
                            onChange={e => setNewCert(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag("certifications"))}
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs text-foreground outline-none border"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          />
                          <button type="button" onClick={() => addTag("certifications")} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs font-bold text-white hover:bg-emerald-700">Add</button>
                        </div>
                      )}
                    </div>

                    {canEditProfile && (
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer animate-none"
                        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                      >
                        {savingProfile ? "Saving..." : "Save Resume Changes"}
                      </button>
                    )}
                  </form>
                )}

                {/* 2. PRIVATE INFO TAB */}
                {activeTab === "private" && (
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* Identity Details */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">Personal Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Date of Birth</label>
                          <input
                            type="date"
                            disabled={!canEditProfile}
                            value={editForm.dob ? new Date(editForm.dob).toISOString().split("T")[0] : ""}
                            onChange={e => setFormAndEdit({ dob: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border disabled:opacity-75"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)", colorScheme: "dark" }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Nationality</label>
                          <input
                            type="text"
                            disabled={!canEditProfile}
                            value={editForm.nationality || ""}
                            onChange={e => setFormAndEdit({ nationality: e.target.value })}
                            placeholder="Indian"
                            className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border disabled:opacity-75"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Personal Email</label>
                          <input
                            type="email"
                            disabled={!canEditProfile}
                            value={editForm.personalEmail || ""}
                            onChange={e => setFormAndEdit({ personalEmail: e.target.value })}
                            placeholder="priya.personal@gmail.com"
                            className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border disabled:opacity-75"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Gender</label>
                          <select
                            disabled={!canEditProfile}
                            value={editForm.gender || ""}
                            onChange={e => setFormAndEdit({ gender: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border cursor-pointer disabled:opacity-75"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Marital Status</label>
                          <select
                            disabled={!canEditProfile}
                            value={editForm.maritalStatus || ""}
                            onChange={e => setFormAndEdit({ maritalStatus: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border cursor-pointer disabled:opacity-75"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          >
                            <option value="">Select Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Residing Address</label>
                          <input
                            type="text"
                            disabled={!canEditProfile}
                            value={editForm.residingAddress || ""}
                            onChange={e => setFormAndEdit({ residingAddress: e.target.value })}
                            placeholder="Residential Address"
                            className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border disabled:opacity-75"
                            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="border-t pt-5" style={{ borderColor: "var(--card-border)" }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1">
                        <Landmark size={14} /> Bank Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: "Bank Name", key: "bankName", placeholder: "State Bank of India" },
                          { label: "Account Number", key: "accountNumber", placeholder: "1234567890" },
                          { label: "IFSC Code", key: "ifscCode", placeholder: "SBIN0001234" },
                          { label: "PAN Number", key: "pan", placeholder: "ABCDE1234F" },
                          { label: "UAN Number", key: "uan", placeholder: "100123456789" },
                        ].map((field) => (
                          <div key={field.key}>
                            <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>{field.label}</label>
                            <input
                              type="text"
                              disabled={!canEditProfile}
                              value={editForm.bankDetails?.[field.key as keyof typeof editForm.bankDetails] || ""}
                              onChange={e => setBankDetailField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border disabled:opacity-75"
                              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {canEditProfile && (
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer"
                        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                      >
                        {savingProfile ? "Saving..." : "Save Private Changes"}
                      </button>
                    )}
                  </form>
                )}

                {/* 3. DOCUMENTS TAB */}
                {activeTab === "documents" && (
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                        <FileText size={14} /> Shared Documents
                      </h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {(editForm.documents || []).map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-500/5 rounded-xl border border-slate-500/10 text-xs">
                            <div className="font-bold text-foreground truncate max-w-xs">{doc.name}</div>
                            <div className="flex gap-3 items-center">
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-semibold hover:underline">Open Link</a>
                              {canEditProfile && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = (editForm.documents || []).filter((_: any, i: number) => i !== idx);
                                    setEditForm({ ...editForm, documents: filtered });
                                  }}
                                  className="text-red-400 font-bold hover:text-red-300 cursor-pointer"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {(editForm.documents || []).length === 0 && (
                          <div className="text-center py-6 text-xs text-muted italic">No documents linked yet.</div>
                        )}
                      </div>
                    </div>

                    {canEditProfile && (
                      <div className="border-t pt-5 space-y-4" style={{ borderColor: "var(--card-border)" }}>
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted">Add New Document URL</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold mb-1 text-muted">Document Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Identity Proof / Resume"
                              value={newDocName}
                              onChange={e => setNewDocName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground outline-none border"
                              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold mb-1 text-muted">Document URL</label>
                            <input
                              type="text"
                              placeholder="e.g. https://..."
                              value={newDocUrl}
                              onChange={e => setNewDocUrl(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg text-xs text-foreground outline-none border"
                              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const name = newDocName.trim();
                            const url = newDocUrl.trim();
                            if (name && url) {
                              const currentDocs = editForm.documents || [];
                              setEditForm({
                                ...editForm,
                                documents: [...currentDocs, { name, url, uploadedAt: new Date().toISOString() }]
                              });
                              setNewDocName("");
                              setNewDocUrl("");
                            }
                          }}
                          className="px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                        >
                          Add Document Link
                        </button>
                      </div>
                    )}

                    {canEditProfile && (
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer"
                        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                      >
                        {savingProfile ? "Saving..." : "Save Documents Changes"}
                      </button>
                    )}
                  </form>
                )}

                {/* 4. SALARY INFO TAB */}
                {activeTab === "salary" && (
                  <div className="space-y-6">
                    {loadingSalary ? (
                      <div className="text-center py-10 animate-pulse text-xs">Loading payroll parameters...</div>
                    ) : !salaryInfo ? (
                      <div className="text-center py-10 text-xs text-muted">No payroll configurations set for this user yet.</div>
                    ) : (
                      <form onSubmit={handleSaveSalary} className="space-y-6">
                        {salaryMsg && (
                          <div className="p-3 rounded-lg text-xs font-semibold" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                            {salaryMsg}
                          </div>
                        )}

                        {/* Configurable base wage */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Monthly Base Wage (₹)</label>
                            <input
                              type="number"
                              disabled={!isAdmin}
                              value={salaryInfo.monthlyWage || ""}
                              onChange={e => handleWageChange(parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-foreground outline-none border disabled:opacity-75"
                              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Yearly Wage (₹)</label>
                            <div className="px-4 py-2.5 border rounded-xl font-bold font-mono text-xs text-foreground bg-slate-500/5" style={{ borderColor: "var(--card-border)" }}>
                              ₹{((salaryInfo.monthlyWage || 0) * 12).toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>

                        {/* Breakdown structure display list */}
                        <div className="border-t pt-5" style={{ borderColor: "var(--card-border)" }}>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                            <DollarSign size={14} /> Component Breakdown
                          </h4>
                          <div className="rounded-xl border overflow-hidden text-[11px]" style={{ borderColor: "var(--card-border)" }}>
                            <div className="grid grid-cols-3 bg-slate-500/5 p-2.5 font-semibold border-b uppercase text-[10px] tracking-wider" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
                              <span>Component</span>
                              <span>Percentage / Basis</span>
                              <span className="text-right">Amount</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                              {[
                                { name: "Basic Salary", pct: "50% of Wage", val: salaryInfo.basic },
                                { name: "House Rent Allowance (HRA)", pct: "50% of Basic", val: salaryInfo.hra },
                                { name: "Standard Allowance", pct: "8.33% of Wage", val: salaryInfo.standardAllowance },
                                { name: "Performance Bonus", pct: "8.33% of Wage", val: salaryInfo.performanceBonus },
                                { name: "Leave Travel Allowance (LTA)", pct: "8.33% of Wage", val: salaryInfo.leaveTravelAllowance },
                                { name: "Fixed Allowance", pct: "Remainder of Wage", val: salaryInfo.fixedAllowance },
                              ].map((comp, idx) => (
                                <div key={idx} className="grid grid-cols-3 p-2.5 text-foreground font-medium">
                                  <span>{comp.name}</span>
                                  <span style={{ color: "var(--muted)" }}>{comp.pct}</span>
                                  <span className="text-right font-bold font-mono text-foreground">₹{comp.val?.toLocaleString("en-IN")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* PF and professional tax deductions breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t pt-5" style={{ borderColor: "var(--card-border)" }}>
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Provident Fund (PF)</h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between p-2 rounded-lg bg-slate-500/5">
                                <span style={{ color: "var(--muted)" }}>Employee PF (12% of Basic)</span>
                                <span className="font-bold font-mono text-foreground">₹{salaryInfo.employeePF?.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between p-2 rounded-lg bg-slate-500/5">
                                <span style={{ color: "var(--muted)" }}>Employer PF (12% of Basic)</span>
                                <span className="font-bold font-mono text-foreground">₹{salaryInfo.employerPF?.toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Deductions</h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between p-2 rounded-lg bg-slate-500/5">
                                <span style={{ color: "var(--muted)" }}>Professional Tax</span>
                                <span className="font-bold font-mono text-foreground">₹{salaryInfo.professionalTax?.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between p-2 rounded-lg bg-slate-500/5 border border-indigo-500/10" style={{ background: "rgba(99,102,241,0.04)" }}>
                                <span className="font-semibold text-foreground">Total Deductions</span>
                                <span className="font-extrabold font-mono text-indigo-400">₹{(salaryInfo.employeePF + salaryInfo.professionalTax).toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payroll Metadata */}
                        <div className="border-t pt-5" style={{ borderColor: "var(--card-border)" }}>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Payroll Metadata</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-500/5">
                              <span className="text-[9px] uppercase font-bold block" style={{ color: "var(--muted)" }}>Bonus</span>
                              <span className="font-bold font-mono text-foreground">₹{(salaryInfo.bonus || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-500/5">
                              <span className="text-[9px] uppercase font-bold block" style={{ color: "var(--muted)" }}>Pay Cycle</span>
                              <span className="font-bold text-foreground capitalize">{salaryInfo.payCycle || "monthly"}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-500/5">
                              <span className="text-[9px] uppercase font-bold block" style={{ color: "var(--muted)" }}>Currency</span>
                              <span className="font-bold font-mono text-foreground">{salaryInfo.currency || "INR"}</span>
                            </div>
                            {salaryInfo.taxId && (
                              <div className="p-2.5 rounded-lg bg-slate-500/5">
                                <span className="text-[9px] uppercase font-bold block" style={{ color: "var(--muted)" }}>Tax ID</span>
                                <span className="font-bold font-mono text-foreground">{salaryInfo.taxId}</span>
                              </div>
                            )}
                            {salaryInfo.pfNumber && (
                              <div className="p-2.5 rounded-lg bg-slate-500/5">
                                <span className="text-[9px] uppercase font-bold block" style={{ color: "var(--muted)" }}>PF Number</span>
                                <span className="font-bold font-mono text-foreground">{salaryInfo.pfNumber}</span>
                              </div>
                            )}
                            {salaryInfo.esiNumber && (
                              <div className="p-2.5 rounded-lg bg-slate-500/5">
                                <span className="text-[9px] uppercase font-bold block" style={{ color: "var(--muted)" }}>ESI Number</span>
                                <span className="font-bold font-mono text-foreground">{salaryInfo.esiNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Net take home pay banner */}
                        <div className="p-4 rounded-xl flex items-center justify-between font-precise"
                          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))", border: "1px solid rgba(99,102,241,0.15)" }}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--muted)" }}>Net Take-Home Pay</span>
                            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Computed as basic + allowances - deductions</p>
                          </div>
                          <span className="text-lg font-extrabold text-foreground font-mono">
                            ₹{(salaryInfo.basic + salaryInfo.allowances + (salaryInfo.bonus || 0) - (salaryInfo.employeePF + salaryInfo.professionalTax)).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {isAdmin && (
                          <button
                            type="submit"
                            disabled={savingSalary}
                            className="px-5 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 hover:bg-indigo-700 cursor-pointer"
                          >
                            {savingSalary ? "Saving settings..." : "Save Salary Parameters"}
                          </button>
                        )}
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN: ADD EMPLOYEE MODAL DIALOG */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl relative"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-bold text-foreground font-precise mb-1">Add New Employee</h2>
            <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>Generate a new employee account and login credentials.</p>

            {addError && (
              <div className="mb-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                <AlertCircle size={14} />
                {addError}
              </div>
            )}

            {createdCredentials ? (
              // Success credentials state
              <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                <div className="p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                  <Check size={14} />
                  Employee account created successfully!
                </div>
                <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--background)", borderColor: "var(--card-border)" }}>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted">Login ID / Employee ID</div>
                    <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">{createdCredentials.id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted">Temporary Password</div>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">{createdCredentials.pass}</div>
                  </div>
                </div>
                <div className="text-xs p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-muted">
                  💡 Note: Provide these credentials to the employee. They can sign in using their Login ID and change their password in their profile settings.
                </div>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="w-full py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              // Create form state
              <form onSubmit={handleAddEmployee} className="space-y-4">
                {[
                  { label: "Full Name", key: "name", type: "text", placeholder: "E.g. Priya Singh", req: true },
                  { label: "Email Address", key: "email", type: "email", placeholder: "priya.singh@company.com", req: true },
                  { label: "Phone Number", key: "phone", type: "tel", placeholder: "+91 98765 43210", req: false },
                  { label: "Department", key: "department", type: "text", placeholder: "E.g. Engineering", req: false },
                  { label: "Designation", key: "designation", type: "text", placeholder: "E.g. Software Engineer", req: false },
                  { label: "Joining Date", key: "joinDate", type: "date", placeholder: "", req: false },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>{field.label}</label>
                    <input
                      type={field.type}
                      required={field.req}
                      value={addForm[field.key as keyof typeof addForm]}
                      onChange={e => setAddForm({ ...addForm, [field.key]: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border transition-all"
                      style={{ background: "var(--background)", borderColor: "var(--card-border)", colorScheme: "dark" }}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full py-3 bg-indigo-600 rounded-xl text-xs font-bold text-white mt-2 hover:bg-indigo-700 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {addLoading ? "Creating employee..." : "Create Employee Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
