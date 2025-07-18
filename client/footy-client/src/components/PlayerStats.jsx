import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Spin,
    Card,
    Tooltip,
    Select,
    Space,
    Typography,
    Button,
    Switch,
    Input,
    Modal,
    message,
    Dropdown,
    Menu
} from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import {
    CheckCircleOutlined,
    SortAscendingOutlined,
    SortDescendingOutlined,
    PlusOutlined,
    MoreOutlined,
    SearchOutlined
} from '@ant-design/icons';
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
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('wins');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const [showPercentages, setShowPercentages] = useState(false); // Toggle for percentage vs actual numbers
    const [searchTerm, setSearchTerm] = useState("");

    // Player management states
    const [newPlayerName, setNewPlayerName] = useState("");
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingPlayerName, setEditingPlayerName] = useState("");
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [playerToDelete, setPlayerToDelete] = useState(null);
    const [playerLoading, setPlayerLoading] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Player management functions
    const addPlayer = async () => {
        if (!newPlayerName.trim()) {
            message.error("Player name cannot be empty");
            return;
        }

        const duplicatePlayer = players.find(
            (player) => player.name.toLowerCase() === newPlayerName.toLowerCase()
        );
        if (duplicatePlayer) {
            message.error("Player name already exists");
            return;
        }

        setPlayerLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(
                `${API_BASE_URL}/players`,
                { name: newPlayerName },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setNewPlayerName("");
            await fetchPlayerStats();
            setIsAddModalVisible(false);
            message.success("Player added successfully");
        } catch (error) {
            console.error("Error adding player", error);
            message.error(error.response?.data?.error || "Error adding player");
        } finally {
            setPlayerLoading(false);
        }
    };

    const editPlayer = (player) => {
        setEditingPlayer(player);
        setEditingPlayerName(player.name);
        setIsEditModalVisible(true);
    };

    const updatePlayer = async () => {
        if (!editingPlayerName.trim()) {
            message.error("Player name cannot be empty");
            return;
        }

        const duplicatePlayer = players.find(
            (player) =>
                player.name.toLowerCase() === editingPlayerName.toLowerCase() &&
                player.id !== editingPlayer.id
        );
        if (duplicatePlayer) {
            message.error("Player name already exists");
            return;
        }

        setPlayerLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.put(
                `${API_BASE_URL}/players/${editingPlayer.id}`,
                { name: editingPlayerName },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setIsEditModalVisible(false);
            setEditingPlayer(null);
            setEditingPlayerName("");
            await fetchPlayerStats();
            message.success("Player updated successfully");
        } catch (error) {
            console.error("Error updating player", error);
            message.error("Error updating player");
        } finally {
            setPlayerLoading(false);
        }
    };

    const showDeleteModal = (player) => {
        setPlayerToDelete(player);
        setIsDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!playerToDelete) return;
        setPlayerLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.delete(`${API_BASE_URL}/players/${playerToDelete.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            await fetchPlayerStats();
            setIsDeleteModalVisible(false);
            setPlayerToDelete(null);
            message.success("Player deleted successfully");
        } catch (error) {
            console.error("Error deleting player", error);
            message.error("Error deleting player");
        } finally {
            setPlayerLoading(false);
        }
    };

    const viewPlayerDetails = (player) => {
        // No longer needed - details are shown in expandable cards
    };

    const handleSearch = (value) => {
        setSearchTerm(value);
        const filtered = players.filter((player) =>
            player.name.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredPlayers(filtered);
    };

    const handleAddPlayerKeyPress = (e) => {
        if (e.key === "Enter") {
            addPlayer();
        }
    };

    const handleUpdatePlayerKeyPress = (e) => {
        if (e.key === "Enter") {
            updatePlayer();
        }
    };

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

    const sortedPlayers = sortPlayers(filteredPlayers, sortBy, sortOrder, showPercentages);

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
            const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
            setPlayers(sortedData);
            setFilteredPlayers(sortedData);
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
        <Spin spinning={playerLoading}>
            <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                {/* Header with Add Player Button */}
                <div style={{ marginBottom: 16, padding: '0 8px' }}>
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 16 }}>Players</Text>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={() => setIsAddModalVisible(true)}
                        >
                            Add Player
                        </Button>
                    </Space>

                    {/* Search Input */}
                    <Input
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        prefix={<SearchOutlined />}
                        style={{ marginBottom: 8 }}
                    />

                    {/* Controls */}
                    <Space align="center" style={{ width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Select
                            value={sortBy}
                            onChange={setSortBy}
                            style={{ width: 180 }}
                            size="small"
                            placeholder="Sort by..."
                            options={sortOptions}
                        />
                        <Tooltip title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'} - Click to toggle`}>
                            <Button
                                type="text"
                                size="small"
                                icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                                onClick={toggleSortOrder}
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
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    // Stats Cards View
                    sortedPlayers.map((player) => (
                        <PlayerCard
                            key={player.id}
                            player={player}
                            showPercentages={showPercentages}
                            sortBy={sortBy}
                            onEdit={editPlayer}
                            onDelete={showDeleteModal}
                        />
                    ))
                )}

                {/* Add Player Modal */}
                <Modal
                    title="Add Player"
                    visible={isAddModalVisible}
                    onOk={addPlayer}
                    onCancel={() => setIsAddModalVisible(false)}
                    confirmLoading={playerLoading}
                >
                    <Input
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyPress={handleAddPlayerKeyPress}
                        placeholder="Enter player name"
                        autoFocus
                    />
                </Modal>

                {/* Edit Player Modal */}
                <Modal
                    title="Edit Player"
                    visible={isEditModalVisible}
                    onOk={updatePlayer}
                    onCancel={() => setIsEditModalVisible(false)}
                    confirmLoading={playerLoading}
                >
                    <Input
                        value={editingPlayerName}
                        onChange={(e) => setEditingPlayerName(e.target.value)}
                        onKeyPress={handleUpdatePlayerKeyPress}
                        placeholder="Enter new player name"
                        autoFocus
                    />
                </Modal>

                {/* Delete Player Modal */}
                <Modal
                    title="Confirm Delete"
                    visible={isDeleteModalVisible}
                    onOk={handleDelete}
                    onCancel={() => setIsDeleteModalVisible(false)}
                    okButtonProps={{ danger: true }}
                    okText="Delete"
                    confirmLoading={playerLoading}
                >
                    <p>Are you sure you want to delete this player? This action cannot be undone.</p>
                    <p>To leave the room but have your player's rank and stats retained go to the Account Management tab</p>
                </Modal>
            </div>
        </Spin>
    );
};

export default PlayerStats;
