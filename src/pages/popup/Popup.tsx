import React, { useState, useEffect } from "react";
import "@pages/popup/Popup.css";

const Popup = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    chrome.storage.local.get(null).then((data) => {
      //
      // Set the user.
      //
      if (!data || !data.user) {
        return;
      }

      setUser(data.user);

      //
      // Log in the user in the backend.
      //
      // const message = {
      //   type: "LOG_IN",
      //   refresh_token: data.refresh_token,
      // };

      // chrome.runtime.sendMessage(message);
    });
  }, []);

  const queryString = (params) =>
    Object.keys(params)
      .map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

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

  const logOut = async () => {
    chrome.storage.local.clear();
    setUser(null);
  };

  return (
    <div className="App">
      {user && (
        <img src={user?.profile_image_url} className="App-logo" alt="logo" />
      )}
      {user ? (
        <div>
          <h3>{user.username}</h3>
          <br></br>
          <button onClick={() => logOut()}>Log Out</button>
        </div>
      ) : (
        <button onClick={() => signUp()}>Log In</button>
      )}
    </div>
  );
};

export default Popup;
