import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import UnlimitedSession from '../models/UnlimitedSession.js';

const router = express.Router();

// 创建无限制答题会话
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { initialScore, questionsPerRound } = req.body;
    
    if (!initialScore || initialScore <= 0) {
      return res.status(400).json({ error: '初始分数必须大于0' });
    }
    
    // 检查是否有活跃的会话
    const activeSession = await UnlimitedSession.findActiveByUser(req.user.id);
    if (activeSession) {
      return res.status(400).json({ 
        error: '您已有一个活跃的无限制答题会话',
        sessionId: activeSession.id
      });
    }
    
    const sessionId = await UnlimitedSession.create({
      userId: req.user.id,
      initialScore,
      questionsPerRound: questionsPerRound || 5
    });
    
    res.json({
      success: true,
      sessionId,
      message: '无限制答题会话创建成功'
    });
  } catch (error) {
    console.error('创建无限制答题会话失败:', error);
    res.status(500).json({ error: '创建会话失败' });
  }
});

// 获取当前活跃会话
router.get('/sessions/active', authenticateToken, async (req, res) => {
  try {
    const session = await UnlimitedSession.findActiveByUser(req.user.id);
    
    if (!session) {
      return res.json({ session: null });
    }
    
    res.json({ session });
  } catch (error) {
    console.error('获取活跃会话失败:', error);
    res.status(500).json({ error: '获取会话失败' });
  }
});

// 获取下一轮题目
router.get('/sessions/:sessionId/questions', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { count = 5 } = req.query;
    
    // 验证会话所有权
    const session = await UnlimitedSession.findById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问此会话' });
    }
    
    if (!session.is_active) {
      return res.status(400).json({ error: '会话已结束' });
    }
    
    const questions = await UnlimitedSession.getNextQuestions(sessionId, parseInt(count));
    
    if (questions.length === 0) {
      return res.json({ 
        questions: [], 
        message: '题库中没有更多未答过的题目',
        sessionEnded: true
      });
    }
    
    // 不返回正确答案给前端
    const questionsForClient = questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      score: q.score,
      image_url: q.image_url,
      audio_url: q.audio_url,
      video_url: q.video_url
    }));
    
    res.json({ 
      questions: questionsForClient,
      sessionInfo: {
        currentScore: session.current_score,
        totalAnswered: session.total_questions_answered,
        totalCorrect: session.total_correct
      }
    });
  } catch (error) {
    console.error('获取题目失败:', error);
    res.status(500).json({ error: '获取题目失败' });
  }
});

// 提交答案
router.post('/sessions/:sessionId/submit', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answer } = req.body;
    
    // 验证会话所有权
    const session = await UnlimitedSession.findById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问此会话' });
    }
    
    if (!session.is_active) {
      return res.status(400).json({ error: '会话已结束' });
    }

    console.log(sessionId, questionId, answer);

    const result = await UnlimitedSession.submitAnswer(sessionId, questionId, answer);

    res.json({
      success: true,
      ...result,
      sessionInfo: {
        currentScore: result.newScore,
        totalAnswered: session.total_questions_answered + 1,
        totalCorrect: session.total_correct + (result.isCorrect ? 1 : 0)
      }
    });
  } catch (error) {
    console.error('提交答案失败:', error);
    res.status(500).json({ error: error.message || '提交答案失败' });
  }
});

// 结束会话
router.post('/sessions/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // 验证会话所有权
    const session = await UnlimitedSession.findById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问此会话' });
    }
    
    await UnlimitedSession.endSession(sessionId);
    
    res.json({
      success: true,
      message: '会话已结束'
    });
  } catch (error) {
    console.error('结束会话失败:', error);
    res.status(500).json({ error: '结束会话失败' });
  }
});

// 获取会话统计
router.get('/sessions/:sessionId/stats', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // 验证会话所有权
    const session = await UnlimitedSession.findById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问此会话' });
    }
    
    const stats = await UnlimitedSession.getSessionStats(sessionId);
    
    res.json({ stats });
  } catch (error) {
    console.error('获取会话统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取用户历史会话
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const sessions = await UnlimitedSession.findByUser(
      req.user.id, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({ sessions });
  } catch (error) {
    console.error('获取历史会话失败:', error);
    res.status(500).json({ error: '获取历史会话失败' });
  }
});

// 获取用户无限制答题统计
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await UnlimitedSession.getUserStats(req.user.id);
    
    res.json({ stats });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

export default router;