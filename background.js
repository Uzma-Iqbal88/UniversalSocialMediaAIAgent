// Background service worker
// Handles installation and persistent state if needed

chrome.runtime.onInstalled.addListener(() => {
    console.log("Universal Social Media AI Agent installed.");
});
