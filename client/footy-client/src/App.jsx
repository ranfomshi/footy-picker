import React, { useEffect, useState } from 'react';
import './App.css';
import AddPlayer from './components/AddPlayer';
import axios from 'axios';
import GameweekManager from './components/GameweekManager';
import BottomNav from './components/BottomNav';

function App() {
    const [players, setPlayers] = useState([]);
    const [activeKey, setActiveKey] = useState('players');

    const fetchPlayers = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/players');
            setPlayers(response.data);
        } catch (error) {
            console.error("Error fetching players", error);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    const renderContent = () => {
        switch (activeKey) {
            case 'players':
                return <AddPlayer fetchPlayers={fetchPlayers} players={players} />;
            case 'gameweeks':
                return <GameweekManager />;
            default:
                return null;
        }
    };

    return (
        <div className="App">
            <div className="content">
                <h1>Fat Football Fellas</h1>
                {renderContent()}
            </div>
            <div className="bottom-nav">
                <BottomNav activeKey={activeKey} onChange={setActiveKey} />
            </div>
        </div>
    );
}

export default App;
