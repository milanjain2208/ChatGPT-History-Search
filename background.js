chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "performGptSearch") {
    performGptSearch(request.searchTerm, request.allEntries)
      .then(results => sendResponse({ results: results }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keeps the message channel open for asynchronous response
  }
});

async function performGptSearch(searchTerm, allEntries) {
  const apiKey = ''; // Replace with your actual API key
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-0125",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant designed to find the most relevant ChatGPT conversation topics based on a user's search term. Analyze the provided conversation titles and return the most relevant matches in JSON format. The JSON should be an array of objects with a 'matches' property that contains an array of the most relevant matches. Something like this: {'matches': ['match1', 'match2', 'match3']}"
        },
        {
          role: "user",
          content: `Search term: "${searchTerm}". Conversation titles: ${JSON.stringify(allEntries.map(r => r.title))}`
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  console.log(response);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const gptResults = JSON.parse(data.choices[0].message.content);
  console.log(gptResults);
  return allEntries.filter(result => gptResults.matches.includes(result.title));
}
