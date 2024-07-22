const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
let sequelize;

if (env === 'development') {
    sequelize = new Sequelize(process.env.DATABASE_URL_DEV, {
        dialect: 'postgres',
        protocol: 'postgres'
    });
} else {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });
}

const Player = sequelize.define('Player', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rating: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

const Game = sequelize.define('Game', {
    date: {
        type: DataTypes.DATE,
        allowNull: false
    }
});

const GameResult = sequelize.define('GameResult', {
    gameId: {
        type: DataTypes.INTEGER,
        references: {
            model: Game,
            key: 'id'
        }
    },
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        }
    },
    team: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    goals: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

const Availability = sequelize.define('Availability', {
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        }
    }
});

const Rating = sequelize.define('Rating', {
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    raterId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Add if you want to track who rated
    }
});

Player.belongsToMany(Game, { through: GameResult });
Game.belongsToMany(Player, { through: GameResult });
Player.belongsToMany(Game, { through: Availability });
Game.belongsToMany(Player, { through: Availability });

Player.hasMany(Rating, { foreignKey: 'playerId' });
Rating.belongsTo(Player, { foreignKey: 'playerId' });

sequelize.sync();

module.exports = { Player, Game, GameResult, Availability, Rating, sequelize };
