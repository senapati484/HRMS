import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import Sidebar from "@/components/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("hrms_token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) redirect("/login");
  if (decoded.role !== "admin") redirect("/dashboard");

  await connectDB();
  const user = (await User.findById(decoded.userId, "-passwordHash").lean()) as any;
  if (!user) redirect("/login");

  const sidebarUser = {
    name: user.name,
    employeeId: user.employeeId,
    designation: user.designation,
    department: user.department,
    role: user.role,
    profilePicture: user.profilePicture,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar user={sidebarUser} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
