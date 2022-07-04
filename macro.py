
# the decorator will alternate between two purposes: client and server

# Server: we run the function locally, unless `rpc=True` is provided
# Client: we run an RPC

@microservice()
def my_func() -> str:
    return "hello world"

# we analyze which dependencies this function has (local files & pip)
# we create a protobuf, a new entrypoint file, and (minimal) Dockerfile
# this entrypoint file only differs in the first line (the function it imports)

def serve():
  server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
  route_guide_pb2_grpc.add_RouteGuideServicer_to_server(
      RouteGuideServicer(), server)
  server.add_insecure_port('[::]:50051')
  server.start()
  server.wait_for_termination()

# general functions I'll need:
# getTransitiveDependencies() : Iterator[Node]
#   => stops when it reaches a 3rd-party dependency or a file with no dependencies
# we extract from this a list of files and a list of pip dependencies

# what about side-effects? in a java application, we can't even trim the number
# of files unless we trim the functions/methods
