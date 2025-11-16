<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          加载中...
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h2 class="mt-2 text-xl font-medium text-gray-900">{{ error }}</h2>
        <button @click="initializeMode" class="mt-4 inline-block text-blue-600 hover:text-blue-800">重试</button>
      </div>
    </div>

    <!-- 会话设置页面 -->
    <div v-else-if="!activeSession && !sessionEnded" class="max-w-2xl mx-auto py-12 px-4">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">无限制答题模式</h1>
        <p class="text-gray-600 mb-6">在这个模式下，您将持续答题直到分数被扣完。答对不得分，答错扣分。</p>
        
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">初始分数</label>
            <input
              v-model.number="sessionConfig.initialScore"
              type="number"
              min="10"
              max="1000"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="请输入初始分数（10-1000）"
            />
            <p class="mt-1 text-sm text-gray-500">您的初始分数，答错题目将从中扣除</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">每轮题目数量</label>
            <select
              v-model.number="sessionConfig.questionsPerRound"
              class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="3">3题</option>
              <option value="5">5题</option>
              <option value="10">10题</option>
              <option value="15">15题</option>
            </select>
            <p class="mt-1 text-sm text-gray-500">每轮答题的题目数量</p>
          </div>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 class="text-sm font-medium text-yellow-800 mb-2">游戏规则：</h3>
          <ul class="text-sm text-yellow-700 space-y-1">
            <li>• 答对题目：不得分，继续答题</li>
            <li>• 答错题目：扣除题目分值</li>
            <li>• 系统会自动选择您未答过的题目</li>
            <li>• 当分数降至0时，游戏结束</li>
            <li>• 目标是尽可能多地答对题目</li>
          </ul>
        </div>

        <button 
          @click="startSession"
          :disabled="isStarting || !sessionConfig.initialScore || sessionConfig.initialScore < 10"
          class="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isStarting ? '创建中...' : '开始无限制答题' }}
        </button>
      </div>
    </div>

    <!-- 答题进行中 -->
    <div v-else-if="activeSession && !sessionEnded && currentQuestions.length > 0" class="max-w-4xl mx-auto py-6 px-4">
      <!-- 会话信息头部 -->
      <div class="bg-white rounded-lg shadow p-4 mb-6 sticky top-0 z-10">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-xl font-semibold text-gray-900">无限制答题模式</h1>
            <p class="text-sm text-gray-500">
              第 {{ currentQuestionIndex + 1 }} 题 / 本轮 {{ currentQuestions.length }} 题
            </p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold" :class="sessionInfo.currentScore < 50 ? 'text-red-600' : 'text-gray-900'">
              {{ sessionInfo.currentScore }} 分
            </div>
            <p class="text-sm text-gray-500">剩余分数</p>
          </div>
        </div>
        
        <!-- 统计信息 -->
        <div class="mt-4 grid grid-cols-3 gap-4 text-center">
          <div class="bg-gray-50 p-2 rounded">
            <div class="text-lg font-semibold text-gray-900">{{ sessionInfo.totalAnswered }}</div>
            <div class="text-xs text-gray-500">已答题数</div>
          </div>
          <div class="bg-gray-50 p-2 rounded">
            <div class="text-lg font-semibold text-green-600">{{ sessionInfo.totalCorrect }}</div>
            <div class="text-xs text-gray-500">答对题数</div>
          </div>
          <div class="bg-gray-50 p-2 rounded">
            <div class="text-lg font-semibold text-blue-600">
              {{ sessionInfo.totalAnswered > 0 ? Math.round((sessionInfo.totalCorrect / sessionInfo.totalAnswered) * 100) : 0 }}%
            </div>
            <div class="text-xs text-gray-500">正确率</div>
          </div>
        </div>
        
        <!-- 进度条 -->
        <div class="mt-4">
          <div class="bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 题目内容 -->
      <div v-if="currentQuestion" class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex items-center space-x-2 mb-4">
          <span :class="[
            'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
            currentQuestion.type === 'single' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          ]">
            {{ currentQuestion.type === 'single' ? '单选题' : '多选题' }}
          </span>
          <span class="text-sm text-gray-500">{{ currentQuestion.score }}分</span>
        </div>
        
        <h2 class="text-lg font-medium text-gray-900 mb-4">{{ currentQuestion.question }}</h2>
        
        <!-- 多媒体内容 -->
        <div v-if="currentQuestion.image_url || currentQuestion.audio_url || currentQuestion.video_url" class="mb-6 space-y-4">
          <img v-if="currentQuestion.image_url" :src="getMediaUrl(currentQuestion.image_url)" alt="题目图片" class="max-w-md rounded-lg" />
          <audio v-if="currentQuestion.audio_url" :src="getMediaUrl(currentQuestion.audio_url)" controls class="w-full max-w-md"></audio>
          <video v-if="currentQuestion.video_url" :src="getMediaUrl(currentQuestion.video_url)" controls class="w-full max-w-md"></video>
        </div>
        
        <!-- 选项 -->
        <div class="space-y-3">
          <label
            v-for="(option, index) in currentQuestion.options"
            :key="index"
            class="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            :class="{ 'bg-blue-50 border-blue-300': isOptionSelected(index) }"
          >
            <input
              v-if="currentQuestion.type === 'single'"
              type="radio"
              :name="`question-${currentQuestion.id}`"
              :value="index"
              v-model="currentAnswer"
              class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <input
              v-else
              type="checkbox"
              :value="index"
              v-model="currentAnswer"
              class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div class="flex-1">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-medium mr-3">
                {{ String.fromCharCode(65 + index) }}
              </span>
              <span class="text-gray-900">{{ option }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- 导航按钮 -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center">
          <button
            @click="previousQuestion"
            :disabled="currentQuestionIndex === 0"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一题
          </button>
          
          <div class="flex space-x-2">
            <button
              v-if="currentQuestionIndex < currentQuestions.length - 1"
              @click="nextQuestion"
              class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              下一题
            </button>
            <button
              v-else
              @click="submitCurrentRound"
              :disabled="isSubmitting"
              class="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? '提交中...' : '提交本轮' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 等待下一轮 -->
    <div v-else-if="activeSession && !sessionEnded && currentQuestions.length === 0" class="max-w-2xl mx-auto py-12 px-4">
      <div class="bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">准备下一轮</h1>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-sm text-gray-500">当前分数</div>
            <div class="text-2xl font-bold text-gray-900">{{ sessionInfo.currentScore }} 分</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-sm text-gray-500">已答题数</div>
            <div class="text-2xl font-bold text-gray-900">{{ sessionInfo.totalAnswered }} 题</div>
          </div>
        </div>
        
        <button
          @click="loadNextRound"
          :disabled="isLoadingQuestions"
          class="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoadingQuestions ? '加载中...' : '开始下一轮' }}
        </button>
      </div>
    </div>

    <!-- 会话结束 -->
    <div v-else-if="sessionEnded" class="max-w-2xl mx-auto py-12 px-4">
      <div class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="mb-6">
          <svg class="mx-auto h-16 w-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-4">游戏结束！</h1>
        <p class="text-gray-600 mb-6">您的分数已经用完，感谢参与无限制答题模式！</p>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-sm text-gray-500">总答题数</div>
            <div class="text-2xl font-bold text-gray-900">{{ sessionInfo.totalAnswered }} 题</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-sm text-gray-500">答对题数</div>
            <div class="text-2xl font-bold text-green-600">{{ sessionInfo.totalCorrect }} 题</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-sm text-gray-500">正确率</div>
            <div class="text-2xl font-bold text-blue-600">
              {{ sessionInfo.totalAnswered > 0 ? Math.round((sessionInfo.totalCorrect / sessionInfo.totalAnswered) * 100) : 0 }}%
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-sm text-gray-500">初始分数</div>
            <div class="text-2xl font-bold text-gray-900">{{ activeSession?.initial_score || 0 }} 分</div>
          </div>
        </div>
        
        <div class="flex space-x-4 justify-center">
          <button
            @click="startNewSession"
            class="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
          >
            再来一局
          </button>
          <router-link
            to="/dashboard"
            class="bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700"
          >
            返回首页
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { unlimitedAPI } from '../services/api.js'

const isLoading = ref(true)
const error = ref('')
const activeSession = ref(null)
const sessionEnded = ref(false)
const isStarting = ref(false)
const isSubmitting = ref(false)
const isLoadingQuestions = ref(false)

const sessionConfig = reactive({
  initialScore: 100,
  questionsPerRound: 5
})

const sessionInfo = reactive({
  currentScore: 0,
  totalAnswered: 0,
  totalCorrect: 0
})

const currentQuestions = ref([])
const currentQuestionIndex = ref(0)
const currentAnswer = ref(null)
const roundAnswers = reactive({})

const currentQuestion = computed(() => {
  if (!currentQuestions.value || currentQuestions.value.length === 0) return null
  return currentQuestions.value[currentQuestionIndex.value]
})

const isOptionSelected = (optionIndex) => {
  if (!currentQuestion.value) return false
  
  if (currentQuestion.value.type === 'single') {
    return currentAnswer.value === optionIndex
  } else {
    return Array.isArray(currentAnswer.value) && currentAnswer.value.includes(optionIndex)
  }
}

const getMediaUrl = (url) => {
  if (!url) return null
  return url.startsWith('http') ? url : `http://localhost:3001${url}`
}

const initializeMode = async () => {
  try {
    isLoading.value = true
    error.value = ''
    
    // 检查是否有活跃的会话
    const response = await unlimitedAPI.getActiveSession()
    if (response.data.session) {
      activeSession.value = response.data.session
      sessionInfo.currentScore = activeSession.value.current_score
      sessionInfo.totalAnswered = activeSession.value.total_questions_answered
      sessionInfo.totalCorrect = activeSession.value.total_correct
      
      if (activeSession.value.current_score <= 0) {
        sessionEnded.value = true
      } else {
        await loadNextRound()
      }
    }
  } catch (err) {
    console.error('初始化无限制模式失败:', err)
    error.value = err.response?.data?.error || '初始化失败'
  } finally {
    isLoading.value = false
  }
}

const startSession = async () => {
  try {
    isStarting.value = true
    
    const response = await unlimitedAPI.createSession(sessionConfig)
    if (response.data.success) {
      activeSession.value = {
        id: response.data.sessionId,
        initial_score: sessionConfig.initialScore,
        current_score: sessionConfig.initialScore,
        questions_per_round: sessionConfig.questionsPerRound,
        total_questions_answered: 0,
        total_correct: 0,
        is_active: true
      }
      
      sessionInfo.currentScore = sessionConfig.initialScore
      sessionInfo.totalAnswered = 0
      sessionInfo.totalCorrect = 0
      
      await loadNextRound()
    }
  } catch (err) {
    console.error('创建会话失败:', err)
    error.value = err.response?.data?.error || '创建会话失败'
  } finally {
    isStarting.value = false
  }
}

const loadNextRound = async () => {
  try {
    isLoadingQuestions.value = true
    
    const response = await unlimitedAPI.getQuestions(
      activeSession.value.id, 
      activeSession.value.questions_per_round
    )
    
    if (response.data.questions.length === 0) {
      // 没有更多题目了
      sessionEnded.value = true
      return
    }
    
    currentQuestions.value = response.data.questions
    currentQuestionIndex.value = 0
    
    // 重置答案
    Object.keys(roundAnswers).forEach(key => delete roundAnswers[key])
    currentAnswer.value = currentQuestion.value?.type === 'single' ? null : []
    
    // 更新会话信息
    if (response.data.sessionInfo) {
      sessionInfo.currentScore = response.data.sessionInfo.currentScore
      sessionInfo.totalAnswered = response.data.sessionInfo.totalAnswered
      sessionInfo.totalCorrect = response.data.sessionInfo.totalCorrect
    }
  } catch (err) {
    console.error('加载题目失败:', err)
    error.value = err.response?.data?.error || '加载题目失败'
  } finally {
    isLoadingQuestions.value = false
  }
}

const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    // 保存当前答案
    if (currentQuestion.value) {
      roundAnswers[currentQuestion.value.id] = currentAnswer.value
    }
    
    currentQuestionIndex.value--
    
    // 恢复之前的答案
    const prevAnswer = roundAnswers[currentQuestion.value.id]
    currentAnswer.value = prevAnswer !== undefined ? prevAnswer : 
      (currentQuestion.value.type === 'single' ? null : [])
  }
}

const nextQuestion = () => {
  if (currentQuestionIndex.value < currentQuestions.value.length - 1) {
    // 保存当前答案
    if (currentQuestion.value) {
      roundAnswers[currentQuestion.value.id] = currentAnswer.value
    }
    
    currentQuestionIndex.value++
    
    // 恢复之前的答案
    const nextAnswer = roundAnswers[currentQuestion.value.id]
    currentAnswer.value = nextAnswer !== undefined ? nextAnswer : 
      (currentQuestion.value.type === 'single' ? null : [])
  }
}

const submitCurrentRound = async () => {
  try {
    isSubmitting.value = true
    
    // 保存当前题目的答案
    if (currentQuestion.value) {
      roundAnswers[currentQuestion.value.id] = currentAnswer.value
    }
    
    // 逐个提交答案
    for (const question of currentQuestions.value) {
      const answer = roundAnswers[question.id]
      if (answer !== null && answer !== undefined) {
        const response = await unlimitedAPI.submitAnswer(activeSession.value.id, {
          questionId: question.id,
          answer: answer
        })
        
        // 更新会话信息
        if (response.data.sessionInfo) {
          sessionInfo.currentScore = response.data.sessionInfo.currentScore
          sessionInfo.totalAnswered = response.data.sessionInfo.totalAnswered
          sessionInfo.totalCorrect = response.data.sessionInfo.totalCorrect
        }
        
        // 检查会话是否结束
        if (response.data.sessionEnded) {
          sessionEnded.value = true
          return
        }
      }
    }
    
    // 清空当前题目，准备下一轮
    currentQuestions.value = []
    currentQuestionIndex.value = 0
    
  } catch (err) {
    console.error('提交答案失败:', err)
    error.value = err.response?.data?.error || '提交答案失败'
  } finally {
    isSubmitting.value = false
  }
}

const startNewSession = () => {
  activeSession.value = null
  sessionEnded.value = false
  currentQuestions.value = []
  currentQuestionIndex.value = 0
  Object.keys(roundAnswers).forEach(key => delete roundAnswers[key])
  sessionInfo.currentScore = 0
  sessionInfo.totalAnswered = 0
  sessionInfo.totalCorrect = 0
}

onMounted(() => {
  initializeMode()
})
</script>