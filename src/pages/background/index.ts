import "regenerator-runtime/runtime.js";

/**
 * Return the base URL for the backend server.
 */
async function getBaseUrl() {
  return new Promise((res) => {
    chrome.management.get(chrome.runtime.id, function (extensionInfo) {
      if (extensionInfo.installType === "production") {
        res("https://foo.com/"); // TODO
      }

      res("http://127.0.0.1:5000/");
    });
  });
}

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
      const url = await getBaseUrl();
      const body = {
        code: new URLSearchParams(responseUrl).get("code"),
        grant_type: "authorization_code",
        client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ",
        redirect_uri: chrome.identity.getRedirectURL("oauth2"),
        code_verifier: "challenge",
      };

      const response = await fetch(url + "proxy/oauth", {
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

      credentials.access_token_expires_at =
        Date.now() + credentials.expires_in * 1000; // Convert from seconds to milliseconds.

      //
      // Use the Twitter credentials to create a user on the server and log it in.
      //
      const signup = await fetch(url + "signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: credentials?.access_token,
        },
      });

      if (!signup.ok) {
        console.error("Failed to sign up.");
        return;
      }

      const data = await signup.json();

      // Save the credentials, user and onboarding info.
      await chrome.storage.local.set({
        credentials: credentials,
        user: data.user,
        onboarding: {
          lists: data.lists,
          step: 0,
        },
      });

      // Send a message to the content script for the onboarding.
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_ONBOARDING" });
      });
    }
  );
}

/**
 * Verify that the user has a valid access token. Refresh the token if not.
 */
async function getCredentials() {
  const data = await chrome.storage.local.get("credentials");

  if (data?.credentials?.access_token_expires_at < Date.now()) {
    const body = {
      client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ",
      refresh_token: data.credentials.refresh_token,
      grant_type: "refresh_token",
    };

    const url = await getBaseUrl();

    const response = await fetch(url + "proxy/oauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Faield to get credentials.");
      return;
    }

    const newCredentials = await response.json();

    await chrome.storage.local.set({ credentials: newCredentials });

    return newCredentials;
  }

  return data.credentials;
}

/**
 * Get PageRank results.
 */
async function getResults() {
  //
  // If existing results exist that hasn't expired yet, return it.
  //
  const data = await chrome.storage.local.get("onboarding");

  if (!data.onboard) {
    return;
  }

  if (data?.results && data?.results?.expires_at > Date.now()) {
    return data.results;
  }

  // Get an access token, using the refresh token if needed.
  const credentials = await getCredentials();

  const base = await getBaseUrl();

  const response = await fetch(base + "results", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: credentials.access_token,
    },
  });

  if (!response.ok) {
    console.error("Failed to get results.");
    return;
  }

  const body = await response.json();

  await chrome.storage.local.set({
    results: body,
  });

  return body;
}

/**
 * Get the user's sync status.
 */
async function getSyncStatus() {
  // Get an access token, using the refresh token if needed.
  const credentials = await getCredentials();

  const base = await getBaseUrl();

  const response = await fetch(base + "sync_status", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: credentials.access_token,
    },
  });

  if (!response.ok) {
    console.error("Failed to get results.");
    return;
  }

  const body = await response.json();

  console.log(body);

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
  // Get an access token, using the refresh token if needed.
  const credentials = await getCredentials();

  const base = await getBaseUrl();

  const response = await fetch(base + "onboarding_finished", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: credentials.access_token,
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

chrome.runtime.onMessage.addListener((message) => {
  if (message.type == "SIGN_UP") {
    signUp();
  } else if (message.type == "RESULTS") {
    getResults();
  } else if (message.type == "ONBOARDING_FINISHED") {
    onboardingFinished(message.onboarding);
  } else if (message.type == "SYNC_STATUS") {
    getSyncStatus();
  }
});
