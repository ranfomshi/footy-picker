import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Spin, Card, Tooltip, Select, Space, Typography } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import { CheckCircleOutlined } from '@ant-design/icons';
import PlayerCard from './PlayerCard';

const { Text } = Typography;

/**
 * Helper to format percentages consistently.
 */
const calculatePercentage = (count, total) => {
    if (total === 0) return '0%';
    return `${((count / total) * 100).toFixed(1)}%`;
};

/**
 * Small reusable block for each numeric stat so we keep visual
 * structure consistent across cards.
 */
const Stat = ({ label, value, percent }) => (
    <div style={{ textAlign: 'center', minWidth: 48 }}>
        <div style={{ fontSize: '0.7rem', color: 'gray' }}>{label}</div>
        <div style={{ fontWeight: 600 }}>{value}</div>
        {percent && (
            <div style={{ fontSize: '0.65rem', color: 'gray' }}>({percent})</div>
        )}
    </div>
);

/**
 * New component that shows *one* player at a time.
 * All the heavy lifting of displaying a single player's numbers
 * now lives here, so <PlayerStats/> is just “map → <PlayerCard/>”.
 */


/**
 * Updated main component.    
 * ‑ Switches out the AntD <Table/> for our new card view.
 */
const PlayerStats = () => {
    const { getAccessTokenSilently } = useAuth0();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('winPercentage');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const sortOptions = [
        { value: 'winPercentage', label: 'Win Percentage' },
        { value: 'wins', label: 'Wins' },
        { value: 'totalGames', label: 'Total Games' },
        { value: 'goalsFor', label: 'Goals For' },
        { value: 'goalsAgainst', label: 'Goals Against' },
        { value: 'goalDifference', label: 'Goal Difference' },
        { value: 'playerOfTheMatchCount', label: 'Player of the Match' },
        { value: 'name', label: 'Name (A-Z)' },
    ];

    const sortPlayers = (players, sortBy) => {
        return [...players].sort((a, b) => {
            const calculateWinPercentage = (player) => {
                const totalGames = player.wins + player.losses + player.draws;
                return totalGames > 0 ? (player.wins / totalGames) * 100 : 0;
            };

            const calculateTotalGames = (player) => {
                return player.wins + player.losses + player.draws;
            };

            const calculateGoalDifference = (player) => {
                return player.goalsFor - player.goalsAgainst;
            };

            switch (sortBy) {
                case 'winPercentage':
                    return calculateWinPercentage(b) - calculateWinPercentage(a);
                case 'wins':
                    return b.wins - a.wins;
                case 'totalGames':
                    return calculateTotalGames(b) - calculateTotalGames(a);
                case 'goalsFor':
                    return b.goalsFor - a.goalsFor;
                case 'goalsAgainst':
                    return a.goalsAgainst - b.goalsAgainst; // Lower is better
                case 'goalDifference':
                    return calculateGoalDifference(b) - calculateGoalDifference(a);
                case 'playerOfTheMatchCount':
                    return (b.playerOfTheMatchCount || 0) - (a.playerOfTheMatchCount || 0);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
    };

    const sortedPlayers = sortPlayers(players, sortBy);

    const fetchPlayerStats = async () => {
        try {
            const token = await getAccessTokenSilently();
            const { data } = await axios.get(`${API_BASE_URL}/players`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPlayers(data);
        } catch (error) {
            console.error('Error fetching player stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayerStats();
        // eslint‑disable‑next‑line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <div style={{ marginBottom: 16, padding: '0 8px' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text strong style={{ fontSize: 16 }}>Player Statistics</Text>
                    <Select
                        value={sortBy}
                        onChange={setSortBy}
                        style={{ width: 200 }}
                        placeholder="Sort by..."
                        options={sortOptions}
                    />
                </Space>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Spin size="large" />
                </div>
            ) : (
                sortedPlayers.map((player) => <PlayerCard key={player.id} player={player} />)
            )}
        </div>
    );
};

export default PlayerStats;
