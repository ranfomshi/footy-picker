import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Spin, Card, Tooltip, Select, Space, Typography, Button, Switch } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import { CheckCircleOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
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
    const [sortBy, setSortBy] = useState('wins');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const [showPercentages, setShowPercentages] = useState(false); // Toggle for percentage vs actual numbers

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const sortOptions = [
        { value: 'wins', label: 'Wins' },
        { value: 'draws', label: 'Draws' },
        { value: 'losses', label: 'Losses' },
        { value: 'totalGames', label: 'Total Games' },
        { value: 'goalsFor', label: 'Goals For' },
        { value: 'goalsAgainst', label: 'Goals Against' },
        { value: 'goalDifference', label: 'Goal Difference' },
        { value: 'playerOfTheMatchCount', label: 'Player of the Match' },
        { value: 'name', label: 'Name (A-Z)' },
    ];

    const sortPlayers = (players, sortBy, sortOrder, showPercentages) => {
        return [...players].sort((a, b) => {
            const calculateWinPercentage = (player) => {
                const totalGames = player.wins + player.losses + player.draws;
                return totalGames > 0 ? (player.wins / totalGames) * 100 : 0;
            };

            const calculateDrawPercentage = (player) => {
                const totalGames = player.wins + player.losses + player.draws;
                return totalGames > 0 ? (player.draws / totalGames) * 100 : 0;
            };

            const calculateLossPercentage = (player) => {
                const totalGames = player.wins + player.losses + player.draws;
                return totalGames > 0 ? (player.losses / totalGames) * 100 : 0;
            };

            const calculateTotalGames = (player) => {
                return player.wins + player.losses + player.draws;
            };

            const calculateGoalDifference = (player) => {
                return player.goalsFor - player.goalsAgainst;
            };

            let comparison = 0;

            switch (sortBy) {
                case 'wins':
                    if (showPercentages) {
                        comparison = calculateWinPercentage(b) - calculateWinPercentage(a);
                    } else {
                        comparison = b.wins - a.wins;
                    }
                    break;
                case 'draws':
                    if (showPercentages) {
                        comparison = calculateDrawPercentage(b) - calculateDrawPercentage(a);
                    } else {
                        comparison = b.draws - a.draws;
                    }
                    break;
                case 'losses':
                    if (showPercentages) {
                        comparison = calculateLossPercentage(a) - calculateLossPercentage(b); // Lower loss percentage is better
                    } else {
                        comparison = a.losses - b.losses; // Lower losses is better
                    }
                    break;
                case 'totalGames':
                    comparison = calculateTotalGames(b) - calculateTotalGames(a);
                    break;
                case 'goalsFor':
                    comparison = b.goalsFor - a.goalsFor;
                    break;
                case 'goalsAgainst':
                    comparison = a.goalsAgainst - b.goalsAgainst; // Lower is better
                    break;
                case 'goalDifference':
                    comparison = calculateGoalDifference(b) - calculateGoalDifference(a);
                    break;
                case 'playerOfTheMatchCount':
                    comparison = (b.playerOfTheMatchCount || 0) - (a.playerOfTheMatchCount || 0);
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                default:
                    comparison = 0;
            }

            // Reverse comparison for ascending order
            return sortOrder === 'asc' ? -comparison : comparison;
        });
    };

    const sortedPlayers = sortPlayers(players, sortBy, sortOrder, showPercentages);

    const toggleSortOrder = () => {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    // Stats that can be shown as percentages
    const percentageStats = ['wins', 'draws', 'losses'];
    const canShowPercentages = percentageStats.includes(sortBy);

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
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 16 }}>Player Statistics</Text>
                    <Space>
                        <Select
                            value={sortBy}
                            onChange={setSortBy}
                            style={{ width: 200 }}
                            placeholder="Sort by..."
                            options={sortOptions}
                        />
                        <Tooltip title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'} - Click to toggle`}>
                            <Button
                                type="text"
                                icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                                onClick={toggleSortOrder}
                                style={{ display: 'flex', alignItems: 'center' }}
                            />
                        </Tooltip>
                        {canShowPercentages && (
                            <Space>
                                <Text style={{ fontSize: 12 }}>%</Text>
                                <Tooltip title={`Show ${showPercentages ? 'Numbers' : 'Percentages'} - Click to toggle`}>
                                    <Switch
                                        checked={showPercentages}
                                        onChange={setShowPercentages}
                                        size="small"
                                    />
                                </Tooltip>
                            </Space>
                        )}
                    </Space>
                </Space>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Spin size="large" />
                </div>
            ) : (
                sortedPlayers.map((player) => (
                    <PlayerCard
                        key={player.id}
                        player={player}
                        showPercentages={showPercentages}
                        sortBy={sortBy}
                    />
                ))
            )}
        </div>
    );
};

export default PlayerStats;
