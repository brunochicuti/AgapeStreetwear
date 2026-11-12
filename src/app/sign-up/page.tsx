import { SignUp } from "@clerk/nextjs";

export const instant = false;

type SignUpPageProps = {
  searchParams: Promise<{
    redirectUrl?: string;
  }>;
};

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps) {
  const { redirectUrl } = await searchParams;

  const safeRedirectUrl =
  redirectUrl === "/checkout" ? "/checkout" : "/";

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <SignUp
            routing="hash"
            signInUrl="/sign-in"
            forceRedirectUrl={safeRedirectUrl}
          />
        </div>
      </div>
    </section>
  );
}