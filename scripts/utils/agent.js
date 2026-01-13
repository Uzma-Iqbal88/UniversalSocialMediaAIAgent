/**
 * Universal Social Media AI Agent
 * Handles command parsing, DOM heuristics, and action execution.
 */

class UniversalAgent {
    constructor() {
        this.isExecuting = false;
        this.platforms = {
            'twitter.com': 'twitter',
            'x.com': 'twitter',
            'facebook.com': 'facebook',
            'instagram.com': 'instagram',
            'linkedin.com': 'linkedin'
        };
        this.currentPlatform = this.detectPlatform();
    }

    log(message, type = 'info') {
        console.log(`[UniversalAgent] ${message}`);
        chrome.runtime.sendMessage({
            type: "AGENT_LOG",
            payload: { message, type }
        });
    }

    detectPlatform() {
        const hostname = window.location.hostname;
        for (const [domain, platform] of Object.entries(this.platforms)) {
            if (hostname.includes(domain)) return platform;
        }
        return 'generic';
    }

    async parseAndExecute(command) {
        if (this.isExecuting) {
            this.log("Agent is already running a task.", 'error');
            return;
        }
        this.isExecuting = true;

        try {
            const action = this.intentClassification(command);
            if (!action) {
                this.log(`Could not understand command: "${command}"`, 'error');
                return;
            }

            this.log(`Identified Intent: ${action.type}`, 'system');
            await this.executeAction(action);

            this.log("Command Execution Complete.", 'success');
            chrome.runtime.sendMessage({ type: "AGENT_COMPLETE" });

        } catch (error) {
            this.log(`Execution Error: ${error.message}`, 'error');
            chrome.runtime.sendMessage({ type: "AGENT_ERROR", payload: { error: error.message } });
        } finally {
            this.isExecuting = false;
        }
    }

    intentClassification(command) {
        const cmd = command.toLowerCase();

        // 1. Search
        const searchMatch = cmd.match(/search (?:for|posts about|about)?\s?(.+)/);
        if (searchMatch) {
            return { type: 'SEARCH', query: searchMatch[1] };
        }

        // 2. Like posts
        const likeMatch = cmd.match(/like (?:the )?(?:first )?(\d+|all|some) posts?/);
        if (likeMatch || cmd.includes("like posts")) {
            const count = likeMatch ? parseInt(likeMatch[1]) || 5 : 5; // Default 5
            return { type: 'LIKE_FEED', count };
        }

        // 3. Scroll
        const scrollMatch = cmd.match(/scroll (?:for )?(\d+) (?:seconds|secs)/);
        if (scrollMatch || cmd.includes("scroll")) {
            const duration = scrollMatch ? parseInt(scrollMatch[1]) : 10;
            return { type: 'SCROLL', duration };
        }

        // 4. Comment
        // Syntax: Comment "Message" on (this/current/first) post
        const commentMatch = cmd.match(/comment ['"](.+)['"]/);
        if (commentMatch) {
            return { type: 'COMMENT', text: commentMatch[1] };
        }

        return null; // Unknown command
    }

    async executeAction(action) {
        switch (action.type) {
            case 'SEARCH':
                await this.performSearch(action.query);
                break;
            case 'LIKE_FEED':
                await this.performLikeFeed(action.count);
                break;
            case 'SCROLL':
                await this.performScroll(action.duration);
                break;
            case 'COMMENT':
                await this.performComment(action.text);
                break;
            default:
                throw new Error("Action not implemented yet.");
        }
    }

    // --- HEURISTIC DOM FINDERS ---

    async findSearchBar() {
        // Broad selector strategy
        const selectors = [
            'input[type="search"]',
            'input[aria-label*="Search" i]',
            'input[placeholder*="Search" i]',
            'input[class*="search" i]',
            '[role="search"] input'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) return el; // Check visibility
        }
        throw new Error("Could not locate search bar.");
    }

    async findLikeButtons() {
        // Platform specific logic mixed with heuristics
        let selector = '';

        if (this.currentPlatform === 'twitter') {
            selector = '[data-testid="like"]';
        } else if (this.currentPlatform === 'instagram') {
            selector = 'svg[aria-label="Like"], span svg[aria-label="Like"]'; // Often wrapped or direct
            // Note: Instagram structure changes frequently.
        } else if (this.currentPlatform === 'linkedin') {
            selector = 'button[aria-label*="Like"]';
        } else if (this.currentPlatform === 'facebook') {
            selector = 'div[aria-label="Like"], span:contains("Like")'; // Harder for FB
        }

        // Generic fallback
        if (!selector) {
            selector = 'button[aria-label*="Like" i]';
        }

        const buttons = Array.from(document.querySelectorAll(selector));
        return buttons.filter(b => b.offsetParent !== null); // Visible only
    }

    // --- ACTION IMPLEMENTATIONS ---

    async performSearch(query) {
        this.log(`Searching for "${query}"...`);
        const searchInput = await this.findSearchBar();

        this.log("Found search bar. Typing...");
        searchInput.focus();
        // Mimic typing
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        await this.delay(500);

        // Press Enter
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        this.log("Submitted search query.");
    }

    async performLikeFeed(count) {
        this.log(`Attempting to like ${count} posts...`);
        let likedCount = 0;
        let attempts = 0;
        const maxAttempts = count * 5; // Avoid infinite loops

        while (likedCount < count && attempts < maxAttempts) {
            // Re-query DOM each iteration as we scroll
            const buttons = await this.findLikeButtons();

            // Filter out already liked ones if possible (platform dependent)
            // Heuristic: 'Unlike' usually means it's liked. 
            // Better: just click the ones we find that match "Like". 
            // If the selector was "Unlike", we skip. 
            // Our finder uses "Like" in aria-label, which usually changes to "Unlike" or "Remove Like" after clicking.

            let clickedInThisView = false;

            for (const btn of buttons) {
                if (likedCount >= count) break;

                // Simple visibility check (is it in viewport?)
                const rect = btn.getBoundingClientRect();
                if (rect.top > 0 && rect.top < window.innerHeight) {

                    // Check if already liked (heuristic for generic aria-label change)
                    const label = btn.getAttribute('aria-label') || "";
                    if (label.toLowerCase().includes("unlike")) continue;

                    this.log(`Clicking like button #${likedCount + 1}...`);
                    btn.click();
                    likedCount++;
                    clickedInThisView = true;
                    await this.delay(1000 + Math.random() * 1000); // Random delay
                }
            }

            if (!clickedInThisView || likedCount < count) {
                this.log("Scrolling to find more posts...");
                window.scrollBy({ top: 600, behavior: 'smooth' });
                await this.delay(2000); // Wait for load
            }
            attempts++;
        }

        if (likedCount < count) {
            this.log(`Finished, but only could like ${likedCount} posts.`);
        } else {
            this.log(`Successfully liked ${count} posts.`);
        }
    }

    async performScroll(seconds) {
        this.log(`Scrolling feed for ${seconds} seconds...`);
        const startTime = Date.now();

        while (Date.now() - startTime < seconds * 1000) {
            window.scrollBy({ top: 500, behavior: 'smooth' });
            await this.delay(1000 + Math.random() * 500);
        }
    }

    async performComment(text) {
        this.log("Comment feature is experimental.");
        // Very hard to do generically because comment boxes are often hidden behind "Reply" buttons or complex editors.
        // Simple attempt for Focused Element or visible textarea

        let commentBox = document.querySelector('div[role="textbox"], textarea, input[placeholder*="comment" i]');

        if (!commentBox) {
            this.log("Could not find an open comment box. Try opening one manually first.", 'error');
            return;
        }

        this.log("Found comment box. Typing...");
        commentBox.focus();

        // This is tricky for Rich Text Editors (Facebook/LinkedIn)
        // Try execCommand for older/some editors
        document.execCommand('insertText', false, text);

        // Fallback for simple inputs
        if (commentBox.value !== undefined) {
            commentBox.value = text;
            commentBox.dispatchEvent(new Event('input', { bubbles: true }));
        }

        this.log("Text entered. Please submit manually for safety.", 'system');
    }

    // --- UTILS ---

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for usage in content.js
window.UniversalAgent = UniversalAgent;
