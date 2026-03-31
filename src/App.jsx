import { useEffect, useState } from 'react'
import Search from './Search'

export default function App () {
  const [enterAction, setEnterAction] = useState({})
  const [route, setRoute] = useState('')

  useEffect(() => {
    window.utools.onPluginEnter((action) => {
      setRoute(action.code)
      setEnterAction(action)
    })
    window.utools.onPluginOut(() => {
      setRoute('')
    })
  }, [])

  if (route === 'inz-search' || route === 'inz-search-over') {
    return <Search enterAction={enterAction} />
  }

  return false
}
