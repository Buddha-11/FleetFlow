const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const app = express();
app.use(express.json());

const userProto = grpc.loadPackageDefinition(
  protoLoader.loadSync('./proto/user.proto')
);

const productProto = grpc.loadPackageDefinition(
  protoLoader.loadSync('./proto/product.proto')
);

const userClient = new userProto.UserService(
  'user-service:50051',
  grpc.credentials.createInsecure()
);

const productClient = new productProto.ProductService(
  'product-service:50052',
  grpc.credentials.createInsecure()
);

app.post('/order', (req, res) =>
{
  const { userId, productId } = req.body;

  userClient.GetUser({ id: userId }, (err, user) =>
  {
    if (err) return res.status(500).send(err);

    productClient.GetProduct({ id: productId }, (err, product) =>
    {
      if (err) return res.status(500).send(err);

      res.json({
        message: "Order placed successfully",
        user,
        product
      });
    });
  });
});

app.listen(3003, () => console.log("Order service running on 3003"));