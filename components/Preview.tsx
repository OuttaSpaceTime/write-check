'use client'

import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import CodeBlock from './CodeBlock'

export default function Preview({ text }: { text: string }) {
  if (!text.trim()) return <p className="empty-state">Nothing to render yet.</p>
  return (
    <div className="preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: CodeBlock }}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
