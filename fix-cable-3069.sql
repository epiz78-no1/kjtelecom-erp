-- 광케이블 #3069 상태 복구 스크립트
-- 문제: 사용 내역 삭제 후 currentTeamId가 null로 되어 사용 가능 드럼 목록에 나타나지 않음

-- 1. 현재 상태 확인
SELECT 
    id,
    "drumNo",
    status,
    "currentTeamId",
    "remainingLength",
    "usedLength"
FROM optical_cables 
WHERE "drumNo" = '3069';

-- 2. 해당 케이블의 최근 로그 확인 (어느 팀에 불출되었는지)
SELECT 
    id,
    "logType",
    "teamId",
    "usageDate",
    "usedLength"
FROM optical_cable_logs 
WHERE "cableId" = (SELECT id FROM optical_cables WHERE "drumNo" = '3069')
ORDER BY "createdAt" DESC
LIMIT 5;

-- 3. 상태 복구 (팀 ID는 실제 로그에서 확인한 값으로 교체 필요)
-- 예시: 팀 ID가 'team-uuid-here'라고 가정
UPDATE optical_cables 
SET 
    status = 'assigned',
    "currentTeamId" = (
        SELECT "teamId" 
        FROM optical_cable_logs 
        WHERE "cableId" = (SELECT id FROM optical_cables WHERE "drumNo" = '3069')
          AND "teamId" IS NOT NULL
        ORDER BY "createdAt" DESC 
        LIMIT 1
    ),
    "updatedAt" = NOW()
WHERE "drumNo" = '3069';

-- 4. 복구 후 상태 재확인
SELECT 
    id,
    "drumNo",
    status,
    "currentTeamId",
    "remainingLength",
    "usedLength"
FROM optical_cables 
WHERE "drumNo" = '3069';
