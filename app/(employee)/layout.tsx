import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import Header from "@/components/Header";
import CopilotAsk from "@/components/CopilotAsk";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("hrms_token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) redirect("/login");

  await connectDB();
  const user = (await User.findById(decoded.userId, "-passwordHash").lean()) as any;
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Header />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <CopilotAsk />
    </div>
  );
}
