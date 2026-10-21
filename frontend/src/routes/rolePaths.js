const rolePaths = Object.freeze({
    owner: '/owner/dashboard',
    shipper: '/shipper/dashboard',
    admin: '/admin/dashboard',
})

export function getRoleLandingPath(role) {
    return rolePaths[role] || '/'
}

export function getSafeReturnPath(pathname, role) {
    const roleBase = rolePaths[role]
    if (typeof pathname === 'string'
        && roleBase
        && (pathname === roleBase || pathname.startsWith(`${roleBase}/`))) {
        return pathname
    }
    return roleBase || '/'
}