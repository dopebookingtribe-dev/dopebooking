import { Meta } from "@/components/ui/meta";

export function AuthHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-10">
      <Meta>{eyebrow}</Meta>
      <h1 className="mt-3 font-display text-headline">{title}</h1>
      {children ? <p className="mt-4 text-muted">{children}</p> : null}
    </header>
  );
}
