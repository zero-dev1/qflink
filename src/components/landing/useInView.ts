import { useState, useEffect, useRef, type RefObject } from 'react'

export function useInView<T extends HTMLElement>(threshold = 0.1): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
        }
      },
      { threshold }
    )
    
    observer.observe(ref.current)
    
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}
