# Fluxboard
Fluxboard is a minimal and fast new tab replacement extension for Firefox. It offers a clean interface with bookmarks, todos, notes, and a customizable clock. No clutter, no ads, no nonsense — just a simple, user-friendly productivity dashboard that just works.

## Features
- Links: Bookmarking with groups and folders
- Todo: Built-in todo with history
- Stickies: Quick notes for jotting down thoughts
- Widget: customizable clock with multiple formats
- Data Management: import/export and reset data
- Search Engines: Google, DuckDuckGo and custom search engine options
- Drag & Drop: drag-and-drop functionality to reorganize bookmarks
- FluxTheme: automatically adapts to Firefox's current theme colors

## Installation
1. Visit the [FluxBoard Firefox Add-on page](https://addons.mozilla.org/en-US/firefox/addon/fluxboard/)
2. Click "Add to Firefox" and Confirm the installation
3. After the installation search `about:preferences#home`
4. Under "Homepage and new windows", select "Custom URLs"
5. Now select "Use Current Page"
6. The extension should now run as expected.

## Temporary Installation (Development)
1. **Clone the repository:**
```bash
    git clone https://github.com/manisharavindh/Fluxboard.git
   ```
2. Open Firefox and search `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on…"
4. Select `manifest.json` file from the project folder
5. The extension should now appear in your toolbar and run as expected.

## Notes
- When setting up the homepage, make sure to have Fluxboard (only one tab) open in the current window before selecting "Use Current Page" on settings so that firefox can pick the url.
- All data is stored locally in your browser - no external servers or tracking.
- The extension respects Firefox's theme colors when FluxTheme is enabled which won't always look good.

## Support
If you encounter any issues or have feature requests, please open an issue or create a feature request issue.
contributors are welcome! Feel free to fork the repository and submit pull requests.

<!-- ## 📸 Preview
![Fluxboard Screenshot](./preview.png) -->

## License
MIT License - feel free to use, modify, and share.
