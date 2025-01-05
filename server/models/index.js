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
        allowNull: true
    },
    auth0Id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    roomId: {
        type: DataTypes.INTEGER,
        references: {
            model: Room,
            key: 'id'
        },
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
});

const Gameweek = sequelize.define('Gameweek', {
    maxPlayers: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    roomId: {
        type: DataTypes.INTEGER,
        references: {
            model: Room,
            key: 'id',
        },
        allowNull: false,
    },
    location: {
        type: DataTypes.STRING, // Storing an address string
        allowNull: true, // Optional
    },
    startTime: {
        type: DataTypes.TIME, // Storing time only
        allowNull: true, // Optional
    },
}, {
    tableName: 'Gameweeks',
    timestamps: true,
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
    roomId: { // Added roomId
        type: DataTypes.INTEGER,
        references: {
            model: Room,
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

const Sport = sequelize.define('Sport', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
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
    },
    roomId: { // Added roomId
        type: DataTypes.INTEGER,
        references: {
            model: Room,
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
    },
    roomId: { // Added roomId
        type: DataTypes.INTEGER,
        references: {
            model: Room,
            key: 'id'
        },
        allowNull: false
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
    },
    roomId: { // Added roomId
        type: DataTypes.INTEGER,
        references: {
            model: Room,
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
    },
    roomId: { // Added roomId
        type: DataTypes.INTEGER,
        references: {
            model: Room,
            key: 'id',
        },
        allowNull: false,
    }
}, {
    tableName: 'Votes',
    timestamps: false,
});

const Achievement = sequelize.define('Achievement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Indicates if the achievement is currently obtainable
    },
}, {
    tableName: 'Achievements',
    timestamps: true, // Adds createdAt and updatedAt
});

const PlayerAchievements = sequelize.define('PlayerAchievements', {
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id',
        },
        allowNull: false,
    },
    achievementId: {
        type: DataTypes.INTEGER,
        references: {
            model: Achievement,
            key: 'id',
        },
        allowNull: false,
    },
    roomId: {
        type: DataTypes.INTEGER,
        references: {
            model: Room,
            key: 'id',
        },
        allowNull: false,
    },
    earnedAt: {
        type: DataTypes.DATE, // Timestamp for when the achievement was earned
        allowNull: true, // Null if not earned yet
    },
}, {
    tableName: 'PlayerAchievements',
    timestamps: true, // To track creation and updates
});

// Associations
Player.belongsToMany(Gameweek, { through: Availability, foreignKey: 'playerId', otherKey: 'gameweekId' });
Gameweek.belongsToMany(Player, { through: Availability, foreignKey: 'gameweekId', otherKey: 'playerId' });

Player.belongsToMany(Gameweek, { through: TeamAssignment, foreignKey: 'playerId', otherKey: 'gameweekId' });
Gameweek.belongsToMany(Player, { through: TeamAssignment, foreignKey: 'gameweekId', otherKey: 'playerId' });

Player.hasMany(Rating, { foreignKey: 'playerId' });
Rating.belongsTo(Player, { foreignKey: 'playerId' });
Rating.belongsTo(Room, { foreignKey: 'roomId' });
Room.hasMany(Rating, { foreignKey: 'roomId' });

Availability.belongsTo(Player, { foreignKey: 'playerId' });
Availability.belongsTo(Gameweek, { foreignKey: 'gameweekId' });
Availability.belongsTo(Room, { foreignKey: 'roomId' });
Player.hasMany(Availability, { foreignKey: 'playerId' });
Gameweek.hasMany(Availability, { foreignKey: 'gameweekId' });
Room.hasMany(Availability, { foreignKey: 'roomId' });

TeamAssignment.belongsTo(Player, { foreignKey: 'playerId' });
TeamAssignment.belongsTo(Gameweek, { foreignKey: 'gameweekId' });
TeamAssignment.belongsTo(Room, { foreignKey: 'roomId' });
Player.hasMany(TeamAssignment, { foreignKey: 'playerId' });
Gameweek.hasMany(TeamAssignment, { foreignKey: 'gameweekId' });
Room.hasMany(TeamAssignment, { foreignKey: 'roomId' });

GameResult.belongsTo(Gameweek, { foreignKey: 'gameweekId' });
GameResult.belongsTo(Room, { foreignKey: 'roomId' });
Gameweek.hasOne(GameResult, { foreignKey: 'gameweekId' });
Room.hasMany(GameResult, { foreignKey: 'roomId' });

Vote.belongsTo(Gameweek, { foreignKey: 'gameweek_id' });
Vote.belongsTo(Player, { foreignKey: 'voting_player_id', as: 'Voter' });
Vote.belongsTo(Player, { foreignKey: 'voted_player_id', as: 'VotedPlayer' });
Vote.belongsTo(Room, { foreignKey: 'roomId' });
Gameweek.hasMany(Vote, { foreignKey: 'gameweek_id' });
Player.hasMany(Vote, { foreignKey: 'voting_player_id', as: 'VotesCast' });
Player.hasMany(Vote, { foreignKey: 'voted_player_id', as: 'VotesReceived' });
Room.hasMany(Vote, { foreignKey: 'roomId' });

// Associations for Room and RoomMembership
Player.belongsToMany(Room, { through: RoomMembership, foreignKey: 'playerId' });
Room.belongsToMany(Player, { through: RoomMembership, foreignKey: 'roomId' });

RoomMembership.belongsTo(Player, { foreignKey: 'playerId' });
RoomMembership.belongsTo(Room, { foreignKey: 'roomId' });
Player.hasMany(RoomMembership, { foreignKey: 'playerId' });
Room.hasMany(RoomMembership, { foreignKey: 'roomId' });

Gameweek.belongsTo(Room, { foreignKey: 'roomId' });
Room.hasMany(Gameweek, { foreignKey: 'roomId' });


Room.belongsTo(Sport, { foreignKey: 'sportId' });
Sport.hasMany(Room, { foreignKey: 'sportId' });

Player.belongsToMany(Achievement, { through: 'PlayerAchievements', foreignKey: 'playerId' });
Achievement.belongsToMany(Player, { through: 'PlayerAchievements', foreignKey: 'achievementId' });

Room.belongsToMany(Achievement, { through: 'RoomAchievements', foreignKey: 'roomId' });
Achievement.belongsToMany(Room, { through: 'RoomAchievements', foreignKey: 'achievementId' });

Player.belongsToMany(Achievement, { through: PlayerAchievements, foreignKey: 'playerId' });
Achievement.belongsToMany(Player, { through: PlayerAchievements, foreignKey: 'achievementId' });

Room.belongsToMany(Achievement, { through: 'RoomAchievements', foreignKey: 'roomId' });
Achievement.belongsToMany(Room, { through: 'RoomAchievements', foreignKey: 'achievementId' });

PlayerAchievements.belongsTo(Player, { foreignKey: 'playerId' });
PlayerAchievements.belongsTo(Achievement, { foreignKey: 'achievementId' });
PlayerAchievements.belongsTo(Room, { foreignKey: 'roomId' });
Player.hasMany(PlayerAchievemenst, { foreignKey: 'playerId' });
Achievement.hasMany(PlayerAchievements, { foreignKey: 'achievementId' });
Room.hasMany(PlayerAchievements, { foreignKey: 'roomId' });


module.exports = { Player, Gameweek, GameResult, Availability, Rating, TeamAssignment, Room, RoomMembership, Vote, Sport, Achievement, PlayerAchievements, sequelize };
