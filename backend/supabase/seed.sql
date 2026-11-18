-- ============================================================
--  seed.sql — Dữ liệu khởi tạo cho Chuỗi Xe Điện Thanh Tươi
--  Chạy script này trên Supabase SQL Editor sau khi đã chạy 0001_init_schema.sql.
-- ============================================================

-- 1. Danh sách 5 Chi nhánh Xe Điện Thanh Tươi
insert into branches (id, name, address) values
  ('CN_CHO_MOI', 'Cửa hàng Chợ Mới', 'Thị trấn Chợ Mới, Huyện Chợ Mới, An Giang'),
  ('CN_LAP_VO', 'Cửa hàng Lấp Vò', 'Thị trấn Lấp Vò, Huyện Lấp Vò, Đồng Tháp'),
  ('CN_LAP_VO_5', 'Cửa hàng Lấp Vò 5', 'Thị trấn Lấp Vò, Huyện Lấp Vò, Đồng Tháp'),
  ('CN_MY_LUONG_3', 'Cửa hàng Mỹ Luông 3', 'Thị trấn Mỹ Luông, Huyện Chợ Mới, An Giang'),
  ('CN_MY_LUONG_4', 'Cửa hàng Mỹ Luông 4', 'Thị trấn Mỹ Luông, Huyện Chợ Mới, An Giang')
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address;

-- 2. Cấu hình Ca làm việc tiêu chuẩn
insert into shift_configs (id, name, start_time, end_time, grace_period_minutes) values
  ('shift_sang', 'Ca Sáng', '08:00', '17:00', 15),
  ('shift_chieu', 'Ca Chiều', '13:00', '21:00', 15),
  ('shift_hanh_chinh', 'Ca Hành Chính', '07:30', '16:30', 15)
on conflict (id) do update set
  name = excluded.name,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  grace_period_minutes = excluded.grace_period_minutes;

-- 3. Tài khoản Quản trị viên Tối cao (Admin)
-- LƯU Ý KHI DÙNG THẬT: Sau khi đăng nhập lần đầu với tài khoản này,
-- vui lòng bấm vào biểu tượng Chìa Khóa trên góc phải Header để đổi mật khẩu quản trị an toàn!
insert into user_accounts (id, username, password, role, name, position, is_active) values
  ('usr_admin', 'admin', 'admin123', 'admin', 'Quản trị viên Hệ thống', 'Tổng Quản lý', true)
on conflict (username) do update set
  is_active = true;
