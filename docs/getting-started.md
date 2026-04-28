# Getting Started

## Prerequisites

- VS Code ≥ 1.95.0
- GitHub Copilot Chat extension
- A running Chorus server instance

## Installation

### From Marketplace

Search **"Chorus for GitHub Copilot"** in the Extensions view, or run:

```bash
code --install-extension turbo998.chorus-copilot
```

### From Source

```bash
git clone https://github.com/turbo998/Chorus-GitHub-Copilot.git
cd Chorus-GitHub-Copilot
npm install
npm run build
code --install-extension chorus-copilot-0.1.0.vsix
```

## Configure

1. Open **Settings** (`Ctrl+,`)
2. Search for `chorus`
3. Set **`chorus.serverUrl`** — e.g. `https://chorus.example.com`
4. Set **`chorus.apiKey`** — your personal API key

## First Steps

### Check in on a task

Open Copilot Chat and type:

```
@chorus /checkin projectUuid=abc taskUuid=def message="Started implementation"
```

### List tasks

```
@chorus /tasks projectUuid=abc
```

### View session status

```
@chorus /session
```

## Development

```bash
npm install
npm run build
npm test           # run all tests
npm run test:unit  # unit tests only
```
