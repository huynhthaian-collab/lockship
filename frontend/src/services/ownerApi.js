import apiClient from './apiClient.js'

function dataOf(response) {
    return response.data?.data ?? {}
}

export const vehicleApi = {
    async list() {
        return dataOf(await apiClient.get('/vehicles')).vehicles ?? []
    },
    async get(id) {
        return dataOf(await apiClient.get(`/vehicles/${id}`)).vehicle
    },
    async create(payload) {
        return dataOf(await apiClient.post('/vehicles', payload)).vehicle
    },
    async update(id, payload) {
        return dataOf(await apiClient.put(`/vehicles/${id}`, payload)).vehicle
    },
    async remove(id) {
        return dataOf(await apiClient.delete(`/vehicles/${id}`))
    },
}

export const shipperApi = {
    async list() {
        return dataOf(await apiClient.get('/v1/users/shippers')).users ?? []
    },
    async get(id) {
        return dataOf(await apiClient.get(`/v1/users/shippers/${id}`)).user
    },
    async create(payload) {
        return dataOf(await apiClient.post('/v1/users/shippers', payload)).user
    },
    async update(id, payload) {
        return dataOf(await apiClient.put(`/v1/users/shippers/${id}`, payload)).user
    },
    async remove(id) {
        return dataOf(await apiClient.delete(`/v1/users/shippers/${id}`))
    },
}

export const deliveryApi = {
    async list() {
        return dataOf(await apiClient.get('/deliveries')).deliveries ?? []
    },
    async get(id) {
        return dataOf(await apiClient.get(`/deliveries/${id}`)).delivery
    },
    async create(payload) {
        return dataOf(await apiClient.post('/deliveries', payload)).delivery
    },
    async update(id, payload) {
        return dataOf(await apiClient.put(`/deliveries/${id}`, payload)).delivery
    },
    async assign(id, shipperId, vehicleId) {
        return dataOf(await apiClient.post(`/deliveries/${id}/assign`, { shipperId, vehicleId })).delivery
    },
    async authorize(id) {
        return dataOf(await apiClient.post(`/deliveries/${id}/authorize`))
    },
    async cancel(id) {
        return dataOf(await apiClient.post(`/deliveries/${id}/cancel`)).delivery
    },
}

export const deviceApi = {
    async list() {
        return dataOf(await apiClient.get('/iot')).devices ?? []
    },
    async get(id) {
        return dataOf(await apiClient.get(`/iot/${id}`)).device
    },
    async status(id) {
        return dataOf(await apiClient.get(`/iot/${id}/status`)).status
    },
    async logs(id) {
        return dataOf(await apiClient.get(`/iot/${id}/logs`)).logs ?? []
    },
}

export const notificationApi = {
    async list() {
        return dataOf(await apiClient.get('/notifications')).notifications ?? []
    },
    async markRead(id) {
        return dataOf(await apiClient.put(`/notifications/${id}/read`)).notification
    },
    async markAllRead() {
        return dataOf(await apiClient.put('/notifications/read-all'))
    },
}

export const shipperDeliveryApi = {
    async list() {
        return dataOf(await apiClient.get('/deliveries')).deliveries ?? []
    },
    async listAvailable() {
        return dataOf(await apiClient.get('/deliveries/available')).deliveries ?? []
    },
    async get(id) {
        return dataOf(await apiClient.get(`/deliveries/${id}`)).delivery
    },
    async unlockCode(id) {
        return dataOf(await apiClient.get(`/deliveries/${id}/unlock-code`)).unlockCode
    },
    async accept(id) {
        return dataOf(await apiClient.post(`/deliveries/${id}/accept`)).delivery
    },
    async start(id) {
        return dataOf(await apiClient.post(`/deliveries/${id}/start`)).delivery
    },
    async arrive(id) {
        return dataOf(await apiClient.post(`/deliveries/${id}/arrive`)).delivery
    },
    async unlock(id, code) {
        return dataOf(await apiClient.post(`/deliveries/${id}/unlock`, { code }))
    },
    async complete(id) {
        return dataOf(await apiClient.post(`/deliveries/${id}/complete`)).delivery
    },
    async reportProblem(id, payload) {
        return dataOf(await apiClient.post(`/deliveries/${id}/report-problem`, payload)).issue
    },
    async listReports() {
        return dataOf(await apiClient.get('/deliveries/issues')).issues ?? []
    },
}

export const publicBoxApi = {
    async getInfo(boxId) {
        return dataOf(await apiClient.get(`/public/boxes/${boxId}/info`)).box
    },
    async requestAccess(boxId, payload) {
        const response = await apiClient.post(`/public/boxes/${boxId}/request-access`, payload)
        return response.data?.data ?? {}
    },
    async getStatus(boxId, requestId) {
        return dataOf(await apiClient.get(`/public/boxes/${boxId}/request-status/${requestId}`)).request
    },
}

export const ownerAccessApi = {
    async list(status) {
        const params = status ? `?status=${status}` : ''
        return dataOf(await apiClient.get(`/owner/access-requests${params}`))
    },
    async respond(requestId, payload) {
        return dataOf(await apiClient.patch(`/owner/access-requests/${requestId}/respond`, payload))
    },
}