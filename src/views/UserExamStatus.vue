<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 页面标题 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">用户考试状态</h1>
        <p class="mt-2 text-gray-600">查看所有用户的考试参与情况和成绩统计</p>
      </div>

      <!-- 筛选器 -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">选择试卷</label>
            <select 
              v-model="selectedExamId" 
              @change="loadUserExamStatus"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有试卷</option>
              <option v-for="exam in exams" :key="exam.id" :value="exam.id">
                {{ exam.title }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">用户搜索</label>
            <input 
              v-model="searchUser"
              @input="loadUserExamStatus"
              type="text" 
              placeholder="输入用户名或邮箱"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">状态筛选</label>
            <select 
              v-model="statusFilter" 
              @change="loadUserExamStatus"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="completed">已完成</option>
              <option value="in_progress">进行中</option>
              <option value="not_started">未开始</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <LoadingSpinner v-if="loading" />

      <!-- 错误信息 -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">加载失败</h3>
            <div class="mt-2 text-sm text-red-700">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- 用户考试状态列表 -->
      <div v-else class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">
            用户考试记录 
            <span class="text-sm text-gray-500">(共 {{ userExamStatus.length }} 条记录)</span>
          </h3>
        </div>

        <div v-if="userExamStatus.length === 0" class="p-8 text-center">
          <EmptyState 
            title="暂无考试记录"
            description="当前筛选条件下没有找到相关的考试记录"
          />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  试卷信息
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  考试状态
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成绩信息
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间信息
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="record in userExamStatus" :key="`${record.user_id}-${record.exam_id}`" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <span class="text-sm font-medium text-white">
                          {{ record.username ? record.username.charAt(0).toUpperCase() : 'U' }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ record.username || '未知用户' }}</div>
                      <div class="text-sm text-gray-500">{{ record.email || '无邮箱' }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ record.exam_title }}</div>
                  <div class="text-sm text-gray-500">
                    {{ getScoringModeText(record.scoring_mode) }}
                    <span v-if="record.total_score"> · 总分 {{ record.total_score }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="getStatusClass(record.status)"
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  >
                    {{ getStatusText(record.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div v-if="record.status === 'completed'">
                    <div class="font-medium">{{ record.user_score || 0 }} 分</div>
                    <div class="text-gray-500">
                      正确率: {{ record.total_questions > 0 ? Math.round((record.correct_count / record.total_questions) * 100) : 0 }}%
                    </div>
                    <div class="text-gray-500">
                      {{ record.correct_count || 0 }}/{{ record.total_questions || 0 }} 题
                    </div>
                  </div>
                  <div v-else class="text-gray-400">-</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div v-if="record.started_at">
                    <div>开始: {{ formatDate(record.started_at) }}</div>
                    <div v-if="record.submitted_at">
                      完成: {{ formatDate(record.submitted_at) }}
                    </div>
                    <div v-if="record.duration_seconds">
                      用时: {{ formatDuration(record.duration_seconds) }}
                    </div>
                  </div>
                  <div v-else class="text-gray-400">未开始</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    v-if="record.status === 'completed'"
                    @click="viewExamDetail(record)"
                    class="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    查看详情
                  </button>
                  <button
                    v-if="record.status === 'in_progress'"
                    @click="resetExam(record)"
                    class="text-red-600 hover:text-red-900"
                  >
                    重置考试
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 考试详情模态框 -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">考试详情</h3>
            <button
              @click="showDetailModal = false"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div v-if="selectedRecord" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">用户</label>
                <p class="mt-1 text-sm text-gray-900">{{ selectedRecord.username }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">试卷</label>
                <p class="mt-1 text-sm text-gray-900">{{ selectedRecord.exam_title }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">得分</label>
                <p class="mt-1 text-sm text-gray-900">{{ selectedRecord.user_score }} / {{ selectedRecord.total_score }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">正确率</label>
                <p class="mt-1 text-sm text-gray-900">
                  {{ selectedRecord.total_questions > 0 ? Math.round((selectedRecord.correct_count / selectedRecord.total_questions) * 100) : 0 }}%
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">用时</label>
                <p class="mt-1 text-sm text-gray-900">{{ formatDuration(selectedRecord.duration_seconds) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">完成时间</label>
                <p class="mt-1 text-sm text-gray-900">{{ formatDate(selectedRecord.submitted_at) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { examAPI, userAPI } from '../services/api.js'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import EmptyState from '../components/EmptyState.vue'

const loading = ref(true)
const error = ref('')
const exams = ref([])
const userExamStatus = ref([])
const selectedExamId = ref('')
const searchUser = ref('')
const statusFilter = ref('')
const showDetailModal = ref(false)
const selectedRecord = ref(null)

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (seconds) => {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}

const getScoringModeText = (mode) => {
  const modes = {
    'standard': '标准计分',
    'deduction': '扣分制',
    'unlimited': '无限制'
  }
  return modes[mode] || mode
}

const getStatusText = (status) => {
  if (status === 'completed') return '已完成'
  if (status === 'in_progress') return '进行中'
  return '未开始'
}

const getStatusClass = (status) => {
  if (status === 'completed') return 'bg-green-100 text-green-800'
  if (status === 'in_progress') return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-800'
}

const loadExams = async () => {
  try {
    const response = await examAPI.getExams()
    exams.value = response.data
  } catch (err) {
    console.error('获取试卷列表失败:', err)
  }
}

const loadUserExamStatus = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const params = {}
    if (selectedExamId.value) params.examId = selectedExamId.value
    if (searchUser.value) params.search = searchUser.value
    if (statusFilter.value) params.status = statusFilter.value
    
    const response = await userAPI.getUserExamStatus(params)
    userExamStatus.value = response.data
  } catch (err) {
    error.value = err.response?.data?.error || '获取用户考试状态失败'
  } finally {
    loading.value = false
  }
}

const viewExamDetail = (record) => {
  selectedRecord.value = record
  showDetailModal.value = true
}

const resetExam = async (record) => {
  if (!confirm(`确定要重置用户 ${record.username} 的考试吗？这将清除其当前进度。`)) {
    return
  }
  
  try {
    await examAPI.resetUserExam(record.exam_id, record.user_id)
    await loadUserExamStatus()
    alert('考试已重置')
  } catch (err) {
    alert(err.response?.data?.error || '重置考试失败')
  }
}

onMounted(async () => {
  await Promise.all([
    loadExams(),
    loadUserExamStatus()
  ])
})
</script>