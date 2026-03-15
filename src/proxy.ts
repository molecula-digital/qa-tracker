import { NextRequest, NextResponse } from "next/server";

const standalone = process.env.NEXT_PUBLIC_STANDALONE === "true";

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get("better-auth.session_token");
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  const isDashboard = pathname.startsWith("/dashboard");

  // Standalone mode: skip marketing pages, go straight to app
  if (standalone && pathname === "/") {
    const target = sessionToken ? "/dashboard" : "/sign-in";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (isDashboard && !sessionToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/sign-in", "/sign-up"],
};
