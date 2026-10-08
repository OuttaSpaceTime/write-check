'use client'

import type { DocMetric, MetricGrade } from '@/lib/check/types'

const GRADE_LABEL: Record<MetricGrade, string> = { good: 'Good', ok: 'OK', weak: 'Weak' }

export default function MetricsPanel({ metrics }: { metrics: DocMetric[] }) {
  if (metrics.length === 0) return null
  return (
    <div className="metrics">
      <h2>Writing insights</h2>
      <ul className="metric-list">
        {metrics.map(metric => (
          <li key={metric.id} className={metric.flagged ? 'metric flagged' : 'metric'}>
            <div className="metric-header">
              <span>
                <strong>{metric.label}</strong>
                {metric.grade && <span className={`badge grade grade-${metric.grade}`}>{GRADE_LABEL[metric.grade]}</span>}
              </span>
              <span className="metric-value">{metric.value}</span>
            </div>
            <p>{metric.assessment}</p>
            {metric.flagged && (
              <p className="metric-advice">
                <span className="why-label">Improve:</span> {metric.advice}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
