# Ranh giới service

| Service | Sở hữu | Giao tiếp sau này |
| --- | --- | --- |
| API Gateway | Định tuyến API công khai và các concern chung của request | REST đồng bộ tới các service |
| User | Tài khoản, thông tin đăng nhập, hồ sơ, tùy chọn học tập | REST đồng bộ |
| Content | Bộ flashcard, thẻ flashcard, nội dung từ vựng | REST đồng bộ |
| Learning | Phiên học, bản ghi ôn tập, tiến độ, lịch SRS | REST đồng bộ; phát sự kiện học tập |
| AI | Điều phối gọi LLM và nội dung học do AI tạo | REST đồng bộ qua gateway; API LLM bên ngoài |
| Analytics | Thống kê suy ra, dữ liệu dashboard | Nhận sự kiện học tập bất đồng bộ |

Service không được truy cập database của service khác. Request từ người dùng nên đi qua gateway bằng REST. Sự kiện thuộc domain Learning sau này đi qua RabbitMQ để Analytics tự duy trì read model, không cần truy vấn kho dữ liệu của Learning.
