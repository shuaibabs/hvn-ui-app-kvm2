# Firestore rules deployment

Copy the full contents of `firestore.rules` into Firebase Console → Firestore Database → Rules, then publish. This folder is separate from application configuration; no database rules have been deployed by Codex.

The rules use `users/{Firebase Auth UID}` profiles with `role: 'admin' | 'employee'` and a unique, stable `displayName`. The application currently stores assignments by display name, so employee names must be unique. Provision the first admin using the Firebase Console or Admin SDK; clients cannot grant themselves admin access. Administrators manage user roles and names.

Admins can manage all inventory. Employees can read and update their assigned inventory, including ownership and check-in dates, while retaining the assignment and creator. Employee deletion of assigned inventory is allowed because existing sale and pre-booking transactions remove the inventory document. Sales and pre-bookings use `originalNumberData.assignedTo`; employee payments and dealer records use `createdBy`. The file covers all 20 collections currently subscribed to by the dashboard and denies unknown paths.

Activity records are readable in the existing Activities screen. New ownership, check-in, submitted location searches, copy, and automatic reminder actions are queued with `notificationStatus: 'Pending'`. Only the bot's Firebase Admin SDK can claim the queue and update delivery status. Restart the updated bot to run this worker; it checks every 30 seconds and retries failures with backoff, resuming unfinished destinations/parts. Its Admin SDK writes bypass client Firestore rules.

Check-in dates replace `numbers.checkInDate`, stored at midnight in Asia/Kolkata. Due dates include today and earlier dates. The bot reconciles dates every minute and queues newly arrived reminders for Telegram; the daily consolidated summary remains at 07:00 IST. New check-in reminders are assigned to admins and the assigned employee; changing to a future date resolves the old pending reminder, and a later arrived date reactivates it. Account names appear in reminders, with `N/A` where no account name exists.

Before publishing, use Firebase's Rules Playground or emulator to verify an admin, an assigned employee, another employee, and an unauthenticated user. In particular, check employee ownership/check-in changes, rejection of role escalation and queue-status edits, and the dashboard's existing query filters. This machine does not currently have a Firestore emulator installed.

Bulk Status Change supports admins and employees for inventory they can access. It validates comma/newline input and previews RTP / Non-RTP changes. Non-RTP requires a future scheduled RTP date in IST; RTP clears that date. Status changes and their activity/Telegram queue records are committed together in chunks of 40. The rules validate status/date consistency whenever either field changes: RTP has no RTP date, and Non-RTP has a timestamp. Unrelated updates to legacy records retain their existing behavior. Include status/date changes in Rules Playground checks before publishing.

Reference: [Firebase conditions and access checks](https://firebase.google.com/docs/firestore/security/rules-conditions), [field validation and changed fields](https://firebase.google.com/docs/firestore/security/rules-fields).
