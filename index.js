const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const bodyParser = require('body-parser');

const mongodbModule = require("./mongodb")
const productModule = require("./prouducts")

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

app.get('/adminUpdate.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'adminUpdate.html'));
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

app.get('/product', async (req, res) => {
    try {
        const products = await mongodbModule.findProductList();
        const html = productModule.output(products);
        res.send(html)
    } catch (err) {
        console.error('Failed to fetch documents', err);
        res.status(500).send('Failed to fetch documents');
    }
})

// Router để xóa sản phẩm từ cơ sở dữ liệu MongoDB
app.delete('/api/delete-product/:productId', async (req, res) => {
    const productId = req.params.productId;

    try {
        // Gọi hàm trong MongoDB để xóa sản phẩm dựa trên productId
        const result = await mongodbModule.deleteProduct(productId);

        // Kiểm tra kết quả trả về từ hàm deleteProduct
        if (result) {
            // Trả về phản hồi thành công nếu sản phẩm được xóa thành công
            res.status(200).send('Sản phẩm đã được xóa thành công.');
        } else {
            // Trả về phản hồi 404 Not Found nếu sản phẩm không tồn tại trong cơ sở dữ liệu
            res.status(404).send('Sản phẩm không tồn tại.');
        }
    } catch (error) {
        // Trả về phản hồi lỗi nếu có lỗi xảy ra trong quá trình xóa sản phẩm
        res.status(500).send('Lỗi khi xóa sản phẩm: ' + error.message);
    }
});

app.put('/api/update-product/:productId', async (req, res) => {
    const productId = req.params.productId;

    try {
        const { productName, productPrice } = req.body; // Nhận thông tin sản phẩm mới từ request body

        // Gọi hàm trong MongoDB để cập nhật thông tin sản phẩm
        const result = await mongodbModule.updateProduct(productId, productName, productPrice);

        // Kiểm tra kết quả trả về từ hàm updateProduct
        if (result) {
            // Trả về phản hồi thành công nếu sản phẩm được cập nhật thành công
            res.status(200).send('Thông tin sản phẩm đã được cập nhật thành công.');
        } else {
            // Trả về phản hồi 404 Not Found nếu sản phẩm không tồn tại trong cơ sở dữ liệu
            res.status(404).send('Sản phẩm không tồn tại.');
        }
    } catch (error) {
        // Trả về phản hồi lỗi nếu có lỗi xảy ra trong quá trình cập nhật thông tin sản phẩm
        res.status(500).send('Lỗi khi cập nhật thông tin sản phẩm: ' + error.message);
    }
});

// Router để lấy thông tin sản phẩm từ cơ sở dữ liệu MongoDB
app.get('/api/get-product/:productId', async (req, res) => {
    const productId = req.params.productId;
    console.log(productId);

    try {
        // Gọi hàm trong MongoDB để lấy thông tin sản phẩm dựa trên productId
        const product = await mongodbModule.getProductById(productId);

        // Kiểm tra xem sản phẩm có tồn tại không
        if (product) {
            // Trả về sản phẩm nếu tìm thấy
            res.status(200).json(product);
        } else {
            // Trả về phản hồi 404 Not Found nếu không tìm thấy sản phẩm
            res.status(404).send('Sản phẩm không tồn tại.');
        }
    } catch (error) {
        // Trả về phản hồi lỗi nếu có lỗi xảy ra trong quá trình lấy thông tin sản phẩm
        res.status(500).send('Lỗi khi lấy thông tin sản phẩm: ' + error.message);
    }
});

app.get('/api/products', async (req, res) => {
    try {
        // Gọi hàm trong MongoDB để lấy danh sách các sản phẩm
        const products = await mongodbModule.findProductList();
        res.json(products); // Trả về danh sách sản phẩm dưới dạng JSON
    } catch (error) {
        // Trả về lỗi nếu có lỗi xảy ra trong quá trình lấy danh sách sản phẩm
        res.status(500).json({ error: 'Lỗi khi lấy thông tin sản phẩm: ' + error.message });
    }
});