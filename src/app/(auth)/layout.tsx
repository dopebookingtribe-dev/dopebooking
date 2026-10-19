import { Container } from "@/components/ui/container";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container className="flex flex-1 items-start justify-center py-16 sm:py-24">
      <div className="w-full max-w-md">{children}</div>
    </Container>
  );
}
