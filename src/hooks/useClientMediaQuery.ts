"use client"

import { useEffect, useState } from "react"

export function useClientMediaQuery(
  query = "(max-width: 600px)"
): boolean | null {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    const mediaQueryList: MediaQueryList = window.matchMedia(query)

    const handleMatchChange = (event: MediaQueryListEvent): void =>
      setMatches(event.matches)

    mediaQueryList.addEventListener("change", handleMatchChange)

    setMatches(mediaQueryList.matches)

    return (): void =>
      mediaQueryList.removeEventListener("change", handleMatchChange)
  }, [query])

  return matches
}
