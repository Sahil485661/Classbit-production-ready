const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Setting = sequelize.define('Setting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    key: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    value: {
        type: DataTypes.TEXT('long'),
        get() {
            const raw = this.getDataValue('value');
            return raw ? JSON.parse(raw) : null;
        },
        set(val) {
            this.setDataValue('value', val ? JSON.stringify(val) : null);
        },
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'General'
    }
}, {
    timestamps: true
});

module.exports = Setting;
