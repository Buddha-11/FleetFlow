const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDef = protoLoader.loadSync('./proto/user.proto')
const grpcObject = grpc.loadPackageDefinition(packageDef);

const users = [
  { id: "1", name: "Atharva", email: "atharva@mail.com" },
  { id: "2", name: "John", email: "john@mail.com" }
];

function GetUser(call, callback)
{
  const user = users.find(u => u.id === call.request.id);
  callback(null, user);
}

const server = new grpc.Server();
server.addService(grpcObject.UserService.service, { GetUser });

server.bindAsync("0.0.0.0:50051", grpc.ServerCredentials.createInsecure(), () =>
{
  console.log("User service running on 50051");
});