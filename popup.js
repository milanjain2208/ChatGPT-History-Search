let allEntries = [];
let apiKey = '';

document.addEventListener('DOMContentLoaded', () => {
    showLoadingPage();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getAllEntries" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                showSearchPage();
            } else {
                allEntries = response.results;
                showSearchPage();
            }
        });
    });

    // Load saved API key
    chrome.storage.sync.get('openaiApiKey', (result) => {
        if (result.openaiApiKey) {
            apiKey = result.openaiApiKey;
            document.getElementById('maskedApiKey').textContent = maskApiKey(apiKey);
            document.querySelector('.api-key-display-container').style.display = 'flex';
        }
    });
});

function showLoadingPage() {
    document.getElementById('loadingPage').style.display = 'block';
    document.getElementById('searchPage').style.display = 'none';
    document.getElementById('apiKeyPage').style.display = 'none';
}

// Function to perform search
function performSearch() {
    let searchTerm = document.getElementById('searchTerm').value;
    let isGptSearch = document.getElementById('searchToggle').checked;
    let searchButton = document.getElementById('searchButton');
    let loader = searchButton.querySelector('.loader');

    // Disable button and show loader
    searchButton.disabled = true;
    loader.style.display = 'inline-block';

    if (isGptSearch) {
        if (!apiKey) {
            showApiKeyPage();
            searchButton.disabled = false;
            loader.style.display = 'none';
            return;
        }
        performGptSearch(searchTerm, allEntries, apiKey)
            .then(results => {
                console.log("GPT results:", results);
                displayResults(results);
            })
            .catch(error => {
                console.error('GPT Search error:', error);
                displayResults([{ title: 'Error: ' + error.message, url: '#' }]);
            })
            .finally(() => {
                // Re-enable button and hide loader
                searchButton.disabled = false;
                loader.style.display = 'none';
            });
    } else {
        let filteredResults = filterEntries(searchTerm, allEntries);
        displayResults(filteredResults);
        // Re-enable button and hide loader
        searchButton.disabled = false;
        loader.style.display = 'none';
    }
}

// Add event listener for the search button click
document.getElementById('searchButton').addEventListener('click', performSearch);

// Add event listener for the Enter key press in the search input
document.getElementById('searchTerm').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
});

function filterEntries(searchTerm, entries) {
    return entries.filter(entry => 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
}

async function performGptSearch(searchTerm, allEntries, apiKey) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
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

function displayResults(results) {
    let resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Clear previous results
    
    if (results.length === 0) {
        // Display "No related results found" message
        let noResultsMessage = document.createElement('li');
        noResultsMessage.textContent = 'No related results found';
        noResultsMessage.className = 'no-results-message';
        resultsContainer.appendChild(noResultsMessage);
    } else {
        results.forEach(result => {
            let li = document.createElement('li');
            li.textContent = result.title;
            li.addEventListener('click', () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "clickLink",
                        url: result.url
                    });
                });
            });
            resultsContainer.appendChild(li);
        });
    }
}

function showApiKeyPage() {
  document.getElementById('searchPage').style.display = 'none';
  document.getElementById('apiKeyPage').style.display = 'block';
}

function showSearchPage() {
  document.getElementById('loadingPage').style.display = 'none';
  document.getElementById('searchPage').style.display = 'block';
  document.getElementById('apiKeyPage').style.display = 'none';
}

document.getElementById('saveApiKey').addEventListener('click', () => {
    const newApiKey = document.getElementById('apiKeyInput').value;
    chrome.storage.sync.set({ 'openaiApiKey': newApiKey }, () => {
        apiKey = newApiKey;
        document.getElementById('maskedApiKey').textContent = maskApiKey(apiKey);
        document.querySelector('.api-key-display-container').style.display = 'flex';
        showSearchPage();
        updateToggleText();
    });
});

document.getElementById('backButton').addEventListener('click', () => {
  showSearchPage();
});

document.getElementById('searchToggle').addEventListener('change', (event) => {
  updateToggleText();
});

document.getElementById('editApiKey').addEventListener('click', () => {
  showApiKeyPage();
});

function updateToggleText() {
  let toggleText = document.getElementById('toggleText');
  let editIcon = document.getElementById('editApiKey');
  let isGptSearch = document.getElementById('searchToggle').checked;

  if (isGptSearch) {
    if (apiKey) {
      toggleText.textContent = 'GPT Search';
      editIcon.style.display = 'inline';
    } else {
      showApiKeyPage();
    //   document.getElementById('searchToggle').checked = false;
    //   toggleText.textContent = 'Simple Search';
    //   editIcon.style.display = 'none';
    }
  } else {
    toggleText.textContent = 'Simple Search';
    editIcon.style.display = 'none';
  }
}

// Add an event listener for the "Clear API Key" icon button
document.getElementById('clearApiKey').addEventListener('click', () => {
  chrome.storage.sync.remove('openaiApiKey', () => {
    apiKey = '';
    document.getElementById('apiKeyInput').value = '';
    document.getElementById('maskedApiKey').textContent = '';
    document.querySelector('.api-key-display-container').style.display = 'none';
    updateToggleText();
  });
});

function maskApiKey(apiKey) {
    return apiKey.slice(0, 4) + '****' + apiKey.slice(-4);
}