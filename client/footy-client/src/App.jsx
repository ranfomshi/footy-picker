import React, { useEffect, useState } from 'react';
import './App.css';
import AddPlayer from './components/AddPlayer';
import axios from 'axios';
import GameweekManager from './components/GameweekManager';
import BottomNav from './components/BottomNav';
import PlayerStats from './components/PlayerStats';
import { ConfigProvider, theme } from 'antd';

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

    return ( <ConfigProvider
        componentSize='small'
        
        theme={{
            token: {
                fontFamily: "Trebuchet MS, sans-serif",
                colorPrimary: '#00b96b',
                colorPrimaryHover: '#00a363',
                colorPrimaryActive: '#008a53',
                colorPrimaryText: '#ffffff',
                colorPrimaryTextHover: '#ffffff',
                colorPrimaryTextActive: '#ffffff',
                colorPrimaryBg: '#00b96b',
                colorPrimaryBgHover: '#00a363',
                colorPrimaryBgActive: '#008a53',
                colorError: '#850101'
          
            }
        }}
      
    >
        <div className="App">
              
            <div className="content">
                <div style={{borderBottom:'1px solid black', marginBottom:8, width:'100%'}}>  <h4 style={{marginTop:0}}>Footy Picker</h4></div>
              
                {renderContent()}
            </div>
            <div className="bottom-nav">
                <BottomNav activeKey={activeKey} onChange={setActiveKey} />
            </div>
        </div></ConfigProvider>
    );
}

export default App;
