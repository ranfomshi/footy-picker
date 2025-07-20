import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getPlayerAvatarUrl, getPlayerInitials, getPlayerColor } from '../utils/avatarUtils';

const PlayerAvatar = ({ player, size = 32, style = {} }) => {
    const avatarUrl = getPlayerAvatarUrl(player);
    const initials = getPlayerInitials(player.name);
    const playerColor = getPlayerColor(player);

    if (avatarUrl) {
        return (
            <Avatar
                size={size}
                src={avatarUrl}
                style={style}
            />
        );
    }

    // Fallback to initials or icon with consistent color
    return (
        <Avatar
            size={size}
            style={{
                backgroundColor: player.auth0Id ? '#00b96b' : playerColor,
                color: '#fff',
                fontWeight: 'bold',
                ...style
            }}
            icon={!initials || initials === '?' ? <UserOutlined /> : null}
        >
            {initials && initials !== '?' ? initials : null}
        </Avatar>
    );
};

export default PlayerAvatar;
