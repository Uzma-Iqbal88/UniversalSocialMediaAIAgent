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

            this.log(`Identified Intent: ${action.type}` + (action.timeFilter ? ` [Time: ${action.timeFilter.value}h]` : ''), 'system');
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
        let timeFilter = null;

        // Extract Time Filter (e.g., "past 24 hours", "last 1h")
        // We do this first and remove it or just store it.
        const timeMatch = cmd.match(/(?:past|last) (\d+)\s?(hours?|h|days?|d)/);
        if (timeMatch) {
            let val = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            if (unit.startsWith('d')) val *= 24; // Convert days to hours
            timeFilter = { value: val, unit: 'hours' };
        }

        // 1. User Navigation
        // "Go to Elon Musk's profile", "Show posts by @user"
        const navMatch = cmd.match(/(?:go to|view|show|visit) (.+?)(?:'s)? (?:profile|page|feed)/) || cmd.match(/(?:show|view|find) posts (?:by|from) (.+)/);
        if (navMatch) {
            return { type: 'NAVIGATE_USER', target: navMatch[1].trim(), timeFilter };
        }

        // 2. Search
        const searchMatch = cmd.match(/search (?:for|posts about|about)?\s?(.+)/);
        if (searchMatch && !searchMatch[1].includes("comment")) {
            return { type: 'SEARCH', query: searchMatch[1], timeFilter };
        }

        // 3. Like posts
        const likeMatch = cmd.match(/like (?:the )?(?:first )?(\d+|all|some) posts?/);
        if (likeMatch || cmd.includes("like posts")) {
            const count = likeMatch ? (likeMatch[1] === 'all' ? 20 : parseInt(likeMatch[1]) || 5) : 5;
            return { type: 'LIKE_FEED', count, timeFilter };
        }

        // 4. Scroll
        const scrollMatch = cmd.match(/scroll (?:for )?(\d+) (?:seconds|secs)/);
        if (scrollMatch || cmd.includes("scroll")) {
            const duration = scrollMatch ? parseInt(scrollMatch[1]) : 10;
            return { type: 'SCROLL', duration };
        }

        // 5. Comment
        // Syntax: Comment "Message" on (this/current/first) post
        const commentMatch = cmd.match(/comment ['"](.+)['"]/);
        if (commentMatch) {
            return { type: 'COMMENT', text: commentMatch[1] };
        }

        return null; // Unknown command
    }

    async executeAction(action) {
        switch (action.type) {
            case 'NAVIGATE_USER':
                await this.performNavigateUser(action.target);
                break;
            case 'SEARCH':
                await this.performSearch(action.query);
                break;
            case 'LIKE_FEED':
                await this.performLikeFeed(action.count, action.timeFilter);
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
        const selectors = [
            'input[type="search"]',
            'input[aria-label*="Search" i]',
            'input[placeholder*="Search" i]',
            'input[class*="search" i]',
            '[role="search"] input'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) return el;
        }
        throw new Error("Could not locate search bar.");
    }

    async findLikeButtons() {
        let selector = '';
        if (this.currentPlatform === 'twitter') selector = '[data-testid="like"]';
        else if (this.currentPlatform === 'instagram') selector = 'svg[aria-label="Like"], span svg[aria-label="Like"]';
        else if (this.currentPlatform === 'linkedin') selector = 'button[aria-label*="Like"]';
        else if (this.currentPlatform === 'facebook') selector = 'div[aria-label="Like"]';

        if (!selector) selector = 'button[aria-label*="Like" i]';

        const buttons = Array.from(document.querySelectorAll(selector));
        return buttons.filter(b => b.offsetParent !== null);
    }

    // --- ACTION IMPLEMENTATIONS ---

    async performNavigateUser(target) {
        this.log(`Navigating to user: ${target}`);
        
        // Clean username (remove @)
        const username = target.replace('@', '').replace(/ /g, '');

        if (this.currentPlatform === 'twitter') {
             window.location.href = `https://x.com/${username}`;
        } else if (this.currentPlatform === 'instagram') {
             window.location.href = `https://instagram.com/${username}`;
        } else if (this.currentPlatform === 'facebook') {
             window.location.href = `https://facebook.com/${username}`;
        } else {
            // Generic Search fallback
            this.log(`Direct navigation not supported for ${this.currentPlatform}, searching instead...`);
            await this.performSearch(target);
        }
        await this.delay(3000); // Wait for page load
    }

    async performSearch(query) {
        this.log(`Searching for "${query}"...`);
        const searchInput = await this.findSearchBar();

        this.log("Found search bar. Typing...");
        searchInput.focus();
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        await this.delay(500);
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        this.log("Submitted search query.");
    }

    async performLikeFeed(count, timeFilter) {
        this.log(`Attempting to like ${count} posts${timeFilter ? ` (newer than ${timeFilter.value}h)` : ''}...`);
        let likedCount = 0;
        let attempts = 0;
        const maxAttempts = count * 5;

        while (likedCount < count && attempts < maxAttempts) {
            const buttons = await this.findLikeButtons();
            let clickedInThisView = false;

            for (const btn of buttons) {
                if (likedCount >= count) break;

                const rect = btn.getBoundingClientRect();
                if (rect.top > 0 && rect.top < window.innerHeight) {

                    // Check Time Filter
                    if (timeFilter) {
                        const postContainer = btn.closest('article, div[role="article"], .feed-shared-update-v2');
                        if (postContainer) {
                            const isNew = this.checkPostTime(postContainer, timeFilter.value);
                            if (!isNew) {
                                // this.log("Skipping post (too old).", 'system');
                                continue; 
                            }
                        }
                    }

                    const label = btn.getAttribute('aria-label') || "";
                    if (label.toLowerCase().includes("unlike") || label.toLowerCase().includes("remove")) continue;

                    this.log(`Clicking like button #${likedCount + 1}...`);
                    btn.click();
                    likedCount++;
                    clickedInThisView = true;
                    await this.delay(1000 + Math.random() * 1000);
                }
            }

            if (!clickedInThisView || likedCount < count) {
                this.log("Scrolling...");
                window.scrollBy({ top: 600, behavior: 'smooth' });
                await this.delay(2000);
            }
            attempts++;
        }
        this.log(`Finished. Liked ${likedCount} posts.`);
    }

    checkPostTime(postElement, maxHours) {
        // Heuristic: Find any <time> element or text that looks like a date
        const timeEl = postElement.querySelector('time');
        let date = null;

        if (timeEl && timeEl.getAttribute('datetime')) {
            date = new Date(timeEl.getAttribute('datetime'));
        } else {
            // Text search (very rough) - "2h", "5m", "Jan 12"
            // If it says "2h" or "5m", it's definitely recent enough for 24h
            const text = postElement.innerText;
            if (text.match(/\b([1-9]|1[0-9]|2[0-3])h\b/)) return true; // 1h-23h
            if (text.match(/\b\d+m\b/)) return true; // minutes
            if (text.match(/\b\d+s\b/)) return true; // seconds
            if (text.includes("Just now")) return true;
        }

        if (date) {
            const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
            return diffHours <= maxHours;
        }
        
        // Default to TRUE if uncertain, to be safe.
        return true;
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
        this.log(`Commenting: "${text}"`);
        
        // 1. Find Reply Icon/Button
        // Twitter: data-testid="reply"
        let replyBtn = document.querySelector('[data-testid="reply"]');
        if (!replyBtn) replyBtn = document.querySelector('[aria-label*="Comment" i], [aria-label*="Reply" i]');

        if (replyBtn) {
            this.log("Found reply button, clicking...");
            replyBtn.click();
            await this.delay(1000);
        }

        // 2. Find Input
        const commentBox = document.querySelector('[role="textbox"], textarea, [contenteditable="true"]');
        if (!commentBox) {
            this.log("Could not find comment input.", 'error');
            return;
        }

        // 3. Type
        this.log("Typing comment...");
        commentBox.focus();
        document.execCommand('insertText', false, text);
        
        // Trigger events
        commentBox.dispatchEvent(new Event('input', { bubbles: true }));

        // 4. Submit (Optional/Risky - maybe just leave it filled)
        this.log("Comment typed. Please press Send manually.", 'success');
        
        // Try to find send button but don't click for now? 
        // const sendBtn = document.querySelector('[data-testid="tweetButton"], [aria-label="Send"], [aria-label="Reply"]');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for usage in content.js
window.UniversalAgent = UniversalAgent;
