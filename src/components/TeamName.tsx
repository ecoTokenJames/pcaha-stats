/** A team's short name on phones ("Langley A1"), its full name from small tablets up. */
export function TeamName({ name, short }: { name: string; short?: string }) {
  if (!short || short === name) return <>{name}</>;
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{name}</span>
    </>
  );
}
