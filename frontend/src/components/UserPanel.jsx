import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export default function UserPanel({ provider, address }) {
  const [matches, setMatches] = useState([]);
  const [betAmount, setBetAmount] = useState("");
  const [betTeam, setBetTeam] = useState("");
  const [betMatchId, setBetMatchId] = useState("");
  const [status, setStatus] = useState("");
  const [myBets, setMyBets] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (matches.length > 0 && address) fetchMyBets();
    // eslint-disable-next-line
  }, [matches, address]);

  useEffect(() => {
    if (betMatchId && matches.length > 0) {
      const m = matches.find(match => String(match.id) === String(betMatchId));
      setSelectedMatch(m || null);
    } else {
      setSelectedMatch(null);
    }
  }, [betMatchId, matches]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatches();
      if (address) fetchMyBets();
    }, 30000);
    return () => clearInterval(interval);
  }, [matches.length, provider, address]);

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
          result: m[4],
          totalBetA: ethers.formatEther(m[5]),
          totalBetB: ethers.formatEther(m[6]),
          totalBetDraw: ethers.formatEther(m[7]),
        });
      }
      setMatches(arr);
    } catch (e) {
      setStatus("Failed to load matches: " + e.message);
    }
  }

  async function fetchMyBets() {
    try {
      if (!address) return;
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      let bets = {};
      for (let i = 0; i < matches.length; i++) {
        const bet = await contract.getMyBet(i);
        bets[i] = {
          amount: bet[0],
          team: bet[1],
          claimed: bet[2]
        };
      }
      setMyBets(bets);
    } catch (e) {
      // ignore
    }
  }

  async function placeBet() {
    try {
      if (!betAmount || isNaN(betAmount) || Number(betAmount) <= 0) {
        setStatus("Please enter a valid ETH amount!");
        return;
      }
      if (myBets[betMatchId] && myBets[betMatchId].amount > 0) {
        setStatus("You have already placed a bet for this match!");
        return;
      }
      setStatus("Sending transaction...");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.bet(betMatchId, betTeam, { value: ethers.parseEther(betAmount) });
      await tx.wait();
      setStatus("Bet placed successfully!");
      setBetMatchId("");
      setBetTeam("");
      setBetAmount("");
      setSelectedMatch(null);
      fetchMatches();
      fetchMyBets();
      setTimeout(() => {
        setStatus("");
      }, 5000);
    } catch (e) {
      if (e && e.message && e.message.includes("Already bet")) {
        setStatus("You have already placed a bet for this match!");
      } else if (e && e.message && e.message.toLowerCase().includes("insufficient funds")) {
        setStatus("You do not have enough ETH to place this bet.");
      } else {
        setStatus("Error: " + (e && e.message ? e.message.split('\n')[0] : ""));
      }
    }
  }

  async function claimReward(matchId) {
    try {
      setStatus("Sending claim transaction...");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.claimReward(matchId);
      await tx.wait();
      setStatus("Reward claimed successfully!");
      fetchMatches();
      fetchMyBets();
      setTimeout(() => {
        setStatus("");
      }, 5000);
    } catch (e) {
      setStatus("Claim error: " + e.message);
    }
  }

  return (
    <div style={{width: '80vw', margin: "40px auto", background: "#222", borderRadius: 16, boxShadow: "0 2px 16px #0004", padding: 24, minWidth: 320}}>
      <h2 style={{textAlign: 'center', color: '#4fc3f7'}}>User Panel</h2>
      <h4 style={{textAlign: 'center', color: '#fff'}}>Match List</h4>
      <div style={{overflowX: 'auto'}}>
      <table style={{width: "100%", margin: '0 auto', borderCollapse: "collapse", background: "#282c34", color: "#fff", borderRadius: 12, overflow: 'hidden'}}>
        <thead style={{background: "#333"}}>
          <tr>
            <th style={{padding: '10px 16px'}}>ID</th><th style={{padding: '10px 16px'}}>Team A</th><th style={{padding: '10px 16px'}}>Team B</th><th style={{padding: '10px 16px'}}>Start Time</th><th style={{padding: '10px 16px'}}>Status</th><th style={{padding: '10px 16px'}}>Result</th><th style={{padding: '10px 16px'}}>Bet A</th><th style={{padding: '10px 16px'}}>Bet B</th><th style={{padding: '10px 16px'}}>Bet Draw</th><th style={{padding: '10px 16px'}}>Claim</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(m => (
            <tr key={m.id} style={{borderBottom: '1px solid #444'}}>
              <td style={{padding: '10px 16px'}}>{m.id}</td>
              <td style={{padding: '10px 16px'}}>{m.teamA}</td>
              <td style={{padding: '10px 16px'}}>{m.teamB}</td>
              <td style={{padding: '10px 16px'}}>{m.startTime}</td>
              <td style={{padding: '10px 16px'}}>{m.finished ? <span style={{color: '#81c784'}}>Finished</span> : <span style={{color: '#ffd54f'}}>Upcoming</span>}</td>
              <td style={{padding: '10px 16px'}}>{m.finished
                  ? (m.result == 1
                      ? <span style={{color: '#4fc3f7'}}>A wins</span>
                      : m.result == 2
                      ? <span style={{color: '#ff8a65'}}>B wins</span>
                      : <span style={{color: '#ffd54f'}}>Draw</span>)
                  : "-"}</td>
              <td style={{padding: '10px 16px'}}>{m.totalBetA}</td>
              <td style={{padding: '10px 16px'}}>{m.totalBetB}</td>
              <td style={{padding: '10px 16px'}}>{m.totalBetDraw}</td>
              <td style={{padding: '10px 16px'}}>
                {!m.finished ? (
                  !myBets[m.id] || String(myBets[m.id].amount) === "0"
                    ? <span style={{color: '#b0bec5'}}>Not joined</span>
                    : <span style={{color: '#4fc3f7'}}>Joined - Selected: {
                        myBets[m.id].team == 1
                          ? "Team A"
                          : myBets[m.id].team == 2
                          ? "Team B"
                          : "Draw"
                      } - Bet amount: {ethers.formatEther(myBets[m.id].amount)} ETH</span>
                ) : (
                  !myBets[m.id] || String(myBets[m.id].amount) === "0"
                    ? <span style={{color: '#b0bec5'}}>You did not join</span>
                    : String(myBets[m.id].team) != String(m.result)
                      ? <span style={{color: '#e57373'}}>Not eligible for reward</span>
                      : myBets[m.id].claimed
                        ? <span style={{color: '#81c784'}}>Reward claimed</span>
                        : (m.result == 3
                            ? <button style={{background: '#4fc3f7', color: '#222', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 600, cursor: 'pointer'}} onClick={() => claimReward(m.id)}>Claim Reward</button>
                            : <button style={{background: '#4fc3f7', color: '#222', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 600, cursor: 'pointer'}} onClick={() => claimReward(m.id)}>Claim Reward</button>
                          )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <hr style={{margin: '32px 0', borderColor: '#444'}} />
      <h4 style={{textAlign: 'center', color: '#fff'}}>Place a Bet</h4>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
        <select style={{padding: 8, borderRadius: 8, border: '1px solid #444', minWidth: 120}} value={betMatchId} onChange={e => { setBetMatchId(e.target.value); setBetTeam(""); }}>
          <option value="">Select match</option>
          {matches.filter(m => !m.finished).map(m => (
            <option key={m.id} value={m.id}>{m.id} - {m.teamA} vs {m.teamB} - {m.startTime}</option>
          ))}
        </select>
        <select style={{padding: 8, borderRadius: 8, border: '1px solid #444', minWidth: 120}} value={betTeam} onChange={e => setBetTeam(e.target.value)} disabled={!selectedMatch}>
          <option value="">Select team</option>
          {selectedMatch && <option value="1">{selectedMatch.teamA}</option>}
          {selectedMatch && <option value="2">{selectedMatch.teamB}</option>}
          {selectedMatch && <option value="3">Draw</option>}
        </select>
        <input style={{padding: 8, borderRadius: 8, border: '1px solid #444', minWidth: 100}} placeholder="ETH Amount" value={betAmount} onChange={e => setBetAmount(e.target.value)} />
        <button style={{background: '#4fc3f7', color: '#222', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 700, cursor: 'pointer'}} onClick={placeBet}>Place Bet</button>
      </div>
      <div style={{color: "#81c784", marginTop: 10, textAlign: 'center', fontWeight: 600}}>{status}</div>
    </div>
  );
} 