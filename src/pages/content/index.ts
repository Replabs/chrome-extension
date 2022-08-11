console.log("content loaded");

/**
 * @description
 * Chrome extensions don't support modules in content scripts.
 */
import("./components/Demo");

function init() {
  // Get the results from storage.
  chrome.storage.local.get().then((data) => {
    if (data["results"]) {
      console.log(data["results"]);
    }
  });
}

function addLocationObserver(callback) {
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: false };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(document.body, config);
}

function observerCallback() {
  if (window.location.href.startsWith("https://twitter.com")) {
    init();
  }
}

addLocationObserver(observerCallback);
observerCallback();
