
export const permissionPresets: Record<string, any> = {
    office: { incoming: 'write', outgoing: 'write', usage: 'write', inventory: 'write' },
    field: { incoming: 'none', outgoing: 'none', usage: 'write', inventory: 'none' },
    readonly: { incoming: 'read', outgoing: 'read', usage: 'read', inventory: 'read' },
};

export const getPermissionMode = (perms: any) => {
    if (!perms) return 'custom';
    // Deep check or simple check - relying on preset structure
    if (perms.incoming === 'write' && perms.outgoing === 'write' && perms.usage === 'write' && perms.inventory === 'write') return 'office';
    if (perms.incoming === 'none' && perms.outgoing === 'none' && perms.usage === 'write' && perms.inventory === 'none') return 'field';
    if (perms.incoming === 'read' && perms.outgoing === 'read' && perms.usage === 'read' && perms.inventory === 'read') return 'readonly';
    return 'custom';
};
