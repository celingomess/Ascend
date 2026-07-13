import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(request: NextRequest) {
    const url = request.nextUrl;
    
    if (url.pathname.startsWith("/_next/static/") && url.searchParams.size > 0) {
      const cleanUrl = new URL(url.pathname, request.url);
      return NextResponse.rewrite(cleanUrl);
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/_next/static/:path*",
    "/dashboard/:path*",
    "/saude/:path*",
    "/financas/:path*",
    "/metas/:path*",
    "/perfil/:path*",
    "/ascensao/:path*",
    "/hall/:path*",
    "/conquistas/:path*",
  ],
};
