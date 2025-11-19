# Testing PRD: PokerBros Unit & Integration Testing

## Overview

This document outlines the comprehensive testing strategy for PokerBros, a poker game management application. Testing focuses on business-critical functionality, security, and user experience.

**Testing Philosophy**: Prioritize tests that protect financial integrity, seat management, and security. Test business logic thoroughly; UI interactions sparingly.

## Test Infrastructure

### Technology Stack

- **Test Framework**: Jest (30.2.0)
- **React Testing**: @testing-library/react (16.3.0)
- **Test Environment**: jsdom (30.2.0)
- **Test Runner**: npm scripts

### Commands

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:p0         # Run P0 critical tests only
npm run test:coverage   # Run tests with coverage report
```

### Pre-Deployment Requirements

**MANDATORY checks before production deployment**:
1. ✅ `npm run test:p0` - All P0 critical tests pass
2. ✅ `npm test` - All tests pass
3. ✅ `npx tsc --noEmit` - No TypeScript errors
4. ✅ `npm run build` - Build succeeds

**Vercel Integration**: Tests run automatically via `vercel.json` build command. Failed tests block deployment.

## Test Priorities

### P0: Critical (IMPLEMENTED - 34 tests)

**Must pass before any deployment. Failures indicate data corruption or security risks.**

Tests located in: `__tests__/p0-critical/`

#### P0.1: Cash-out Validation (12 tests)
**File**: `cashout-validation.test.ts`

**Why Critical**: Prevents financial tracking errors that corrupt player statistics.

**Test Coverage**:
- ✅ Total validation (2 tests)
  - Rejects when total in ≠ total out (beyond 0.01 tolerance)
  - Accepts when difference within 0.01 tolerance

- ✅ Profit calculations (4 tests)
  - Calculates profit correctly for winner (single buy-in)
  - Calculates profit correctly for winner (multiple rebuys)
  - Calculates profit correctly for loser
  - Handles zero cash-out (busted player)

- ✅ Player stats updates (5 tests)
  - Updates player biggestWin stat when new win exceeds previous
  - Does not update biggestWin when new win is lower
  - Updates player biggestLoss stat when new loss exceeds previous
  - Increments gamesPlayed counter
  - Updates totalIn and totalOut correctly

- ✅ Game status (1 test)
  - Marks game as completed after successful validation

**Key Patterns**:
- Per-player value tracking: `Record<string, number>`
- UUID test data (matches validation schemas)
- Floating point tolerance: 0.01 for currency

#### P0.2: RSVP Auto-Promotion (8 tests)
**File**: `rsvp-autopromotion.test.ts`

**Why Critical**: Ensures waitlist players are automatically promoted when seats open. Lost promotions = angry players.

**Test Coverage**:
- ✅ Basic promotion flow (3 tests)
  - Promotes first waitlist player when confirmed player cancels
  - Does not promote if no waitlist players exist
  - Does not promote when waitlist player cancels

- ✅ Promotion notifications (3 tests)
  - Sends waitlist promotion email to promoted player
  - Includes calendar invite in promotion email
  - Respects notification preferences for promotion email

- ✅ Edge cases (2 tests)
  - Handles promotion when promoted player has no email
  - Handles database promotion failure gracefully

**Key Patterns**:
- Tests RPC call to `promote_next_waitlist_player` DB function
- Validates email sending with ICS calendar attachments
- Mocks: sendEmail, shouldSendNotification, generateGameIcs

#### P0.3: RSVP Seat Limit (7 tests)
**File**: `rsvp-seat-limit.test.ts`

**Why Critical**: Enforces 8-seat game limit. Overcrowding breaks game mechanics.

**Test Coverage**:
- ✅ Confirmed seat allocation (3 tests)
  - Assigns confirmed status when fewer than 8 players
  - Assigns confirmed status for exactly 8th player
  - Assigns waitlist status for 9th player

- ✅ Waitlist position assignment (2 tests)
  - Assigns sequential waitlist positions
  - Assigns position 1 for first waitlist player

- ✅ Edge cases (2 tests)
  - Does not send confirmation email to waitlisted players
  - Correctly counts only confirmed RSVPs when determining status

**Key Patterns**:
- Tests status assignment logic (confirmed vs waitlist)
- Validates waitlistPosition calculation
- Ensures proper RSVP filtering

#### P0.4: Authorization (6 tests)
**File**: `authorization.test.ts`

**Why Critical**: Prevents unauthorized data access and modification. Security vulnerability if broken.

**Test Coverage**:
- ✅ Unauthenticated access (2 tests)
  - Rejects RSVP from unauthenticated user
  - Rejects RSVP cancellation from unauthenticated user

- ✅ Non-admin user restrictions (4 tests)
  - Allows users to RSVP for themselves only
  - Rejects users RSVPing for other players
  - Allows users to cancel only their own RSVP
  - Rejects users canceling other players' RSVPs

- ✅ Admin access (1 test)
  - Allows admins to delete games

**Key Patterns**:
- Session-based authentication testing (auth.getSession)
- Email matching validation for non-admin users
- requireAdmin checks for privileged actions

---

### P1: Important (NOT YET IMPLEMENTED - Estimated 15 tests)

**Should be implemented before feature launch. Failures indicate feature bugs but not data corruption.**

Tests should be located in: `__tests__/p1-important/`

#### P1.1: Live Game Management (6 tests)
**File**: `live-game-management.test.ts`

**Why Important**: Core gameplay functionality. Bugs affect user experience but don't corrupt data.

**Proposed Test Coverage**:
- Adding rebuys
  - Admin can add rebuy to any player during live game
  - Rebuy amount added to player's buyIns array
  - Non-admin cannot add rebuys

- Removing rebuys
  - Admin can remove last rebuy (error correction)
  - Cannot remove initial buy-in (minimum 1 buy-in per player)
  - Non-admin cannot remove rebuys

**Implementation Notes**:
- Test Server Actions in `app/game/[id]/live/actions.ts`
- Mock Supabase array operations (PostgreSQL array append/remove)
- Verify revalidatePath called after mutations

#### P1.2: Game Status Transitions (5 tests)
**File**: `game-status-transitions.test.ts`

**Why Important**: Ensures game lifecycle works correctly. Bugs could trap games in wrong state.

**Proposed Test Coverage**:
- Status workflow
  - Game starts as 'upcoming'
  - Admin can transition 'upcoming' → 'in_progress' (startGame)
  - Cannot transition backwards ('in_progress' → 'upcoming')
  - Finalization transitions 'in_progress' → 'completed'
  - 'completed' games are read-only

**Implementation Notes**:
- Test `startGame` Server Action
- Verify status updates and path revalidation
- Test that completed games reject mutations

#### P1.3: Buy-in Array Management (4 tests)
**File**: `buyin-array-management.test.ts`

**Why Important**: Buy-in integrity directly affects profit calculations.

**Proposed Test Coverage**:
- Array operations
  - Adding buy-in appends to array correctly
  - Multiple buy-ins stored in order
  - Buy-in sum calculation accurate
  - Cannot add negative buy-ins (validation)

**Implementation Notes**:
- Focus on data integrity, not UI
- Test PostgreSQL array column operations
- Verify total buy-in calculation matches sum(buyIns)

---

### P2: Nice-to-Have (NOT YET IMPLEMENTED - Estimated 12 tests)

**Should be implemented for polish. Failures indicate edge cases or UI bugs.**

Tests should be located in: `__tests__/p2-nice-to-have/`

#### P2.1: Player Statistics Aggregation (5 tests)
**File**: `player-statistics.test.ts`

**Why Nice-to-Have**: Stats are read-only display. Bugs don't affect gameplay.

**Proposed Test Coverage**:
- Aggregate calculations
  - Total profit/loss calculation (totalOut - totalIn)
  - Win rate calculation (games with profit > 0 / gamesPlayed)
  - Average buy-in calculation
  - Biggest win/loss records accuracy
  - Games played count accuracy

**Implementation Notes**:
- Test utility functions in `/lib/utils.ts` or dedicated stats module
- Focus on edge cases (division by zero, negative values)
- No need to test UI rendering, just calculation logic

#### P2.2: Leaderboard Ranking (4 tests)
**File**: `leaderboard-ranking.test.ts`

**Why Nice-to-Have**: Leaderboard is informational. Incorrect ranking is low-impact.

**Proposed Test Coverage**:
- Sorting logic
  - Players sorted by total profit (descending)
  - Tie-breaking logic (if implemented)
  - Filtering by date range (if implemented)
  - Minimum games played threshold (if implemented)

**Implementation Notes**:
- Test sorting/filtering functions
- Use sample player data with known rankings
- Verify edge cases (tied players, zero games)

#### P2.3: Date/Time Utilities (3 tests)
**File**: `date-time-utils.test.ts`

**Why Nice-to-Have**: Utility functions with clear inputs/outputs. Easy to test.

**Proposed Test Coverage**:
- Formatting functions
  - formatDate parses as local time (not UTC)
  - formatTime converts 24h → 12h correctly
  - isToday handles edge cases (midnight boundary)

**Implementation Notes**:
- Test functions in `/lib/utils.ts`
- Mock Date.now() for consistent test results
- Focus on timezone handling (critical bug pattern)

---

### P3: Optional (NOT YET IMPLEMENTED - Estimated 10 tests)

**Implement if time allows. Low priority.**

Tests should be located in: `__tests__/p3-optional/`

#### P3.1: Email Template Rendering (4 tests)
**File**: `email-templates.test.ts`

**Why Optional**: Email rendering bugs are visible but non-critical. Manual QA is sufficient.

**Proposed Test Coverage**:
- Template rendering
  - RsvpConfirmation renders with game details
  - WaitlistPromotion renders with promotion message
  - GameCancelled renders with cancellation notice
  - All templates handle missing optional data gracefully

**Implementation Notes**:
- Test React Email components in `/emails/templates/`
- Use @testing-library/react to verify rendered output
- Focus on data handling, not visual styling

#### P3.2: Calendar Invite Generation (3 tests)
**File**: `calendar-invite-generation.test.ts`

**Why Optional**: ICS generation is handled by `ics` library. Minimal custom logic.

**Proposed Test Coverage**:
- ICS generation
  - generateGameIcs creates valid ICS format
  - UID format matches expected pattern (game-{gameId}@pokerbros.xyz)
  - SEQUENCE increments for updates

**Implementation Notes**:
- Test `generateGameIcs` function in `/lib/email/generate-ics.ts`
- Verify ICS string format matches spec
- Mock ics.createEvent for unit tests

#### P3.3: Email Notification Preferences (3 tests)
**File**: `notification-preferences.test.ts`

**Why Optional**: Notification preferences are user-facing settings. Low complexity.

**Proposed Test Coverage**:
- Preference checking
  - shouldSendNotification respects user preferences
  - email_superadmin_only flag works correctly
  - Default preferences when user has no settings

**Implementation Notes**:
- Test `shouldSendNotification` in `/lib/email/check-preferences.ts`
- Mock settings table queries
- Verify preference logic (AND/OR conditions)

---

## E2E Testing (Future Consideration)

**Status**: Not implemented. Manual QA currently sufficient for hobby project.

**If implementing E2E, use**:
- Playwright or Cypress
- Test critical user flows only (not all permutations)

**Priority Flows**:
1. **Admin: Create Game Flow**
   - Login → Admin Panel → Create Game → Verify on homepage

2. **Player: RSVP Flow**
   - View game → RSVP → Receive confirmation email → See on confirmed list

3. **Full Game Lifecycle**
   - Create game → RSVPs → Start game → Add rebuys → Cash out → View results

**Note**: E2E tests are expensive to maintain. Only implement if critical bugs escape to production regularly.

---

## Testing Best Practices

### 1. Always Use Proper UUIDs
Test data must match validation schemas:
```typescript
const PLAYER_ID = '123e4567-e89b-12d3-a456-426614174001' // ✅ Valid UUID
const PLAYER_ID = 'player-1' // ❌ Fails validation
```

### 2. Per-Player Value Tracking
When testing operations on multiple players, use maps:
```typescript
const profits: Record<string, number> = {}
// Capture profit for each player separately
```

### 3. Mock Supabase Chains Properly
Queries chain multiple methods:
```typescript
mockSupabase.from('rsvps')
  .select('*')          // Returns this
  .eq('gameId', id)     // Returns object with eq()
  .eq('playerId', pid)  // Returns object with single()
  .single()             // Resolves with data
```

Mock accordingly:
```typescript
eq: jest.fn(() => ({
  eq: jest.fn(() => ({
    single: jest.fn().mockResolvedValue({ data, error: null })
  }))
}))
```

### 4. Test Error Paths
Always test both success and failure scenarios:
```typescript
// Success case
const result = await finalizeGameResults(validData)
expect(result).toEqual({ success: true })

// Error case
const result = await finalizeGameResults(invalidData)
expect(result.error).toContain('Totals don\'t match')
```

### 5. Mock External Dependencies
Never make real calls in tests:
- ✅ Mock Supabase client
- ✅ Mock email sending (sendEmail, generateGameIcs)
- ✅ Mock auth helpers (requireAdmin, createSupabaseServerClient)
- ❌ Do NOT make real database calls
- ❌ Do NOT send real emails

### 6. Financial Precision
Use tolerance for currency comparisons:
```typescript
expect(calculatedTotal).toBeCloseTo(expectedTotal, 2) // 2 decimal places
// Or explicitly check tolerance
expect(Math.abs(calculatedTotal - expectedTotal)).toBeLessThan(0.01)
```

### 7. Test Naming Convention
Use descriptive test names that explain the scenario:
```typescript
✅ test('assigns waitlist status for 9th player')
✅ test('does not promote when waitlist player cancels')
❌ test('test RSVP')
❌ test('check status')
```

### 8. Organize Tests by Feature
Group related tests in describe blocks:
```typescript
describe('P0.3: RSVP Seat Limit', () => {
  describe('Confirmed seat allocation', () => {
    test('assigns confirmed status when fewer than 8 players')
    test('assigns waitlist status for 9th player')
  })

  describe('Edge cases', () => {
    test('does not send confirmation email to waitlisted players')
  })
})
```

---

## Coverage Goals

**Target Coverage** (when all test suites implemented):
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

**Current Coverage** (P0 only):
- Focus is on critical business logic, not coverage percentage
- Run `npm run test:coverage` to see current metrics

**Coverage Exclusions**:
- UI components (low ROI for hobby project)
- Utility functions with trivial logic
- Type definitions and constants
- Third-party library mocks

---

## Test Maintenance

### When to Update Tests

**Update tests when**:
- ✅ Business logic changes (RSVP rules, profit calculations)
- ✅ API contracts change (Server Action signatures)
- ✅ Validation rules change (schema updates)
- ✅ Security requirements change (auth rules)

**Do NOT update tests for**:
- ❌ UI styling changes
- ❌ Component refactoring (if behavior unchanged)
- ❌ Performance optimizations (if output identical)

### Test Data Management

**Use constants for test data**:
```typescript
const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
const PLAYER_1_ID = '123e4567-e89b-12d3-a456-426614174001'
```

**Benefits**:
- Easy to find/replace if schema changes
- Clear data relationships
- Reusable across tests

### Mock Maintenance

**Centralize common mocks**:
- Consider creating shared mock factories for Supabase client
- Keep auth helper mocks consistent across test files
- Document mock patterns in this PRD

---

## Success Metrics

### Test Reliability
- **Zero flaky tests**: Tests pass consistently on every run
- **Fast feedback**: P0 tests complete in < 5 seconds
- **Clear failures**: Error messages pinpoint exact failure

### Deployment Safety
- **Pre-deployment check**: Tests run automatically before every Vercel deployment
- **Block bad deploys**: Failed tests prevent deployment to production
- **Catch regressions**: New bugs caught before user impact

### Developer Experience
- **Easy to run**: Single command (`npm test`)
- **Easy to debug**: Clear test names and error messages
- **Easy to maintain**: Tests don't break on minor refactors

---

## Appendix: Test Infrastructure Details

### Mock Files

**Location**: `__mocks__/`

- `ics.js`: Mocks ICS calendar generation library
  ```javascript
  module.exports = {
    createEvent: jest.fn(() => ({ error: null, value: 'MOCK_ICS_CONTENT' }))
  }
  ```

- `nanoid.js`: Mocks unique ID generation
  ```javascript
  module.exports = {
    nanoid: jest.fn(() => 'mock-nanoid-12345')
  }
  ```

### Jest Configuration

**File**: `jest.config.js`

Key settings:
- `testEnvironment: 'jsdom'` - For React component testing
- `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }` - Path aliases
- `transformIgnorePatterns: ['node_modules/(?!(nanoid|ics)/)']` - Transform ESM modules

### TypeScript Integration

Jest uses `ts-node` for TypeScript test files:
- No need to compile tests separately
- Type checking in tests via IDE
- Use `@types/jest` for type definitions

---

## Questions & Decisions

### Why no E2E tests?
**Decision**: Manual QA sufficient for hobby project. E2E tests expensive to maintain.
**Reconsider if**: Critical bugs regularly escape to production.

### Why no load testing?
**Decision**: Small hobby project with <50 concurrent users. Not needed.
**Reconsider if**: User base grows significantly.

### Why focus on P0 tests first?
**Decision**: Maximum ROI. P0 tests catch bugs that corrupt data or break security.
**Benefit**: Build confidence in critical paths before expanding coverage.

### Why not test UI components?
**Decision**: UI changes frequently. Tests would require constant updates.
**Alternative**: Visual regression testing (Chromatic, Percy) if budget allows.

---

## Changelog

**2025-01-19**: Initial PRD created
- P0 test suites implemented (34 tests)
- P1, P2, P3 test suites planned
- E2E testing evaluated (deferred)
- Vercel integration configured
