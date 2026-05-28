// ─── Role persistence helpers ─────────────────────────────────────────────────
// Saves and retrieves the user's chosen role tied to their phone number.
// This survives logout so returning users skip the RoleSelect screen.

export const getRoleKey = (phone: string) => `roundu_role_${phone}`;

export const getSavedRoleForPhone = (phone: string): "customer" | "provider" | null => {
    try {
        const val = localStorage.getItem(getRoleKey(phone));
        if (val === "customer" || val === "provider") return val;
    } catch (_) { }
    return null;
};

export const saveRoleForPhone = (phone: string, role: "customer" | "provider") => {
    try {
        localStorage.setItem(getRoleKey(phone), role);
    } catch (_) { }
};