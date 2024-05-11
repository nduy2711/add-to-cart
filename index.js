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

app.get('/staff.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'staff.html'));
});

app.get('/adminAdd.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'adminAdd.html'));
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

// Router để trả về thông tin các sản phẩm đang xử lý
app.get('/api/processing-products', async (req, res) => {
    try {
        // Gọi hàm trong MongoDB để lấy thông tin các sản phẩm đang xử lý
        const processingProducts = await mongodbModule.getProductsByProcessingUsers();
        res.json(processingProducts);
    } catch (error) {
        // Trả về lỗi nếu có lỗi xảy ra
        res.status(500).json({ error: 'Lỗi khi truy xuất sản phẩm đang xử lý' });
    }
});

app.put('/confirm-order/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // Gọi hàm trong MongoDB để cập nhật trạng thái của đơn hàng thành "done"
        await mongodbModule.updateStatusToDone(userId);
        res.status(200).send('Xác nhận đơn hàng thành công.');
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi xác nhận đơn hàng: ' + error.message });
    }
});

app.post('/api/add-product', async (req, res) => {
    try {
        const { productName, productId, productPrice } = req.body; // Nhận thông tin sản phẩm từ request body

        // Gọi hàm để thêm sản phẩm vào cơ sở dữ liệu MongoDB
        await mongodbModule.addProduct(productName, productId, productPrice);

        // Trả về thông báo thành công nhưng không cần thiết lập trạng thái phản hồi là 201 Created
        res.send('Sản phẩm đã được thêm vào giỏ hàng');
    } catch (error) {
        console.error('Đã xảy ra lỗi khi thêm sản phẩm:', error);
        res.status(500).send('Đã xảy ra lỗi khi thêm sản phẩm vào cơ sở dữ liệu.');
    }
});


