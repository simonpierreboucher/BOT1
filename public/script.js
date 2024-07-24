document.addEventListener("DOMContentLoaded", async function() {
  const apiKeyResponse = await fetch('/.netlify/functions/get-api-key');
  const apiKeyData = await apiKeyResponse.json();
  const API_KEY = apiKeyData.apiKey;

  const chatInput = document.querySelector(".chat-input textarea");
  const sendChatbtn = document.querySelector(".chat-input span");
  const clearChatBtn = document.getElementById("clear-chat-btn");
  const chatbox = document.querySelector(".chatbox");

  let userMessage = null; // Variable to store user's message
  const inputInitHeight = chatInput.scrollHeight;
  let chatHistory = []; // Array to store chat history

  const createChatLi = (message, className) => {
    // Create a chat <li> element with passed message and class name
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", className);
    let chatContent =
      className === "outgoing"
        ? `<p></p>`
        : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi; // return chat <li> element
  };

  const generateResponse = (incomingChatli) => {
    // Generate a response from the bot
    const API_URL = "https://api.openai.com/v1/chat/completions";
    const messageElement = incomingChatli.querySelector("p");

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: chatHistory, // Send the chat history
      }),
    };

    console.log("Sending request to OpenAI API...");
    console.log("Request options:", requestOptions);

    fetch(API_URL, requestOptions)
      .then((res) => {
        console.log("Response received:", res);
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Data received:", data);
        const botMessage = data.choices[0].message.content.trim();
        messageElement.textContent = botMessage;

        // Add bot message to chat history
        chatHistory.push({ role: "assistant", content: botMessage });

        saveChatHistory();
      })
      .catch((error) => {
        console.error("Error:", error);
        messageElement.classList.add("error");
        messageElement.textContent =
          "Oops Something went wrong. Please try again.";
      })
      .finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
  };

  const handleChat = () => {
    userMessage = chatInput.value.trim(); // Get user entered message and remove extra whitespace
    if (!userMessage) return;

    // Clear the input textarea and set its height to default
    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    // Append the user's message to the chatbox
    const outgoingChatli = createChatLi(userMessage, "outgoing");
    chatbox.appendChild(outgoingChatli);
    chatbox.scrollTo(0, chatbox.scrollHeight);

    // Add user message to chat history
    chatHistory.push({ role: "user", content: userMessage });

    setTimeout(() => {
      // Display "Typing..." message while waiting for the response
      const incomingChatli = createChatLi("Typing...", "incoming");
      chatbox.appendChild(incomingChatli);
      generateResponse(incomingChatli);
    }, 600);
  };

  chatInput.addEventListener("input", () => {
    // Adjust the height of the input textarea based on its content
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  });

  chatInput.addEventListener("keydown", (e) => {
    // If Enter key is pressed without the Shift key and the window
    // width is greater than 800px, handle the chat
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
      e.preventDefault();
      handleChat();
    }
  });

  sendChatbtn.addEventListener("click", handleChat);

  // Clear chat history
  const clearChat = () => {
    chatbox.innerHTML = "";
    chatHistory = [];
    localStorage.removeItem("chatHistory");
  };

  clearChatBtn.addEventListener("click", clearChat);

  // Load chat history from localStorage
  const loadChatHistory = () => {
    const storedChatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    storedChatHistory.forEach(({ message, className }) => {
      const chatLi = createChatLi(message, className);
      chatbox.appendChild(chatLi);
    });

    chatHistory = storedChatHistory.map(({ message, className }) => ({
      role: className === "outgoing" ? "user" : "assistant",
      content: message,
    }));
  };

  // Save chat history to localStorage
  const saveChatHistory = () => {
    const chatHistoryForStorage = chatHistory.map(({ role, content }) => ({
      message: content,
      className: role === "user" ? "outgoing" : "incoming",
    }));

    localStorage.setItem("chatHistory", JSON.stringify(chatHistoryForStorage));
  };

  // Load chat history on page load
  loadChatHistory();
});
