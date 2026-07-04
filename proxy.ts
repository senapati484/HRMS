import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const EMPLOYEE_PATHS = ["/dashboard", "/profile", "/attendance", "/leave", "/payroll"];
const ADMIN_PATHS = ["/admin"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isEmployeePath = EMPLOYEE_PATHS.some((p) => pathname.startsWith(p));
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if (!isEmployeePath && !isAdminPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get("hrms_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Block employees from admin routes
    if (isAdminPath && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin can view employee routes — no restriction needed
    return NextResponse.next();
  } catch {
    // Invalid or expired token — clear cookie and redirect
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("hrms_token", "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/attendance/:path*",
    "/leave/:path*",
    "/payroll/:path*",
    "/admin/:path*",
  ],
};
