import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = [
  "/nova-world",
  "/nova",
  "/learning-missions",
  "/inventor",
  "/milo-world",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const accessCookie = request.cookies.get("dreamscape_test_access")?.value;

  if (accessCookie === "granted") {
    return NextResponse.next();
  }

  const passwordPageUrl = request.nextUrl.clone();
  passwordPageUrl.pathname = "/dreamscape-access";
  passwordPageUrl.searchParams.set("redirect", pathname);

  return NextResponse.redirect(passwordPageUrl);
}

export const config = {
  matcher: [
    "/nova-world/:path*",
    "/nova/:path*",
    "/learning-missions/:path*",
    "/inventor/:path*",
    "/milo-world/:path*",
  ],
};