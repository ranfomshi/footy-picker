const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

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
    gameId: {
        type: DataTypes.INTEGER,
        references: {
            model: Game,
            key: 'id'
        }
    },
    raterId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        }
    },
    rateeId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        }
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

Player.belongsToMany(Game, { through: GameResult });
Game.belongsToMany(Player, { through: GameResult });
Player.belongsToMany(Game, { through: Availability });
Game.belongsToMany(Player, { through: Availability });

sequelize.sync();

module.exports = { Player, Game, GameResult, Availability, Rating, sequelize };
