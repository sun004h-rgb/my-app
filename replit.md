# 청년일자리도약장려금 관리 시스템

청년일자리도약장려금 지원금 신청 회차를 사업장·근로자 단위로 관리하고 Slack 알림을 자동 발송하는 관리 시스템입니다.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API 서버 실행 (포트 8080, workflow 자동 기동)
- `pnpm --filter @workspace/youth-subsidy run dev` — 프론트엔드 실행 (workflow 자동 기동)
- `pnpm run typecheck` — 전체 타입 검사
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI → 훅/Zod 재생성
- `pnpm --filter @workspace/db run push` — DB 스키마 반영 (개발 전용)
- Required env: `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `SLACK_WEBHOOK_URL`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, shadcn/ui, Tanstack Query, Wouter, Recharts
- API: Express 5 + Pino logger
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken + bcryptjs), roles: admin / manager
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec at lib/api-spec/openapi.yaml)
- Notifications: Slack webhook + node-cron (매일 09:00 자동 발송)
- Build: esbuild (CJS bundle)

## Where things live

```
lib/
  db/src/schema/          — DB 스키마 (users, businesses, workers, subsidy_rounds, notifications)
  api-spec/openapi.yaml   — OpenAPI 계약 (source of truth)
  api-client-react/       — Orval 생성 React Query 훅
  api-zod/                — Orval 생성 Zod 스키마

artifacts/
  api-server/src/
    routes/               — auth, users, businesses, workers, rounds, notifications, dashboard
    lib/auth.ts           — JWT 서명/검증, bcrypt, requireAuth 미들웨어
    lib/slack.ts          — Slack webhook 발송
    lib/rounds.ts         — 회차별 신청도래일 계산 (정규: +6/9/12개월, 중간입사자: +7/10/13개월)
    cron/scheduler.ts     — 매일 09:00 자동 Slack 알림 (D-7, D-Day, D+3)
  youth-subsidy/src/
    pages/                — dashboard, businesses, workers, rounds, notifications, admin-users
    components/layout.tsx — 사이드바 레이아웃
    hooks/use-auth.tsx    — JWT 로그인 상태 관리
```

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → 클라이언트/서버 모두 동일 타입 사용
- **businessId 선택적 필터**: 관리자는 businessId 없이 전체 근로자 조회, 매니저는 담당 사업장만 조회
- **주민번호 마스킹**: API 응답에서 `XXXXXX-*******` 형태로 자동 마스킹
- **회차 자동 생성**: 근로자 등록 시 1·2·3회차 신청도래일/금액 자동 계산 및 생성
- **Slack 이중 알림**: 수동(API) + 자동(cron 09:00) 모두 지원

## Product

- **대시보드**: 전체 현황(사업장/근로자/회차) + 차트 + D-7 이내 임박 건 목록
- **사업장 관리**: 등록/조회/수정/삭제, 담당자 배정
- **근로자 관리**: 등록/조회/퇴사처리, 주민번호 마스킹, CSV 다운로드
- **지원금 회차**: 상태 변경(scheduled→completed→paid), D-Day 표시
- **알림**: Slack 발송 이력, 미읽음 관리
- **사용자 관리**: admin 전용, 계정 생성/삭제

## Demo accounts

| 아이디 | 비밀번호 | 역할 |
|--------|----------|------|
| admin | admin123 | 관리자 |
| manager1 | admin123 | 담당자 (김담당) |
| manager2 | admin123 | 담당자 (이담당) |

## Gotchas

- `pnpm run typecheck:libs` 를 먼저 실행해야 api-server 타입 검사가 통과됨 (lib 빌드 선행 필요)
- workers GET은 admin은 businessId 없이 전체 조회 가능; manager는 필수
- Dashboard 라우트는 `/api/dashboard/summary`, `/api/dashboard/manager-stats`, `/api/dashboard/upcoming-rounds`
- Cron은 서버 시작 시 자동 등록 (매일 09:00 KST 기준으로 설정 필요 시 timezone 조정)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
