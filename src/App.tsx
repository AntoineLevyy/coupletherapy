import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type SessionMode = 'together' | 'partnerA' | 'partnerB'
type AnswerKind = 'choice' | 'text'

type OptionImpact = {
  heat?: number
  repair?: number
  trust?: number
  gridlock?: number
  optimism?: number
}

type QuestionOption = {
  label: string
  value: string
  detail: string
  impact: OptionImpact
}

type Question = {
  id: string
  kind: AnswerKind
  prompt: string
  helper: string
  placeholder?: string
  options?: QuestionOption[]
}

type AnswerRecord = {
  questionId: string
  prompt: string
  answer: string
  mode: SessionMode
  private: boolean
  impact: OptionImpact
}

type SessionState = {
  index: number
  answers: AnswerRecord[]
  completed: boolean
}

type DashboardInsight = {
  label: string
  score: number
  tone: string
  note: string
}

const guideName = 'Mara'

const modeMeta: Record<
  SessionMode,
  { label: string; privacy: string; description: string }
> = {
  together: {
    label: 'Together',
    privacy: 'Visible in the shared conversation',
    description: 'Use this when you want to move through the repair sequence side by side.',
  },
  partnerA: {
    label: 'Partner A solo',
    privacy: 'Private by default',
    description: 'Use this for a private check-in that contributes only synthesized themes to the shared plan.',
  },
  partnerB: {
    label: 'Partner B solo',
    privacy: 'Private by default',
    description: 'Use this when one partner needs space before returning to the shared conversation.',
  },
}

const questions: Question[] = [
  {
    id: 'stress',
    kind: 'choice',
    prompt: 'How activated does this conflict feel right now?',
    helper: 'Name the current physiological intensity rather than the story about who is right.',
    options: [
      {
        label: 'Manageable',
        value: 'manageable',
        detail: 'We can stay present and listen without spiraling.',
        impact: { heat: 20, optimism: 70, repair: 65 },
      },
      {
        label: 'Charged',
        value: 'charged',
        detail: 'We are tense and defensive, but still reachable.',
        impact: { heat: 55, optimism: 48, repair: 48 },
      },
      {
        label: 'Flooded',
        value: 'flooded',
        detail: 'One or both of us feel overwhelmed or shut down.',
        impact: { heat: 88, optimism: 28, repair: 24 },
      },
    ],
  },
  {
    id: 'pattern',
    kind: 'choice',
    prompt: 'Which conflict pattern feels most true today?',
    helper: 'This helps separate a solvable issue from a recurring gridlocked one.',
    options: [
      {
        label: 'A specific solvable issue',
        value: 'solvable',
        detail: 'This is about logistics, timing, or one recent event.',
        impact: { gridlock: 24, optimism: 74, trust: 62 },
      },
      {
        label: 'A recurring painful topic',
        value: 'recurring',
        detail: 'We revisit this theme often and never feel done.',
        impact: { gridlock: 66, optimism: 44, trust: 48 },
      },
      {
        label: 'A stuck symbolic fight',
        value: 'gridlocked',
        detail: 'It carries old hurts, identity, or unmet dreams underneath it.',
        impact: { gridlock: 90, optimism: 26, trust: 34 },
      },
    ],
  },
  {
    id: 'repair',
    kind: 'choice',
    prompt: 'How much are repair attempts landing between you?',
    helper: 'Think about humor, softening, taking responsibility, affection, or pausing well.',
    options: [
      {
        label: 'They usually land',
        value: 'landing',
        detail: 'We can de-escalate and reconnect before too much damage is done.',
        impact: { repair: 84, trust: 76, heat: 24 },
      },
      {
        label: 'They are inconsistent',
        value: 'inconsistent',
        detail: 'Sometimes one of us reaches, but it often misses.',
        impact: { repair: 50, trust: 54, heat: 48 },
      },
      {
        label: 'They rarely land',
        value: 'missed',
        detail: 'Most attempts feel ignored, criticized, or too late.',
        impact: { repair: 18, trust: 28, heat: 72 },
      },
    ],
  },
  {
    id: 'goal',
    kind: 'choice',
    prompt: 'What would meaningful progress look like from this conversation?',
    helper: 'A clear near-term goal lets the guide coach toward movement instead of endless processing.',
    options: [
      {
        label: 'Feeling heard and understood',
        value: 'heard',
        detail: 'Validation is the main need before problem-solving.',
        impact: { optimism: 70, trust: 72 },
      },
      {
        label: 'Reducing the heat and repairing',
        value: 'repair',
        detail: 'We need to stop hurting each other before anything else.',
        impact: { repair: 72, heat: 34, trust: 58 },
      },
      {
        label: 'Finding an actual agreement',
        value: 'agreement',
        detail: 'We are ready to define a concrete next step or compromise.',
        impact: { optimism: 62, repair: 58, gridlock: 34 },
      },
    ],
  },
  {
    id: 'note',
    kind: 'text',
    prompt: 'What feels most important for the guide to understand underneath the surface of this fight?',
    helper: 'Use a few sentences. In solo mode this stays private and will be synthesized before anything is shown jointly.',
    placeholder: 'Example: I do not feel chosen when plans change, and then I push too hard for reassurance.',
  },
]

const emptySession = (): SessionState => ({
  index: 0,
  answers: [],
  completed: false,
})

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const summarizeText = (answers: AnswerRecord[]) => {
  const notes = answers.filter((answer) => answer.questionId === 'note')
  if (notes.length === 0) {
    return 'The private check-ins suggest more emotion is sitting underneath the immediate argument than the shared conversation has named yet.'
  }

  const merged = notes.map((note) => note.answer.trim()).join(' ').toLowerCase()

  if (merged.includes('unheard') || merged.includes('listen')) {
    return 'A core theme underneath the conflict is the need to feel heard before moving into solutions.'
  }
  if (merged.includes('trust') || merged.includes('safe')) {
    return 'The synthesis points to safety and trust repair as more important than winning the current disagreement.'
  }
  if (merged.includes('alone') || merged.includes('chosen')) {
    return 'The fight appears to touch fears of distance, rejection, or not mattering enough in the relationship.'
  }

  return 'The synthesis suggests the visible fight may be carrying a deeper need for reassurance, responsiveness, and steadier repair.'
}

function App() {
  const [activeMode, setActiveMode] = useState<SessionMode>('together')
  const [draftText, setDraftText] = useState('')
  const [sessions, setSessions] = useState<Record<SessionMode, SessionState>>({
    together: emptySession(),
    partnerA: emptySession(),
    partnerB: emptySession(),
  })

  const activeSession = sessions[activeMode]
  const activeQuestion = questions[activeSession.index]
  const progress = Math.round((activeSession.answers.length / questions.length) * 100)

  const allAnswers = useMemo(
    () => [...sessions.together.answers, ...sessions.partnerA.answers, ...sessions.partnerB.answers],
    [sessions],
  )

  const dashboard = useMemo(() => {
    if (allAnswers.length === 0) {
      return null
    }

    const metrics = allAnswers.reduce(
      (accumulator, answer) => {
        accumulator.heat.push(answer.impact.heat ?? 50)
        accumulator.repair.push(answer.impact.repair ?? 50)
        accumulator.trust.push(answer.impact.trust ?? 50)
        accumulator.gridlock.push(answer.impact.gridlock ?? 50)
        accumulator.optimism.push(answer.impact.optimism ?? 50)
        return accumulator
      },
      {
        heat: [] as number[],
        repair: [] as number[],
        trust: [] as number[],
        gridlock: [] as number[],
        optimism: [] as number[],
      },
    )

    const average = (values: number[]) =>
      values.length === 0 ? 50 : values.reduce((sum, value) => sum + value, 0) / values.length

    const relationshipHeat = clamp(average(metrics.heat))
    const repairCapacity = clamp(average(metrics.repair))
    const trustReserve = clamp(average(metrics.trust))
    const gridlockRisk = clamp(average(metrics.gridlock))
    const forwardMotion = clamp(average(metrics.optimism))

    const insights: DashboardInsight[] = [
      {
        label: 'Conflict heat',
        score: relationshipHeat,
        tone: relationshipHeat > 66 ? 'High activation' : relationshipHeat > 40 ? 'Moderate activation' : 'Regulated enough to work',
        note:
          relationshipHeat > 66
            ? 'Start with down-regulation, shorter turns, and a physiological reset before problem-solving.'
            : 'You likely have enough stability to stay with the issue if the guide keeps the pace structured.',
      },
      {
        label: 'Repair capacity',
        score: repairCapacity,
        tone: repairCapacity > 66 ? 'Repair is reachable' : repairCapacity > 40 ? 'Repair is fragile' : 'Repair is often missed',
        note:
          repairCapacity > 66
            ? 'Lean on soft start-up, appreciation, and concise responsibility-taking.'
            : 'The plan should prioritize simpler repair moves and clearer timing.',
      },
      {
        label: 'Trust reserve',
        score: trustReserve,
        tone: trustReserve > 66 ? 'Mostly intact' : trustReserve > 40 ? 'Shaky under pressure' : 'Needs careful rebuilding',
        note:
          trustReserve > 66
            ? 'Agreements can focus on consistency rather than emergency containment.'
            : 'Follow-through and responsiveness matter more than persuasive arguments right now.',
      },
      {
        label: 'Gridlock risk',
        score: gridlockRisk,
        tone: gridlockRisk > 66 ? 'Symbolic recurring issue' : gridlockRisk > 40 ? 'Mixed solvable and deeper layers' : 'Mostly solvable',
        note:
          gridlockRisk > 66
            ? 'Treat this as a values-and-dreams conversation, not just a logistics debate.'
            : 'Practical next steps are more likely to hold if you keep them specific and observable.',
      },
    ]

    const sharedAnswers = sessions.together.answers.length
    const privateAnswers = sessions.partnerA.answers.length + sessions.partnerB.answers.length

    return {
      insights,
      forwardMotion,
      relationshipHeat,
      plan: [
        'Begin with a 20-minute softened conversation using one issue, one feeling, and one concrete need at a time.',
        relationshipHeat > 66
          ? 'Add a reset protocol: pause when either partner is flooded, regulate separately, and resume with a specific restart sentence.'
          : 'Use a gentle start-up and reflect back what you heard before offering your own position.',
        gridlockRisk > 66
          ? 'Schedule one dreams-within-conflict conversation focused on meaning, identity, and what this issue symbolizes for each partner.'
          : 'End the conversation with a narrow behavioral agreement for the next seven days.',
        repairCapacity < 50
          ? 'Practice two repair phrases daily: “Let me try that again more gently” and “There is something true in what you are saying.”'
          : 'Reinforce the repairs that already work by naming them explicitly when they land.',
        trustReserve < 50
          ? 'Track one follow-through promise per day to rebuild reliability with small visible wins.'
          : 'Protect trust by making fewer commitments and completing them consistently.',
      ],
      synthesis: summarizeText([...sessions.partnerA.answers, ...sessions.partnerB.answers]),
      readinessLabel:
        forwardMotion > 66
          ? 'Ready for a structured repair conversation'
          : forwardMotion > 40
            ? 'Needs containment before deeper work'
            : 'Stabilize first, then return to the issue',
      privacySummary:
        privateAnswers > 0
          ? `${privateAnswers} private responses were folded into synthesis without exposing raw partner text.`
          : 'No private check-ins yet. The dashboard reflects only the shared conversation so far.',
      participationSummary: `${sharedAnswers} shared responses and ${privateAnswers} private responses informed this snapshot.`,
    }
  }, [allAnswers, sessions])

  const conversation = useMemo(() => {
    const intro = {
      role: 'guide' as const,
      text:
        activeMode === 'together'
          ? `${guideName} guides both of you through one conflict at a time with structured pacing, lower heat, and clear repair moves.`
          : `${guideName} is holding a private check-in. Your exact answers stay private unless you later choose to share them directly.`,
    }

    const transcript = activeSession.answers.flatMap((answer) => [
      { role: 'guide' as const, text: answer.prompt },
      {
        role: 'partner' as const,
        text: answer.answer,
        private: answer.private,
      },
    ])

    if (!activeSession.completed && activeQuestion) {
      transcript.push({ role: 'guide' as const, text: activeQuestion.prompt })
    }

    return [intro, ...transcript]
  }, [activeMode, activeQuestion, activeSession.answers, activeSession.completed])

  const submitAnswer = (answer: string, impact: OptionImpact) => {
    if (!activeQuestion) {
      return
    }

    const nextAnswer: AnswerRecord = {
      questionId: activeQuestion.id,
      prompt: activeQuestion.prompt,
      answer,
      mode: activeMode,
      private: activeMode !== 'together',
      impact,
    }

    setSessions((current) => {
      const session = current[activeMode]
      const nextIndex = session.index + 1
      return {
        ...current,
        [activeMode]: {
          index: nextIndex,
          answers: [...session.answers, nextAnswer],
          completed: nextIndex >= questions.length,
        },
      }
    })

    setDraftText('')
  }

  const handleTextSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = draftText.trim()
    if (!value) {
      return
    }

    const impact: OptionImpact =
      value.length > 180
        ? { trust: 62, optimism: 58 }
        : value.length > 100
          ? { trust: 54, optimism: 52 }
          : { trust: 48, optimism: 46 }

    submitAnswer(value, impact)
  }

  const resetMode = (mode: SessionMode) => {
    setDraftText('')
    setSessions((current) => ({
      ...current,
      [mode]: emptySession(),
    }))
  }

  return (
    <div className="shell">
      <section className="hero-panel">
        <div className="eyebrow">Self-guided relationship coaching</div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="kicker">Conflict support designed for couples, not classrooms.</p>
            <h1>Guide heated conversations into structured repair.</h1>
            <p className="hero-text">
              A warm, clinically informed guide voice helps couples move through conflict together or
              separately, then turns the conversation into a relationship dashboard and a practical coaching
              plan grounded in Gottman-style principles.
            </p>
            <div className="hero-pills">
              <span>Shared guide voice</span>
              <span>Private solo check-ins</span>
              <span>Joint synthesis only</span>
            </div>
          </div>
          <div className="hero-aside">
            <div className="signal-card">
              <div className="signal-label">Guide intent</div>
              <strong>Reduce flooding. Increase understanding. End with one next move.</strong>
            </div>
            <div className="signal-card subdued">
              <div className="signal-label">Boundary</div>
              <strong>Coaching support, not clinical therapy or crisis care.</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-bar" aria-label="Product principles">
        <article>
          <span>01</span>
          <h2>Private by default</h2>
          <p>Solo answers stay private. The shared dashboard only shows synthesized themes and coaching signals.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Built for conflict</h2>
          <p>The flow prioritizes physiological regulation, soft start-up, repair attempts, and gridlock awareness.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Responsive first</h2>
          <p>Designed for phone, laptop, and asynchronous handoff when partners are not ready to sit together.</p>
        </article>
      </section>

      <main className="app-grid">
        <section className="panel mode-panel">
          <div className="panel-header">
            <div>
              <p className="section-tag">Session setup</p>
              <h2>Choose how you want to enter the conflict.</h2>
            </div>
            <div className="readiness-chip">{dashboard?.readinessLabel ?? 'No relationship snapshot yet'}</div>
          </div>

          <div className="mode-tabs" role="tablist" aria-label="Session mode">
            {(Object.entries(modeMeta) as [SessionMode, (typeof modeMeta)[SessionMode]][]).map(([mode, meta]) => (
              <button
                key={mode}
                className={mode === activeMode ? 'mode-tab active' : 'mode-tab'}
                onClick={() => setActiveMode(mode)}
                role="tab"
                aria-selected={mode === activeMode}
                type="button"
              >
                <span>{meta.label}</span>
                <small>{meta.privacy}</small>
              </button>
            ))}
          </div>

          <div className="mode-summary">
            <div>
              <strong>{modeMeta[activeMode].label}</strong>
              <p>{modeMeta[activeMode].description}</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => resetMode(activeMode)}>
              Reset this path
            </button>
          </div>

          <div className="progress-strip" aria-label="Session progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{activeSession.completed ? 'Complete' : `${progress}% complete`}</span>
          </div>
        </section>

        <section className="panel chat-panel">
          <div className="panel-header">
            <div>
              <p className="section-tag">Guided conversation</p>
              <h2>{guideName} holds the pace and asks the next useful question.</h2>
            </div>
            <div className="guide-badge">Guide voice: shared</div>
          </div>

          <div className="chat-thread">
            {conversation.map((item, index) => (
              <article
                key={`${item.role}-${index}`}
                className={item.role === 'guide' ? 'bubble bubble-guide' : 'bubble bubble-partner'}
              >
                <div className="bubble-meta">
                  <span>{item.role === 'guide' ? guideName : modeMeta[activeMode].label}</span>
                  {'private' in item && item.private ? <em>Private</em> : null}
                </div>
                <p>{item.text}</p>
                {item.role === 'guide' && !activeSession.completed && index === conversation.length - 1 ? (
                  <small>{activeQuestion?.helper}</small>
                ) : null}
              </article>
            ))}
          </div>

          {!activeSession.completed && activeQuestion?.kind === 'choice' && activeQuestion.options ? (
            <div className="composer-options">
              {activeQuestion.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="option-card"
                  onClick={() => submitAnswer(option.label, option.impact)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>
          ) : null}

          {!activeSession.completed && activeQuestion?.kind === 'text' ? (
            <form className="composer-form" onSubmit={handleTextSubmit}>
              <label htmlFor="note-response" className="sr-only">
                Relationship context
              </label>
              <textarea
                id="note-response"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder={activeQuestion.placeholder}
                rows={5}
              />
              <div className="composer-footer">
                <span>{activeMode === 'together' ? 'This answer will appear in the shared conversation.' : 'This answer remains private and will only inform synthesis.'}</span>
                <button type="submit" className="primary-button">
                  Save answer
                </button>
              </div>
            </form>
          ) : null}

          {activeSession.completed ? (
            <div className="completion-card">
              <strong>{modeMeta[activeMode].label} check-in complete.</strong>
              <p>
                The dashboard has been updated with the latest coaching signals. Switch modes to add a second
                partner check-in or continue together.
              </p>
            </div>
          ) : null}
        </section>

        <section className="panel dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="section-tag">Relationship dashboard</p>
              <h2>Synthesized signals, not exposed private transcripts.</h2>
            </div>
          </div>

          {dashboard ? (
            <>
              <div className="metric-grid">
                {dashboard.insights.map((insight) => (
                  <article key={insight.label} className="metric-card">
                    <div className="metric-topline">
                      <span>{insight.label}</span>
                      <strong>{insight.score}</strong>
                    </div>
                    <h3>{insight.tone}</h3>
                    <p>{insight.note}</p>
                  </article>
                ))}
              </div>

              <div className="summary-grid">
                <article className="summary-card emphasis">
                  <span className="summary-label">Relationship readiness</span>
                  <strong>{dashboard.readinessLabel}</strong>
                  <p>{dashboard.participationSummary}</p>
                </article>
                <article className="summary-card">
                  <span className="summary-label">Private synthesis</span>
                  <strong>{dashboard.privacySummary}</strong>
                  <p>{dashboard.synthesis}</p>
                </article>
              </div>

              <article className="plan-card">
                <div className="plan-header">
                  <div>
                    <span className="summary-label">Coaching plan</span>
                    <h3>One structured week of repair-focused practice</h3>
                  </div>
                  <div className="forward-score">Forward motion {dashboard.forwardMotion}</div>
                </div>
                <ol>
                  {dashboard.plan.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
            </>
          ) : (
            <div className="empty-dashboard">
              <strong>No coaching snapshot yet.</strong>
              <p>Start the guided conversation and the dashboard will translate your responses into relationship signals and a first-pass plan.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
