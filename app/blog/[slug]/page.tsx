import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { articles, getArticleBySlug } from '@/lib/content/articles'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticleBySlug(params.slug)
  if (!article) return { title: 'Not Found' }
  return {
    title: `${article.title} | BuilderMind AI`,
    description: article.description,
    keywords: article.keywords.join(', '),
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://buildermindai.com/blog/${article.slug}`,
      siteName: 'BuilderMind AI',
      type: 'article',
      publishedTime: article.date,
    },
    alternates: {
      canonical: `https://buildermindai.com/blog/${article.slug}`,
    }
  }
}

function renderMarkdown(content: string) {
  const lines = content.trim().split('\n')
  const elements: React.ReactElement[] = []
  let i = 0
  let tableBuffer: string[] = []
  let inTable = false
  let listBuffer: string[] = []
  let inList = false
  let codeBuffer: string[] = []
  let inCode = false

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${i}`} className="list-disc list-inside space-y-2 mb-4 text-gray-300">
          {listBuffer.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: processInline(item.replace(/^[-*]\s+/, '')) }} />
          ))}
        </ul>
      )
      listBuffer = []
      inList = false
    }
  }

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const headerCells = tableBuffer[0].split('|').filter(c => c.trim())
      const dataRows = tableBuffer.slice(2)
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-800">
                {headerCells.map((cell, idx) => (
                  <th key={idx} className="border border-gray-700 px-4 py-2 text-left text-gray-200 font-semibold">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ridx) => {
                const cells = row.split('|').filter(c => c.trim())
                return (
                  <tr key={ridx} className={ridx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'}>
                    {cells.map((cell, cidx) => (
                      <td key={cidx} className="border border-gray-700 px-4 py-2 text-gray-300">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      tableBuffer = []
      inTable = false
    }
  }

  const processInline = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-800 text-orange-300 px-1 rounded text-sm">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-orange-400 hover:text-orange-300 underline">$1</a>')
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (inCode) {
        elements.push(
          <pre key={`code-${i}`} className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto mb-6 text-sm">
            <code className="text-green-300">{codeBuffer.join('\n')}</code>
          </pre>
        )
        codeBuffer = []
        inCode = false
      } else {
        flushList(); flushTable()
        inCode = true
      }
      i++; continue
    }

    if (inCode) { codeBuffer.push(line); i++; continue }

    if (line.startsWith('|')) {
      flushList()
      inTable = true
      tableBuffer.push(line)
      i++; continue
    } else if (inTable) {
      flushTable()
    }

    if (/^[-*]\s/.test(line)) {
      flushTable()
      inList = true
      listBuffer.push(line)
      i++; continue
    } else if (inList && line.trim() === '') {
      flushList()
      i++; continue
    } else if (inList) {
      flushList()
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-3xl font-bold text-white mb-6 mt-8">{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-white mb-4 mt-8 border-b border-gray-800 pb-2">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-xl font-semibold text-orange-400 mb-3 mt-6">{line.slice(4)}</h3>)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="mb-2" />)
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-orange-500 pl-4 py-1 mb-4 italic text-gray-300">
          <span dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />
        </blockquote>
      )
    } else {
      elements.push(
        <p key={i} className="text-gray-300 leading-relaxed mb-4">
          <span dangerouslySetInnerHTML={{ __html: processInline(line) }} />
        </p>
      )
    }
    i++
  }

  flushList(); flushTable()
  return elements
}

export default function ArticlePage({ params }: Props) {
  const article = getArticleBySlug(params.slug)
  if (!article) notFound()

  const related = articles.filter(a => a.slug !== article.slug && a.category === article.category).slice(0, 3)
  const otherArticles = related.length < 3 ? [...related, ...articles.filter(a => a.slug !== article.slug && a.category !== article.category)].slice(0, 3) : related

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Breadcrumb */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-3 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/blog" className="hover:text-gray-300">Blog</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-300">{article.category}</span>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full">
              {article.category}
            </span>
            <span className="text-xs text-gray-500">{article.readTime}</span>
            <span className="text-xs text-gray-500">{new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-xl text-gray-400">{article.description}</p>
        </div>

        {/* CTA Box */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-white font-semibold mb-1">Skip the manual work</p>
            <p className="text-gray-400 text-sm">BuilderMind AI generates professional estimates in 60 seconds — free to try.</p>
          </div>
          <Link 
            href="/register"
            className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Try Free →
          </Link>
        </div>

        {/* Content */}
        <div className="prose-custom">
          {renderMarkdown(article.content)}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Generate This Estimate in 60 Seconds</h2>
          <p className="text-gray-400 mb-6">BuilderMind AI is free to try. No credit card required.</p>
          <Link 
            href="/register"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
          >
            Start Free Today →
          </Link>
        </div>

        {/* Related Articles */}
        {otherArticles.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-white mb-6">More Estimating Guides</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {otherArticles.map(related => (
                <Link key={related.slug} href={`/blog/${related.slug}`}>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-orange-500/50 transition-all group">
                    <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded mb-2 inline-block">{related.category}</span>
                    <h4 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">{related.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
