import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    console.info("content view loaded");
  }, []);

  return <div className="content-view">content view</div>;
}
