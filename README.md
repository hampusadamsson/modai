# ModAI

<div align="center">
<img src="assets/modai_logo.png" />
</div>
<!--toc:start-->

- [Modai](#modai)
  - [A ChatGPT-Powered Writing Assistant for Obsidian](#a-chatgpt-powered-writing-assistant-for-obsidian)
  - [Features](#features)
  - [Setup](#setup)
  - [Usage](#usage)
    - [1. Choose the text to modify](#1-choose-the-text-to-modify)
    - [2. Run Modai](#2-run-modai)
    - [3. Apply the changes](#3-apply-the-changes)
  - [Examples](#examples)
  - [Installation](#installation)
    - [From source (development)](#from-source-development)
    - [Manual installation (built files)](#manual-installation-built-files)
  - [Development](#development)
    - [Getting started](#getting-started)
    - [Building for release](#building-for-release)
  - [Linting & Code Quality](#linting-code-quality)
  - [API & Further Reading](#api-further-reading)
      <!--toc:end-->

## A ChatGPT-Powered Writing Assistant for Obsidian

Modai integrates ChatGPT directly into your Obsidian writing workflow.  
Use it to rewrite, edit, or optimize your notes with role-based prompts or fully custom instructions.

---

## Features

<div align="center">
<img src="assets/custom_instructions.png" />
</div>

- Add your own OpenAI / ChatGPT API key.
- Define reusable **roles** (e.g., Author, Editor, SEO Writer) with custom behavior.
- Quickly transform:
  - A **selection** of text, or
  - The **entire note** (when nothing is selected).
- Use a **custom instruction modal** to tell ChatGPT exactly how to modify your text.
- Trigger everything via a single command: `Modai`.

<div align="center">
<img src="assets/settings.png" />
</div>

---

## Setup

1. Open **Settings → Community plugins → Modai**.
2. Enter your **ChatGPT / OpenAI API key**.
3. Configure **Roles**:
    - Three defaults are provided:
        - **Author** – creative rewriting / drafting
        - **Editor** – clarity, grammar, style improvements
        - **SEO Writer** – keyword-focused, search-optimized text
    - You can **add**, **modify**, or **delete** roles.
    - Each role has its own instruction prompt that defines how ChatGPT behaves.

---

## Usage

### 1. Choose the text to modify

You have two options:

- **Selection only**  
  Highlight any text in the current note. Modai will only modify this selection.

- **Entire document**  
  Do **not** select anything. Modai will treat the entire active note as the input.

### 2. Run Modai

Use the command palette:

1. Press your command palette shortcut (e.g., `Ctrl+P` / `Cmd+P`).
2. Run: **`Modai`**.
3. A modal will open where you can:
    - Choose one of your **roles** (Author, Editor, SEO Writer, etc.), or
    - Enter **custom instructions** directly in the modal (e.g., “Summarize this in 3 bullet points”, “Rewrite in a more formal tone”, etc.).

### 3. Apply the changes

- Modai sends the selected text (or entire document) plus your chosen role/instructions to ChatGPT.
- When the response returns, the original text is **replaced** with the modified version in your note.

---

## Examples

- Use **Editor** role on a paragraph selection to:
  - Fix grammar
  - Improve clarity
  - Keep original meaning

- Use **SEO Writer** on an article draft (no selection) to:
  - Optimize headings and structure
  - Improve keyword usage

- Use **Custom instructions** to:
  - “Turn this into a step-by-step tutorial.”
  - “Shorten this to 150 words.”
  - “Rewrite this as a casual blog post.”

---

## Installation

### From source (development)

1. Make sure Node.js ≥ 16 is installed:

    ```bash
    node --version
    ```

2. Clone this repository into your Obsidian plugins folder:

    ```bash
    cd path/to/your/vault/.obsidian/plugins
    git clone https://github.com/your-username/obsidian-modai.git
    cd obsidian-modai
    ```

3. Install dependencies:

    ```bash
    npm i
    ```

4. Start the dev build (watch mode):

    ```bash
    npm run dev
    ```

5. In Obsidian:
    - Go to **Settings → Community plugins → Turn off Safe mode**.
    - Click **Browse**, then **Reload plugins** if needed.
    - Enable **Modai** in the list.

### Manual installation (built files)

If you already have `main.js`, `manifest.json`, and `styles.css`:

1. Create a folder in your vault:

    ```
    VaultFolder/.obsidian/plugins/obsidian-modai/
    ```

2. Copy the following files into that folder:
    - `main.js`
    - `manifest.json`
    - `styles.css`
3. In Obsidian, go to **Settings → Community plugins** and enable **Modai**.

---

## Development

This plugin is built with TypeScript and the Obsidian plugin API.

### Getting started

1. Clone the repo:

    ```bash
    git clone https://github.com/your-username/obsidian-modai.git
    cd obsidian-modai
    ```

2. Install dependencies:

    ```bash
    npm i
    ```

3. Start the dev watcher:

    ```bash
    npm run dev
    ```

4. Link or copy the repo into:

    ```
    VaultFolder/.obsidian/plugins/obsidian-modai/
    ```

5. Reload Obsidian and enable **Modai**.

### Building for release

To produce a production build (if configured):

```bash
npm run build
```

Then publish or manually copy:

- `main.js`
- `manifest.json`
- `styles.css`

into your vault’s plugin folder.

---

## Linting & Code Quality

ESLint is preconfigured:

```bash
npm run lint
```

This uses Obsidian’s ESLint plugin for Obsidian-specific best practices.  
A GitHub Action can be configured to lint all commits automatically.

---

## API & Further Reading

- Obsidian plugin API docs: <https://docs.obsidian.md>
- Obsidian community plugins: <https://obsidian.md/plugins>

Modai is designed to stay close to the standard Obsidian plugin workflow while giving you powerful, role-based ChatGPT editing directly inside your notes.
