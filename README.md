# Schedule

A hosted-ready dashboard for staying a series ahead on player reports and handwritten notes.

## What it does

- Shows overdue, due today, next 72 hours, later, and done items.
- Tracks each item with reversible ready/written and sent steps.
- Crosses completed items off in place instead of moving them to the bottom.
- Keeps hidden completed items recoverable in the `Hidden` view.
- Auto-syncs upcoming MLB and Triple-A schedules from the public MLB Stats API.
- Creates report tasks automatically from upcoming series starts through the rest of the season.
- Opens to a visual calendar, with separate List and Players pages.
- Includes an editable roster with player, team abbreviation, level, role, and manual-note flag.
- Separates auto-generated reports from manual notes.
- Highlights manual notes for Sean Manaea, Ryne Stanek, Lance McCullers, and Matthew Liberatore.
- Stores data in the browser with `localStorage`.

## Workflow assumptions

- Pre-series report tasks should be cleared 2-3 days before a series starts.
- Handwritten notes are marked as `manual send`.
- The "Next 72h" lane is the warning lane for work that can no longer wait.
- Team IDs are resolved internally from the team abbreviation and level because abbreviations can collide between MLB and Triple-A.
- If the schedule window starts mid-series, that already-started series is skipped.
- Schedule-generated tasks whose send window is already in the past are removed from the active board.

## Roster edits

Use **Edit players** to handle trades, call-ups, and send-rule changes during the season.

- Team: visible abbreviation like `STL`, `NYM`, `ROC`, or `DUR`.
- Level: `MLB` uses sport ID `1`; `AAA` uses sport ID `11`.
- Manual notes: creates handwritten-note tasks for that player.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Host it

This app is static, so it can be hosted on GitHub Pages.

After pushing to GitHub:

1. Open the repository settings.
2. Go to **Pages**.
3. Set the source to the `main` branch and `/root`.
4. Save.

GitHub will publish the app at the Pages URL shown in settings.

## Future upgrades

- Read `tracked_players.csv` directly from the report repo.
- Detect generated PDFs and upload queue status automatically.
- Add login and cloud sync.
- Add reminders or browser notifications.
- Add import/export for schedule data.
- Add a backend job that loads schedules automatically every morning.
