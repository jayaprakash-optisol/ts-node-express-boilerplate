import { users } from '../../models/users.schema';
import bcrypt from 'bcrypt';
import { logger } from '../../utils/logger';
import env from '../../config/env.config';
import { db } from '../../config/database.config';

// Hash password function
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, parseInt(env.BCRYPT_SALT_ROUNDS.toString(), 10));
};

// Insert sample users
async function seedUsers() {
  try {
    const hashedPassword = await hashPassword('Password123!');

    await db.insert(users).values([
      {
        email: 'admin@leaktrak.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'user@leaktrak.com',
        password: hashedPassword,
        firstName: 'Regular',
        lastName: 'User',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'manager@leaktrak.com',
        password: hashedPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    logger.info('✅ Users seeded successfully');
  } catch (error) {
    logger.error('❌ Error seeding users:', error);
    throw error;
  }
}

async function seed() {
  try {
    logger.info('🌱 Starting database seeding...');

    await seedUsers();

    logger.info('✅ Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
