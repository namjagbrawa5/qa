import { dbGet, dbAll, dbRun } from './database.js';
import Question from './Question.js';

class UnlimitedSession {
  static async create(sessionData) {
    const {
      userId,
      initialScore,
      questionsPerRound = 5
    } = sessionData;
    
    const result = await dbRun(
      `INSERT INTO unlimited_sessions (user_id, initial_score, current_score, questions_per_round) 
       VALUES (?, ?, ?, ?)`,
      [userId, initialScore, initialScore, questionsPerRound]
    );
    
    return result.id;
  }
  
  static async findById(id) {
    const session = await dbGet('SELECT * FROM unlimited_sessions WHERE id = ?', [id]);
    return session;
  }
  
  static async findActiveByUser(userId) {
    const session = await dbGet(
      'SELECT * FROM unlimited_sessions WHERE user_id = ? AND is_active = 1 ORDER BY started_at DESC LIMIT 1',
      [userId]
    );
    return session;
  }
  
  static async findByUser(userId, limit = 50, offset = 0) {
    const sessions = await dbAll(
      `SELECT * FROM unlimited_sessions 
       WHERE user_id = ? 
       ORDER BY started_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return sessions;
  }
  
  static async getNextQuestions(sessionId, count = 5) {
    // 获取会话信息
    const session = await this.findById(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }
    
    // 获取用户已经答过的题目ID
    const answeredQuestions = await dbAll(
      'SELECT DISTINCT question_id FROM unlimited_question_records WHERE session_id = ?',
      [sessionId]
    );
    
    const answeredIds = answeredQuestions.map(q => q.question_id);
    
    // 构建排除已答题目的查询
    let excludeClause = '';
    let params = [count];
    
    if (answeredIds.length > 0) {
      excludeClause = `WHERE id NOT IN (${answeredIds.map(() => '?').join(',')})`;
      params = [...answeredIds, count];
    }
    
    // 随机获取未答过的题目
    const questions = await dbAll(
      `SELECT * FROM questions ${excludeClause} ORDER BY RANDOM() LIMIT ?`,
      params
    );
    
    return questions.map(question => ({
      ...question,
      options: JSON.parse(question.options),
      correct_answer: JSON.parse(question.correct_answer)
    }));
  }
  
  static async submitAnswer(sessionId, questionId, userAnswer) {
    // 获取题目信息
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('题目不存在');
    }
    
    // 获取会话信息
    const session = await this.findById(sessionId);
    if (!session || !session.is_active) {
      throw new Error('会话不存在或已结束');
    }
    
    // 判断答案是否正确
    let isCorrect = false;
    const correctAnswer = JSON.parse(question.correct_answer);
    
    if (question.type === 'single') {
      isCorrect = userAnswer === correctAnswer;
    } else if (question.type === 'multiple') {
      isCorrect = Array.isArray(userAnswer) && 
        userAnswer.length === correctAnswer.length &&
        userAnswer.every(ans => correctAnswer.includes(ans));
    }
    
    // 计算分数变化（答对不得分，答错扣分）
    const scoreChange = isCorrect ? 0 : -question.score;
    const newScore = Math.max(0, session.current_score + scoreChange);
    
    // 记录答题
    await dbRun(
      `INSERT INTO unlimited_question_records (session_id, question_id, user_answer, is_correct, score_change) 
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, questionId, JSON.stringify(userAnswer), isCorrect ? 1 : 0, scoreChange]
    );
    
    // 更新会话统计
    const newTotalAnswered = session.total_questions_answered + 1;
    const newTotalCorrect = session.total_correct + (isCorrect ? 1 : 0);
    
    await dbRun(
      `UPDATE unlimited_sessions 
       SET current_score = ?, total_questions_answered = ?, total_correct = ?
       WHERE id = ?`,
      [newScore, newTotalAnswered, newTotalCorrect, sessionId]
    );
    
    // 检查是否需要结束会话（分数为0）
    if (newScore === 0) {
      await this.endSession(sessionId);
    }
    
    return {
      isCorrect,
      scoreChange,
      newScore,
      sessionEnded: newScore === 0,
      correctAnswer: correctAnswer
    };
  }
  
  static async endSession(sessionId) {
    await dbRun(
      'UPDATE unlimited_sessions SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );
    return true;
  }
  
  static async getSessionStats(sessionId) {
    const session = await this.findById(sessionId);
    if (!session) return null;
    
    const records = await dbAll(
      `SELECT uqr.*, q.question, q.type, q.score 
       FROM unlimited_question_records uqr 
       JOIN questions q ON uqr.question_id = q.id 
       WHERE uqr.session_id = ? 
       ORDER BY uqr.answered_at`,
      [sessionId]
    );
    
    return {
      session,
      records: records.map(record => ({
        ...record,
        user_answer: JSON.parse(record.user_answer)
      })),
      accuracy: session.total_questions_answered > 0 
        ? Math.round((session.total_correct / session.total_questions_answered) * 100) 
        : 0
    };
  }
  
  static async getUserStats(userId) {
    const totalSessions = await dbGet(
      'SELECT COUNT(*) as count FROM unlimited_sessions WHERE user_id = ?',
      [userId]
    );
    
    const completedSessions = await dbGet(
      'SELECT COUNT(*) as count FROM unlimited_sessions WHERE user_id = ? AND is_active = 0',
      [userId]
    );
    
    const totalQuestions = await dbGet(
      'SELECT SUM(total_questions_answered) as total FROM unlimited_sessions WHERE user_id = ?',
      [userId]
    );
    
    const totalCorrect = await dbGet(
      'SELECT SUM(total_correct) as total FROM unlimited_sessions WHERE user_id = ?',
      [userId]
    );
    
    const avgAccuracy = totalQuestions.total > 0 
      ? Math.round((totalCorrect.total / totalQuestions.total) * 100) 
      : 0;
    
    return {
      totalSessions: totalSessions.count,
      completedSessions: completedSessions.count,
      totalQuestions: totalQuestions.total || 0,
      totalCorrect: totalCorrect.total || 0,
      avgAccuracy
    };
  }
}

export default UnlimitedSession;