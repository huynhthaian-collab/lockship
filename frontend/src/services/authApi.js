import apiClient from './apiClient.js'

function getData(response) {
  return response.data?.data ?? {}
}

export const authApi = {
  googleLoginUrl() {
    return `${apiClient.defaults.baseURL}/auth/google`
  },

  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials, { skipAuth: true })
    return getData(response)
  },

  async register(details) {
    const response = await apiClient.post('/auth/register', details, { skipAuth: true })
    return { message: response.data?.message || 'OTP has been sent to your email.' }
  },

  async verifyRegistration(email, otp) {
    const response = await apiClient.post('/auth/register/verify', { email, otp }, { skipAuth: true })
    return { message: response.data?.message || 'Email verified.' }
  },

  async resendRegistrationOtp(email) {
    const response = await apiClient.post('/auth/register/resend-otp', { email }, { skipAuth: true })
    return { message: response.data?.message || 'OTP has been sent to your email.' }
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me')
    return getData(response)
  },

  async completeGoogleProfile(profile) {
    const response = await apiClient.post('/auth/google/complete-profile', profile, { skipAuth: true })
    return getData(response)
  },

  async logout() {
    const response = await apiClient.post('/auth/logout')
    return getData(response)
  },

  async updateProfile(profile) {
    const response = await apiClient.put('/auth/profile', profile)
    return getData(response).user
  },

  async forgotPassword(email) {
    const response = await apiClient.post('/auth/forgot-password', { email }, { skipAuth: true })
    return { message: response.data?.message || 'If the email is associated with an account, a verification code has been sent.' }
  },

  async verifyForgotPassword(email, otp) {
    const response = await apiClient.post('/auth/forgot-password/verify', { email, otp }, { skipAuth: true })
    return getData(response)
  },

  async resendForgotPasswordOtp(email) {
    const response = await apiClient.post('/auth/forgot-password/resend-otp', { email }, { skipAuth: true })
    return { message: response.data?.message || 'If the email is associated with an account, a verification code has been sent.' }
  },

  async resetPassword(resetToken, newPassword) {
    const response = await apiClient.post('/auth/reset-password', { resetToken, newPassword }, { skipAuth: true })
    return { message: response.data?.message || 'Password reset successfully.' }
  },
}