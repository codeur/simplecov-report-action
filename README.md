# Simplecov Report Action

GitHub Action to post SimpleCov coverage on pull requests and fail when coverage is below a threshold.

## What it does

- Reads coverage from `coverage/.last_run.json` by default.
- Supports both `result.covered_percent` and `result.line`.
- Creates or updates one PR comment titled `Simplecov Report`.
- Fails the workflow if coverage is below `failedThreshold`.

## Inputs

- `token`: GitHub token (usually `${{ secrets.GITHUB_TOKEN }}`).
- `failedThreshold`: Minimum accepted coverage, default `90`.
- `resultPath`: Coverage file path, default `coverage/.last_run.json`.

## Usage

This action is intended for `pull_request` workflows.

```yaml
name: test

on:
  pull_request:

jobs:
  rspec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: bundle exec rspec

      - name: Report SimpleCov
        uses: <owner>/simplecov-report-action@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          failedThreshold: 90
          resultPath: coverage/.last_run.json
```
