const { sequelize } = require('./config/db');
const { User, Role, Employee, Department, SalaryComponent } = require('./models');

const indianNames = [
    { first: 'Aarav', last: 'Patel', gender: 'Male' },
    { first: 'Vivaan', last: 'Sharma', gender: 'Male' },
    { first: 'Aditya', last: 'Singh', gender: 'Male' },
    { first: 'Vihaan', last: 'Kumar', gender: 'Male' },
    { first: 'Arjun', last: 'Rao', gender: 'Male' },
    { first: 'Sai', last: 'Krishna', gender: 'Male' },
    { first: 'Reyansh', last: 'Gupta', gender: 'Male' },
    { first: 'Ayaan', last: 'Deshmukh', gender: 'Male' },
    { first: 'Krishna', last: 'Reddy', gender: 'Male' },
    { first: 'Ishaan', last: 'Joshi', gender: 'Male' },
    { first: 'Diya', last: 'Chauhan', gender: 'Female' },
    { first: 'Ananya', last: 'Iyer', gender: 'Female' },
    { first: 'Kiara', last: 'Kapoor', gender: 'Female' },
    { first: 'Saanvi', last: 'Verma', gender: 'Female' },
    { first: 'Priya', last: 'Das', gender: 'Female' },
    { first: 'Riya', last: 'Nair', gender: 'Female' },
    { first: 'Aaradhya', last: 'Bose', gender: 'Female' },
    { first: 'Anika', last: 'Sen', gender: 'Female' },
    { first: 'Navya', last: 'Mishra', gender: 'Female' },
    { first: 'Myra', last: 'Jain', gender: 'Female' },
];

const departmentsData = ['Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance'];

async function seedData() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Get or Create Employee Role
        let empRole = await Role.findOne({ where: { name: 'Employee' } });
        if (!empRole) {
            empRole = await Role.create({ name: 'Employee', description: 'Standard Employee Role' });
        }

        // Get or Create Departments
        const departments = [];
        for (const deptName of departmentsData) {
            let dept = await Department.findOne({ where: { name: deptName } });
            if (!dept) {
                dept = await Department.create({ name: deptName });
            }
            departments.push(dept);
        }

        // Create Employees
        for (let i = 0; i < indianNames.length; i++) {
            const nameObj = indianNames[i];
            const email = `${nameObj.first.toLowerCase()}.${nameObj.last.toLowerCase()}@example.com`;
            
            // Check if user already exists
            let user = await User.findOne({ where: { email } });
            if (user) {
                console.log(`User ${email} already exists, skipping...`);
                continue;
            }

            // Create User
            user = await User.create({
                email: email,
                password: 'password123',
                roleId: empRole.id,
                isActive: true,
                needsPasswordChange: false // Skip password change for dummy data
            });

            const dept = departments[Math.floor(Math.random() * departments.length)];

            // Create Employee
            const employeeIdStr = `EMP${1000 + i + Math.floor(Math.random()*1000)}`;
            const employee = await Employee.create({
                userId: user.id,
                employeeId: employeeIdStr,
                firstName: nameObj.first,
                lastName: nameObj.last,
                phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
                gender: nameObj.gender,
                dob: new Date(1990 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
                joiningDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
                departmentId: dept.id,
                designation: 'Software Engineer', // Default designation
                status: 'Active',
                probationPeriodMonths: 3
            });

            // Make some designations more realistic based on dept
            if (dept.name === 'Human Resources') employee.designation = 'HR Executive';
            else if (dept.name === 'Sales') employee.designation = 'Sales Representative';
            else if (dept.name === 'Marketing') employee.designation = 'Marketing Specialist';
            else if (dept.name === 'Finance') employee.designation = 'Financial Analyst';
            await employee.save();

            // Create Salary Component
            const baseSalary = 30000 + Math.floor(Math.random() * 70000); // 30k to 100k INR roughly
            await SalaryComponent.create({
                employeeId: employee.id,
                baseSalary: baseSalary,
                payType: 'Monthly',
                allowances: {
                    HRA: Math.floor(baseSalary * 0.4), // 40% of basic
                    DA: Math.floor(baseSalary * 0.2), // 20% of basic
                    Medical: 1500,
                    Transport: 1600
                },
                deductions: {
                    PF: Math.floor(baseSalary * 0.12), // 12% of basic
                    ProfessionalTax: 200,
                    TDS: Math.floor(baseSalary * 0.1) // 10% of basic rough est
                },
                currency: 'INR'
            });

            console.log(`Created Employee: ${nameObj.first} ${nameObj.last}`);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedData();
