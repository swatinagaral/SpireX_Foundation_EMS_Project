# Communication Module (Emails + Announcements)

## Setup
1. Copy these files over your `backend/` folder (same paths).
2. **Rename** `middleware/authmiddleware.js` -> `middleware/authMiddleware.js` (Linux is case-sensitive).
   With git on Windows/Mac: `git mv middleware/authmiddleware.js tmp.js && git mv tmp.js middleware/authMiddleware.js`
3. `cp .env.example .env` and fill values (`MONGO_URI`, `JWT_SECRET`, SMTP, ADMIN_*).
4. `npm run seed`  -> creates super admin + default email templates.
5. `npm run dev`
No new npm packages are needed.

SMTP empty = dev mode: emails are marked "sent" but NOT delivered. For Gmail use an App Password.

## Endpoints  (all need `Authorization: Bearer <token>`)

### Announcements  /api/announcements
| Method | Path | Permission | What |
|---|---|---|---|
| GET | / | announcements.read | My announcements (`?unread=true&priority=urgent&page=1`) |
| GET | /unread-count | announcements.read | Bell badge count |
| GET | /manage | create/update | Announcements I manage (all statuses) |
| POST | / | announcements.create | Create |
| GET | /:id | announcements.read | One announcement |
| PATCH | /:id | announcements.update | Edit / pin / archive |
| DELETE | /:id | announcements.delete | Delete |
| POST | /:id/read | announcements.read | Mark as read |

Create body:
```json
{ "title": "Holiday", "content": "Office closed Friday", "priority": "important",
  "audience": { "all": false, "roles": ["student"], "batches": ["<batchId>"], "programs": [] },
  "isPinned": false, "status": "published", "publishAt": "2026-10-01T09:00:00Z",
  "expiresAt": "2026-10-10T00:00:00Z", "sendEmail": true }
```
A user sees an announcement if ANY of audience.all / roles / batches / programs matches.

### Emails  /api/emails
| Method | Path | Permission | What |
|---|---|---|---|
| POST | /send | emails.send | One email (`to` or `userId`, + `templateId`/`templateKey` or `subject`+`body`, `variables`) |
| POST | /bulk | emails.bulk | Bulk (`recipients: {all, roles, batches, programs, userIds, emails}`) |
| GET | /history | emails.history | History (`status,type,q,from,to,bulkId,page,limit`) |
| GET | /stats | emails.history | Counts per status |
| GET | /:id | emails.history | Full email |
| POST | /:id/retry | emails.send | Retry failed |
| POST | /:id/cancel | emails.send | Cancel queued |

### Templates  /api/email-templates
GET `/`, GET `/:id`, POST `/`, PATCH `/:id`, DELETE `/:id`, POST `/:id/preview` (`{ "variables": {"name":"Ali"} }`).
Use `{{name}}`, `{{email}}` or any custom `{{variable}}` in subject/body.

## Rules built in
- Emails go to a DB-backed queue (status queued -> sending -> sent/failed, 3 attempts with backoff). No Redis needed.
- Coordinators can only target their OWN batches/programs (scope-based access). Admin/HR can target anyone.
- Non-admins see only the emails they sent in history. Admin/super_admin see all.
- Variables are HTML-escaped (no script injection). Max bulk size: `MAX_BULK_RECIPIENTS` (1000).

## For other modules (Offer Letter, Certificate, Application)
```js
const { sendTemplateEmail } = require("../services/emailService");
await sendTemplateEmail("offer_letter", { email, name }, { position: "Intern", link });
await sendTemplateEmail("certificate_issued", { email, name }, { certificateId, link });
```
Batch/Program targeting works once the Student/Employee modules fill `user.batches` / `user.programs`
(ObjectId arrays added to the User model).
