import React, { useEffect, useState } from "react";
import AdminPanel from "./components/AdminPanel";
import UserPanel from "./components/UserPanel";
import { ethers } from "ethers";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import './App.css'

function AppContent() {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      // Lấy địa chỉ ví nếu đã kết nối
      ethProvider.listAccounts().then(accounts => {
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0].address || accounts[0]);
        }
      });
    }
  }, []);

  async function connectWallet() {
    if (!window.ethereum) return alert("Cài Metamask để sử dụng!");
    const ethProvider = new ethers.BrowserProvider(window.ethereum);
    await ethProvider.send("eth_requestAccounts", []);
    const signer = await ethProvider.getSigner();
    setAddress(await signer.getAddress());
    setProvider(ethProvider);
  }

  const location = useLocation();

  return (
    <div style={{padding: 20}}>
      <h1>Football Betting DApp</h1>
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 16}}>
        {location.pathname === '/user' && (
          <Link to="/user"><button style={{background: '#4fc3f7', minWidth: 100}}>User</button></Link>
        )}
        {location.pathname === '/admin' && (
          <Link to="/admin"><button style={{background: '#4fc3f7', minWidth: 100}}>Admin</button></Link>
        )}
        {address ? (
          <span style={{color: '#4fc3f7', fontWeight: 600, fontSize: 16}}>
            Connected: {address.slice(0,6)}...{address.slice(-4)}
          </span>
        ) : (
          <button onClick={connectWallet} style={{minWidth: 120}}>Connect Wallet</button>
        )}
      </div>
      <hr />
      {!provider && <div>Please connect your Metamask wallet to use the DApp.</div>}
      <Routes>
        <Route path="/user" element={provider && <UserPanel provider={provider} address={address} />} />
        <Route path="/admin" element={provider && <AdminPanel provider={provider} />} />
        <Route path="*" element={<Navigate to="/user" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
