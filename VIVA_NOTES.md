# SPM Project Viva Notes - Universal Social Media AI Agent

## 1. Project Overview
- **Goal**: Create a browser-based AI agent that interprets natural language to automate social media interactions.
- **Key Innovation**: "Universal" selector logic. Instead of hardcoding `div.x1y2z` (which changes), we use `[aria-label='Like']` or `input[type='search']`.

## 2. Technical Stack
- **Environment**: Chrome Extension (Manifest V3).
- **Languages**: HTML, CSS, Vanilla JavaScript (ES6+).
- **No External APIs**: Does not use Graph API or Twitter API. Simulates user interaction directly on the DOM.

## 3. Agent Workflow
1.  **Input**: User types "Like first 5 posts".
2.  **Parsing**: Regex extracts intent (`LIKE_FEED`) and parameters (`count: 5`).
3.  **Heuristics**:
    - `findLikeButtons()` scans the DOM for elements looking like like buttons.
    - Filters for visibility (`offsetParent !== null`).
4.  **Execution**:
    - Loops through found buttons.
    - Scrolls if not enough buttons are found.
    - Adds `Math.random()` delays to appear human.

## 4. Challenges Solved
- **Dynamic Classes**: Modern frameworks (React, GraphQL) generate random class names (e.g., `css-1dbjc4n`).
    - *Solution*: Relied on semantic HTML (`role`, `aria-label`, `svg`) and relative positioning.
- **Asynchronous Loading**: Elements aren't always there.
    - *Solution*: Implemented `await delay()` and scrolling loops to wait for content.
- **Security**: Content Security Policy (CSP) restricts some script executions.
    - *Solution*: All logic runs inside the content script isolated world.

## 5. Future Scope
- **LLM Integration**: Intead of Regex, use a local LLM (gemma-2b-it) to parse complex intents.
- **Visual AI**: Use screenshot analysis (Canvas API) to identify buttons if DOM attributes are missing.
- **Cross-Platform**: Port to Firefox/Edge.
