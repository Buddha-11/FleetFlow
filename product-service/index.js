const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDef = protoLoader.loadSync('./proto/product.proto')
const grpcObject = grpc.loadPackageDefinition(packageDef);

const products = [
  { id: "1", name: "Laptop", price: 50000 },
  { id: "2", name: "Phone", price: 20000 }
];

function GetProduct(call, callback)
{
  const product = products.find(p => p.id === call.request.id);
  callback(null, product);
}

const server = new grpc.Server();
server.addService(grpcObject.ProductService.service, { GetProduct });

server.bindAsync("0.0.0.0:50052", grpc.ServerCredentials.createInsecure(), () =>
{
  console.log("Product service running on 50052");
});
