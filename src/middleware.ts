import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Proteger apenas rotas privadas definidas no matcher
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
