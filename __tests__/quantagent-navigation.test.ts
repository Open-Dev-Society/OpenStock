import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Sidebar from "@/components/shell/Sidebar"
import TabBar from "@/components/shell/TabBar"

const navigation = vi.hoisted(() => ({ pathname: "/research" }))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock("@/components/SearchCommand", () => ({ openSearch: vi.fn() }))
vi.mock("@/lib/actions/auth.actions", () => ({ signOut: vi.fn() }))

describe("research navigation in the app shell", () => {
  beforeEach(() => { navigation.pathname = "/research" })

  it.each(["/research", "/research/private-run-123"])(
    "keeps Research reachable and active at %s",
    (pathname) => {
      navigation.pathname = pathname
      const html = renderToStaticMarkup(createElement(Sidebar, {
        user: { id: "test-user", name: "Test User", email: "test@example.test" },
        watchlist: [],
      }))

      expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/research"/)
      expect(html).toContain("Research")
      expect(html).toContain('href="/dashboard"')
      expect(html).toContain('href="/watchlist"')
    },
  )

  it("uses the Research tab for a run without copying its ID into the tab", () => {
    navigation.pathname = "/research/private-run-123"
    const html = renderToStaticMarkup(createElement(TabBar, { onMenu: vi.fn() }))

    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/research"/)
    expect(html).toContain('aria-label="Close Research"')
    expect(html).not.toContain("private-run-123")
  })

  it("does not treat a similarly named path as a research run", () => {
    navigation.pathname = "/research-other"
    const html = renderToStaticMarkup(createElement(TabBar, { onMenu: vi.fn() }))

    expect(html).not.toContain('aria-current="page"')
    expect(html).not.toContain('href="/research"')
  })
})
