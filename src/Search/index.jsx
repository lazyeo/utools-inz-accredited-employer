import { useState, useEffect, useCallback } from 'react'
import './index.css'

function getInitialQuery (enterAction) {
  if (!enterAction) return ''

  if (typeof enterAction.payload === 'string') return enterAction.payload
  if (typeof enterAction.text === 'string') return enterAction.text
  if (typeof enterAction.value === 'string') return enterAction.value

  if (Array.isArray(enterAction.payload) && enterAction.payload.length > 0) {
    const first = enterAction.payload[0]
    if (typeof first === 'string') return first
    if (first && typeof first.text === 'string') return first.text
  }

  return ''
}

function normalizeErrorMessage (message) {
  if (!message) return '查询失败，请稍后再试'
  if (message.startsWith('HTTP_')) return '查询服务暂时不可用，请稍后再试'
  if (message.includes('fetch')) return '查询服务暂时不可用，请稍后再试'
  return message
}

export default function Search ({ enterAction }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalResults, setTotalResults] = useState(0)

  const performSearch = useCallback(async (q, pageNum = 1, isLoadMore = false) => {
    if (!q || q.trim().length < 3) {
      setResults([])
      setTotalResults(0)
      setTotalPages(0)
      return
    }

    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setPage(1)
    }
    setError(null)

    try {
      const data = await window.services.searchInzEmployers(q, pageNum)

      setTotalPages(data.totalPages || 0)
      setTotalResults(data.totalResults || 0)

      if (isLoadMore) {
        setResults(prev => [...prev, ...data.results])
      } else {
        setResults(data.results)
      }
    } catch (err) {
      setError(normalizeErrorMessage(err.message))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    const initialQuery = getInitialQuery(enterAction)
    if (initialQuery) {
      setQuery(initialQuery)
      window.utools.setSubInputValue(initialQuery)
    }
  }, [enterAction])

  useEffect(() => {
    window.utools.setSubInput(({ text }) => {
      setQuery(text)
    }, '输入公司名、Trading Name 或 13位NZBN (至少3个字符)...')

    const initialQuery = getInitialQuery(enterAction)
    if (initialQuery) {
      window.utools.setSubInputValue(initialQuery)
    }

    return () => {
      window.utools.removeSubInput()
    }
  }, [enterAction])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, 1, false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1
      setPage(nextPage)
      performSearch(query, nextPage, true)
    }
  }

  return (
    <div className='search-container'>
      {loading && <div className='status'>正在从新西兰移民局官网查询...</div>}
      {error && <div className='status error'>查询出错: {error}</div>}
      {!loading && !error && results.length === 0 && query.trim().length >= 3 && (
        <div className='status'>未找到匹配的认证雇主</div>
      )}
      {!loading && !error && query.trim().length > 0 && query.trim().length < 3 && (
        <div className='status'>请输入至少 3 个字符进行搜索</div>
      )}
      {!loading && !error && query.trim().length === 0 && (
        <div className='status'>可以直接输入关键词；如果想更顺手，可以在 uTools 里给“查询认证雇主”配置全局快捷键</div>
      )}

      {totalResults > 0 && !loading && (
        <div className='results-info'>找到 {totalResults} 个结果</div>
      )}

      <div className='results-list'>
        {results.map((item, index) => (
          <div
            key={`${item.nzbn}-${index}`}
            className='result-item'
            onClick={() => {
              if (item.nzbn) {
                window.utools.copyText(item.nzbn)
                window.utools.showNotification(`已复制 NZBN: ${item.nzbn}`)
              }
            }}
          >
            <div className='employer-name'>{item.employerName}</div>
            {item.tradingName && item.tradingName !== item.employerName && (
              <div className='trading-name'>别名: {item.tradingName}</div>
            )}
            <div className='meta'>
              <span className='nzbn'>NZBN: {item.nzbn}</span>
              <span className='expiry'>认证有效期至: {item.expiryDateOfAccreditation ? item.expiryDateOfAccreditation.split('T')[0] : '未知'}</span>
            </div>
          </div>
        ))}

        {page < totalPages && (
          <div className='load-more' onClick={loadMore}>
            {loadingMore ? '正在加载...' : '加载更多结果'}
          </div>
        )}
      </div>
    </div>
  )
}
