function getAllSidebarEntries() {
    let sidebar = document.querySelector('.flex.flex-col.gap-2.pb-2.text-token-text-primary.text-sm.mt-5');
    let entries = sidebar.querySelectorAll('a.flex.items-center.gap-2.p-2');
    let entriesArray = Array.from(entries);
    let results = [];

    entriesArray.forEach(entry => {
      let topicTitle = entry.querySelector('div.relative.grow.overflow-hidden.whitespace-nowrap').innerText;
      let url = entry.getAttribute('href');
      results.push({ title: topicTitle, url: url });
    });

    return results;
}

function scrollAndGetAllEntries(callback) {
    let scrollableContainer = document.querySelector('.flex-col.flex-1.transition-opacity.duration-500.relative.-mr-2.pr-2.overflow-y-auto');
    let scrollStep = 500;
    let maxScrollAttempts = 50;
    let scrollAttempts = 0;

    function scrollSidebarDown() {
        scrollableContainer.scrollBy(0, scrollStep);
        scrollAttempts++;
        if (scrollAttempts < maxScrollAttempts) {
            setTimeout(scrollSidebarDown, 200);
        } else {
            scrollToTopAndGetEntries();
        }
    }

    function scrollToTopAndGetEntries() {
        scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
            let results = getAllSidebarEntries();
            callback(results);
        }, 500);
    }

    scrollSidebarDown();
}

function clickLink(url) {
    let link = document.querySelector(`a[href="${url}"]`);
    if (link) {
        link.click();
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAllEntries") {
        scrollAndGetAllEntries((results) => {
            sendResponse({ results: results });
        });
        return true; // Keep the message channel open for sendResponse
    } else if (request.action === "clickLink") {
        clickLink(request.url);
    }
});