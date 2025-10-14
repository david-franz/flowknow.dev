import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'flowknow:color-mode'

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored) {
    return stored === 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useDark(): [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(getInitialDark)

  useEffect(() => {
    if (typeof window === 'undefined') return
    document.documentElement.classList.toggle('dark', dark)
    document.body.classList.toggle('dark', dark)
    window.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  }, [dark])

  const toggle = useCallback(() => {
    setDark((value) => !value)
  }, [])

  return [dark, toggle]
}