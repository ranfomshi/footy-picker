const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = isProduction ? process.env.DATABASE_URL : process.env.DATABASE_URL_DEV;

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: isProduction ? {
            require: true,
            rejectUnauthorized: false
        } : false // Disable SSL for development
    }
});

const Player = sequelize.define('Player', {
    auth0Id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rating: {
        type: DataTypes.DECIMAL,
        defaultValue: 0
    }
});

const Room = sequelize.define('Room', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
});

const RoomMembership = sequelize.define('RoomMembership', {
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        },
        allowNull: true // Can be null if it's a user
    },
    auth0Id: {
        type: DataTypes.STRING,
        allowNull: true, // Can be null if it's a player
    },
    roomId: {
        type: DataTypes.INTEGER,
        references: {
            model: Room,
            key: 'id'
        },
        allowNull: false
    }
});

const Gameweek = sequelize.define('Gameweek', {
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    roomId: {
        type: DataTypes.INTEGER,
        references: {
            model: Room,
            key: 'id'
        },
        allowNull: false
    }
}, {
    tableName: 'Gameweeks', // Explicitly specify the table name to match your database
    timestamps: true
});

const GameResult = sequelize.define('GameResult', {
    gameweekId: {
        type: DataTypes.INTEGER,
        references: {
            model: Gameweek,
            key: 'id'
        },
        allowNull: false
    },
    teamA_score: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    teamB_score: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    teamA_player_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    teamB_player_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'GameResults',
    timestamps: true
});


const Availability = sequelize.define('Availability', {
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        },
        allowNull: false
    },
    gameweekId: {
        type: DataTypes.INTEGER,
        references: {
            model: Gameweek,
            key: 'id'
        },
        allowNull: false
    }
}, {
    tableName: 'Availabilities',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['playerId', 'gameweekId']
        }
    ]
});

const Rating = sequelize.define('Rating', {
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        },
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    rating: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    raterId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'Ratings',
    timestamps: true
});

const TeamAssignment = sequelize.define('TeamAssignment', {
    team: {
        type: DataTypes.STRING,
        allowNull: false
    },
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        },
        allowNull: false
    },
    gameweekId: {
        type: DataTypes.INTEGER,
        references: {
            model: Gameweek,
            key: 'id'
        },
        allowNull: false
    }
}, {
    tableName: 'TeamAssignments',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['playerId', 'gameweekId']
        }
    ]
});

const Vote = sequelize.define('Vote', {
    gameweek_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Gameweek,
            key: 'id',
        },
        allowNull: false,
    },
    voting_player_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id',
        },
        allowNull: false,
    },
    voted_player_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id',
        },
        allowNull: false,
    },
    voted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'Votes',
    timestamps: false,
});


// Associations
Player.belongsToMany(Gameweek, { through: Availability, foreignKey: 'playerId', otherKey: 'gameweekId' });
Gameweek.belongsToMany(Player, { through: Availability, foreignKey: 'gameweekId', otherKey: 'playerId' });

Player.belongsToMany(Gameweek, { through: TeamAssignment, foreignKey: 'playerId', otherKey: 'gameweekId' });
Gameweek.belongsToMany(Player, { through: TeamAssignment, foreignKey: 'gameweekId', otherKey: 'playerId' });

Player.hasMany(Rating, { foreignKey: 'playerId' });
Rating.belongsTo(Player, { foreignKey: 'playerId' });

Availability.belongsTo(Player, { foreignKey: 'playerId' });
Availability.belongsTo(Gameweek, { foreignKey: 'gameweekId' });
Player.hasMany(Availability, { foreignKey: 'playerId' });
Gameweek.hasMany(Availability, { foreignKey: 'gameweekId' });

TeamAssignment.belongsTo(Player, { foreignKey: 'playerId' });
TeamAssignment.belongsTo(Gameweek, { foreignKey: 'gameweekId' });
Player.hasMany(TeamAssignment, { foreignKey: 'playerId' });
Gameweek.hasMany(TeamAssignment, { foreignKey: 'gameweekId' });

GameResult.belongsTo(Gameweek, { foreignKey: 'gameweekId' });
Gameweek.hasOne(GameResult, { foreignKey: 'gameweekId' });

// Associations for Room and RoomMembership
Player.belongsToMany(Room, { through: RoomMembership, foreignKey: 'playerId' });
Room.belongsToMany(Player, { through: RoomMembership, foreignKey: 'roomId' });

RoomMembership.belongsTo(Player, { foreignKey: 'playerId' });
RoomMembership.belongsTo(Room, { foreignKey: 'roomId' });
Player.hasMany(RoomMembership, { foreignKey: 'playerId' });
Room.hasMany(RoomMembership, { foreignKey: 'roomId' });

module.exports = { Player, Gameweek, GameResult, Availability, Rating, TeamAssignment, Room, RoomMembership, Vote, sequelize };
