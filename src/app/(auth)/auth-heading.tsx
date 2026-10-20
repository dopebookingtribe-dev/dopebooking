export function AuthHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-10">
      <h1 className="font-display text-headline">{title}</h1>
      {children ? <p className="mt-4 text-muted">{children}</p> : null}
    </header>
  );
}
