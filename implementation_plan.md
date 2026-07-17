# Narajole Chhatradol — 26-Point Feature Implementation Plan

This plan addresses all 26 requested changes systematically.

## User Review Required

> [!IMPORTANT]
> Items 8 (Phone Notifications), 15 (Location Map), and 19 (Monthly Payment Notification) require backend/3rd-party integration (FCM push, Google Maps API, scheduled Supabase function). These need additional environment setup and are noted with scope limitations below.

> [!WARNING]
> Items 22 (Blood Donor Section with Bar Graph) and 23/24 (Blood Request/Camp Application public forms) are entirely new features requiring new database tables and new pages.

> [!CAUTION]
> Item 7 (QR-code based attendance) requires a QR scanner library and has a dependency on who can mark attendance ("remove" only by Secretary/event role).

## Open Questions

> [!IMPORTANT]
> **Item 6 — Navbar logo design to hamburger menu:** The mobile nav already uses a hamburger icon. Does this mean the navbar LOGO should change, or that the desktop nav should collapse to a hamburger sooner (e.g., at `lg` breakpoint instead of `xl`)?

> [!IMPORTANT]
> **Item 7 — "Remove" only added by event Secretary & QR code attendance:** Should regular members lose the ability to self-mark attendance entirely, or only lose the "remove" capability?

> [!IMPORTANT]
> **Item 10 — Blood donate unit → "No of times donate":** Does this mean the `units` column label should say "Times Donated" instead of "Units"? And add "Unknown" as a blood group option?

> [!IMPORTANT]
> **Item 26 — English by default, then translate:** The current app defaults to Bengali (`'bn'`). Should we change the default to English, with a visible translate button switching to Bengali?

---

## Proposed Changes

### Phase 1 — Global Styling & Typography

#### [MODIFY] [index.css](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/index.css)
- **Item 4**: Change title font — add `Playfair Display` or `Cormorant Garamond` Google Font for headings
- **Item 20**: Add `@font-face` for `Roboto.txt` (confirm if this is a local font file, otherwise use Google Fonts `Roboto` already applied)
- **Item 25**: Add `@keyframes blink-donate` animation for pulsing donate button
- **Item 3**: Add CSS rule `input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none }` to suppress "0" entry issues; add form validation styles

#### [MODIFY] [main.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/main.tsx)
- Add Google Fonts link for `Playfair Display` / `Cormorant Garamond`

---

### Phase 2 — i18n & Translation (Item 1 & 26)

#### [MODIFY] [i18n.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/i18n.tsx)
- **Item 1**: Add translation keys for all Events page strings that are currently hardcoded as `tr('en', 'bn')` inline
- **Item 26**: Change default language from `'bn'` to `'en'` (line 319)

---

### Phase 3 — Header / Navbar (Item 6)

#### [MODIFY] [Header.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/components/layout/Header.tsx)
- **Item 6**: Change desktop nav breakpoint from `xl:flex` to `lg:flex` so hamburger menu shows on medium screens; redesign mobile menu with smoother animation (slide-down transition instead of instant toggle)
- **Item 25**: Add `animate-pulse` / blink animation to the Donate button; replace `→` arrow with a ❤️ love icon

---

### Phase 4 — Donation / Payment Page (Items 2, 3, 25)

#### [MODIFY] [Donate.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/Donate.tsx)
- **Item 2**: Fix "Members Payment Page" — after a failed payment, the Pay button must re-enable. Currently `status === 'error'` is set but `ready` is re-computed correctly; however we need to ensure the button becomes clickable again without page reload. Fix: on `status === 'error'`, reset status to `'idle'` after showing error for 4 seconds, or add an explicit "Try Again" button.
- **Item 3**: Form "0" handling — add `onFocus` handler to numeric inputs to clear value if it is `0` or `"0"`.
- **Item 25**: Add blink/pulse animation to the main Donate CTA, replace `→` arrow with heart icon `❤`.

---

### Phase 5 — Volunteer Form (Item 5)

#### [MODIFY] [Volunteer.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/Volunteer.tsx)
- **Item 5**: After successful submission, send a confirmation email to the user. This requires calling a Supabase Edge Function or Resend API. Will add a Supabase edge function call (`send-volunteer-confirmation`) after form submit.

---

### Phase 6 — Events Page (Items 1, 13)

#### [MODIFY] [Events.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/Events.tsx)
- **Item 1**: Replace all inline `tr('en', 'bn')` calls with proper `t('events.key')` i18n keys
- **Item 13**: Add "Newest to Oldest" as default sort option with a sort dropdown in the filter bar

---

### Phase 7 — Member Attendance (Item 7)

#### [MODIFY] [MemberAttendance.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/member/MemberAttendance.tsx)
- **Item 7**: Remove the "remove" button from regular members; only show it if the member has role `secretary` or `event_manager`. Add QR code scan button (using `html5-qrcode` or `qr-scanner` library) to auto-fill event ID for marking attendance.

---

### Phase 8 — Member Messages / Chat (Item 14)

#### [MODIFY] [MemberMessages.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/member/MemberMessages.tsx)
- **Item 14**: Add "Delete message" option for each message the user has sent (soft delete, set `deleted_at` timestamp).

---

### Phase 9 — Blood Donors & Blood Camp (Items 10, 11, 22)

#### [MODIFY] [AdminBloodDonors.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/admin/AdminBloodDonors.tsx)
- **Item 10**: Rename "Units" column header to "No. of Times Donated"; add "Unknown" to `BLOOD_GROUPS` array
- **Item 11**: Add filter for event-wise view; add bar graph (using Recharts or CSS bars) showing blood group distribution per event; show all events a donor has participated in when clicking their row

#### [MODIFY] [AdminBloodCamp.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/admin/AdminBloodCamp.tsx)
- **Item 11**: Add blood group bar chart per event; add "Add Blood Donor" section so every member can add a donor record for that event

#### [NEW] MemberBloodDonors.tsx (Item 22.iv)
- New page under member panel: `/member/blood-donors` — shows the Blood Donor Section for member access

#### [MODIFY] [App.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/App.tsx)
- Add routes for new member blood-donors page, blood request form, and blood camp application

---

### Phase 10 — Member Dashboard (Item 9 & 22)

#### [MODIFY] [MemberDashboard.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/member/MemberDashboard.tsx)
- **Item 22.iv**: Add a "Blood Donor Section" card/widget linking to the new member blood-donors page

---

### Phase 11 — Certificates (Item 9)

#### [MODIFY] [AdminCertificates.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/admin/AdminCertificates.tsx)
- **Item 9**: Add "Auto Signature Print" option — a toggle/checkbox on the certificate template to automatically include a pre-uploaded signature image when printing

---

### Phase 12 — Grants & Funding (Item 12)

#### [MODIFY] [AdminGrants.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/admin/AdminGrants.tsx)
- **Item 12**: Rearrange the form — move "Contact Person Number" and "Date Details" fields to more prominent positions

---

### Phase 13 — Contact Page (Item 16)

#### [MODIFY] [Contact.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/Contact.tsx)
- **Item 16**: Add "Education" and "Blood" subcategories to the subject dropdown; add a "Blood Required" field that appears when Blood subject is selected

---

### Phase 14 — Member Management (Items 17, 18)

#### [MODIFY] [AdminMembers.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/admin/AdminMembers.tsx)
- **Item 17**: Add "Edit Password" and "Delete Member" options from the admin panel member list

#### [MODIFY] [AdminMemberDetail.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/admin/AdminMemberDetail.tsx)
- **Item 17**: Add password reset / edit password form in member detail

#### [MODIFY] [Login.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/Login.tsx)
- **Item 18**: Add "Forgot Password" link that sends a reset email via Supabase Auth `resetPasswordForEmail()`

---

### Phase 15 — Public Forms (Items 23, 24)

#### [NEW] BloodRequest.tsx
- **Item 23**: New public page at `/blood-request` — form for anyone to submit urgent blood requests publicly

#### [NEW] BloodCampApplication.tsx  
- **Item 24**: New public page at `/organise-blood-camp` — form for anyone to apply to organise a blood donation camp

---

### Phase 16 — Image Upload Limits (Item 21)

#### [MODIFY] relevant upload components
- **Item 21**: Add client-side image compression using `browser-image-compression` library:
  - Avatar images: compress to ≤ 50KB
  - Media: compress to ≤ 200KB
  - Posts: compress to ≤ 350KB

---

### Phase 17 — Location Map (Item 15)

#### [MODIFY] [Contact.tsx](file:///e:/BASIC/Personal/My%20Study/Skill%20TASK%202025/002.%20Web%20Development/04.%20Others/Narajole%20Chhatradol/narajole_Chhatradol/src/pages/Contact.tsx)
- **Item 15**: Embed a Google Maps iframe or OpenStreetMap embed showing the office location

---

### Phase 18 — Notifications (Items 8, 19)

> [!NOTE]
> Items 8 and 19 require backend push notification infrastructure (Firebase Cloud Messaging or Supabase Edge Function + cron). Will implement the UI/trigger side; actual device notifications depend on FCM setup.

- **Item 8**: Add a "Request Notification Permission" button in the member dashboard that subscribes to push notifications
- **Item 19**: Create a Supabase edge function that runs monthly and sends payment reminder notifications to members with outstanding dues

---

## Verification Plan

### Automated Tests
- `npm run build` — verify TypeScript compiles without errors

### Manual Verification
1. Test Donate page: enter amount, fail payment → verify button re-enables
2. Test Events page: verify sort newest-to-oldest works
3. Test Member Attendance: verify remove button hidden for non-secretary members
4. Test Login: click "Forgot Password" → verify email sent
5. Test Contact page: verify Education/Blood subcategories appear
6. Test Blood Donor page: verify "Unknown" blood group option + "Times Donated" label
7. Test public Blood Request form renders without login
8. Test image upload compression for avatar/media/post
9. Verify English is now the default language on first load
10. Verify Donate button blinks and shows ❤ icon
