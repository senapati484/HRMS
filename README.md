# HRMS — Human Resource Management System

**A full-stack, multi-tenant HR platform** with attendance tracking, leave management, automated payroll, and an AI-powered HR copilot — built with Next.js 16, MongoDB, and Google Gemini.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img width="1376" height="768" alt="HRMS dashboard preview" src="https://github.com/user-attachments/assets/5d33bce4-8c24-4176-be72-b86eabd52bc1" />

**[Watch the demo](https://youtu.be/O06pMfH8Ekw?si=DDSI_tIiLat-QY-a)** · **[View source](https://github.com/senapati484/HRMS.git)**

---

## Table of Contents

- [Why This Project](#why-this-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Routes](#api-routes)
- [Data Models](#data-models)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Why This Project

HRMS is a complete, production-shaped HR system built to demonstrate real-world full-stack engineering: secure multi-tenant data isolation, role-based access control, automated business logic (payroll math, leave policy enforcement), and a genuinely useful AI integration — not just a chatbot bolted on the side, but a copilot with live access to a user's own attendance, leave, and payroll data.

Every company that signs up gets a fully isolated workspace. Admins manage their team; employees self-serve through their own dashboard. The system handles the operational grind of HR — check-ins, leave balances, salary breakdowns — so admins don't have to.

## Features

- 🏢 **Multi-tenant isolation** — Companies are fully isolated by `companyName`; no cross-company data leakage, enforced at the query level
- 🕒 **Attendance tracking** — Daily check-in/check-out with automatic status detection (Present / Half-Day / Absent), late-threshold logic, and a color-coded monthly calendar
- 📋 **Leave management** — Natural-language leave requests parsed by AI, policy-enforced balances (12 Paid / 8 Sick / 30 Unpaid per year), backdate and overlap prevention, full admin approval workflow
- 💰 **Automated payroll** — Salary components (Basic, HRA, Allowances, PF, Professional Tax) auto-calculated from monthly wage, with bonus, pay cycle, currency, and tax/PF/ESI ID support
- 📊 **Admin dashboard** — Company-wide stats, employee directory with verification, pending leave approvals, anomaly detection (stale leaves, excessive absences), payroll breakdowns
- 👤 **Employee dashboard** — Team attendance grid, personal logs, leave history, and quick-access portal
- 🪪 **Profile management** — Editable resume, private info, bank details, documents, salary view, password change
- 🤖 **AI HR Copilot** — Gemini-powered streaming assistant with real-time access to the user's own leave balance, attendance history, and payroll data
- ✉️ **Email notifications** — Automated emails for leave decisions, new leave requests, new employee credentials, and account verification
- 🌗 **Dark/light mode** — System-aware theme toggle
- 📱 **Fully responsive** — Mobile, tablet, and desktop layouts throughout

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Authentication | JWT via `jose` (middleware) + `jsonwebtoken` (API), httpOnly cookies, 7-day expiry |
| Database | MongoDB with Mongoose ODM |
| Client State | Zustand (`useUserStore`, `useDataStore`) |
| Validation | Zod on all write endpoints |
| AI | Google Gemini 2.5 Flash (streaming + structured parsing) |
| Email | Nodemailer (Gmail SMTP) |
| Styling | CSS variables + Tailwind-style utility classes |

## Architecture

### Multi-Tenant Isolation

Every user belongs to a company identified by `companyName`, which acts as the tenant key across the schema:

- All admin-list endpoints (`/api/users`, `/api/leave?all=true`, `/api/attendance?all=true`, `/api/copilot/anomalies`) scope their queries to the admin's own company
- Cross-company access is blocked on every `PATCH` and single-record `GET` by comparing the requesting admin's `companyName` against the target record's owner
- A missing or null `companyName` is rejected outright with a `403`

### Auth Flows

1. **Admin self-registration** — signs up with a company name → gets an auto-generated employee ID → pre-verified → redirected to login
2. **Admin creates employee** — sets name/email → auto-generates employee ID + temp password → creates a default payroll record (₹30,000 wage) → sends credentials by email
3. **Employee activation** — uses the pre-assigned employee ID → sets name/email/password → account activated
4. **Login** — accepts email *or* employee ID → verifies password → checks verification status → issues JWT cookie

### Route Protection (Middleware)

`proxy.ts` (the Next.js 16 middleware convention) handles routing by role:

- Admins hitting `/dashboard`, `/payroll`, `/attendance`, or `/leave` → redirected to `/admin`
- Employees hitting `/admin` → redirected to `/dashboard`
- JWTs are verified via `jose`, compatible with tokens signed by `jsonwebtoken`

### Data Caching

Admin data (employees, leaves, anomalies) is cached client-side via `useDataStore` (Zustand) with a 30-second TTL, invalidated on mutation:

- `invalidateLeaves()` runs after every leave approve/reject
- `fetchAdminAll(true)` force-refreshes after employee verification

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or Atlas)
- A Google Gemini API key
- Gmail SMTP credentials (for email notifications)

### Environment Variables

Create a `.env.local` file:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hrms?retryWrites=true&w=majority
JWT_SECRET=<random 64-char string>
GEMINI_API_KEY=<your-gemini-api-key>
NEXT_PUBLIC_SMTP_EMAIL=your-email@gmail.com
NEXT_PUBLIC_SMTP_PASS=<gmail-app-password>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
git clone https://github.com/senapati484/HRMS.git
cd HRMS

npm install

# Seed the database with demo data
npm run seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then sign up as a new company admin — or log in with the seeded demo credentials.

## API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/signup` | POST | None | Admin registration or employee activation |
| `/api/auth/login` | POST | None | Login (email or employee ID) |
| `/api/auth/logout` | POST | Required | Clear session cookie |
| `/api/auth/verify` | POST | Admin | Verify an employee account |
| `/api/users` | GET | Admin | List company employees |
| `/api/users` | POST | Admin | Create an employee |
| `/api/users/me` | GET | Required | Current user profile |
| `/api/users/[id]` | GET | Required | Get user by ID (company-scoped) |
| `/api/users/[id]` | PATCH | Required | Update user (field-restricted) |
| `/api/users/change-password` | POST | Required | Change own password |
| `/api/attendance` | GET | Required | List attendance (self or company) |
| `/api/attendance` | POST | Employee | Check-in / check-out |
| `/api/attendance/[id]` | PATCH | Admin | Update an attendance record |
| `/api/leave` | GET | Required | List leaves (self or company) |
| `/api/leave` | POST | Employee | Submit a leave request |
| `/api/leave/[id]` | PATCH | Admin | Approve or reject a leave request |
| `/api/payroll/[userId]` | GET | Required | Get payroll (self or company) |
| `/api/payroll/[userId]` | PATCH | Admin | Update payroll |
| `/api/copilot/ask` | POST | Employee | AI HR assistant (streaming) |
| `/api/copilot/anomalies` | GET | Admin | Rule-based anomaly detection |
| `/api/copilot/parse-leave` | POST | Employee | Natural-language leave parsing |

## Data Models

**User** — `name`, `employeeId` (unique), `email` (unique), `passwordHash`, `role` (admin/employee), `companyName` (tenant key), `department`, `designation`, `joinDate`, `employmentType`, `workLocation`, `status`, `bankDetails`, `documents`, plus extended personal info.

**Attendance** — `userId`, `date` (`YYYY-MM-DD`), `checkIn`, `checkOut`, `status`. Unique compound index on `(userId, date)`.

**Leave** — `userId`, `leaveType` (Paid/Sick/Unpaid), `startDate`, `endDate`, `status` (Pending/Approved/Rejected), `hrComment`, `decidedBy`, `decidedAt`.

**Payroll** — `userId` (unique), `monthlyWage`, with all components auto-calculated on save: `basic` (50% of wage), `HRA` (50% of basic), allowances (8.33% each), `employeePF`/`employerPF` (12% of basic), `professionalTax` (₹200). Virtual `net = basic + allowances − deductions`. Also supports bonus, pay cycle, currency, and tax/PF/ESI IDs.

## Known Limitations

- Email verification is simulated — admins manually mark employees as verified from the admin panel
- Attendance timestamps are UTC-based, so Half-Day thresholds may need adjustment outside IST
- No rate limiting on login/signup endpoints
- JWTs remain valid until expiry (7 days) — there's no server-side blacklist on logout
- Employee creation is currently API-only; there's no "add employee" button in the admin UI yet

## License

MIT
