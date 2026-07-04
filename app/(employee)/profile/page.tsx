"use client";

import { useState, useEffect } from "react";
import { 
  User as UserIcon, Mail, Phone, Calendar, Landmark, 
  Award, BookOpen, Briefcase, DollarSign, Lock, AlertCircle, FileText
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
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<User | null>(null);
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "private" | "documents" | "salary" | "security">("resume");
  const [loading, setLoading] = useState(true);

  // Skills/Cert Tags Temp States
  const [newSkill, setNewSkill] = useState("");
  const [newCert, setNewCert] = useState("");

  // Documents Temp States
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");

  // Save states
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Security password state
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passMsg, setPassMsg] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const fetchProfileData = async () => {
    try {
      const resUser = await fetch("/api/users/me");
      const dataUser = await resUser.json();
      if (dataUser.user) {
        setCurrentUser(dataUser.user);
        setEditForm(JSON.parse(JSON.stringify(dataUser.user)));

        // Fetch salary
        const resSalary = await fetch(`/api/payroll/${dataUser.user._id}`);
        if (resSalary.ok) {
          const dataSalary = await resSalary.json();
          setSalaryInfo(dataSalary.payroll);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !currentUser) return;
    setSaving(true);
    setProfileMsg("");
    try {
      const res = await fetch(`/api/users/${currentUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMsg(data.error || "Failed to update profile.");
        return;
      }
      setProfileMsg("✓ Profile updated successfully!");
      setCurrentUser(data.user);
      router.refresh();
    } catch (err) {
      setProfileMsg("Error saving updates.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassMsg("Passwords do not match.");
      return;
    }
    setPassLoading(true);
    setPassMsg("");
    try {
      const res = await fetch(`/api/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassMsg(data.error || "Failed to change password.");
        return;
      }
      setPassMsg("✓ Password updated successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPassMsg("Error updating password.");
    } finally {
      setPassLoading(false);
    }
  };

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

  const removeTag = (type: "skills" | "certifications", val: string) => {
    if (!editForm) return;
    const currentArray = editForm[type] || [];
    setEditForm({
      ...editForm,
      [type]: currentArray.filter(t => t !== val)
    });
  };

  if (loading || !currentUser || !editForm) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-white animate-pulse">
        Loading profile information...
      </div>
    );
  }

  const initials = currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-foreground">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">My Profile</h1>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Manage your personal details, resume logs, and security settings
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Card: Basic info */}
        <div className="w-full md:w-80 rounded-2xl border p-6 flex flex-col items-center text-center flex-shrink-0 glass-panel"
          style={{ borderColor: "var(--card-border)" }}>
          
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-3xl mb-4 border shadow-md"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            {editForm.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editForm.profilePicture} alt={editForm.name} className="w-full h-full object-cover" />
            ) : initials}
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
            <div className="flex items-center gap-2.5">
              <Phone size={14} className="text-indigo-400 flex-shrink-0" />
              <input
                type="tel"
                value={editForm.phone || ""}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Add Phone Number"
                className="bg-transparent border-0 outline-none w-full text-foreground font-semibold"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="text-indigo-400 flex-shrink-0" />
              <span>Joined {editForm.joinDate ? new Date(editForm.joinDate).toLocaleDateString("en-IN") : "Pending"}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Tabbing form */}
        <div className="flex-1 w-full rounded-2xl border flex flex-col min-w-0 glass-panel" style={{ borderColor: "var(--card-border)" }}>
          {/* Tabs */}
          <div className="flex border-b overflow-x-auto" style={{ borderColor: "var(--card-border)" }}>
            {[
              { id: "resume", label: "Resume" },
              { id: "private", label: "Private Info" },
              { id: "documents", label: "Documents" },
              { id: "salary", label: "Salary Info" },
              { id: "security", label: "Security" },
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

          <div className="p-6">
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
                    value={editForm.about || ""}
                    onChange={e => setEditForm({ ...editForm, about: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 rounded-xl text-xs text-foreground outline-none border resize-none"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>What I love about my job</label>
                  <textarea
                    rows={2}
                    value={editForm.jobLove || ""}
                    onChange={e => setEditForm({ ...editForm, jobLove: e.target.value })}
                    placeholder="What motivates you at Odoo..."
                    className="w-full px-4 py-3 rounded-xl text-xs text-foreground outline-none border resize-none"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Interests & Hobbies</label>
                  <textarea
                    rows={2}
                    value={editForm.interests || ""}
                    onChange={e => setEditForm({ ...editForm, interests: e.target.value })}
                    placeholder="Painting, traveling, coding..."
                    className="w-full px-4 py-3 rounded-xl text-xs text-foreground outline-none border resize-none"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Skills</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(editForm.skills || []).map(sk => (
                      <span key={sk} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-indigo-500/10 text-indigo-400">
                        {sk}
                        <button type="button" onClick={() => removeTag("skills", sk)} className="hover:text-red-400 transition-colors ml-1 font-bold">×</button>
                      </span>
                    ))}
                    {(editForm.skills || []).length === 0 && <span className="text-xs italic" style={{ color: "var(--muted)" }}>No skills listed</span>}
                  </div>
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
                    <button type="button" onClick={() => addTag("skills")} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer">Add</button>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Certifications</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(editForm.certifications || []).map(crt => (
                      <span key={crt} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400">
                        {crt}
                        <button type="button" onClick={() => removeTag("certifications", crt)} className="hover:text-red-400 transition-colors ml-1 font-bold">×</button>
                      </span>
                    ))}
                    {(editForm.certifications || []).length === 0 && <span className="text-xs italic" style={{ color: "var(--muted)" }}>No certifications listed</span>}
                  </div>
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
                    <button type="button" onClick={() => addTag("certifications")} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer">Add</button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                >
                  {saving ? "Saving..." : "Save Resume Changes"}
                </button>
              </form>
            )}

            {/* 2. PRIVATE INFO TAB */}
            {activeTab === "private" && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">Personal Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Date of Birth</label>
                      <input
                        type="date"
                        value={editForm.dob ? new Date(editForm.dob).toISOString().split("T")[0] : ""}
                        onChange={e => setEditForm({ ...editForm, dob: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)", colorScheme: "dark" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Nationality</label>
                      <input
                        type="text"
                        value={editForm.nationality || ""}
                        onChange={e => setEditForm({ ...editForm, nationality: e.target.value })}
                        placeholder="Indian"
                        className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Personal Email</label>
                      <input
                        type="email"
                        value={editForm.personalEmail || ""}
                        onChange={e => setEditForm({ ...editForm, personalEmail: e.target.value })}
                        placeholder="priya.personal@gmail.com"
                        className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted)" }}>Gender</label>
                      <select
                        value={editForm.gender || ""}
                        onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border cursor-pointer"
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
                        value={editForm.maritalStatus || ""}
                        onChange={e => setEditForm({ ...editForm, maritalStatus: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border cursor-pointer"
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
                        value={editForm.residingAddress || ""}
                        onChange={e => setEditForm({ ...editForm, residingAddress: e.target.value })}
                        placeholder="Residential Address"
                        className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border"
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
                          value={editForm.bankDetails?.[field.key as keyof typeof editForm.bankDetails] || ""}
                          onChange={e => {
                            setEditForm({
                              ...editForm,
                              bankDetails: {
                                ...(editForm.bankDetails || {}),
                                [field.key]: e.target.value
                              }
                            });
                          }}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2 rounded-xl text-xs text-foreground outline-none border"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                >
                  {saving ? "Saving..." : "Save Private Changes"}
                </button>
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
                        </div>
                      </div>
                    ))}
                    {(editForm.documents || []).length === 0 && (
                      <div className="text-center py-6 text-xs text-muted italic">No documents linked yet.</div>
                    )}
                  </div>
                </div>

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

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                >
                  {saving ? "Saving..." : "Save Documents Changes"}
                </button>
              </form>
            )}

            {/* 4. SALARY INFO TAB (View-only for employee) */}
            {activeTab === "salary" && (
              <div className="space-y-6">
                {!salaryInfo ? (
                  <div className="text-center py-10 text-xs text-muted">No salary breakdown records found.</div>
                ) : (
                  <div className="space-y-6">
                    {/* Wages summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Monthly Wage</label>
                        <div className="px-4 py-2.5 border rounded-xl font-bold font-mono text-xs text-foreground bg-slate-500/5" style={{ borderColor: "var(--card-border)" }}>
                          ₹{salaryInfo.monthlyWage?.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Yearly Wage</label>
                        <div className="px-4 py-2.5 border rounded-xl font-bold font-mono text-xs text-foreground bg-slate-500/5" style={{ borderColor: "var(--card-border)" }}>
                          ₹{(salaryInfo.monthlyWage * 12).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="border-t pt-5" style={{ borderColor: "var(--card-border)" }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                        <DollarSign size={14} /> Component Breakdown
                      </h4>
                      <div className="rounded-xl border overflow-hidden text-xs" style={{ borderColor: "var(--card-border)" }}>
                        <div className="grid grid-cols-3 bg-slate-500/5 p-3 font-semibold border-b uppercase text-[10px] tracking-wider" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
                          <span>Component</span>
                          <span>Percentage</span>
                          <span className="text-right">Amount</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                          {[
                            { name: "Basic Salary", pct: "50% of Wage", val: salaryInfo.basic },
                            { name: "House Rent Allowance (HRA)", pct: "50% of Basic", val: salaryInfo.hra },
                            { name: "Standard Allowance", pct: "8.33% of Wage", val: salaryInfo.standardAllowance },
                            { name: "Performance Bonus", pct: "8.33% of Wage", val: salaryInfo.performanceBonus },
                            { name: "Leave Travel Allowance", pct: "8.33% of Wage", val: salaryInfo.leaveTravelAllowance },
                            { name: "Fixed Allowance", pct: "Remainder of Wage", val: salaryInfo.fixedAllowance },
                          ].map((comp, idx) => (
                            <div key={idx} className="grid grid-cols-3 p-3 text-foreground font-medium">
                              <span>{comp.name}</span>
                              <span style={{ color: "var(--muted)" }}>{comp.pct}</span>
                              <span className="text-right font-bold font-mono text-foreground">₹{comp.val?.toLocaleString("en-IN")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* PF and tax deductions */}
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
                  </div>
                )}
              </div>
            )}

            {/* 5. SECURITY TAB (Password Change) */}
            {activeTab === "security" && (
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                {passMsg && (
                  <div className="p-3 rounded-lg text-xs font-semibold"
                    style={{
                      background: passMsg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: passMsg.startsWith("✓") ? "var(--success)" : "var(--danger)"
                    }}>
                    {passMsg}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.current}
                    onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.new}
                    onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.confirm}
                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs text-foreground outline-none border"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                >
                  {passLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
