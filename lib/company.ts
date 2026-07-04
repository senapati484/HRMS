import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

interface CompanyDoc {
  companyName?: string;
}

export async function getAdminCompany(userId: string): Promise<string | null> {
  await connectDB();
  const admin = await User.findById(userId, "companyName").lean();
  return (admin as CompanyDoc | null)?.companyName ?? null;
}

export async function verifyCompanyAccess(
  adminId: string,
  targetUserId: string
): Promise<boolean> {
  await connectDB();
  const [admin, target] = await Promise.all([
    User.findById(adminId, "companyName").lean(),
    User.findById(targetUserId, "companyName").lean(),
  ]);
  const adminCompany = (admin as CompanyDoc | null)?.companyName;
  const targetCompany = (target as CompanyDoc | null)?.companyName;
  if (!adminCompany || !targetCompany) return false;
  return adminCompany === targetCompany;
}
