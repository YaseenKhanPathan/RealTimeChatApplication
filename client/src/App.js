// App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChatPage from "./pages/ChatPage";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/chat" : "/login"} />} />
      <Route path="/login" element={<Login setUser={setUser} />} />
      <Route path="/register" element={<Register setUser={setUser} />} />
      <Route path="/chat" element={user ? (
        <ChatPage
          user={user}
          onLogout={() => {
            localStorage.removeItem("userInfo");
            setUser(null);
          }}
        />
      ) : (
        <Navigate to="/login" />
      )} />
    </Routes>
  );
}

export default App;
