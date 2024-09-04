document.getElementById('searchButton').addEventListener('click', () => {
    let searchTerm = document.getElementById('searchTerm').value;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "search", searchTerm: searchTerm }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          displayResults(response.results);
        }
      });
    });
  });

function displayResults(results) {
  let resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = ''; // Clear previous results
  results.forEach(result => {
    let li = document.createElement('li');
    li.textContent = result.title;
    li.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.update(tabs[0].id, { url: `https://chat.openai.com${result.url}` });
      });
    });
    resultsContainer.appendChild(li);
  });
}