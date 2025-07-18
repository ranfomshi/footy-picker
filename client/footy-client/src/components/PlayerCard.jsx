import React, { useState } from 'react';
import { Card, Tooltip, Typography, Row, Col, Collapse, Divider, Progress, Avatar, List } from 'antd';
import {
    CheckCircleOutlined,
    SafetyCertificateOutlined,
    CrownOutlined,
    LockOutlined,
    CloseCircleOutlined,
    PlusOutlined,
    MinusOutlined,
    FileTextOutlined,
    StarFilled,
    ExpandOutlined,
    CompressOutlined,
    PercentageOutlined,
    CalendarOutlined,
    TrophyOutlined,
    UserOutlined,
    TeamOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const colorMap = {
    win: '#00b96b',
    draw: '#fadb14',
    loss: '#ff4d4f',
};

const PlayerCard = ({ player, showPercentages = false, sortBy = null }) => {
    const [expanded, setExpanded] = useState(false);
    const totalGames = player.wins + player.losses + player.draws;
    const goalDiff = player.goalsFor - player.goalsAgainst;
    const form = player.lastFiveGames || [];

    // Helper function to calculate percentage
    const calculatePercentage = (count, total) => {
        if (total === 0) return '0%';
        return `${((count / total) * 100).toFixed(1)}%`;
    };

    // Helper function to get display value based on showPercentages flag
    const getDisplayValue = (stat, count) => {
        if (showPercentages && ['wins', 'draws', 'losses'].includes(stat)) {
            return calculatePercentage(count, totalGames);
        }
        return count;
    };

    const toggleExpanded = () => {
        setExpanded(!expanded);
    };

    const StatPill = ({ icon, label, value, background, style = {}, tooltip }) => {
        const content = (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 10px',
                    background: background || '#f0f0f0',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    gap: 6,
                    minWidth: 0,
                    ...style,
                }}
            >
                {icon}
                {label} : {value}
            </div>
        );

        return tooltip ? <Tooltip title={tooltip}>{content}</Tooltip> : content;
    };

    const DetailedStatRow = ({ icon, label, value, percentage, color }) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: '1px solid #f0f0f0'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                minWidth: '140px',
                gap: 8
            }}>
                {icon}
                <Text style={{ fontSize: 13, fontWeight: 500 }}>{label}</Text>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
                <Text strong style={{ fontSize: 14, color: color || '#000' }}>{value}</Text>
                {percentage && (
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {percentage}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <Card
            style={{
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                padding: 0,
                maxWidth: 480,
                margin: '0 auto 24px',
                background: '#fafafa',
            }}
            bodyStyle={{ padding: 0 }}
        >
            {/* Header */}
            <div
                style={{
                    background: '#f0f2f5',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                }}
                onClick={toggleExpanded}
            >
                <Text strong style={{ fontSize: 16 }}>
                    {player.name}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                        {player.auth0Id && (
                            <Tooltip title="Linked to user">
                                <CheckCircleOutlined
                                    style={{ color: '#00b96b', fontSize: 18, marginRight: 8 }}
                                />
                            </Tooltip>
                        )}
                        {player.isAdmin && (
                            <Tooltip title="Admin">
                                <SafetyCertificateOutlined
                                    style={{ color: '#722ed1', fontSize: 18, marginRight: 8 }}
                                />
                            </Tooltip>
                        )}
                    </div>
                    <Tooltip title={expanded ? 'Collapse details' : 'Expand details'}>
                        {expanded ?
                            <CompressOutlined style={{ fontSize: 16, color: '#666' }} /> :
                            <ExpandOutlined style={{ fontSize: 16, color: '#666' }} />
                        }
                    </Tooltip>
                </div>
            </div>

            {/* Stat grid */}
            <div style={{ padding: 16 }}>
                <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                    <Col flex="1">
                        <StatPill
                            icon={<CrownOutlined style={{ color: '#00b96b' }} />}
                            label="Win"
                            value={getDisplayValue('wins', player.wins)}
                            background="#e6fffb"
                        />
                    </Col>
                    <Col flex="1">
                        <StatPill
                            icon={<LockOutlined style={{ color: '#faad14' }} />}
                            label="Draw"
                            value={getDisplayValue('draws', player.draws)}
                            background="#fffbe6"
                        />
                    </Col>
                    <Col flex="1">
                        <StatPill
                            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                            label="Loss"
                            value={getDisplayValue('losses', player.losses)}
                            background="#fff1f0"
                        />
                    </Col>
                </Row>

                <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                    <Col flex="1">
                        <StatPill icon={<PlusOutlined />} label="GF" value={`+${player.goalsFor}`} />
                    </Col>
                    <Col flex="1">
                        <StatPill icon={<MinusOutlined />} label="GA" value={`-${player.goalsAgainst}`} />
                    </Col>
                    <Col flex="1">
                        <StatPill
                            icon={<FileTextOutlined />}
                            label="GD"
                            value={`${goalDiff >= 0 ? '+' : ''}${goalDiff}`}
                        />
                    </Col>
                </Row>

                {/* PoM */}
                {player.playerOfTheMatchCount > 0 && (
                    <Row style={{ marginBottom: 12 }}>
                        <Col flex="1">
                            <StatPill
                                icon={<StarFilled style={{ color: 'orange' }} />}
                                label="PoM"
                                value={player.playerOfTheMatchCount}
                                background="#fff7e6"
                                tooltip="Player of the Match Count"
                            />
                        </Col>
                    </Row>
                )}

                {/* Last 5 form bar */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {form.map((result, idx) => (
                        <div
                            key={idx}
                            style={{
                                height: 10,
                                flex: 1,
                                maxWidth: '20%',
                                background: colorMap[result] || '#d9d9d9',
                                borderRadius: 8,
                            }}
                        />
                    ))}
                </div>

                {/* Expanded Details */}
                {expanded && (
                    <>
                        <Divider style={{ margin: '16px 0' }} />
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 14, color: '#333', marginBottom: 12, display: 'block' }}>
                                📊 Detailed Statistics
                            </Text>

                            <DetailedStatRow
                                icon={<TrophyOutlined style={{ color: '#00b96b' }} />}
                                label="Win Rate"
                                value={calculatePercentage(player.wins, totalGames)}
                                color="#00b96b"
                            />

                            <DetailedStatRow
                                icon={<CalendarOutlined style={{ color: '#1890ff' }} />}
                                label="Total Games"
                                value={totalGames}
                                percentage={totalGames > 0 ? 'Games played' : 'No games yet'}
                                color="#1890ff"
                            />

                            <DetailedStatRow
                                icon={<PlusOutlined style={{ color: '#52c41a' }} />}
                                label="Goals For"
                                value={player.goalsFor}
                                percentage={totalGames > 0 ? `${(player.goalsFor / totalGames).toFixed(1)} per game` : ''}
                                color="#52c41a"
                            />

                            <DetailedStatRow
                                icon={<MinusOutlined style={{ color: '#f5222d' }} />}
                                label="Goals Against"
                                value={player.goalsAgainst}
                                percentage={totalGames > 0 ? `${(player.goalsAgainst / totalGames).toFixed(1)} per game` : ''}
                                color="#f5222d"
                            />

                            <DetailedStatRow
                                icon={<FileTextOutlined style={{ color: goalDiff >= 0 ? '#52c41a' : '#f5222d' }} />}
                                label="Goal Difference"
                                value={`${goalDiff >= 0 ? '+' : ''}${goalDiff}`}
                                percentage={totalGames > 0 ? `${(goalDiff / totalGames).toFixed(1)} per game` : ''}
                                color={goalDiff >= 0 ? '#52c41a' : '#f5222d'}
                            />

                            {player.playerOfTheMatchCount > 0 && (
                                <DetailedStatRow
                                    icon={<StarFilled style={{ color: '#fa8c16' }} />}
                                    label="Player of the Match"
                                    value={player.playerOfTheMatchCount}
                                    percentage={calculatePercentage(player.playerOfTheMatchCount, totalGames)}
                                    color="#fa8c16"
                                />
                            )}
                        </div>

                        {/* Performance Bars */}
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 14, color: '#333', marginBottom: 12, display: 'block' }}>
                                📈 Performance Breakdown
                            </Text>

                            <div style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12 }}>Wins</Text>
                                    <Text style={{ fontSize: 12 }}>{player.wins}/{totalGames}</Text>
                                </div>
                                <Progress
                                    percent={totalGames > 0 ? (player.wins / totalGames) * 100 : 0}
                                    strokeColor="#00b96b"
                                    showInfo={false}
                                    size="small"
                                />
                            </div>

                            <div style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12 }}>Draws</Text>
                                    <Text style={{ fontSize: 12 }}>{player.draws}/{totalGames}</Text>
                                </div>
                                <Progress
                                    percent={totalGames > 0 ? (player.draws / totalGames) * 100 : 0}
                                    strokeColor="#faad14"
                                    showInfo={false}
                                    size="small"
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12 }}>Losses</Text>
                                    <Text style={{ fontSize: 12 }}>{player.losses}/{totalGames}</Text>
                                </div>
                                <Progress
                                    percent={totalGames > 0 ? (player.losses / totalGames) * 100 : 0}
                                    strokeColor="#ff4d4f"
                                    showInfo={false}
                                    size="small"
                                />
                            </div>
                        </div>

                        {/* Favorite Teammates Section */}
                        {player.favoriteTeammates && player.favoriteTeammates.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <Text strong style={{ fontSize: 14, color: '#333', marginBottom: 12, display: 'block' }}>
                                    🤝 Favorite Teammates by Win Percentage
                                </Text>
                                <List
                                    size="small"
                                    dataSource={player.favoriteTeammates.slice(0, 3)} // Show top 3
                                    renderItem={(teammate) => (
                                        <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                            <List.Item.Meta
                                                avatar={<Avatar size={32} icon={<UserOutlined />} />}
                                                title={
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text strong style={{ fontSize: 13 }}>{teammate.name}</Text>
                                                        <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 'bold' }}>
                                                            {(teammate.winRate * 100).toFixed(1)}%
                                                        </Text>
                                                    </div>
                                                }
                                                description={
                                                    <div style={{ fontSize: 11, color: '#666' }}>
                                                        {teammate.matchesPlayedTogether} games • GD: {teammate.goalDifferenceTogether >= 0 ? '+' : ''}{teammate.goalDifferenceTogether}
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                                {player.favoriteTeammates.length === 0 && (
                                    <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                                        No favorite teammates yet (need 3+ games with a teammate)
                                    </Text>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
};

export default PlayerCard;
