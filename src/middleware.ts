import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // 1. Lógica para recursos estáticos (Webpack Dev Server)
  if (url.pathname.startsWith("/_next/static/")) {
    if (url.searchParams.size > 0) {
      const cleanUrl = new URL(url.pathname, request.url);
      return NextResponse.rewrite(cleanUrl);
    }
    return NextResponse.next();
  }

  // 2. Proteção de rotas privadas via NextAuth
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "supersecret-ascend-key-123",
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

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
