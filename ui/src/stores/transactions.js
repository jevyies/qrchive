import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockApi, axiosInstance } from '../plugins/axios'

export const useTransactionStore = defineStore('transactions', () => {
  const transactions = ref([])
  const metrics = ref({
    totalRevenue: 0,
    revenueGrowth: '+0%',
    activeUsers: 0,
    userGrowth: '+0%',
    successfulRate: 0,
    pendingApprovals: 0,
  })
  const isLoading = ref(false)
  const error = ref(null)
  const lastFetched = ref(null)
  const latency = ref(0)
  const filterStatus = ref('all')
  const searchQuery = ref('')

  // Computed Filters
  const filteredTransactions = computed(() => {
    return transactions.value.filter((tx) => {
      const matchesStatus = filterStatus.value === 'all' || tx.status === filterStatus.value
      const matchesSearch =
        !searchQuery.value ||
        tx.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        tx.customer.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        tx.customerEmail.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchesStatus && matchesSearch
    })
  })

  const totalVolume = computed(() => {
    return transactions.value.reduce((acc, curr) => acc + (curr.amount || 0), 0)
  })

  // Actions
  const fetchTransactions = async () => {
    isLoading.value = true
    error.value = null
    const startTime = Date.now()

    try {
      // In production/connected mode, try axiosInstance; fallback gracefully to mock API
      let res
      try {
        res = await axiosInstance.get('/transactions')
      } catch {
        res = await mockApi.getTransactions()
      }

      transactions.value = res.data
      latency.value = Date.now() - startTime
      lastFetched.value = new Date().toLocaleTimeString()
      return res.data
    } catch (err) {
      error.value = err.message || 'Failed to fetch transactions'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchMetrics = async () => {
    try {
      let res
      try {
        res = await axiosInstance.get('/metrics')
      } catch {
        res = await mockApi.getMetrics()
      }
      metrics.value = res.data
      return res.data
    } catch (err) {
      console.warn('Metrics fetch warning:', err)
    }
  }

  const addTransaction = (newTx) => {
    const tx = {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      ...newTx,
    }
    transactions.value.unshift(tx)
    return tx
  }

  const updateTransaction = (id, updatedFields) => {
    const index = transactions.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      transactions.value[index] = { ...transactions.value[index], ...updatedFields }
      return transactions.value[index]
    }
    return null
  }

  const deleteTransaction = (id) => {
    const index = transactions.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      const removed = transactions.value.splice(index, 1)
      return removed[0]
    }
    return null
  }

  return {
    transactions,
    metrics,
    isLoading,
    error,
    lastFetched,
    latency,
    filterStatus,
    searchQuery,
    filteredTransactions,
    totalVolume,
    fetchTransactions,
    fetchMetrics,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
})
