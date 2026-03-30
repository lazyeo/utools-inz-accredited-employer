import { useState, useEffect, useCallback } from 'react'
import './index.css'

export default function Search () {
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
      const formData = new URLSearchParams()
      formData.append('query', q.trim())
      formData.append('collection', '2')
      formData.append('page', pageNum.toString())

      const response = await fetch('https://www.immigration.govt.nz/list-api/getAPIResults/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      })

      if (!response.ok) throw new Error('网络请求失败')
      const data = await response.json()
      
      setTotalPages(data.totalPages || 0)
      setTotalResults(data.totalResults || 0)

      let items = []
      try {
        items = JSON.parse(data.results || '[]')
      } catch (e) {
        items = []
      }

      const newResults = items.map(item => {
        const fields = {}
        if (item.field_schema && item.field_schema.raw) {
          item.field_schema.raw.forEach(f => {
            fields[f.APIColumn] = f.Value
          })
        }
        return fields
      })

      if (isLoadMore) {
        setResults(prev => [...prev, ...newResults])
      } else {
        setResults(newResults)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    // 监听子输入框的变化
    window.utools.setSubInput(({ text }) => {
      setQuery(text)
    }, '输入公司名、Trading Name 或 13位NZBN (至少3个字符)...')

    return () => {
      window.utools.removeSubInput()
    }
  }, [])

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
        <div className='status'>在上方搜索框输入关键词开始查询</div>
      )}
      
      {totalResults > 0 && !loading && (
        <div className='results-info'>找到 {totalResults} 个结果</div>
      )}

      <div className='results-list'>
        {results.map((item, index) => (
          <div key={`${item.nzbn}-${index}`} className='result-item' onClick={() => {
            if (item.nzbn) {
              window.utools.copyText(item.nzbn)
              window.utools.showNotification(`已复制 NZBN: ${item.nzbn}`)
            }
          }}>
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
