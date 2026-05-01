const { cloudinary, withRetry, uploadToCloudinary } = require('../config/cloudinary');
const logger = require('../config/logger');
const { Image, sequelize } = require('../models');
const models = require('../models');

const entityModelMap = {
  employee: models.Employee,
  company: models.Company,
  user: models.User,
  task: models.Task,
  // Add other entities as needed
};

const uploadImages = async (req, res) => {
  const { entity_type, entity_id, type = 'general' } = req.body;
  const userId = req.user?.id || 'unknown';

  if (!entity_type || !entity_id) {
    return res.status(400).json({ message: 'entity_type and entity_id are required' });
  }

  // 1. Validate Entity
  const Model = entityModelMap[entity_type.toLowerCase()];
  if (!Model) {
    return res.status(400).json({ message: `Invalid entity_type: ${entity_type}` });
  }

  try {
    const entityExists = await Model.findByPk(entity_id);
    if (!entityExists) {
      return res.status(404).json({ message: `${entity_type} with ID ${entity_id} not found` });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const results = {
      successful: [],
      failed: []
    };

    // 2. Concurrency handling for profile replacement
    if (type === 'profile') {
      // Find existing profile image for this entity
      const existingProfile = await Image.findOne({
        where: { entity_type, entity_id, type: 'profile' }
      });

      if (existingProfile) {
        // Destroy existing from cloudinary using retry wrapper
        try {
          await withRetry(() => cloudinary.uploader.destroy(existingProfile.public_id));
          logger.info(`Replaced profile image in cloudinary`, { user_id: userId, public_id: existingProfile.public_id });
        } catch (err) {
          logger.warn(`Failed to delete old profile image from Cloudinary`, { error: err.message, public_id: existingProfile.public_id });
        }
        // Destroy from DB (soft delete)
        await existingProfile.destroy();
      }
    }

    // Process all files
    for (const file of req.files) {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 10000);
      const public_id = `hrms/${entity_type}/${entity_id}/${timestamp}_${random}`;

      let cloudResult;
      try {
        // Upload with retry
        cloudResult = await withRetry(() => uploadToCloudinary(file.buffer, {
          public_id: public_id,
          folder: `hrms/${entity_type}/${entity_id}`,
          resource_type: 'auto'
        }));
      } catch (error) {
        logger.error('Cloudinary upload failed', { user_id: userId, error: error.message, originalname: file.originalname });
        results.failed.push({
          filename: file.originalname,
          reason: 'Cloudinary upload failed'
        });
        continue;
      }

      // Start DB Transaction for safe save
      const t = await sequelize.transaction();
      try {
        // Generate transformed URL with f_auto and q_auto
        const optimizedUrl = cloudinary.url(cloudResult.public_id, {
          secure: true,
          fetch_format: 'auto',
          quality: 'auto'
        });

        const newImage = await Image.create({
          public_id: cloudResult.public_id,
          url: optimizedUrl,
          entity_type,
          entity_id,
          type,
          size: cloudResult.bytes,
          format: cloudResult.format
        }, { transaction: t });

        await t.commit();
        
        logger.info('Image uploaded successfully', { user_id: userId, image_id: newImage.id, public_id: cloudResult.public_id });
        results.successful.push(newImage);

      } catch (dbError) {
        await t.rollback();
        logger.error('DB save failed, rolling back Cloudinary upload', { user_id: userId, error: dbError.message });
        
        // Rollback Cloudinary upload
        try {
          await withRetry(() => cloudinary.uploader.destroy(cloudResult.public_id));
        } catch (cleanupError) {
          logger.error('Failed to cleanup Cloudinary after DB error', { user_id: userId, public_id: cloudResult.public_id, error: cleanupError.message });
        }

        results.failed.push({
          filename: file.originalname,
          reason: 'Database save failed'
        });
      }
    }

    return res.json({
      message: 'Upload process completed',
      results
    });

  } catch (error) {
    logger.error('Upload process error', { user_id: userId, error: error.message });
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getImages = async (req, res) => {
  try {
    const { entity_type, entity_id, type } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role?.name || 'Employee';

    let whereClause = {};
    if (entity_type) whereClause.entity_type = entity_type;
    if (entity_id) whereClause.entity_id = entity_id;
    if (type) whereClause.type = type;

    // RBAC logic
    if (userRole !== 'Super Admin' && userRole !== 'HR' && userRole !== 'Manager') {
      // If regular employee, they can only view their own images or public company images
      if (entity_type === 'employee' && parseInt(entity_id) !== req.user.employeeId) {
         // restricted
         return res.status(403).json({ message: 'Not authorized to view these images' });
      }
    }

    const images = await Image.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    res.json(images);
  } catch (error) {
    logger.error('Get images failed', { error: error.message });
    res.status(500).json({ message: 'Failed to retrieve images' });
  }
};

const deleteImage = async (req, res) => {
  const imageId = req.params.id;
  const userId = req.user?.id;
  const userRole = req.user?.role?.name;

  try {
    const image = await Image.findByPk(imageId);
    if (!image) {
      return res.status(404).json({ message: 'Image not found in database' });
    }

    // RBAC Logic for Deletion
    if (userRole !== 'Super Admin' && userRole !== 'HR') {
      if (image.entity_type === 'employee' && parseInt(image.entity_id) !== req.user.employeeId) {
        return res.status(403).json({ message: 'Not authorized to delete this image' });
      } else if (image.entity_type !== 'employee') {
        return res.status(403).json({ message: 'Not authorized to delete this image type' });
      }
    }

    // Safe Deletion: Destroy in Cloudinary first
    try {
      await withRetry(() => cloudinary.uploader.destroy(image.public_id));
    } catch (cloudError) {
      logger.error('Failed to delete image from Cloudinary', { user_id: userId, public_id: image.public_id, error: cloudError.message });
      return res.status(500).json({ message: 'Failed to delete image from cloud storage' });
    }

    // Soft delete in DB
    await image.destroy();
    
    logger.info('Image deleted successfully', { user_id: userId, image_id: imageId, public_id: image.public_id });
    res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    logger.error('Delete image failed', { user_id: userId, error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  uploadImages,
  getImages,
  deleteImage
};
