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
  basic: Number, allowances: Number, deductions: Number,
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
  { name: "Priya Sharma",    employeeId: "EMP001", email: "priya.sharma@acme.in",    department: "Engineering",  designation: "Software Engineer" },
  { name: "Arjun Mehta",     employeeId: "EMP002", email: "arjun.mehta@acme.in",     department: "Engineering",  designation: "Senior Engineer" },
  { name: "Kavita Nair",     employeeId: "EMP003", email: "kavita.nair@acme.in",     department: "HR",           designation: "HR Executive" },
  { name: "Rohit Desai",     employeeId: "EMP004", email: "rohit.desai@acme.in",     department: "Finance",      designation: "Financial Analyst" },
  { name: "Sneha Joshi",     employeeId: "EMP005", email: "sneha.joshi@acme.in",     department: "Marketing",    designation: "Marketing Manager" },
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
    }))
  );

  console.log(`👤 Created 1 admin + ${createdEmployees.length} employees`);

  // Payroll
  const payrollData = [
    { basic: 85000, allowances: 15000, deductions: 8000 },
    { basic: 110000, allowances: 20000, deductions: 12000 },
    { basic: 65000, allowances: 10000, deductions: 6000 },
    { basic: 75000, allowances: 12000, deductions: 7500 },
    { basic: 90000, allowances: 18000, deductions: 9000 },
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
