import { describe, expect, it } from 'vitest'
import { EN_PATTERNS } from '../lib/ai/catalog.en'
import { findPatternIssues } from '../lib/ai/patterns'
import { proseOnly } from '../lib/markdown/mask'

function flagIds(text: string, markdown = false): string[] {
  const prose = markdown ? proseOnly(text) : text
  const issues = findPatternIssues(prose, EN_PATTERNS, markdown ? text : prose)
  return [...new Set(issues.map(issue => issue.ruleId))]
}

function expectFlags(actual: string[], expected: string[]) {
  for (const id of expected) {
    expect(actual, `pattern ${id} should fire`).toContain(id)
  }
}

const blogIntro =
  "In today's fast-paced digital landscape, businesses must adapt quickly to stay competitive. Let's delve into how modern companies are transforming their operations. It is important to note that technology alone isn't the answer -- culture, leadership, and execution all play a pivotal role. Moreover, companies that embrace change often outperform their peers. It's not just about adopting new tools, it's about reimagining the entire organization. The results reveal a rich tapestry of agility, innovation, and resilience."

const techDoc = [
  '## Key Benefits Of The New Caching Layer',
  '',
  'The caching layer serves as a robust, seamless solution that leverages modern caching techniques — reducing latency — it also boasts a comprehensive set of configuration options — and it functions as a drop-in replacement for the legacy module.',
  '',
  '- **Performance**: Reduces average response time by 40%',
  '- **Reliability**: Ensures consistent uptime across regions',
  '- **Scalability**: Supports up to 10x traffic without additional infrastructure',
  '',
  'Additionally, the module is crucial for teams operating within distributed systems, particularly those that have exhibited high request volumes across production environments. Notably, this comprehensive redesign underscores the importance of caching architecture, offering fresh insights into performance tuning.',
].join('\n')

const marketingCopy =
  'Nestled in the heart of the historic district, our boutique hotel boasts a vibrant atmosphere, impeccable service, and unforgettable charm. Industry experts agree that experiential travel is reshaping the hospitality landscape, and our commitment to sustainability, community, and craftsmanship reflects that shift. The hotel has been featured in numerous travel publications and industry outlets, cementing its status as a destination that stands as a testament to timeless elegance.'

const essay =
  "What does it mean to live a meaningful life? How do we balance ambition with contentment? These questions have occupied philosophers for centuries. Moreover, the answer is rarely simple. Furthermore, most agree that purpose cannot be found through wealth alone. Additionally, relationships, health, and personal growth all factor into lasting fulfillment. It's not about achieving more, it's about appreciating what we already have. In conclusion, the pursuit of meaning is not a destination but an ongoing journey."

const chatbotReply =
  'Certainly! Here’s a comprehensive overview of the steps you can take to troubleshoot your account. As of my knowledge cutoff, I don’t have access to real-time system status, so some details may have changed. First, clear your browser cache -- the log should read “cache cleared” when done. Second, disable any active extensions. Third, restart the application. I hope this helps! Let me know if you have any other questions, and feel free to ask if anything is unclear.'

const academicAbstract =
  "This study provides a comprehensive analysis of the intricate mechanisms underlying cellular signaling. Additionally, our findings underscore the crucial role of protein folding within this pathway, offering valuable insights into disease progression. Notably, the authors' meticulous and commendable methodology exhibited significant improvements over prior approaches, particularly across diverse experimental conditions."

const humanAnecdote =
  "I burned the rice again last night, third time this month, and my downstairs neighbor still hasn't said anything about the smoke, bless her. Anyway I fixed the porch step with a shim I cut from an old skateboard deck, which is either genius or a fire hazard depending who you ask. My uncle says both. He's been wrong before though -- he once told me raccoons couldn't open a bungee cord, so."

const humanTechNote =
  "Ran the migration twice by accident. Nothing broke, turns out it's idempotent (lucky). Don't run it a third time just to test that theory though, id_seq gets weird above ~40 reruns per the incident from March. Fixed the flaky test by bumping the timeout from 200ms to 500ms -- not proud of it, but it's Friday."

const humanReview =
  "The soup dumplings here are inconsistent -- sometimes the broth leaks out before you even get them to your spoon, sometimes it's perfect, no in-between. I keep going back anyway because the chili oil alone is worth the bus ride. Service is slow if you sit near the kitchen door, don't ask me why. Three stars, would still recommend to anyone who doesn't mind waiting."

describe('AI-style fixtures trigger the researched patterns', () => {
  it('blog intro', () => {
    const flags = flagIds(blogIntro)
    expectFlags(flags, [
      'fast-paced-opener',
      'collaborative-address',
      'ai-vocab-core',
      'hedging-important-to-note',
      'puffery-pivotal-role',
      'negative-parallelism-not-just',
      'puffery-rich-tapestry',
      'rule-of-three',
      'delve',
    ])
    expect(flags).not.toContain('em-dash-overuse')
    expect(flags).not.toContain('formulaic-transitions')
  })

  it('technical doc with markdown formatting tells', () => {
    const flags = flagIds(techDoc, true)
    expectFlags(flags, [
      'title-case-headings',
      'copula-avoidance',
      'buzzword-cluster',
      'puffery-boasts',
      'em-dash-overuse',
      'inline-header-bullets',
      'academic-marker-words',
    ])
  })

  it('marketing copy', () => {
    const flags = flagIds(marketingCopy)
    expectFlags(flags, [
      'puffery-nestled',
      'puffery-boasts',
      'rule-of-three',
      'vague-attribution',
      'ai-vocab-core',
      'notability-media-puffery',
      'puffery-testament',
      'copula-avoidance',
    ])
  })

  it('essay with staged questions and transitions', () => {
    const flags = flagIds(essay)
    expectFlags(flags, [
      'rhetorical-question-triad',
      'formulaic-transitions',
      'negative-parallelism-not-just',
      'section-summary-ending',
    ])
    expect(flags).not.toContain('rule-of-three')
  })

  it('pasted chatbot reply', () => {
    const flags = flagIds(chatbotReply)
    expectFlags(flags, ['chatbot-pleasantries', 'knowledge-cutoff-disclaimer'])
  })

  it('academic abstract', () => {
    const flags = flagIds(academicAbstract)
    expectFlags(flags, ['academic-marker-words', 'academic-adjectives', 'ai-vocab-core'])
  })
})

describe('human control texts stay clean', () => {
  it.each([
    ['personal anecdote', humanAnecdote],
    ['technical note', humanTechNote],
    ['restaurant review', humanReview],
  ])('%s produces zero flags', (_name, text) => {
    expect(flagIds(text)).toEqual([])
  })

  it('a single em dash never fires the density rule', () => {
    expect(flagIds('One thought — then another sentence follows here.')).toEqual([])
  })

  it('a single triad is treated as deliberate rhetoric', () => {
    expect(flagIds('The flag is red, white, and blue.')).toEqual([])
  })

  it('a single polite email closer is not a chatbot artifact', () => {
    expect(flagIds('Thanks again for your patience. Let me know if you need anything else before Friday.')).toEqual([])
    expect(flagIds('Attached is the report. I hope this helps with the audit preparation.')).toEqual([])
  })
})
