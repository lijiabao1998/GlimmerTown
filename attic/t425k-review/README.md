# T425K browser evidence

Environment: `127.0.0.1:8126`, slot 3, Chrome/in-app browser, speed 0, weather 0. No probe was run on the player origin at port 8123.

Before (`34e7714`, T425J):

- `before-t425j-raw-day.jpg`
- `before-t425j-raw-night.jpg`
- `before-t425j-ingame-desktop-day.jpg`

After (T425K):

- `after-day-viewport.png`: raw day sprite and probe metrics.
- `after-ingame-desktop-day.png`: desktop z2 day.
- `after-ingame-desktop-night.png`: desktop z2 night, initial review frame.
- `after-ingame-desktop-z1-day.png`: 1280x800 z1 day.
- `after-ingame-desktop-z1-night.png`: 1280x800 z1 night.
- `after-ingame-desktop-z2-night.png`: 1280x800 z2 night.
- `after-ingame-mobile-day.png`: 390x844 z2 day.

Measured ROI (`x=38..233`, `y=145..221`): transitions 2769, opaque 10202, colors 151, singleton runs 1103. Full sprite: transitions 10874, opaque 17821. Static hashes: raw day `1b5cb115`, day plus night layer at 3x `4cda0222`.

Five complete starts: 4988/5017/5102/5187/5179 ms; p50 5102, max 5187. Browser console warning/error count: 0.
