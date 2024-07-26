let totalInputTokens = 0;
let totalOutputTokens = 0;
let apiKey = '';
let costPerMillionInputTokens;
let costPerMillionOutputTokens;

function clearContent(){
    document.getElementById('chatbox').innerHTML = '';
    totalInputTokens = 0;
    totalOutputTokens = 0;
    updateTokenAndCostDisplay();
}

function printConversation() {
    const printWindow = window.open('', '_blank');
    const printContent = document.getElementById('chatbox').innerHTML;
    printWindow.document.write('<html><head><title>Print Conversation</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css">');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="container-fluid">');
    printWindow.document.write(printContent);
    printWindow.document.write('</div></body></html>');
    printWindow.document.close();
    printWindow.print();
}

function updateTokenAndCostDisplay() {
    document.getElementById('inputTokenCount').innerText = `Input Tokens: ${totalInputTokens}`;
    document.getElementById('outputTokenCount').innerText = `Output Tokens: ${totalOutputTokens}`;
    const totalCost = (totalInputTokens / 1e6 * costPerMillionInputTokens) + (totalOutputTokens / 1e6 * costPerMillionOutputTokens);
    document.getElementById('cost').innerText = `Cost: $${totalCost.toFixed(6)}`;
}

const chatbox = $("#chatbox");
const userInput = $("#userInput");
const sendButton = $("#sendButton");
let messages = [];
let userScrolled = false;

const systemMessage = {
    "role": "system",
    "content": "You are an assistant deployed by LLM-HUB named DAN, you are knowledgeable. If user ask you who are, answer DAN from LLM-HUB"
};

chatbox.on('scroll', () => {
    if (chatbox.scrollTop() + chatbox.innerHeight() >= chatbox[0].scrollHeight - 10) {
        userScrolled = false;
    } else {
        userScrolled = true;
    }
});

sendButton.on("click", () => {
    const message = userInput.val();
    if (message) {
        const inputTokens = message.split(/\s+/).length;
        totalInputTokens += inputTokens;
        messages.push({
            "role": "user",
            "content": message
        });
        const displaytext = window.markdownit().render(message);
        let userMessageHtml = '<pre><div class="message right-side">' + displaytext + '<i class="far fa-clipboard copy-icon"></i></div></pre>';
        chatbox.append(userMessageHtml);
        if (!userScrolled) {
            chatbox.scrollTop(chatbox.prop("scrollHeight"));
        }
        userInput.val("");
        sendButton.val("Generating Response...");
        sendButton.prop("disabled", true);
        fetchMessages();
    }
});

userInput.on("keydown", (event) => {
    if (event.keyCode === 13 && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        sendButton.click();
    } else if (event.keyCode === 13 && (event.ctrlKey || event.shiftKey)) {
        event.preventDefault();
        const cursorPosition = userInput.prop("selectionStart");
        const currentValue = userInput.val();

        userInput.val(
            currentValue.slice(0, cursorPosition) +
            "\n" +
            currentValue.slice(cursorPosition)
        );
        userInput.prop("selectionStart", cursorPosition + 1);
        userInput.prop("selectionEnd", cursorPosition + 1);
    }
});

$(document).on('click', '.copy-icon', function() {
    const messageText = $(this).parent().text();
    const tempTextarea = document.createElement("textarea");
    tempTextarea.value = messageText;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextarea);
    
    // Display "Copied!" popup
    var copyPopup = document.getElementById("copy-popup");
    copyPopup.style.display = "block";
    setTimeout(function() {
        copyPopup.style.display = "none";
    }, 1000); // Display for 1 second
});

async function fetchApiKey() {
    try {
        const response = await fetch('/.netlify/functions/get-openai-key');
        const data = await response.json();
        apiKey = data.key;
    } catch (error) {
        console.error('Error fetching API key:', error);
    }
}

fetchApiKey();

async function fetchMessages() {
    const model = selectedModel;
    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
    };
    const body = JSON.stringify({
        model: model,
        messages: [systemMessage, ...messages],
        stream: true
    });

    const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullMessage = "";
    let liveMessageHtml = '<pre><div class="message left-side"><i class="far fa-clipboard copy-icon"></i></div></pre>';
    let liveMessage = $(liveMessageHtml).appendTo(chatbox);
    let messageDiv = liveMessage.find('.left-side');

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const parsedText = text.split("\n").filter(line => line.trim() !== "").map(line => {
            try {
                return JSON.parse(line.replace(/^data: /, ""));
            } catch (e) {
                console.error("Parsing error:", e);
                return null;
            }
        }).filter(Boolean);

        for (const message of parsedText) {
            if (message.choices) {
                const content = message.choices[0].delta.content;
                if (content) {
                    const outputTokens = content.split(/\s+/).length;
                    totalOutputTokens += outputTokens;
                    fullMessage += content;
                    messageDiv.text(fullMessage).append('<i class="far fa-clipboard copy-icon"></i>');
                    if (!userScrolled) {
                        chatbox.scrollTop(chatbox.prop("scrollHeight"));
                    }
                    updateTokenAndCostDisplay();
                }
            }
        }
    }

    messages.push({
        "role": "assistant",
        "content": fullMessage
    });
    sendButton.val("SUBMIT");
    sendButton.prop("disabled", false);
}

// Show model selection modal on page load
$(document).ready(function() {
    $('#modelSelectionModal').modal('show');
});

let selectedModel;

document.getElementById('selectGpt4Mini').addEventListener('click', function() {
    selectedModel = "gpt-4o-mini";
    costPerMillionInputTokens = 0.15;
    costPerMillionOutputTokens = 0.60;
    $('#modelSelectionModal').modal('hide');
    sendButton.prop("disabled", false);
});

document.getElementById('selectGpt4Turbo').addEventListener('click', function() {
    selectedModel = "gpt-4-turbo";
    costPerMillionInputTokens = 10;
    costPerMillionOutputTokens = 30;
    $('#modelSelectionModal').modal('hide');
    sendButton.prop("disabled", false);
});

document.getElementById('selectGpt4').addEventListener('click', function() {
    selectedModel = "gpt-4o";
    costPerMillionInputTokens = 5;
    costPerMillionOutputTokens = 15;
    $('#modelSelectionModal').modal('hide');
    sendButton.prop("disabled", false);
});
