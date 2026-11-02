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

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <SignUp
            routing="hash"
            signInUrl="/sign-in"
            forceRedirectUrl={redirectUrl || "/"}
          />
        </div>
      </div>
    </section>
  );
}