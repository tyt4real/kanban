import { createDbClient, generateId, now } from '../src/app/db/client';
import bcrypt from 'bcryptjs';

async function seed() {
  // This script runs in the Cloudflare Worker environment
  // For local development, use wrangler d1 execute

  console.log('Seeding database...');

  const db = createDbClient((globalThis as any).DB);

  // Create test user
  const testEmail = 'test@example.com';
  const testPassword = 'TestPass123!@#';
  const passwordHash = await bcrypt.hash(testPassword, 12);
  const userId = generateId();
  const timestamp = now();

  try {
    await db.prepare(
      'INSERT OR IGNORE INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, testEmail, passwordHash, timestamp, timestamp).run();

    console.log('Created test user:', testEmail);

    // Create test board
    const boardId = generateId();
    await db.prepare(
      'INSERT OR IGNORE INTO boards (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(boardId, userId, 'Demo Board', 'A sample Kanban board', timestamp, timestamp).run();

    // Create default columns
    const columns = [
      { name: 'Todo', position: 0 },
      { name: 'In Progress', position: 1 },
      { name: 'Finished', position: 2 },
      { name: 'Pending Review', position: 3 },
    ];

    const columnIds: string[] = [];
    for (const col of columns) {
      const colId = generateId();
      columnIds.push(colId);
      await db.prepare(
        'INSERT OR IGNORE INTO columns (id, board_id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(colId, boardId, col.name, col.position, timestamp, timestamp).run();
    }

    console.log('Created board with columns');

    // Create default categories
    const categories = [
      { name: 'Bug', color: '#ef4444', isAiAgent: 0 },
      { name: 'Feature', color: '#3b82f6', isAiAgent: 0 },
      { name: 'Documentation', color: '#8b5cf6', isAiAgent: 0 },
      { name: 'AI Agent', color: '#10b981', isAiAgent: 1 },
    ];

    for (const cat of categories) {
      const catId = generateId();
      await db.prepare(
        'INSERT OR IGNORE INTO categories (id, user_id, name, color, is_ai_agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(catId, userId, cat.name, cat.color, cat.isAiAgent, timestamp, timestamp).run();
    }

    console.log('Created default categories');

    // Create sample tasks
    const tasks = [
      { title: 'Set up project structure', description: 'Initialize repo with TypeScript, Vite, Tailwind', columnIndex: 2, categoryIndex: 1 },
      { title: 'Implement authentication', description: 'JWT auth with bcrypt, HttpOnly cookies', columnIndex: 2, categoryIndex: 1 },
      { title: 'Create Kanban board UI', description: 'Drag-and-drop columns with @dnd-kit', columnIndex: 1, categoryIndex: 1 },
      { title: 'Add category colors', description: 'Color picker for task categories', columnIndex: 0, categoryIndex: 2 },
      { title: 'Configure SMTP notifications', description: 'Email when task moves to Finished', columnIndex: 0, categoryIndex: 2 },
      { title: 'Set up CI/CD pipeline', description: 'GitHub Actions with lint, test, build', columnIndex: 0, categoryIndex: 0 },
      { title: 'Deploy to Cloudflare', description: 'Configure Pages and Workers', columnIndex: 0, categoryIndex: 0 },
    ];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskId = generateId();
      const categoryId = generateId(); // This would need to match actual category IDs

      await db.prepare(
        `INSERT OR IGNORE INTO tasks (id, board_id, column_id, category_id, title, description, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        taskId,
        boardId,
        columnIds[task.columnIndex],
        null, // category_id - would need actual category IDs
        task.title,
        task.description,
        i,
        timestamp,
        timestamp
      ).run();
    }

    console.log('Created sample tasks');

    // Set default settings
    await db.prepare(
      'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    ).bind('rate_limits', JSON.stringify({ authLimit: 5, apiLimit: 60, webhookLimit: 10 }), timestamp).run();

    console.log('Seeding complete!');
    console.log('\nTest credentials:');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);

  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

// Export for use in Worker environment
export { seed };

// If run directly
if (import.meta.main) {
  seed().catch(console.error);
}