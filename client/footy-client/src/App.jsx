import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
    const [players, setPlayers] = useState([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [availablePlayers, setAvailablePlayers] = useState([]);
    const [teams, setTeams] = useState({ teamA: [], teamB: [] });
    const [date, setDate] = useState('');
    const [gameResults, setGameResults] = useState([]);
    const [ratings, setRatings] = useState([]);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        try {
            const response = await axios.get('/api/players');
            console.log("Fetched players:", response.data);  // Debugging line
            if (Array.isArray(response.data)) {
                setPlayers(response.data);
            } else {
                console.error("Expected an array but got:", response.data);
            }
        } catch (error) {
            console.error("Error fetching players", error);
        }
    };

    const addPlayer = async () => {
        try {
            const response = await axios.post('/api/players', { name: newPlayerName });
            setPlayers([...players, response.data]);
            setNewPlayerName('');
        } catch (error) {
            console.error("Error adding player", error);
        }
    };

    const recordAvailability = async () => {
        const playerIds = availablePlayers.map(player => player.id);
        try {
            await axios.post('/api/availability', { date, playerIds });
            alert('Availability recorded!');
        } catch (error) {
            console.error("Error recording availability", error);
        }
    };

    const pickTeams = async () => {
        try {
            const response = await axios.get('/api/pick-teams', { params: { date } });
            setTeams(response.data);
        } catch (error) {
            console.error("Error picking teams", error);
        }
    };

    const recordGameResults = async () => {
        try {
            await axios.post('/api/games', { date, results: gameResults });
            alert('Game results recorded!');
        } catch (error) {
            console.error("Error recording game results", error);
        }
    };

    const recordRatings = async () => {
        try {
            await axios.post('/api/ratings', { date, ratings });
            alert('Ratings recorded!');
        } catch (error) {
            console.error("Error recording ratings", error);
        }
    };

    return (
        <div>
            <h1>Football Team Picker</h1>
            <h2>Add Player</h2>
            <input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
            />
            <button onClick={addPlayer}>Add Player</button>

            <h2>Record Availability</h2>
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
            <div>
                {Array.isArray(players) && players.map(player => (
                    <div key={player.id}>
                        <input
                            type="checkbox"
                            checked={availablePlayers.includes(player)}
                            onChange={() => {
                                setAvailablePlayers(
                                    availablePlayers.includes(player)
                                        ? availablePlayers.filter(p => p !== player)
                                        : [...availablePlayers, player]
                                );
                            }}
                        />
                        {player.name}
                    </div>
                ))}
            </div>
            <button onClick={recordAvailability}>Record Availability</button>

            <h2>Pick Teams</h2>
            <button onClick={pickTeams}>Pick Teams</button>
            <div>
                <h3>Team A</h3>
                {teams.teamA.map(player => <div key={player.id}>{player.name}</div>)}
            </div>
            <div>
                <h3>Team B</h3>
                {teams.teamB.map(player => <div key={player.id}>{player.name}</div>)}
            </div>

            <h2>Record Game Results</h2>
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
            {players.map(player => (
                <div key={player.id}>
                    <label>{player.name}</label>
                    <input
                        type="number"
                        placeholder="Team"
                        onChange={(e) => {
                            const team = parseInt(e.target.value);
                            setGameResults(results => results.map(result => result.playerId === player.id ? { ...result, team } : result));
                        }}
                    />
                    <input
                        type="number"
                        placeholder="Goals"
                        onChange={(e) => {
                            const goals = parseInt(e.target.value);
                            setGameResults(results => results.map(result => result.playerId === player.id ? { ...result, goals } : result));
                        }}
                    />
                </div>
            ))}
            <button onClick={recordGameResults}>Record Game Results</button>

            <h2>Rate Players</h2>
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
            {players.map(player => (
                <div key={player.id}>
                    <label>Rate {player.name}</label>
                    <select
                        onChange={(e) => {
                            const rateeId = player.id;
                            const rating = parseInt(e.target.value);
                            setRatings(r => [...r, { gameId, raterId, rateeId, rating }]);
                        }}
                    >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>
            ))}
            <button onClick={recordRatings}>Record Ratings</button>
        </div>
    );
};

export default App;
