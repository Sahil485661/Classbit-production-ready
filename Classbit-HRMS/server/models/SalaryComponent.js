const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SalaryComponent = sequelize.define('SalaryComponent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    baseSalary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    payType: {
        type: DataTypes.ENUM('Monthly', 'Weekly', 'Hourly', 'Task-Based'),
        defaultValue: 'Monthly'
    },
    allowances: {
        type: DataTypes.JSON, // { HRA: 500, Travel: 200 }
        defaultValue: {}
    },
    deductions: {
        type: DataTypes.JSON, // { PF: 200, Tax: 100 }
        defaultValue: {}
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    }
}, {
    timestamps: true
});

module.exports = SalaryComponent;
