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

function getStatusMessage (status, message) {
  if (status === 'no_results') return '未找到匹配的认证雇主'
  if (status === 'too_many_results') return '结果过多，请输入更完整的公司名或完整 13 位 NZBN'
  if (status === 'network_error') return '查询服务暂时不可用，请稍后再试'
  if (status === 'http_error') return message || '查询服务暂时不可用，请稍后再试'
  return null
}

function formatDate (value) {
  if (!value) return '未知'
  return value.includes('T') ? value.split('T')[0] : value
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
  const [selectedIndex, setSelectedIndex] = useState(0)

  const performSearch = useCallback(async (q, pageNum = 1, isLoadMore = false) => {
    if (!q || q.trim().length < 3) {
      setResults([])
      setTotalResults(0)
      setTotalPages(0)
      setSelectedIndex(0)
      return
    }

    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setPage(1)
      setSelectedIndex(0)
    }
    setError(null)

    try {
      const data = await window.services.searchInzEmployers(q, pageNum)
      const statusMessage = getStatusMessage(data.status, data.message)

      if (data.status && data.status !== 'ok') {
        setResults([])
        setTotalPages(0)
        setTotalResults(0)
        setError(statusMessage)
        return
      }

      setTotalPages(data.totalPages || 0)
      setTotalResults(data.totalResults || 0)
      setError(null)

      if (isLoadMore) {
        setResults(prev => [...prev, ...data.results])
      } else {
        setResults(data.results)
      }
    } catch (err) {
      setError(err.message || '查询失败，请稍后再试')
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!results.length) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }

      if (event.key === 'Enter') {
        const item = results[selectedIndex]
        if (item && item.nzbn) {
          window.utools.copyText(item.nzbn)
          window.utools.showNotification(`已复制 NZBN: ${item.nzbn}`)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [results, selectedIndex])

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1
      setPage(nextPage)
      performSearch(query, nextPage, true)
    }
  }

  const copyNzbn = (event, nzbn) => {
    event.stopPropagation()
    if (!nzbn) return
    window.utools.copyText(nzbn)
    window.utools.showNotification(`已复制 NZBN: ${nzbn}`)
  }

  const fillQuery = (value) => {
    setQuery(value)
    window.utools.setSubInputValue(value)
  }

  return (
    <div className='search-container'>
      <div className='search-header'>
        <div>
          <div className='search-title'>认证雇主查询</div>
          <div className='search-subtitle'>支持 Employer Name、Trading Name、NZBN</div>
        </div>
        {query.trim().length > 0 && (
          <div className='search-chip'>{query.trim()}</div>
        )}
      </div>

      {loading && <div className='status'>正在从新西兰移民局官网查询...</div>}
      {error && <div className='status error'>{error}</div>}
      {!loading && !error && results.length === 0 && query.trim().length >= 3 && (
        <div className='status'>未找到匹配的认证雇主</div>
      )}
      {!loading && !error && query.trim().length > 0 && query.trim().length < 3 && (
        <div className='status'>请输入至少 3 个字符进行搜索</div>
      )}
      {!loading && !error && query.trim().length === 0 && (
        <div className='empty-state'>
          <div className='empty-title'>开始查询</div>
          <div className='empty-text'>在上方输入公司名、别名或完整 13 位 NZBN</div>
          <div className='quick-actions'>
            <button onClick={() => fillQuery('SEEKA LIMITED')}>试试 SEEKA LIMITED</button>
            <button onClick={() => fillQuery('9429039617347')}>试试 NZBN</button>
          </div>
        </div>
      )}

      {totalResults > 0 && !loading && (
        <div className='results-info'>
          <span>找到 {totalResults} 个结果</span>
          <span>↑↓ 选择 · Enter 复制 NZBN</span>
        </div>
      )}

      <div className='results-list'>
        {results.map((item, index) => (
          <div
            key={`${item.nzbn}-${index}`}
            className={`result-item ${selectedIndex === index ? 'is-selected' : ''}`}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => {
              if (item.nzbn) {
                window.utools.copyText(item.nzbn)
                window.utools.showNotification(`已复制 NZBN: ${item.nzbn}`)
              }
            }}
          >
            <div className='result-top'>
              <div className='employer-name'>{item.employerName}</div>
              <button className='copy-btn' onClick={(event) => copyNzbn(event, item.nzbn)}>复制 NZBN</button>
            </div>

            {item.tradingName && item.tradingName !== item.employerName && (
              <div className='trading-name'>Trading Name: {item.tradingName}</div>
            )}

            <div className='meta-grid'>
              <div className='meta-card'>
                <div className='meta-label'>NZBN</div>
                <div className='meta-value'>{item.nzbn || '未知'}</div>
              </div>
              <div className='meta-card'>
                <div className='meta-label'>Expiry</div>
                <div className='meta-value'>{formatDate(item.expiryDateOfAccreditation)}</div>
              </div>
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
