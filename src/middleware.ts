import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  
  // Se for um recurso estático do Next.js e possuir parâmetros de consulta (como ?v=timestamp)
  if (url.pathname.startsWith("/_next/static/") && url.searchParams.size > 0) {
    // Limpar os parâmetros de busca para evitar o erro 404 do Webpack Dev Server
    const cleanUrl = new URL(url.pathname, request.url);
    return NextResponse.rewrite(cleanUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Aplicar o middleware apenas a rotas de arquivos estáticos do Next.js
  matcher: "/_next/static/:path*",
};
