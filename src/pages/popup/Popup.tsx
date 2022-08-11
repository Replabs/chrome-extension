import React, { useState, useEffect } from "react";
import logo from "@assets/img/logo.svg";
import "@pages/popup/Popup.css";

const Popup = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    chrome.storage.local.get("user").then((user) => {
      if (user) {
        setIsLoggedIn(true);

        const message = {
          type: "LOG_IN",
          refresh_token: JSON.parse(credentials).refresh_token,
        };

        chrome.runtime.sendMessage(message);
      }
    });

    const credentials = localStorage.getItem("twitter_credentials");
  }, []);

  const queryString = (params) =>
    Object.keys(params)
      .map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

  const logOut = async () => {
    localStorage.removeItem("twitter_credentials");

    setIsLoggedIn(false);
  };

  // Start the Twitter Oauth flow.
  const signUp = async () => {
    const params = {
      response_type: "code",
      redirect_uri: chrome.identity.getRedirectURL("oauth2"),
      client_id: "cjJKbEd2Vl9DM2FIQ0stRUxCeTE6MTpjaQ", // TODO
      scope: "tweet.read users.read offline.access",
      state: "state",
      code_challenge: "challenge",
      code_challenge_method: "plain",
    };

    const message = {
      type: "SIGN_UP",
      oauth_url: `https://twitter.com/i/oauth2/authorize?${queryString(
        params
      )}`,
    };

    chrome.runtime.sendMessage(message);
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
        {isLoggedIn ? (
          <button onClick={() => logOut()}>Log Out</button>
        ) : (
          <button onClick={() => signUp()}>Log In</button>
        )}
      </header>
    </div>
  );
};

export default Popup;
