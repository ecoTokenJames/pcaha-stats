import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & name removal",
  description:
    "Contact PCAHA Stats to report a mistake or ask for a player's name to be removed.",
  alternates: { canonical: "/contact" },
};

export const CONTACT_EMAIL = "contact@pcahastats.com";

export default function ContactPage() {
  const removalSubject = encodeURIComponent("Name removal request");
  const removalBody = encodeURIComponent(
    "Player's name:\nTeam (e.g. Burnaby Winter Club U11 A1):\nJersey number (if you know it):\nYour relationship to the player:\n"
  );

  return (
    <div className="max-w-2xl space-y-6 text-gray-800">
      <h2 className="text-2xl font-bold text-gray-900">Contact &amp; name removal</h2>

      <section className="space-y-2">
        <p>
          PCAHA Stats is an unofficial, volunteer-run site. Standings, scores
          and player stats come from the public game sheets on Spordle (the
          system PCAHA uses), and are updated every night.
        </p>
        <p>
          Spot a mistake, or have a question? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-700 underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900">Remove a player&apos;s name</h3>
        <p>
          If you&apos;re a parent or guardian and don&apos;t want your
          child&apos;s name shown here, email us with the player&apos;s name
          and team. We&apos;ll replace the name with &ldquo;Name
          withheld&rdquo; everywhere on the site, including search. Their
          goals and assists still count toward the team&apos;s totals.
        </p>
        <p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${removalSubject}&body=${removalBody}`}
            className="inline-block rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Email a removal request
          </a>
        </p>
        <p className="text-sm text-gray-500">
          The change shows up after the next nightly update. This site
          doesn&apos;t control Spordle or PCAHA&apos;s own records.
        </p>
      </section>
    </div>
  );
}
