export interface DemolitionMaterial {
    id: string;
    managementNo: string;
    division: string;
    category: string;
    projectCode: string;
    projectName: string;
    demolitionDate: string;
    productName: string;
    specification: string;
    originalQuantity: number;
    usedQuantity: number;
    remainingQuantity: number;
    status: string;
    remark?: string;
    attributes?: any;
    currentTeamId?: string | number;

    // Incoming/Outgoing 등에서 확장되어 사용되는 필드들
    createdAt?: string;
    creator?: { id?: number; name: string };
    workerName?: string;
}

export interface DemolitionLog {
    id: string;
    materialId: string;
    teamId: string | number;
    workerName: string;
    logDate: string;
    logType: 'usage' | 'outgoing' | 'dispose' | 'return';
    usedQuantity: number;
    remark?: string;
    attributes?: any;
    // Join된 필드들 (Frontend display용)
    material?: DemolitionMaterial;
    team?: { id: number; name: string };
    creator?: { id: number; name: string };

    // Flattened fields for easy access/sorting often used in tables
    division?: string;
    teamName?: string;
    productName?: string;
    spec?: string;
    projectCode?: string;
    projectName?: string;
    mgmtNo?: string;
    creatorName?: string;
}
