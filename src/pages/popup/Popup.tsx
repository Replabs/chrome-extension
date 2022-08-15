import React, { useState, useEffect } from "react";
import "@pages/popup/Popup.css";

const Popup = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    chrome.storage.local.get("user").then((data) => {
      if (data?.user) {
        setUser(data?.user);
      }
    });
  }, []);

  // Start the Oauth flow, creating a user in Firebase.
  const signUp = async () => {
    chrome.runtime.sendMessage(
      {
        type: "SIGN_UP",
      },
      () => {
        // This will be called immediately, sendMessage is not asynchronous.
      }
    );
  };

  // Clear the local user information.
  const logOut = async () => {
    chrome.storage.local.clear();
    setUser(null);
  };

  return (
    <div className="App">
      {user && (
        <img
          src={user?.profile_image_url}
          className="profile-picture"
          alt="logo"
        />
      )}
      {user ? (
        <div>
          <h3>{user.name}</h3>
          <p>@{user.username}</p>
          <br></br>
          <button onClick={() => logOut()}>Log Out</button>
        </div>
      ) : (
        <button onClick={() => signUp()}>Log in</button>
      )}
    </div>
  );
};

export default Popup;
