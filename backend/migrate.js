import { migrateUnlimitedScoring } from './migrations/add_unlimited_scoring.js';

async function runMigrations() {
  console.log('开始运行数据库迁移...');
  
  try {
    const success = await migrateUnlimitedScoring();
    if (success) {
      console.log('所有迁移完成！');
      process.exit(0);
    } else {
      console.error('迁移失败！');
      process.exit(1);
    }
  } catch (error) {
    console.error('迁移过程中出错:', error);
    process.exit(1);
  }
}

runMigrations();