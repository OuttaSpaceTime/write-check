import { describe, expect, it } from 'vitest'
import { DE_PATTERNS } from '../lib/ai/catalog.de'
import { DE_SPEAKER_TELLS } from '../lib/ai/catalog.de-speaker'
import { findPatternIssues } from '../lib/ai/patterns'

function deFlags(text: string): string[] {
  return [...new Set(findPatternIssues(text, DE_PATTERNS).map(issue => issue.ruleId))]
}

function tellFlags(text: string): string[] {
  return [...new Set(findPatternIssues(text, DE_SPEAKER_TELLS).map(issue => issue.ruleId))]
}

function expectFlags(actual: string[], expected: string[]) {
  for (const id of expected) {
    expect(actual, `pattern ${id} should fire`).toContain(id)
  }
}

const corporateBlog =
  'In der heutigen digitalen Welt spielt die Digitalisierung eine entscheidende Rolle für den Mittelstand. Zudem ermöglicht sie es Unternehmen, ihre Prozesse effizienter zu gestalten. Es ist wichtig zu beachten, dass nicht nur große Konzerne von dieser Entwicklung profitieren, sondern auch kleine und mittelständische Betriebe. Darüber hinaus eröffnet die Digitalisierung neue Möglichkeiten für Wachstum. Zusammenfassend lässt sich sagen, dass Unternehmen, die sich dieser Entwicklung öffnen, langfristig erfolgreicher sein werden.'

const chatbotLetter =
  'Betreff: Informationen zu nachhaltigen Verpackungslösungen\n\nLiebe Leserinnen und Leser,\n\nich hoffe, diese Nachricht erreicht Sie wohlauf. Gerne gebe ich Ihnen einen umfassenden Überblick über nachhaltige Verpackungslösungen. Basierend auf verfügbaren Informationen bis Anfang 2024 lässt sich festhalten, dass immer mehr Unternehmen auf recycelbare Materialien setzen. Ich hoffe, das hilft Ihnen weiter. Lassen Sie mich wissen, falls Sie weitere Fragen haben!'

const marketingCopy =
  'Tauchen wir ein in die Welt der künstlichen Intelligenz – eine Technologie, die das volle Potenzial jedes Unternehmens entfesseln kann. Mit unserer ganzheitlichen, maßgeschneiderten und nahtlosen Lösung heben Sie Ihr Business aufs nächste Level – ganz gleich, in welcher Branche Sie tätig sind – und schöpfen ungeahnte Möglichkeiten aus.'

const policyText =
  'Die Umsetzung der Digitalisierung der öffentlichen Verwaltung ermöglicht die Steigerung der Effizienz, die Verbesserung der Bürgerfreundlichkeit und die Reduzierung der Bearbeitungszeiten. Viele Experten sind sich einig, dass diese Entwicklung unumkehrbar ist. Trotz ihrer Erfolge steht die Verwaltung jedoch vor mehreren Herausforderungen: dem Mangel an Fachkräften, der Komplexität bestehender Systeme und der Notwendigkeit kontinuierlicher Investitionen. Insgesamt lässt sich sagen, dass der Weg zur digitalen Verwaltung noch lang ist.'

const wellnessBlog =
  'Es lässt sich nicht leugnen, dass ausreichend Schlaf für die Gesundheit von großer Bedeutung ist. Eine gute Nachtruhe kann dazu beitragen, das Immunsystem zu stärken, und kann außerdem helfen, die Konzentration zu verbessern. Guter Schlaf ist wie ein Fundament, auf dem der gesamte Tag aufbaut. Ganzheitlich betrachtet, ist ein ausgewogener, nachhaltiger und vielschichtiger Lebensstil entscheidend. Denken Sie daran: Jeder kleine Schritt zählt!'

const humanMarket =
  'Letzten Samstag bin ich mit dem Rad zum Wochenmarkt in Ehrenfeld gefahren, weil mein Lieblingsstand endlich wieder Spargel aus der Südpfalz hatte. Der Händler, ein älterer Herr mit einem Kölner Dialekt, den man kaum noch hört, erzählte mir, dass die Ernte dieses Jahr wegen der Kälte im April zwei Wochen später begonnen hat. Zudem war der Preis höher als sonst, was ich ihm auch angemerkt habe. Er zuckte nur mit den Schultern und meinte, das kann man sich eben nicht aussuchen. Ich habe trotzdem ein Kilo gekauft und mir mittags eine klassische Spargelsuppe gekocht.'

const humanLocalNews =
  'Die Ampel an der Ecke Bismarckstraße/Hauptstraße wurde im März umgebaut – nach fast einem Jahr Bauzeit war das auch nötig, denn die alte Anlage hatte ständig Aussetzer. Anwohner hatten sich mehrfach beim Ordnungsamt beschwert, weil Fußgänger bei Rot über die Straße gehen mussten, um überhaupt zur Bushaltestelle zu gelangen. Ob die neue Schaltung das Problem tatsächlich löst, wird sich erst im Winter zeigen, wenn wieder mehr Schüler zu Fuß unterwegs sind.'

const humanAnalysis =
  'Nach einer Untersuchung des Statistischen Bundesamts von 2023 arbeiteten rund 24 Prozent der Beschäftigten in Deutschland zumindest zeitweise im Homeoffice, wobei der Anteil in Großstädten deutlich höher lag als auf dem Land. Ich bezweifle allerdings, dass sich dieser Trend in den kommenden Jahren so einfach fortschreiben lässt: Viele Betriebe im verarbeitenden Gewerbe können mobiles Arbeiten schon aus technischen Gründen kaum anbieten, und auch in der Pflege oder im Einzelhandel bleibt Präsenz die Regel.'

describe('German AI-style fixtures trigger the researched patterns', () => {
  it('corporate blog stacked with tells', () => {
    const flags = deFlags(corporateBlog)
    expectFlags(flags, [
      'puffery-heutige-welt',
      'puffery-rolle-spielen',
      'transition-zudem',
      'de-wichtig-zu-beachten',
      'conclusion-zusammenfassend',
    ])
    expect(flags, 'a single nicht-nur…sondern-auch must stay below the gate').not.toContain('not-only-but-also')
  })

  it('pasted chatbot letter', () => {
    expectFlags(deFlags(chatbotLetter), [
      'chatbot-letter-artifact',
      'chatbot-knowledge-cutoff',
      'chatbot-collab-artifact',
    ])
  })

  it('marketing copy with dash chains and buzzword stack', () => {
    expectFlags(deFlags(marketingCopy), [
      'marketing-eintauchen',
      'marketing-entfesseln',
      'buzzword-adjective-stack',
      'dash-overuse',
    ])
  })

  it('policy text with nominal chains and weasel attribution', () => {
    expectFlags(deFlags(policyText), [
      'nominalization-cluster',
      'weasel-vague-attribution',
      'generic-challenge-closing',
      'conclusion-zusammenfassend',
    ])
  })

  it('wellness blog with hedges and CTA closing', () => {
    expectFlags(deFlags(wellnessBlog), [
      'hedge-safety-formula',
      'puffery-von-bedeutung',
      'modal-hedge-kann',
      'forced-metaphor',
      'buzzword-adjective-stack',
      'imperative-cta-closing',
    ])
  })
})

describe('human German control texts stay clean', () => {
  it.each([
    ['market anecdote with a single incidental Zudem', humanMarket],
    ['local news with one legitimate dash and natural passives', humanLocalNews],
    ['analysis naming a real source', humanAnalysis],
  ])('%s produces zero flags', (_name, text) => {
    expect(deFlags(text)).toEqual([])
  })

  it('a single polite email closer is not a chatbot artifact', () => {
    expect(deFlags('Bitte lassen Sie mich wissen, ob diese Änderungen für Sie machbar sind.')).toEqual([])
  })
})

describe('German-speaker English tells', () => {
  it.each([
    ['since-years', 'I have been working here since three years.'],
    ['informations', 'We collected many informations during the audit.'],
    ['comma-before-that', 'I think, that we should deploy on Friday.'],
    ['how-looks-like', 'Nobody knows how it looks like in production.'],
    ['we-see-us', 'We see us tomorrow at the office.'],
    ['by-foot', 'I go to work by foot when it rains.'],
    ['handy-phone', 'My handy is broken again.'],
    ['until-now', 'Until now we had no incidents at all.'],
    ['persons-people', 'Three persons attended the workshop.'],
    ['become-receive', 'Did you become the email from the customer?'],
    ['make-do', 'The kids make homework after dinner.'],
    ['actual-current', 'The actual version of the app still crashes.'],
  ])('%s fires on the transfer error', (id, sentence) => {
    expect(tellFlags(sentence)).toContain(id)
  })

  it.each([
    ['idiomatic handy', 'This tool comes in handy when debugging.'],
    ['correct duration', 'We have been working on this for three years, and so far nothing broke.'],
    ['correct that-clause', 'The actual outcome differed from the forecast that the team published.'],
    ['correct on foot', 'People who walk on foot arrive later than cyclists.'],
  ])('%s stays clean', (_name, sentence) => {
    expect(tellFlags(sentence)).toEqual([])
  })
})
