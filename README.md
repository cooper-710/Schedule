# Notes Schedule

A small hosted-ready dashboard for tracking notes that need to be made and sent.

## What it does

- Shows overdue, due today, upcoming, and sent notes.
- Tracks each note with `Made` and `Sent` checklist steps.
- Stores data in the browser with `localStorage`.
- Supports one-time, daily, weekly, and monthly schedule items.
- Creates the next scheduled item automatically when a recurring item is marked sent.

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

- Add login and cloud sync.
- Add reminders or browser notifications.
- Add import/export for schedule data.
- Add templates for repeated note types.
