import React from 'react';
import { Card, Tooltip, Typography, Row, Col } from 'antd';
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
} from '@ant-design/icons';

const { Text } = Typography;

const colorMap = {
    win: '#00b96b',
    draw: '#fadb14',
    loss: '#ff4d4f',
};

const PlayerCard = ({ player }) => {
    const totalGames = player.wins + player.losses + player.draws;
    const goalDiff = player.goalsFor - player.goalsAgainst;
    const form = player.lastFiveGames || [];

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
                }}
            >
                <Text strong style={{ fontSize: 16 }}>
                    {player.name}
                </Text>
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
                                style={{ color: '#722ed1', fontSize: 18 }}
                            />
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Stat grid */}
            <div style={{ padding: 16 }}>
                <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                    <Col flex="1">
                        <StatPill
                            icon={<CrownOutlined style={{ color: '#00b96b' }} />}
                            label="Win"
                            value={player.wins}
                            background="#e6fffb"
                        />
                    </Col>
                    <Col flex="1">
                        <StatPill
                            icon={<LockOutlined style={{ color: '#faad14' }} />}
                            label="Draw"
                            value={player.draws}
                            background="#fffbe6"
                        />
                    </Col>
                    <Col flex="1">
                        <StatPill
                            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                            label="Loss"
                            value={player.losses}
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
            </div>
        </Card>
    );
};

export default PlayerCard;
