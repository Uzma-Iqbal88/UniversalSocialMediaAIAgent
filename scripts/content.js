/**
 * Content Script
 * Bridges the popup UI and the UniversalAgent logic.
 */

// Wait for the agent class to load or import it (since we added it to 'js' array in manifest, it loads in global scope)
// In MV3, we can just assume it executes strictly in order.

if (typeof window.UniversalAgent === 'undefined') {
    console.error("UniversalAgent class not loaded!");
}

const agent = new window.UniversalAgent();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "EXECUTE_COMMAND") {
        console.log(`[Content] Received command: ${request.payload.command}`);
        agent.parseAndExecute(request.payload.command);
        sendResponse({ status: "received" });
    }
    return true; // Keep channel open
});

console.log("[Content] Universal Social Media Agent Ready.");
