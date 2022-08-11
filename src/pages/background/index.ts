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

        //
        // Use the Twitter credentials to create a user on the server and log it in.
        //
        const base = await getBaseUrl();

        const signupResponse = await fetch(base + "signup", {
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
        res(data);
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
  const body = new URLSearchParams({
    client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ",
    refresh_token: refresh_token,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body,
  });

  const credentials = await response.json();

  //
  // Use the twitter token to log in to the server.
  //
  const base = await getBaseUrl();

  const apiResponse = await fetch(base + "login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: credentials?.access_token,
    }),
  });

  const data = await apiResponse.json();

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
  }
});
