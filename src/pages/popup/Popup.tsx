import React from "react";
import logo from "@assets/img/logo.svg";
import "@pages/popup/Popup.css";

const Popup = () => {
  const queryString = (params) =>
    Object.keys(params)
      .map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

  // Start the Twitter Oauth flow.
  const login = async () => {
    const params = {
      response_type: "code",
      redirect_uri: chrome.identity.getRedirectURL("oauth2"),
      client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ", // TODO
      scope: "tweet.read users.read offline.access",
      state: "state",
      code_challenge: "challenge",
      code_challenge_method: "plain",
    };

    // Build the authorization url.
    const messagePayload = {
      type: "OAUTH",
      oauth_url: `https://twitter.com/i/oauth2/authorize?${queryString(
        params
      )}`,
    };

    // Send the authorization url to a background script function that returns the Oauth credentials.
    chrome.runtime.sendMessage(messagePayload, (credentials) => {
      // Save the credentials in localStorage.
      localStorage.setItem("twitter_credentials", JSON.stringify(credentials));

      alert("Worked");
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/pages/popup/Popup.jsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React!
        </a>
        <button onClick={() => login()}>Login</button>
      </header>
    </div>
  );
};

export default Popup;
