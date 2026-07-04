import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set. Run: npm run seed (reads from .env.local)");

// ── Schemas (inline to avoid Next.js module resolution in Node context) ───────
const UserSchema = new mongoose.Schema({
  name: String, employeeId: String, email: String, passwordHash: String,
  role: { type: String, default: "employee" }, phone: String, address: String,
  profilePicture: String, department: String, designation: String,
  joinDate: Date, isVerified: { type: Boolean, default: true },
  companyName: String, companyLogo: String,
  employmentType: { type: String, enum: ["full-time", "part-time", "contract", "intern"] },
  workLocation: String,
  status: { type: String, enum: ["active", "inactive", "terminated", "on-leave"], default: "active" },
  reportingManager: mongoose.Schema.Types.ObjectId,
  about: String, jobLove: String, interests: String,
  skills: [String], certifications: [String],
  dob: Date, residingAddress: String, nationality: String,
  personalEmail: String, gender: String, maritalStatus: String,
  bankDetails: {
    accountNumber: String, bankName: String,
    ifscCode: String, pan: String, uan: String,
  },
  documents: [{ name: String, url: String, uploadedAt: Date }],
}, { timestamps: true });

const AttendanceSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId, date: String,
  checkIn: Date, checkOut: Date,
  status: { type: String, default: "Present" },
}, { timestamps: true });
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const LeaveSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  leaveType: String, startDate: Date, endDate: Date, remarks: String,
  status: { type: String, default: "Pending" },
  hrComment: String, decidedBy: mongoose.Schema.Types.ObjectId, decidedAt: Date,
}, { timestamps: true });

const PayrollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, unique: true },
  monthlyWage: { type: Number, default: 0 },
  yearlyWage: { type: Number, default: 0 },
  workingDaysPerWeek: { type: Number, default: 5 },
  breakTime: { type: Number, default: 1 },
  basic: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  standardAllowance: { type: Number, default: 0 },
  performanceBonus: { type: Number, default: 0 },
  leaveTravelAllowance: { type: Number, default: 0 },
  fixedAllowance: { type: Number, default: 0 },
  employeePF: { type: Number, default: 0 },
  employerPF: { type: Number, default: 0 },
  professionalTax: { type: Number, default: 200 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  payCycle: { type: String, enum: ["monthly", "bi-weekly", "weekly"], default: "monthly" },
  currency: { type: String, default: "INR" },
  taxId: String, pfNumber: String, esiNumber: String,
  updatedBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
const Leave = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
const Payroll = mongoose.models.Payroll || mongoose.model("Payroll", PayrollSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────
function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function dateAt(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
  const employees = [
    {
      name: "Priya Sharma",  employeeId: "EMP001", email: "priya.sharma@acme.in",
      department: "Engineering", designation: "Software Engineer",
      employmentType: "full-time", workLocation: "Bengaluru HQ",
      about: "Full-stack developer with 5 years of experience building scalable web applications using React, Node.js, and TypeScript. Passionate about clean code and great user experiences.",
      jobLove: "Building products that make people's lives easier and seeing users genuinely benefit from what I create.",
      interests: "Reading sci-fi novels, hiking, playing chess, and experimenting with new programming languages.",
      skills: ["React", "TypeScript", "Node.js", "MongoDB", "Docker", "GraphQL"],
      certifications: ["AWS Certified Developer Associate", "Meta Front-End Developer"],
      dob: new Date("1994-03-15"), nationality: "Indian", gender: "Female", maritalStatus: "Married",
      personalEmail: "priya.sharma.personal@gmail.com",
      bankDetails: { accountNumber: "12345678901", bankName: "State Bank of India", ifscCode: "SBIN0001234", pan: "ABCDE1234F", uan: "101234567890" },
      documents: [{ name: "Resume 2026", url: "https://storage.acme.in/docs/priya_resume.pdf", uploadedAt: new Date("2026-05-01") }],
    },
    {
      name: "Arjun Mehta",   employeeId: "EMP002", email: "arjun.mehta@acme.in",
      department: "Engineering", designation: "Senior Engineer",
      employmentType: "full-time", workLocation: "Bengaluru HQ",
      about: "Senior software engineer specializing in distributed systems and microservices architecture. 8+ years of experience delivering high-availability platforms.",
      jobLove: "Solving complex system design challenges and mentoring junior developers to help them grow.",
      interests: "Travel photography, running marathons, open-source contributions, and tech blogging.",
      skills: ["Java", "Spring Boot", "Kubernetes", "Kafka", "PostgreSQL", "System Design", "Microservices"],
      certifications: ["Google Cloud Professional Architect", "Oracle Certified Java Programmer"],
      dob: new Date("1991-07-22"), nationality: "Indian", gender: "Male", maritalStatus: "Single",
      personalEmail: "arjun.mehta.personal@outlook.com",
      bankDetails: { accountNumber: "23456789012", bankName: "ICICI Bank", ifscCode: "ICIC0005678", pan: "BCDEF2345G", uan: "101234567891" },
      documents: [{ name: "Certifications", url: "https://storage.acme.in/docs/arjun_certs.pdf", uploadedAt: new Date("2026-04-15") }],
    },
    {
      name: "Kavita Nair",   employeeId: "EMP003", email: "kavita.nair@acme.in",
      department: "HR", designation: "HR Executive",
      employmentType: "full-time", workLocation: "Mumbai Office",
      about: "HR professional with expertise in talent acquisition, employee engagement, and performance management. Dedicated to fostering a positive workplace culture.",
      jobLove: "Helping people find their dream roles within the company and seeing teams thrive together.",
      interests: "Classical dance (Kathak), cooking, volunteering at animal shelters, and reading psychology books.",
      skills: ["Talent Acquisition", "Employee Relations", "HRMS Platforms", "Excel", "Communication", "Conflict Resolution"],
      certifications: ["SHRM-CP Certified", "NLP Practitioner"],
      dob: new Date("1993-11-08"), nationality: "Indian", gender: "Female", maritalStatus: "Married",
      personalEmail: "kavita.nair.personal@gmail.com",
      bankDetails: { accountNumber: "34567890123", bankName: "HDFC Bank", ifscCode: "HDFC0009101", pan: "CDEFG3456H", uan: "101234567892" },
      documents: [
        { name: "Resume", url: "https://storage.acme.in/docs/kavita_resume.pdf", uploadedAt: new Date("2026-03-01") },
        { name: "SHRM Certificate", url: "https://storage.acme.in/docs/kavita_shrm.pdf", uploadedAt: new Date("2025-11-20") },
      ],
    },
    {
      name: "Rohit Desai",   employeeId: "EMP004", email: "rohit.desai@acme.in",
      department: "Finance", designation: "Financial Analyst",
      employmentType: "contract", workLocation: "Remote",
      about: "Chartered Accountant turned Financial Analyst with expertise in financial modeling, budgeting, and variance analysis. Works remotely from Pune.",
      jobLove: "Turning raw financial data into actionable insights that drive strategic business decisions.",
      interests: "Playing guitar, watching Formula 1, stock market trading, and trekking in the Himalayas.",
      skills: ["Financial Modeling", "Excel VBA", "Tableau", "SAP FICO", "Data Analysis", "Forecasting"],
      certifications: ["Chartered Accountant (ICA)", "CFA Level 2"],
      dob: new Date("1990-05-30"), nationality: "Indian", gender: "Male", maritalStatus: "Single",
      personalEmail: "rohit.desai.personal@yahoo.com",
      bankDetails: { accountNumber: "45678901234", bankName: "Axis Bank", ifscCode: "UTIB0007890", pan: "DEFGH4567I", uan: "101234567893" },
      documents: [],
    },
    {
      name: "Sneha Joshi",   employeeId: "EMP005", email: "sneha.joshi@acme.in",
      department: "Marketing", designation: "Marketing Manager",
      employmentType: "full-time", workLocation: "Bengaluru HQ",
      about: "Creative marketing leader with 6+ years of experience driving brand growth through digital campaigns, content strategy, and data-driven marketing.",
      jobLove: "Crafting compelling brand stories that connect with audiences and watching campaigns exceed their KPIs.",
      interests: "Watercolor painting, yoga, podcasting about women in tech, and exploring local cafes.",
      skills: ["Brand Strategy", "Google Ads", "SEO/SEM", "Content Marketing", "Analytics", "Social Media"],
      certifications: ["Google Digital Marketing Certified", "HubSpot Inbound Marketing"],
      dob: new Date("1992-09-18"), nationality: "Indian", gender: "Female", maritalStatus: "Divorced",
      personalEmail: "sneha.joshi.personal@gmail.com",
      bankDetails: { accountNumber: "56789012345", bankName: "Kotak Mahindra", ifscCode: "KKBK0002345", pan: "EFGHI5678J", uan: "101234567894" },
      documents: [{ name: "Portfolio", url: "https://storage.acme.in/docs/sneha_portfolio.pdf", uploadedAt: new Date("2026-06-01") }],
    },
  ];

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected to MongoDB");

  // Wipe collections
  await Promise.all([
    User.deleteMany({}),
    Attendance.deleteMany({}),
    Leave.deleteMany({}),
    Payroll.deleteMany({}),
  ]);
  console.log("🗑️  Wiped all collections");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Create admin
  const admin = await User.create({
    name: "Admin Singh",
    employeeId: "ADMIN001",
    email: "admin@acme.in",
    passwordHash,
    role: "admin",
    department: "Management",
    designation: "HR Manager",
    joinDate: new Date("2020-01-15"),
    isVerified: true,
    phone: "+91 98765 00001",
    address: "102 MG Road, Bengaluru",
    companyName: "Acme Corp",
    employmentType: "full-time",
    workLocation: "Bengaluru HQ",
    status: "active",
    about: "HR Manager with 10+ years of experience in building high-performance teams and driving organizational growth.",
    jobLove: "Creating an environment where every employee feels valued and has opportunities to grow.",
    interests: "Leadership books, meditation, golf, and mentoring young professionals.",
    skills: ["HR Strategy", "Team Building", "Performance Management", "Recruitment", "Conflict Resolution"],
    certifications: ["SPHR Certified", "HR Analytics Professional"],
    dob: new Date("1985-04-12"),
    nationality: "Indian",
    gender: "Male",
    maritalStatus: "Married",
    personalEmail: "admin.singh.personal@gmail.com",
    bankDetails: {
      accountNumber: "67890123456",
      bankName: "Yes Bank",
      ifscCode: "YESB0006789",
      pan: "FGHIJ6789K",
      uan: "101234567895",
    },
    documents: [{ name: "Admin ID Proof", url: "https://storage.acme.in/docs/admin_id.pdf", uploadedAt: new Date("2024-01-01") }],
  });

  // Create employees
  const createdEmployees = await User.insertMany(
    employees.map((e, i) => ({
      ...e,
      passwordHash,
      role: "employee",
      joinDate: new Date(2021 + Math.floor(i / 2), i % 12, 1),
      isVerified: true,
      phone: `+91 98765 0000${i + 2}`,
      address: `${(i + 1) * 10} Koramangala, Bengaluru`,
      companyName: "Acme Corp",
      status: "active",
      residingAddress: `${(i + 1) * 10 + 5} Electronic City, Bengaluru`,
      companyLogo: "",
    }))
  );

  console.log(`👤 Created 1 admin + ${createdEmployees.length} employees`);

  // Payroll — values pre-computed to match the real model's pre('save') formula
  const payrollData = [
    { monthlyWage: 170000, yearlyWage: 2040000, basic: 85000, hra: 42500, standardAllowance: 14161, performanceBonus: 14161, leaveTravelAllowance: 14161, fixedAllowance: 17, employeePF: 10200, employerPF: 10200, professionalTax: 200, allowances: 85000, deductions: 10400, bonus: 5000, payCycle: "monthly", currency: "INR", taxId: "TAX001", pfNumber: "PF/BNG/001", esiNumber: "ESI/BNG/001", workingDaysPerWeek: 5, breakTime: 1 },
    { monthlyWage: 220000, yearlyWage: 2640000, basic: 110000, hra: 55000, standardAllowance: 18326, performanceBonus: 18326, leaveTravelAllowance: 18326, fixedAllowance: 22, employeePF: 13200, employerPF: 13200, professionalTax: 200, allowances: 110000, deductions: 13400, bonus: 10000, payCycle: "monthly", currency: "INR", taxId: "TAX002", pfNumber: "PF/BNG/002", esiNumber: "ESI/BNG/002", workingDaysPerWeek: 5, breakTime: 1 },
    { monthlyWage: 130000, yearlyWage: 1560000, basic: 65000, hra: 32500, standardAllowance: 10829, performanceBonus: 10829, leaveTravelAllowance: 10829, fixedAllowance: 13, employeePF: 7800, employerPF: 7800, professionalTax: 200, allowances: 65000, deductions: 8000, bonus: 3000, payCycle: "monthly", currency: "INR", taxId: "TAX003", pfNumber: "PF/MUM/001", esiNumber: "ESI/MUM/001", workingDaysPerWeek: 5, breakTime: 1 },
    { monthlyWage: 150000, yearlyWage: 1800000, basic: 75000, hra: 37500, standardAllowance: 12495, performanceBonus: 12495, leaveTravelAllowance: 12495, fixedAllowance: 15, employeePF: 9000, employerPF: 9000, professionalTax: 200, allowances: 75000, deductions: 9200, bonus: 0, payCycle: "monthly", currency: "INR", taxId: "TAX004", pfNumber: "", esiNumber: "", workingDaysPerWeek: 4, breakTime: 0.5 },
    { monthlyWage: 180000, yearlyWage: 2160000, basic: 90000, hra: 45000, standardAllowance: 14994, performanceBonus: 14994, leaveTravelAllowance: 14994, fixedAllowance: 18, employeePF: 10800, employerPF: 10800, professionalTax: 200, allowances: 90000, deductions: 11000, bonus: 8000, payCycle: "monthly", currency: "INR", taxId: "TAX005", pfNumber: "PF/BNG/003", esiNumber: "ESI/BNG/003", workingDaysPerWeek: 5, breakTime: 1 },
  ];

  await Payroll.insertMany(
    createdEmployees.map((emp: { _id: mongoose.Types.ObjectId }, i: number) => ({
      userId: emp._id,
      ...payrollData[i],
      updatedBy: admin._id,
    }))
  );
  console.log("💰 Created payroll records");

  // Attendance — last 14 days per employee
  const attendanceStatuses: Array<"Present" | "HalfDay" | "Absent"> = [
    "Present","Present","Present","HalfDay","Present","Absent","Present",
    "Present","HalfDay","Present","Present","Present","Absent","Present",
  ];

  // Sneha (EMP005) gets more absences to trigger anomaly flags
  const snehaStatuses: Array<"Present" | "HalfDay" | "Absent"> = [
    "Absent","Present","Absent","Present","Absent","HalfDay","Absent",
    "Present","Present","Absent","Present","HalfDay","Present","Present",
  ];

  for (let empIdx = 0; empIdx < createdEmployees.length; empIdx++) {
    const emp = createdEmployees[empIdx];
    const statuses = empIdx === 4 ? snehaStatuses : attendanceStatuses;

    const records = [];
    for (let day = 13; day >= 0; day--) {
      const status = statuses[13 - day];
      if (status === "Absent") {
        records.push({ userId: emp._id, date: dateStr(day), status: "Absent" });
      } else if (status === "HalfDay") {
        records.push({
          userId: emp._id, date: dateStr(day),
          checkIn: dateAt(day, 11, 15), // After 10:30 threshold
          checkOut: dateAt(day, 15, 30),
          status: "HalfDay",
        });
      } else {
        records.push({
          userId: emp._id, date: dateStr(day),
          checkIn: dateAt(day, 9, 0 + empIdx * 5),
          checkOut: dateAt(day, 18, 0),
          status: "Present",
        });
      }
    }
    await Attendance.insertMany(records, { ordered: false }).catch(() => {});
  }
  console.log("📅 Created attendance records (14 days per employee)");

  // Leave requests
  const now = new Date();

  // 1. Approved sick leave for Priya (used 5 sick days — near limit of 8)
  await Leave.create({
    userId: createdEmployees[0]._id,
    leaveType: "Sick",
    startDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
    endDate: new Date(now.getFullYear(), now.getMonth() - 1, 9),
    remarks: "Viral fever",
    status: "Approved",
    hrComment: "Approved. Hope you recover soon.",
    decidedBy: admin._id,
    decidedAt: new Date(now.getFullYear(), now.getMonth() - 1, 4),
  });

  // 2. Approved paid leave for Arjun
  await Leave.create({
    userId: createdEmployees[1]._id,
    leaveType: "Paid",
    startDate: new Date(now.getFullYear(), now.getMonth() - 2, 10),
    endDate: new Date(now.getFullYear(), now.getMonth() - 2, 12),
    remarks: "Family event",
    status: "Approved",
    hrComment: "Enjoy!",
    decidedBy: admin._id,
    decidedAt: new Date(now.getFullYear(), now.getMonth() - 2, 9),
  });

  // 3. STALE PENDING: Rohit's leave > 48h old (triggers anomaly flag)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const staleleave = await Leave.create({
    userId: createdEmployees[3]._id,
    leaveType: "Paid",
    startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
    endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
    remarks: "Personal work",
    status: "Pending",
  });
  // Backdate createdAt to simulate stale request
  await Leave.findByIdAndUpdate(staleleave._id, { createdAt: threeDaysAgo });

  // 4. Recent pending leave (Sneha)
  await Leave.create({
    userId: createdEmployees[4]._id,
    leaveType: "Sick",
    startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    remarks: "Doctor appointment",
    status: "Pending",
  });

  console.log("📋 Created leave requests");
  console.log("\n✅ Seed complete! Summary:");
  console.log("   Admin:     admin@acme.in / Password123!");
  console.log("   Employees: priya.sharma@acme.in, arjun.mehta@acme.in, etc. / Password123!");
  console.log("   Anomaly triggers: Sneha has 4 absences | Rohit has a 3-day-old pending leave");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
