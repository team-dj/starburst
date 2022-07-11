
# Why I don't think "Organizational Flexibility" is a benefit of microservices

> Hopefully I'm not just being naive... but it's happened before, so I'd really appreciate any rebuttals to these arguments.

This term comes from [microservices.com](https://microservices.com)
> **Organizational Flexibility**: Microservices enables organizations to create independent teams of different sizes and structures based on the needs of a given feature or function. For a financial processing engine, a team with a large QA function is warranted. For a recommendation engine, perhaps a data scientist and a machine learning engineer. 

There are many articles that tout microservices as an organizational tool that solves all problems. Well it's not, and let's stop calling it that -- _good code boundaries and documentation_ are what make organizations more flexible. But there is fundamentally no difference (from an organizational standpoint) between an interface that looks like this:

```py3
def say_hello(name: str) -> str:
    """
    Returns a greeting for the person specified in {name}.
    This is maintained by <Greeting Team>.
    """
    # ...
```

and an interface that looks like this:

```proto3
syntax = "proto3";
package helloworld;

// This is maintained by <Greeting Team>.
service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}
message HelloReply {
  string message = 1;
}
```

The non-RPC version could be called as a regular-old-function by another team's code within the monolith. It still serves its purpose as an interface, because boundaries are clearly mentioned ("This is maintained by <Greeting Team>.").

## what about testing?
  
One might argue that having RPCs divding your codebase means that less testing is required. I disagree:

* end-to-end/integration tests should still be carried out in a microservice architecture
* unit tests can ignore certain interfaces by mocking them, just as you would do in a microservice architecture
* the QA effort should be strictly less with a monolith, because they won't need to test for RPC errors between microservices.

## what about deployments?
  
Well... you got me there. Microservices **do make deployments better** (a.k.a. smaller), which I suppose can have an organizational benefit, but I don't really consider this to be organizational flexibility. In my eyes this is more of an operations advantage, which should be considered in its own category since it's irrelevant to how a team is structured.
