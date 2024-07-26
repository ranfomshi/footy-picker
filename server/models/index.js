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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rating: {
        type: DataTypes.DECIMAL,
        defaultValue: 0
    }
});

const Gameweek = sequelize.define('Gameweek', {
    date: {
        type: DataTypes.DATE,
        allowNull: false
    }
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

module.exports = { Player, Gameweek, GameResult, Availability, Rating, TeamAssignment, sequelize };
