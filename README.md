# Giazo Quiz Reward

A just-for-fun daily quiz for GiaZoNest. A seller offers a product discount, players spin the wheel and answer 5 questions in 5 minutes, and the best score (then fastest time) wins.

## Pages
- **index.html** (Super Admin, Seller): the console. Super Admin sees all 3 tabs and every player entry.
  1. **Seller's Details**: shop name, phone, product image and description, and the winner's prize. The seller picks one prize type: **MRP and Winner pays** (a lower price for this product) or a **Discount coupon** (5%, 10%, 15% and so on up to 90% off the seller's products). The Player page shows only the type the seller picked. **Save and continue** creates the Player page link to share with buyers.
  2. **Player Details** and 3. **Quiz**: a preview of the Player page, plus the private Entries and scores table.
- **player.html** (Buyer): what the seller shares. Only Tab 2 and Tab 3, showing the seller's prize.
  2. **Player Details**: name, email and phone, then start the quiz. One play per email or phone per day.
  3. **Quiz**: Spin the Wheel, 5 questions in 5 minutes, and a leaderboard ranked by score then time. Names and phones show as `*****`; emails are masked to `x*****@giazonest.com`.

The prize details travel inside the Player page link, so there is no server yet. The link starts with a short quiz code, the first 3 letters of the shop name, the last 4 digits of the seller's mobile and the date as DDMMYY, for example `player.html#DES_3210_231026.z...`. The text after `#` holds the shop, product name, description and prize in compressed form. Photos are not included, to keep the link short, so buyers see the GiaZoNest logo in place of the product photo. `404.html` also opens the earlier `giazo_quiz_reward/DES_3210_231026#...` form. Older `player.html#o=...` links still work. Opening `player.html` without that part shows "This quiz link isn't complete". Scores are kept in the browser that played, so a buyer's score does not reach the seller's console until the app has a backend.

## Results tab
Tab 4 **Results** is open to everyone (Super Admin, Seller and Player) with no login. Pick a date from 24 Oct 2026, when the database started, up to yesterday. Each quiz played that day shows its winner and ranking, with emails masked as `x*****@giazonest.com`. The Player page shows only its own seller's quiz; the console shows every quiz. When Super Admin or a seller is signed in (on Player Details), the console's Results also show each player's full name, email and phone (all sellers for Super Admin, own shop for a seller). Today's results appear after 00:00:00.

## Seller accounts and player details
Players' full names, emails and phone numbers are private. On the console's Player Details tab, **Super Admin** (vishalsaxen@gmail.com or gizee@giazonest.com) signs in and sees every seller's players for any date, with a Seller column. A **seller** fills in Seller's Details, clicks Save and continue, then on Player Details enters an email and password and clicks **Create seller account** (or Sign in next time). That links their shop code (first 3 letters of the shop + last 4 phone digits, e.g. `GIZ_4383`) to their account in the `sellers` collection, and from then on they see only their own players, in Player Details and in Results. Players from earlier days show up too, because access is by shop code. The first account to claim a shop code keeps it; Super Admin can move it by editing or deleting the `sellers` document in the Firebase console.

## Short player link
When a seller clicks Save and continue, the prize details are saved in the `quizzes` collection and the link to share is just `https://vishalsaxen.github.io/giazo_quiz_reward/GIZ_4383_251026` (404.html forwards it to `player.html#GIZ_4383_251026`, which loads the details). If saving fails, the console falls back to the longer link that carries the details itself. Older links keep working.

## Quizzes tab (admin only)
Tab 5 **Quizzes** appears on the console only. Sign in as Super Admin on Player Details, open Quizzes and pick a date (from 24 Oct 2026). It lists every seller's quiz that day: code, seller phone, prize, how many played and finished, the description and the player link. Links are saved to the `quizzes` collection when a seller clicks Save and continue (from 25 Oct 2026); earlier days show the quiz without a link. Needs the `quizzes` block in firestore.rules published.

## Flow
- Tabs open in order: Player Details unlocks after the seller saves Seller's Details, and Quiz unlocks after a player starts. Both steps ask "Are you sure you want to continue?" first.
- Tab 3 shows only the wheel while playing. Once a buyer starts, they stay on Tab 3 until the next day, when they see the previous day's results.

## Questions
`questions.js` holds a bank of 189 Class VII multiple-choice questions (NCERT Science, Maths, History, Geography, Civics, English and GK). Every player gets a fresh random 9, one per wheel letter, and a browser avoids questions it showed recently, so replays on the same device get new ones. Add questions to the bank in the same format to widen the mix.

## Daily reset and results
At 00:00:00 the day's quiz ends, the entry form clears, and a new quiz opens. The closed day's results then show to everyone in the Quiz tab, with a date picker for earlier days. Super Admin and Seller can see entries and scores for any date, including today, in Player Details.

## Live entries (Firebase)
With the web config in `firebase-config.js`, entries and scores go to the `giazo-quiz-reward` Firestore database, so they're shared across phones:
- Players enter once per email and once per phone number per quiz per day, and their final score is saved.
- Super Admin signs in on Player Details (Firebase email/password) to see today's players, who's still playing and their scores, refreshed every 15 seconds.
- The Quiz tab's public results come from the database too, with masked emails only.
Paste `firestore.rules` into Firebase › Firestore Database › Rules. Only the admin emails listed there can read names, emails and phones. With no `apiKey`, the app runs on example data.

## Run
Open `index.html` in a browser, or enable GitHub Pages on the `main` branch. `app.js`, `app.css` and `questions.js` are shared by both pages.

Live: https://vishalsaxen.github.io/giazo_quiz_reward/
