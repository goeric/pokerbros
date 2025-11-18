# PRD: Email Notifications & Calendar Events

## Executive Summary

Add email notifications with calendar invites to improve player engagement and reduce no-shows. Players receive automated emails for game announcements, RSVP confirmations, reminders, and updates with .ics calendar events that integrate with their calendar apps.

**Prerequisite:** Location management system to replace freeform venue strings with structured location data (name + address).

---

## Goals

1. **Reduce no-shows** - Calendar invites and reminders keep games top-of-mind
2. **Improve RSVP rates** - Email notifications prompt players to RSVP quickly
3. **Enhance communication** - Keep players informed of game changes automatically
4. **Professional experience** - Calendar integration makes this feel like a real service

---

## Phase 0: Location Management (Prerequisite)

### Overview
Replace the freeform `venue` string field with a structured location system that stores addresses for calendar invites.

### Database Schema

```sql
-- New locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,  -- e.g., "Eric's House"
  address TEXT NOT NULL,  -- e.g., "123 Main St, San Francisco, CA 94102"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add location reference to games table
ALTER TABLE games ADD COLUMN location_id UUID REFERENCES locations(id);

-- Migrate existing venue data
-- (Create locations from unique venue strings, link games)
```

### Migration Strategy

1. **Extract unique venues** from existing games
2. **Create location records** for each unique venue
3. **Link games to locations** via `location_id`
4. **Keep `venue` field** temporarily for backwards compatibility
5. **Deprecate `venue` field** after email system is stable

### Admin UI Requirements

**Location Management Page** (`/admin/locations`)
- List all locations (name + address)
- Add new location button
- Edit/delete existing locations
- Validation: Both name and address required

**Game Creation/Edit**
- Replace venue text input with location dropdown
- "Add new location" quick action (modal)
- Show selected location's address as preview

### User Stories

```
As an admin, I want to manage a list of locations
So that I can quickly select venues when creating games

As an admin, I want to see the full address when selecting a location
So that I know exactly where the game will be

As a player, I want the game address in my calendar invite
So that I can navigate directly to the game
```

---

## Phase 1: Email Notifications

### Database Schema

```sql
-- Add email notification preferences to players
ALTER TABLE players
  ADD COLUMN email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN email TEXT;  -- If not already present

-- Make email required going forward (in application logic, not DB constraint)
-- Existing players without emails won't receive notifications

-- Email log table (optional, for debugging)
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  game_id UUID REFERENCES games(id),
  email_type TEXT NOT NULL,  -- 'game_created', 'rsvp_confirmation', etc.
  sent_at TIMESTAMP DEFAULT NOW(),
  resend_id TEXT,  -- Resend email ID for tracking
  error TEXT  -- If failed
);
```

### Email Types & Triggers

#### 1. **Game Created**
**Trigger:** Admin creates a new game
**Recipients:** All players with `email_notifications = true` and valid email
**Content:**
- Subject: `New Poker Night: [Day], [Date] at [Time]`
- Body: Game details, RSVP call-to-action
- CTA: "RSVP Now" button → link to game detail page
- **NO calendar invite** (they haven't RSVP'd yet)

**Example:**
```
Subject: New Poker Night: Friday, Jan 17 at 7:00 PM

A new poker night has been scheduled!

📅 Friday, January 17, 2025
🕖 7:00 PM
📍 Eric's House
💵 $100 buy-in

Seats are limited - RSVP now to secure your spot!

[RSVP Now Button] → pokerbros.xyz/game/[id]
```

#### 2. **RSVP Confirmation**
**Trigger:** Player RSVPs (or admin RSVPs for them)
**Recipients:** The RSVP'd player
**Content:**
- Subject: `You're confirmed for Poker Night - [Date]`
- Body: Game details, confirmation message
- **Calendar invite attached** (.ics inline)
- Link to cancel RSVP

**Example:**
```
Subject: You're confirmed for Poker Night - Jan 17

You're all set for poker night! 🎴

📅 Friday, January 17, 2025
🕖 7:00 PM
📍 Eric's House (123 Main St, San Francisco, CA 94102)
💵 $100 buy-in

Your spot is confirmed. We've added this to your calendar.

Need to cancel? [Cancel my RSVP]

See you at the felt!
```

#### 3. **Waitlist Promotion**
**Trigger:** Player moves from waitlist to confirmed (spot opens up)
**Recipients:** Promoted player
**Content:**
- Subject: `Spot opened! Confirm your RSVP for [Date]`
- Body: Notification of promotion, urgency message
- CTA: "Confirm my spot" button → confirms RSVP
- **NO calendar invite yet** (they need to confirm first)

**Example:**
```
Subject: Spot opened! Confirm your RSVP for Jan 17

Good news! A spot just opened up for poker night.

You've been promoted from the waitlist. Click below to confirm your spot before someone else takes it!

📅 Friday, January 17, 2025
🕖 7:00 PM
📍 Eric's House
💵 $100 buy-in

[Confirm My Spot] → pokerbros.xyz/game/[id]/confirm-waitlist

This spot won't be held - first come, first served!
```

#### 4. **RSVP Cancellation**
**Trigger:** Player cancels their RSVP
**Recipients:** The player who cancelled
**Content:**
- Subject: `You've cancelled your RSVP - [Date]`
- Body: Confirmation of cancellation
- **Calendar cancellation** (.ics with STATUS:CANCELLED)
- Option to re-RSVP

**Example:**
```
Subject: You've cancelled your RSVP - Jan 17

Your spot has been released and the event has been removed from your calendar.

If you change your mind, you can RSVP again:
[RSVP Again] → pokerbros.xyz/game/[id]
```

#### 5. **Game Updated**
**Trigger:** Admin changes date, time, or location
**Recipients:** All confirmed RSVPs
**Content:**
- Subject: `Game Update: [Date] poker night has changed`
- Body: What changed, new details
- **Updated calendar invite** (same event, updated details via UID)

**Example:**
```
Subject: Game Update: Jan 17 poker night has changed

The game details have been updated:

🔄 Time changed: 7:00 PM → 8:00 PM

Updated details:
📅 Friday, January 17, 2025
🕖 8:00 PM (NEW)
📍 Eric's House
💵 $100 buy-in

Your calendar has been updated automatically.

[View Game Details]
```

#### 6. **Game Cancelled**
**Trigger:** Admin deletes/cancels game
**Recipients:** All confirmed RSVPs
**Content:**
- Subject: `Game Cancelled: [Date] poker night`
- Body: Cancellation notification
- **Calendar cancellation** (.ics with STATUS:CANCELLED)

**Example:**
```
Subject: Game Cancelled: Jan 17 poker night

Unfortunately, poker night on Friday, January 17 has been cancelled.

The event has been removed from your calendar.

We'll let you know when the next game is scheduled!
```

#### 7. **24-Hour Reminder** (Phase 2)
**Trigger:** 24 hours before game start time
**Recipients:** All confirmed RSVPs
**Content:**
- Subject: `Reminder: Poker night tomorrow at [Time]`
- Body: Game details, bring cash reminder
- **Calendar invite attached again** (in case they deleted it)

**Example:**
```
Subject: Reminder: Poker night tomorrow at 7:00 PM

Game on tomorrow! 🎴

📅 Tomorrow (Friday, Jan 17)
🕖 7:00 PM
📍 Eric's House (123 Main St, San Francisco, CA 94102)
💵 $100 buy-in - bring cash!

See you at the felt!
```

#### 8. **3-Hour Reminder** (Phase 2)
**Trigger:** 3 hours before game start time
**Recipients:** All confirmed RSVPs
**Content:**
- Subject: `Game starts soon! See you at [Time]`
- Body: Final reminder, game starting soon

**Example:**
```
Subject: Game starts soon! See you at 7:00 PM

Final reminder - game starts in 3 hours!

🕖 7:00 PM tonight
📍 Eric's House (123 Main St, San Francisco, CA 94102)

Shuffle up and deal! 🃏
```

---

## Calendar Event Specification

### iCalendar (.ics) Format

**Fields:**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PokerBros//pokerbros.xyz//EN
METHOD:REQUEST

BEGIN:VEVENT
UID:game-[game-id]@pokerbros.xyz  # Same UID = updates same event
DTSTAMP:[timestamp]
DTSTART:[game-datetime]
DTEND:[game-datetime + 4 hours]
SUMMARY:Poker Night at [Location Name]
DESCRIPTION:$[buy-in] buy-in\n[notes]\n\nView details: https://pokerbros.xyz/game/[id]
LOCATION:[Location Address]
STATUS:CONFIRMED
SEQUENCE:[increment on updates]
ORGANIZER:mailto:poker@pokerbros.xyz
ATTENDEE:mailto:[player-email]
END:VEVENT

END:VCALENDAR
```

**Key Details:**
- **UID:** `game-{gameId}@pokerbros.xyz` - Ensures updates modify same event
- **SEQUENCE:** Increment on each update (0, 1, 2...) - Tells calendar this is newer
- **STATUS:** `CONFIRMED` for invites, `CANCELLED` for cancellations
- **DURATION:** 4 hours from game start time
- **LOCATION:** Full address from location record

### Update Strategy

**New RSVP:** SEQUENCE=0, STATUS=CONFIRMED
**Game updated:** SEQUENCE++, STATUS=CONFIRMED
**RSVP cancelled:** SEQUENCE++, STATUS=CANCELLED
**Game cancelled:** SEQUENCE++, STATUS=CANCELLED

This ensures calendar apps properly update/remove events.

---

## Technical Implementation

### Tech Stack

- **Resend** - Email delivery service
- **React Email** - Email templates as React components
- **ics** - Generate .ics calendar files
- **Next.js Server Actions** - Send emails from server

### Environment Variables

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=poker@pokerbros.xyz
RESEND_FROM_NAME=PokerBros
NODE_ENV=development|production  # Determines email filtering behavior
```

### Email Filtering (Development Safety)

**Problem:** Prevent accidentally emailing real players during local/staging testing.

**Solution:** Filter email recipients based on environment.

**Implementation:**
```typescript
// lib/email/send-email.ts
export async function sendEmail({
  to,
  subject,
  react,
  icsContent,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  icsContent?: string;
}) {
  const recipients = Array.isArray(to) ? to : [to];

  // In development/staging: only send to superadmins
  if (process.env.NODE_ENV !== 'production') {
    const { data: superadmins } = await supabase
      .from('admin_users')
      .select('email')
      .eq('is_superadmin', true);

    const superadminEmails = superadmins?.map(a => a.email) || [];
    const filteredRecipients = recipients.filter(email =>
      superadminEmails.includes(email)
    );

    // If no superadmins in recipient list, skip sending
    if (filteredRecipients.length === 0) {
      console.log(`[DEV] Skipped email to ${recipients.join(', ')} (not superadmin)`);
      return { skipped: true };
    }

    console.log(`[DEV] Sending email only to superadmins: ${filteredRecipients.join(', ')}`);
    to = filteredRecipients;
  }

  // Send email via Resend
  return await resend.emails.send({
    from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
    to,
    subject,
    react,
    attachments: icsContent ? [{
      filename: 'event.ics',
      content: icsContent,
    }] : undefined,
  });
}
```

**Benefits:**
- ✅ Safe to test with real player data in local/staging
- ✅ Only superadmins receive test emails
- ✅ No risk of spamming real players during development
- ✅ Production behavior unchanged (all emails sent normally)

**Testing Strategy:**
1. Add your email to `admin_users` with `is_superadmin = true`
2. Test all email flows locally - you'll receive the emails
3. Other players won't receive anything in development
4. Deploy to production - all emails work normally

### Dependencies

```bash
npm install resend react-email @react-email/components ics
```

### File Structure

```
/emails
  /templates
    GameCreated.tsx
    RsvpConfirmation.tsx
    WaitlistPromotion.tsx
    RsvpCancellation.tsx
    GameUpdated.tsx
    GameCancelled.tsx
    Reminder24h.tsx
    Reminder3h.tsx
  /components
    EmailLayout.tsx
    Button.tsx
    GameDetails.tsx

/lib
  /email
    send-email.ts        # Resend wrapper
    generate-ics.ts      # Calendar event generator
    email-triggers.ts    # Logic for when to send emails

/app
  /api
    /webhooks
      /resend
        route.ts         # Webhook for email events (optional)
```

### Core Functions

**`lib/email/send-email.ts`**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
  icsContent,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
  icsContent?: string;
}) {
  // Send email with optional .ics attachment/inline
}
```

**`lib/email/generate-ics.ts`**
```typescript
import { createEvent } from 'ics';

export function generateGameIcs({
  game,
  location,
  playerEmail,
  status,
  sequence,
}: {
  game: Game;
  location: Location;
  playerEmail: string;
  status: 'CONFIRMED' | 'CANCELLED';
  sequence: number;
}): string {
  // Generate .ics content
}
```

### Email Sending Logic

**Trigger Points:**
1. **After RSVP created** → Send confirmation
2. **After RSVP deleted** → Send cancellation
3. **After game updated** → Send update to confirmed players
4. **After game deleted** → Send cancellation to confirmed players
5. **After game created** → Send announcement to all players
6. **After waitlist promotion** → Send promotion notification
7. **Scheduled job** → Send 24h and 3h reminders

**Implementation:**
- Add email sending to existing Server Actions
- Use `revalidatePath()` before sending (ensure data is fresh)
- Handle errors gracefully (log but don't block main action)

---

## Player Preferences UI

### Profile Settings Page

**Location:** `/admin/players/[id]` (admin edit) or future player dashboard

**UI:**
```
Email Settings
├─ Email Address: [input] (required)
└─ Email Notifications: [toggle] ON/OFF
   └─ Receive game announcements, reminders, and updates
```

**Validation:**
- Email required for new players (enforce in form)
- Email must be valid format
- Email unique per player (or allow duplicates?)

---

## Implementation Phases

### Phase 0: Location Management (Est: 4 hours)
- [ ] Create `locations` table migration
- [ ] Build location CRUD pages in admin
- [ ] Update game form to use location dropdown
- [ ] Migrate existing venue data
- [ ] Test location selection

### Phase 1: Core Email System (Est: 8 hours)
- [ ] Set up Resend account + verify domain
- [ ] Install dependencies (resend, react-email, ics)
- [ ] Create email layout component
- [ ] Build email templates (Game Created, RSVP Confirmation, Cancellation)
- [ ] Implement .ics generation function
- [ ] Add email sending to Server Actions:
  - [ ] createGame → send "Game Created"
  - [ ] addRSVP → send "RSVP Confirmation"
  - [ ] cancelRSVP → send "RSVP Cancellation"
  - [ ] updateGame → send "Game Updated"
  - [ ] deleteGame → send "Game Cancelled"
- [ ] Add waitlist promotion email trigger
- [ ] Add player email preferences UI
- [ ] Test all email types

### Phase 2: Reminders (Est: 3 hours)
- [ ] Set up cron job / scheduled task (Vercel Cron)
- [ ] Build reminder email templates (24h, 3h)
- [ ] Implement reminder sending logic
- [ ] Test reminder timing

### Phase 3: Polish (Est: 2 hours)
- [ ] Add unsubscribe functionality
- [ ] Improve email styling/branding
- [ ] Add email logging (optional)
- [ ] Handle edge cases (no email, invalid email)

**Total Estimated Time: ~17 hours**

---

## User Stories

### Players
```
As a player, I want to receive an email when a new game is created
So that I know to RSVP quickly before spots fill up

As a player, I want a calendar invite when I RSVP
So that the game is automatically added to my calendar

As a player, I want reminders before the game
So that I don't forget about it

As a player, I want my calendar updated if the game time changes
So that I don't show up at the wrong time

As a player, I want to opt out of email notifications
So that I can manage my own calendar without reminders
```

### Admins
```
As an admin, I want to manage locations with addresses
So that calendar invites have accurate navigation info

As an admin, I want emails sent automatically
So that I don't have to manually remind everyone

As an admin, I want to see who has email notifications enabled
So that I know who's being notified
```

---

## Success Metrics

- [ ] All confirmed players receive RSVP confirmation emails
- [ ] Calendar invites work in Gmail, Outlook, Apple Calendar
- [ ] Calendar updates work when game changes
- [ ] Calendar cancellations remove events properly
- [ ] No emails sent to players with notifications disabled
- [ ] No emails fail due to invalid addresses
- [ ] Reminders sent at correct times (24h, 3h before)

---

## Testing Plan

### Development Safety Testing
1. **Verify email filtering works:**
   - Set `NODE_ENV=development`
   - Create game, RSVP as non-superadmin player
   - Confirm email is NOT sent (check console logs)
   - RSVP as superadmin player
   - Confirm email IS sent
2. **Verify production behavior:**
   - Set `NODE_ENV=production`
   - Confirm all players receive emails regardless of admin status

### Email Delivery Testing
1. Test with Gmail, Outlook, Apple Mail, Yahoo
2. Verify emails don't go to spam
3. Test with and without calendar attachments
4. Test HTML rendering across clients

### Calendar Integration Testing
1. Test .ics import on iOS Calendar
2. Test .ics import on Google Calendar
3. Test .ics import on Outlook
4. Test calendar updates (same event modified)
5. Test calendar cancellations (event removed)

### Edge Cases
1. Player without email address
2. Player with invalid email
3. Player with notifications disabled
4. Game created and immediately cancelled
5. Multiple rapid game updates (sequence handling)
6. Waitlist promotion when player already has plans

---

## Future Enhancements

**Phase 3+:**
- [ ] Email open/click tracking via Resend webhooks
- [ ] Digest emails (weekly summary of upcoming games)
- [ ] Post-game recap emails with results
- [ ] Player birthday notifications
- [ ] Achievement unlock emails
- [ ] Customizable email templates per user
- [ ] SMS notifications (via Twilio)
- [ ] Push notifications (PWA)

---

## Security & Privacy

### Development Safety
- **Email filtering in non-production environments**
- Only superadmins receive emails during local/staging testing
- Prevents accidental spam to real players during development
- See "Email Filtering (Development Safety)" in Technical Implementation

### Email Address Protection
- Never show player emails to other players
- Only admins can see email addresses
- Use BCC for mass emails (not applicable - individual sends)

### Unsubscribe
- Include unsubscribe link in every email footer
- One-click unsubscribe (updates `email_notifications` to false)
- Comply with CAN-SPAM Act

### Rate Limiting
- Resend free tier: 100 emails/day limit
- No risk of hitting limit with current use case
- Add logging if approaching limits

---

## Open Questions

1. Should we send "game created" emails for past games created before email system? (Probably no)
2. Should location address be visible to non-confirmed players? (Probably yes, it's in calendar anyway)
3. What if player email bounces? (Log error, continue silently)

---

## Approval Checklist

- [x] Location management design approved
- [x] Email types and triggers defined
- [x] Calendar event format specified
- [x] Player preferences approach confirmed
- [x] Implementation phases outlined
- [ ] **Ready to build**

---

**End of PRD**
