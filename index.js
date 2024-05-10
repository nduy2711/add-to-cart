const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const bodyParser = require('body-parser');

const mongodbModule = require("./mongodb")

mongodbModule.connectToMongoDB()
    .then(() => {
        console.log('Connect to MongoDB successfully');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
        server.close();
    });

const server = app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

process.on('SIGINT', () => {
    mongodbModule.closeMongoDBConnection()
});

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/pay.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pay.html'));
});

app.post('/add-to-cart', async (req, res) => {
    try {
        const { userId, productId, productName, productPrice } = req.body; // Nhận thông tin sản phẩm từ request body
        console.log(userId, productId, productName, productPrice); // In ra thông tin sản phẩm để kiểm tra

        // Thêm sản phẩm vào giỏ hàng và lưu vào MongoDB
        await mongodbModule.addToCartAndSaveToMongoDB(userId, productId, productName, productPrice);

        res.send('Sản phẩm đã được thêm vào giỏ hàng');
    } catch (error) {
        console.error('Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng:', error);
        res.status(500).send('Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng');
    }
});

// Thay đổi từ POST sang DELETE
app.delete('/remove-from-cart/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    console.log(userId);
    console.log(productId);

    try {
        // Gọi hàm removeFromCartAndSaveToMongoDB để xóa sản phẩm khỏi giỏ hàng trong cơ sở dữ liệu
        await mongodbModule.removeFromCartByProductId(userId, productId);

        // Gửi phản hồi về cho client
        res.status(200).send('Sản phẩm đã được xóa thành công.');
    } catch (error) {
        // Nếu có lỗi xảy ra, gửi phản hồi lỗi về cho client
        res.status(500).send('Lỗi khi xóa sản phẩm khỏi giỏ hàng: ' + error.message);
    }
});

// Router để trả về thông tin giỏ hàng của một người dùng
app.get('/api/cart/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const cartItems = await mongodbModule.getUserCartItems(userId);
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi truy xuất giỏ hàng' });
    }
});


