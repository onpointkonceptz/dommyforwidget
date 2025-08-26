const API_KEY = "YOUR_GOOGLE_AI_API_KEY";
const chatBox = document.getElementById("chat-box");
const inputField = document.getElementById("user-input");
const sendButton = document.getElementById("send-btn");

sendButton.addEventListener("click", sendMessage);

async function sendMessage() {
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    displayMessage(userMessage, "user");
    inputField.value = "";

    const response = await callApi(userMessage);
    displayMessage(response, "bot");
}

async function callApi(message) {
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + API_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }]
            })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    } catch (err) {
        return "Error connecting to AI API.";
    }
}

function displayMessage(text, sender) {
    const messageElement = document.createElement("div");
    messageElement.className = sender;
    messageElement.innerText = text;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}
