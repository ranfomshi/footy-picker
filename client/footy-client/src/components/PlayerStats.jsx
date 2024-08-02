import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Spin } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';

const PlayerStats = () => {
    const { getAccessTokenSilently } = useAuth0();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const fetchPlayerStats = async () => {
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.get(`${API_BASE_URL}/players?roomCode=${roomCode}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setPlayers(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching player stats", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayerStats();
    }, []);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            width: 100, // Set fixed width for the column
        },
        {
            title: 'Ws',
            dataIndex: 'wins',
            key: 'wins',
            sorter: (a, b) => a.wins - b.wins,
            defaultSortOrder: 'descend',
            width: 50, // Set fixed width for the column
        },
        {
            title: 'Ls',
            dataIndex: 'losses',
            key: 'losses',
            sorter: (a, b) => a.losses - b.losses,
            width: 50, // Set fixed width for the column
        },
        {
            title: 'Ds',
            dataIndex: 'draws',
            key: 'draws',
            sorter: (a, b) => a.draws - b.draws,
            width: 50, // Set fixed width for the column
        },
        {
            title: 'G+',
            dataIndex: 'goalsFor',
            key: 'goalsFor',
            sorter: (a, b) => a.goalsFor - b.goalsFor,
            width: 50, // Set fixed width for the column
        },
        {
            title: 'G-',
            dataIndex: 'goalsAgainst',
            key: 'goalsAgainst',
            sorter: (a, b) => a.goalsAgainst - b.goalsAgainst,
            width: 50, // Set fixed width for the column
        },
    ];

    return (
        <div>
            {loading ? (
                <Spin size="small" />
            ) : (
                <Table
                    size="small"
                    dataSource={players}
                    columns={columns}
                    rowKey="id"
                    pagination={false} // Disable pagination to show all results
                    scroll={{ y: '70vh', x: '100%' }} // Enable vertical and horizontal scrolling with fixed header
                />
            )}
        </div>
    );
};

export default PlayerStats;
