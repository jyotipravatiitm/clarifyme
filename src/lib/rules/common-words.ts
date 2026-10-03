/**
 * About 1,000 everyday English words, for the "simple words only" drills
 * (in the spirit of xkcd's Up-Goer Five). The list is hand-picked for this app.
 * Inflected forms (plural, -ed, -ing, -er, -est, -ly) are accepted by the stemmer.
 */
const WORDS = `
a able about above across act add afraid after afternoon again against age ago agree air all allow almost alone along already also always am among an and angry animal another answer any anyone anything area arm around arrive art as ask at away
baby back bad bag ball bank base be bear beat beautiful because become bed been before begin behind believe below best better between big bird bit black block blood blow blue board boat body bone book born both bottom box boy brain break breakfast bring brother brown build burn business busy but buy by
call came can car card care carry case cat catch cause center chair chance change charge cheap check child choose city class clean clear climb clock close cloth cloud cold color come common computer cook cool copy corner correct cost could count country course cover cow cross cry cup cut
dad dance dark data date day dead deal dear death decide deep did die different difficult dinner direction dirty do doctor does dog dollar done door double down draw dream dress drink drive drop dry during
each ear early earth easy eat edge egg eight either else empty end enough enter even evening event ever every everyone everything exact example except expect eye
face fact fail fall family far farm fast father fear feel feet few field fight fill find fine finger finish fire first fish fit five fix flat floor flower fly follow food foot for force forget form forward four free friend from front fruit full fun future
game garden gate gave get girl give glass go goal god gold gone good got great green ground group grow guess gun
had hair half hand hang happen happy hard has hat have he head hear heart heat heavy held hello help her here high hill him his hit hold hole home hope horse hot hour house how huge human hundred hurt
i ice idea if important in inside into is it its
job join jump just
keep key kid kill kind king kitchen knew know
lady land language large last late laugh law lay lead learn least leave left leg less let letter level lie life lift light like line list listen little live lock long look lose lot loud love low lucky
machine made main make man many map mark market matter may me mean measure meet member men message middle might mile milk mind minute miss mom money month moon more morning most mother mountain mouth move much music must my
name near need never new news next nice night nine no noise none nor north nose not note nothing notice now number
ocean of off offer office often oh oil ok okay old on once one only open or order other our out outside over own
page pain paint pair paper parent part party pass past pay people person pick picture piece place plan plant play please point poor possible power press pretty price print problem pull push put
question quick quiet quite
race rain raise ran rather reach read ready real reason red remember rest return rich ride right ring rise river road rock room round rule run
sad safe said same save saw say school sea seat second see seem self sell send sense sent set seven several shake shall shape share she ship shirt shoe shop short should shout show shut sick side sign simple since sing sister sit six size skin sky sleep slow small smell smile snow so soft some someone something sometimes son song soon sorry sound south space speak special spend stand star start state stay step stick still stone stop store story street strong student study such sun sure surface sweet swim system
table take talk tall teach team tell ten test than thank that the their them then there these they thing think third this those though thought three through throw time tiny to today together told tomorrow too took top total touch toward town tree trip trouble true try turn twelve twenty two type
under understand until up upon us use usual
very visit voice
wait wake walk wall want war warm was wash watch water wave way we wear weather week weight well went were west what wheel when where which while white who whole why wide wife will win wind window wing winter wish with without woman women wonder word work world worry would write wrong
yard year yellow yes yet you young your
able above accept across actually afraid alive almost already although anybody anymore anyway apart apple army aunt awake bake balance band bar bath beach bean bell belong belt bend beside bike bill birthday bite blind boss bottle bowl brave bread bridge bright brush bucket bus butter button cake camera camp candy cap captain card careful cash castle cave chain cheese chicken chip circle clever cliff coat coffee coin collect cookie corn cotton crowd crown danger dangerous desk dish doll drawer drum dust duty eager edge engine enemy enjoy entire envelope escape excite exercise explain extra fair false famous fan fault favorite feather fence fever flag flame flash float fold folk fool fork fox frame freeze fresh frog fuel gas gentle gift glad glove glue grab grass gray grey guard guest guide hall hammer handle hate health hero hide holiday honest honey hook hungry hunt hurry ink insect iron island jacket joke juice jungle kick kiss knee knife knock ladder lake lamp lazy leaf lean lesson library lid lip lonely luck lunch magic mail meal meat medicine metal mirror mistake mix model monkey mud nail neck needle nest net nobody nod noon nurse nut obey odd onion orange oven owe pack pan pants park path pea peace pen pencil pet pig pin pipe pity plane plate pocket poem pole police polite pool pot powder prize promise proud pump pupil puppy purple purse queen rabbit radio rail rare rat rope rose rubber rush salt sand scale scare scissors seed shadow sheep shelf shell shine shoulder shower silent silly silver sink skip skirt slide slip smoke snake soap sock soup spoon spot spring square stairs stamp steal steam stomach storm stove straight strange string stupid sugar suit supper swing tail tape taste tax tea tear thick thin thirsty thread throat thumb ticket tie tight tired toe tongue tool tooth towel toy track trade train trash tray treat trick truck trust truth tube tune twin uncle unless upset vegetable village wagon waste wet whale whip whisper wild wire wise wolf wood wool yell zero
secret private copy safe place lose keep again someone really true sure kind else sick fair hide
account answer app button click delete email file help home link log login password phone screen sign site text type user web
`;

export const COMMON_WORDS: ReadonlySet<string> = new Set(
  WORDS.split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean),
);

/** Function words and inflections that are always allowed. */
const ALWAYS_OK = new Set([
  "i'm", "it's", "don't", "doesn't", "didn't", "can't", "won't", "isn't", "aren't", "wasn't", "weren't",
  "you're", "they're", "we're", "that's", "there's", "let's", "i'll", "you'll", "went", "children",
  "people", "men", "women", "feet", "teeth", "mice", "better", "best", "worse", "worst", "more", "most",
  // irregular past forms
  "lost", "broke", "broken", "made", "gave", "given", "took", "taken", "came", "knew", "known", "found", "told", "said",
  "thought", "brought", "bought", "kept", "left", "felt", "held", "ran", "saw", "seen", "sat", "stood", "understood",
  "wrote", "written", "ate", "eaten", "drove", "driven", "flew", "forgot", "forgotten", "got", "gotten", "hid", "hidden",
  "led", "meant", "met", "paid", "sent", "sold", "spent", "threw", "thrown", "won", "wore", "woke", "chose", "chosen",
  "began", "begun", "became", "drew", "drawn", "drank", "fell", "fallen", "froze", "grew", "grown", "hung", "rode",
  "rang", "rose", "shook", "sang", "slept", "spoke", "spoken", "stole", "stuck", "taught", "tore", "did", "done", "gone",
]);

export function isCommon(word: string, stemsOf: (w: string) => string[], allow: ReadonlySet<string> = new Set()): boolean {
  const w = word.toLowerCase().replace(/’/g, "'");
  if (/^\d+$/.test(w) || ALWAYS_OK.has(w) || allow.has(w)) return true;
  if (stemsOf(w).some((s) => allow.has(s))) return true;
  return stemsOf(w).some((s) => COMMON_WORDS.has(s));
}
