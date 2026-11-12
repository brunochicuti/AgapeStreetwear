import { SignIn } from "@clerk/nextjs";

export const instant = false;

type SingInPageProps = {
  searchParams: Promise<{
    redirectUrl?: string;
  }>;
};

export default async function SingInPage({
  searchParams,
}: SingInPageProps) {
  const { redirectUrl } = await searchParams;

  const safeRedirectUrl =
  redirectUrl === "/checkout" ? "/checkout" : "/";

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <SignIn
            routing="hash"
            signUpUrl="/sign-up"
            forceRedirectUrl={safeRedirectUrl}
          />
        </div>
      </div>
    </section>
  );
}