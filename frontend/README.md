# Spanner Graph Visualization

This package provides a visualization tool for Spanner Graph data.

## Development

### Setup

```bash
# Install dependencies
npm install
```

### Bundling

```bash
# Build the bundle for development
npm run build
```

This will create a bundled, non version-controlled JavaScript file in the `dist` directory that includes all dependencies.

### Development server

```bash
# Start the development server
python spanner_graphs/dev_util/serve_dev.py
```

This will build the bundle and start a local server at http://localhost:8000. You can access the development environment at http://localhost:8000/static/dev.html.

## Production for Notebook environments

```bash
# Build the bundle for production
npm run build:notebook
```

This will create a bundled and version-controlled JavaScript file in the `third_party` directory that includes all dependencies.