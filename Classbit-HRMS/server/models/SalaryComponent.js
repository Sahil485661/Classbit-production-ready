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
        type: DataTypes.TEXT('long'),
        get() {
            const raw = this.getDataValue('allowances');
            return raw ? JSON.parse(raw) : {};
        },
        set(val) {
            this.setDataValue('allowances', val ? JSON.stringify(val) : '{}');
        }
    },
    deductions: {
        type: DataTypes.TEXT('long'),
        get() {
            const raw = this.getDataValue('deductions');
            return raw ? JSON.parse(raw) : {};
        },
        set(val) {
            this.setDataValue('deductions', val ? JSON.stringify(val) : '{}');
        }
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    }
}, {
    timestamps: true
});

module.exports = SalaryComponent;
