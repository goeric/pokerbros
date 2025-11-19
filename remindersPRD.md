# PRD: Automated Game Reminders

## Executive Summary

Add automated email reminders for upcoming poker games to reduce no-shows and keep games top-of-mind. Players with confirmed RSVPs receive 24-hour and 3-hour reminders before game time.

**Status:** Email infrastructure and templates already built. This PRD covers only the automated scheduling and sending of reminders.

**Deployment Constraint:** Vercel Hobby (free) plan allows only **2 cron jobs, each running once per day**. This PRD uses a single daily cron that checks for both 24h and 3h reminders, providing a free-tier compatible solution with acceptable timing precision for monthly poker games.

---

## Goals

1. **Reduce no-shows** - Timely reminders keep games top-of-mind
2. **Zero manual work** - Fully automated, no admin intervention needed
3. **Reliable delivery** - Reminders sent at exact right times
4. **Player-friendly** - Respect notification preferences, avoid spam

---

## What Already Exists

✅ **Email Infrastructure:**
- Resend integration configured
- Email safety filtering (dev/prod environments)
- Email templates with React Email
- ICS calendar generation

✅ **Email Templates:**
- `GameReminder.tsx` - **Already created** at `/emails/templates/GameReminder.tsx`
- Single template handling both 24h and 3h reminders
- Accepts `timing: '24h' | '3h'` prop for different messaging
- Includes personalized greeting, game details, and conditional "bring cash" reminder for 24h emails
- No ICS attachment (players already have calendar event from RSVP confirmation)
- Ready to use - just needs to be wired up to cron system

✅ **Data Model:**
- Games table with date/time
- RSVPs table with confirmed players
- Players table with email addresses and `email_notifications` preference

---

## What Needs to Be Built

### 1. Reminder Tracking System

**Problem:** Need to track which reminders have been sent to avoid duplicates.

**Solution:** Add a `reminder_logs` table to record sent reminders.

```sql
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- '24h' or '3h'
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate sends
  UNIQUE(game_id, player_id, reminder_type)
);

-- Index for quick lookups
CREATE INDEX idx_reminder_logs_game ON reminder_logs(game_id);
CREATE INDEX idx_reminder_logs_sent_at ON reminder_logs(sent_at);
```

**Alternative (Simpler):** Add columns to `rsvps` table:
```sql
ALTER TABLE rsvps
  ADD COLUMN reminder_24h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN reminder_3h_sent BOOLEAN DEFAULT FALSE;
```

**Recommendation:** Use `rsvps` columns for simplicity. Easier to query, less storage, sufficient for this use case.

---

### 2. Cron Job API Route

**File:** `app/api/cron/send-reminders/route.ts`

**Trigger:** Vercel Cron (runs once daily at 10 AM EST)

**Strategy:** Single daily cron checks for both 24h and 3h reminders using wider time windows to account for once-per-day execution.

**Logic:**
1. Query upcoming games needing reminders
2. For each game, find confirmed RSVPs
3. Check if player has notifications enabled
4. Check if reminder already sent (via `rsvps` flags)
5. Send appropriate reminder (24h or 3h)
6. Update `rsvps` flags to mark reminder sent

**Code Structure:**
```typescript
export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();

  // Find games needing 24h reminders (20-28 hours away)
  // Wider window accounts for once-daily execution
  const games24h = await findGamesInWindow(now, 20, 28);
  await sendReminders(games24h, '24h');

  // Find games needing 3h reminders (0-6 hours away)
  // Wider window ensures we catch games starting later today
  const games3h = await findGamesInWindow(now, 0, 6);
  await sendReminders(games3h, '3h');

  return Response.json({ success: true });
}
```

**Time Window Rationale:**
- **24h window (20-28 hours):** Ensures we catch games scheduled for tomorrow, even if they're early morning or late evening
- **3h window (0-6 hours):** Catches games happening today, accounting for the fact we only run once daily
- **Acceptable precision:** For monthly poker games, receiving a reminder at 10 AM vs 2 PM is fine for a 7 PM game

---

### 3. Reminder Query Logic

**Function:** `lib/reminders/find-games-for-reminder.ts`

**Purpose:** Find games within specific time windows that need reminders.

**Logic:**
```typescript
export async function findGamesInWindow(
  now: Date,
  minHours: number,
  maxHours: number
): Promise<GameWithRSVPs[]> {
  const minTime = new Date(now);
  minTime.setHours(minTime.getHours() + minHours);

  const maxTime = new Date(now);
  maxTime.setHours(maxTime.getHours() + maxHours);

  // Query games with:
  // - Status = 'upcoming'
  // - Game datetime between minTime and maxTime
  // - Has confirmed RSVPs

  return await supabase
    .from('games')
    .select(`
      *,
      location:locations(*),
      rsvps(
        *,
        player:players(*)
      )
    `)
    .eq('status', 'upcoming')
    .gte('datetime', minTime.toISOString())
    .lte('datetime', maxTime.toISOString());
}
```

**Note:** Requires creating a `datetime` computed column or using SQL to combine date + time fields.

---

### 4. Reminder Sending Logic

**Function:** `lib/reminders/send-game-reminders.ts`

**Purpose:** Send reminders to all confirmed players for a game.

**Logic:**
```typescript
export async function sendReminders(
  games: GameWithRSVPs[],
  timing: '24h' | '3h'
) {
  for (const game of games) {
    for (const rsvp of game.rsvps) {
      // Skip if already sent this reminder
      const alreadySent = timing === '24h'
        ? rsvp.reminder_24h_sent
        : rsvp.reminder_3h_sent;

      if (alreadySent) continue;

      // Skip if player has notifications disabled
      if (!rsvp.player.email_notifications) continue;

      // Skip if no email address
      if (!rsvp.player.email) continue;

      // Send reminder email
      await sendEmail({
        to: rsvp.player.email,
        subject: timing === '24h'
          ? `Reminder: Poker night tomorrow at ${game.time}`
          : `Game starts soon! See you at ${game.time}`,
        react: GameReminder({
          gameId: game.id,
          playerName: formatPlayerName(rsvp.player),
          date: formatDate(game.date),
          time: formatTime(game.time),
          location: game.location.name,
          address: game.location.address,
          buyIn: game.buyIn,
          notes: game.notes,
          timing,
        }),
      });

      // Mark reminder as sent
      await supabase
        .from('rsvps')
        .update({
          [timing === '24h' ? 'reminder_24h_sent' : 'reminder_3h_sent']: true
        })
        .eq('game_id', game.id)
        .eq('player_id', rsvp.player.id);
    }
  }
}
```

---

### 5. Vercel Cron Configuration

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 14 * * *"
    }
  ]
}
```

**Schedule:** Once daily at 10 AM EST / 2 PM UTC (`0 14 * * *`)
- **Why 10 AM EST:** Strategic timing that catches both "tomorrow evening" games (24h reminder) and "today evening" games (3h reminder)
- **Vercel Hobby Constraint:** Free tier allows only 2 cron jobs, once per day each
- **Wider time windows:** 20-28h for 24h reminders, 0-6h for 3h reminders to account for daily execution

**Alternative Times:**
- `0 13 * * *` - 9 AM EST (earlier for East Coast)
- `0 15 * * *` - 11 AM EST (later for West Coast)
- Choose based on when most of your games typically start

**Environment Variable:**
```env
CRON_SECRET=your-random-secret-here
```

**Security:** Cron endpoint validates `Authorization: Bearer ${CRON_SECRET}` header.

**Vercel Hobby Plan Limitations:**
- Maximum 2 cron jobs total
- Each runs once per day only
- Disabled cron jobs count toward limit
- No hourly or more frequent execution on free tier

---

## Implementation Steps

1. **Database Migration** (5 min)
   - Add `reminder_24h_sent` and `reminder_3h_sent` to `rsvps` table
   - Deploy migration

2. **Create Helper Functions** (30 min)
   - `lib/reminders/find-games-for-reminder.ts`
   - `lib/reminders/send-game-reminders.ts`

3. **Create Cron API Route** (20 min)
   - `app/api/cron/send-reminders/route.ts`
   - Add authorization check
   - Wire up helper functions

4. **Configure Vercel Cron** (10 min)
   - Create `vercel.json` with cron schedule
   - Set `CRON_SECRET` environment variable in Vercel
   - Deploy

5. **Testing** (30 min)
   - Create test game 24 hours out
   - Manually trigger cron endpoint
   - Verify email sent and flag updated
   - Test 3-hour reminder
   - Test duplicate prevention
   - Test notification preferences

**Total Time: ~1.5 hours**

---

## Edge Cases & Handling

### 1. Game Cancelled After Reminder Sent
**Behavior:** Players will still receive reminder for cancelled game.
**Mitigation:** Send cancellation email immediately (already implemented).
**Priority:** Low - cancellations are rare.

### 2. Player Cancels RSVP After Receiving Reminder
**Behavior:** Already received reminder, no action needed.
**Mitigation:** None needed - this is expected.

### 3. Cron Job Fails/Misses a Run
**Behavior:** Wide time windows (20-28h, 0-6h) mean game will still get reminders even if exact timing is off.
**Mitigation:** Vercel cron is reliable, but wide windows provide safety net. Flags prevent duplicate sends on retry.

### 4. Game Time Changes After Reminder Sent
**Behavior:** Player already received reminder for old time.
**Mitigation:** Game update email (already implemented) notifies of change.
**Future Enhancement:** Reset reminder flags when game time changes significantly.

### 5. Player Promoted from Waitlist 2 Hours Before Game
**Behavior:** Will receive 3h reminder but not 24h (already passed).
**Mitigation:** Waitlist promotion email (already implemented) serves as immediate notification.

### 6. Multiple Games Same Day
**Behavior:** Player receives separate reminders for each game.
**Mitigation:** None needed - this is correct behavior.

### 7. Timing Imprecision (Free Tier Constraint)
**Behavior:** Reminders may arrive several hours off from "exactly 24h" or "exactly 3h" before game.
**Example:** Game at 7 PM Friday gets "24h" reminder at 10 AM Thursday (21 hours early) and "3h" reminder at 10 AM Friday (9 hours early).
**Mitigation:** This is acceptable for monthly poker games. The reminder serves its purpose even if timing isn't exact.
**Upgrade Path:** Vercel Pro ($20/month) allows hourly cron jobs for precise timing.

---

## Testing Plan

### Development Testing

1. **Create test game 24 hours in future**
   - RSVP as player with notifications enabled
   - Manually call `/api/cron/send-reminders` with auth header
   - Verify email received
   - Check `rsvps.reminder_24h_sent = true`
   - Call again - verify no duplicate email

2. **Create test game 3 hours in future**
   - Same process for 3-hour reminder
   - Verify `reminder_3h_sent` flag updated

3. **Test notification preferences**
   - RSVP as player with `email_notifications = false`
   - Run cron - verify no email sent
   - Flag should still update to prevent retries

4. **Test edge of time window**
   - Game exactly 24 hours away - should send 24h reminder
   - Game 20 hours away - should send (within 20-28h window)
   - Game 28 hours away - should send (within 20-28h window)
   - Game 30 hours away - should NOT send (outside window)
   - Game 5 hours away - should send 3h reminder (within 0-6h window)
   - Game 7 hours away - should NOT send 3h reminder (outside window)

### Production Testing

1. **Deploy with feature flag**
   - Add `reminders_enabled` to settings table
   - Check flag before sending in cron job
   - Deploy with flag OFF

2. **Manual test in production**
   - Create real game 24h out
   - Enable flag
   - Manually trigger cron via Vercel dashboard
   - Verify emails received

3. **Monitor first automated run**
   - Wait for hourly cron to run
   - Check Vercel logs for execution
   - Check Resend dashboard for sent emails
   - Verify no errors

4. **Enable permanently**
   - Remove feature flag check once validated

---

## Success Metrics

- [ ] 24-hour reminders sent to players with games 20-28 hours away
- [ ] 3-hour reminders sent to players with games 0-6 hours away
- [ ] No duplicate reminders sent for same game/player/timing
- [ ] Reminders respect player notification preferences
- [ ] Cron job completes successfully once per day
- [ ] No emails sent to players with `email_notifications = false`
- [ ] Timing precision acceptable for monthly poker games (reminder serves purpose even if not exact)

---

## Monitoring & Observability

### Logging
Add structured logging to cron job:
```typescript
logger.info('[Reminders] Cron job started');
logger.info('[Reminders] Found X games needing 24h reminders');
logger.info('[Reminders] Sent 24h reminder to player@email.com for game ABC');
logger.info('[Reminders] Skipped reminder for player@email.com (already sent)');
logger.error('[Reminders] Failed to send reminder', { error, gameId, playerId });
```

### Vercel Dashboard
- Monitor cron execution logs
- Check for failures/timeouts
- Review execution duration

### Resend Dashboard
- Track email delivery rates
- Monitor bounce/spam rates
- Check daily sending volume

---

## Future Enhancements

**Free Tier Improvements:**
- [ ] GitHub Actions cron for hourly execution (free alternative to Vercel Pro)
- [ ] Client-side "remind me" button that triggers instant email

**Paid Tier Features (Vercel Pro $20/month):**
- [ ] Hourly cron execution for precise 24h/3h timing
- [ ] Additional reminder times (1h before, 12h before)
- [ ] More granular reminder preferences

**Phase 2+:**
- [ ] Customizable reminder times per player (e.g., some want 1-hour, some want 24h)
- [ ] "Running late" quick response link in 3h reminder
- [ ] Digest email: "You have 3 games this week" on Mondays
- [ ] SMS reminders via Twilio for critical no-shows
- [ ] Push notifications for mobile PWA users
- [ ] Reminder email open tracking (Resend webhooks)

---

## Security Considerations

### Cron Endpoint Protection
- Bearer token authorization required
- Token stored in environment variable
- Returns 401 if unauthorized

### Email Safety
- Existing safety filter applies (superadmin-only in dev)
- Respects player `email_notifications` preference
- No PII logged in public logs

### Rate Limiting
- Vercel cron runs max once per hour
- Resend free tier: 100 emails/day (sufficient for current scale)
- Monitor if approaching limits

---

## Open Questions

1. **Should we send reminders for games that started but status still "upcoming"?**
   - **Answer:** No - add check to skip games where datetime has passed

2. **What if game is marked "in_progress" before 3h reminder window?**
   - **Answer:** Only send reminders for `status = 'upcoming'` games

3. **Should we reset reminder flags if game time changes significantly?**
   - **Answer:** Not in MVP - game update email is sufficient notification

4. **Should waitlist players receive reminders?**
   - **Answer:** No - only confirmed RSVPs receive reminders

---

## Dependencies

- ✅ React Email templates (`GameReminder.tsx`)
- ✅ Email sending infrastructure (`send-email.ts`)
- ✅ Resend API configured
- ✅ Location management (for addresses in emails)
- ⬜ Database migration for reminder flags
- ⬜ Vercel Cron configuration
- ⬜ `CRON_SECRET` environment variable

---

## Approval & Next Steps

**Ready to implement:** Yes

**Estimated completion:** 1.5 hours

**Deployment strategy:**
1. Deploy database migration
2. Deploy cron endpoint code
3. Test manually in production
4. Configure Vercel Cron
5. Monitor first few automated runs

---

## Appendix: Vercel Cron Tier Comparison

| Feature | Hobby (Free) | Pro ($20/month) |
|---------|--------------|-----------------|
| Max cron jobs | 2 | 40 |
| Execution frequency | Once per day | Unlimited (can be hourly or more) |
| Reminder precision | ±4-9 hours | ±30 minutes (hourly cron) |
| Use case | Monthly poker games | Frequent events, precise timing needed |
| Cost | $0 | $240/year |

**Recommendation for PokerBros:**
- **Start with Hobby plan** - Monthly poker games don't require precise timing
- **Consider Pro if:** You host weekly games, need exact "3 hours before" timing, or want additional features like 1h reminders

---

**End of PRD**
