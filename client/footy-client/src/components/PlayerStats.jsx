import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Spin, Tooltip } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import { CheckCircleOutlined } from '@ant-design/icons';

const PlayerStats = () => {
    const { getAccessTokenSilently } = useAuth0();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const fetchPlayerStats = async () => {
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.get(`${API_BASE_URL}/players`, {
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

    const calculatePercentage = (count, total) => {
        if (total === 0) return "0%";
        return `${((count / total) * 100).toFixed(1)}%`;
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            width: 100,
            render: (text, record) => (
                <div style={{whiteSpace:'nowrap'}}>
                    {text}{" "}
                    {record.auth0Id && (
                        <Tooltip title="Player linked to user">
                            <CheckCircleOutlined style={{ color: "green", marginLeft: 5 }} />
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: 'Ws',
            dataIndex: 'wins',
            key: 'wins',
            sorter: (a, b) => a.wins - b.wins,
            defaultSortOrder: 'descend',
            width: 45,
            render: (wins, record) => {
                const totalGames = record.wins + record.losses + record.draws;
                return (
                    <div style={{textAlign:'center'}}>
                        {wins}
                        <br /><span style={{ fontSize: '0.6em', color: 'gray', whiteSpace:'nowrap'}}>
                            ({calculatePercentage(wins, totalGames)})
                        </span>
                    </div>
                );
            }
        },
        {
            title: 'Ls',
            dataIndex: 'losses',
            key: 'losses',
            sorter: (a, b) => a.losses - b.losses,
            width: 50,
            render: (losses, record) => {
                const totalGames = record.wins + record.losses + record.draws;
                return (
                    <div style={{textAlign:'center', padding:0}}>
                        {losses}
                        <br /><span style={{ fontSize: '0.6em', color: 'gray', whiteSpace:'nowrap'}}>
                            ({calculatePercentage(losses, totalGames)})
                        </span>
                    </div>
                );
            }
        },
        {
            title: 'Ds',
            dataIndex: 'draws',
            key: 'draws',
            sorter: (a, b) => a.draws - b.draws,
            width: 50,
            render: (draws, record) => {
                const totalGames = record.wins + record.losses + record.draws;
                return (
                    <div style={{textAlign:'center', padding:0}}>
                        {draws}
                        <br /><span style={{ fontSize: '0.6em', color: 'gray', whiteSpace:'nowrap'}}>
                            ({calculatePercentage(draws, totalGames)})
                        </span>
                    </div>
                );
            }
        },
        {
            title: 'G+',
            dataIndex: 'goalsFor',
            key: 'goalsFor',
            sorter: (a, b) => a.goalsFor - b.goalsFor,
            width: 50,
        },
        {
            title: 'G-',
            dataIndex: 'goalsAgainst',
            key: 'goalsAgainst',
            sorter: (a, b) => a.goalsAgainst - b.goalsAgainst,
            width: 50,
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
                    pagination={false}
                    scroll={{ y: '70vh', x: '100%' }}
                />
            )}
        </div>
    );
};

export default PlayerStats;
