import React, { useEffect, useState } from 'react';
import './App.css';
import AddPlayer from './components/AddPlayer';
import axios from 'axios';
import GameweekManager from './components/GameweekManager';
import BottomNav from './components/BottomNav';
import PlayerStats from './components/PlayerStats';

function App() {
    const [players, setPlayers] = useState([]);
    const [activeKey, setActiveKey] = useState('players');

    const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://footy-picker-58753c2f9639.herokuapp.com/api' : 'http://localhost:5000/api';

    const fetchPlayers = async () => {
      try {
          const response = await axios.get(`${API_BASE_URL}/players`);
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
            case 'playerStats':
                return <PlayerStats/>;
            default:
                return null;
        }
    };

    return (
        <div className="App">
            <div className="content">
                <h1 style={{marginTop:0}}>Footy Picker</h1>
                {renderContent()}
            </div>
            <div className="bottom-nav">
                <BottomNav activeKey={activeKey} onChange={setActiveKey} />
            </div>
        </div>
    );
}

export default App;
