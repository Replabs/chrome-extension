console.info("content loaded");

/**
 * @description
 * Chrome extensions don't support modules in content scripts.
 */
import("./components/Demo");

async function run() {
  // Get the results.
  const results = await chrome.runtime.sendMessage({ type: "RESULTS" });

  console.info(results);
}

function addLocationObserver(callback) {
  console.log("Inside add location ob callback");
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: false };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(document.body, config);
}

function observerCallback() {
  if (window.location.href.startsWith("https://twitter.com")) {
    run();
  }
}

addLocationObserver(observerCallback);
observerCallback();
