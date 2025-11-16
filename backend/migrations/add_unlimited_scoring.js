import { dbRun, dbGet } from '../models/database.js';

export async function migrateUnlimitedScoring() {
  try {
    // 检查是否需要迁移
    const tableInfo = await dbGet(`PRAGMA table_info(exams)`);
    console.log('Current exams table structure:', tableInfo);
    
    // 由于SQLite不支持直接修改CHECK约束，我们需要重建表
    console.log('开始迁移数据库以支持unlimited计分模式...');
    
    // 1. 创建新的临时表
    await dbRun(`
      CREATE TABLE IF NOT EXISTS exams_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        duration INTEGER DEFAULT 60,
        scoring_mode TEXT DEFAULT 'add' CHECK(scoring_mode IN ('add', 'subtract', 'unlimited')),
        total_score INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    
    // 2. 复制数据到新表
    await dbRun(`
      INSERT INTO exams_new (id, title, description, duration, scoring_mode, total_score, is_active, created_by, created_at, updated_at)
      SELECT id, title, description, duration, scoring_mode, total_score, is_active, created_by, created_at, updated_at
      FROM exams
    `);
    
    // 3. 删除旧表
    await dbRun(`DROP TABLE exams`);
    
    // 4. 重命名新表
    await dbRun(`ALTER TABLE exams_new RENAME TO exams`);
    
    console.log('数据库迁移完成！');
    return true;
  } catch (error) {
    console.error('数据库迁移失败:', error);
    return false;
  }
}