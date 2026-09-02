# MPT Grifo Check Extension

A Chrome extension for calculating work hours, overtime, and balances from the Grifo time tracking system.

## Features

- ✅ Automatic calculation of work hours and balances
- ✅ Real-time updates with MutationObserver
- ✅ Configurable work time limits
- ✅ Visual indicators for changes and errors
- ✅ Draggable summary panel
- ✅ Cookie-based data persistence
- ✅ Modern ES6+ JavaScript
- ✅ Modular code architecture

## Installation

### Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store.

### Manual Installation (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone <repository-url>
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked**

5. Select the extension folder

6. The extension icon should appear in your toolbar

## Usage

1. Navigate to the Grifo time tracking system
2. The extension automatically detects the page and adds interactive inputs
3. Edit time entries as needed - changes are highlighted in yellow
4. Press Enter or click "Recalcular" to update calculations
5. The floating summary panel shows:
   - Total work schedule
   - Hours worked
   - Current balance
   - Hours bank balance
   - Final balance

## File Structure

```
├── manifest.json          # Chrome extension manifest (v3)
├── constants.js          # Configuration and constants
├── utils.js              # Utility functions
├── grifo-check.js        # Main application logic
├── panel.css             # Styles for the injected panel and toggle
├── jquery-3.7.1.min.js   # jQuery library
├── js-cookie.min.js      # Cookie helper
├── jquery.mask.min.js    # Input masking
├── utils.test.js         # Unit tests (node --test)
├── images/               # Extension icons
└── README.md             # This file
```

## Requirements

- Chrome 88+ (Manifest V3 support)
- Access to the Grifo time tracking system

## Development

The extension uses:
- **Manifest V3** for Chrome compatibility
- **ES6+ Classes** for better code organization
- **MutationObserver** for efficient DOM monitoring
- **Modular architecture** for maintainability

## Configuration

Edit `constants.js` to customize:
- Default work time limits
- Colors and styling
- Cookie expiration
- DOM selectors

## Keyboard Shortcuts

- **Enter** - Recalculate when editing time entries or limits

## Known Issues

- None currently reported

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Internal tool for MPT. No license specified.

## Version History

### 1.1.0 (Current)
- Refactored to Chrome Manifest V3
- Modern ES6+ JavaScript
- Modular code architecture
- Improved error handling
- MutationObserver for better performance

### 1.66 (Legacy)
- Initial version
- Firefox compatibility
- Manifest V2

