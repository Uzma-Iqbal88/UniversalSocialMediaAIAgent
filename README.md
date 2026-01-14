# Universal Social Media AI Agent 🤖

A Chrome Extension that allows you to control social media platforms (Twitter/X, Facebook, LinkedIn, Instagram) using natural language commands.

## 🚀 Features

- **Universal Control**: Works on multiple platforms using heuristic DOM analysis.
- **Natural Language**: Understands commands like "Search for AI news", "Like first 5 posts", "Scroll for 20 seconds".
- **Human-like Logic**: Uses random delays and scrolling to mimic human behavior.
- **Ethical Design**: Runs entirely in the browser, no API keys required, educational focus.

## 📂 Installation

1.  **Clone/Download** this repository.
2.  Open Chrome and go to `chrome://extensions`.
3.  Enable **Developer Mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the folder `d:/SPM/UniversalSocialMediaAIAgent`.

## 🎮 Usage

1.  Navigate to a supported site (e.g., [x.com](https://x.com)).
2.  Click the **AI Agent** extension icon.
3.  Type a command in the popup:
    - *"Search for machine learning"*
    - *"Like first 5 posts"*
    - *"Like posts from past 24 hours"*
    - *"Go to Elon Musk's profile"*
    - *"Comment 'Great post!' on this post"* (Experimental)
    - *"Scroll 10 seconds"*
4.  Click **Execute**.
5.  Watch the logs in the popup and the actions on the page.

## 🏗️ Architecture

- **Manifest V3**: Modern extension standard.
- **Popup**: UI for user interaction.
- **Content Script**: Injects `UniversalAgent` class into the page.
- **Agent Logic**: Uses `querySelector` and `MutationObserver` strategies to find elements dynamically without hardcoded class names (where possible).

## ⚠️ Limitations & Ethics

- **DOM Changes**: Social media sites change their HTML frequently. Heuristics may fail if sites undergo major redesigns.
- **Rate Limits**: Excessive automated actions (liking too fast) can trigger platform bot detection. The agent includes delays to mitigate this, but use responsibly.
- **Educational Use**: This tool is for SPM academic demonstration purposes.
