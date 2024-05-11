const { MongoClient } = require("mongodb");

const mongodbUrl = "mongodb://localhost:27017";
const dbName = 'Lotte'
const collectionName = 'cart'

let client = new MongoClient(mongodbUrl);

const dbCollection = client.db(dbName).collection(collectionName);

async function connectToMongoDB() {
    try {
        await client.connect();
    } catch (err) {
        throw err;
    }
}

async function closeMongoDBConnection() {
    if(client) {
        await client.close()
            .then(() => {
                console.log('Disconnected from MongoDB');
                process.exit(0);
            })
            .catch((error) => {
                console.error('Failed to disconnect from MongoDB', error);
                process.exit(1);
            })
    } else {
        process.exit(0)
    }
}


// Hàm để thêm sản phẩm vào giỏ hàng và lưu vào MongoDB
async function addToCartAndSaveToMongoDB(userId, productId, productName, productPrice) {
    try {
        await client.connect();
        const database = client.db('Lotte');
        const cartCollection = database.collection('cart');

        // Tạo một biến status cho trạng thái xử lý
        const status = 'processing';

        // Tìm kiếm giỏ hàng của người dùng
        const existingCart = await cartCollection.findOne({ userId: userId });

        if (existingCart) {
            // Nếu giỏ hàng đã tồn tại, chỉ cần thêm sản phẩm vào mảng items và cập nhật trạng thái
            const updatedCart = {
                $push: {
                    items: { productId: productId, name: productName, price: productPrice }
                },
                $set: {
                    status: status
                }
            };
            await cartCollection.updateOne({ userId: userId }, updatedCart);
            console.log('Sản phẩm đã được thêm vào giỏ hàng của bạn.');
        } else {
            // Nếu giỏ hàng chưa tồn tại, tạo mới giỏ hàng và thêm sản phẩm vào
            const newCart = {
                userId: userId,
                items: [{ productId: productId, name: productName, price: productPrice }],
                status: status
            };
            await cartCollection.insertOne(newCart);
            console.log('Giỏ hàng mới đã được tạo và sản phẩm đã được thêm vào.');
        }
    } catch (error) {
        console.error('Đã xảy ra lỗi:', error);
    } finally {
        await client.close();
    }
}


async function removeFromCartByProductId(userId, productId) {
    try {
        await client.connect();
        const database = client.db('Lotte');
        const cartCollection = database.collection('cart');

        // Chuyển đổi productId sang kiểu Int32
        const intProductId = parseInt(productId);

        // Tìm bản ghi chứa userId và có một hoặc nhiều sản phẩm có productId giống với productId được cung cấp
        const result = await cartCollection.updateOne(
            { userId: userId, "items.productId": intProductId },
            { $pull: { items: { productId: intProductId } } }
        );

        if (result.modifiedCount === 0) {
            console.log(`Không tìm thấy hoặc không có sản phẩm có ID ${intProductId} trong giỏ hàng của userId ${userId}`);
        } else {
            console.log(`Đã xóa sản phẩm có ID ${intProductId} khỏi giỏ hàng của userId ${userId}`);

            // Kiểm tra nếu mảng items rỗng, xóa luôn userId
            const cart = await cartCollection.findOne({ userId: userId });
            if (cart && cart.items.length === 0) {
                await cartCollection.deleteOne({ userId: userId });
                console.log(`Giỏ hàng của userId ${userId} đã bị xóa vì không có sản phẩm nào.`);
            }
        }
    } catch (error) {
        console.error('Đã xảy ra lỗi khi xóa sản phẩm khỏi giỏ hàng:', error);
    } finally {
        await client.close();
    }
}


async function getUserCartItems(userId) {
    try {
        await client.connect();
        const database = client.db('Lotte');
        const cartCollection = database.collection('cart');

        // Tìm bản ghi chứa userId
        const userCart = await cartCollection.findOne({ userId: userId });

        // Trả về mảng các mặt hàng nếu tìm thấy hoặc mảng rỗng nếu không tìm thấy
        return userCart ? userCart.items : [];
    } catch (error) {
        console.error('Đã xảy ra lỗi khi tìm kiếm sản phẩm trong giỏ hàng:', error);
        return [];
    } finally {
        await client.close();
    }
}

async function getProductsByProcessingUsers() {
    try {
        await client.connect();
        const database = client.db('Lotte');
        const cartCollection = database.collection('cart');

        // Lấy danh sách các sản phẩm của các userId có Status là "processing"
        const products = await cartCollection.find({ "status": "processing" }).toArray();

        console.log("Products of users with processing status:", products);
        
        return products;
    } catch (error) {
        console.error('Đã xảy ra lỗi khi lấy thông tin từ MongoDB:', error);
        return [];
    } finally {
        await client.close();
    }
}

async function updateStatusToDone(userId) {
    try {
        await client.connect();
        const database = client.db('Lotte');
        const cartCollection = database.collection('cart');

        // Truy vấn để cập nhật status thành "done" cho userId cụ thể
        const result = await cartCollection.updateMany(
            { userId: userId, status: "processing" }, // Điều kiện tìm kiếm
            { $set: { status: "done" } } // Giá trị mới của status
        );

        console.log(`${result.modifiedCount} documents updated`);

        return result.modifiedCount;
    } catch (error) {
        console.error('Đã xảy ra lỗi khi cập nhật status:', error);
        return 0;
    } finally {
        await client.close();
    }
}

async function addProduct(productName, productId, productPrice) {
    try {
        // Kết nối đến MongoDB
        await client.connect();

        // Chọn cơ sở dữ liệu và bảng sản phẩm
        const database = client.db('Lotte'); // Thay 'your_database_name' bằng tên cơ sở dữ liệu thực tế
        const productsCollection = database.collection('products'); // Thay 'products' bằng tên bảng sản phẩm thực tế

        // Tạo một đối tượng sản phẩm mới
        const newProduct = {
            name: productName,
            id: productId,
            price: productPrice
        };

        // Thêm sản phẩm vào cơ sở dữ liệu
        await productsCollection.insertOne(newProduct);

        console.log(`Đã thêm sản phẩm có id: ${productId} thành công!`);
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        return 'Đã xảy ra lỗi khi thêm sản phẩm.';
    } finally {
        // Đóng kết nối với MongoDB client
        await client.close();
    }
}


module.exports = {
    connectToMongoDB,
    closeMongoDBConnection,
    addToCartAndSaveToMongoDB,
    removeFromCartByProductId,
    getUserCartItems,
    getProductsByProcessingUsers,
    updateStatusToDone,
    addProduct
}
