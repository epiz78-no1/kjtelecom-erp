# Design Guidelines: Pro-Tracker (통합 자재 관리 시스템)

## Design Approach

**Selected Approach:** Design System Approach (Enterprise Data Management)
- **Primary Inspiration:** Ant Design / Material Design for enterprise applications
- **Rationale:** Data-heavy enterprise application requiring clarity, efficiency, and professional presentation of complex information
- **Key References:** Linear (clean data tables), Notion (organized hierarchies), enterprise dashboards

## Core Design Principles

1. **Data Clarity First:** Information hierarchy prioritizes quick scanning and data comprehension
2. **Professional Efficiency:** Clean, corporate aesthetic suitable for construction/telecommunications industry
3. **Action-Oriented:** Clear CTAs for critical workflows (add materials, record usage, create purchase orders)
4. **Mobile-Responsive:** Field teams need tablet/mobile access for on-site material management

## Typography System

**Font Family:**
- Primary: 'Pretendard' or 'Noto Sans KR' (Korean web font via CDN)
- Fallback: system-ui, sans-serif

**Type Scale:**
- Page Headers: text-3xl font-bold (사업부 대시보드, 재고 현황)
- Section Headers: text-xl font-semibold (현장팀 목록, 구매 내역)
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Table Headers: text-sm font-semibold uppercase tracking-wide
- Table Data: text-sm font-normal
- Labels: text-sm font-medium
- Helper Text: text-xs text-gray-500

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4 to gap-6
- Table cell padding: p-4

**Grid Structure:**
- Dashboard: 12-column responsive grid
- Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for stat cards
- Tables: Full-width with horizontal scroll on mobile

**Container Widths:**
- Main content: max-w-7xl mx-auto px-4
- Forms/Modals: max-w-2xl

## Component Library

### Navigation
- **Top Navigation Bar:** Fixed header with logo, business division switcher (dropdown), user profile
- **Sidebar Navigation:** Collapsible left sidebar with main menu items (대시보드, 현장팀 관리, 자재 목록, 구매 내역, 재고 현황, 사용량 통계)
- **Breadcrumbs:** Show current location hierarchy

### Dashboard Components
- **Stat Cards:** Highlight key metrics (총 재고량, 이번 달 구매액, 활성 현장팀 수, 재고 부족 품목)
  - Large number display with trend indicators (↑ ↓)
  - Icon on left side (using Heroicons)
- **Business Division Switcher:** Prominent toggle/tabs at top (사업부 1 / 사업부 2)
- **Quick Action Buttons:** Floating action button or button group (+ 자재 추가, + 구매 등록, + 출고 기록)

### Data Display
- **Tables:** 
  - Striped rows for readability
  - Sortable column headers
  - Fixed header on scroll
  - Action buttons in last column (수정, 삭제)
  - Pagination at bottom
  - Search and filter controls above table
- **Cards:** 
  - Bordered with subtle shadow (shadow-sm)
  - Rounded corners (rounded-lg)
  - Clear header section with title and actions

### Forms
- **Input Fields:**
  - Label above input (text-sm font-medium mb-2)
  - Border with focus state
  - Placeholder text in Korean
  - Required field indicators (*)
- **Dropdowns:** 
  - 현장팀 선택, 자재 카테고리, 공급업체 등
  - Search capability for long lists
- **Date Pickers:** For purchase dates, usage dates
- **Number Inputs:** For quantities, amounts

### Data Visualization
- **Charts:** Use Chart.js or Recharts
  - Bar charts: 월별 구매량, 현장팀별 사용량
  - Line charts: 재고 추이
  - Pie charts: 자재 카테고리별 분포
- **Trend Indicators:** Small inline charts (sparklines) in stat cards

### Status Indicators
- **Inventory Status Badges:**
  - 충분: Green badge
  - 부족: Yellow badge
  - 긴급: Red badge
- **Active Status:** Green dot for active field teams

### Modals & Overlays
- **Form Modals:** For adding/editing materials, purchases, usage records
- **Confirmation Dialogs:** For delete actions
- **Toast Notifications:** Success/error messages after actions

## Page-Specific Layouts

### Dashboard (메인 대시보드)
- Top: Business division switcher
- Stat cards row: 4 cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Charts section: 2 charts side-by-side (grid-cols-1 lg:grid-cols-2)
- Recent activity table below

### Inventory Page (재고 현황)
- Filter bar: Business division, category, search
- Table with columns: 자재명, 카테고리, 현재 재고, 안전 재고, 상태, 최근 입고일
- Color-coded stock levels

### Field Team Page (현장팀 관리)
- List/Grid view toggle
- Cards showing: 팀명, 사업부, 현재 보유 자재, 최근 활동
- Click to view team detail page

### Usage Statistics (사용량 통계)
- Date range selector
- Multi-select filters (business division, field teams, materials)
- Large charts with export functionality

## Animations

**Minimal and Purposeful:**
- Hover states: Subtle scale or shadow increase on cards/buttons
- Loading states: Spinner for data fetching
- Page transitions: None (instant for data applications)
- No decorative animations

## Images

**No hero images.** This is a data-focused enterprise application.

**Functional Images:**
- Product/material thumbnails in tables (small, square icons)
- User avatars in navigation
- Empty state illustrations (when no data exists)

## Accessibility

- High contrast text throughout
- Focus indicators on all interactive elements
- ARIA labels for icon-only buttons
- Table headers properly marked up
- Form labels explicitly associated with inputs
- Keyboard navigation fully supported

---

**Design Philosophy:** Create a professional, efficient enterprise tool that helps field teams and managers track materials with clarity and speed. Prioritize information density over visual flair, ensuring every pixel serves a functional purpose.