import "regenerator-runtime/runtime.js";

// chrome.contextMenus.create({
//   id: "feature_remover",
//   title: "Hide",
//   contexts: ["all"],
// });

chrome.action.onClicked.addListener(function (tab) {
  chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
    },
    files: ["sideBar.bundle.js"],
  });
});

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type == "OAUTH") {
    //
    // Fetch the Oauth code.
    //
    chrome.identity.launchWebAuthFlow(
      {
        interactive: true,
        url: message.oauth_url,
      },
      async (responseUrl) => {
        //
        // Create the URL-encoded body, including the code.
        //
        const body = new URLSearchParams({
          code: new URLSearchParams(responseUrl).get("code"),
          grant_type: "authorization_code",
          client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ",
          redirect_uri: chrome.identity.getRedirectURL("oauth2"),
          code_verifier: "challenge",
        });

        // Fetch the Oauth credentials using the URL-encoded body.
        const response = await fetch("https://api.twitter.com/2/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body,
        });

        // Return the credentials.
        const credentials = await response.json();
        sendResponse(credentials);
      }
    );
  }
});
