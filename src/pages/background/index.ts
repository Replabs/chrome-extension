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
 * Sign up a new user.
 */
async function signUp(oauth_url: string) {
  //
  // Start the Oauth flow
  //
  return new Promise((res) => {
    chrome.identity.launchWebAuthFlow(
      {
        interactive: true,
        url: oauth_url,
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

        // Return the credentials.
        const credentials = await response.json();

        //
        // Use the Twitter credentials to create a user on the server and log it in.
        //
        const signupResponse = await fetch(url + "signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: credentials?.access_token,
          }),
        });

        const data = await signupResponse.json();

        // Return the Firebase login token.
        res({ ...data, refresh_token: credentials.refresh_token });
      }
    );
  });
}

/**
 * Log in an existing user.
 */
async function logIn(refresh_token: string) {
  //
  // Fetch a new twitter token from the refresh token.
  //

  const body = {
    client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ",
    refresh_token: refresh_token,
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

  const credentials = await response.json();

  console.log(credentials);

  //
  // Use the twitter token to log in to the server.
  //

  const apiResponse = await fetch(url + "login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: credentials?.access_token,
    }),
  });

  const data = await apiResponse.json();

  return { ...data, refresh_token: credentials.refresh_token };
}

/**
 * Get PageRank results.
 */
async function getResults(accessToken) {
  const base = await getBaseUrl();

  const response = await fetch(base + "results", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  return data;
}

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type == "SIGN_UP") {
    signUp(message.oauth_url).then((data) => {
      chrome.storage.local.set(data).then(() => {
        sendResponse(data);
      });
    });
  } else if (message.type == "LOG_IN") {
    logIn(message.refresh_token).then((data) => {
      chrome.storage.local.set(data).then(() => {
        sendResponse(data);
      });
    });
  } else if (message.type == "RESULTS") {
    getResults(message.access_token).then((data) => {
      chrome.storage.local.set(data).then(() => {
        sendResponse(data);
      });
    });
  }
});
