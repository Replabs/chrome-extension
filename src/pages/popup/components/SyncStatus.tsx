import React, { useState, useEffect } from "react";
import "@pages/popup/Popup.css";

const SyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState<{
    lists_done: number;
    lists_total: number;
  } | null>(null);

  const isDone = syncStatus && syncStatus.lists_done == syncStatus.lists_total;

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "SYNC_STATUS" }, () => {
      chrome.storage.local.get("sync_status").then((data) => {
        if (data?.sync_status) {
          setSyncStatus(data.sync_status);
        }
      });
    });
  }, []);

  return (
    <div className="SyncStatus">
      {!isDone && syncStatus && (
        <div className="Column">
          <div className="Row">
            <div className="PulseContainer">
              <div
                style={{
                  border: "5px solid #7df585",
                }}
                className="dot"
              ></div>
              <div
                style={{
                  border: "2.5px solid #c4f7c7",
                  backgroundColor: "#7df585",
                }}
                className="pulse"
              ></div>
            </div>
            <p>
              Preparing list {syncStatus.lists_done + 1}/
              {syncStatus.lists_total}
            </p>
          </div>
          <div
            style={{
              marginTop: "2px",
            }}
          >
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 400,
                color: "#566370",
              }}
            >
              This can take a while.
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 400,
                color: "#566370",
              }}
            >
              <a
                href="https://twitter.com/i/lists/1483456727219683332"
                target="_blank"
                rel="noreferrer"
              >
                See Demo List
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
