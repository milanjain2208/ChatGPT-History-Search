let allEntries = [];
let apiKey = '';

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getAllEntries" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                allEntries = response.results;
            }
        });
    });

    // Load saved API key
    chrome.storage.local.get('openaiApiKey', (result) => {
        if (result.openaiApiKey) {
            apiKey = result.openaiApiKey;
        }
    });
});

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
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: "performGptSearch", searchTerm: searchTerm, allEntries: allEntries, apiKey: apiKey },
            response => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.results);
                }
            }
        );
    });
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
  document.getElementById('searchPage').style.display = 'block';
  document.getElementById('apiKeyPage').style.display = 'none';
}

document.getElementById('saveApiKey').addEventListener('click', () => {
  apiKey = document.getElementById('apiKeyInput').value;
  chrome.storage.local.set({ 'openaiApiKey': apiKey }, () => {
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
      document.getElementById('searchToggle').checked = false;
      toggleText.textContent = 'Simple Search';
      editIcon.style.display = 'none';
    }
  } else {
    toggleText.textContent = 'Simple Search';
    editIcon.style.display = 'none';
  }
}