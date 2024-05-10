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

        // Tìm kiếm giỏ hàng của người dùng
        const existingCart = await cartCollection.findOne({ userId: userId });

        if (existingCart) {
            // Nếu giỏ hàng đã tồn tại, chỉ cần thêm sản phẩm vào mảng items
            const updatedCart = {
                $push: {
                    items: { productId: productId, name: productName, price: productPrice }
                }
            };
            await cartCollection.updateOne({ userId: userId }, updatedCart);
            console.log('Sản phẩm đã được thêm vào giỏ hàng của bạn.');
        } else {
            // Nếu giỏ hàng chưa tồn tại, tạo mới giỏ hàng và thêm sản phẩm vào
            const newCart = {
                userId: userId,
                items: [{ productId: productId, name: productName, price: productPrice }]
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

// const userId = 'user123'; // Thay thế bằng userId thực tế
// getUserCartItems(userId)
//     .then(cartItems => {
//         console.log('Thông tin giỏ hàng:', cartItems);
//     })
//     .catch(error => {
//         console.error('Đã xảy ra lỗi:', error);
//     });




async function getUserAndProductInfo(userId) {
    try {
        await client.connect();
        const database = client.db('Lotte');
        const cartCollection = database.collection('cart');

        // Lấy thông tin người dùng từ MongoDB
        const user = await cartCollection.findOne({ userId: userId });

        // Lấy thông tin tất cả các sản phẩm của người dùng từ MongoDB
        const products = await cartCollection.find({ userId: userId }).toArray();

        return { user, products };
    } catch (error) {
        console.error('Đã xảy ra lỗi khi lấy thông tin từ MongoDB:', error);
        return null;
    } finally {
        await client.close();
    }
}

module.exports = {
    connectToMongoDB,
    closeMongoDBConnection,
    addToCartAndSaveToMongoDB,
    removeFromCartByProductId,
    getUserCartItems
}
