import apiClient, { getApiOrigin } from './apiClient.js'

function dataOf(response) {
    return response.data?.data ?? {}
}

export const adminApi = {
    async health() {
        return (await apiClient.get('/health', { baseURL: getApiOrigin() })).data
    },
    async users() {
        return dataOf(await apiClient.get('/v1/users')).users ?? []
    },
    async user(id) {
        return dataOf(await apiClient.get(`/v1/users/${id}`)).user
    },
    async createUser(payload) {
        return dataOf(await apiClient.post('/v1/users', payload)).user
    },
    async updateUser(id, payload) {
        return dataOf(await apiClient.put(`/v1/users/${id}`, payload)).user
    },
    async deleteUser(id) {
        return dataOf(await apiClient.delete(`/v1/users/${id}`))
    },
    async setUserStatus(id, status) {
        return dataOf(await apiClient.patch(`/v1/users/${id}/status`, { status })).user
    },
    async setUserRole(id, role, ownerId) {
        return dataOf(await apiClient.patch(`/v1/users/${id}/role`, { role, ...(ownerId ? { ownerId } : {}) })).user
    },
    async vehicles() {
        return dataOf(await apiClient.get('/vehicles')).vehicles ?? []
    },
    async vehicle(id) {
        return dataOf(await apiClient.get(`/vehicles/${id}`)).vehicle
    },
    async updateVehicle(id, payload) {
        return dataOf(await apiClient.put(`/vehicles/${id}`, payload)).vehicle
    },
    async deleteVehicle(id) {
        return dataOf(await apiClient.delete(`/vehicles/${id}`))
    },
    async deliveries() {
        return dataOf(await apiClient.get('/deliveries')).deliveries ?? []
    },
    async delivery(id) {
        return dataOf(await apiClient.get(`/deliveries/${id}`)).delivery
    },
    async devices() {
        return dataOf(await apiClient.get('/iot')).devices ?? []
    },
    async device(id) {
        return dataOf(await apiClient.get(`/iot/${id}`)).device
    },
    async createDevice(payload) {
        return dataOf(await apiClient.post('/iot', payload))
    },
    async updateDevice(id, payload) {
        return dataOf(await apiClient.put(`/iot/${id}`, payload)).device
    },
    async deleteDevice(id) {
        return dataOf(await apiClient.delete(`/iot/${id}`))
    },
    async deviceStatus(id) {
        return dataOf(await apiClient.get(`/iot/${id}/status`)).status
    },
    async deviceLogs(id) {
        return dataOf(await apiClient.get(`/iot/${id}/logs`)).logs ?? []
    },
    async sendCommand(id, command) {
        return dataOf(await apiClient.post(`/iot/${id}/command`, { command }))
    },
    async deliveryIssues() {
        return dataOf(await apiClient.get('/deliveries/issues')).issues ?? []
    },
    async reports() {
        return this.deliveryIssues()
    },
}