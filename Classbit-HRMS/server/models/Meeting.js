const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Meeting = sequelize.define('Meeting', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dateTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    agenda: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    meetingLink: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Scheduled', 'Completed', 'Canceled'),
        defaultValue: 'Scheduled'
    },
    organizerId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    targetAudience: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: { type: 'all', data: [] }, // type can be 'all', 'departments', 'employees'. data is array of ids.
    },
    employeeReactions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [] // Array of { employeeId: string, status: 'Accepted' | 'Declined', timestamp: date }
    }
}, {
    timestamps: true
});

module.exports = Meeting;
