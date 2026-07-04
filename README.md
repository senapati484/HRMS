# HRMS — Human Resource Management System

A full-stack multi-tenant HRMS built with Next.js 16, MongoDB, and Gemini AI. Supports admin company registration, employee lifecycle management, attendance tracking, leave management, payroll automation, and an AI-powered HR copilot.

## Features

- **Multi-tenant isolation** — Companies are fully isolated by `companyName`. Admins and employees within the same company can only see each other's data.
- **Attendance** — Daily check-in/check-out with automatic status (Present/HalfDay/Absent). Late threshold based on check-in time. Monthly calendar view with color-coded status indicators.
- **Leave Management** — AI-powered natural language leave request parsing. Policy-enforced balance tracking (12 Paid / 8 Sick / 30 Unpaid per year). Backdate and overlap prevention. Admin approval workflow with email notifications.
- **Payroll** — Auto-calculated salary components (Basic, HRA, Allowances, PF, Professional Tax) derived from monthly wage. Virtual net take-home. Supports bonus, pay cycle, currency, tax/PF/ESI IDs.
- **Admin Dashboard** — Overview stats, employee directory with verification, pending leave approval board, anomaly alerts (stale leaves, excessive absences), payroll manager with component breakdown visualization.
- **Employee Dashboard** — Today's team attendance grid, personal attendance logs, leave history, quick-access portal cards.
- **Profile Management** — Editable resume, private info, bank details, documents, salary view, and password change.
- **AI HR Copilot** — Gemini-powered streaming assistant with real-time access to leave balance, attendance history, and payroll data.
- **Email Notifications** — Nodemailer-based notifications for leave status changes, new leave requests, new employee credentials, and account verification.
- **Dark/Light Mode** — Theme toggle with system preference detection.
- **Mobile Responsive** — All pages adapt to mobile, tablet, and desktop viewports.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Authentication | JWT (httpOnly cookies, 7-day expiry) via `jose` (middleware) + `jsonwebtoken` (API) |
| Database | MongoDB with Mongoose ODM |
| State (Client) | Zustand (`useUserStore`, `useDataStore`) |
| Validation | Zod on all write endpoints |
| AI | Google Gemini 2.5 Flash (streaming + structured parsing) |
| Email | Nodemailer (Gmail SMTP) |
| Styling | CSS variables + Tailwind-style utility classes |

## Architecture

### Multi-Tenant Isolation

Every user belongs to a company identified by `companyName`. All data queries filter by this field:

- `User.companyName` — the tenant key
- All admin-list endpoints (`GET /api/users`, `GET /api/leave?all=true`, `GET /api/attendance?all=true`, `GET /api/copilot/anomalies`) scope queries by the admin's `companyName`
- Cross-company access is enforced on all PATCH and single-record GET routes by comparing the admin's `companyName` with the target record owner's `companyName`
- Missing/null `companyName` is rejected with 403

### Auth Flows

1. **Admin Self-Registration** — Signs up with company name → auto-generates employeeId → pre-verified → redirects to login
2. **Admin Creates Employee** — Specifies name/email → auto-generates employeeId + temp password → creates Payroll record with default ₹30,000 wage → sends credentials email
3. **Employee Activation** — Uses pre-assigned employeeId → sets name/email/password → account activated
4. **Login** — Supports email OR employeeId → verifies password → checks isVerified → sets JWT cookie

### Proxy (Middleware)

`proxy.ts` handles route protection (Next.js 16 convention):
- Admins accessing `/dashboard`, `/payroll`, `/attendance`, `/leave` → redirected to `/admin`
- Employees accessing `/admin` → redirected to `/dashboard`
- JWT verified via `jose` (compatible with `jsonwebtoken` signatures)

### Data Caching

Admin data (employees, leaves, anomalies) is cached via `useDataStore` (Zustand) with a 30-second TTL. Cache is invalidated after mutations:
- `invalidateLeaves()` called after leave approve/reject
- `fetchAdminAll(true)` force-refreshes after employee verification

## Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- Google Gemini API key (for AI features)
- Gmail SMTP credentials (for email notifications)

## Environment Variables

Create `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hrms?retryWrites=true&w=majority
JWT_SECRET=<random 64-char string>
GEMINI_API_KEY=<your-gemini-api-key>
NEXT_PUBLIC_SMTP_EMAIL=your-email@gmail.com
NEXT_PUBLIC_SMTP_PASS=<gmail-app-password>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup

```bash
# Install dependencies
npm install

# Seed the database with demo data
npm run seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up as a new company admin, or log in with seeded credentials.

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/signup` | POST | None | Admin registration or employee activation |
| `/api/auth/login` | POST | None | Login (email or employeeId) |
| `/api/auth/logout` | POST | Required | Clear session cookie |
| `/api/auth/verify` | POST | Admin | Verify employee account |
| `/api/users` | GET | Admin | List company employees |
| `/api/users` | POST | Admin | Create employee |
| `/api/users/me` | GET | Required | Current user profile |
| `/api/users/[id]` | GET | Required | User by ID (company-scoped) |
| `/api/users/[id]` | PATCH | Required | Update user (field-restricted) |
| `/api/users/change-password` | POST | Required | Change own password |
| `/api/attendance` | GET | Required | List attendance (self or company) |
| `/api/attendance` | POST | Employee | Check-in / check-out |
| `/api/attendance/[id]` | PATCH | Admin | Update attendance record |
| `/api/leave` | GET | Required | List leaves (self or company) |
| `/api/leave` | POST | Employee | Submit leave request |
| `/api/leave/[id]` | PATCH | Admin | Approve/reject leave |
| `/api/payroll/[userId]` | GET | Required | Get payroll (self or company) |
| `/api/payroll/[userId]` | PATCH | Admin | Update payroll |
| `/api/copilot/ask` | POST | Employee | AI HR assistant (streaming) |
| `/api/copilot/anomalies` | GET | Admin | Rule-based anomaly detection |
| `/api/copilot/parse-leave` | POST | Employee | NL leave parsing |

## Data Models

### User
`name`, `employeeId` (unique), `email` (unique), `passwordHash`, `role` (admin/employee), `companyName` (tenant key), `department`, `designation`, `joinDate`, `employmentType`, `workLocation`, `status`, `bankDetails`, `documents`, and extensive personal info fields.

### Attendance
`userId`, `date` (YYYY-MM-DD), `checkIn`, `checkOut`, `status`. Unique compound index on `(userId, date)`.

### Leave
`userId`, `leaveType` (Paid/Sick/Unpaid), `startDate`, `endDate`, `status` (Pending/Approved/Rejected), `hrComment`, `decidedBy`, `decidedAt`.

### Payroll
`userId` (unique), `monthlyWage` — all components auto-calculated via pre-save: `basic` (50% of wage), `HRA` (50% of basic), allowances (8.33% each), `employeePF`/`employerPF` (12% of basic), `professionalTax` (200). Virtual `net = basic + allowances - deductions`. Supports bonus, pay cycle, currency, tax/PF/ESI IDs.

## Known Limitations

- Email verification is simulated (admin marks employees as verified via the admin panel)
- Attendance timezone is UTC-based; HalfDay threshold may behave differently for non-IST timezones
- No rate limiting on login/signup endpoints
- JWT tokens remain valid until expiry (7 days) — no server-side blacklist on logout
- Employee creation is only available via API (no UI button in admin panel yet)

## License

MIT
