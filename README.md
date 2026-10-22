# Giazo Quiz Reward

A just-for-fun daily quiz for GiaZoNest. A seller offers a product discount, players spin the wheel and answer 5 questions in 5 minutes, and the best score (then fastest time) wins.

## Tabs
1. **Seller's Details** (Super Admin, Seller): shop name, phone, product image and description, MRP and the winner's discount.
2. **Player Details** (private entry): name, email and phone, then start the quiz. One play per email or phone per day.
3. **Quiz** (public): Spin the Wheel, 5 questions in 5 minutes, and a leaderboard ranked by score then time. Names and phones show as `*****`; emails are masked to `x*****@giazonest.com`.

## Flow
- Tabs open in order: Player Details unlocks after the seller saves Seller's Details, and Quiz unlocks after a player starts. Both steps ask "Are you sure you want to continue?" first.
- Tab 3 shows only the wheel while playing. Once a buyer starts, they stay on Tab 3 until the next day, when they see the previous day's results.

## Daily reset and results
At 00:00:00 the day's quiz ends, the entry form clears, and a new quiz opens. The closed day's results then show to everyone in the Quiz tab, with a date picker for earlier days. Super Admin and Seller can see entries and scores for any date, including today, in Player Details.

## Run
Open `index.html` in a browser, or enable GitHub Pages on the `main` branch.

Live: https://vishalsaxen.github.io/giazo_quiz_reward/
