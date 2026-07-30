'use client'

import { useRef, useState, type ComponentProps } from 'react'

type Props = ComponentProps<'pre'> & { node?: unknown }

export default function CodeBlock({ node: _node, ...props }: Props) {
  const preRef = useRef<HTMLPreElement | null>(null)
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(preRef.current?.textContent ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block">
      <button type="button" className="copy-button" onClick={copy}>
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
      <pre ref={preRef} {...props} />
    </div>
  )
}
