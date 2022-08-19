import "regenerator-runtime/runtime.js";

// const baseUrl = "http://localhost:5000/";
const baseUrl = "https://backend-bo3523uimq-uc.a.run.app/";

/**
 * Sign up as a new user.
 */
async function signUp() {
  //
  // Create the Oauth URL.
  //
  const queryString = (params: unknown) =>
    Object.keys(params)
      .map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

  const params = {
    response_type: "code",
    redirect_uri: chrome.identity.getRedirectURL("oauth2"),
    client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ", // TODO
    scope: "tweet.read users.read offline.access",
    state: "state",
    code_challenge: "challenge",
    code_challenge_method: "plain",
  };

  const oauthUrl = `https://twitter.com/i/oauth2/authorize?${queryString(
    params
  )}`;

  //
  // Start the Oauth flow
  //
  chrome.identity.launchWebAuthFlow(
    {
      interactive: true,
      url: oauthUrl,
    },
    async (responseUrl) => {
      //
      // Get the twitter credentials.
      //
      const body = {
        code: new URLSearchParams(responseUrl).get("code"),
        grant_type: "authorization_code",
        client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ",
        redirect_uri: chrome.identity.getRedirectURL("oauth2"),
        code_verifier: "challenge",
      };

      const response = await fetch(baseUrl + "proxy/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error("Failed getting twitter credentials.");
        return;
      }

      const credentials = await response.json();

      //
      // Use the Twitter credentials to create a user on the server and log it in.
      //
      const signup = await fetch(baseUrl + "signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: credentials?.access_token,
          user_id: credentials?.user_id,
        },
      });

      if (!signup.ok) {
        console.error("Failed to sign up.");
        return;
      }

      const data = await signup.json();

      // Save the credentials, user and onboarding info.
      await chrome.storage.local.set({
        credentials: {
          ...credentials,
          user_id: data.user.id,
        },
        user: data.user,
        onboarding: {
          lists: data.lists,
          step: 0,
        },
      });

      // Send a message to the content script for the onboarding.
      chrome.windows.getCurrent((window) => {
        chrome.tabs.query({ active: true, windowId: window.id }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_ONBOARDING" });
        });
      });
    }
  );
}

/**
 * Get the saved credentials.
 */
async function getCredentials() {
  const data = await chrome.storage.local.get("credentials");
  return data.credentials;
}

/**
 * Get PageRank results.
 */
async function getResults() {
  //
  // If existing results exist that hasn't expired yet, return it.
  //
  const data = await chrome.storage.local.get();

  if (!data.onboarding) {
    return;
  }

  if (data?.results && data?.results?.expires_at > Date.now()) {
    return data.results;
  }

  const credentials = await getCredentials();

  let response: Response;

  try {
    response = await fetch(baseUrl + "results", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: credentials.access_token,
        user_id: credentials.user_id,
      },
    });
  } catch (e) {
    console.error("Failed to get results.");
    return;
  }

  if (!response.ok) {
    console.error("Failed to get results, invalid request.");
    return;
  }

  const body = await response.json();

  await chrome.storage.local.set({
    results: body,
  });
}

/**
 * Get the user's sync status.
 */
async function getSyncStatus() {
  const credentials = await getCredentials();

  const response = await fetch(baseUrl + "sync_status", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: credentials.access_token,
      user_id: credentials.user_id,
    },
  });

  if (!response.ok) {
    console.error("Failed to get results.");
    return;
  }

  const body = await response.json();

  await chrome.storage.local.set({
    sync_status: body,
  });

  return body;
}

/**
 * Post the selected reputation type and lists to the user's firebase profile.
 * This will trigger the crawling process for that user.
 */
async function onboardingFinished(onboarding: {
  type: string;
  selectedLists: string[];
}) {
  const credentials = await getCredentials();

  const response = await fetch(baseUrl + "onboarding_finished", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: credentials.access_token,
      user_id: credentials.user_id,
    },
    body: JSON.stringify({
      type: onboarding.type,
      lists: onboarding.selectedLists,
    }),
  });

  if (!response.ok) {
    console.error("Failed to finish onboarding.");
    return await chrome.storage.local.remove("onboarding");
  }
}

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type == "SIGN_UP") {
    signUp();
  } else if (message.type == "RESULTS") {
    getResults().then(() => sendResponse());
  } else if (message.type == "ONBOARDING_FINISHED") {
    onboardingFinished(message.onboarding);
  } else if (message.type == "SYNC_STATUS") {
    getSyncStatus().then(() => sendResponse());
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, message);
    });
  }

  return true;
});
