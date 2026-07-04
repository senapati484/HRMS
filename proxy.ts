import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Admins are blocked from these personal-employee-only routes (including dashboard and profile is shared)
const EMPLOYEE_ONLY = ["/dashboard", "/payroll", "/attendance", "/leave"];

// Routes that only admins can access (employees redirected to /dashboard)
const ADMIN_ONLY = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verify JWT from cookie
  const token = request.cookies.get("hrms_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let payload: { userId: string; role: string } | null = null;
  try {
    const { payload: p } = await jwtVerify(token, JWT_SECRET);
    payload = p as { userId: string; role: string };
  } catch {
    // Invalid / expired token — clear cookie and redirect to login
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("hrms_token");
    return res;
  }

  const role = payload.role;

  // Admin visiting employee-only routes → redirect to admin panel
  if (role === "admin" && EMPLOYEE_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Employee visiting admin-only routes → redirect to dashboard
  if (role !== "admin" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendance/:path*",
    "/leave/:path*",
    "/payroll/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
