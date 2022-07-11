# Starburst (WIP)

## Purpose

Why microservices? [microservices.com](https://microservices.com) cites 3 reasons:

- **Agility**: Microservices enables organizations to independently iterate and ship features, reducing the time required to meet the needs of the market.
- **Organizational Flexibility**: Microservices enables organizations to create independent teams of different sizes and structures based on the needs of a given feature or function. For a financial processing engine, a team with a large QA function is warranted. For a recommendation engine, perhaps a data scientist and a machine learning engineer.
- **Recruiting and Onboarding**: Engineers want to work with the latest technology. Microservices enables you to incrementally adopt and test new technologies. You also want engineers to be productive from the day they start. With microservices, engineers can start coding on a small microservice, with no need to master a complex code base.

[I personally don't agree with the 2nd reason](docs/opinions/org-flexibility.md), however, the remaining two points do hold some merit; microservices make it easier to **ship code in smaller chunks** (which also leads to faster deployments) and microservices let your organization's engineers work with technologies across **many different languages** (i.e. "the right tool for the job").

Starburst aims to make microservices as easy to build as a monolithic application, with the multi-language support and small deployments that make microservices so great.


## Envisioned Usage:

Here's a bare-bones example with two microservices: a booking service (typescript), and a payment service (python3), which are requested by a main program (go). Normally, this would trigger you to jump into action and open up those brilliant [proto3](https://developers.google.com/protocol-buffers/docs/proto3) docs! But with Starburst, it's as easy as Import, Decorate, Call. Take a look:

```py3
import starburst

class PaymentResponse:
    success: bool
    remaining_balance: int

@starburst.microservice("payment-service") // this decorator is all we need! No proto3, no grpc stubs/channels
def deposit(user_id: str, amount: int) -> PaymentResponse:
     # ...

@starburst.microservice("payment-service")
def withdraw(user_id: str, amount: int) -> PaymentResponse:
     # ...
```

```ts
import starburst from 'starburst';

@starburst.microservice("booking-service") // starburst can be attached to classes too!
class BookingService {

    // returns a booking ID
    static bookFlight(flightId: string, user_id: string): string {
        const flight = flights[flightId];
        try {
            withdraw(user_id, flight.cost); // this is calling our python payment microservice!
            const booking = new Booking(flight, user_id);
            // ...
            return booking.id;
        } catch(err) {/* ... */}
    }
}
```

```go
func main() {
    bookingId = BookingService.BookFlight(my_id) // ...and this will call our typescript booking service!
    fmt.Printf("My flight is booked! %s\n", bookingId)
}
```

> Note: this will support async I/O when we're done, but we're not quite there just yet

All you will need is to run `starburst build` and it will generate for you:
* a proto3 file (we're still using grpc under the hood),
* a compiled version of each program, with certain function calls replaced with RPCs,
* a docker image for each service,
* a kubernetes manifest for each service,

If you put this all together, you're ready for deployment -- `starburst deploy` (production) or `starburst start` (local development) will get you going.

## High-level roadmap

However... we're still a long way to finishing this. Since Starburst needs to locate these decorators in your code, it needs to hook into compiler & type-checker APIs for each language that it supports. We're also very busy students/interns... so keep an eye out for us!

- [ ] Typescript support (end of July)
- [ ] CLI (end of August)
- [ ] Python3 support (end of August)
- [ ] Rust support (???)
- [ ] Go support (???)

<!--
## Installation
```brew install starburst```

## Usage
```
starburst build
starburst run
```
-->
