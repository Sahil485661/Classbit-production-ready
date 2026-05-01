const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getRoles,
    createRole,
    updateRole,
    getDepartments,
    createDepartment,
    reactivateEmployee,
    fullDeleteEmployee,
    getDeletedEmployees,
    adminForcePasswordReset,
    promoteToManager,
    demoteToEmployee
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const cloudinaryUploadMiddleware = require('../middleware/cloudinaryUploadMiddleware');

router.use(protect);

router.get('/roles', getRoles);
router.post('/roles', authorize('Super Admin'), createRole);
router.put('/roles/:id', authorize('Super Admin'), updateRole);
router.get('/departments', getDepartments);
router.post('/departments', authorize('Super Admin'), createDepartment);

router.get('/', getAllEmployees);
router.get('/history', getDeletedEmployees);
router.get('/:id', getEmployeeById);
router.post('/', authorize('Super Admin', 'HR'), cloudinaryUploadMiddleware.single('profilePicture'), createEmployee);
router.put('/:id', authorize('Super Admin', 'HR'), cloudinaryUploadMiddleware.single('profilePicture'), updateEmployee);
router.patch('/:id/reactivate', authorize('Super Admin', 'HR'), reactivateEmployee);
router.patch('/:id/promote', authorize('Super Admin'), promoteToManager);
router.patch('/:id/demote', authorize('Super Admin'), demoteToEmployee);
router.post('/:id/force-password-reset', authorize('Super Admin'), adminForcePasswordReset);
router.delete('/:id', authorize('Super Admin'), deleteEmployee);
router.delete('/:id/full', authorize('Super Admin'), fullDeleteEmployee);

module.exports = router;
