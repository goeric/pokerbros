// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => Promise.resolve({
    get: jest.fn(),
  })),
}))

// Mock revalidatePath and revalidateTag
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Mock next/server. Importing it for real pulls in Web APIs (Request, Response)
// that the jsdom environment doesn't provide, which breaks any suite importing a
// Server Action that schedules background work.
//
// Only `after` is provided. A suite covering a route handler will need
// NextResponse and should mock next/server itself with what it requires.
//
// Callbacks are captured, then drained in afterEach rather than fired and
// forgotten. Fire-and-forget lets a rejection land during an unrelated later
// test — or after the last test in the file, where it vanishes and the suite
// still reports PASS. Draining attributes the failure to the test that scheduled
// the work. Suites that need to control the timing override this locally.
global.__afterCallbacks = []

jest.mock('next/server', () => ({
  after: (callback) => {
    global.__afterCallbacks.push(callback)
  },
}))

afterEach(async () => {
  const pending = global.__afterCallbacks.splice(0)
  for (const callback of pending) {
    await callback()
  }
})
