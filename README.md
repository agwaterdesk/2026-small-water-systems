# AG & Water Desk Svelte Template

A template for creating interactive data visualizations and stories for the AG & Water Desk.

## Getting Started

### Using the Template

1. Click the "Use this template" button on GitHub to create a new repository
2. Clone your new repository
3. Run the setup script:

```bash
npm run setup
```

The setup script will:
- Replace placeholder text with your project slug
- Install dependencies
- Initialize git
- Set up the remote repository

### Development

After setup, you can start the development server:

```bash
npm run dev
```

### Creating Static Images

To create static fallback images for social sharing:

```bash
node scripts/screenshot.js
```

This will create a static image in `public/fallbacks/[your-slug]-static.png`.

## Project Structure

- `src/` - Source code
  - `components/` - Reusable components
  - `lib/` - Utility functions and shared code
  - `data/` - Data files
  - `stores/` - Svelte stores
  - `utils/` - Helper functions
- `public/` - Static assets
  - `fallbacks/` - Static images for social sharing
- `scripts/` - Utility scripts
  - `screenshot.js` - Creates static images
  - `setup.js` - Project initialization

## Configuration

Edit `project.config.json` to configure:
- Project name and slug
- Google Doc/Sheet IDs

## License

This template is for use by the AG & Water Desk team.