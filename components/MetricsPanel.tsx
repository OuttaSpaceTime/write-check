'use client'

import type { DocMetric } from '@/lib/check/types'

export default function MetricsPanel({ metrics }: { metrics: DocMetric[] }) {
  if (metrics.length === 0) return null
  return (
    <div className="metrics">
      <h2>Writing insights</h2>
      <ul className="metric-list">
        {metrics.map(metric => (
          <li key={metric.id} className={metric.flagged ? 'metric flagged' : 'metric'}>
            <div className="metric-header">
              <strong>{metric.label}</strong>
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
