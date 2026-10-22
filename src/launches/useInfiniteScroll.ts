import { useEffect, useLayoutEffect, useRef } from 'react'

export function useInfiniteScroll(enabled: boolean, onLoad: () => void, version: number) {
  const ref = useRef<HTMLDivElement>(null)
  const onLoadRef = useRef(onLoad)

  useLayoutEffect(() => {
    onLoadRef.current = onLoad
  }, [onLoad])

  useEffect(() => {
    if (!enabled) return
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadRef.current()
      },
      { rootMargin: '200px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, version])

  return ref
}
