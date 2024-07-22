const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DATABASE_URL_DEV:', process.env.DATABASE_URL_DEV);

const databaseUrl = process.env.NODE_ENV === 'development' ? process.env.DATABASE_URL_DEV : process.env.DATABASE_URL;

console.log('Using database URL:', databaseUrl);

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'development' ? false : {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// Define models
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
        allowNull: true // Add if you want to track who rated
    }
});

// Define associations
Player.belongsToMany(Game, { through: GameResult });
Game.belongsToMany(Player, { through: GameResult });

Player.belongsToMany(Game, { through: Availability });
Game.belongsToMany(Player, { through: Availability });

Player.hasMany(Rating, { foreignKey: 'playerId' });
Rating.belongsTo(Player, { foreignKey: 'playerId' });

Game.hasMany(GameResult, { foreignKey: 'gameId' });
GameResult.belongsTo(Game, { foreignKey: 'gameId' });

Player.hasMany(GameResult, { foreignKey: 'playerId' });
GameResult.belongsTo(Player, { foreignKey: 'playerId' });

(async () => {
    try {
        await sequelize.authenticate();
        const syncOptions = process.env.NODE_ENV === 'development' ? { force: true } : {};
        await sequelize.sync(syncOptions);
        console.log('All models were synchronized successfully.');
    } catch (error) {
        console.error('Unable to synchronize the models:', error);
    }
})();

module.exports = { Player, Game, GameResult, Availability, Rating, sequelize };
