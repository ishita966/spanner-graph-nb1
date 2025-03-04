# Development Setup

For local development and testing of the visualization, you can use the development server:

```shell
cd spanner_graphs/dev_util
python serve_dev.py
```

This will:
1. Start a Python backend server that handles Spanner Graph queries
2. Start a frontend server serving the development interface
3. Open your browser to the development interface at http://localhost:8000/static/dev.html

The development interface provides a form where you can:
- Configure your GCP project, instance, and database
- Toggle between mock and real data
- Write and execute Spanner Graph queries
- Visualize the results in real-time

Note: The development server is separate from the test server (`npm run test:serve-content`) which is used specifically for running the frontend test suite.