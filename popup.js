let allEntries = [];

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
});

document.getElementById('searchButton').addEventListener('click', () => {
    let searchTerm = document.getElementById('searchTerm').value;
    let isGptSearch = document.getElementById('searchToggle').checked;

    if (isGptSearch) {
        performGptSearch(searchTerm, allEntries)
            .then(results => {
                console.log("GPT results:", results);
                displayResults(results);
            })
            .catch(error => {
                console.error('GPT Search error:', error);
                // Optionally, display an error message to the user
                displayResults([{ title: 'Error: ' + error.message, url: '#' }]);
            });
    } else {
        let filteredResults = filterEntries(searchTerm, allEntries);
        displayResults(filteredResults);
    }
});

function filterEntries(searchTerm, entries) {
    return entries.filter(entry => 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
}

async function performGptSearch(searchTerm, allEntries) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: "performGptSearch", searchTerm: searchTerm, allEntries: allEntries },
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

document.getElementById('searchToggle').addEventListener('change', (event) => {
    let toggleText = document.getElementById('toggleText');
    if (event.target.checked) {
        toggleText.textContent = 'GPT Search';
    } else {
        toggleText.textContent = 'Simple Search';
    }
});