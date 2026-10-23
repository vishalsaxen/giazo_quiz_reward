# Giazo Quiz Reward

A just-for-fun daily quiz for GiaZoNest. A seller offers a product discount, players spin the wheel and answer 5 questions in 5 minutes, and the best score (then fastest time) wins.

## Pages
- **index.html** (Super Admin, Seller): the console. Super Admin sees all 3 tabs and every player entry.
  1. **Seller's Details**: shop name, phone, product image and description, and the winner's prize. The seller picks one prize type: **MRP and Winner pays** (a lower price for this product) or a **Discount coupon** (5%, 10%, 15% and so on up to 90% off the seller's products). The Player page shows only the type the seller picked. **Save and continue** creates the Player page link to share with buyers.
  2. **Player Details** and 3. **Quiz**: a preview of the Player page, plus the private Entries and scores table.
- **player.html** (Buyer): what the seller shares. Only Tab 2 and Tab 3, showing the seller's prize.
  2. **Player Details**: name, email and phone, then start the quiz. One play per email or phone per day.
  3. **Quiz**: Spin the Wheel, 5 questions in 5 minutes, and a leaderboard ranked by score then time. Names and phones show as `*****`; emails are masked to `x*****@giazonest.com`.

The prize travels inside the Player page link (`player.html#o=...`), so there is no server yet. Opening `player.html` without that part shows "This quiz link isn't complete". Scores are kept in the browser that played, so a buyer's score does not reach the seller's console until the app has a backend.

## Flow
- Tabs open in order: Player Details unlocks after the seller saves Seller's Details, and Quiz unlocks after a player starts. Both steps ask "Are you sure you want to continue?" first.
- Tab 3 shows only the wheel while playing. Once a buyer starts, they stay on Tab 3 until the next day, when they see the previous day's results.

## Questions
`questions.js` holds a bank of 189 Class VII multiple-choice questions (NCERT Science, Maths, History, Geography, Civics, English and GK). Every player gets a fresh random 9, one per wheel letter, and a browser avoids questions it showed recently, so replays on the same device get new ones. Add questions to the bank in the same format to widen the mix.

## Daily reset and results
At 00:00:00 the day's quiz ends, the entry form clears, and a new quiz opens. The closed day's results then show to everyone in the Quiz tab, with a date picker for earlier days. Super Admin and Seller can see entries and scores for any date, including today, in Player Details.

## Run
Open `index.html` in a browser, or enable GitHub Pages on the `main` branch. `app.js`, `app.css` and `questions.js` are shared by both pages.

Live: https://vishalsaxen.github.io/giazo_quiz_reward/
