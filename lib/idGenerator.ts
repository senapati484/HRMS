import { User } from "@/models/User";

export async function generateEmployeeId(
  companyName: string,
  employeeName: string,
  joinDate: Date = new Date()
): Promise<string> {
  // Company Initials (e.g., Odoo India -> OI, Acme Corp -> AC)
  const cleanCompany = companyName.trim().replace(/[^a-zA-Z\s]/g, "");
  const words = cleanCompany.split(/\s+/).filter(Boolean);
  let compInitials = "";
  if (words.length >= 2) {
    compInitials = words.map(w => w[0]).join("").toUpperCase();
  } else if (words.length === 1) {
    compInitials = words[0].slice(0, 2).toUpperCase();
  } else {
    compInitials = "CO";
  }

  // Employee Initials (First letter of first name and last name)
  const cleanName = employeeName.trim().replace(/[^a-zA-Z\s]/g, "");
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  let empInitials = "XX";
  if (nameParts.length >= 2) {
    empInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  } else if (nameParts.length === 1) {
    empInitials = nameParts[0].slice(0, 2).padEnd(2, "X").toUpperCase();
  }

  // Year and Month of joining
  const year = joinDate.getFullYear().toString();
  const month = (joinDate.getMonth() + 1).toString().padStart(2, "0");

  // Serial number (count users created in the same year)
  const startOfYear = new Date(joinDate.getFullYear(), 0, 1);
  const endOfYear = new Date(joinDate.getFullYear(), 11, 31, 23, 59, 59);

  const count = await User.countDocuments({
    createdAt: { $gte: startOfYear, $lte: endOfYear }
  });
  
  const serial = (count + 1).toString().padStart(4, "0");

  return `${compInitials}${empInitials}${year}${month}${serial}`;
}
