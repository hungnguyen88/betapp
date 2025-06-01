import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export default function AdminPanel({ provider }) {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [startTime, setStartTime] = useState("");
  const [matchId, setMatchId] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("");
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (provider) fetchMatches();
    // eslint-disable-next-line
  }, [provider]);

  async function fetchMatches() {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const matchCount = await contract.matchCount();
      let arr = [];
      for (let i = 0; i < matchCount; i++) {
        const m = await contract.getMatch(i);
        arr.push({
          id: i,
          teamA: m[0],
          teamB: m[1],
          startTime: new Date(Number(m[2]) * 1000).toLocaleString(),
          finished: m[3],
        });
      }
      setMatches(arr);
    } catch (e) {
      // ignore
    }
  }

  async function createMatch() {
    try {
      if (!teamA.trim() || !teamB.trim()) {
        setStatus("Please enter both team names!");
        return;
      }
      if (!startTime) {
        setStatus("Please select a start time!");
        return;
      }
      const unixTime = Math.floor(new Date(startTime).getTime() / 1000);
      if (isNaN(unixTime) || unixTime <= 0) {
        setStatus("Invalid time!");
        return;
      }
      setStatus("Sending transaction...");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.createMatch(teamA, teamB, unixTime);
      await tx.wait();
      setStatus("Match created successfully!");
      setTeamA("");
      setTeamB("");
      setStartTime("");
      await fetchMatches();
      setTimeout(() => {
        setStatus("");
      }, 5000);
    } catch (e) {
      if (e && e.message && e.message.includes("Only owner")) {
        setStatus("You do not have permission to create a match!");
      } else {
        setStatus("Error: " + e.message);
      }
    }
  }

  async function setMatchResult() {
    try {
      setStatus("Sending transaction...");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.setResult(matchId, result);
      await tx.wait();
      setStatus("Result set successfully!");
      setMatchId("");
      setResult("");
      await fetchMatches();
      setTimeout(() => {
        setStatus("");
      }, 5000);
    } catch (e) {
      if (e && e.message && e.message.includes("Only owner")) {
        setStatus("You do not have permission to set the match result!");
      } else {
        setStatus("Error: " + e.message);
      }
    }
  }

  // Tìm match đang chọn
  const selectedMatch = matches.find(m => String(m.id) === String(matchId));

  return (
    <div style={{width: '400px', maxWidth: '90vw', margin: '40px auto', background: '#23272f', borderRadius: 18, boxShadow: '0 2px 16px #0006', padding: 32, color: '#fff'}}>
      <h2 style={{textAlign: 'center', color: '#4fc3f7', marginBottom: 24}}>Admin Panel</h2>
      <h4 style={{marginBottom: 12}}>Create New Match</h4>
      <div style={{display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24}}>
        <input style={{padding: 10, borderRadius: 8, border: '1px solid #444', background: '#181a20', color: '#fff'}} placeholder="Team A" value={teamA} onChange={e => setTeamA(e.target.value)} />
        <input style={{padding: 10, borderRadius: 8, border: '1px solid #444', background: '#181a20', color: '#fff'}} placeholder="Team B" value={teamB} onChange={e => setTeamB(e.target.value)} />
        <input style={{padding: 10, borderRadius: 8, border: '1px solid #444', background: '#181a20', color: '#fff'}} type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <button style={{background: '#4fc3f7', color: '#222', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer'}} onClick={createMatch}>Create Match</button>
      </div>
      <hr style={{margin: '32px 0', borderColor: '#444'}} />
      <h4 style={{marginBottom: 12}}>Set Match Result</h4>
      <div style={{display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16}}>
        <select style={{padding: 10, borderRadius: 8, border: '1px solid #444', background: '#181a20', color: '#fff'}} value={matchId} onChange={e => { setMatchId(e.target.value); setResult(""); }}>
          <option value="">Select match</option>
          {matches.filter(m => !m.finished).map(m => (
            <option key={m.id} value={m.id}>{m.id} - {m.teamA} vs {m.teamB} - {m.startTime}</option>
          ))}
        </select>
        <select style={{padding: 10, borderRadius: 8, border: '1px solid #444', background: '#181a20', color: '#fff'}} value={result} onChange={e => setResult(e.target.value)} disabled={!selectedMatch}>
          <option value="">Select result</option>
          {selectedMatch && <option value="1">{selectedMatch.teamA} wins</option>}
          {selectedMatch && <option value="2">{selectedMatch.teamB} wins</option>}
          {selectedMatch && <option value="3">Draw</option>}
        </select>
        <button style={{background: '#81c784', color: '#222', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer'}} onClick={setMatchResult} disabled={!matchId || !result}>Set Result</button>
      </div>
      <div style={{color: status.includes('success') ? '#81c784' : status.includes('Error') ? '#e57373' : '#ffd54f', marginTop: 10, textAlign: 'center', fontWeight: 600}}>{status}</div>
    </div>
  );
} 