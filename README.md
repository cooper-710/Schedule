# Report Tide

A hosted-ready dashboard for staying a series ahead on player reports and handwritten notes.

## What it does

- Shows overdue, due today, next 72 hours, later, and done items.
- Tracks each item with `Made/Generated` and `Sent/Uploaded/Cleared` checklist steps.
- Creates a full series checklist from one form.
- Includes the current 19 tracked players, upload flags, player roles, and levels.
- Separates auto-generated reports from manual notes.
- Highlights manual notes for Sean Manaea, Ryne Stanek, Lance McCullers, and Matthew Liberatore.
- Stores data in the browser with `localStorage`.
- Supports one-time, daily, weekly, and monthly manually added items.
- Creates the next scheduled item automatically when a recurring item is marked sent.

## Workflow assumptions

- Pre-series report tasks should be cleared 2-3 days before a series starts.
- Auto-upload players are marked as `auto-upload`.
- Upload-off players are marked as `local only`.
- Handwritten notes are marked as `manual send`.
- The "Next 72h" lane is the warning lane for work that can no longer wait.

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
- Import real upcoming series from the report scheduler output.
- Detect generated PDFs and upload queue status automatically.
- Add login and cloud sync.
- Add reminders or browser notifications.
- Add import/export for schedule data.
- Add templates for repeated note types.
