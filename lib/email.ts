import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.NEXT_PUBLIC_SMTP_EMAIL,
    pass: process.env.NEXT_PUBLIC_SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return;
  await transporter.sendMail({
    from: `"Acme Corp HRMS" <${process.env.NEXT_PUBLIC_SMTP_EMAIL}>`,
    to: recipients.join(", "),
    subject,
    html,
  });
}

export function leaveStatusEmail({
  name, leaveType, startDate, endDate, status, hrComment, employeeId,
}: {
  name: string; leaveType: string; startDate: string; endDate: string;
  status: string; hrComment?: string; employeeId: string;
}) {
  const approved = status === "Approved";
  const emoji = approved ? "✅" : "❌";
  const color = approved ? "#16a34a" : "#dc2626";
  return {
    subject: `Leave ${status} — ${name} (${employeeId})`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;font-size:40px;margin-bottom:8px">${emoji}</div>
        <h2 style="text-align:center;color:${color};margin:0 0 16px">Leave ${status}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 12px;color:#6b7280">Employee</td><td style="padding:8px 12px;font-weight:600">${name}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Employee ID</td><td style="padding:8px 12px">${employeeId}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Leave Type</td><td style="padding:8px 12px">${leaveType}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Start Date</td><td style="padding:8px 12px">${startDate}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">End Date</td><td style="padding:8px 12px">${endDate}</td></tr>
          ${hrComment ? `<tr><td style="padding:8px 12px;color:#6b7280">HR Comment</td><td style="padding:8px 12px;font-style:italic">${hrComment}</td></tr>` : ""}
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p style="font-size:12px;color:#9ca3af;text-align:center">This is an automated message from Acme Corp HRMS. Please do not reply.</p>
      </div>`,
  };
}

export function newLeaveRequestEmail({
  adminName, employeeName, employeeId, leaveType, startDate, endDate, remarks,
}: {
  adminName: string; employeeName: string; employeeId: string;
  leaveType: string; startDate: string; endDate: string; remarks?: string;
}) {
  return {
    subject: `New Leave Request — ${employeeName} (${employeeId})`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;font-size:40px;margin-bottom:8px">📋</div>
        <h2 style="text-align:center;color:#2563eb;margin:0 0 16px">New Leave Request</h2>
        <p style="text-align:center;color:#6b7280;font-size:14px;margin-bottom:16px">${employeeName} has submitted a leave request that needs your review.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 12px;color:#6b7280">Employee</td><td style="padding:8px 12px;font-weight:600">${employeeName}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Employee ID</td><td style="padding:8px 12px">${employeeId}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Leave Type</td><td style="padding:8px 12px">${leaveType}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Start Date</td><td style="padding:8px 12px">${startDate}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">End Date</td><td style="padding:8px 12px">${endDate}</td></tr>
          ${remarks ? `<tr><td style="padding:8px 12px;color:#6b7280">Reason</td><td style="padding:8px 12px;font-style:italic">${remarks}</td></tr>` : ""}
        </table>
        <div style="text-align:center;margin-top:20px">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin?tab=leaves"
             style="display:inline-block;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            Review in Admin Panel
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p style="font-size:12px;color:#9ca3af;text-align:center">This is an automated message from Acme Corp HRMS. Please do not reply.</p>
      </div>`,
  };
}

export function newEmployeeCredentialsEmail({
  name, email, employeeId, tempPassword, companyName,
}: {
  name: string; email: string; employeeId: string; tempPassword: string; companyName: string;
}) {
  return {
    subject: `Welcome to ${companyName} — Your Account Credentials`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;font-size:40px;margin-bottom:8px">🎉</div>
        <h2 style="text-align:center;color:#2563eb;margin:0 0 8px">Welcome to ${companyName}!</h2>
        <p style="text-align:center;color:#6b7280;font-size:14px;margin-bottom:20px">Your HRMS account has been created.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 12px;color:#6b7280">Name</td><td style="padding:8px 12px;font-weight:600">${name}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Employee ID</td><td style="padding:8px 12px;font-family:monospace">${employeeId}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Email</td><td style="padding:8px 12px">${email}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280">Temporary Password</td><td style="padding:8px 12px;font-family:monospace;font-weight:600">${tempPassword}</td></tr>
        </table>
        <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#92400e">
          <strong>⚠️ Please change your password after your first login.</strong>
        </div>
        <div style="text-align:center;margin-top:12px">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login"
             style="display:inline-block;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            Sign In →
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p style="font-size:12px;color:#9ca3af;text-align:center">This is an automated message from Acme Corp HRMS. Please do not reply.</p>
      </div>`,
  };
}

export async function sendLeaveStatusNotification(
  employee: { name: string; email: string; personalEmail?: string; employeeId: string },
  leave: { leaveType: string; startDate: Date; endDate: Date; status: string; hrComment?: string },
) {
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const mail = leaveStatusEmail({
    name: employee.name,
    employeeId: employee.employeeId,
    leaveType: leave.leaveType,
    startDate: fmt(leave.startDate),
    endDate: fmt(leave.endDate),
    status: leave.status,
    hrComment: leave.hrComment,
  });
  const recipients = [employee.email];
  if (employee.personalEmail) recipients.push(employee.personalEmail);
  await sendEmail({ to: recipients, ...mail });
}

export async function sendNewLeaveNotification(
  admin: { name: string; email: string },
  employee: { name: string; employeeId: string },
  leave: { leaveType: string; startDate: Date; endDate: Date; remarks?: string },
) {
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const mail = newLeaveRequestEmail({
    adminName: admin.name,
    employeeName: employee.name,
    employeeId: employee.employeeId,
    leaveType: leave.leaveType,
    startDate: fmt(leave.startDate),
    endDate: fmt(leave.endDate),
    remarks: leave.remarks,
  });
  await sendEmail({ to: admin.email, ...mail });
}

export async function sendNewEmployeeCredentials(
  employee: { name: string; email: string; employeeId: string },
  tempPassword: string,
  companyName: string,
) {
  const mail = newEmployeeCredentialsEmail({
    name: employee.name,
    email: employee.email,
    employeeId: employee.employeeId,
    tempPassword,
    companyName,
  });
  await sendEmail({ to: employee.email, ...mail });
}
