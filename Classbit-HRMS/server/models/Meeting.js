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
        type: DataTypes.TEXT('long'),
        get() {
            const raw = this.getDataValue('targetAudience');
            return raw ? JSON.parse(raw) : { type: 'all', data: [] };
        },
        set(val) {
            this.setDataValue('targetAudience', val ? JSON.stringify(val) : JSON.stringify({ type: 'all', data: [] }));
        },
        allowNull: false
    },
    employeeReactions: {
        type: DataTypes.TEXT('long'),
        get() {
            const raw = this.getDataValue('employeeReactions');
            return raw ? JSON.parse(raw) : [];
        },
        set(val) {
            this.setDataValue('employeeReactions', val ? JSON.stringify(val) : '[]');
        },
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = Meeting;
