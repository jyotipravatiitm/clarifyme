import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { Mascot } from "@/components/game/Mascot";

export const metadata: Metadata = { title: "Why this works · ClarifyMe" };

const GROUPS: { title: string; blurb: string; items: [string, string, string][] }[] = [
  {
    title: "Controlled languages",
    blurb: "Restricted English where each sentence has one meaning.",
    items: [
      ["ASD-STE100", "https://www.asd-ste100.org/", "Simplified Technical English from aerospace: about 900 approved words, one meaning each, short active sentences."],
      ["EARS", "https://alistairmavin.com/ears/", "Easy Approach to Requirements Syntax (Rolls-Royce): five sentence templates for requirements."],
      ["Attempto Controlled English", "http://attempto.ifi.uzh.ch/site/", "English that a parser turns into first-order logic. If it parses, it has exactly one meaning."],
      ["RFC 2119", "https://www.rfc-editor.org/rfc/rfc2119", "MUST, SHOULD, MAY: keywords with exact meanings."],
      ["Plain Language", "https://www.plainlanguage.gov/guidelines/", "US federal plain-language guidelines."],
      ["Up-Goer Five", "https://xkcd.com/1133/", "Explain hard things with the thousand most common words."],
    ],
  },
  {
    title: "Formal specification",
    blurb: "Thinking above the code: say what must always be true, then let a tool hunt for counterexamples.",
    items: [
      ["TLA+", "https://lamport.azurewebsites.net/tla/tla.html", "Leslie Lamport's language for specifying systems; the TLC model checker finds counterexample traces."],
      ["P", "https://p-org.github.io/P/", "State-machine language from Microsoft for modeling distributed systems."],
      ["Alloy", "https://alloytools.org/", "Lightweight formal methods: write a model, get an instant counterexample."],
      ["Quint", "https://quint-lang.org/", "TLA+ ideas with a modern, typed syntax."],
      ["Dafny", "https://dafny.org/", "A language whose compiler proves your code meets its spec."],
      ["Learn TLA+", "https://learntla.com/", "Hillel Wayne's free guide."],
    ],
  },
  {
    title: "Structured thinking",
    blurb: "Tools for seeing what an argument says, and what it quietly assumes.",
    items: [
      ["Toulmin model", "https://en.wikipedia.org/wiki/Stephen_Toulmin#The_Toulmin_model_of_argument", "Claim, grounds, warrant, backing, qualifier, rebuttal."],
      ["Argdown", "https://argdown.org/", "Markdown-like syntax for argument maps."],
      ["Pyramid Principle", "https://en.wikipedia.org/wiki/Barbara_Minto", "Barbara Minto: answer first, then group the support."],
      ["BLUF", "https://en.wikipedia.org/wiki/BLUF_(communication)", "Bottom line up front, from military writing."],
    ],
  },
  {
    title: "Prose linters",
    blurb: "Automated checks like the rules in this app.",
    items: [
      ["Vale", "https://vale.sh/", "A configurable prose linter with style packages."],
      ["proselint", "https://github.com/amperser/proselint", "Checks drawn from great writers and editors."],
      ["write-good", "https://github.com/btford/write-good", "Flags passive voice, weasel words and more."],
    ],
  },
];

export default function About() {
  return (
    <AppShell>
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        <Mascot mood="happy" size={96} />
        <div>
          <h1 className="text-3xl font-black">Why this works</h1>
          <p className="font-bold text-ink-soft">If a sentence can mean two things, someone will read the other one.</p>
        </div>
      </div>
      <div className="card mb-8 flex flex-col gap-2 px-5 py-4 text-lg">
        <p>
          <strong className="font-black">Write it</strong> challenges ask you for one or two lines. Fast rules catch the usual suspects (vague words, passive voice, &quot;and/or&quot;, stray pronouns). Then an AI <em>adversarial reader</em> tries to misread you on purpose and shows the counterexample.
        </p>
        <p>
          <strong className="font-black">Break it</strong> challenges flip it: you read a loose spec and hunt for the corner cases, the way a model checker hunts for a bad trace.
        </p>
      </div>
      <div className="flex flex-col gap-8">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-xl font-black">{g.title}</h2>
            <p className="mb-3 font-bold text-ink-soft">{g.blurb}</p>
            <ul className="flex flex-col gap-2">
              {g.items.map(([name, href, desc]) => (
                <li key={name} className="card px-4 py-3">
                  <a href={href} target="_blank" rel="noreferrer" className="font-black text-brand underline-offset-2 hover:underline">
                    {name}
                  </a>
                  <p className="text-ink-soft">{desc}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
    </AppShell>
  );
}
