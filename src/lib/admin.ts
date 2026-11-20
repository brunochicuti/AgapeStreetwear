
import { auth } from "@clerk/nextjs/server";

export async function verificarAdmin() {
  const { userId } = await auth();

  const adminId = process.env.ADMIN_CLERK_USER_ID;

  return Boolean(userId && adminId && userId === adminId);
}
