const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Mật khẩu sẽ được băm bảo mật
    role: { 
        type: String, 
        enum: ['user', 'admin'], // Chỉ chấp nhận 1 trong 2 quyền này
        default: 'user'          // Tài khoản mới đăng ký mặc định là user thường
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);