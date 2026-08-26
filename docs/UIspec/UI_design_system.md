# HỆ THỐNG THIẾT KẾ UI/UX & PHƯƠNG ÁN NÂNG CẤP GIAO DIỆN WEB CLIENT (EDTECH PRODUCTION-GRADE)

> **Tài liệu Kỹ thuật Thiết kế UI/UX**  
> **Dự án**: KITS Project - Study Tool (Korean Learning Platform)  
> **Cơ sở lý luận**: Tổng hợp & chuẩn hóa từ `.cursor/rules/ui-ux.mdc` và `docs/UIspec/UIanalyse.md`  
> **Vị trí tài liệu**: `docs/UIspec/UI_design_system.md`  
> **Ngày khởi tạo**: 2026-08-26  

---

## 1. TRIẾT LÝ THIẾT KẾ VÀ TIÊU CHUẨN CỐT LÕI (DESIGN PHILOSOPHY & CORE RULES)

Giao diện học tập (EdTech) có tính chất đặc thù: trực tiếp tác động tới năng lực ghi nhớ dài hạn, khả năng tập trung và giảm bớt rào cản tâm lý của người học. Nâng cấp giao diện `apps/web` nhằm chuyển đổi toàn bộ giao diện từ trạng thái **"Prototype/Generic AI Look"** sang **"Production-Grade Study Experience"**.

### 1.1. Tối Ưu Tải Trọng Nhận Thức (Cognitive Load Theory)
* **Triệt tiêu Tải trọng Ngoại vi (Extraneous Load)**: Loại bỏ triệt để bóng đổ nhiều tầng phức tạp, viền đen thô ráp, các gradient tím-xanh lốm đốm, các thẻ trang trí vô nghĩa (decorative cards) và bảng điều khiển dày đặc thông tin.
* **Tối đa hóa Tải trọng Rèn luyện (Germane Load)**: Sử dụng các gam màu dịu mát mắt (Slate, Indigo, Emerald) để kích thích tư duy logic, làm dịu nhịp tim và định hướng sự chú ý trực tiếp vào nội dung bài học (từ vựng, câu trắc nghiệm, phản hồi đúng/sai).
* **Mỗi màn hình 1 mục đích cốt lõi (One Primary Action Per Screen)**: Màn hình học tập (Lesson/Flashcard) ưu tiên duy nhất hành động Lật thẻ / Chọn đáp án / Chuyển bài; tránh nhồi nhét quá nhiều widget phụ.

### 1.2. Quy Tắc Tỷ Lệ Thị Giác 60 - 30 - 10 (Visual Salience Rule)
* **60% Nền chủ đạo (Dominant Canvas)**: Gam màu trung tính thụ động dịu mát (`Slate-50` ở Light Mode, `Slate-950` ở Dark Mode) giúp giảm lóa mắt khi học kéo dài.
* **30% Khung cấu trúc (Structural Framing)**: Thẻ nội dung, thanh điều hướng (Sidebar), phân đoạn bài học sử dụng màu bề mặt (`White` / `Slate-900`) với đường viền siêu mảnh (`border-slate-200/60` / `border-slate-800/60`).
* **10% Điểm nhấn hành động (High-Salience Accents)**: Nút bấm CTA chính (Indigo), thanh tiến trình & phản hồi hoàn thành (Emerald), cảnh báo/chuỗi ngày (Amber) và báo lỗi (Rose).

### 1.3. Hệ Thống Lưới Spacing Base-4
Tất cả các khoảng cách (`padding`, `margin`, `gap`) bắt buộc tuân theo lưới chuẩn bội số của **4px**:
* `4px` (`space-1`): Gap vi mô giữa icon và label.
* `8px` (`space-2`): Padding trong badge, gap giữa các button nhỏ.
* `16px` (`space-4`): Padding mặc định của card, gap giữa các ô nhập liệu.
* `24px` (`space-6`): Khoảng cách giữa các phần tử trong layout.
* `32px` (`space-8`): Spacing giữa các phân đoạn lớn (Section margin).

---

## 2. KIẾN TRÚC DESIGN TOKENS 3 TẦNG (3-TIER DESIGN TOKENS ARCHITECTURE)

Loại bỏ hoàn toàn việc gán trực tiếp giá trị HEX thô (`#126e82`) hoặc class utility không chuẩn (`bg-blue-500`) trong các component. Thay vào đó sử dụng hệ thống Design Tokens 3 tầng qua CSS Custom Properties.

```
[Tier 1: Primitives (HSL/HEX Raw Values)]
       ↓
[Tier 2: Semantic Tokens (--bg-canvas, --brand-primary, --text-main)]
       ↓
[Tier 3: Component Tokens (--button-primary-bg, --card-border, --card-shadow)]
```

### 2.1. Khai Báo Biến Token Chi Tiết (`apps/web/src/styles/app.css`)

```css
:root {
  /* Tier 1: Primitives */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-500: #64748b;
  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  --color-slate-900: #0f172a;
  --color-slate-950: #020617;

  --color-indigo-50: #eep2ff;
  --color-indigo-500: #6366f1;
  --color-indigo-600: #4f46e5;
  --color-indigo-700: #4338ca;

  --color-emerald-500: #10b981;
  --color-emerald-600: #059669;

  --color-amber-500: #f59e0b;
  --color-rose-500: #ef4444;

  /* Tier 2: Semantic Tokens (Light Mode Mặc định) */
  --bg-canvas: var(--color-slate-50);
  --bg-surface: #ffffff;
  --bg-surface-elevated: #ffffff;
  
  --text-main: var(--color-slate-900);
  --text-muted: var(--color-slate-500);
  --text-inverse: #ffffff;

  --border-subtle: rgba(226, 232, 240, 0.8);
  --border-strong: var(--color-slate-300);

  --brand-primary: var(--color-indigo-600);
  --brand-primary-hover: var(--color-indigo-700);
  --brand-primary-active: #3730a3;
  --brand-primary-light: #eef2ff;

  --state-success: var(--color-emerald-500);
  --state-success-bg: #ecfdf5;
  --state-warning: var(--color-amber-500);
  --state-warning-bg: #fffbeb;
  --state-error: var(--color-rose-500);
  --state-error-bg: #fef2f2;

  --shadow-xs: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 1px 4px -1px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 12px 24px -6px rgba(15, 23, 42, 0.08);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Tier 2: Semantic Tokens (Dark Mode Override) */
[data-theme="dark"] {
  --bg-canvas: var(--color-slate-950);
  --bg-surface: var(--color-slate-900);
  --bg-surface-elevated: var(--color-slate-800);

  --text-main: var(--color-slate-50);
  --text-muted: #94a3b8;
  --text-inverse: var(--color-slate-950);

  --border-subtle: rgba(30, 41, 59, 0.8);
  --border-strong: #334155;

  --brand-primary: var(--color-indigo-500);
  --brand-primary-hover: var(--color-indigo-600);
  --brand-primary-active: var(--color-indigo-700);
  --brand-primary-light: rgba(99, 102, 241, 0.15);

  --state-success-bg: rgba(16, 185, 129, 0.15);
  --state-warning-bg: rgba(245, 158, 11, 0.15);
  --state-error-bg: rgba(239, 68, 68, 0.15);

  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 2px 8px -2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 12px 24px -6px rgba(0, 0, 0, 0.5);
}
```

---

## 3. NGUYÊN TẮC CHỐNG "DEFAULT AI LOOK" VÀ VI TƯƠNG TÁC (MICRO-INTERACTIONS)

### 3.1. Danh Sách Quy Tắc Tránh Lỗi Thiết Kế Mặc Định Của AI
1. **Không dùng sắc Tím/Indigo thô ráp hoặc Gradient lốm đốm**: Chuyển sang Indigo-600 tinh tế phối hợp với Slate Neutrals.
2. **Không dùng Font chữ mặc định trình duyệt**: Sử dụng bộ font tối ưu đọc ngôn ngữ tiếng Hàn & Việt (`"Inter"`, `"Pretendard"`, `"Noto Sans KR"`, `sans-serif`).
3. **Không tạo Card trang trí rỗng**: Chỉ bọc Card khi phần tử có tương tác thực thụ (Flashcard, Bài học, Form nhập liệu).
4. **Không dùng văn bản giả (Lorem Ipsum)**: Tất cả nội dung thử nghiệm và hiển thị bắt buộc là dữ liệu EdTech thực tế (VD: Bài học "Từ vựng TOPIK I - Chuẩn bị đi làm", "Ngữ pháp ~아/어 보다", Streak "5 ngày liên tục").
5. **Không dùng Icon không có Label hoặc Accessibility**: Mọi Button chỉ có icon bắt buộc có `aria-label` rõ ràng.

### 3.2. Tiêu Chuẩn 5 Trạng Thái Tương Tác Động (5 Dynamic States)
Tất cả các phần tử có thể tương tác (`button`, `a`, `input`, `card` có thể nhấp) bắt buộc có trọn vẹn 5 trạng thái:

| Trạng thái | Yêu cầu Kỹ thuật & Hiệu ứng | Mã ví dụ CSS/Tailwind |
| :--- | :--- | :--- |
| **1. Default** | Thanh thoát, tương phản chuẩn WCAG AA, viền mỏng 1px | `bg-[var(--bg-surface)] border border-[var(--border-subtle)]` |
| **2. Hover** | Dịch chuyển nhẹ lên 1-2px, tăng nhẹ shadow, đổi sắc màu nhẹ | `hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] hover:border-[var(--brand-primary)]` |
| **3. Active** | Hiệu ứng phản hồi lực bấm co nhẹ kích thước (`scale-[0.98]`) | `active:scale-[0.98] transition-transform duration-100` |
| **4. Focus-Visible** | Vòng viền phân giải cao dành cho duyệt phím Keyboard (WCAG) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2` |
| **5. Disabled** | Làm mờ `opacity: 0.5`, vô hiệu hóa con trỏ chuột | `disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none` |

---

## 4. KHUNG THIẾT KẾ CHI TIẾT TỪNG MÀN HÌNH (PAGE LAYOUT & WIREFRAMES)

### 4.1. Màn Hình Đăng Nhập (Login Page)
* **Bố cục**: Căn giữa theo trục đứng & ngang (`display: grid; place-items: center`).
* **Khung chứa**: Form Card có chiều rộng cố định `width: min(100%, 400px)`, bo góc `16px`, đường viền mỏng `var(--border-subtle)`, shadow mềm.
* **Thành phần**:
  * Brand Header: Icon ứng dụng học tiếng Hàn + Tên nền tảng (Haru Korean / StudyTool) + Tiêu đề phụ: *"Học tiếng Hàn hiệu quả mỗi ngày"*.
  * Form Fields: Input Email & Password có `min-height: 44px`, viền `var(--border-strong)`, trạng thái focus hiển thị rõ ràng.
  * CTA Button: Nút Đăng nhập dạng Primary CTA `min-height: 48px`, nền Indigo-600, chữ trắng bold.
  * Quick OAuth: Nút Google Login thiết kế tối giản, sạch sẻ.

```
+-------------------------------------------------------+
|                    [Logo Haru Korean]                 |
|             Đăng Nhập Nền Tảng Học Tiếng Hàn          |
|      Duy trì thói quen học 15 phút mỗi ngày cùng AI    |
|                                                       |
|  Email                                                |
|  [ input: email@example.com                         ] |
|                                                       |
|  Mật khẩu                                             |
|  [ input: ••••••••••••                              ] |
|                                                       |
|  [✓] Ghi nhớ đăng nhập             Quên mật khẩu?    |
|                                                       |
|  [      Nút Đăng Nhập (Indigo Primary CTA)          ] |
|                                                       |
|  --------------------- Hoặc ------------------------- |
|  [      Đăng nhập nhanh với Google                  ] |
+-------------------------------------------------------+
```

---

### 4.2. Màn Hình Bài Học & Flashcard Study (Lesson & MCQ Study Page)
Đây là màn hình cốt lõi của ứng dụng EdTech. Cần tối ưu tối đa không gian cho nội dung thẻ bài học.

* **Bố cục**:
  * **Header**: Thanh điều hướng trên cùng gồm Nút Back (`<- Quay lại danh sách`), Thanh tiến trình học tập (`Progress Bar` dạng Emerald Green), Badge Streak (`🔥 5 ngày`).
  * **Khu vực trung tâm (Study Canvas)**: Thẻ Flashcard chính có kích thước lớn `max-width: 640px`, chiều cao cố định `min-height: 320px`.
  * **Phân đáp án trắc nghiệm (MCQ Options)**: Lưới 2x2 cho 4 lựa chọn đáp án. Mỗi ô đáp án là một nút bấm tương tác lớn (`min-height: 56px`), hiển thị số thứ tự (A, B, C, D) và ký tự tiếng Hàn/Việt.
* **Phản hồi tức thì (Instant Feedback)**:
  * Chọn đúng: Ô chọn chuyển màu xanh Emerald nhẹ (`var(--state-success-bg)`), viền Emerald Green tươi, kèm âm thanh nhẹ hoặc icon check.
  * Chọn sai: Ô chọn rung nhẹ (shake animation), viền chuyển màu Crimson Red (`var(--state-error)`), hiển thị đáp án đúng để người học ghi nhớ ngay lập tức.

```
+-----------------------------------------------------------------------+
| [<- Bài học]   ======== Progress (6/10) 60% ========   🔥 5 Ngày Streak|
+-----------------------------------------------------------------------+
|                                                                       |
|   +---------------------------------------------------------------+   |
|   |                        BÀI 3: TỪ VỰNG GIAO TIẾP              |   |
|   |                                                               |   |
|   |                           안녕하세요                           |   |
|   |                       [An-nyeong-ha-se-yo]                    |   |
|   |                                                               |   |
|   |              🔊 Phát âm    |   💡 Gợi ý ngữ cảnh              |   |
|   +---------------------------------------------------------------+   |
|                                                                       |
|   Chọn nghĩa đúng của từ trên:                                         |
|   +-------------------------------+   +-------------------------------+   |
|   | A. Xin chào (Trang trọng)     |   | B. Cảm ơn                     |   |
|   +-------------------------------+   +-------------------------------+   |
|   | C. Tạm biệt                   |   | D. Xin lỗi                    |   |
|   +-------------------------------+   +-------------------------------+   |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

### 4.3. Màn Hình Thống Kê Tiến Độ (Dashboard Page)
* **Header**: Lời chào cá nhân hóa *"Xin chào, [Tên Người Học]!"* + Tóm tắt tổng quan.
* **Hàng chỉ số cốt lõi (Stat Cards Grid)**: 4 thẻ thống kê nhanh:
  1. **Số từ đã thuộc**: VD `142 từ` (Badge Emerald).
  2. **Thời lượng học tuần này**: VD `2.5 giờ` (Badge Indigo).
  3. **Tỷ lệ trả lời đúng**: VD `88%` (Badge Teal).
  4. **Chuỗi ngày học (Streak)**: VD `5 ngày` (Badge Amber).
* **Biểu đồ tiến độ từ vựng (Word Accuracy Distribution)**:
  * Thay thế các thanh bar thô ráp bằng thanh tiến trình bo góc mịn 8px, phân tách màu rõ ràng giữa **Đúng (Emerald)** và **Cần ôn lại (Rose/Amber)**.

---

### 4.4. Màn Hình Quản Lý Nội Dung (Manage Content Page)
* **Bố cục Master-Detail Layout**:
  * **Cột trái (Master List - 30% width)**: Danh sách Bộ bài học / Lesson Sets với thanh tìm kiếm và nút "+ Tạo bài học mới".
  * **Cột phải (Detail Panel - 70% width)**: Form chỉnh sửa chi tiết các thẻ câu hỏi (Flashcards/MCQs), hỗ trợ thêm/sửa/xóa thẻ nhanh chóng.
* **Xác nhận an toàn (Destructive Actions)**: Khi xóa bài học/thẻ câu hỏi, bắt buộc có Hộp thoại Modal Xác nhận (`Confirm Modal`) thay vì xóa ngầm hoặc dùng `alert()` mặc định của trình duyệt.

---

### 4.5. Màn Hình AI Chatbot Trợ Lý Học Tiếng Hàn (Chatbot Page)
* **Bố cục Conversational Layout**:
  * **Khung hiển thị tin nhắn (Message Scroll Area)**:
    * Tin nhắn từ AI Trợ lý: Nền màu bề mặt (`var(--bg-surface)`), viền mỏng, avatar AI góc trái.
    * Tin nhắn từ Người học: Nền Indigo Light (`var(--brand-primary-light)`), căn lề phải.
  * **Gợi ý câu hỏi nhanh (Prompt Chips)**: Các thẻ từ gợi ý học ngữ pháp/từ vựng (VD: *"Giải thích cấu trúc ~아/어 hơn"*, *"Cho ví dụ về từ 안녕하세요"*).
  * **Ô nhập liệu (Input Bar)**: Cố định chân trang với nút gửi rõ ràng, hỗ trợ phím bấm `Enter`.

---

## 5. DANH SÁCH CÔNG VIỆC CỤ THỂ (ACTIONABLE IMPLEMENTATION CHECKLIST)

### Phase 1: Chuẩn Hóa Hệ Thống Token & CSS Base (`apps/web/src/styles/`)
- [ ] Refactor `apps/web/src/styles/app.css`: Đưa toàn bộ hệ thống biến CSS 3 tầng (Primitives, Semantic Tokens, Component Tokens) vào `:root` và `[data-theme="dark"]`.
- [ ] Thiết lập bộ Font chữ chuẩn cho tiếng Việt và tiếng Hàn (`Inter`, `Pretendard`, `Noto Sans KR`).
- [ ] Cấu hình hệ thống bóng đổ mượt (`var(--shadow-xs)`, `var(--shadow-sm)`, `var(--shadow-md)`) và đường viền siêu mỏng (`border-slate-200/60`).

### Phase 2: Nâng Cấp Bộ Component Tái Sử Dụng (UI Primitives)
- [ ] **Button Component**: Cập nhật trọn vẹn 5 trạng thái tương tác (`Default`, `Hover`, `Active`, `Focus-Visible`, `Disabled`) với hiệu ứng `active:scale-[0.98]`.
- [ ] **Input / Form Components**: Thêm hiệu ứng ring focus Indigo cho ô nhập liệu, hiển thị nhãn báo lỗi rõ ràng.
- [ ] **Card & Flashcard Components**: Thiết kế component Flashcard có hỗ trợ hiệu ứng lật mượt (flip/transition) và phản hồi đúng/sai nhanh.
- [ ] **Badge / Status Component**: Chuẩn hóa màu sắc cho Streak (Amber), Thành công (Emerald), Cảnh báo (Rose).
- [ ] **Modal / Confirm Dialog**: Tạo dialog xác nhận hành động xóa/sửa nội dung chuẩn WCAG.

### Phase 3: Tối Ưu Bố Cục Và Trải Nghiệm Các Trang Web
- [ ] **LoginPage**: Tối ưu layout căn giữa, nâng cấp nút bấm Google OAuth và Form đăng nhập.
- [ ] **AppSidebar & Header**: Đưa Sidebar về dạng Sticky glassmorphic panel (`backdrop-filter: blur`), làm nổi bật menu active.
- [ ] **LessonPage & McqPage**: Thiết kế lại giao diện luyện tập Flashcard & Trắc nghiệm chuẩn 60-30-10, tối ưu hiển thị chữ tiếng Hàn lớn, rõ ràng.
- [ ] **DashboardPage**: Cải thiện bố cục thẻ thống kê và biểu đồ tỷ lệ ghi nhớ từ vựng.
- [ ] **ManageContentPage**: Chuyển sang bố cục Master-Detail mượt mà cho việc quản lý từ vựng.
- [ ] **ChatbotPage**: Tối ưu ô chat assistant, thêm Prompt Chips gợi ý mẫu câu luyện tập.

### Phase 4: Kiểm Thử Truy Cập & Responsive (Accessibility & Quality Audit)
- [ ] Kiểm tra tỷ lệ tương phản chữ đạt tiêu chuẩn **WCAG 2.1 AA** (tương phản tối thiểu 4.5:1).
- [ ] Kiểm tra điều hướng hoàn toàn bằng phím (`Keyboard Navigation` - `Tab`, `Enter`, `Space`, `Esc`).
- [ ] Kiểm tra hiển thị responsive không đứt gãy trên Mobile (375px), Tablet (768px) và Desktop (1280px+).

---

## 6. KẾT LUẬN VÀ LÝ LUẬN QUYẾT ĐỊNH DESIGN

Hệ thống thiết kế UI/UX này tạo ra **điểm tựa quy chuẩn vững chắc** cho toàn bộ quá trình phát triển ứng dụng Web học tiếng Hàn:
1. **Lý do lựa chọn gam màu Slate - Indigo - Emerald**: Đây là sự kết hợp khoa học đã được chứng minh trong ngành EdTech giúp giữ mức độ tỉnh táo thị giác mà không gây mệt mỏi hệ thần kinh trong các phiên học kéo dài từ 30-60 phút.
2. **Lý do áp dụng 5 Dynamic States**: Loại bỏ hoàn toàn cảm giác "đứng hình" hoặc "giao diện phẳng lì tĩnh lặng", tạo phản hồi xúc giác (tactile feeling) sống động giúp người học luôn nhận biết trạng thái hành động của mình.
3. **Lý do sử dụng Design Tokens 3 tầng**: Cho phép mở rộng Dark Mode và điều chỉnh theme cho Mobile client (`apps/mobile`) đồng bộ 100% mà không bao giờ vỡ giao diện.
