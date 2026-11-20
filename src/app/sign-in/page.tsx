import { SignIn } from "@clerk/nextjs";

export const instant = false;

type SignInPageProps = {
  searchParams: Promise<{
    redirectUrl?: string;
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const { redirectUrl } = await searchParams;

  const rotasPermitidas = [
    "/",
    "/checkout",
    "/acompanhar-pedido",
  ];

  const safeRedirectUrl = rotasPermitidas.includes(
    redirectUrl ?? ""
  )
    ? redirectUrl!
    : "/";

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
