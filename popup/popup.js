document.addEventListener('DOMContentLoaded', () => {
    const executeBtn = document.getElementById('executeBtn');
    const commandInput = document.getElementById('commandInput');
    const logsContainer = document.getElementById('logs');

    executeBtn.innerText = "Run Command";

    // Logger utility
    function addLog(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    executeBtn.addEventListener('click', async () => {
        const command = commandInput.value.trim();
        if (!command) {
            addLog("Please enter a command.", "error");
            return;
        }

        addLog(`Sending command: "${command}"...`, "system");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                addLog("No active tab found.", "error");
                return;
            }

            // Send message to content script
            chrome.tabs.sendMessage(tab.id, { 
                type: "EXECUTE_COMMAND", 
                payload: { command } 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    addLog("Error: " + chrome.runtime.lastError.message, "error");
                    addLog("Make sure you are on a supported social media site and reload the page.", "system");
                } else {
                    addLog("Agent started...", "success");
                }
            });

        } catch (err) {
            addLog("Unexpected error: " + err.message, "error");
        }
    });

    // Listen for logs from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "AGENT_LOG") {
            addLog(message.payload.message, message.payload.type || 'info');
        }
        if (message.type === "AGENT_COMPLETE") {
            addLog("✅ Task Completed", "success");
        }
        if (message.type === "AGENT_ERROR") {
            addLog("❌ " + message.payload.error, "error");
        }
    });
});
