
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/product(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/termos(.*)",
  "/privacidade(.*)",
  "/cookies(.*)",
  "/api/webhooks(.*)",
]);

const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (isAdminRoute(req)) {
    const { userId } = await auth();
    const adminId = process.env.ADMIN_CLERK_USER_ID;

    if (!userId || !adminId || userId !== adminId) {
      return new Response("Acesso não autorizado.", {
        status: 403,
      });
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
