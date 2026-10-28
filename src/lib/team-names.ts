// Short team names for phones: "LANGLEY MHA (1) U18 A1 TIER 1 EAGLES" -> "Langley A1".
// Built only from the names already in our data. When two teams in the same group
// would end up with the same short name, those get a longer one (nickname, then full).

/** Words for the kind of association, dropped from the short name */
const ASSOC_WORDS = new Set(["MHA", "AHA", "IHA", "HA", "MHC", "AMHA", "MINOR", "HOCKEY", "ASSOCIATION"]);
const GENDER_WORDS = new Set(["FEMALE", "GIRLS"]);
/** Kept upper-case when title-casing */
const UPPER = new Set(["WC", "BCEHL", "PCEHL", "PCAHA", "SJHA", "EYH", "FVE", "FVW", "FVN", "FNVE", "DHA", "MHA", "AHA", "IHA", "HA", "JR"]);

/** Small words that stay lower-case inside a name ("Sea to Sky", "Juan de Fuca") */
const LOWER = new Set(["TO", "OF", "DE", "THE", "AND"]);

function titleCase(words: string[]): string {
  return words
    .map((w, i) =>
      UPPER.has(w) || /^[A-Z]\d*$/.test(w) || /^(AA|AAA)$/.test(w) || /^\d/.test(w) || !/[AEIOUY]/.test(w)
        ? w
        : i > 0 && LOWER.has(w)
          ? w.toLowerCase()
          : w.toLowerCase().replace(/(^|[-(/.])([a-z])/g, (_, p, c) => p + c.toUpperCase())
    )
    .join(" ");
}

const tidy = (name: string) => name.toUpperCase().replace(/\s+-\s+/g, " ").replace(/\s+/g, " ").trim();

interface Parts {
  /** Club words, e.g. ["NORTH", "SHORE", "WC"] */
  assoc: string[];
  gender: string[];
  /** "A1", "C3", "AA", "T3", "DEV A"... */
  grade: string[];
  /** Words that tell same-club teams apart, e.g. ["EAGLES"] or ["BLACK", "COUGARS"] */
  nickname: string[];
}

function parse(name: string): Parts | null {
  // Bracketed colours/names help tell teams apart; (1), (SE3), (PCAHA U13 A2) don't
  const bracketWords = [...name.toUpperCase().matchAll(/\(([^)]*)\)/g)]
    .map((m) => m[1].trim())
    .filter((b) => /^[A-Z ]+$/.test(b) && !/PCAHA|PNAHA/.test(b))
    .flatMap((b) => b.split(/\s+/));
  const words = tidy(name.replace(/\([^)]*\)/g, " ").toUpperCase().replace(/WINTER CLUB/g, "WC").replace(/&/g, " ")).split(" ");
  const ageAt = words.findIndex((w) => /^U\d{1,2}([AC]{1,2})?$/.test(w));
  if (ageAt < 0) return null;

  // BCEHL style: "PCEHL U13 NORTH SHORE WC" (club comes after the age group)
  if (ageAt === 1 && /^(PCEHL|BCEHL)$/.test(words[0])) {
    return { assoc: words.slice(2).filter((w) => !ASSOC_WORDS.has(w)), gender: [], grade: [], nickname: [] };
  }

  const before = words.slice(0, ageAt);
  const after = words.slice(ageAt + 1);
  const assoc = before.filter((w) => !ASSOC_WORDS.has(w) && !GENDER_WORDS.has(w) && w !== "DISTRICT");
  const gender = [...new Set(words.filter((w) => GENDER_WORDS.has(w)))];

  // Grade straight after the age group: "U15AA", "A1", "C3", "DEVELOPMENT A", "TIER 3"
  const grade: string[] = [];
  const glued = words[ageAt].match(/^U\d{1,2}([AC]{1,2})$/)?.[1];
  let i = 0;
  if (glued) grade.push(glued);
  else if (/^(AA|A\d*|C\d*|B\d*)$/.test(after[0] ?? "")) grade.push(after[i++]);
  else if (after[0] === "DEVELOPMENT" || after[0] === "DEV") {
    grade.push("DEV");
    i = 1;
    if (/^(A\d*|T\d+)$/.test(after[1] ?? "")) grade.push(after[i++]);
  }
  // "TIER 2" repeats the A-level tier; on its own it is the grade
  if (after[i] === "TIER" && /^\d+$/.test(after[i + 1] ?? "")) {
    if (!grade.length) grade.push(`T${after[i + 1]}`);
    i += 2;
  }
  // Codes like "SY4" (Surrey) repeat the grade
  const nickname = [
    ...bracketWords,
    ...after.slice(i).filter((w) => !/^[A-Z]{2}\d+$/.test(w) && !GENDER_WORDS.has(w)),
  ];
  return { assoc, gender, grade, nickname };
}

/** Longest form a team's name can take; past it, two names are the same team */
const MAX_LEVEL = 3;

/**
 * 0: club + level ("Langley A1"), 1: + girls/female ("Langley Girls A1"),
 * 2: + nickname ("Langley A1 Eagles"), 3: the full name (e.g. a U11 and a U15 team
 * meeting in one tournament). Names we can't read keep their full form, with any
 * bracketed note only when needed to tell two apart.
 */
function shortAt(name: string, level: number): string {
  if (level >= 3) return titleCase(tidy(name).split(" "));
  const p = parse(name);
  if (!p || p.assoc.length === 0) {
    const plain = tidy(name.replace(/\([^)]*\)/g, " "));
    return titleCase((level >= 2 ? tidy(name) : plain).split(" "));
  }
  const words = [
    ...p.assoc,
    ...(level >= 1 ? p.gender : []),
    ...p.grade,
    ...(level >= 2 ? p.nickname : []),
  ];
  return titleCase(words);
}

/**
 * Short names for teams shown together (a schedule, a division). When two different
 * teams would get the same short name, both get the next longer form that tells them
 * apart; identical forms all the way up mean it's the same team listed twice.
 */
export function shortTeamNames(teams: Array<{ teamId: number; teamName: string }>): Map<number, string> {
  const unique = new Map<number, string>();
  for (const t of teams) if (!unique.has(t.teamId)) unique.set(t.teamId, t.teamName);

  const level = new Map<number, number>([...unique.keys()].map((id) => [id, 0]));
  for (let pass = 0; pass < MAX_LEVEL; pass++) {
    const byShort = new Map<string, number[]>();
    for (const [id, name] of unique) {
      const s = shortAt(name, level.get(id)!);
      byShort.set(s, [...(byShort.get(s) ?? []), id]);
    }
    for (const ids of byShort.values()) {
      if (ids.length < 2) continue;
      const from = level.get(ids[0])!;
      for (let next = from + 1; next <= MAX_LEVEL; next++) {
        if (new Set(ids.map((id) => shortAt(unique.get(id)!, next))).size > 1) {
          for (const id of ids) level.set(id, next);
          break;
        }
      }
    }
  }
  return new Map([...unique].map(([id, name]) => [id, shortAt(name, level.get(id)!)]));
}
